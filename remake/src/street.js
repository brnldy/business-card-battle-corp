// Fundo 3D do menu: a sede da Business Card Battle Corp. numa rua em ruínas, de noite.
// Céu com um redemoinho e números girando, letreiro no telhado, janelas e postes que piscam,
// e uma fila de candidatos de terno que sai da porta aberta e some para fora do quadro:
// a cada poucos segundos o primeiro entra para a "entrevista" e a fila anda uma pessoa.
// Tudo gerado por código; as pessoas usam o modelo CC0 "Business Man" (Quaternius) com as animações dele.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { model, clips } from './assets.js';
import { fbm, mkCanvas, paint, tex, hash, SERIF, LOGO } from './textures.js';
import { timeUniform } from './gfx.js';

const M = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const rbox = (w, h, d, r, m) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), m);
const cyl = (rt, rb, h, seg, m) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const WARM = 0xffb25c;
const SKY_C = new THREE.Vector2(0.48, 0.6); // centro do redemoinho no céu (acima do prédio)

// ───────── texturas ─────────
function brickTexture(seed = 1, dark = 1) {
  const W = 256, H = 256, { c, g } = mkCanvas(W, H), BW = 32, BH = 12;
  paint(g, W, H, (x, y) => {
    const row = Math.floor(y / BH), off = row % 2 ? BW / 2 : 0, bx = Math.floor((x + off) / BW);
    const mx = (x + off) % BW, my = y % BH, mortar = mx < 2 || my < 2;
    const tone = 0.55 + hash(bx, row, seed) * 0.45, n = fbm(x / 40, y / 40, seed, 4), streak = fbm(x / 6, y / 90, seed + 5, 3);
    let v = (mortar ? 0.42 : tone) * (0.55 + n * 0.6) * (0.75 + streak * 0.35) * dark;
    v *= 1 - clamp01((fbm(x / 70, y / 70, seed + 9, 3) - 0.55) * 3) * 0.5; // manchas de umidade
    return mortar ? [86 * v, 78 * v, 66 * v] : [120 * v, 72 * v, 52 * v];
  });
  return tex(c, { repeat: [1, 1], pixel: true });
}
function concreteTexture(seed = 3) {
  const S = 256, { c, g } = mkCanvas(S, S);
  paint(g, S, S, (x, y) => { const v = 0.3 + fbm(x / 30, y / 30, seed, 5) * 0.45 + (hash(x, y, seed) - 0.5) * 0.08; return [92 * v, 88 * v, 78 * v]; });
  return tex(c, { repeat: [1, 1], pixel: true });
}
function asphaltTexture() {
  const S = 512, { c, g } = mkCanvas(S, S);
  paint(g, S, S, (x, y) => {
    const n = fbm(x / 60, y / 60, 11, 5), grit = hash(x, y, 4);
    const wet = clamp01((fbm(x / 90, y / 90, 21, 4) - 0.5) * 5);
    const v = (0.16 + n * 0.2 + grit * 0.05) * (1 - wet * 0.45);
    return [70 * v, 68 * v, 60 * v];
  });
  return tex(c, { repeat: [6, 6], pixel: true });
}
// rugosidade: poças bem lisas (refletem as luzes), o resto fosco
function puddleRoughness() {
  const S = 256, { c, g } = mkCanvas(S, S);
  paint(g, S, S, (x, y) => { const w = clamp01((fbm(x / 45, y / 45, 21, 4) - 0.5) * 5); const v = 255 * (0.85 - w * 0.75); return [v, v, v]; });
  return tex(c, { repeat: [6, 6], srgb: false });
}
// interior iluminado visto pela porta e pelas janelas
function glowTexture(kind) {
  const W = 64, H = 96, { c, g } = mkCanvas(W, H);
  const gr = g.createLinearGradient(0, 0, 0, H);
  if (kind === 'door') { gr.addColorStop(0, '#3a1c08'); gr.addColorStop(0.55, '#c9752c'); gr.addColorStop(1, '#ffd08a'); }
  else { gr.addColorStop(0, '#ffcf8a'); gr.addColorStop(1, '#a2541c'); }
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (kind === 'window') { g.fillStyle = 'rgba(40,18,6,0.85)'; g.fillRect(W / 2 - 2, 0, 4, H); g.fillRect(0, H * 0.45, W, 4); }
  return tex(c, { pixel: true });
}
// letreiro do telhado, com o título do jogo
function signTexture() {
  const W = 1024, H = 360, { c, g } = mkCanvas(W, H);
  paint(g, W, H, (x, y) => { const v = 0.12 + fbm(x / 60, y / 60, 31, 4) * 0.12; return [120 * v, 70 * v, 50 * v]; });
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const glow = (txt, x, y, size, color, blur) => { g.font = `400 ${size}px ${LOGO}`; g.shadowColor = color; g.shadowBlur = blur; g.fillStyle = color; g.fillText(txt, x, y); g.shadowBlur = 0; };
  glow('BUSINESS', W / 2, 140, 132, '#f3d39a', 26);
  glow('CARD', W * 0.38, 300, 170, '#f6dca6', 30);
  // etiqueta "Battle" inclinada e "Corp."
  g.save(); g.translate(W * 0.72, 238); g.rotate(-0.06);
  g.fillStyle = '#1a120c'; g.strokeStyle = '#e7c486'; g.lineWidth = 5; g.beginPath(); g.roundRect(-110, -44, 220, 80, 24); g.fill(); g.stroke();
  g.font = `italic 400 58px ${LOGO}`; g.fillStyle = '#f0d49c'; g.shadowColor = '#f0d49c'; g.shadowBlur = 14; g.fillText('Battle', 0, 16); g.restore();
  g.shadowBlur = 0; g.font = `400 62px ${LOGO}`; g.fillStyle = '#9d8160'; g.fillText('Corp.', W * 0.9, 300);
  // lâmpadas apagadas em duas letras, como num letreiro velho
  g.fillStyle = 'rgba(20,12,8,0.6)'; g.fillRect(W / 2 - 52, 40, 50, 104);
  return tex(c, { pixel: false });
}
// um número do céu (fonte serifada dos títulos, com brilho)
function digitTexture(ch) {
  const S = 128, { c, g } = mkCanvas(S, S);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `400 104px ${SERIF}`;
  g.shadowColor = '#e8cf9a'; g.shadowBlur = 18; g.fillStyle = '#f2ddb0'; g.fillText(ch, S / 2, S / 2 + 6);
  return tex(c, { pixel: false });
}
// paleta do modelo do candidato recolorida: terno, camisa, gravata/calça, pele e cabelo (pessoas diferentes na fila)
const SUITS = ['#1d232a', '#2b2b2e', '#3a2c22', '#1f2a22', '#3b1f22', '#45474c', '#25283a', '#4a3b2a'];
const SHIRTS = ['#a2a1a4', '#b8b2a0', '#8e9aa6', '#c2b49a'];
const TIES = ['#44474f', '#6a2420', '#2b3d52', '#5a4a1e', '#3a3a3a'];
const SKINS = ['#e2c0a0', '#c89a74', '#a87650', '#80542f', '#5c3a20', '#f0d2b6'];
const HAIRS = ['#1e1a16', '#3c2a19', '#6b4a24', '#9a8a70', '#b08a46', '#2a1f1a'];
function personPalette(i) {
  const W = 32, H = 4, { c, g } = mkCanvas(W, H), pick = (arr, k) => arr[Math.floor(hash(i, k, 77) * arr.length)];
  const groups = [pick(SUITS, 1), pick(SHIRTS, 2), pick(TIES, 3), pick(SKINS, 4), pick(HAIRS, 5), pick(HAIRS, 5), '#382d28', '#2a1f1a'];
  groups.forEach((col, k) => { g.fillStyle = col; g.fillRect(k * 4, 0, 4, H); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.flipY = false;
  return t;
}

// céu: redemoinho lento em tons de sépia e oliva
function skyMaterial() {
  return new THREE.ShaderMaterial({
    fog: false, depthWrite: false,
    uniforms: { uTime: timeUniform, uC: { value: SKY_C } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      varying vec2 vUv; uniform float uTime; uniform vec2 uC;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fb(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * n(p); p *= 2.03; a *= 0.5; } return v; }
      void main(){
        vec2 p = (vUv - uC) * vec2(2.0, 1.0);
        float r = length(p), a = atan(p.y, p.x);
        float swirl = a + log(r + 0.02) * 2.6 + uTime * 0.05;
        vec2 q = vec2(cos(swirl), sin(swirl)) * (0.6 + r * 2.0);
        float cloud = fb(q * 2.2 + vec2(0.0, uTime * 0.01));
        float arms = 0.5 + 0.5 * sin(swirl * 3.0 + cloud * 4.0);
        float core = exp(-r * 9.0);
        float v = cloud * (0.45 + 0.55 * arms) * smoothstep(1.3, 0.05, r) + core * 1.4;
        vec3 dark = vec3(0.07, 0.06, 0.04), mid = vec3(0.36, 0.3, 0.18), hi = vec3(0.95, 0.8, 0.55);
        vec3 col = mix(dark, mid, smoothstep(0.25, 0.7, v));
        col = mix(col, hi, smoothstep(0.75, 1.3, v));
        col *= 0.55 + 0.45 * smoothstep(-0.2, 0.6, vUv.y);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// ───────── a rua ─────────
export function buildStreet() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060504);
  scene.fog = new THREE.FogExp2(0x1d170e, 0.018);
  const camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 400);
  const flick = []; // luzes que piscam: { set(k), rate, seed }
  const powered = []; // janelas acesas sem pisca: também acendem na abertura { set(p), on, seed }

  scene.add(new THREE.HemisphereLight(0x8a7858, 0x0b0805, 1.3));
  const moon = new THREE.DirectionalLight(0xc9b490, 0.9); moon.position.set(4, 20, 8); scene.add(moon);

  // céu e números girando em volta do redemoinho
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(260, 110), skyMaterial()); at(sky, 6, 34, -80); scene.add(sky);
  const vortex = new THREE.Vector3(6 + (SKY_C.x - 0.5) * 260, 34 + (SKY_C.y - 0.5) * 110, -78);
  const digits = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: digitTexture(String(i % 10)), transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
    const d = { m, r: 12 + hash(i, 1, 9) * 30, a: hash(i, 2, 9) * Math.PI * 2, w: (0.03 + hash(i, 3, 9) * 0.04) * (i % 3 ? 1 : 1.4), s: 7 + hash(i, 4, 9) * 6, spin: (hash(i, 5, 9) - 0.5) * 0.4 };
    m.scale.setScalar(d.s); scene.add(m); digits.push(d);
  }

  // chão: rua molhada e calçada
  const asphalt = new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughnessMap: puddleRoughness(), roughness: 1, metalness: 0.15, color: 0x8a8478 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), asphalt); ground.rotation.x = -Math.PI / 2; at(ground, 0, 0, 20); scene.add(ground);
  const concrete = concreteTexture(); concrete.repeat.set(12, 1.5);
  const walk = box(60, 0.16, 4.2, M(0x77705f, { map: concrete })); at(walk, 0, 0.08, 1.9); scene.add(walk);
  const curb = box(60, 0.2, 0.25, M(0x5a5448)); at(curb, 0, 0.1, 4.0); scene.add(curb);

  // ── o prédio da empresa ──
  const bw = 14, bh = 8.6, door = { w: 2.0, h: 2.9 };
  const brick = brickTexture(1); brick.repeat.set(3.5, 2.2);
  const wall = M(0x9a8a78, { map: brick });
  const trim = M(0x3c342b, { map: concreteTexture(7) });
  const hq = new THREE.Group(); scene.add(hq);
  hq.add(at(box(bw, bh, 5.7, wall), 0, bh / 2, -7.25));                                     // corpo atrás do corredor
  const sideW = (bw - door.w) / 2;
  hq.add(at(box(sideW, bh, 3.3, wall), -(door.w + sideW) / 2, bh / 2, -2.75));               // volumes dos lados do corredor
  hq.add(at(box(sideW, bh, 3.3, wall), (door.w + sideW) / 2, bh / 2, -2.75));
  hq.add(at(box(door.w, bh - door.h - 0.05, 3.3, wall), 0, door.h + 0.05 + (bh - door.h) / 2, -2.75));
  hq.add(at(box(sideW, bh, 1.1, wall), -(door.w + sideW) / 2, bh / 2, -0.55));               // fachada à esquerda da porta
  hq.add(at(box(sideW, bh, 1.1, wall), (door.w + sideW) / 2, bh / 2, -0.55));                // fachada à direita
  hq.add(at(box(door.w, bh - door.h, 1.1, wall), 0, door.h + (bh - door.h) / 2, -0.55));     // acima da porta
  hq.add(at(box(bw + 0.5, 0.35, 1.5, trim), 0, 3.35, -0.4));                                 // marquise entre os andares
  hq.add(at(box(bw + 0.7, 0.5, 1.6, trim), 0, bh + 0.1, -0.45));                             // cornija
  // corredor iluminado atrás da porta aberta (é para lá que os candidatos vão)
  const hall = new THREE.Group(); hq.add(hall);
  const hallMat = M(0x6a4428, { emissive: 0x7a3c10, emissiveIntensity: 0.9 });
  hall.add(at(box(0.1, door.h, 3.2, hallMat), -door.w / 2, door.h / 2, -2.7));
  hall.add(at(box(0.1, door.h, 3.2, hallMat), door.w / 2, door.h / 2, -2.7));
  hall.add(at(box(door.w, 0.1, 3.2, hallMat), 0, door.h, -2.7));
  hall.add(at(box(door.w, 0.05, 3.2, M(0x3a2616)), 0, 0.17, -2.7));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(door.w, door.h), new THREE.MeshBasicMaterial({ map: glowTexture('door'), color: 0xffffff })); at(back, 0, door.h / 2, -4.25); hall.add(back);
  const hallLight = new THREE.PointLight(WARM, 60, 12, 1.2); at(hallLight, 0, 2.2, -2.2); hq.add(hallLight);
  // k abaixo de 0,2 só acontece na abertura (luz ainda desligada): aí o brilho vai a zero de verdade
  flick.push({ set: (k) => { hallLight.intensity = 60 * k; back.material.color.setScalar(k < 0.2 ? k * 3 : 0.65 + 0.35 * k); }, rate: 0.6, seed: 1 });
  // batente e porta aberta para fora
  const frameM = M(0x2a2018);
  hq.add(at(box(0.16, door.h + 0.1, 0.3, frameM), -door.w / 2 - 0.08, door.h / 2, 0.02));
  hq.add(at(box(0.16, door.h + 0.1, 0.3, frameM), door.w / 2 + 0.08, door.h / 2, 0.02));
  hq.add(at(box(door.w + 0.32, 0.16, 0.3, frameM), 0, door.h + 0.05, 0.02));
  const leaf = new THREE.Group(); at(leaf, -door.w / 2, 0, 0.05); leaf.rotation.y = 1.25; hq.add(leaf);
  leaf.add(at(box(door.w * 0.96, door.h - 0.05, 0.08, M(0x3a2a1c)), door.w * 0.48, door.h / 2, 0));
  leaf.add(at(box(door.w * 0.6, door.h * 0.36, 0.1, M(0x2c1f14)), door.w * 0.48, door.h * 0.66, 0));
  // degraus
  for (let i = 0; i < 2; i++) hq.add(at(box(door.w + 1.2 - i * 0.4, 0.18, 0.55 - i * 0.05, trim), 0, 0.16 + 0.09 + i * 0.18, 0.35 - i * 0.3));
  // luminária sobre a porta
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.26, 12, 1, true), M(0x2a2620, { side: THREE.DoubleSide })); at(shade, 0, door.h + 0.55, 0.65); hq.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); at(bulb, 0, door.h + 0.45, 0.65); hq.add(bulb);
  hq.add(at(box(0.05, 0.05, 0.7, frameM), 0, door.h + 0.68, 0.3));
  const doorLamp = new THREE.SpotLight(0xffc787, 220, 14, 1.0, 0.6, 1.2); at(doorLamp, 0, door.h + 0.45, 0.7); doorLamp.target.position.set(0, 0, 2.6); hq.add(doorLamp, doorLamp.target);
  flick.push({ set: (k) => { doorLamp.intensity = 220 * k; bulb.material.color.setRGB(1 * k + 0.1, 0.85 * k + 0.08, 0.63 * k + 0.05); }, rate: 1.4, seed: 2 });

  // janelas: algumas acesas (às vezes piscando), outras apagadas ou quebradas
  const winLit = new THREE.MeshBasicMaterial({ map: glowTexture('window') });
  const winDark = M(0x0d0b09), winFrame = M(0x241b14);
  const addWindow = (x, y, w, h, kind, i) => {
    hq.add(at(box(w + 0.24, h + 0.24, 0.12, winFrame), x, y, 0.02));
    hq.add(at(box(w + 0.5, 0.12, 0.3, trim), x, y - h / 2 - 0.12, 0.08));
    let m;
    if (kind === 'lit') { m = winLit.clone(); m.color.setScalar(0.3 + hash(i, 7, 3) * 0.45); }
    else m = winDark;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); at(pane, x, y, 0.09); hq.add(pane);
    if (kind === 'lit' && hash(i, 9, 3) > 0.5) flick.push({ set: (k) => { m.color.setScalar((0.3 + hash(i, 7, 3) * 0.45) * (k < 0.2 ? k * 1.5 : 0.3 + 0.7 * k)); }, rate: 0.5 + hash(i, 8, 3), seed: 10 + i });
    else if (kind === 'lit') powered.push({ set: (p) => { m.color.setScalar((0.3 + hash(i, 7, 3) * 0.45) * (0.04 + 0.96 * p)); }, seed: 10 + i });
    if (kind === 'broken') { const s = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.5, h * 0.4), M(0x2a2620)); at(s, x - w * 0.2, y + h * 0.25, 0.1); s.rotation.z = 0.5; hq.add(s); }
    if (kind === 'boarded') for (let b = 0; b < 3; b++) { const p = box(w * 1.1, 0.18, 0.06, M(0x4a3626)); at(p, x, y - h * 0.3 + b * h * 0.3, 0.14); p.rotation.z = (hash(i, b, 5) - 0.5) * 0.4; hq.add(p); }
  };
  const kinds = ['lit', 'dark', 'lit', 'broken', 'lit', 'dark', 'lit', 'dark', 'boarded', 'lit'];
  let wi = 0;
  for (const y of [4.6, 6.9]) for (const x of [-5.4, -2.7, 0, 2.7, 5.4]) addWindow(x, y, 1.5, 1.55, kinds[wi++ % kinds.length], wi);
  addWindow(-4.3, 1.65, 3.0, 1.9, 'lit', 40); addWindow(4.3, 1.65, 3.0, 1.9, 'boarded', 41);

  // letreiro no telhado com três luminárias de pescoço
  const sign = new THREE.Group(); at(sign, 0.2, bh + 0.4, -0.7); sign.rotation.z = -0.02; hq.add(sign);
  sign.add(at(box(10.4, 3.8, 0.3, M(0x221a14)), 0, 2.0, -0.2));
  const signMat = new THREE.MeshLambertMaterial({ map: signTexture(), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.5), signMat); at(face, 0, 2.0, -0.04); sign.add(face);
  const signGlow = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.5), new THREE.MeshBasicMaterial({ map: signMat.map, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  at(signGlow, 0, 2.0, -0.02); sign.add(signGlow);
  for (let i = 0; i < 3; i++) sign.add(at(box(0.12, 2.6, 0.12, frameM), -3.6 + i * 3.6, -0.9, -0.3));
  for (let i = 0; i < 3; i++) {
    const x = -3.4 + i * 3.4;
    sign.add(at(box(0.06, 0.06, 1.0, frameM), x, 4.1, 0.25));
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.32, 10, 1, true), M(0x2a2620, { side: THREE.DoubleSide })); head.rotation.x = -0.9; at(head, x, 4.0, 0.8); sign.add(head);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe0a8 })); at(b, x, 3.9, 0.85); sign.add(b);
  }
  const signLight = new THREE.SpotLight(0xffd59a, 260, 16, 0.75, 0.7, 1.2); at(signLight, 0, bh + 4.8, 2.4); signLight.target.position.set(0, bh + 2.2, -0.7); scene.add(signLight, signLight.target);
  flick.push({ set: (k) => { signGlow.material.opacity = 0.55 * k; signLight.intensity = k < 0.2 ? 260 * k : 260 * (0.6 + 0.4 * k); }, rate: 0.35, seed: 3 });

  // ── prédios em ruínas dos lados e silhuetas ao fundo ──
  const ruin = M(0x6a5c4e, { map: (() => { const t = brickTexture(5, 0.7); t.repeat.set(3, 3); return t; })() });
  const ruinBlock = (x, z, w, d, h, jag, seed) => {
    const g = new THREE.Group(); scene.add(g);
    g.add(at(box(w, h, d, ruin), x, h / 2, z));
    for (let i = 0; i < jag; i++) { const ww = w / jag, hh = hash(i, seed, 2) * 3.2; if (hh > 0.4) g.add(at(box(ww * (0.6 + hash(i, seed, 3) * 0.4), hh, d * 0.9, ruin), x - w / 2 + ww * (i + 0.5), h + hh / 2, z)); }
    for (let fy = 2; fy < h - 1; fy += 2.6) for (let fx = -w / 2 + 1.2; fx < w / 2 - 0.8; fx += 2.2) {
      const lit = hash(fx * 7, fy * 3, seed) > 0.9;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.4), lit ? new THREE.MeshBasicMaterial({ color: 0x8a5a2a }) : winDark); at(p, x + fx, fy, z + d / 2 + 0.02); g.add(p);
    }
    return g;
  };
  ruinBlock(-15.5, -4, 11, 10, 11, 6, 1);
  ruinBlock(15.5, -5, 11, 10, 9.5, 5, 2);
  ruinBlock(-27, -12, 12, 10, 16, 5, 3);
  ruinBlock(28, -14, 14, 10, 14, 6, 4);
  const far = M(0x1a1510);
  for (let i = 0; i < 14; i++) { const h = 8 + hash(i, 1, 6) * 22, w = 5 + hash(i, 2, 6) * 7; scene.add(at(box(w, h, 6, far), -60 + i * 9 + hash(i, 3, 6) * 4, h / 2, -40 - hash(i, 4, 6) * 12)); }
  // uma ponte em pedaços, à direita
  const bridge = M(0x2a231c);
  scene.add(at(box(18, 0.8, 3, bridge), 30, 9, -22)); scene.add(at(box(1.2, 9, 1.2, bridge), 25, 4.5, -22)); scene.add(at(box(1.2, 9, 1.2, bridge), 35, 4.5, -22));

  // ── poste de luz à esquerda ──
  const pole = M(0x1c1915);
  const lamp = new THREE.Group(); at(lamp, -7.2, 0, 4.6); scene.add(lamp);
  lamp.add(at(cyl(0.09, 0.14, 6.4, 8, pole), 0, 3.2, 0));
  const arm = at(box(1.7, 0.08, 0.08, pole), 0.8, 6.3, 0); arm.rotation.z = -0.15; lamp.add(arm);
  const sh = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 12, 1, true), M(0x2a2620, { side: THREE.DoubleSide })); at(sh, 1.6, 6.05, 0); lamp.add(sh);
  const lb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2b0 })); at(lb, 1.6, 5.94, 0); lamp.add(lb);
  const streetLight = new THREE.SpotLight(0xffd8a0, 420, 18, 0.7, 0.55, 1.2); at(streetLight, -5.6, 5.9, 4.6); streetLight.target.position.set(-5.2, 0, 4.8); scene.add(streetLight, streetLight.target);
  flick.push({ set: (k) => { streetLight.intensity = 420 * k; lb.material.color.setRGB(k + 0.05, 0.88 * k + 0.05, 0.69 * k + 0.04); }, rate: 0.9, seed: 4, hard: true });

  // ── carros abandonados e entulho ──
  const rust = M(0x4a3524), dark = M(0x15110d);
  const car = (x, z, ry, tilt, seed) => {
    const g = new THREE.Group(); at(g, x, 0, z); g.rotation.set(0, ry, tilt); scene.add(g);
    g.add(at(rbox(4.4, 0.85, 1.9, 0.22, rust), 0, 0.72, 0));
    g.add(at(rbox(2.4, 0.72, 1.7, 0.25, rust), -0.25, 1.45, 0));
    g.add(at(box(2.2, 0.5, 1.72, dark), -0.25, 1.48, 0));
    for (const [wx, wz] of [[-1.45, 0.92], [1.45, 0.92], [-1.45, -0.92], [1.45, -0.92]]) if (hash(wx * 3, wz * 5, seed) > 0.25) { const w = at(cyl(0.38, 0.38, 0.26, 12, dark), wx, 0.38, wz); w.rotation.x = Math.PI / 2; g.add(w); }
    g.add(at(box(0.1, 0.22, 1.5, M(0x6b5a40)), 2.22, 0.75, 0));
    return g;
  };
  car(-9.5, 7.2, 0.35, 0.04, 1);
  car(10.5, 8.5, -0.5, -0.05, 2);
  const debris = M(0x3d342a);
  for (let i = 0; i < 26; i++) { const s = 0.15 + hash(i, 1, 8) * 0.5, d = box(s * (1 + hash(i, 2, 8)), s * 0.6, s, debris); at(d, -14 + hash(i, 3, 8) * 28, s * 0.3, 4.5 + hash(i, 4, 8) * 9); d.rotation.set(hash(i, 5, 8), hash(i, 6, 8) * 3, 0); scene.add(d); }
  const plank = box(0.5, 2.0, 0.06, M(0x4a3a2a)); at(plank, 2.0, 1.0, 0.45); plank.rotation.set(0, 0.1, -0.25); scene.add(plank);

  // ── a fila de candidatos ──
  // caminho: de dentro do corredor, pela porta e degraus, e depois pela calçada até sair do quadro à direita
  const path = new THREE.CatmullRomCurve3([
    [0, 0.16, -3.4], [0, 0.16, -1.6], [0, 0.5, 0.15], [0.05, 0.16, 1.2], [0.5, 0.16, 2.3], [1.4, 0.08, 3.6],
    [2.6, 0, 5.2], [3.9, 0, 7.0], [5.2, 0, 8.9], [6.4, 0, 10.9], [7.5, 0, 13.0], [8.5, 0, 15.2], [9.4, 0, 17.5], [10.2, 0, 19.8], [11, 0, 22.5],
  ].map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.3);
  // distâncias ao longo do caminho: a 1ª vaga é o pé da escada; quem entra vai até ENTER (fundo do corredor) e some
  const L = path.getLength(), GAP = 1.05, START = 4.6, ENTER = 0.6;
  const N = Math.ceil((L - START) / GAP) + 1;
  const people = [];
  const queueLight = new THREE.PointLight(0xffc88a, 110, 16, 1.2); at(queueLight, 7.5, 3.6, 11); scene.add(queueLight);
  const clipList = clips('business_man');
  const clipOf = (name) => clipList.find((c) => c.name.endsWith(`|${name}`));
  const walkClip = clipOf('Walk'), idleClip = clipOf('Idle_Neutral') ?? clipOf('Idle');
  const unit = 0.93; // o modelo tem ~1,95 m na escala 1 (medido pelos ossos; o Box3 de malha com esqueleto engana)
  const spawn = (p, variant) => {
    p.variant = variant;
    const map = personPalette(variant);
    p.mats.forEach((m) => { m.map = map; m.needsUpdate = true; });
    const s = unit * (0.92 + hash(variant, 1, 13) * 0.16); p.obj.scale.set(s * (0.94 + hash(variant, 2, 13) * 0.14), s, s);
  };
  for (let i = 0; i < N; i++) {
    const obj = model('business_man');
    const mats = [];
    obj.traverse((c) => { if (c.isMesh) { c.castShadow = false; c.frustumCulled = false; mats.push(c.material); c.material.roughness = 0.85; c.material.metalness = 0; } });
    scene.add(obj);
    const mixer = new THREE.AnimationMixer(obj);
    const walkA = walkClip ? mixer.clipAction(walkClip) : null, idleA = idleClip ? mixer.clipAction(idleClip) : null;
    walkA?.play(); idleA?.play();
    if (walkA) walkA.setEffectiveWeight(0);
    mixer.update(hash(i, 3, 2) * 3);
    const p = { obj, mats, mixer, walkA, idleA, d: START + i * GAP, target: START + i * GAP, w: 0, fidget: hash(i, 4, 2) };
    spawn(p, i);
    people.push(p);
  }
  let nextVariant = N, cycle = 0;
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const place = (p) => {
    const u = THREE.MathUtils.clamp(p.d / L, 0, 1);
    path.getPointAt(u, tmp); path.getPointAt(Math.max(0, u - 0.004), tmp2);
    p.obj.position.copy(tmp);
    const ang = Math.atan2(tmp2.x - tmp.x, tmp2.z - tmp.z);
    let da = ang - p.obj.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da));
    p.obj.rotation.y += p.init ? da * (p.moving ? 0.18 : 0.04) : da; p.init = true;
    // quem já passou da porta vai sumindo no corredor
    const fade = THREE.MathUtils.clamp((p.d - 1.0) / 2.2, 0, 1);
    p.mats.forEach((m) => { m.opacity = fade; m.transparent = fade < 0.99; m.depthWrite = fade > 0.99; });
    p.obj.visible = fade > 0.01;
  };
  people.forEach(place);

  // ───────── abertura ─────────
  // A câmera começa no céu, olhando o redemoinho, e desce até a fachada enquanto a luz volta: primeiro o poste, depois o
  // corredor e a luminária da porta, as janelas uma a uma e por último o letreiro, que custa a pegar. Clique ou tecla pula.
  const INTRO = { cam: 3.4, end: 3.5, fade: 1.1 }, ON = { 4: 0.8, 1: 1.35, 2: 1.5, 3: 2.35 };
  const onAt = (seed) => ON[seed] ?? 1.75 + ((seed * 7) % 9) * 0.07;
  for (const f of flick) f.on = onAt(f.seed);
  for (const w of powered) w.on = onAt(w.seed);
  // acende piscando: nos primeiros 0,5 s depois da hora dela, liga e desliga com chance crescente de ficar ligada
  const power = (x, seed) => (x < 0 ? 0 : x > 0.5 ? 1 : hash(Math.floor(x * 24), seed, 7) < 0.25 + x * 1.5 ? 1 : 0.05);
  // o céu é um painel: a câmera sobe só até a borda de cima dele não aparecer (senão surge uma faixa preta no alto)
  const camStart = new THREE.Vector3(-0.8, 5.5, 30), lookStart = new THREE.Vector3(0.5, 21, -40);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  let intro = null;
  const finishIntro = () => { if (!intro) return; const cb = intro.done; intro = null; powered.forEach((w) => w.set(1)); cb?.(); };

  // ───────── animação ─────────
  const camBase = new THREE.Vector3(-2.5, 1.5, 24), lookBase = new THREE.Vector3(-5.2, 6.2, 0), camNow = new THREE.Vector3(), lookNow = new THREE.Vector3();
  function update(dt, t, mouse = { x: 0.5, y: 0.5 }) {
    const ti = intro ? (intro.t += dt) : Infinity;
    for (const d of digits) {
      d.a += d.w * dt;
      d.m.position.set(vortex.x + Math.cos(d.a) * d.r * 1.5, vortex.y + Math.sin(d.a) * d.r * 0.55, vortex.z + 4 + Math.sin(d.a) * 2);
      d.m.rotation.z = Math.sin(t * 0.3 + d.r) * 0.3 + d.spin * t;
      d.m.material.opacity = 0.7 + 0.3 * Math.sin(t * 0.7 + d.r);
    }
    for (const f of flick) {
      // quase sempre aceso; de vez em quando uma sequência de piscadas
      const s = Math.sin(t * f.rate + f.seed * 13.1) + Math.sin(t * f.rate * 2.7 + f.seed * 3.3);
      let k = 1;
      if (s > 1.55) k = hash(Math.floor(t * 18), f.seed, 1) > 0.45 ? (f.hard ? 0.04 : 0.35) : 1;
      else k = 0.93 + 0.07 * Math.sin(t * 23 + f.seed);
      f.set(ti < INTRO.end ? k * power(ti - f.on, f.seed) : k);
    }
    if (ti < INTRO.end) for (const w of powered) w.set(power(ti - w.on, w.seed));
    // a fila: a cada ~4,5 s o primeiro entra e todos andam uma vaga
    cycle += dt;
    if (cycle > 4.6) {
      cycle = 0;
      for (const p of people) p.target -= GAP;
      const first = people.reduce((a, b) => (a.target < b.target ? a : b));
      first.target = ENTER; // atravessa a porta e some no corredor
    }
    for (const p of people) {
      if (p.d <= ENTER + 0.05 && p.target <= ENTER) {
        // reaparece no fim da fila, fora do quadro
        const last = Math.max(...people.map((q) => q.target));
        p.d = p.target = last + GAP; spawn(p, nextVariant++);
      }
      const diff = p.target - p.d;
      p.moving = Math.abs(diff) > 0.02;
      if (p.moving) p.d += Math.sign(diff) * Math.min(Math.abs(diff), dt * (p.target <= ENTER ? 1.05 : 1.25));
      p.w += ((p.moving ? 1 : 0) - p.w) * Math.min(1, dt * 6);
      p.walkA?.setEffectiveWeight(p.w); p.idleA?.setEffectiveWeight(1 - p.w);
      p.mixer.update(dt * (0.85 + p.fidget * 0.3));
      place(p);
    }
    const mx = mouse.x - 0.5, my = mouse.y - 0.5;
    camNow.set(camBase.x + Math.sin(t * 0.07) * 0.5 + mx * 0.6, camBase.y + Math.sin(t * 0.11) * 0.08 - my * 0.25, camBase.z);
    lookNow.set(lookBase.x + mx * 0.8, lookBase.y - my * 0.4, lookBase.z);
    if (ti < INTRO.cam) { const e = ease(ti / INTRO.cam); camNow.lerpVectors(camStart, camNow, e); lookNow.lerpVectors(lookStart, lookNow, e); }
    camera.position.copy(camNow); camera.lookAt(lookNow);
    api.fade = ti < INTRO.fade ? 1 - ease(ti / INTRO.fade) : 0;
    if (ti >= INTRO.end) finishIntro();
  }
  const resize = (aspect) => { camera.aspect = aspect; camera.updateProjectionMatrix(); };
  const api = {
    scene, camera, update, resize, people, fade: 0,
    /** a abertura: começa no escuro, no céu; done é chamado quando a câmera chega na fachada (ou quando pulam) */
    intro(done) { intro = { t: 0, done }; api.fade = 1; },
    get introOn() { return !!intro; },
    get introT() { return intro ? intro.t : null; }, // para os testes acompanharem a abertura
    skipIntro() { if (intro) { intro.t = INTRO.end; finishIntro(); api.fade = 0; } },
  };
  update(0, 0);
  return api;
}
