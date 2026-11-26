// AR CONDICIONADO NO TALO na tela: enquanto a carta está na mesa, a tela fica azulada, as bordas congelam e o vidro
// trinca um pouco mais a cada turno do dono (níveis 1 a 4). Quando a carta sai, tudo volta ao contrário até sumir.
// É uma camada de canvas por cima do 3D e por baixo da interface; não recebe cliques.
import { tween, ease } from './gfx.js';
import { sfx } from './audio.js';
import { settings } from './settings.js';

const D = (ms) => ms / (Number(settings.get().speed) || 1);
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** trincas: cada impacto solta galhos tortos (linhas quebradas) a partir de um ponto perto da borda */
function crackSet(W, H, n) {
  const out = [];
  const spots = [[0.08, 0.12], [0.93, 0.85], [0.9, 0.1], [0.06, 0.9]];
  for (let i = 0; i < n; i++) {
    const [sx, sy] = spots[i % spots.length], x0 = W * (sx + (rnd() - 0.5) * 0.05), y0 = H * (sy + (rnd() - 0.5) * 0.05);
    const lines = [];
    const arms = 7 + Math.floor(rnd() * 4);
    for (let a = 0; a < arms; a++) {
      let ang = (a / arms) * Math.PI * 2 + rnd() * 0.5, x = x0, y = y0; const pts = [[x, y]], len = Math.min(W, H) * (0.14 + rnd() * 0.22);
      for (let d = 0; d < len; d += 14 + rnd() * 22) { ang += (rnd() - 0.5) * 0.7; x += Math.cos(ang) * 22; y += Math.sin(ang) * 22; pts.push([x, y]); if (rnd() < 0.12) lines.push({ pts: [[x, y], [x + Math.cos(ang + 1.2) * 40 * rnd(), y + Math.sin(ang + 1.2) * 40 * rnd()]], w: 1 }); }
      lines.push({ pts, w: 1.6 + rnd() * 1.2 });
    }
    // anéis em volta do impacto (vidro estilhaçado)
    for (let r = 1; r <= 2; r++) { const rad = 18 * r + rnd() * 14, ring = []; for (let k = 0; k <= 9; k++) { const t = (k / 9) * Math.PI * 2; ring.push([x0 + Math.cos(t) * rad * (0.8 + rnd() * 0.4), y0 + Math.sin(t) * rad * (0.8 + rnd() * 0.4)]); } lines.push({ pts: ring, w: 1.2 }); }
    out.push({ x0, y0, lines });
  }
  return out;
}

export class FrostScreen {
  constructor() {
    this.c = document.createElement('canvas'); this.c.id = 'frost';
    Object.assign(this.c.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '1', opacity: '0', transition: 'none' });
    document.body.insertBefore(this.c, document.getElementById('ui'));
    this.level = 0; this.shown = 0; this.cracks = []; this.anim = null;
    window.addEventListener('resize', () => { if (this.shown > 0) this.resize(true); });
  }
  resize(keep) {
    const W = Math.round(window.innerWidth / 2), H = Math.round(window.innerHeight / 2); // meia resolução: combina com o mundo pixelado
    if (this.c.width !== W || this.c.height !== H || !keep) { this.c.width = W; this.c.height = H; seed = 7 + Math.floor(Math.random() * 1000); this.cracks = crackSet(W, H, 4); }
    this.draw(this.shown);
  }
  /** desenha a tela no nível v (0 = limpa … 4 = muito trincada); aceita frações para animar */
  draw(v) {
    const g = this.c.getContext('2d'), W = this.c.width, H = this.c.height;
    g.clearRect(0, 0, W, H);
    this.c.style.opacity = v > 0 ? '1' : '0';
    if (v <= 0) return;
    const f = Math.min(1, v / 4);
    // tela azulada
    g.fillStyle = `rgba(90,150,230,${0.05 + 0.1 * f})`; g.fillRect(0, 0, W, H);
    // bordas congeladas: gelo que cresce de fora para dentro
    const edge = Math.min(W, H) * (0.07 + 0.16 * f);
    const grd = (x0, y0, x1, y1) => { const q = g.createLinearGradient(x0, y0, x1, y1); q.addColorStop(0, `rgba(225,242,255,${0.55 + 0.3 * f})`); q.addColorStop(0.45, `rgba(170,210,245,${0.25 + 0.2 * f})`); q.addColorStop(1, 'rgba(170,210,245,0)'); return q; };
    g.fillStyle = grd(0, 0, 0, edge); g.fillRect(0, 0, W, edge);
    g.fillStyle = grd(0, H, 0, H - edge); g.fillRect(0, H - edge, W, edge);
    g.fillStyle = grd(0, 0, edge, 0); g.fillRect(0, 0, edge, H);
    g.fillStyle = grd(W, 0, W - edge, 0); g.fillRect(W - edge, 0, edge, H);
    // cristais de gelo na borda (pixels claros)
    seed = 99; for (let i = 0; i < 500 * f; i++) { const side = Math.floor(rnd() * 4), d = Math.pow(rnd(), 2) * edge * 1.1, t = rnd(); const x = side === 0 ? t * W : side === 1 ? t * W : side === 2 ? d : W - d, y = side === 0 ? d : side === 1 ? H - d : t * H; g.fillStyle = `rgba(240,250,255,${0.25 + rnd() * 0.5})`; g.fillRect(x | 0, y | 0, 2, 2); }
    // trincas: uma por nível; a última aparece aos poucos
    this.cracks.forEach((ck, i) => {
      const k = Math.max(0, Math.min(1, v - i)); if (k <= 0) return;
      for (const ln of ck.lines) {
        const n = Math.max(2, Math.ceil(ln.pts.length * k));
        for (const [col, w, dx] of [['rgba(10,20,30,0.55)', ln.w + 1.4, 1], [`rgba(235,248,255,${0.85})`, ln.w, 0]]) {
          g.strokeStyle = col; g.lineWidth = w; g.beginPath();
          ln.pts.slice(0, n).forEach(([x, y], j) => (j ? g.lineTo(x + dx, y + dx) : g.moveTo(x + dx, y + dx))); g.stroke();
        }
      }
      g.fillStyle = 'rgba(240,250,255,0.9)'; g.beginPath(); g.arc(ck.x0, ck.y0, 3 + 3 * k, 0, 7); g.fill();
    });
  }
  /** vai até o nível pedido (0 a 4), animando; subir faz o som de vidro trincando */
  set(level) {
    level = Math.max(0, Math.min(4, level));
    if (level === this.level) return Promise.resolve();
    if (this.shown <= 0 && level > 0) this.resize(false);
    const from = this.shown, up = level > this.level; this.level = level;
    if (up) { sfx('crack'); sfx('frost'); } else sfx('thaw');
    const id = (this.anim = {});
    return tween(D(up ? 520 : 1100), (k) => { if (this.anim !== id) return; this.shown = from + (level - from) * k; this.draw(this.shown); }, up ? ease.out : ease.inOut);
  }
  /** some na hora (fim de partida, sair do duelo) */
  clear() { this.anim = null; this.level = 0; this.shown = 0; this.draw(0); }
}
