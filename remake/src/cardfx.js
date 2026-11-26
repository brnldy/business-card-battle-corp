// Animações próprias das cartas aprovadas pelo autor (26/11/2026): palma do Bruno, cruz do Paulo, celular do Lucas,
// bocarra da Tênia, carimbo da Thays, nuvem do Chat GPT, pilha morrendo e café com gosto de cigarro.
// O Ar Condicionado no Talo não é objeto: congela e trinca a tela (frost.js).
// São objetos 3D low poly, feitos de caixas, cilindros e esferas como o resto da sala, iluminados pela luminária
// e passando pelo mesmo filtro pixelado. Textos (visor, tela do celular, etiqueta, carimbo) são texturas de canvas.
// Quem chama é a linha do tempo de eventos do duelo (duel.js → play), que espera cada animação terminar.
import * as THREE from 'three';
import { tween, wait, ease, LAYER } from './gfx.js';
import { mkCanvas, SERIF, MONO } from './textures.js';
import { sfx } from './audio.js';
import { settings } from './settings.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const INK = '#14110c', RED = '#b3261e';
const D = (ms) => ms / (Number(settings.get().speed) || 1);
const lerp = (a, b, k) => a + (b - a) * k;
const K = 2.1; // tamanho geral dos objetos na mesa

// ───────── texturas (só onde há texto ou tela) ─────────
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

// visor verde do ar-condicionado
function drawLCD(g, W, H) {
  g.fillStyle = '#0c1a10'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#86ff9a'; g.shadowColor = '#86ff9a'; g.shadowBlur = 10; g.font = `700 ${Math.round(H * 0.78)}px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('16°', W / 2, H / 2 + 3);
}
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function makeTex(W, H, draw, ...args) { const { c, g } = mkCanvas(W, H); draw(g, W, H, ...args); return canvasTex(c); }

// ───────── peças low poly ─────────
const mat = (color, o = {}) => new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.05, flatShading: true, ...o });
const glow = (color, k = 1) => new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: k, flatShading: true });
function part(geo, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o; }
const B = (w, h, d, m, x, y, z) => part(new THREE.BoxGeometry(w, h, d), m, x, y, z);
const C = (rt, rb, h, seg, m, x, y, z) => part(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z);
const S = (r, m, x, y, z, ws = 7, hs = 5) => part(new THREE.SphereGeometry(r, ws, hs), m, x, y, z);
const screen = (w, h, map, x, y, z) => part(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, toneMapped: false }), x, y, z);

// mão com punho de camisa e manga de terno; palma fina no eixo x, dedos para cima, polegar para a câmera
function hand() {
  const g = new THREE.Group(), skin = mat(0xd6ad86), suit = mat(0x26282b), shirt = mat(0xd9d3b8);
  g.add(B(0.05, 0.2, 0.17, skin, 0, 0, 0));
  [[-0.062, 0.1], [-0.021, 0.125], [0.021, 0.12], [0.062, 0.095]].forEach(([z, h]) => g.add(B(0.045, h, 0.036, skin, 0, 0.1 + h / 2, z)));
  const th = B(0.045, 0.1, 0.04, skin, 0.005, 0.0, 0.1); th.rotation.x = 0.7; g.add(th);
  g.add(C(0.07, 0.07, 0.05, 7, shirt, 0, -0.12, 0), C(0.085, 0.085, 0.16, 7, suit, 0, -0.22, 0));
  return g;
}
// carimbo de borracha: pegador de madeira e base com borracha vermelha
function stampTool() {
  const g = new THREE.Group(), wood = mat(0x6a4a2a), dark = mat(0x3a2a1a);
  g.add(S(0.065, wood, 0, 0.3, 0), C(0.03, 0.045, 0.2, 7, dark, 0, 0.17, 0), B(0.36, 0.07, 0.24, wood, 0, 0.04, 0), B(0.34, 0.02, 0.22, mat(0x8a1d14), 0, -0.005, 0));
  return g;
}
// celular deitado em pé; tela com textura
function phone(map) {
  const g = new THREE.Group();
  g.add(B(0.2, 0.38, 0.025, mat(0x151515)));
  const sc = screen(0.17, 0.33, map, 0, 0, 0.0135); g.add(sc); g.userData.screen = sc;
  g.add(C(0.018, 0.018, 0.01, 8, mat(0x050505), 0.06, 0.15, -0.015).rotateX(Math.PI / 2));
  return g;
}

