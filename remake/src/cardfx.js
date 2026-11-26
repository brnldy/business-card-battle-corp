// Animações próprias de algumas cartas: só onde o efeito pede uma imagem (palma do Bruno, cruz do Paulo,
// ar-condicionado no talo, nuvem do Chat GPT, celular do Lucas, olho da Duda, verme da Tênia, etiqueta do pão,
// pilha morrendo, café com gosto de cigarro, carimbo da Thays, post do Filipe e o ×2 do Ralph).
// Tudo desenhado por código em canvas (estilo escritório amaldiçoado) e mostrado como sprites virados para a câmera.
// Quem chama é a linha do tempo de eventos do duelo (duel.js → play), que espera cada animação terminar.
import * as THREE from 'three';
import { tween, wait, ease, LAYER } from './gfx.js';
import { mkCanvas, SERIF, MONO } from './textures.js';
import { sfx } from './audio.js';
import { settings } from './settings.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const INK = '#14110c', PAPER = '#e4dcc0', AMBER = '#f2b94c', RED = '#b3261e', SKIN = '#d6ad86', SKIN_D = '#a87a58';
const D = (ms) => ms / (Number(settings.get().speed) || 1);
const lerp = (a, b, k) => a + (b - a) * k;
const K = 1.5; // tamanho geral dos desenhos na mesa

// ───────── desenho ─────────
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function inked(g, fill, lw = 6) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); }
/** manchas e sujeira por cima do desenho (só onde já tem tinta) */
function grime(g, W, H, n = 40, seed = 1) {
  g.save(); g.globalCompositeOperation = 'source-atop';
  let s = seed * 9301; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${40 + r() * 40},${30 + r() * 20},${10},${0.06 + r() * 0.14})`; g.beginPath(); g.arc(r() * W, r() * H, 2 + r() * 14, 0, 7); g.fill(); }
  g.restore();
}
/** carimbo de borracha gasto: apaga pontinhos da tinta */
function wornOut(g, W, H, n = 260, seed = 3) {
  g.save(); g.globalCompositeOperation = 'destination-out';
  let s = seed * 7919; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.7})`; g.fillRect(r() * W, r() * H, 1 + r() * 4, 1 + r() * 3); }
  g.restore();
}

