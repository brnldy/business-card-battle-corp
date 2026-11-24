// A sala, a mesa e o Rival: porão de escritório escuro, luminária industrial balançando, TV de tubo antiga.
// Modelos de terceiros (CC0): Poly Haven (TV, luminária, arquivos, relógio, fichário, grampeador) e Quaternius (corpo).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { timeUniform, dustMotes, LAYER } from './gfx.js';
import * as TX from './textures.js';
import * as GR from './grime.js';
import { TABLE, LAYOUT, CARD } from './textures.js';
import { model } from './assets.js';
import { T } from './theme.js';

const M = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
const mesh = (g, m) => new THREE.Mesh(g, m);
const box = (w, h, d, m) => mesh(new THREE.BoxGeometry(w, h, d), m);
const rbox = (w, h, d, r, m, seg = 3) => mesh(new RoundedBoxGeometry(w, h, d, seg, r), m);
const cyl = (rt, rb, h, seg, m) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const lathe = (pts, seg, m) => mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), m);
const shadow = (o) => { o.traverse((c) => { if (c.isMesh) c.castShadow = true; }); return o; };
const FLOOR = -7.2, CEIL = 7.4, HALF = 13;

function faceMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: timeUniform, uGlitch: { value: 0 }, uMood: { value: 0 }, uTalk: { value: 0 }, uBlink: { value: 0 }, uThink: { value: 0 },
      uLook: { value: new THREE.Vector2() }, uColor: { value: new THREE.Color(...T.face) }, uOn: { value: 1 }, uDead: { value: 0 }, tDigits: { value: GR.digitAtlas() },
      uBase: { value: new THREE.Vector3(0.012, 0.035, 0.018) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform float uTime, uGlitch, uMood, uTalk, uBlink, uOn, uDead, uThink; uniform vec2 uLook; uniform vec3 uColor, uBase; uniform sampler2D tDigits;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float bx(vec2 p, vec2 b){ vec2 d = abs(p) - b; return step(max(d.x, d.y), 0.0); }
      // "refinamento de dados": grade de dígitos que treme e incha perto de um foco móvel
      float digits(vec2 uv){
        vec2 gridN = vec2(12.0, 8.0), gp = uv * gridN, id = floor(gp), f = fract(gp);
        float h = hash(id * 1.37 + 3.1);
        vec2 off = vec2(sin(uTime * 1.7 + h * 40.0), cos(uTime * 1.3 + h * 23.0)) * 0.11;
        vec2 focus = vec2(0.5 + 0.32 * sin(uTime * 0.7), 0.5 + 0.26 * cos(uTime * 0.53)) * gridN;
        float bump = smoothstep(2.8, 0.0, distance(id + 0.5, focus));
        vec2 q = (f - 0.5 - off) / (0.78 + bump * 0.7) + 0.5;
        float d = floor(hash(id + floor(uTime * 0.3 + h * 4.0)) * 10.0);
        float inside = step(0.0, q.x) * step(q.x, 1.0) * step(0.0, q.y) * step(q.y, 1.0);
        return texture2D(tDigits, vec2((d + clamp(q.x, 0.02, 0.98)) / 10.0, clamp(q.y, 0.0, 1.0))).r * inside * (0.5 + bump);
      }
      void main(){
        vec2 uv = vUv;
        float row = floor(uv.y * 48.0);
        uv.x += (hash(vec2(row, floor(uTime * 30.0))) - 0.5) * uGlitch * 0.35;
        uv.y += step(0.985, hash(vec2(floor(uTime * 9.0), 3.0))) * 0.03 * (1.0 + uGlitch * 3.0);
        vec2 g = vec2(72.0, 54.0), cell = fract(uv * g);
        vec2 p = (floor(uv * g) + 0.5) / g * 2.0 - 1.0; p.x *= 1.33;
        float v = 0.0, eh = mix(0.2, 0.02, uBlink);
        for (int i = 0; i < 2; i++) {
          float sx = i == 0 ? -1.0 : 1.0;
          vec2 q = p - vec2(sx * 0.52, 0.2);
          float cut = q.y - 0.17 + (sx * q.x) * uMood * 1.1 + max(uMood, 0.0) * 0.13;
          float eye = bx(q, vec2(0.22, eh)) * step(cut, 0.0);
          float pupil = bx(q - uLook * vec2(0.1, 0.07), vec2(0.075, min(eh, 0.1)));
          if (uDead > 0.5) { eye = step(abs(abs(q.x) - abs(q.y)), 0.045) * bx(q, vec2(0.2)); pupil = 0.0; }
          v = max(v, eye * (1.0 - pupil));
        }
        float curve = -uMood * 0.35 * (p.x * p.x) + sin(p.x * 11.0 + uTime * 22.0) * 0.07 * uTalk;
        float my = -0.48 + curve + max(uMood, 0.0) * 0.06;
        v = max(v, step(abs(p.y - my), 0.035 + 0.07 * uTalk) * step(abs(p.x), 0.42));
        v = mix(v, digits(uv), uThink * (1.0 - uDead));
        vec2 a = abs(p) - vec2(1.12, 0.84);
        float corner = step(abs(a.x), 0.015) * step(-0.16, a.y) * step(a.y, 0.0) + step(abs(a.y), 0.015) * step(-0.16, a.x) * step(a.x, 0.0);
        v = max(v, corner * 0.6);
        v = max(v, bx(p - vec2(-1.02, -0.72), vec2(0.035, 0.05)) * step(0.5, fract(uTime * 1.2)) * 0.8);
        float dotMask = smoothstep(0.08, 0.3, cell.x) * smoothstep(0.08, 0.3, cell.y);
        vec3 col = uBase + uColor * v * (0.55 + 0.45 * dotMask);
        col = mix(col, uBase + vec3(1.0, 0.3, 0.2) * v * (0.55 + 0.45 * dotMask), clamp(uMood, 0.0, 1.0) * 0.85 * (1.0 - uThink));
        col *= 0.86 + 0.14 * sin(vUv.y * 260.0 + uTime * 5.0);
        col += hash(vUv * 240.0 + uTime) * 0.04 * (1.0 + uGlitch * 8.0);
        vec2 e = abs(vUv - 0.5) * 2.0; float corners = 1.0 - smoothstep(0.86, 1.0, max(e.x, e.y)) * 0.0 - smoothstep(1.25, 1.42, length(e * e)) ;
        col *= (smoothstep(0.95, 0.25, length(vUv - 0.5)) * 0.5 + 0.6) * clamp(corners, 0.0, 1.0);
        gl_FragColor = vec4(col * uOn * 2.3, 1.0);
      }`,
  });
}
function glassMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; void main(){
      float streak = smoothstep(0.12, 0.0, abs(vUv.x * 0.8 + vUv.y - 1.25)) * 0.14 + smoothstep(0.05, 0.0, abs(vUv.x * 0.8 + vUv.y - 1.42)) * 0.09;
      gl_FragColor = vec4(vec3(0.85, 1.0, 0.95) * streak, 1.0); }`,
  });
}
function bulged(w, h, depth) {
  const g = new THREE.PlaneGeometry(w, h, 18, 14), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2); p.setZ(i, depth * (1 - x * x) * (1 - y * y)); }
  g.computeVertexNormals();
  return g;
}
// tinge os materiais PBR de um modelo (escurecer, limpar, etc.)
function tune(o, fn) { o.traverse((c) => { if (c.isMesh) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => fn(m, c)); }); return o; }

