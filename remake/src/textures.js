// Geradores procedurais de textura (canvas 2D + ruído de valor) e composição das faces das cartas.
import * as THREE from 'three';
import { CARDS } from './cards.js';
import { img } from './assets.js';
import { isEffect } from './engine.js';

export const SERIF = '"Apple Garamond", Georgia, "Times New Roman", serif';
export const MONO = '"Courier New", Consolas, monospace';
export const SANS = 'Helvena, "Segoe UI", system-ui, sans-serif';

// ───────── ruído ─────────
function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, s = 1, oct = 5) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += amp * vnoise(x * f, y * f, s + i * 17); f *= 2.03; amp *= 0.5; }
  return v;
}
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, g: c.getContext('2d') };
}
// preenche por pixel com fn(x,y) -> [r,g,b] (0..255)
function paint(g, w, h, fn) {
  const im = g.createImageData(w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, gg, b] = fn(x, y), i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
}
function tex(c, { repeat, pixel = false, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; } else t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ───────── mesa ─────────
// Layout em unidades de mundo (x: esquerda→direita, z: oponente(−) → jogador(+)).
export const TABLE = { w: 7.4, d: 4.7 };
export const CARD = { w: 0.6, h: 0.6 * 1257 / 1079 };
export const LAYOUT = (() => {
  const xs = [-1.52, -0.76, 0, 0.76, 1.52];
  const row = (z) => xs.map((x) => ({ x, z }));
  return {
    myCr: row(0.5), myFx: row(1.38), oppCr: row(-0.5), oppFx: row(-1.38),
    myDeck: { x: 2.52, z: 1.38 }, myDead: { x: 2.52, z: 0.5 },
    oppDeck: { x: -2.52, z: -1.38 }, oppDead: { x: -2.52, z: -0.5 },
    myCaixa: { x: -2.75, z: 1.05 }, oppCaixa: { x: 2.75, z: -1.05 },
    bell: { x: 3.1, z: 1.55 },
  };
})();

export function deskTexture() {
  const W = 1480, H = 940, { c, g } = canvas(W, H);
  const px = (x) => (x / TABLE.w + 0.5) * W, pz = (z) => (z / TABLE.d + 0.5) * H, sc = W / TABLE.w;
  paint(g, W, H, (x, y) => {
    // tampo de laminado claro com um forro verde embutido (limpo, levemente gasto)
    const edge = Math.min(x, y, W - x, H - y);
    const n = fbm(x / 120, y / 120, 3, 4), n2 = hash(x, y, 8);
    if (edge < 44) { const v = 0.9 + n * 0.08 - (edge > 40 ? 0.35 : 0); return [176 * v, 184 * v, 172 * v]; }
    const wear = clamp01((fbm(x / 320, y / 240 + 9, 12, 4) - 0.5) * 2.2);
    const v = 0.86 + n * 0.2 + n2 * 0.05 + wear * 0.08 - (edge < 50 ? 0.25 : 0);
    return [24 * v, 62 * v, 47 * v];
  });
  const ink = (a = 0.7) => `rgba(214,226,206,${a})`;
  const slot = (p, w, h, o = {}) => {
    const x = px(p.x) - (w * sc) / 2, y = pz(p.z) - (h * sc) / 2;
    if (o.fill) { g.fillStyle = o.fill; g.beginPath(); g.roundRect(x, y, w * sc, h * sc, 10); g.fill(); }
    g.strokeStyle = ink(o.a ?? 0.7); g.lineWidth = o.lw ?? 2.4; g.setLineDash(o.dash ?? []);
    g.beginPath(); g.roundRect(x, y, w * sc, h * sc, 10); g.stroke(); g.setLineDash([]);
    if (o.cross) { g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + 12, y + 12); g.lineTo(x + w * sc - 12, y + h * sc - 12); g.moveTo(x + w * sc - 12, y + 12); g.lineTo(x + 12, y + h * sc - 12); g.stroke(); }
    if (o.label) { g.fillStyle = ink(0.55); g.font = `400 15px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.label, px(p.x), pz(p.z) + (o.ly ?? 0)); }
  };
  const cw = CARD.w + 0.1, ch = CARD.h + 0.1, soft = 'rgba(10,30,22,0.22)';
  LAYOUT.myCr.forEach((p) => slot(p, cw, ch, { fill: soft })); LAYOUT.oppCr.forEach((p) => slot(p, cw, ch, { fill: soft }));
  LAYOUT.myFx.forEach((p) => slot(p, cw, ch, { dash: [9, 7], a: 0.5 })); LAYOUT.oppFx.forEach((p) => slot(p, cw, ch, { dash: [9, 7], a: 0.5 }));
  slot(LAYOUT.myDeck, cw, ch, { label: 'deck' }); slot(LAYOUT.oppDeck, cw, ch, { label: 'deck' });
  slot(LAYOUT.myDead, cw, ch, { cross: true, a: 0.45 }); slot(LAYOUT.oppDead, cw, ch, { cross: true, a: 0.45 });
  // rótulos das fileiras (para quem nunca jogou)
  g.fillStyle = ink(0.5); g.font = `400 16px ${SANS}`; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.save(); g.translate(px(-2.02), pz(0.5)); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('criaturas', 0, 0); g.restore();
  g.save(); g.translate(px(-2.02), pz(1.38)); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('efeitos', 0, 0); g.restore();
  g.save(); g.translate(px(2.02), pz(-0.5)); g.rotate(Math.PI / 2); g.textAlign = 'center'; g.fillText('criaturas', 0, 0); g.restore();
  g.save(); g.translate(px(2.02), pz(-1.38)); g.rotate(Math.PI / 2); g.textAlign = 'center'; g.fillText('efeitos', 0, 0); g.restore();
  g.textAlign = 'center'; g.fillText('morto', px(LAYOUT.myDead.x), pz(LAYOUT.myDead.z) - (ch * sc) / 2 - 14); g.fillText('morto', px(LAYOUT.oppDead.x), pz(LAYOUT.oppDead.z) + (ch * sc) / 2 + 14);
  g.strokeStyle = ink(0.3); g.lineWidth = 1.5; g.setLineDash([4, 10]); g.beginPath(); g.moveTo(px(-1.95), pz(0)); g.lineTo(px(1.95), pz(0)); g.stroke(); g.setLineDash([]);
  g.fillStyle = ink(0.35); g.font = `400 13px ${SANS}`; g.textAlign = 'left';
  g.fillText('form. 27-B  ·  mesa de negociação  ·  não remover', px(-1.9), pz(2.05));
  return tex(c);
}

export function carpetTexture() {
  const S = 128, { c, g } = canvas(S, S);
  paint(g, S, S, (x, y) => { const v = (0.8 + hash(x, y, 5) * 0.2) * (0.9 + fbm(x / 30, y / 30, 2, 3) * 0.2); return [20 * v, 52 * v, 38 * v]; });
  return tex(c, { repeat: [14, 14] });
}
export function wallTexture() {
  const W = 512, H = 256, { c, g } = canvas(W, H);
  paint(g, W, H, (x, y) => {
    let v = 0.93 + fbm(x / 90, y / 90, 9, 3) * 0.06 - clamp01((y / H - 0.82) * 2) * 0.1;
    if (x % 256 < 2) v *= 0.82;
    return [226 * v, 234 * v, 224 * v];
  });
  return tex(c, { repeat: [4, 1] });
}
export function ceilingTexture() {
  const S = 128, { c, g } = canvas(S, S);
  paint(g, S, S, (x, y) => { const border = x < 2 || y < 2 ? 0.8 : 1, v = (0.86 + hash(x >> 1, y >> 1, 3) * 0.06) * border; return [226 * v, 232 * v, 224 * v]; });
  return tex(c, { repeat: [10, 10] });
}
export function metalTexture(seed = 1) {
  const S = 128, { c, g } = canvas(S, S);
  paint(g, S, S, (x, y) => {
    const br = fbm(x / 90, y / 2.5, seed, 3), rust = clamp01((fbm(x / 26, y / 26, seed + 9, 4) - 0.56) * 6);
    const v = 0.5 + br * 0.4;
    return [mix(96 * v, 96, rust), mix(104 * v, 50, rust), mix(98 * v, 26, rust)];
  });
  return tex(c);
}
export function woodTexture() {
  const W = 256, H = 64, { c, g } = canvas(W, H);
  paint(g, W, H, (x, y) => {
    const gr = fbm(x / 120, y / 3, 13, 4), k = fbm(x / 30, y / 30, 5, 3);
    const v = 0.3 + gr * 0.5 + k * 0.12;
    return [118 * v, 74 * v, 44 * v];
  });
  return tex(c);
}
export function paperTexture(lines = true, seed = 3) {
  const W = 128, H = 176, { c, g } = canvas(W, H);
  paint(g, W, H, (x, y) => {
    const v = 0.8 + fbm(x / 40, y / 40, seed, 3) * 0.2 - clamp01((fbm(x / 22, y / 22, seed + 4, 3) - 0.6) * 4) * 0.35;
    return [214 * v, 206 * v, 178 * v];
  });
  if (lines) {
    g.fillStyle = 'rgba(30,30,40,0.6)';
    g.fillRect(12, 12, 60, 5);
    for (let y = 30; y < H - 20; y += 9) g.fillRect(12, y, 30 + hash(y, seed, 2) * 74, 2);
    g.strokeStyle = 'rgba(150,30,20,0.7)'; g.lineWidth = 3; g.strokeRect(70, H - 50, 46, 26);
  }
  return tex(c);
}
export function clockTexture() {
  const S = 256, { c, g } = canvas(S, S);
  g.fillStyle = '#f3f6ef'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.fillStyle = '#1c2420';
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, big = i % 5 === 0; g.save(); g.translate(128 + Math.sin(a) * 108, 128 - Math.cos(a) * 108); g.rotate(a); g.fillRect(big ? -3 : -1, big ? -10 : -5, big ? 6 : 2, big ? 20 : 10); g.restore(); }
  return tex(c);
}
export function labelTexture(text, bg, fg) {
  const { c, g } = canvas(256, 56);
  g.fillStyle = bg; g.fillRect(0, 0, 256, 56); g.fillStyle = fg; g.font = `700 30px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 30);
  return tex(c);
}
export function logoTexture() {
  const { c, g } = canvas(832, 240);
  g.fillStyle = '#1f3a2e'; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.font = `400 132px ${SERIF}`; g.fillText('BUSINESS CARD', 4, 96);
  g.font = `400 44px ${SANS}`; const w = g.measureText('Battle').width;
  g.save(); g.translate(250, 196); g.rotate(-0.06); g.beginPath(); g.roundRect(-18, -32, w + 36, 62, 12); g.fill(); g.fillStyle = '#e9ece4'; g.fillText('Battle', 0, 2); g.restore();
  g.fillStyle = '#1f3a2e'; g.font = `400 56px ${SERIF}`; g.fillText('Corp.', 250 + w + 34, 196);
  return tex(c);
}
export function portraitTexture() {
  // "O Fundador": retrato corporativo procedural, pontilhado como as cartas
  const W = 128, H = 160, { c, g } = canvas(W, H);
  paint(g, W, H, (x, y) => {
    const dx = (x - 64) / 30, dyh = (y - 62) / 38, head = dx * dx + dyh * dyh < 1;
    const sh = y > 104 && Math.abs(x - 64) < 26 + (y - 104) * 1.1;
    const tie = Math.abs(x - 64) < 4 + (y > 120 ? 2 : 0) && y > 100;
    const eye = Math.abs(y - 56) < 3 && (Math.abs(x - 52) < 5 || Math.abs(x - 76) < 5);
    const hair = head && y < 44 + Math.abs(x - 64) * 0.18;
    let v = 0.18 + (1 - Math.hypot(x - 64, y - 70) / 120) * 0.25;
    if (sh) v = tie ? 0.1 : (Math.abs(x - 64) < 12 ? 0.8 : 0.22);
    if (head) v = 0.72 - Math.max(0, dx) * 0.25;
    if (hair) v = 0.12; if (eye) v = 0.02;
    v = v > hash(x, y, 9) * 0.9 + 0.05 ? 1 : 0; // pontilhado 1-bit
    return [v ? 196 : 22, v ? 208 : 28, v ? 190 : 26];
  });
  g.fillStyle = '#16201a'; g.fillRect(0, H - 20, W, 20);
  g.fillStyle = '#c4d0be'; g.font = `700 9px ${MONO}`; g.textAlign = 'center'; g.fillText('O FUNDADOR', 64, H - 7);
  return tex(c);
}
export function posterTexture(lines, color = '#c9d6c3') {
  const W = 128, H = 176, { c, g } = canvas(W, H);
  g.fillStyle = color; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#17231d'; g.lineWidth = 3; g.strokeRect(6, 6, W - 12, H - 12);
  g.fillStyle = '#17231d'; g.textAlign = 'center';
  let y = 48;
  for (const [txt, size, f] of lines) { g.font = `${f ?? 400} ${size}px ${f === 700 ? MONO : SERIF}`; g.fillText(txt, W / 2, y); y += size + 8; }
  const im = g.getImageData(0, 0, W, H), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (fbm((i / 4 % W) / 30, (i / 4 / W) / 30, 4, 3) - 0.5) * 60; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
  return tex(c);
}
export function imageTexture(key, pixel = true) {
  const t = new THREE.Texture(img(key));
  t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  if (pixel) { t.magFilter = THREE.NearestFilter; }
  return t;
}
export function noiseTexture() {
  const S = 128, { c, g } = canvas(S, S);
  paint(g, S, S, (x, y) => { const v = fbm(x / 16, y / 16, 4, 4) * 255; return [v, hash(x, y, 2) * 255, fbm(x / 5, y / 5, 9, 2) * 255]; });
  const t = tex(c, { pixel: false, srgb: false }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  return t;
}

// ───────── faces das cartas ─────────
const T = { W: 1079, H: 1257, NAME: { x: 36, y: 38, w: 1006, h: 155 }, ART: { x: 36, y: 205, w: 1006, h: 794 }, ART_FX: { x: 36, y: 205, w: 1006, h: 1008 }, ATK: { x: 220, y: 1040, w: 340, h: 160 }, DEF: { x: 720, y: 1040, w: 310, h: 160 }, R: 18 };
const FULL_ART = { x: 46, y: 368, w: 1483, h: 1038, W: 1576 };
const FACE_SCALE = 0.5;
export const money = (n) => `$${Math.round(n).toLocaleString('pt-BR')}`;
const faceCache = new Map();
let backTex = null;

function cardTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  return t;
}
function fitRect(src, aspect) {
  if (src.w / src.h > aspect) { const w = src.h * aspect; return { x: src.x + (src.w - w) / 2, y: src.y, w, h: src.h }; }
  const h = src.w / aspect; return { x: src.x, y: src.y + (src.h - h) / 2, w: src.w, h };
}
export function cardFaceCanvas(cardId) {
  const def = CARDS.find((c) => c.id === cardId), fx = isEffect(def);
  const { c, g } = canvas(Math.round(T.W * FACE_SCALE), Math.round(T.H * FACE_SCALE));
  g.scale(FACE_SCALE, FACE_SCALE);
  g.imageSmoothingQuality = 'high';
  g.save(); g.beginPath(); g.roundRect(0, 0, T.W, T.H, 44); g.clip();
  g.drawImage(img(fx ? 'img/mini-template-effect.png' : 'img/mini-template.png'), 0, 0);
  g.fillStyle = '#f3f8f0'; g.beginPath(); g.roundRect(T.NAME.x + 6, T.NAME.y + 6, T.NAME.w - 12, T.NAME.h - 12, T.R); g.fill();
  const art = fx ? T.ART_FX : T.ART, full = img(def.art), k = full.width / FULL_ART.W, src = fitRect(FULL_ART, art.w / art.h);
  g.save(); g.beginPath(); g.roundRect(art.x, art.y, art.w, art.h, T.R); g.clip();
  g.drawImage(full, src.x * k, src.y * k, src.w * k, src.h * k, art.x, art.y, art.w, art.h); g.restore();
  // nome
  g.fillStyle = '#111'; g.textBaseline = 'middle'; g.textAlign = 'left';
  const costW = def.cost ? 150 : 0, maxW = T.NAME.w - 90 - costW;
  let size = 92; g.font = `400 ${size}px ${SERIF}`;
  while (g.measureText(def.name).width > maxW && size > 30) { size -= 4; g.font = `400 ${size}px ${SERIF}`; }
  g.fillText(def.name, T.NAME.x + 46, T.NAME.y + T.NAME.h / 2 + 6);
  // custo: carimbos (quantas criaturas sacrificar)
  if (def.cost) for (let i = 0; i < def.cost; i++) {
    const cx = T.NAME.x + T.NAME.w - 60 - i * 62, cy = T.NAME.y + T.NAME.h / 2;
    g.fillStyle = '#8b1d14'; g.beginPath(); g.arc(cx, cy, 25, 0, 7); g.fill();
    g.strokeStyle = '#f3f8f0'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 10, cy - 10); g.lineTo(cx + 10, cy + 10); g.moveTo(cx + 10, cy - 10); g.lineTo(cx - 10, cy + 10); g.stroke();
  }
  if (!fx) {
    const stat = (r, v) => {
      const s = money(v); let fs = 118; g.font = `400 ${fs}px ${SERIF}`;
      while (g.measureText(s).width > r.w && fs > 20) { fs -= 2; g.font = `400 ${fs}px ${SERIF}`; }
      g.fillStyle = '#111'; g.textAlign = 'center'; g.fillText(s, r.x + r.w / 2, r.y + r.h / 2 + 4);
    };
    stat(T.ATK, def.atk ?? 0); stat(T.DEF, def.def ?? 0);
  } else {
    g.fillStyle = 'rgba(17,17,17,0.82)'; g.fillRect(art.x, art.y + art.h - 96, art.w, 96);
    g.fillStyle = '#f3f8f0'; g.font = `700 54px ${MONO}`; g.textAlign = 'center';
    g.fillText(def.kind === 'effect_trap' ? '▼ ARMADILHA ▼' : def.durationTurns ? `EFEITO · ${def.durationTurns} TURNOS` : 'EFEITO IMEDIATO', T.W / 2, art.y + art.h - 46);
  }
  g.restore();
  return c;
}
export function cardFaceTexture(cardId) {
  if (!faceCache.has(cardId)) faceCache.set(cardId, cardTex(cardFaceCanvas(cardId)));
  return faceCache.get(cardId);
}
export function cardBackTexture() {
  if (backTex) return backTex;
  const { c, g } = canvas(Math.round(T.W * FACE_SCALE), Math.round(T.H * FACE_SCALE));
  const b = img('cards/back.png'), src = fitRect({ x: 0, y: 0, w: b.width, h: b.height }, T.W / T.H);
  g.beginPath(); g.roundRect(0, 0, c.width, c.height, 22); g.clip();
  g.drawImage(b, src.x, src.y, src.w, src.h, 0, 0, c.width, c.height);
  backTex = cardTex(c);
  return backTex;
}