// mão aberta com punho de camisa e manga de terno (Bruno)
function drawHand(g, W, H, mirror) {
  g.save(); if (mirror) { g.translate(W, 0); g.scale(-1, 1); }
  rr(g, 46, 206, 104, 60, 6); inked(g, '#26282b');               // manga do terno
  rr(g, 50, 186, 96, 26, 4); inked(g, '#d9d3b8', 5);              // punho da camisa
  g.fillStyle = INK; g.beginPath(); g.arc(98, 199, 4, 0, 7); g.fill(); // abotoadura
  const fingers = [[52, 64], [74, 80], [96, 76], [118, 62]];
  for (const [x, h] of fingers) { rr(g, x, 118 - h, 22, h + 20, 11); inked(g, SKIN, 5); }
  g.save(); g.translate(146, 150); g.rotate(-0.75); rr(g, -12, -46, 24, 58, 12); inked(g, SKIN, 5); g.restore(); // polegar
  rr(g, 50, 108, 98, 84, 18); inked(g, SKIN, 6);                  // palma
  g.strokeStyle = SKIN_D; g.lineWidth = 3; g.beginPath(); g.moveTo(66, 140); g.quadraticCurveTo(98, 128, 132, 138); g.moveTo(70, 160); g.quadraticCurveTo(100, 150, 124, 166); g.stroke();
  grime(g, W, H, 30, mirror ? 2 : 1);
  g.restore();
}
// onda de choque (anel)
function drawRing(g, W, H) { g.strokeStyle = 'rgba(255,236,190,0.95)'; g.lineWidth = 10; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 12, 0, 7); g.stroke(); g.strokeStyle = 'rgba(242,185,76,0.5)'; g.lineWidth = 22; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 26, 0, 7); g.stroke(); }
// cruz brilhante (Paulo)
function drawCross(g, W, H) {
  const x = W / 2, w = 34, top = 18, bot = H - 18, armY = 82, arm = 66;
  g.shadowColor = '#ffd98a'; g.shadowBlur = 36;
  g.fillStyle = '#f6d27a'; g.fillRect(x - w / 2, top, w, bot - top); g.fillRect(x - arm, armY, arm * 2, w);
  g.shadowBlur = 0; g.fillStyle = '#fff6d8'; g.fillRect(x - 6, top + 8, 12, bot - top - 16); g.fillRect(x - arm + 8, armY + 11, arm * 2 - 16, 12);
}
// ar-condicionado velho, com visor verde no 16° (Ar Condicionado no Talo)
function drawAC(g, W, H) {
  rr(g, 10, 14, W - 20, H - 40, 18); inked(g, '#d4cdb6', 7);
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(18, H - 74, W - 36, 10);
  g.fillStyle = '#2b2a24'; rr(g, 30, H - 62, W - 60, 30, 6); g.fill();
  g.strokeStyle = '#6b665a'; g.lineWidth = 3; for (let i = 0; i < 18; i++) { const x = 44 + i * ((W - 88) / 17); g.beginPath(); g.moveTo(x, H - 58); g.lineTo(x - 8, H - 36); g.stroke(); }
  rr(g, W - 168, 40, 120, 62, 6); inked(g, '#0c1a10', 5);
  g.fillStyle = '#86ff9a'; g.shadowColor = '#86ff9a'; g.shadowBlur = 12; g.font = `700 46px ${MONO}`; g.textAlign = 'center'; g.fillText('16°', W - 108, 88); g.shadowBlur = 0;
  g.fillStyle = '#ff3a22'; g.beginPath(); g.arc(W - 186, 56, 6, 0, 7); g.fill();
  g.fillStyle = '#5a5546'; g.font = `700 18px ${MONO}`; g.textAlign = 'left'; g.fillText('TURBO · NÃO DESLIGAR', 40, 56);
  g.fillText('MANUTENÇÃO: 03/2009', 40, 80);
  // escorridos de ferrugem e mofo
  g.save(); g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 7; i++) { const x = 60 + i * 61 + (i % 3) * 13; g.fillStyle = 'rgba(110,62,20,0.35)'; g.fillRect(x, H - 40, 5, 30 + (i % 4) * 8); }
  g.restore(); grime(g, W, H, 50, 4);
}
// nuvem (Chat GPT)
function drawCloud(g, W, H) {
  g.beginPath(); [[70, 100, 46], [124, 70, 58], [186, 92, 50], [100, 118, 40], [160, 120, 42]].forEach(([x, y, r]) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, 7); });
  g.fillStyle = '#cfd3cc'; g.fill(); g.lineWidth = 7; g.strokeStyle = INK; g.stroke();
  g.fillStyle = '#cfd3cc'; [[70, 100, 42], [124, 70, 54], [186, 92, 46], [100, 118, 36], [160, 120, 38]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
  g.fillStyle = INK; g.font = `700 15px ${MONO}`; g.textAlign = 'center'; g.fillText('SINCRONIZANDO…', 128, 104);
  g.fillRect(70, 112, 116, 8); g.fillStyle = '#86d98f'; g.fillRect(72, 114, 104, 4);
}
// celular (Lucas e Filipe); mode: 'rec' | 'recOff' | 'post'
function drawPhone(g, W, H, mode) {
  rr(g, 8, 8, W - 16, H - 16, 22); inked(g, '#151515', 6);
  const sx = 20, sy = 34, sw = W - 40, sh = H - 66;
  const grd = g.createLinearGradient(0, sy, 0, sy + sh); grd.addColorStop(0, '#3a3f38'); grd.addColorStop(1, '#151a16'); g.fillStyle = grd; g.fillRect(sx, sy, sw, sh);
  if (mode === 'post') {
    g.fillStyle = '#e9e4d2'; g.fillRect(sx, sy, sw, sh);
    g.fillStyle = '#8a5a3a'; g.beginPath(); g.arc(sx + 18, sy + 18, 11, 0, 7); g.fill();
    g.fillStyle = INK; g.font = `700 12px ${MONO}`; g.textAlign = 'left'; g.fillText('@filipe.thebear', sx + 34, sy + 22);
    g.fillStyle = '#2c2a22'; g.fillRect(sx, sy + 36, sw, sw);
    g.fillStyle = '#c9b27a'; g.beginPath(); g.ellipse(sx + sw / 2, sy + 36 + sw * 0.45, 34, 12, 0, 0, 7); g.fill(); // "disco voador"
    g.fillStyle = '#9fe8ff'; g.beginPath(); g.arc(sx + sw / 2, sy + 36 + sw * 0.4, 12, Math.PI, 0); g.fill();
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; g.fillRect(sx + Math.random() * sw, sy + 36 + Math.random() * sw, 2, 2); }
    g.fillStyle = RED; g.font = `700 22px ${MONO}`; g.fillText('♥ 18 mil', sx + 6, sy + sw + 64);
    g.fillStyle = INK; g.font = `400 12px ${MONO}`; g.fillText('gente, eu vi isso', sx + 6, sy + sw + 84); g.fillText('num insta…', sx + 6, sy + sw + 100);
  } else {
    // vulto da vítima filmada
    g.fillStyle = '#0b0e0c'; g.beginPath(); g.arc(W / 2, sy + sh * 0.42, 30, 0, 7); g.fill(); rr(g, W / 2 - 46, sy + sh * 0.42 + 34, 92, 90, 30); g.fill();
    g.fillStyle = mode === 'rec' ? '#ff2a1a' : '#4a1410'; g.beginPath(); g.arc(sx + 18, sy + 20, 8, 0, 7); g.fill();
    g.fillStyle = '#f3ead2'; g.font = `700 16px ${MONO}`; g.textAlign = 'left'; g.fillText('REC 00:15', sx + 32, sy + 26);
    g.fillStyle = '#f3ead2'; g.font = `700 22px ${MONO}`; g.textAlign = 'right'; ['♥', '✎', '↗'].forEach((c, i) => g.fillText(c, sx + sw - 8, sy + sh * 0.55 + i * 32));
    g.fillStyle = 'rgba(243,234,210,0.3)'; g.fillRect(sx + 10, sy + sh - 18, sw - 20, 4); g.fillStyle = '#ff2a1a'; g.fillRect(sx + 10, sy + sh - 18, (sw - 20) * 0.62, 4);
  }
  g.fillStyle = '#2a2a2a'; rr(g, W / 2 - 22, 18, 44, 7, 3); g.fill();
  // tela trincada
  g.strokeStyle = 'rgba(240,240,230,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx + sw * 0.8, sy + 4); g.lineTo(sx + sw * 0.62, sy + sh * 0.3); g.lineTo(sx + sw * 0.9, sy + sh * 0.5); g.moveTo(sx + sw * 0.62, sy + sh * 0.3); g.lineTo(sx + sw * 0.3, sy + sh * 0.36); g.stroke();
}
// olho que encara (Duda); open 0..1, look −1..1
function drawEye(g, W, H, open, look) {
  g.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, rx = W / 2 - 14, ry = (H / 2 - 12) * Math.max(0.04, open);
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.clip();
  g.fillStyle = '#e6dcbf'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(170,30,20,0.7)'; g.lineWidth = 1.6;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * rx, cy + Math.sin(a) * rx * 0.6); g.quadraticCurveTo(cx + Math.cos(a + 0.3) * rx * 0.6, cy + Math.sin(a + 0.3) * rx * 0.4, cx + Math.cos(a) * rx * 0.35, cy + Math.sin(a) * rx * 0.25); g.stroke(); }
  const ix = cx + look * rx * 0.38;
  g.fillStyle = '#5a7a3a'; g.beginPath(); g.arc(ix, cy, H * 0.3, 0, 7); g.fill();
  g.fillStyle = '#2c3c1c'; g.beginPath(); g.arc(ix, cy, H * 0.3, 0, 7); g.lineWidth = 6; g.strokeStyle = '#2c3c1c'; g.stroke();
  g.fillStyle = '#050505'; g.beginPath(); g.arc(ix, cy, H * 0.13, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,240,0.85)'; g.beginPath(); g.arc(ix - H * 0.08, cy - H * 0.09, H * 0.045, 0, 7); g.fill();
  g.restore();
  g.lineWidth = 8; g.strokeStyle = INK; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.stroke();
  // cílios de cima
  g.lineWidth = 4; for (let i = 0; i < 9; i++) { const a = Math.PI + 0.25 + (i / 8) * (Math.PI - 0.5); const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16 - 4); g.stroke(); }
}
// verme da Tênia; mouth: aberta ou fechada
function drawWorm(g, W, H, openMouth) {
  for (let i = 5; i >= 0; i--) { const y = H - 30 - i * 30, w = 92 - i * 3 + (i % 2) * 6; g.beginPath(); g.ellipse(W / 2 + Math.sin(i * 1.3) * 8, y, w / 2, 24, 0, 0, 7); inked(g, i % 2 ? '#b88a82' : '#a77870', 5); }
  const my = 64;
  g.beginPath(); g.ellipse(W / 2, my, 64, 56, 0, 0, 7); inked(g, '#c4968c', 6);
  if (openMouth) {
    g.beginPath(); g.ellipse(W / 2, my, 46, 40, 0, 0, 7); g.fillStyle = '#2a0b0a'; g.fill();
    g.fillStyle = '#e8e0c4'; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, x = W / 2 + Math.cos(a) * 44, y = my + Math.sin(a) * 38; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a) * 16 + Math.sin(a) * 6, y - Math.sin(a) * 14 - Math.cos(a) * 6); g.lineTo(x - Math.cos(a) * 16 - Math.sin(a) * 6, y - Math.sin(a) * 14 + Math.cos(a) * 6); g.fill(); }
    g.fillStyle = 'rgba(200,220,160,0.7)'; g.fillRect(W / 2 + 18, my + 30, 5, 34); // baba
  } else { g.lineWidth = 7; g.strokeStyle = INK; g.beginPath(); g.moveTo(W / 2 - 40, my); g.quadraticCurveTo(W / 2, my + 18, W / 2 + 40, my); g.stroke(); }
  grime(g, W, H, 40, 6);
}
// etiqueta de preço (Pão com Requeijão)
function drawTag(g, W, H) {
  g.strokeStyle = '#3a2c1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 0); g.lineTo(52, 56); g.stroke();
  g.beginPath(); g.moveTo(24, 48); g.lineTo(W - 16, 48); g.lineTo(W - 16, H - 14); g.lineTo(24, H - 14); g.lineTo(6, (48 + H - 14) / 2); g.closePath(); inked(g, '#d8c79a', 5);
  g.fillStyle = '#f3ead2'; g.beginPath(); g.arc(30, (48 + H - 14) / 2, 7, 0, 7); g.fill(); g.lineWidth = 3; g.stroke();
  g.fillStyle = RED; g.font = `700 58px ${SERIF}`; g.textAlign = 'center'; g.fillText('R$ 16,00', W / 2 + 18, 118);
  g.fillStyle = INK; g.font = `700 17px ${MONO}`; g.fillText('DEZESSEIS REAIS?', W / 2 + 18, 146);
  g.strokeStyle = 'rgba(179,38,30,0.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(62, 84); g.lineTo(W - 34, 128); g.stroke();
  grime(g, W, H, 30, 8);
}
// pilha (Onde tem pilha?); level 0..1
function drawBattery(g, W, H, level) {
  g.clearRect(0, 0, W, H);
  rr(g, W / 2 - 18, 6, 36, 18, 4); inked(g, '#9a958a', 5);
  rr(g, 16, 22, W - 32, H - 34, 12); inked(g, '#2b2b28', 6);
  const ih = H - 58, lv = Math.max(0, Math.min(1, level));
  g.fillStyle = lv > 0.5 ? '#7fcf86' : lv > 0.2 ? AMBER : '#ee3a30'; g.fillRect(28, 34 + ih * (1 - lv), W - 56, ih * lv);
  g.fillStyle = PAPER; g.font = `700 26px ${MONO}`; g.textAlign = 'center'; g.fillText('AA', W / 2, H / 2 + 4);
  g.font = `700 13px ${MONO}`; g.fillText(`${Math.round(lv * 100)}%`, W / 2, H / 2 + 26);
  if (lv <= 0.01) { g.fillStyle = '#ffd34a'; g.beginPath(); g.moveTo(W / 2 + 8, 40); g.lineTo(W / 2 - 18, H / 2 + 12); g.lineTo(W / 2 + 2, H / 2 + 12); g.lineTo(W / 2 - 10, H - 30); g.lineTo(W / 2 + 22, H / 2 - 10); g.lineTo(W / 2 + 2, H / 2 - 10); g.closePath(); g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); }
}
// caneca de café (Café com 8 colheres)
function drawMug(g, W, H) {
  g.beginPath(); g.ellipse(W - 46, H / 2 + 14, 30, 38, 0, 0, 7); g.lineWidth = 16; g.strokeStyle = INK; g.stroke(); g.lineWidth = 8; g.strokeStyle = '#d9d3c4'; g.stroke();
  rr(g, 30, 50, W - 90, H - 66, 14); inked(g, '#d9d3c4', 6);
  g.beginPath(); g.ellipse(30 + (W - 90) / 2, 52, (W - 90) / 2 - 2, 12, 0, 0, 7); g.fillStyle = '#2a170c'; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
  g.fillStyle = '#6a2420'; g.font = `700 22px ${SERIF}`; g.textAlign = 'center'; g.fillText('Nº 1', 30 + (W - 90) / 2, 110); g.font = `700 11px ${MONO}`; g.fillText('FUNCIONÁRIO', 30 + (W - 90) / 2, 128);
  g.fillStyle = 'rgba(90,50,20,0.5)'; g.fillRect(56, 62, 6, 40); g.fillRect(96, 62, 5, 26); // escorrido
  g.fillStyle = INK; g.beginPath(); g.moveTo(30 + W - 96, 50); g.lineTo(30 + W - 108, 60); g.lineTo(30 + W - 96, 64); g.fill(); // lasca
  grime(g, W, H, 30, 9);
}
// carimbo de borracha (Thays, Filipe, Ralph)
function drawStamp(g, W, H, l1, l2, col = RED) {
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 9; rr(g, 12, 12, W - 24, H - 24, 10); g.stroke(); g.lineWidth = 3; rr(g, 26, 26, W - 52, H - 52, 6); g.stroke();
  g.textAlign = 'center';
  const big = l2 ? 0.42 : 0.6;
  if (l2) { g.font = `700 ${Math.round(H * 0.2)}px ${MONO}`; g.fillText(l1, W / 2, H * 0.42); g.font = `700 ${Math.round(H * big)}px ${MONO}`; fitText(g, l2, W / 2, H * 0.8, W - 70); }
  else { g.font = `700 ${Math.round(H * big)}px ${MONO}`; fitText(g, l1, W / 2, H * 0.7, W - 70); }
  wornOut(g, W, H, 320, l1.length);
}
function fitText(g, t, x, y, max) { const m = g.measureText(t).width; if (m > max) { g.save(); g.translate(x, y); g.scale(max / m, 1); g.fillText(t, 0, 0); g.restore(); } else g.fillText(t, x, y); }

