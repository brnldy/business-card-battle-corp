// Renderização em 3 etapas:
//  1) mundo em baixa resolução  → bloom → pós (dither ordenado, paleta reduzida, grão, vinheta)
//  2) pré-passe de profundidade em resolução cheia (só oclusão)
//  3) cartas e contornos em resolução cheia por cima — o mundo fica pixelado, as cartas continuam legíveis
import * as THREE from 'three';
import { settings } from './settings.js';
import { noiseTexture } from './textures.js';
import { T } from './theme.js';

export const LAYER = { WORLD: 0, CARD: 1, FX: 2, GLOW: 3 };
export const timeUniform = { value: 0 };
export const dimUniform = { value: 1 }; // escurece as cartas junto com a sala (fim de jogo)
let _noise = null;
export const noiseTex = () => (_noise ??= noiseTexture());
export const cardMats = new Set();

// Carta: Lambert contido (não estoura sob a luminária) + mapa emissivo (sempre legível) + dissolução com brasa.
export function cardMaterial(map) {
  const m = new THREE.MeshLambertMaterial({ map, color: T.card.lit, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: T.card.table, alphaTest: 0.5, side: THREE.FrontSide });
  m.userData.u = { uDissolve: { value: 0 }, uNoiseTex: { value: noiseTex() }, uBurn: { value: new THREE.Color(1.0, 0.42, 0.08) }, uDim: { value: 1 }, uRoom: dimUniform };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform float uDissolve; uniform float uDim; uniform float uRoom; uniform sampler2D uNoiseTex; uniform vec3 uBurn;\nvoid main() {')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float dN = texture2D(uNoiseTex, vMapUv * 1.7).r * 0.75 + texture2D(uNoiseTex, vMapUv * 5.0).b * 0.25;
        float dT = uDissolve * 1.15 - 0.05;
        if (uDissolve > 0.0 && dN < dT) discard;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        gl_FragColor.rgb = min(gl_FragColor.rgb, vec3(0.93)) * uDim * uRoom;
        if (uDissolve > 0.0) {
          float e = 1.0 - smoothstep(dT, dT + 0.10, dN);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.02), smoothstep(dT + 0.22, dT + 0.10, dN) * (1.0 - e) * 0.85);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uBurn * 1.6, e);
        }`);
  };
  m.customProgramCacheKey = () => 'card2';
  cardMats.add(m);
  return m;
}

// Contorno luminoso animado atrás da carta.
export function glowMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(0x7bd88f) }, uAlpha: { value: 0 }, uTime: timeUniform, uAspect: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform vec3 uColor; uniform float uAlpha, uTime, uAspect;
      float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      void main(){
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.0;
        float d = sdBox(p, vec2(uAspect, 1.0) * 0.82, 0.07);
        float line = smoothstep(0.1, 0.0, abs(d - 0.04));
        float halo = exp(-max(d, 0.0) * 6.0) * step(0.0, d) * 0.7;
        float ang = atan(p.y, p.x / uAspect);
        float march = 0.72 + 0.28 * step(0.5, fract(ang * 5.0 / 3.14159 - uTime * 0.9));
        float pulse = 0.78 + 0.22 * sin(uTime * 5.0);
        float a = (line * march + halo) * uAlpha * pulse;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uColor * a * 3.0, a);
      }`,
  });
}

