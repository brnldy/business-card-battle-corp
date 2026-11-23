// Visual da empresa: logos e versos de carta, todos desenhados por código (canvas 2D).
// A lista, os nomes e os preços ficam em data/meta.json; aqui só o desenho de cada id.
import * as THREE from 'three';
import { fbm, hash, mkCanvas, paint, cardBackTexture } from './textures.js';

const INK = '#e4dcc0', AMBER = '#f2b94c', RED = '#ee3a30';

// ───────── logos (grade de 100×100) ─────────
const LOGOS = {
  'logo-clipe'(g) {
    g.translate(50, 50); g.rotate(-0.38); g.translate(-50, -50);
    g.lineWidth = 7; g.beginPath();
    g.moveTo(66, 30); g.lineTo(66, 70); g.arc(50, 70, 16, 0, Math.PI); g.lineTo(34, 28); g.arc(46, 28, 12, Math.PI, 0); g.lineTo(58, 64); g.arc(50, 64, 8, 0, Math.PI); g.lineTo(42, 36);
    g.stroke();
  },
  'logo-grafico'(g, c) {
    g.fillRect(16, 62, 14, 22); g.fillRect(36, 48, 14, 36); g.fillRect(56, 30, 14, 54);
    g.fillRect(12, 86, 76, 4);
    g.strokeStyle = c.accent; g.lineWidth = 6; g.beginPath(); g.moveTo(14, 52); g.lineTo(34, 36); g.lineTo(46, 44); g.lineTo(82, 10); g.stroke();
    g.fillStyle = c.accent; g.beginPath(); g.moveTo(90, 4); g.lineTo(88, 24); g.lineTo(72, 10); g.closePath(); g.fill();
  },
  'logo-olho'(g, c) {
    g.lineWidth = 6; g.beginPath(); g.moveTo(50, 8); g.lineTo(92, 86); g.lineTo(8, 86); g.closePath(); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(28, 60); g.quadraticCurveTo(50, 36, 72, 60); g.quadraticCurveTo(50, 82, 28, 60); g.closePath(); g.stroke();
    g.fillStyle = c.accent; g.beginPath(); g.arc(50, 60, 9, 0, 7); g.fill();
    g.fillStyle = c.bg; g.beginPath(); g.arc(50, 60, 3.5, 0, 7); g.fill();
    g.lineWidth = 3; for (const [x, y, x2, y2] of [[50, 28, 50, 38], [34, 38, 39, 45], [66, 38, 61, 45]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); }
  },
  'logo-gravata'(g, c) {
    g.beginPath(); g.moveTo(38, 6); g.lineTo(62, 6); g.lineTo(58, 24); g.lineTo(42, 24); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(42, 26); g.lineTo(58, 26); g.lineTo(72, 74); g.lineTo(50, 96); g.lineTo(28, 74); g.closePath(); g.fill();
    // boca cheia de dentes atravessando a gravata
    g.fillStyle = c.bg; g.beginPath(); g.moveTo(34, 56); g.lineTo(66, 56); g.lineTo(69, 68); g.lineTo(31, 68); g.closePath(); g.fill();
    g.fillStyle = c.ink; for (let i = 0; i < 5; i++) { const x = 35 + i * 6.3; g.beginPath(); g.moveTo(x, 56); g.lineTo(x + 3.1, 63); g.lineTo(x + 6.2, 56); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x + 1.5, 68); g.lineTo(x + 4.6, 62); g.lineTo(x + 7.7, 68); g.closePath(); g.fill(); }
    g.fillStyle = c.accent; g.beginPath(); g.arc(50, 41, 5.5, 0, 7); g.fill();
    g.fillStyle = c.bg; g.beginPath(); g.arc(51, 41, 2.2, 0, 7); g.fill();
  },
  'logo-cafe'(g, c) {
    // tentáculos saindo da xícara
    g.lineWidth = 6; g.strokeStyle = c.accent;
    for (const [x, bend, top] of [[34, -16, 14], [50, 14, 4], [66, -12, 16]]) { g.beginPath(); g.moveTo(x, 50); g.bezierCurveTo(x + bend, 40, x - bend, 28, x + bend * 0.6, top); g.stroke(); g.beginPath(); g.arc(x + bend * 0.6, top, 2.4, 0, 7); g.stroke(); }
    g.strokeStyle = c.ink; g.fillStyle = c.ink;
    g.beginPath(); g.moveTo(20, 48); g.lineTo(80, 48); g.lineTo(72, 92); g.lineTo(28, 92); g.closePath(); g.fill();
    g.lineWidth = 6; g.beginPath(); g.arc(82, 66, 11, -1.2, 1.5); g.stroke();
    g.fillStyle = c.bg; g.beginPath(); g.ellipse(50, 68, 11, 8, 0, 0, 7); g.fill();
    g.fillStyle = c.accent; g.beginPath(); g.arc(50, 68, 4.5, 0, 7); g.fill();
  },
};
/** Desenha um logo dentro do quadrado (x, y, size). `bg` é a cor de "furo" (olhos, bocas). */
export function drawLogo(g, id, x, y, size, { ink = INK, accent = AMBER, bg = '#0e1411' } = {}) {
  const fn = LOGOS[id] ?? LOGOS['logo-clipe'];
  g.save(); g.translate(x, y); g.scale(size / 100, size / 100);
  g.fillStyle = ink; g.strokeStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
  fn(g, { ink, accent, bg });
  g.restore();
}
const urlCache = new Map();
/** Logo como imagem (para as telas em HTML). */
export function logoUrl(id, opts = {}) {
  const key = `${id}|${opts.ink ?? ''}|${opts.accent ?? ''}|${opts.bg ?? ''}`;
  if (!urlCache.has(key)) { const { c, g } = mkCanvas(160, 160); drawLogo(g, id, 8, 8, 144, opts); urlCache.set(key, c.toDataURL()); }
  return urlCache.get(key);
}