// ───────── a parte 3D ─────────
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function makeTex(W, H, draw, ...args) { const { c, g } = mkCanvas(W, H); draw(g, W, H, ...args); return canvasTex(c); }

export class CardFX {
  constructor(duel) {
    this.d = duel; this.group = new THREE.Group(); duel.R.scene.add(this.group);
    this.cache = new Map(); this.live = new Set();
  }
  tex(key, W, H, draw, ...args) { if (!this.cache.has(key)) this.cache.set(key, makeTex(W, H, draw, ...args)); return this.cache.get(key); }
  sprite(map, w, h, pos) {
    const m = new THREE.SpriteMaterial({ map, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, fog: false });
    const s = new THREE.Sprite(m); w *= K; h *= K; s.scale.set(w, h, 1); s.userData.size = [w, h]; s.renderOrder = 60; s.layers.set(LAYER.GLOW);
    if (pos) s.position.copy(pos);
    this.group.add(s); this.live.add(s); return s;
  }
  size(s, k, ky = k) { const [w, h] = s.userData.size; s.scale.set(Math.max(1e-3, w * k), Math.max(1e-3, h * ky), 1); }
  kill(s) { this.group.remove(s); s.material.dispose(); this.live.delete(s); }
  /** limpa tudo (fim de partida, sair do duelo) */
  clear() { for (const s of [...this.live]) this.kill(s); }
  fadeOut(s, ms, rise = 0.12) { const y0 = s.position.y, o0 = s.material.opacity; return tween(D(ms), (k) => { s.material.opacity = o0 * (1 - k); s.position.y = y0 + rise * k; }, ease.in).then(() => this.kill(s)); }
  ring(p, col) { const s = this.sprite(this.tex('ring', 256, 256, drawRing), 0.2, 0.2, p); if (col) s.material.color.set(col); tween(D(460), (k) => { this.size(s, 1 + k * 8); s.material.opacity = 1 - k; }, ease.out).then(() => this.kill(s)); }