// ───────── placa de CAIXA: pasta de arquivo + etiqueta carimbada de dano/ganho ─────────
function stampPath(g, w, h, teeth = 5) {
  // retângulo com borda serrilhada (selo)
  g.beginPath();
  const nx = Math.round(w / teeth / 2) * 2, ny = Math.round(h / teeth / 2) * 2, sx = w / nx, sy = h / ny, d = 3.5;
  g.moveTo(-w / 2, -h / 2);
  for (let i = 0; i < nx; i++) g.lineTo(-w / 2 + (i + 0.5) * sx, -h / 2 + (i % 2 ? d : -d)), g.lineTo(-w / 2 + (i + 1) * sx, -h / 2);
  for (let i = 0; i < ny; i++) g.lineTo(w / 2 + (i % 2 ? -d : d), -h / 2 + (i + 0.5) * sy), g.lineTo(w / 2, -h / 2 + (i + 1) * sy);
  for (let i = 0; i < nx; i++) g.lineTo(w / 2 - (i + 0.5) * sx, h / 2 + (i % 2 ? -d : d)), g.lineTo(w / 2 - (i + 1) * sx, h / 2);
  for (let i = 0; i < ny; i++) g.lineTo(-w / 2 + (i % 2 ? d : -d), h / 2 - (i + 0.5) * sy), g.lineTo(-w / 2, h / 2 - (i + 1) * sy);
  g.closePath();
}
export function drawCaixa(g, W, H, value, name, { hot = 0, heal = 0, delta = 0 } = {}) {
  g.fillStyle = '#1f2b25'; g.fillRect(0, 0, W, H);
  const fx = 36, fw = W - 72, top = 104, fh = H - top - 30, tabW = fw * 0.56, tabH = 44, r = 16;
  // etiqueta sai de trás da pasta
  const k = Math.max(hot, heal);
  if (k > 0 && delta) {
    const pop = Math.min(1, (1 - k) * 6) * Math.min(1, k * 4), good = heal > hot;
    g.save(); g.translate(W * 0.62, top + 34 - pop * 78); g.rotate(0.22);
    g.fillStyle = good ? '#7fcf86' : '#ee3a30'; stampPath(g, 250, 96); g.fill();
    g.fillStyle = good ? '#14401c' : '#7a1410'; g.font = `italic 400 66px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(`${good ? '+' : '-'} $ ${Math.abs(Math.round(delta)).toLocaleString('pt-BR')}`, 0, 4);
    g.restore();
  }
  g.fillStyle = value <= 2000 ? '#6f5a52' : '#5d705f';
  g.beginPath();
  g.moveTo(fx, top - tabH + r); g.arcTo(fx, top - tabH, fx + r, top - tabH, r); g.lineTo(fx + tabW - r, top - tabH); g.arcTo(fx + tabW, top - tabH, fx + tabW + 10, top - tabH + r, r);
  g.lineTo(fx + tabW + 18, top - 10); g.arcTo(fx + tabW + 22, top, fx + tabW + 40, top, 12); g.lineTo(fx + fw - r, top); g.arcTo(fx + fw, top, fx + fw, top + r, r);
  g.lineTo(fx + fw, top + fh - r); g.arcTo(fx + fw, top + fh, fx + fw - r, top + fh, r); g.lineTo(fx + r, top + fh); g.arcTo(fx, top + fh, fx, top + fh - r, r); g.closePath(); g.fill();
  g.fillStyle = '#c9d2c2'; g.font = `400 27px ${SANS}`; g.textAlign = 'left'; g.textBaseline = 'middle';
  let nm = name.toLowerCase(); while (g.measureText(nm).width > tabW - 36 && nm.length > 3) nm = nm.slice(0, -1);
  g.fillText(nm, fx + 22, top - tabH / 2 + 3);
  g.fillStyle = value <= 2000 ? '#ffb4a6' : '#cfcab2'; g.font = `400 104px ${SERIF}`; g.textAlign = 'center';
  g.fillText(`$ ${Math.max(0, Math.round(value)).toLocaleString('pt-BR')}`, W / 2, top + fh / 2 + 8);
}

export function coinTexture(label, sub) {
  const S = 128, { c, g } = canvas(S, S);
  const gr = g.createRadialGradient(50, 44, 6, 64, 64, 64); gr.addColorStop(0, '#f4dc8a'); gr.addColorStop(1, '#8a6a1c');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 63, 0, 7); g.fill();
  g.strokeStyle = '#5a4210'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke();
  g.fillStyle = '#3d2c08'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 54px ${SERIF}`; g.fillText(label, 64, 58);
  g.font = `700 13px ${MONO}`; g.fillText(sub, 64, 96);
  return tex(c, { pixel: false });
}

export { canvas as mkCanvas, paint, tex, hash };