// ───────── o Rival: corpo de terno (esqueleto posado) + aparelho de tubo no lugar da cabeça ─────────
// tela (em unidades locais do modelo): centro x/y, largura, altura, z da frente
const HEADS = {
  Television_01: { scale: 4.4, screen: [-0.062, 0.243, 0.372, 0.3, 0.2], bulge: 0.018 },
};
function buildRival(R) {
  const opp = new THREE.Group(); R.scene.add(opp);
  const S = 7.0, baseY = -9.0;
  opp.position.set(0, baseY, -(TABLE.d / 2 + 1.55));
  const man = model('business_man'); man.scale.setScalar(S); opp.add(man);
  const bones = {};
  man.traverse((c) => {
    if (c.isBone) bones[c.name] = c;
    if (c.isSkinnedMesh) { c.frustumCulled = false; if (/Head/.test(c.name)) c.visible = false; }
  });
  tune(man, (m) => { m.roughness = 0.9; m.metalness = 0; m.color.multiplyScalar(0.7); });
  // pose por cinemática inversa: em pé atrás da mesa, levemente curvado, mãos apoiadas no tampo
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
  const wpos = (b, out = new THREE.Vector3()) => b.getWorldPosition(out);
  const rotWorld = (b, qd) => { b.parent.getWorldQuaternion(q1); b.quaternion.premultiply(q2.copy(q1).invert().multiply(qd).multiply(q1)); b.updateMatrixWorld(true); };
  const aim = (b, from, to) => { wpos(b, v1); const a = from.clone().sub(v1).normalize(), c = to.clone().sub(v1).normalize(); rotWorld(b, new THREE.Quaternion().setFromUnitVectors(a, c)); };
  const lean = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.2);
  opp.updateMatrixWorld(true);
  if (bones.Torso) rotWorld(bones.Torso, lean);
  const ARM = ['L', 'R'].map((s) => ({ s, up: bones[`UpperArm${s}`], lo: bones[`LowerArm${s}`], wr: bones[`Wrist${s}`], tip: bones[`Middle1${s}`] ?? bones[`Index1${s}`], thumb: bones[`Thumb1${s}`] }));
  for (const a of ARM) a.rest = [a.up, a.lo, a.wr].map((b) => b?.quaternion.clone());
  const solveArm = (a, target, pole, handDir, roll) => {
    if (!a.up || !a.lo || !a.wr) return;
    [a.up, a.lo, a.wr].forEach((b, i) => b.quaternion.copy(a.rest[i]));
    a.up.updateMatrixWorld(true);
    const S = wpos(a.up), E0 = wpos(a.lo), W0 = wpos(a.wr), la = E0.distanceTo(S), lb = W0.distanceTo(E0);
    const to = target.clone().sub(S), d = THREE.MathUtils.clamp(to.length(), Math.abs(la - lb) + 0.02, la + lb - 0.02), dir = to.normalize();
    const x = (la * la - lb * lb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, la * la - x * x));
    const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
    aim(a.up, E0, S.clone().addScaledVector(dir, x).addScaledVector(perp, h));
    aim(a.lo, wpos(a.wr), S.clone().addScaledVector(dir, d));
    if (a.tip) { const W = wpos(a.wr); aim(a.wr, wpos(a.tip), W.clone().add(handDir)); rotWorld(a.wr, new THREE.Quaternion().setFromAxisAngle(handDir.clone().normalize(), roll)); }
  };
  R.armCfg = { target: [1.34, 0.3, -3.3], pole: [0.9, -0.5, -1.0], hand: [-0.25, -0.05, 1.0], roll: 1.45 };
  const poseArms = (g0 = 0, g1 = 0) => {
    const C = R.armCfg;
    ARM.forEach((a, i) => {
      const sx = i === 0 ? 1 : -1, g = i === 0 ? g0 : g1;   // g = gesto de jogar carta (0..1)
      solveArm(a, new THREE.Vector3(C.target[0] * sx - sx * 0.35 * g, C.target[1] + 0.55 * g, C.target[2] + 0.55 * g), new THREE.Vector3(C.pole[0] * sx, C.pole[1], C.pole[2]), new THREE.Vector3(C.hand[0] * sx, C.hand[1], C.hand[2]), C.roll * sx);
    });
  };
  R.poseArms = poseArms;
  poseArms();

  // cabeça
  const key = 'Television_01', H = HEADS[key];
  const head = new THREE.Group();
  const tv = model(key); tv.scale.setScalar(H.scale); head.add(tv);
  tune(tv, (m) => { m.envMapIntensity = 0.6; m.color.multiplyScalar(0.9); });
  const [sx, sy, sw, shh, sz] = H.screen, faceMat = faceMaterial();
  const screen = mesh(bulged(sw * H.scale, shh * H.scale, H.bulge * H.scale), faceMat); screen.position.set(sx * H.scale, sy * H.scale, sz * H.scale);
  const glass = mesh(bulged(sw * H.scale, shh * H.scale, H.bulge * H.scale * 1.1), glassMaterial()); glass.position.copy(screen.position); glass.position.z += 0.01;
  head.add(screen, glass);
  const neck = cyl(0.26, 0.32, 0.5, 12, M(0x3a403c)); neck.position.y = -0.2; head.add(neck);
  const plateR = cyl(0.62, 0.72, 0.1, 18, M(0x2a2620)); plateR.position.y = 0.0; head.add(plateR);
  [[-0.5, 0x15181a], [0.42, 0x15181a], [0.08, 0x6d1410]].forEach(([x, c], i) => {
    const zb = -0.9 - i * 0.05, curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0.9, zb), new THREE.Vector3(x * 1.3, 0.2, zb - 0.45), new THREE.Vector3(x * 0.9, -0.5, zb - 0.1), new THREE.Vector3(x * 0.5, -1.0, -0.35)]);
    head.add(mesh(new THREE.TubeGeometry(curve, 14, 0.04, 6), M(c)));
  });
  shadow(head); screen.castShadow = false; glass.castShadow = false;
  const hb = bones.Head ?? bones.Neck, hp = new THREE.Vector3();
  opp.updateMatrixWorld(true);
  if (hb) hb.getWorldPosition(hp); else hp.set(0, 1.6, opp.position.z);
  head.position.copy(opp.worldToLocal(hp.clone())); head.position.y += 0.1;
  opp.add(head);
  // crachá com o nome da empresa rival
  const bc = document.createElement('canvas'); bc.width = 96; bc.height = 128;
  const badgeTex = new THREE.CanvasTexture(bc); badgeTex.colorSpace = THREE.SRGBColorSpace;
  const badge = mesh(new THREE.PlaneGeometry(0.4, 0.53), new THREE.MeshLambertMaterial({ map: badgeTex, emissive: 0xffffff, emissiveMap: badgeTex, emissiveIntensity: 0.25 }));
  const cb = bones.Chest ?? bones.Torso; const cp = new THREE.Vector3(); if (cb) cb.getWorldPosition(cp);
  badge.position.copy(opp.worldToLocal(cp.clone())).add(new THREE.Vector3(-0.72, 0.55, 0.98)); badge.rotation.x = -0.22; opp.add(badge);
  R.badge = badge;
  R.setBadge = (name) => {
    const g = bc.getContext('2d'); g.fillStyle = '#eef2ea'; g.fillRect(0, 0, 96, 128);
    g.fillStyle = '#6d1410'; g.fillRect(0, 0, 96, 22); g.fillStyle = '#eef2ea'; g.font = `700 11px ${TX.UI}`; g.textAlign = 'center'; g.fillText('RIVAL', 48, 15);
    g.fillStyle = '#c9d2c5'; g.fillRect(24, 32, 48, 44); g.fillStyle = '#1f2b25'; g.fillRect(32, 40, 32, 22); g.fillStyle = '#9fe8ff'; g.fillRect(38, 47, 6, 5); g.fillRect(52, 47, 6, 5); g.fillStyle = '#1f2b25'; g.fillRect(44, 64, 8, 8);
    g.fillStyle = '#1f2b25'; g.font = `700 10px ${TX.UI}`; let n = name; while (g.measureText(n).width > 84 && n.length > 3) n = n.slice(0, -1); g.fillText(n, 48, 94);
    for (let i = 0; i < 16; i++) g.fillRect(14 + i * 4.4, 106, i % 3 ? 2 : 3, 12);
    badgeTex.needsUpdate = true;
  };
  R.setBadge('—');
  // âncora da mão de cartas: entre os dois punhos
  const wl = new THREE.Vector3(), wr = new THREE.Vector3();
  bones.WristL?.getWorldPosition(wl); bones.WristR?.getWorldPosition(wr);
  const anchor = new THREE.Vector3(0, 0.6, Math.min(-1.95, (wl.z + wr.z) / 2 + 0.8));
  const arms = [new THREE.Object3D(), new THREE.Object3D()];
  const chestRest = bones.Chest?.quaternion.clone(), qx = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0);
  R.opp = {
    group: opp, head, face: faceMat.uniforms, arms, bones, baseY, handAnchor: anchor, headRest: head.position.clone(),
    // respiração no peito; as mãos ficam plantadas na mesa (IK) e sobem no gesto de jogar carta
    tick(t) {
      if (chestRest && bones.Chest) { bones.Chest.quaternion.copy(chestRest).multiply(qx.setFromAxisAngle(X, Math.sin(t * 1.1) * 0.014)); }
      opp.updateMatrixWorld(true);
      poseArms(Math.min(1, -arms[0].rotation.x * 4.5), Math.min(1, -arms[1].rotation.x * 4.5));
    },
  };
}