  // BRUNO · Palma Oca: duas mãos sobem da carta e batem palma antes da moeda
  async clap(p) {
    const L = this.sprite(this.tex('handL', 192, 268, drawHand, false), 0.4, 0.56), R = this.sprite(this.tex('handR', 192, 268, drawHand, true), 0.4, 0.56);
    const base = p.clone(), set = (gap, y, k) => { gap *= K; L.position.set(base.x - gap, base.y + y, base.z); R.position.set(base.x + gap, base.y + y, base.z); this.size(L, k); this.size(R, k); };
    set(0.34, 0.15, 0.01);
    await tween(D(340), (k) => set(0.34, lerp(0.15, 0.85, k), k), ease.back);
    L.material.rotation = -0.12; R.material.rotation = 0.12;
    await tween(D(150), (k) => set(lerp(0.34, 0.12, k), 0.85, 1), ease.in);
    sfx('clap'); this.d.bump(0.2); this.d.pulse('uAberr', 0.009, 320); this.d.lampKick(0.7);
    this.ring(base.clone().add(V(0, 0.85, 0))); this.d.sparkle(base.clone().add(V(0, 0.85, 0)), [1, 0.9, 0.6], 18);
    await tween(D(170), (k) => set(lerp(0.12, 0.2, k), 0.85, 1), ease.out);
    await wait(D(320));
    await Promise.all([this.fadeOut(L, 260), this.fadeOut(R, 260)]);
  }