// ───────── partículas (pool em CPU, quadradinhos de pixel) ─────────
export class Particles {
  constructor(scene, max = 900) {
    this.max = max;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3); this.c = new Float32Array(max * 4);
    this.s = new Float32Array(max); this.life = new Float32Array(max); this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.floor = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.c, 4));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.s, 1));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uScale: { value: 300 } },
      vertexShader: `attribute vec4 aColor; attribute float aSize; varying vec4 vC; uniform float uScale;
        void main(){ vC = aColor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(1.0, aSize * uScale / -mv.z); }`,
      fragmentShader: 'varying vec4 vC; void main(){ if (vC.a < 0.02) discard; gl_FragColor = vC; }',
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false; this.points.renderOrder = 20; this.points.layers.set(LAYER.FX);
    scene.add(this.points);
    this.cursor = 0;
  }
  emit(o) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    this.p.set([o.x, o.y, o.z], i * 3); this.v.set([o.vx ?? 0, o.vy ?? 0, o.vz ?? 0], i * 3);
    this.c.set([o.r ?? 1, o.g ?? 1, o.b ?? 1, o.a ?? 1], i * 4);
    this.s[i] = o.size ?? 0.03; this.life[i] = this.maxLife[i] = o.life ?? 1;
    this.grav[i] = o.grav ?? 0; this.drag[i] = o.drag ?? 0; this.floor[i] = o.floor ?? -99;
  }
  burst(pos, n, fn) { for (let i = 0; i < n; i++) this.emit({ x: pos.x, y: pos.y, z: pos.z, ...fn(i) }); }
  update(dt) {
    const { p, v, c, life, maxLife } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) { if (c[i * 4 + 3] !== 0) c[i * 4 + 3] = 0; continue; }
      life[i] -= dt;
      const k = Math.max(0, 1 - this.drag[i] * dt);
      v[i * 3] *= k; v[i * 3 + 1] = v[i * 3 + 1] * k - this.grav[i] * dt; v[i * 3 + 2] *= k;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      if (p[i * 3 + 1] < this.floor[i]) { p[i * 3 + 1] = this.floor[i]; v[i * 3 + 1] *= -0.35; v[i * 3] *= 0.6; v[i * 3 + 2] *= 0.6; }
      c[i * 4 + 3] = Math.min(1, (life[i] / maxLife[i]) * 2.2);
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.aColor.needsUpdate = true; this.geo.attributes.aSize.needsUpdate = true;
  }
}

// Poeira suspensa no cone de luz (movimento inteiro no vertex shader).
export function dustMotes(count = 260, lamp = [0, 3.4, 0], tint = [1.0, 0.86, 0.6]) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos.set([(Math.random() - 0.5) * 7, Math.random() * 3.2, (Math.random() - 0.5) * 5], i * 3); seed[i] = Math.random() * 100; }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: timeUniform, uLamp: { value: new THREE.Vector3(...lamp) }, uScale: { value: 300 }, uTint: { value: new THREE.Vector3(...tint) } },
    vertexShader: `attribute float aSeed; uniform float uTime, uScale; uniform vec3 uLamp; varying float vA;
      void main(){ vec3 p = position; float t = uTime * 0.12 + aSeed;
        p.x += sin(t * 1.3 + aSeed) * 0.35; p.y = mod(p.y + uTime * 0.035 * (0.4 + fract(aSeed)), 3.2); p.z += cos(t + aSeed * 2.0) * 0.3;
        vec3 d = p - uLamp; float cone = smoothstep(0.75, 0.25, length(d.xz) / max(0.2, -d.y));
        vA = cone * (0.35 + 0.65 * fract(aSeed * 7.3)) * (0.6 + 0.4 * sin(uTime * 2.0 + aSeed * 9.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(1.0, 0.012 * uScale / -mv.z); }`,
    fragmentShader: 'varying float vA; uniform vec3 uTint; void main(){ gl_FragColor = vec4(uTint * vA * 0.55, vA); }',
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.layers.set(LAYER.FX);
  return pts;
}

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const quadMat = (uniforms, fragmentShader) => new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader, depthTest: false, depthWrite: false });

