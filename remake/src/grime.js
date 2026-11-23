// Texturas procedurais do tema "Buckshot" (sujas, gastas) + atlas de dígitos dos terminais.
import { fbm, mkCanvas, paint, tex, hash, TABLE, CARD, LAYOUT, MONO, SERIF } from './textures.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function deskGrimy() {
  const W = 1480, H = 940, { c, g } = mkCanvas(W, H);
  const px = (x) => (x / TABLE.w + 0.5) * W, pz = (z) => (z / TABLE.d + 0.5) * H, sc = W / TABLE.w;
  paint(g, W, H, (x, y) => {
    // madeira escura na borda, feltro verde-garrafa manchado no centro
    const edge = Math.min(x, y, W - x, H - y);
    const n = fbm(x / 110, y / 110, 3, 4), n2 = fbm(x / 11, y / 11, 8, 3);
    if (edge < 44) { const v = 0.2 + fbm(x / 320, y / 9, 21, 4) * 0.26 + n2 * 0.05 - (edge < 5 ? 0.08 : 0); return [150 * v, 98 * v, 60 * v]; }
    const stain = clamp01((fbm(x / 210 + 4, y / 210, 5, 4) - 0.52) * 4), wear = clamp01((fbm(x / 370, y / 270 + 9, 12, 4) - 0.45) * 3);
    let v = (0.24 + n * 0.17 + n2 * 0.07) * (1 - stain * 0.42) * (edge < 52 ? 0.6 : 1);
    return [(24 + wear * 22) * v * 2.7, (64 + wear * 8) * v * 2.7, (45 - wear * 8) * v * 2.7];
  });
  const ring = (x, y, r, a) => {
    g.strokeStyle = `rgba(20,12,6,${a})`; g.lineWidth = r * 0.13; g.beginPath(); g.arc(x, y, r, Math.random() * 6, Math.random() * 6 + 4.6); g.stroke();
    g.strokeStyle = `rgba(20,12,6,${a * 0.4})`; g.lineWidth = r * 0.5; g.beginPath(); g.arc(x, y, r * 0.72, 0, 7); g.stroke();
  };
  ring(px(3.22), pz(0.36), 34, 0.5); ring(px(3.05), pz(0.1), 30, 0.28); ring(px(-3.1), pz(-1.7), 31, 0.36); ring(px(-0.4), pz(2.05), 28, 0.2);
  for (let i = 0; i < 110; i++) {
    const x = Math.random() * W, y = Math.random() * H, l = 12 + Math.random() * 90, a = Math.random() * 6.3;
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? '190,205,180' : '0,0,0'},${0.03 + Math.random() * 0.07})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const ink = (a = 0.6) => `rgba(210,224,198,${a})`;
  const slot = (p, w, h, o = {}) => {
    const x = px(p.x) - (w * sc) / 2, y = pz(p.z) - (h * sc) / 2;
    g.strokeStyle = ink(o.a ?? 0.62); g.lineWidth = 3; g.setLineDash(o.dash ?? []);
    g.beginPath(); g.roundRect(x, y, w * sc, h * sc, 9); g.stroke(); g.setLineDash([]);
    if (o.cross) { g.lineWidth = 1.8; g.beginPath(); g.moveTo(x + 10, y + 10); g.lineTo(x + w * sc - 10, y + h * sc - 10); g.moveTo(x + w * sc - 10, y + 10); g.lineTo(x + 10, y + h * sc - 10); g.stroke(); }
    if (o.label) { g.fillStyle = ink(0.4); g.font = `700 14px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.label, px(p.x), pz(p.z)); }
  };
  const cw = CARD.w + 0.1, ch = CARD.h + 0.1;
  LAYOUT.myCr.forEach((p) => slot(p, cw, ch)); LAYOUT.oppCr.forEach((p) => slot(p, cw, ch));
  LAYOUT.myFx.forEach((p) => slot(p, cw, ch, { dash: [9, 7], a: 0.45 })); LAYOUT.oppFx.forEach((p) => slot(p, cw, ch, { dash: [9, 7], a: 0.45 }));
  slot(LAYOUT.myDeck, cw, ch, { label: 'DECK' }); slot(LAYOUT.oppDeck, cw, ch, { label: 'DECK' });
  slot(LAYOUT.myDead, cw, ch, { cross: true, a: 0.45 }); slot(LAYOUT.oppDead, cw, ch, { cross: true, a: 0.45 });
  g.fillStyle = ink(0.42); g.font = `700 14px ${MONO}`; g.textBaseline = 'middle';
  const side = (txt, x, z, rot) => { g.save(); g.translate(px(x), pz(z)); g.rotate(rot); g.textAlign = 'center'; g.fillText(txt, 0, 0); g.restore(); };
  side('CRIATURAS', -2.02, 0.5, -Math.PI / 2); side('EFEITOS', -2.02, 1.38, -Math.PI / 2); side('CRIATURAS', 2.02, -0.5, Math.PI / 2); side('EFEITOS', 2.02, -1.38, Math.PI / 2);
  g.textAlign = 'center'; g.fillText('MORTO', px(LAYOUT.myDead.x), pz(LAYOUT.myDead.z) - (ch * sc) / 2 - 13); g.fillText('MORTO', px(LAYOUT.oppDead.x), pz(LAYOUT.oppDead.z) + (ch * sc) / 2 + 13);
  g.strokeStyle = ink(0.24); g.lineWidth = 1.5; g.setLineDash([4, 10]); g.beginPath(); g.moveTo(px(-1.95), pz(0)); g.lineTo(px(1.95), pz(0)); g.stroke(); g.setLineDash([]);
  g.textAlign = 'left'; g.fillStyle = ink(0.3); g.fillText('FORM. 27-B · MESA DE NEGOCIAÇÃO · NÃO REMOVER', px(-1.9), pz(2.06));
  // tinta gasta
  for (let i = 0; i < 3600; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    if (fbm(x / 70, y / 70, 40, 3) > 0.5) { g.fillStyle = `rgba(20,36,27,${0.25 + Math.random() * 0.4})`; g.fillRect(x, y, 2 + Math.random() * 4, 1 + Math.random() * 2); }
  }
  return tex(c);
}
export function carpetGrimy() {
  const S = 128, { c, g } = mkCanvas(S, S);
  paint(g, S, S, (x, y) => { const st = clamp01((fbm(x / 50, y / 50, 77, 3) - 0.55) * 5), v = (0.5 + hash(x, y, 5) * 0.5) * (0.75 + fbm(x / 30, y / 30, 2, 3) * 0.5) * (1 - st * 0.5); return [22 * v, 58 * v, 40 * v]; });
  return tex(c, { repeat: [10, 10], pixel: true });
}
export function wallGrimy() {
  const W = 512, H = 256, { c, g } = mkCanvas(W, H);
  paint(g, W, H, (x, y) => {
    const n = fbm(x / 80, y / 80, 9), drip = clamp01((fbm(x / 14, y / 240, 31, 3) - 0.5) * 3) * clamp01(1.2 - y / H);
    const grime = clamp01((y / H - 0.55) * 1.6) * (0.5 + fbm(x / 40, y / 30, 4, 3));
    let v = 0.78 + n * 0.2 - drip * 0.35 - grime * 0.5 + hash(x, y, 1) * 0.04;
    v *= (x % 128 < 2 ? 0.55 : 1) * (y > 150 && y < 156 ? 0.6 : 1);
    return [176 * v, 186 * v, 172 * v];
  });
  return tex(c, { repeat: [3, 1], pixel: true });
}
export function ceilingGrimy() {
  const S = 128, { c, g } = mkCanvas(S, S);
  paint(g, S, S, (x, y) => {
    const border = x < 3 || y < 3 ? 0.45 : 1, hole = hash(x >> 1, y >> 1, 3) > 0.9 ? 0.7 : 1, st = clamp01((fbm(x / 40, y / 40, 6, 3) - 0.56) * 5);
    const v = (0.6 + fbm(x / 20, y / 20, 2, 3) * 0.2) * border * hole;
    return [150 * v - st * 40, 152 * v - st * 55, 140 * v - st * 80];
  });
  return tex(c, { repeat: [6, 6], pixel: true });
}
// atlas 10×1 com os dígitos 0–9 (para o "refinamento de dados" na tela do rival)
export function digitAtlas() {
  const { c, g } = mkCanvas(640, 64);
  g.fillStyle = '#000'; g.fillRect(0, 0, 640, 64);
  g.fillStyle = '#fff'; g.font = `700 54px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < 10; i++) g.fillText(String(i), i * 64 + 32, 35);
  const t = tex(c, { srgb: false }); t.generateMipmaps = false; t.minFilter = t.magFilter = 1006; // LinearFilter
  return t;
}