  // PAULO · Espírito de oração: uma cruz brilhante sobe sobre ele quando fica em defesa
  async cross(p) {
    const s = this.sprite(this.tex('cross', 192, 256, drawCross), 0.46, 0.62, p.clone().add(V(0, 0.2, 0)));
    s.material.opacity = 0; sfx('choir'); this.d.pulse('uTintWarm', 0.45, 1300);
    const glow = this.sprite(this.tex('ring', 256, 256, drawRing), 0.9, 0.9, s.position); glow.material.opacity = 0; glow.material.color.set('#ffd98a');
    await tween(D(760), (k) => { s.position.y = p.y + lerp(0.2, 1.0, k); glow.position.copy(s.position); s.material.opacity = Math.min(1, k * 2.5); glow.material.opacity = 0.35 * k; this.size(s, 0.8 + 0.2 * k); }, ease.out);
    for (let i = 0; i < 3; i++) this.d.sparkle(s.position, [1, 0.88, 0.5], 10);
    tween(D(900), (k) => { this.size(s, 1 + Math.sin(k * Math.PI * 3) * 0.04); this.size(glow, 1 + k * 0.6); glow.material.opacity = 0.35 * (1 - k); }, ease.lin).then(() => this.kill(glow));
    await wait(D(500));
    this.fadeOut(s, 600, 0.3);
  }