export class Gfx {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = false;
    const rtOpt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    this.rtA = new THREE.WebGLRenderTarget(4, 4, rtOpt); this.rtB = new THREE.WebGLRenderTarget(4, 4, rtOpt);
    const P = T.post;
    this.u = {
      tScene: { value: this.rt.texture }, tBloom: { value: this.rtA.texture }, uRes: { value: new THREE.Vector2(4, 4) }, uTime: timeUniform,
      uAberr: { value: P.aberr }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(1, 0.1, 0.05) },
      uGrain: { value: 0.03 }, uLevels: { value: 32 }, uVig: { value: P.vig }, uSat: { value: P.sat }, uBloom: { value: P.bloom },
      uFrost: { value: 0 }, uGlitch: { value: 0 }, uFade: { value: 0 }, uBarrel: { value: 0 }, uTintWarm: { value: 0 }, uScan: { value: P.scan },
      uIce: { value: 0 }, uIceTint: { value: 0 }, uCrack: { value: 0 }, tCrack: { value: new THREE.DataTexture(new Uint8Array(4), 1, 1) },
      uIceImg: { value: 0 }, uIceMix: { value: 0 }, tIceA: { value: new THREE.DataTexture(new Uint8Array(4), 1, 1) }, tIceB: { value: new THREE.DataTexture(new Uint8Array(4), 1, 1) },
      uWobble: { value: P.wobble ?? 0 },
      // estilo da arte de referência (rua do menu): paleta curta de sépia, oliva e âmbar, do mais escuro ao mais claro
      uPal: { value: 0 }, uPalC: { value: ['#0b0805', '#16110a', '#211b10', '#2c2916', '#3a3520', '#4b3d25', '#5d4a2d', '#775a33', '#98733f', '#bd914d', '#deb46e', '#f5daa4'].map((h) => new THREE.Color().setHex(parseInt(h.slice(1), 16), THREE.LinearSRGBColorSpace)) }, // valores crus: o shader trabalha já em sRGB uShadow: { value: new THREE.Vector3(...P.shadow) }, uHigh: { value: new THREE.Vector3(...P.high) },
    };
    this.base = { aberr: P.aberr };
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); this.quad.frustumCulled = false;
    this.postScene = new THREE.Scene(); this.postScene.add(this.quad);
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.brightMat = quadMat({ tScene: this.u.tScene }, `varying vec2 vUv; uniform sampler2D tScene;
      void main(){ vec3 c = max(texture2D(tScene, vUv).rgb, 0.0); float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.85, 1.9, l), 1.0); }`);
    this.blurU = { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } };
    this.blurMat = quadMat(this.blurU, `varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uDir;
      void main(){ vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
        c += (texture2D(tSrc, vUv + uDir * 1.385).rgb + texture2D(tSrc, vUv - uDir * 1.385).rgb) * 0.316;
        c += (texture2D(tSrc, vUv + uDir * 3.231).rgb + texture2D(tSrc, vUv - uDir * 3.231).rgb) * 0.070;
        gl_FragColor = vec4(c, 1.0); }`);
    this.postMat = quadMat(this.u, `
      precision highp float;
      varying vec2 vUv; uniform sampler2D tScene, tBloom, tCrack, tIceA, tIceB; uniform float uIceImg, uIceMix; uniform vec2 uRes; uniform float uIce, uIceTint, uCrack; uniform vec3 uFlashCol, uShadow, uHigh;
      uniform float uTime, uAberr, uFlash, uGrain, uLevels, uVig, uSat, uFrost, uGlitch, uFade, uTintWarm, uBloom, uScan, uWobble, uPal; uniform vec3 uPalC[12];
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
      float bayer(vec2 p){ return bayer2(0.5 * p) * 0.25 + bayer2(p); }
      void main(){
        vec2 c = vUv - 0.5; float r2 = dot(c, c);
        vec2 uv = vUv;
        if (uGlitch > 0.0) {
          float band = floor(uv.y * 28.0 + uTime * 13.0);
          float off = (hash(vec2(band, floor(uTime * 24.0))) - 0.5) * step(0.72, hash(vec2(band * 1.7, floor(uTime * 18.0))));
          uv.x += off * 0.09 * uGlitch;
        }
        // fita gasta: cada linha treme um pouco, e de vez em quando uma faixa de "tracking" atravessa a tela
        float ln = floor(uv.y * uRes.y);
        uv.x += (sin(ln * 0.7 + uTime * 9.0) * 0.6 + hash(vec2(ln, floor(uTime * 14.0))) - 0.5) * uWobble;
        float trk = smoothstep(0.035, 0.0, abs(fract(uv.y - uTime * 0.11) - 0.5)) * step(0.82, hash(vec2(floor(uTime * 0.45), 7.0)));
        uv.x += trk * uWobble * 14.0 * (hash(vec2(ln, uTime)) - 0.3);
        vec2 px = floor(uv * uRes);
        uv = (px + 0.5) / uRes;
        float ab = uAberr * (0.5 + r2 * 5.0);
        vec3 col = vec3(texture2D(tScene, uv + c * ab).r, texture2D(tScene, uv).g, texture2D(tScene, uv - c * ab).b);
        col = max(col, 0.0) + texture2D(tBloom, uv).rgb * uBloom;
        col = col / (1.0 + col * 0.35);
        col = pow(col, vec3(1.0 / 2.2));
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(l), col, uSat);
        col += (1.0 - l) * uShadow + l * l * uHigh;
        col = mix(col, col * vec3(1.25, 0.8, 0.7), uTintWarm);
        col = mix(col, vec3(l) * vec3(0.72, 0.95, 1.25) + 0.05, max(uFrost, uIceTint));
        // Ar Condicionado no Talo: gelo em blocos de cristal crescendo das bordas e trincas de vidro (frost.js)
        if (uIce > 0.0 && uIceImg > 0.5) {
          // imagens de gelo do autor (fundo preto) em modo "screen", cobrindo a tela sem distorcer (16:9)
          vec2 iu = uv; float sa = uRes.x / uRes.y, ia = 16.0 / 9.0;
          if (sa > ia) iu.y = (uv.y - 0.5) * ia / sa + 0.5; else iu.x = (uv.x - 0.5) * sa / ia + 0.5;
          vec3 fr = mix(texture2D(tIceA, iu).rgb, texture2D(tIceB, iu).rgb, uIceMix);
          col = 1.0 - (1.0 - col) * (1.0 - fr);
        } else if (uIce > 0.0) {
          float ed = min(min(vUv.x, 1.0 - vUv.x) * uRes.x / uRes.y, min(vUv.y, 1.0 - vUv.y));
          vec2 cell = floor(px / 3.0);
          float jag = (hash(cell) - 0.5) * 0.05 + (hash(floor(px / 9.0)) - 0.5) * 0.06;
          float ice = smoothstep(uIce * 0.2 + 0.004, uIce * 0.06, ed + jag * uIce);
          float sparkle = step(0.93, hash(cell + floor(uTime * 2.0))) * ice;
          col = mix(col, vec3(0.62, 0.8, 0.95) + 0.12 * hash(cell), ice * 0.7);
          col += sparkle * 0.25;
          vec4 ck = texture2D(tCrack, uv);
          col = mix(col, col * 0.3, ck.g * uCrack);
          col = mix(col, vec3(0.86, 0.95, 1.0), ck.r * uCrack);
        }
        if (uPal > 0.0) {
          // Rua do menu no estilo da arte de referência: a luminância vira uma das 12 cores da paleta (sépia, oliva, âmbar),
          // com pontilhado entre elas, uma textura grossa de pintura e as bordas dos objetos escurecidas como contorno.
          vec2 tx = 1.0 / uRes; vec3 LW = vec3(0.3, 0.59, 0.11);
          float lc = dot(texture2D(tScene, uv).rgb, LW);
          float ex = abs(dot(texture2D(tScene, uv + vec2(tx.x, 0.0)).rgb - texture2D(tScene, uv - vec2(tx.x, 0.0)).rgb, LW));
          float ey = abs(dot(texture2D(tScene, uv + vec2(0.0, tx.y)).rgb - texture2D(tScene, uv - vec2(0.0, tx.y)).rgb, LW));
          float edge = smoothstep(0.35, 1.2, (ex + ey) / (lc + 0.04));
          float lp = dot(col, vec3(0.299, 0.587, 0.114));
          float paint = (hash(floor(px / 2.0) * 1.31) - 0.5) * 0.06 + (hash(px * 0.73) - 0.5) * 0.035;
          lp = pow(lp, 0.68) * 1.08; // o contorno escurece as bordas do que é escuro; letra e janela acesas continuam cheias
          lp = clamp(lp * (1.0 - 0.5 * edge * (1.0 - smoothstep(0.45, 0.75, lp))) + paint, 0.0, 1.0);
          float idx = clamp(floor(lp * 11.0 + bayer(px) * 0.8 - 0.1), 0.0, 11.0);
          vec3 pc = uPalC[0];
          for (int k = 1; k < 12; k++) if (float(k) == idx) pc = uPalC[k];
          // o que era quente (luz, janela, letreiro) puxa um pouco para o âmbar; o resto fica na rampa
          pc *= mix(vec3(1.0), vec3(1.07, 0.98, 0.84), clamp((col.r - col.b) * 3.0, 0.0, 1.0) * 0.6);
          col = mix(col, pc, uPal);
        }
        col += (hash(px + fract(uTime) * 91.7) - 0.5) * uGrain * (1.0 - uPal);
        if (uPal < 0.5) col = floor(col * uLevels + bayer(px)) / uLevels;
        col *= 1.0 - uScan * mod(px.y, 2.0);
        float vig = smoothstep(1.0, 0.28, sqrt(r2) * (1.0 + 0.3 * uVig));
        col *= mix(1.0, vig, 0.4 + 0.45 * uVig);
        col = mix(col, uFlashCol, uFlash * (0.35 + r2 * 2.6));
        col *= 1.0 - uFade;
        gl_FragColor = vec4(col, 1.0);
      }`);
    this.depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });
    this.resize();
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight, px = settings.get().pixel, i = Math.max(0, Math.min(2, px - 1)), P = T.post;
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    const W = Math.round(w * pr), H = Math.round(h * pr);
    const scale = P.lines[i] ? Math.max(1, H / P.lines[i]) : 1;
    const iw = Math.max(64, Math.round(W / scale)), ih = Math.max(64, Math.round(H / scale));
    this.rt.setSize(iw, ih);
    this.rtA.setSize(Math.max(32, iw >> 1), Math.max(32, ih >> 1)); this.rtB.setSize(Math.max(32, iw >> 1), Math.max(32, ih >> 1));
    this.u.uRes.value.set(iw, ih);
    this.u.uLevels.value = P.levels[i]; this.u.uGrain.value = P.grain[i];
    this.crisp = scale > 1.12;     // mundo pixelado → cartas em passe separado, nítidas
    this.pointScale = ih * 0.9;
    this.w = w; this.h = h;
  }
  pass(mat, target) { this.quad.material = mat; this.renderer.setRenderTarget(target); this.renderer.render(this.postScene, this.postCam); }
  render(scene, camera) {
    const r = this.renderer, crisp = this.crisp;
    dimUniform.value = 1 - this.u.uFade.value;
    // 1) mundo em baixa resolução (as cartas só projetam sombra aqui quando o passe nítido está ligado)
    if (crisp) for (const m of cardMats) { m.colorWrite = false; m.depthWrite = false; }
    camera.layers.disableAll(); camera.layers.enable(LAYER.WORLD); camera.layers.enable(LAYER.CARD); camera.layers.enable(LAYER.FX); if (!crisp) camera.layers.enable(LAYER.GLOW);
    r.shadowMap.autoUpdate = true;
    r.setRenderTarget(this.rt); r.clear(); r.render(scene, camera);
    if (crisp) for (const m of cardMats) { m.colorWrite = true; m.depthWrite = true; }
    // bloom
    this.pass(this.brightMat, this.rtA);
    this.blurU.tSrc.value = this.rtA.texture; this.blurU.uDir.value.set(1 / this.rtA.width, 0); this.pass(this.blurMat, this.rtB);
    this.blurU.tSrc.value = this.rtB.texture; this.blurU.uDir.value.set(0, 1 / this.rtA.height); this.pass(this.blurMat, this.rtA);
    // pós → tela
    r.setRenderTarget(null); r.clear();
    this.quad.material = this.postMat; r.render(this.postScene, this.postCam);
    if (crisp) {
      r.shadowMap.autoUpdate = false;
      r.clearDepth();
      camera.layers.set(LAYER.WORLD); scene.overrideMaterial = this.depthOnly; const bg = scene.background; scene.background = null;
      r.render(scene, camera);
      scene.overrideMaterial = null; scene.background = bg;
      camera.layers.disableAll(); camera.layers.enable(LAYER.CARD); camera.layers.enable(LAYER.GLOW);
      const fog = scene.fog; scene.fog = null; const bg2 = scene.background; scene.background = null;
      r.render(scene, camera);
      scene.fog = fog; scene.background = bg2;
    }
    camera.layers.enableAll();
  }
}

// ───────── utilidades de animação ─────────
export const ease = {
  out: (t) => 1 - Math.pow(1 - t, 3), in: (t) => t * t * t, inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, lin: (t) => t,
};
const tweens = new Set();
export function tween(ms, fn, e = ease.out) {
  return new Promise((res) => {
    if (ms <= 0) { fn(1); res(); return; }
    tweens.add({ t: 0, ms, fn, e, res });
  });
}
export const wait = (ms) => tween(ms, () => {}, ease.lin);
export function updateTweens(dtMs) {
  for (const tw of tweens) {
    tw.t += dtMs;
    const k = Math.min(1, tw.t / tw.ms);
    tw.fn(tw.e(k), k);
    if (k >= 1) { tweens.delete(tw); tw.res(); }
  }
}
