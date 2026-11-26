// AR CONDICIONADO NO TALO na tela: enquanto a carta está na mesa, a imagem esfria (azulada), as bordas congelam em
// blocos de cristal e o vidro trinca um pouco mais a cada turno do dono (níveis 1 a 4). Quando a carta sai, tudo
// volta ao contrário até sumir. Fica dentro do filtro de imagem do jogo (gfx.js), então ganha o mesmo pixelado,
// pontilhado e cores reduzidas do resto: as trincas são desenhadas num canvas pequeno (vermelho = brilho do vidro,
// verde = sombra da rachadura) que o filtro lê.
import * as THREE from 'three';
import { tween, ease } from './gfx.js';
import { sfx } from './audio.js';
import { settings } from './settings.js';

const D = (ms) => ms / (Number(settings.get().speed) || 1);
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** um impacto: poucas rachaduras longas e tortas, com galhinhos, saindo de um ponto perto do canto */
function impact(W, H, sx, sy) {
  const x0 = W * sx, y0 = H * sy, lines = [];
  const arms = 4 + Math.floor(rnd() * 3), toward = Math.atan2(H / 2 - y0, W / 2 - x0);
  for (let a = 0; a < arms; a++) {
    let ang = toward + (a / (arms - 1) - 0.5) * 2.4 + (rnd() - 0.5) * 0.4, x = x0, y = y0;
    const pts = [[x, y]], len = Math.min(W, H) * (0.22 + rnd() * 0.3);
    for (let d = 0; d < len; d += 3) {
      ang += (rnd() - 0.5) * 0.5; x += Math.cos(ang) * 3; y += Math.sin(ang) * 3; pts.push([x, y]);
      if (rnd() < 0.05) { let bx = x, by = y, ba = ang + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.6); const b = [[bx, by]]; for (let k = 0; k < 3 + rnd() * 6; k++) { ba += (rnd() - 0.5) * 0.5; bx += Math.cos(ba) * 4; by += Math.sin(ba) * 4; b.push([bx, by]); } lines.push(b); }
    }
    lines.push(pts);
  }
  // estilhaço em volta do ponto de impacto
  const ring = []; const rad = 6 + rnd() * 5;
  for (let k = 0; k <= 8; k++) { const t = (k / 8) * Math.PI * 2; ring.push([x0 + Math.cos(t) * rad * (0.7 + rnd() * 0.6), y0 + Math.sin(t) * rad * (0.7 + rnd() * 0.6)]); }
  lines.push(ring);
  return { x0, y0, lines };
}

export class FrostScreen {
  constructor(gfx) {
    this.u = gfx.u;
    this.c = document.createElement('canvas'); this.c.width = 320; this.c.height = 180;
    this.tex = new THREE.CanvasTexture(this.c); this.tex.magFilter = this.tex.minFilter = THREE.NearestFilter; this.tex.generateMipmaps = false;
    this.u.tCrack.value = this.tex;
    this.level = 0; this.shown = 0; this.cracks = []; this.anim = null;
  }
  /** trincas novas (uma por nível), no tamanho certo para a tela atual */
  reroll() {
    const W = 320, H = Math.max(100, Math.round(320 * window.innerHeight / window.innerWidth));
    this.c.width = W; this.c.height = H;
    seed = 11 + Math.floor(Math.random() * 5000);
    this.cracks = [[0.1, 0.16], [0.9, 0.84], [0.88, 0.14], [0.12, 0.86]].map(([x, y]) => impact(W, H, x + (rnd() - 0.5) * 0.06, y + (rnd() - 0.5) * 0.06));
  }
  /** desenha o nível v (0 = limpo … 4 = muito trincado); aceita frações para animar */
  draw(v) {
    const g = this.c.getContext('2d'), W = this.c.width, H = this.c.height, f = Math.min(1, v / 4);
    g.clearRect(0, 0, W, H); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.lineCap = 'square'; g.lineJoin = 'miter';
    this.cracks.forEach((ck, i) => {
      const k = Math.max(0, Math.min(1, v - i)); if (k <= 0) return;
      for (const ln of ck.lines) {
        const n = Math.max(2, Math.ceil(ln.length * k));
        const path = () => { g.beginPath(); ln.slice(0, n).forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); };
        path(); g.strokeStyle = '#00ff00'; g.lineWidth = 3; g.translate(1, 1); g.stroke(); g.translate(-1, -1); // sombra
        path(); g.strokeStyle = '#ff0000'; g.lineWidth = 1.6; g.stroke();                                         // brilho
      }
    });
    this.tex.needsUpdate = true;
    this.u.uIce.value = f; this.u.uIceTint.value = 0.1 + 0.25 * f * (v > 0 ? 1 : 0); this.u.uCrack.value = v > 0 ? 1 : 0;
    if (v <= 0) { this.u.uIce.value = 0; this.u.uIceTint.value = 0; }
  }
  /** vai até o nível pedido (0 a 4), animando; subir faz o som de vidro trincando */
  set(level) {
    level = Math.max(0, Math.min(4, level));
    if (level === this.level) return Promise.resolve();
    if (this.shown <= 0 && level > 0) this.reroll();
    const from = this.shown, up = level > this.level; this.level = level;
    if (up) { sfx('crack'); sfx('frost'); } else sfx('thaw');
    const id = (this.anim = {});
    return tween(D(up ? 520 : 1100), (k) => { if (this.anim !== id) return; this.shown = from + (level - from) * k; this.draw(this.shown); }, up ? ease.out : ease.inOut);
  }
  /** some na hora (fim de partida, sair do duelo) */
  clear() { this.anim = null; this.level = 0; this.shown = 0; this.draw(0); }
}