  // AR CONDICIONADO NO TALO: o aparelho desce, apita no 16° e sopra frio na mesa toda
  async airConditioner() {
    const s = this.sprite(this.tex('ac', 512, 196, drawAC), 1.7, 0.65, V(0, 3.4, -0.4));
    await tween(D(520), (k) => { s.position.y = lerp(3.4, 1.75, k); }, ease.back);
    sfx('acBeep'); this.d.bump(0.1);
    await wait(D(200));
    sfx('frost'); sfx('whoosh'); this.d.pulse('uFrost', 0.95, 1500); this.d.snow(0); this.d.snow(1);
    const P = this.d.particles;
    for (let i = 0; i < 90; i++) P.emit({ x: (Math.random() - 0.5) * 1.5, y: 1.5, z: -0.4 + Math.random() * 0.1, vx: (Math.random() - 0.5) * 2.4, vy: -1.2 - Math.random() * 1.4, vz: (Math.random() - 0.3) * 2.6, r: 0.85, g: 0.97, b: 1, a: 0.7, size: 0.03 + Math.random() * 0.03, life: 0.8 + Math.random() * 0.8, drag: 0.6, floor: 0.02 });
    await tween(D(900), (k) => { s.position.x = Math.sin(k * 60) * 0.012; }, ease.lin);
    await tween(D(380), (k) => { s.position.y = lerp(1.75, 3.6, k); s.material.opacity = 1 - k; }, ease.in);
    this.kill(s);
  }

