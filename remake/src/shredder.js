// Trituradora do Reciclar, proposta B (?triturador=b). A proposta A usa a trituradora 3D da própria sala (src/lobby.js).
//   B · 2D: a máquina no desenho chapado do sistema e tiras com física de papel (cada tira é uma corrente de pontos que
//       dobra e balança), batendo nas paredes da lixeira e virando pilha; confetes voam. A pilha fica entre as trituradas.
// Interface: { canvas, mount(el), setHot(b), setIdle(b), cardStart() → retângulo na tela onde a carta aparece, shred(url) → Promise }

const INK = '#1b140d';
const loadImg = (url) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = url; });
const rand = (a, b) => a + Math.random() * (b - a);
const CARD_AR = 1257 / 1079;

export function createShredder() { return new Shredder2D(); }

/* ────────────────────────────── B · 2D ────────────────────────────── */
class Shredder2D {
  constructor() {
    const c = (this.canvas = document.createElement('canvas')); c.className = 'ds-shredder__canvas';
    this.g = c.getContext('2d'); this.pileC = document.createElement('canvas'); this.pg = this.pileC.getContext('2d');
    this.strips = []; this.chads = []; this.cards = []; this.hot = false; this.idle = false; this.busy = false; this.raf = 0; this.shake = 0;
  }
  mount(el) { el.prepend(this.canvas); this.resize(); this.draw(); }
  resize() {
    const c = this.canvas, z = c.parentElement?.currentCSSZoom || 1, w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
    const s = (window.devicePixelRatio || 1) * z;
    if (this.W === w && this.H === h && this.S === s) return;
    this.W = w; this.H = h; this.S = s; c.width = Math.round(w * s); c.height = Math.round(h * s);
    // geometria: boca em cima, corpo, lixeira (trapézio) embaixo
    const cw = Math.max(60, Math.min(96, w * 0.27, (h - 150) / CARD_AR));
    this.cw = cw; this.ch = cw * CARD_AR; this.slotY = Math.round(this.ch + 16); this.bodyH = 40; this.binTop = this.slotY + this.bodyH + 6; this.binBot = h - 6;
    this.binTopW = w * 0.8; this.binBotW = w * 0.62;
    const old = this.pileC.width ? this.pileC : null, keep = old && document.createElement('canvas');
    if (keep) { keep.width = old.width; keep.height = old.height; keep.getContext('2d').drawImage(old, 0, 0); }
    this.pileC.width = c.width; this.pileC.height = c.height;
    if (keep) this.pg.drawImage(keep, 0, this.pileC.height - keep.height);
    this.cols = 48; this.height = this.height?.length === this.cols ? this.height : new Array(this.cols).fill(0);
  }
  setHot(b) { this.hot = b; this.draw(); }
  setIdle(b) { this.idle = b; this.draw(); }
  cardStart() { const r = this.canvas.getBoundingClientRect(), k = r.width / this.W; return { left: r.left + (this.W - this.cw) / 2 * k, top: r.top + (this.slotY - this.ch - 6) * k, width: this.cw * k, height: this.ch * k }; }
  /** meia largura da lixeira na altura y */
  halfAt(y) { const t = (y - this.binTop) / (this.binBot - this.binTop); return (this.binTopW + (this.binBotW - this.binTopW) * Math.max(0, Math.min(1, t))) / 2 - 6; }
  floorAt(x) { const i = Math.max(0, Math.min(this.cols - 1, Math.floor(((x - this.W / 2) / (this.binBotW) + 0.5) * this.cols))); return this.binBot - 4 - this.height[i]; }
  raise(x, h) { const i = Math.floor(((x - this.W / 2) / this.binBotW + 0.5) * this.cols); for (let j = i - 2; j <= i + 2; j++) if (j >= 0 && j < this.cols) this.height[j] = Math.min((this.binBot - this.binTop) * 0.7, this.height[j] + h * (1 - Math.abs(j - i) * 0.3)); }
  loop() {
    if (this.raf) return;
    let last = 0;
    const tick = (t) => {
      const dt = Math.min(0.033, (t - (last || t)) / 1000); last = t;
      this.step(dt); this.draw(true);
      const moving = this.busy || this.strips.length || this.chads.length;
      this.raf = moving ? requestAnimationFrame(tick) : 0;
    };
    this.raf = requestAnimationFrame(tick);
  }
  step(dt) {
    const G = 900;
    for (const s of this.strips) {
      if (s.pinned) continue;
      const P = s.p;
      for (const p of P) { const vx = (p.x - p.ox) * 0.985, vy = (p.y - p.oy) * 0.985; p.ox = p.x; p.oy = p.y; p.x += vx + Math.sin(p.y * 0.05 + s.seed) * 0.15; p.y += vy + G * dt * dt; }
      for (let it = 0; it < 4; it++) {
        for (let i = 0; i < P.length - 1; i++) { // comprimento fixo entre pontos (papel não estica)
          const a = P[i], b = P[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001, k = (d - s.seg) / d / 2;
          a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k;
        }
        const stiff = s.touched ? s.stiff * 0.25 : s.stiff; // ao bater no fundo, o papel amassa
        for (let i = 1; i < P.length - 1; i++) { // um pouco de rigidez: o papel dobra mas não vira barbante
          const a = P[i - 1], b = P[i + 1], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, p = P[i];
          p.x += (mx - p.x) * stiff; p.y += (my - p.y) * stiff;
        }
        for (const p of P) { const dx = p.x - p.ox, dy = p.y - p.oy, v = Math.hypot(dx, dy); if (v > 9) { p.ox = p.x - (dx / v) * 9; p.oy = p.y - (dy / v) * 9; } }
        for (const p of P) { // paredes e fundo da lixeira
          if (p.y > this.binTop) { const h = this.halfAt(p.y); if (p.x < this.W / 2 - h) p.x = this.W / 2 - h; if (p.x > this.W / 2 + h) p.x = this.W / 2 + h; }
          const f = this.floorAt(p.x); if (p.y > f) { p.y = f; p.oy = p.y; p.ox = p.x - (p.x - p.ox) * 0.3; s.touched = true; }
        }
      }
      const still = P.every((p) => Math.abs(p.x - p.ox) + Math.abs(p.y - p.oy) < 0.08) && P.some((p) => p.y >= this.floorAt(p.x) - 0.5);
      s.rest = still ? s.rest + dt : 0; s.age = (s.age || 0) + dt; if (s.age > 4) s.rest = 1;
    }
    // a tira que assentou vira desenho na pilha
    for (const s of this.strips.filter((x) => x.rest > 0.25)) { this.drawStrip(this.pg, s, this.S); const mx = s.p.reduce((a, p) => a + p.x, 0) / s.p.length; this.raise(mx, 1.6); }
    this.strips = this.strips.filter((x) => !(x.rest > 0.25));
    for (const c of this.chads) { c.vy += G * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt; const f = this.floorAt(c.x); if (c.y > f) { c.y = f; c.done = true; } if (c.y > this.binTop) { const h = this.halfAt(c.y); c.x = Math.max(this.W / 2 - h, Math.min(this.W / 2 + h, c.x)); } }
    for (const c of this.chads.filter((x) => x.done)) { this.pg.save(); this.pg.scale(this.S, this.S); this.pg.translate(c.x, c.y); this.pg.rotate(c.r); this.pg.fillStyle = c.color; this.pg.fillRect(-3, -1.5, 6, 3); this.pg.restore(); }
    this.chads = this.chads.filter((x) => !x.done);
    this.shake = this.busy ? (Math.random() - 0.5) * 2.2 : 0;
  }
  drawStrip(g, s, scale) {
    const P = s.p, w = s.w; g.save(); g.scale(scale, scale);
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], ang = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2, len = Math.hypot(b.x - a.x, b.y - a.y);
      g.save(); g.translate(a.x, a.y); g.rotate(ang);
      g.drawImage(s.img, s.sx, s.sy0 + i * s.sh, s.sw, s.sh, -w / 2, 0, w, len + 0.6);
      g.restore();
    }
    // contorno de tinta dos dois lados da tira
    g.strokeStyle = 'rgba(27,20,13,0.75)'; g.lineWidth = 1;
    for (const side of [-1, 1]) {
      g.beginPath();
      P.forEach((p, i) => { const q = P[Math.min(P.length - 1, i + 1)], r = P[Math.max(0, i - 1)], nx = -(q.y - r.y), ny = q.x - r.x, d = Math.hypot(nx, ny) || 1; const x = p.x + (nx / d) * (w / 2) * side, y = p.y + (ny / d) * (w / 2) * side; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.stroke();
    }
    g.restore();
  }
  draw(fromLoop = false) {
    if (!this.W || (this.raf && !fromLoop)) return;
    const g = this.g, W = this.W, S = this.S; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.canvas.width, this.canvas.height); g.setTransform(S, 0, 0, S, 0, 0);
    const tw = this.binTopW / 2, bw = this.binBotW / 2, cx = W / 2, t = this.binTop, b = this.binBot;
    const binPath = () => { g.beginPath(); g.moveTo(cx - tw, t); g.lineTo(cx + tw, t); g.lineTo(cx + bw, b); g.lineTo(cx - bw, b); g.closePath(); };
    // lixeira: fundo, pilha, tiras caindo, tela da frente, aros
    binPath(); g.fillStyle = 'rgba(27,20,13,0.08)'; g.fill();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(this.pileC, 0, 0); g.restore();
    g.save(); g.beginPath(); g.rect(0, this.slotY + this.bodyH - 3, W, this.H); g.clip(); for (const s of this.strips) this.drawStrip(g, s, 1); g.restore();
    for (const c of this.chads) { g.save(); g.translate(c.x, c.y); g.rotate(c.r); g.fillStyle = c.color; g.fillRect(-3, -1.5, 6, 3); g.restore(); }
    g.save(); binPath(); g.clip(); g.strokeStyle = 'rgba(42,36,29,0.55)'; g.lineWidth = 1.3;
    for (let x = -W; x < W * 2; x += 12) { g.beginPath(); g.moveTo(x, t); g.lineTo(x + (b - t), b); g.moveTo(x, t); g.lineTo(x - (b - t), b); g.stroke(); }
    g.restore();
    binPath(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = '#8d867a'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.roundRect(cx - tw - 4, t - 4, tw * 2 + 8, 8, 4); g.fill(); g.stroke();
    // cartas entrando pela fenda (cortadas na linha da fenda)
    g.save(); g.beginPath(); g.rect(0, 0, W, this.slotY); g.clip();
    for (const k of this.cards) { g.drawImage(k.img, cx - this.cw / 2, k.y, this.cw, this.ch); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(cx - this.cw / 2, k.y, this.cw, this.ch); }
    g.restore();
    // corpo da máquina
    const bx = W * 0.07 + this.shake, by = this.slotY + this.shake * 0.4, bwid = W * 0.86, bh = this.bodyH;
    g.fillStyle = '#3a342d'; g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.roundRect(bx, by, bwid, bh, 7); g.fill(); g.stroke();
    g.fillStyle = '#565048'; g.beginPath(); g.roundRect(bx + 2, by + 2, bwid - 4, 12, 5); g.fill();
    g.fillStyle = this.hot ? '#f2b94c' : '#0d0b09'; g.beginPath(); g.roundRect(cx - this.cw * 0.62, by - 2, this.cw * 1.24, 6, 3); g.fill();
    g.fillStyle = '#cfc4ab'; g.font = '15px VT323, monospace'; g.fillText('B C B C', bx + 14, by + bh - 12);
    g.fillStyle = '#1f1b17'; for (let x = bx + 86; x < bx + bwid - 34; x += 7) g.fillRect(x, by + 20, 3, 14);
    const led = this.busy ? (Math.floor(performance.now() / 90) % 2 ? '#ee3a30' : '#6b1a14') : this.hot ? '#f2b94c' : this.idle ? '#5d5751' : '#86d98f';
    g.fillStyle = led; g.beginPath(); g.arc(bx + bwid - 18, by + bh / 2 + 4, 5, 0, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
  }
  async shred(url, { feed = 1150 } = {}) {
    const img = await loadImg(url); this.resize();
    const N = 9, sw = img.width / N, segs = 7, card = { img, y: this.slotY - this.ch - 6 }; this.cards.push(card);
    const w = this.cw / N, seg = this.ch / segs, sh = img.height / segs, cx = this.W / 2;
    const strips = Array.from({ length: N }, (_, i) => {
      const x = cx - this.cw / 2 + (i + 0.5) * w;
      return { img, sx: i * sw, sw, sh, sy0: 0, w: w - 0.6, seg, seed: Math.random() * 9, stiff: rand(0.06, 0.16), pinned: true, rest: 0, p: Array.from({ length: segs + 1 }, (_, k) => ({ x, y: this.slotY - this.ch + k * seg, ox: x, oy: this.slotY - this.ch + k * seg })) };
    });
    this.strips.push(...strips); this.busy = true; this.loop();
    const t0 = performance.now(), start = card.y, dist = this.ch + 10;
    await new Promise((ok) => {
      const go = () => {
        const k = Math.min(1, (performance.now() - t0) / feed), e = k < 0.12 ? k * 0.5 : 0.06 + ((k - 0.12) / 0.88) * 0.94, d = dist * e;
        card.y = start + d;
        // as tiras saem por baixo do corpo na mesma velocidade, presas pela ponta de cima
        strips.forEach((s, i) => { const top = this.slotY + this.bodyH - this.ch + d + (i % 2) * 1.5; s.p.forEach((p, j) => { const y = top + j * s.seg; p.oy = p.y; p.y = y; p.ox = p.x; }); });
        if (Math.random() < 0.5) this.chads.push({ x: cx + rand(-this.cw / 2, this.cw / 2), y: this.slotY + this.bodyH + 2, vx: rand(-90, 90), vy: rand(-60, 20), r: rand(0, 6), vr: rand(-12, 12), color: Math.random() < 0.7 ? '#efe8d6' : '#2a241d' });
        if (k < 1) requestAnimationFrame(go); else ok();
      };
      requestAnimationFrame(go);
    });
    this.cards = this.cards.filter((x) => x !== card);
    strips.forEach((s) => { s.pinned = false; const kick = rand(-1.4, 1.4); s.p.forEach((p, j) => { p.ox = p.x - kick * (j / segs); p.oy = p.y - 0.6; }); });
    this.busy = false;
  }
}