// ───────── salas ─────────
function roomBuckshot(R) {
  const { scene } = R;
  const floor = mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), M(0xffffff, { map: GR.carpetGrimy() })); floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; floor.receiveShadow = true; scene.add(floor);
  const ceil = mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), M(0xffffff, { map: GR.ceilingGrimy() })); ceil.rotation.x = Math.PI / 2; ceil.position.y = CEIL; scene.add(ceil);
  const wallMat = M(0xffffff, { map: GR.wallGrimy() }), wallGeo = new THREE.PlaneGeometry(HALF * 2, CEIL - FLOOR);
  [[0, -9.5, 0], [-HALF, 0, Math.PI / 2], [HALF, 0, -Math.PI / 2], [0, 12, Math.PI]].forEach(([x, z, ry]) => { const w = mesh(wallGeo, wallMat); w.position.set(x, (CEIL + FLOOR) / 2, z); w.rotation.y = ry; scene.add(w); });
  // calhas fluorescentes (uma com mau contato)
  R.tubes = [];
  [[-4, -6.2], [6, -3.5], [-7.5, 2]].forEach(([x, z]) => {
    const f = model('mounted_fluorescent_lights'); f.scale.setScalar(4.2); f.position.set(x, CEIL - 0.02, z); scene.add(f);
    tune(f, (m) => { if (/glass/.test(m.name)) { m.emissive = new THREE.Color(0xd8fff0); m.emissiveIntensity = 2.2; R.tubes.push(m); } });
  });
  // arquivos de aço
  for (let i = 0; i < 5; i++) { const c = model('drawer_cabinet'); c.scale.setScalar(3.5 + (i % 2) * 0.25); c.position.set(-11 + i * 4.3 + (i > 2 ? 3.4 : 0), FLOOR, -8.6); c.rotation.y = (i % 2 ? 0.03 : -0.02); scene.add(c); }
  const clock = model('wall_clock'); clock.scale.setScalar(4.6); clock.position.set(-9.2, 4.6, -9.46); scene.add(clock);
  const door = box(3.0, 7.6, 0.2, M(0x3d4a42)); door.position.set(3.0, FLOOR + 3.8, -9.4); scene.add(door);
  const glass = mesh(new THREE.PlaneGeometry(1.6, 2.2), new THREE.MeshBasicMaterial({ color: 0x6f8f83 })); glass.position.set(3.0, FLOOR + 5.4, -9.28); scene.add(glass);
  const exit = mesh(new THREE.PlaneGeometry(1.5, 0.5), new THREE.MeshBasicMaterial({ map: TX.labelTexture('SAÍDA', '#b21d12', '#ffe9e2') })); exit.position.set(3.0, FLOOR + 8.4, -9.38); scene.add(exit);
  const frame = (tex, x, y, w, h) => { const f = box(w + 0.25, h + 0.25, 0.12, M(0x14100b)); f.position.set(x, y, -9.42); scene.add(f); const p = mesh(new THREE.PlaneGeometry(w, h), M(0xffffff, { map: tex })); p.position.set(x, y, -9.34); scene.add(p); };
  frame(TX.portraitTexture(), 0, 3.4, 2.4, 3.0);
  frame(TX.imageTexture('img/START_MENU.png'), -5.0, 2.9, 3.4, 1.9);
  frame(TX.posterTexture([['O CAIXA', 22], ['É A VIDA.', 22], ['', 6], ['— MANUAL, §4', 9, 700]]), 7.4, 2.8, 1.5, 2.05);
  frame(TX.posterTexture([['SORRIA.', 24], ['VOCÊ ESTÁ', 15], ['SENDO', 15], ['AUDITADO.', 15]], '#d9d2a8'), 10.4, 2.6, 1.5, 2.05);
  // luminária industrial pendente: pivô no teto, balança com os impactos
  const pivot = new THREE.Group(); pivot.position.set(0, CEIL, 0.2); scene.add(pivot);
  const lampM = model('hanging_industrial_lamp'); lampM.scale.setScalar(1.55); pivot.add(lampM);
  const bulb = mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe2a8 })); bulb.position.y = -1.9; pivot.add(bulb);
  tune(lampM, (m) => { if (/glass/.test(m.name)) { m.emissive = new THREE.Color(0xffd9a0); m.emissiveIntensity = 1.5; } });
  const shaft = mesh(new THREE.ConeGeometry(4.6, 7.6, 28, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uTime: timeUniform },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec2 vUv; uniform float uTime; void main(){ float a = pow(vUv.y, 2.2) * 0.075 * (0.85 + 0.15 * sin(vUv.x * 60.0 + uTime * 0.6)); gl_FragColor = vec4(vec3(1.0, 0.82, 0.55) * a, a); }' }));
  shaft.position.y = -1.9 - 3.8; shaft.layers.set(LAYER.FX); pivot.add(shaft);
  return { pivot, lampY: -1.85, bulb };
}
export function buildScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(T.bg);
  scene.fog = new THREE.FogExp2(T.fog[0], T.fog[1]);
  const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 80);
  scene.add(camera);
  const R = { scene, camera };

  scene.add(new THREE.HemisphereLight(...T.hemi));
  const room = roomBuckshot(R);
  const L = T.lamp, lamp = new THREE.SpotLight(L.color, L.intensity, 26, L.angle, L.penumbra, L.decay);
  lamp.position.set(0, room.lampY, 0); lamp.target.position.set(0, room.lampY - 8, 0);
  lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.camera.near = 1; lamp.shadow.camera.far = 16; lamp.shadow.bias = -0.0015; lamp.shadow.radius = 2;
  room.pivot.add(lamp, lamp.target);
  const cold = new THREE.PointLight(T.fill[0], T.fill[1], 30, 1.5); cold.position.set(-4, 6.2, -6.5); scene.add(cold);
  const cold2 = new THREE.PointLight(T.fill[0], T.fill[1] * 0.6, 30, 1.5); cold2.position.set(6, 6.2, -5.0); scene.add(cold2);
  const crtLight = new THREE.PointLight(T.crt, 4, 8, 1.8); scene.add(crtLight);
  Object.assign(R, { lamp, lampPivot: room.pivot, bulb: room.bulb, cold, cold2, crtLight, lampBase: L.intensity, coldBase: T.fill[1] });

  // ───── mesa ─────
  const table = new THREE.Group(); scene.add(table);
  const top = mesh(new THREE.PlaneGeometry(TABLE.w, TABLE.d), new THREE.MeshLambertMaterial({ map: GR.deskGrimy() }));
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; table.add(top);
  {
    const wood = M(0xffffff, { map: TX.woodTexture() });
    const slab = rbox(TABLE.w + 0.04, 0.3, TABLE.d + 0.04, 0.05, wood); slab.position.y = -0.16; slab.receiveShadow = true; table.add(slab);
    const apron = box(TABLE.w - 0.4, 0.7, TABLE.d - 0.4, M(0x2a1a10)); apron.position.y = -0.62; table.add(apron);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const leg = box(0.36, 6.6, 0.36, wood); leg.position.set(sx * (TABLE.w / 2 - 0.4), -4.0, sz * (TABLE.d / 2 - 0.4)); table.add(leg); });
  }
  R.tableTop = top;

  const prop = (m, x, y, z) => { m.position.set(x, y, z); shadow(m); table.add(m); return m; };
  const dk = 0x14100b;
  // caneca torneada
  const mug = new THREE.Group(), mugC = 0xc9c2a8;
  mug.add(lathe([[0, 0], [0.17, 0], [0.19, 0.03], [0.2, 0.4], [0.185, 0.42], [0.17, 0.4], [0.165, 0.06], [0, 0.05]], 20, M(mugC, { side: THREE.DoubleSide })));
  const coffee = mesh(new THREE.CircleGeometry(0.168, 20), M(0x2a160c)); coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.34; mug.add(coffee);
  const handle = mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 14, Math.PI), M(mugC)); handle.rotation.z = -Math.PI / 2; handle.position.set(0.2, 0.22, 0); mug.add(handle);
  const band = cyl(0.202, 0.202, 0.07, 20, M(0x6d1410)); band.position.y = 0.2; mug.add(band);
  prop(mug, 3.22, 0, 0.36); mug.rotation.y = 0.6;
  // pilha de formulários + caneta
  const papers = new THREE.Group();
  for (let i = 0; i < 5; i++) { const p = box(0.66, 0.012, 0.92, M(0xffffff, { map: i === 4 ? TX.paperTexture(true, 3) : TX.paperTexture(false, i + 5) })); p.position.y = 0.006 + i * 0.013; p.rotation.y = (i - 2) * 0.07; papers.add(p); }
  const penB = cyl(0.022, 0.022, 0.66, 8, M(0x0a0a0a)); penB.rotation.z = Math.PI / 2; penB.position.set(0.02, 0.092, 0.1); papers.add(penB);
  const penT = mesh(new THREE.ConeGeometry(0.022, 0.07, 8), M(0x8d948f)); penT.rotation.z = Math.PI / 2; penT.position.set(-0.345, 0.092, 0.1); papers.add(penT);
  prop(papers, -3.3, 0, 0.08); papers.rotation.y = 0.07;
  // fichário (modelo) no canto do rival
  const binder = model('binder_notebook'); binder.scale.setScalar(1.9); prop(binder, -3.2, 0, -1.75); binder.rotation.y = 1.2;
  // carimbo + almofada
  const stamp = new THREE.Group();
  stamp.add(rbox(0.36, 0.1, 0.22, 0.03, M(dk))); const sNeck = cyl(0.05, 0.08, 0.22, 10, M(dk)); sNeck.position.y = 0.15; stamp.add(sNeck);
  const sKnob = mesh(new THREE.SphereGeometry(0.1, 14, 10), M(0x4a2d18)); sKnob.position.y = 0.32; stamp.add(sKnob);
  prop(stamp, 3.25, 0.05, -0.5); stamp.rotation.y = 0.4;
  prop(rbox(0.5, 0.06, 0.36, 0.02, M(dk)), 3.2, 0.03, -1.9); const ink = box(0.42, 0.01, 0.28, M(0x7a1410)); ink.position.set(3.2, 0.065, -1.9); table.add(ink);
  {
    const st = model('vintage_stapler'); st.scale.setScalar(3.2); prop(st, -3.25, 0.03, 1.2); st.rotation.y = 0.5;
    const ash = prop(lathe([[0, 0], [0.26, 0], [0.31, 0.1], [0.27, 0.1], [0.23, 0.03], [0, 0.03]], 16, M(0x23282a)), -3.2, 0, 1.95); void ash;
    const butt = cyl(0.025, 0.025, 0.3, 6, M(0xd9d2bd)); butt.rotation.set(Math.PI / 2, 0, 0.6); butt.position.set(-3.15, 0.12, 1.95); table.add(butt);
  }
  // campainha de balcão = encerrar turno
  const bell = new THREE.Group();
  const chrome = new THREE.MeshPhongMaterial({ color: 0xc9a54a, specular: 0xfff0c0, shininess: 60, emissive: 0x2b2008 });
  bell.add(lathe([[0, 0], [0.33, 0], [0.34, 0.03], [0.3, 0.06], [0, 0.06]], 24, M(dk)));
  bell.add(lathe([[0.29, 0.06], [0.285, 0.12], [0.25, 0.2], [0.18, 0.27], [0.08, 0.31], [0, 0.315]], 24, chrome));
  const bBtn = cyl(0.04, 0.04, 0.12, 12, M(dk)); bBtn.position.y = 0.36; const bCap = cyl(0.065, 0.065, 0.03, 12, M(dk)); bCap.position.y = 0.07; bBtn.add(bCap); bell.add(bBtn);
  bell.position.set(LAYOUT.bell.x, 0, LAYOUT.bell.z); shadow(bell); table.add(bell);
  bell.userData.btn = bBtn;
  R.bell = bell;

  // pilhas de deck
  const sideMat = M(0xe9ece4);
  R.decks = [0, 1].map((side) => {
    const p = side === 0 ? LAYOUT.myDeck : LAYOUT.oppDeck;
    const back = new THREE.MeshLambertMaterial({ map: TX.cardBackTexture(), color: T.card.lit, emissive: 0xffffff, emissiveMap: TX.cardBackTexture(), emissiveIntensity: 0.2 });
    const m = mesh(new THREE.BoxGeometry(CARD.w, 1, CARD.h), [sideMat, sideMat, back, sideMat, sideMat, sideMat]);
    m.position.set(p.x, 0.1, p.z); m.castShadow = true; m.rotation.y = side === 0 ? 0.03 : Math.PI - 0.03;
    table.add(m);
    return m;
  });

  const dust = dustMotes(260, [0, 5.6, 0.3], [1.0, 0.86, 0.6]); scene.add(dust); R.dust = dust;
  buildRival(R);
  scene.traverse((o) => { if (o.isLight) o.layers.enableAll(); });
  void LAYER;
  return R;
}