  // CHAT GPT · Estou na nuvem, otário: a carta sobe para dentro de uma nuvem antes de voltar ao deck
  async cloud(card) {
    const p = card.group.position.clone();
    const s = this.sprite(this.tex('cloud', 256, 176, drawCloud), 0.9, 0.62, p.clone().add(V(0, 1.15, 0)));
    await tween(D(300), (k) => this.size(s, k), ease.back);
    sfx('whoosh');
    await tween(D(420), (k) => { card.offset.set(0, 0.95 * k, 0); }, ease.inOut);
    this.d.sparkle(s.position, [0.8, 0.95, 1], 20);
    card.offset.set(0, 0, 0);
    this.fadeOut(s, 420, 0.3);
  }

  // LUCAS · Máquina de reels: um celular filma a vítima, o REC pisca e o flash trava a carta
  async phoneRec(p) {
    const on = this.tex('recOn', 176, 300, drawPhone, 'rec'), off = this.tex('recOff', 176, 300, drawPhone, 'recOff');
    const s = this.sprite(on, 0.38, 0.65, p.clone().add(V(0, 0.8, 0)));
    await tween(D(280), (k) => this.size(s, k), ease.back);
    for (let i = 0; i < 4; i++) { s.material.map = i % 2 ? on : off; await wait(D(130)); }
    s.material.map = on; sfx('shutter'); this.d.pulse('uFlash', 0.55, 320, [1, 1, 0.95]); this.d.bump(0.08);
    await wait(D(260));
    await tween(D(220), (k) => { this.size(s, 1 - k); s.material.opacity = 1 - k * 0.5; }, ease.in);
    this.kill(s);
  }

  // DUDA · Quem olhar vai ter que fazer: um olho enorme se abre sobre a vítima e encara
  async eye(p) {
    const { c, g } = mkCanvas(256, 160), map = canvasTex(c);
    const s = this.sprite(map, 0.8, 0.5, p.clone().add(V(0, 0.8, 0)));
    const draw = (open, look) => { drawEye(g, 256, 160, open, look); map.needsUpdate = true; };
    draw(0, 0); sfx('stare'); this.d.pulse('uGlitch', 0.5, 500); this.d.oppGlitch = Math.max(this.d.oppGlitch, 0.4);
    await tween(D(380), (k) => draw(k, 0), ease.out);
    await tween(D(620), (k) => draw(1, Math.sin(k * Math.PI * 2) * 0.9), ease.inOut);
    await wait(D(260));
    await tween(D(140), (k) => draw(1 - k, 0), ease.in);
    this.kill(s); map.dispose();
  }

  // TÊNIA · COMER! COMER!: o verme sai de trás do deck e come as cartas do topo (as compras acontecem junto)
  async worm(deckPos) {
    const open = this.tex('wormO', 192, 260, drawWorm, true), shut = this.tex('wormC', 192, 260, drawWorm, false);
    const base = deckPos.clone().add(V(0, 0, -0.15));
    const s = this.sprite(shut, 0.5, 0.68, base);
    sfx('chomp');
    await tween(D(360), (k) => { s.position.y = base.y + lerp(0, 0.6, k); this.size(s, k); }, ease.back);
    // as mordidas seguem sem segurar a linha do tempo: as cartas compradas passam por baixo
    (async () => {
      for (let i = 0; i < 3; i++) {
        s.material.map = open; await tween(D(160), (k) => this.size(s, 1 + 0.12 * k, 1 - 0.05 * k), ease.out);
        s.material.map = shut; sfx('chomp'); this.d.bump(0.06); this.d.puff(base.clone().add(V(0, 0.4, 0)), 6, [0.75, 0.6, 0.55]);
        await tween(D(170), (k) => this.size(s, 1.12 - 0.12 * k, 0.95 + 0.05 * k), ease.in);
      }
      await tween(D(320), (k) => { s.position.y = base.y + lerp(0.6, 0, k); s.material.opacity = 1 - k; }, ease.in);
      this.kill(s);
    })();
  }