// ───────── versos de carta ─────────
const BW = 270, BH = 314; // pintado em baixa resolução e ampliado sem suavizar: combina com o filtro pixelado
const k01 = (v) => Math.max(0, Math.min(1, v));
const BACKS = {
  'back-carbono': {
    frame: '#9db4ff', px(x, y) {
      const hatch = ((x + y) % 7 === 0 ? 0.16 : 0) + ((x - y + 700) % 11 === 0 ? 0.1 : 0);
      const smudge = fbm(x / 60, y / 60, 12, 4), row = y % 14 < 2 && hash(Math.floor(x / 5), Math.floor(y / 14), 3) > 0.35 ? 0.2 : 0;
      const v = 0.55 + smudge * 0.7 + hatch + row;
      return [22 * v + row * 90, 26 * v + row * 90, 74 * v + row * 120];
    },
  },
  'back-mofo': {
    frame: '#b7d06a', px(x, y) {
      const paper = 0.75 + fbm(x / 50, y / 50, 4, 3) * 0.3;
      const m = k01((fbm(x / 34, y / 34, 21, 5) - 0.45) * 5), core = k01((fbm(x / 13, y / 13, 8, 4) - 0.5) * 6) * m, fuzz = hash(x, y, 9) * 0.25 * m;
      return [198 * paper * (1 - m) + (46 - core * 34 + fuzz * 60) * m, 186 * paper * (1 - m) + (96 - core * 62 + fuzz * 90) * m, 150 * paper * (1 - m) + (38 - core * 26) * m];
    },
  },
  'back-estatica': {
    frame: '#e4dcc0', px(x, y) {
      const band = Math.floor(y / 3), tear = hash(band, 7, 2) > 0.93 ? 26 : 0;
      const n = hash(x + tear, y, 5 + band % 3), roll = 0.72 + 0.28 * Math.sin(y / 22);
      if (y > BH * 0.7 && y < BH * 0.82) { const bars = [[255, 255, 255], [240, 220, 40], [40, 220, 220], [40, 200, 60], [220, 40, 200], [220, 40, 40], [40, 60, 220]], b = bars[Math.floor(((x + tear) % BW) / (BW / 7))] ?? bars[0], d = y % 2 ? 0.75 : 1; return [b[0] * d * 0.8 + n * 40, b[1] * d * 0.8 + n * 40, b[2] * d * 0.8 + n * 40]; }
      const v = (n > 0.5 ? 210 : 26) * roll * (y % 2 ? 0.8 : 1);
      return [v, v, v * 1.04];
    },
  },
  'back-carpete': {
    frame: '#f2b94c', px(x, y) {
      const u = Math.abs(((x + 20) % 54) - 27), w = Math.abs((y % 54) - 27), ring = Math.floor((u + w) / 6) % 4;
      const pal = [[122, 56, 18], [214, 122, 28], [232, 190, 80], [66, 34, 20]][ring], fuzz = 0.82 + hash(x, y, 3) * 0.3, stain = 1 - k01((fbm(x / 40, y / 40, 55, 3) - 0.6) * 4) * 0.5;
      return [pal[0] * fuzz * stain, pal[1] * fuzz * stain, pal[2] * fuzz * stain];
    },
  },
  'back-planilha': {
    frame: '#1d7a3e', px(x, y) {
      const cw = 34, ch = 13, cx = Math.floor(x / cw), cy = Math.floor(y / ch), line = x % cw === 0 || y % ch === 0;
      if (cy === 0 || cx === 0) return line ? [20, 90, 50] : [34, 132, 74];
      const r = hash(cx, cy, 77);
      if (line) return [176, 190, 176];
      if (r > 0.93) return [238, 120, 110];
      if (r > 0.72) return [198, 236, 204];
      // "números" dentro da célula: tracinhos escuros alinhados à direita
      const digits = r > 0.3 && y % ch > 4 && y % ch < 9 && x % cw > cw - 6 - Math.floor(r * 18) && x % cw < cw - 3 && (x % 4 !== 0);
      return digits ? [60, 70, 62] : [244, 248, 240];
    },
    after(g, W, H) { g.fillStyle = '#7a1410'; g.font = '700 15px "Courier New", monospace'; g.textBaseline = 'top'; for (const [x, y] of [[74, 84], [346, 266], [142, 500], [414, 110]]) g.fillText('#REF!', x, y); void W; void H; },
  },
};
const canvasCache = new Map();
/** Verso pronto (540×629) com moldura e o logo da empresa no centro. `back-original` usa a arte do autor, sem logo. */
export function backCanvas(backId, logoId) {
  const def = BACKS[backId];
  if (!def) return null;
  const key = `${backId}|${logoId}`;
  if (canvasCache.has(key)) return canvasCache.get(key);
  const low = mkCanvas(BW, BH); paint(low.g, BW, BH, def.px);
  const W = BW * 2, H = BH * 2, { c, g } = mkCanvas(W, H);
  g.beginPath(); g.roundRect(0, 0, W, H, 22); g.clip();
  g.imageSmoothingEnabled = false; g.drawImage(low.c, 0, 0, W, H);
  def.after?.(g, W, H);
  // escurece as bordas, moldura e medalhão com o logo
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(8,10,8,0.9)'; g.lineWidth = 22; g.strokeRect(0, 0, W, H);
  g.strokeStyle = def.frame; g.lineWidth = 4; g.beginPath(); g.roundRect(26, 26, W - 52, H - 52, 10); g.stroke();
  g.fillStyle = 'rgba(8,10,8,0.92)'; g.beginPath(); g.arc(W / 2, H / 2, 112, 0, 7); g.fill();
  g.strokeStyle = def.frame; g.lineWidth = 4; g.beginPath(); g.arc(W / 2, H / 2, 112, 0, 7); g.stroke();
  drawLogo(g, logoId, W / 2 - 76, H / 2 - 76, 152, { bg: '#080a08' });
  canvasCache.set(key, c);
  return c;
}
const texCache = new Map();
/** Textura do verso para as cartas 3D do jogador. */
export function backTexture(backId, logoId) {
  const c = backCanvas(backId, logoId);
  if (!c) return cardBackTexture();
  const key = `${backId}|${logoId}`;
  if (!texCache.has(key)) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; texCache.set(key, t); }
  return texCache.get(key);
}
/** Verso como imagem (para as telas em HTML). */
export function backUrl(backId, logoId, originalUrl) {
  const c = backCanvas(backId, logoId);
  if (!c) return originalUrl;
  const key = `u|${backId}|${logoId}`;
  if (!urlCache.has(key)) urlCache.set(key, c.toDataURL('image/jpeg', 0.85));
  return urlCache.get(key);
}
void RED;