export class CardFX {
  constructor(duel) {
    this.d = duel; this.group = new THREE.Group(); duel.R.scene.add(this.group);
    this.cache = new Map(); this.live = new Set();
  }
  tex(key, W, H, draw, ...args) { if (!this.cache.has(key)) this.cache.set(key, makeTex(W, H, draw, ...args)); return this.cache.get(key); }
  add(o, pos) { if (pos) o.position.copy(pos); o.scale.setScalar(0.001); this.group.add(o); this.live.add(o); return o; }
  kill(o) {
    this.group.remove(o); this.live.delete(o);
    o.traverse((c) => { if (c.isMesh) { c.geometry.dispose(); (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose()); } if (c.isLight) c.dispose?.(); });
  }
  /** limpa tudo (fim de partida, sair do duelo) */
  clear() { for (const o of [...this.live]) this.kill(o); }
  pop(o, ms = 280, to = K) { return tween(D(ms), (k) => o.scale.setScalar(Math.max(0.001, to * k)), ease.back); }
  vanish(o, ms = 240) { const s0 = o.scale.x; return tween(D(ms), (k) => o.scale.setScalar(Math.max(0.001, s0 * (1 - k))), ease.in).then(() => this.kill(o)); }
  /** onda de choque: um anel deitado que abre e some */
  ring(p, color = 0xffecbe) {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, toneMapped: false });
    const r = this.add(part(new THREE.TorusGeometry(0.2, 0.025, 4, 14), m), p); r.castShadow = false;
    tween(D(460), (k) => { r.scale.setScalar(0.3 + k * 3.2); m.opacity = 1 - k; }, ease.out).then(() => this.kill(r));
  }
  /** marca de tinta que fica na carta (ou na mesa) depois do carimbo; vai na camada das cartas para sair nítida */
  ink(p, key, l1, l2, w = 0.5, hold = 700) {
    const m = new THREE.MeshBasicMaterial({ map: this.tex(key, 360, 224, drawStamp, l1, l2), transparent: true, depthWrite: false, toneMapped: false });
    const o = part(new THREE.PlaneGeometry(w * K, w * K * 0.62), m, p.x, 0.045, p.z); o.castShadow = false;
    o.rotation.set(-Math.PI / 2, 0, -0.18); o.renderOrder = 30; o.layers.set(LAYER.CARD);
    this.group.add(o); this.live.add(o);
    return wait(D(hold)).then(() => tween(D(320), (k) => { m.opacity = 1 - k; })).then(() => this.kill(o));
  }

  // BRUNO · Palma Oca: duas mãos sobem da carta e batem palma antes da moeda
  async clap(p) {
    const L = this.add(hand()), R = this.add(hand());
    const base = p.clone(), set = (gap, y, k) => {
      gap *= K; L.position.set(base.x - gap, base.y + y, base.z); R.position.set(base.x + gap, base.y + y, base.z);
      L.scale.set(K * k, K * k, K * k); R.scale.set(-K * k, K * k, K * k); // a direita é a esquerda espelhada
      L.rotation.z = -0.15; R.rotation.z = 0.15;
    };
    set(0.3, 0.1, 0.01);
    await tween(D(340), (k) => set(0.3, lerp(0.1, 0.55, k), Math.max(0.01, k)), ease.back);
    await tween(D(150), (k) => set(lerp(0.3, 0.035, k), 0.55, 1), ease.in);
    sfx('clap'); this.d.bump(0.2); this.d.pulse('uAberr', 0.009, 320); this.d.lampKick(0.7);
    const hit = base.clone().add(V(0, 0.55 + 0.12 * K, 0));
    this.ring(hit); this.d.sparkle(hit, [1, 0.9, 0.6], 18);
    await tween(D(170), (k) => set(lerp(0.035, 0.12, k), 0.55, 1), ease.out);
    await wait(D(320));
    await tween(D(240), (k) => set(0.12 + 0.1 * k, 0.55 - 0.4 * k, Math.max(0.001, 1 - k)), ease.in);
    this.kill(L); this.kill(R);
  }

  // PAULO · Espírito de oração: uma cruz dourada e brilhante sobe sobre ele quando fica em defesa
  async cross(p) {
    const gold = glow(0xf6d27a, 0.45), g = new THREE.Group();
    g.add(B(0.075, 0.5, 0.075, gold, 0, 0, 0), B(0.32, 0.075, 0.075, gold, 0, 0.1, 0));
    const light = new THREE.PointLight(0xffd98a, 0, 3, 1.6); light.position.set(0, 0.1, 0.25); g.add(light);
    this.add(g, p.clone().add(V(0, 0.2, 0)));
    sfx('choir'); this.d.pulse('uTintWarm', 0.45, 1300);
    await tween(D(760), (k) => { g.position.y = p.y + lerp(0.2, 0.95, k); g.scale.setScalar(Math.max(0.001, K * k)); g.rotation.y = (1 - k) * 2.4; light.intensity = 2 * k; }, ease.out);
    for (let i = 0; i < 3; i++) this.d.sparkle(g.position, [1, 0.88, 0.5], 10);
    await tween(D(700), (k) => { g.rotation.y = Math.sin(k * Math.PI * 2) * 0.25; g.position.y = p.y + 0.95 + Math.sin(k * Math.PI) * 0.05; }, ease.lin);
    await tween(D(420), (k) => { g.position.y = p.y + 0.95 + 0.3 * k; g.scale.setScalar(Math.max(0.001, K * (1 - k))); light.intensity = 2 * (1 - k); }, ease.in);
    this.kill(g);
  }

  // CHAT GPT · Estou na nuvem, otário: uma nuvem de poliedros baixa e a carta sobe para dentro dela
  async cloud(card) {
    const p = card.group.position.clone(), m = mat(0xcfd3cc, { emissiveIntensity: 0.12 }), g = new THREE.Group();
    [[-0.2, 0, 0, 0.16], [0, 0.07, 0, 0.2], [0.21, 0.01, 0, 0.15], [-0.09, -0.05, 0.09, 0.13], [0.1, -0.05, 0.08, 0.13], [0.02, 0.0, -0.1, 0.15]].forEach(([x, y, z, r]) => g.add(part(new THREE.IcosahedronGeometry(r, 0), m, x, y, z)));
    this.add(g, p.clone().add(V(0, 1.0, 0)));
    await this.pop(g, 300);
    sfx('whoosh');
    await tween(D(420), (k) => { card.offset.set(0, 0.85 * k, 0); g.rotation.y = k * 0.8; }, ease.inOut);
    this.d.sparkle(g.position, [0.8, 0.95, 1], 20);
    card.offset.set(0, 0, 0);
    tween(D(420), (k) => { g.position.y = p.y + 1.0 + 0.4 * k; }, ease.in);
    this.vanish(g, 420);
  }

  // LUCAS · Máquina de reels: um celular filma a vítima, o REC pisca e o flash trava a carta
  async phoneRec(p) {
    const on = this.tex('recOn', 176, 300, drawPhone, 'rec'), off = this.tex('recOff', 176, 300, drawPhone, 'recOff');
    const g = this.add(phone(on), p.clone().add(V(0, 0.62, 0.15))); g.rotation.x = -0.35;
    const flash = new THREE.PointLight(0xffffff, 0, 3, 1.5); flash.position.set(0, 0, -0.2); g.add(flash);
    await this.pop(g);
    for (let i = 0; i < 4; i++) { g.userData.screen.material.map = i % 2 ? on : off; await wait(D(130)); }
    g.userData.screen.material.map = on; sfx('shutter'); this.d.pulse('uFlash', 0.5, 320, [1, 1, 0.95]); this.d.bump(0.08);
    await tween(D(260), (k) => { flash.intensity = 30 * (1 - k); }, ease.out);
    await this.vanish(g, 220);
  }

  // TÊNIA · COMER! COMER!: uma bocarra sai de trás do seu deck e morde o topo 3 vezes (as compras acontecem junto)
  async jaws(deckPos) {
    const g = new THREE.Group(), gum = mat(0x7a2a26), tooth = mat(0xe8e0c4), lipM = mat(0xa86a60);
    const jaw = (up) => {
      const j = new THREE.Group(), sg = up ? 1 : -1;
      j.add(B(0.46, 0.07, 0.3, lipM, 0, 0.035 * sg, 0), B(0.42, 0.03, 0.26, gum, 0, 0.005 * sg, 0.01));
      for (let i = 0; i < 7; i++) { const t = part(new THREE.ConeGeometry(0.026, 0.07 + (i % 2) * 0.03, 4), tooth, -0.18 + i * 0.06, -0.035 * sg, 0.11); if (up) t.rotation.z = Math.PI; j.add(t); }
      for (let i = 0; i < 4; i++) { const t = part(new THREE.ConeGeometry(0.022, 0.06, 4), tooth, i < 2 ? -0.2 : 0.2, -0.03 * sg, -0.05 + (i % 2) * 0.1); if (up) t.rotation.z = Math.PI; j.add(t); }
      return j;
    };
    const top = jaw(true), bot = jaw(false), pivot = new THREE.Group();
    bot.position.y = -0.01; pivot.add(top); g.add(pivot, bot);
    g.add(part(new THREE.SphereGeometry(0.17, 8, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x1a0606, { side: THREE.DoubleSide }), 0, 0.02, -0.04)); // goela
    const base = deckPos.clone().lerp(V(0, 0, 0), 0.38).add(V(0, 0.3, 0)); // entre o deck e o centro, acima da mão de cartas
    const open = (k) => { pivot.rotation.x = -0.9 * k; top.position.set(0, 0, 0.12 * k); };
    this.add(g, base); g.rotation.x = 0.35; open(1);
    sfx('chomp');
    await tween(D(320), (k) => { g.scale.setScalar(Math.max(0.001, K * k)); g.position.y = base.y + 0.25 * k; }, ease.back);
    // as mordidas seguem sem segurar a linha do tempo: as cartas compradas passam pela boca
    (async () => {
      for (let i = 0; i < 3; i++) {
        await tween(D(150), (k) => open(1 - k), ease.in);
        sfx('chomp'); this.d.bump(0.08); this.d.puff(base.clone().add(V(0, 0.25, 0.1)), 8, [0.75, 0.6, 0.55]);
        await tween(D(190), (k) => open(k), ease.out);
      }
      open(0); await wait(D(120));
      await this.vanish(g, 260);
    })();
  }

  // ONDE TEM PILHA?: uma pilha AA sobre quem atacou descarrega e dá curto
  async battery(p) {
    const g = new THREE.Group();
    g.add(C(0.07, 0.07, 0.3, 10, mat(0x2b2b28), 0, 0, 0), C(0.072, 0.072, 0.09, 10, mat(0xb8732e), 0, 0.105, 0), C(0.028, 0.028, 0.03, 8, mat(0x9a958a), 0, 0.165, 0));
    const bar = glow(0x7fcf86, 1.1), fill = B(0.05, 0.24, 0.012, bar, 0, 0, 0.068); fill.geometry.translate(0, 0.12, 0); fill.position.y = -0.12; g.add(fill);
    this.add(g, p.clone().add(V(0, 0.6, 0))); g.rotation.z = 0.25;
    await this.pop(g, 220);
    sfx('powerDown');
    const col = new THREE.Color(), G = new THREE.Color(0x7fcf86), A = new THREE.Color(0xf2b94c), Rr = new THREE.Color(0xee3a30);
    await tween(D(760), (k) => { const lv = 1 - k; fill.scale.y = Math.max(0.02, lv); col.copy(lv > 0.5 ? G : lv > 0.2 ? A : Rr); bar.color.copy(col); bar.emissive.copy(col); g.rotation.y = k * 3; }, ease.in);
    sfx('zap'); this.d.sparks(g.position.clone(), 30); this.d.lampFlicker(0.8); this.d.bump(0.15);
    await tween(D(300), (k) => { g.position.x = p.x + Math.sin(k * 50) * 0.03 * (1 - k); }, ease.lin);
    await this.vanish(g, 240);
  }

  // CAFÉ COM 8 COLHERES DE PÓ · Gosto de cigarro: a caneca solta fumaça cinza sobre o alvo
  async mug(p) {
    const g = new THREE.Group(), por = mat(0xd9d3c4);
    g.add(C(0.11, 0.1, 0.22, 10, por, 0, 0, 0), C(0.1, 0.1, 0.01, 10, mat(0x2a170c), 0, 0.106, 0), C(0.112, 0.112, 0.05, 10, mat(0x6a2420), 0, 0.02, 0));
    const handle = part(new THREE.TorusGeometry(0.065, 0.02, 4, 8, Math.PI), por, 0.11, 0, 0); handle.rotation.z = -Math.PI / 2; g.add(handle);
    this.add(g, p.clone().add(V(0, 0.55, 0))); g.rotation.x = 0.25;
    await this.pop(g, 260);
    sfx('sip');
    const P = this.d.particles, top = g.position.clone().add(V(0, 0.18, 0));
    for (let i = 0; i < 46; i++) setTimeout(() => P.emit({ x: top.x + (Math.random() - 0.5) * 0.14, y: top.y, z: top.z, vx: (Math.random() - 0.5) * 0.12, vy: 0.35 + Math.random() * 0.3, vz: 0, r: 0.62, g: 0.6, b: 0.55, a: 0.55, size: 0.05 + Math.random() * 0.05, life: 1.1 + Math.random() * 0.6, drag: 0.4, grav: -0.05 }), D(i * 20));
    await tween(D(900), (k) => { g.rotation.y = k * 1.4; }, ease.inOut);
    await this.vanish(g, 260);
  }

  /** carimbo de borracha batendo de verdade em cima de uma carta (Thays) */
  async stamp(p, l1, l2, { hold = 700 } = {}) {
    const g = this.add(stampTool(), p.clone().add(V(0, 1.2, 0))); g.scale.setScalar(K); g.rotation.y = -0.18;
    await tween(D(260), (k) => { g.position.y = p.y + lerp(1.2, 0.7, k); g.rotation.z = Math.sin(k * Math.PI) * 0.15; }, ease.out);
    await tween(D(110), (k) => { g.position.y = p.y + lerp(0.7, 0.04, k); }, ease.in);
    sfx('stamp'); this.d.bump(0.24); this.d.puff(p.clone().add(V(0, 0.08, 0)), 16, [0.75, 0.7, 0.6]);
    const mark = this.ink(p, `stamp:${l1}|${l2}`, l1, l2, 0.5, hold);
    await wait(D(120));
    await tween(D(260), (k) => { g.position.y = p.y + lerp(0.04, 1.0, k); }, ease.out);
    this.vanish(g, 200);
    await wait(D(Math.max(0, hold - 300)));
    return mark;
  }
}