  // PÃO COM REQUEIJÃO · Dezesseis reais?: a etiqueta de preço cai balançando
  async priceTag(p) {
    const s = this.sprite(this.tex('tag', 300, 176, drawTag), 0.72, 0.42, p.clone().add(V(0.05, 1.6, 0)));
    s.material.opacity = 0;
    await tween(D(300), (k) => { s.position.y = p.y + lerp(1.6, 0.85, k); s.material.opacity = k; }, ease.out);
    sfx('register');
    await tween(D(900), (k) => { s.material.rotation = Math.sin(k * 14) * 0.25 * (1 - k); }, ease.lin);
    this.fadeOut(s, 320);
  }

  // ONDE TEM PILHA?: a pilha sobre quem atacou descarrega e dá curto
  async battery(p) {
    const { c, g } = mkCanvas(128, 224), map = canvasTex(c);
    const s = this.sprite(map, 0.3, 0.52, p.clone().add(V(0, 0.8, 0)));
    const draw = (lv) => { drawBattery(g, 128, 224, lv); map.needsUpdate = true; };
    draw(1); this.size(s, 0.01);
    await tween(D(220), (k) => this.size(s, k), ease.back);
    sfx('powerDown');
    await tween(D(760), (k) => draw(1 - k), ease.in);
    sfx('zap'); this.d.sparks(s.position.clone(), 30); this.d.lampFlicker(0.8); this.d.bump(0.15);
    await tween(D(300), (k) => { s.position.x = p.x + Math.sin(k * 50) * 0.03 * (1 - k); }, ease.lin);
    await this.fadeOut(s, 260, 0);
    map.dispose();
  }

  // CAFÉ COM 8 COLHERES DE PÓ · Gosto de cigarro: a caneca solta fumaça cinza sobre o alvo
  async mug(p) {
    const s = this.sprite(this.tex('mug', 200, 180, drawMug), 0.42, 0.38, p.clone().add(V(0, 0.7, 0)));
    await tween(D(260), (k) => this.size(s, k), ease.back);
    sfx('sip');
    const P = this.d.particles, top = s.position.clone().add(V(-0.04, 0.16, 0));
    for (let i = 0; i < 46; i++) setTimeout(() => P.emit({ x: top.x + (Math.random() - 0.5) * 0.12, y: top.y, z: top.z, vx: (Math.random() - 0.5) * 0.12, vy: 0.35 + Math.random() * 0.3, vz: 0, r: 0.62, g: 0.6, b: 0.55, a: 0.55, size: 0.05 + Math.random() * 0.05, life: 1.1 + Math.random() * 0.6, drag: 0.4, grav: -0.05 }), D(i * 20));
    await wait(D(900));
    this.fadeOut(s, 300);
  }

  /** carimbo batendo em cima de uma carta: Thays (FALTOU UM TCHAN!), Filipe (FAKE NEWS) e Ralph (×2) */
  async stamp(p, l1, l2, { w = 0.9, h = 0.56, hold = 600, col } = {}) {
    const key = `stamp:${l1}|${l2}`, s = this.sprite(this.tex(key, 360, 224, drawStamp, l1, l2, col), w, h, p.clone().add(V(0, 1.1, 0)));
    s.material.rotation = -0.18; s.material.opacity = 0;
    await tween(D(170), (k) => { this.size(s, lerp(2.2, 1, k)); s.position.y = p.y + lerp(1.1, 0.3, k); s.material.opacity = k; }, ease.in);
    sfx('stamp'); this.d.bump(0.24); this.d.puff(p.clone().add(V(0, 0.1, 0)), 16, [0.75, 0.7, 0.6]);
    await wait(D(hold));
    this.fadeOut(s, 280, 0.1);
  }
  async fakeNews(p) {
    const s = this.sprite(this.tex('post', 176, 320, drawPhone, 'post'), 0.4, 0.73, p.clone().add(V(0, 0.95, 0)));
    await tween(D(260), (k) => this.size(s, k), ease.back);
    sfx('notify');
    await wait(D(300));
    await this.stamp(p.clone().add(V(0, 0.65, 0.05)), 'FAKE NEWS', '', { w: 0.62, h: 0.38, hold: 500 });
    this.fadeOut(s, 260);
  }
}
