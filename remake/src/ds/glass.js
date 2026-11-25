// Vidro: as peças presas às margens da tela são deformadas por UMA lente da tela inteira.
// A lente é uma "almofada" (pincushion): quanto mais perto do canto, mais o ponto é esticado para fora;
// o meio das bordas recua para dentro. Cada peça recebe a transformação projetiva (matrix3d) que leva
// seus quatro cantos às posições deformadas.
// Por que transformação CSS e não filtro de pixels: a transformação é desenhada pela placa de vídeo com
// suavização (sem serrilhado) e o navegador acompanha os cliques, então a área clicável coincide com o desenho.
// Limite: dentro de uma peça as bordas continuam retas; a curva aparece no conjunto das peças.
// Uso: glass.attach(elemento).
const K = 0.13;        // força da lente (0 = desligada)
const R0 = 0.8;        // raio que fica parado: além dele estica para fora, antes dele recua para dentro
const items = new Set();
let bound = false;

function warp(x, y) {
  const W = window.innerWidth, H = window.innerHeight, nx = (x / W) * 2 - 1, ny = (y / H) * 2 - 1;
  const s = 1 + K * ((nx * nx + ny * ny) / 2 - R0);
  return [((nx * s + 1) / 2) * W, ((ny * s + 1) / 2) * H];
}
// homografia que leva (0,0),(w,0),(w,h),(0,h) aos quatro pontos q
function homography(w, h, q) {
  const src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = q[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  for (let c = 0; c < 8; c++) {               // eliminação de Gauss com pivô
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  const m = b.map((v, i) => v / A[i][i]);
  return `matrix3d(${m[0]},${m[3]},0,${m[6]},${m[1]},${m[4]},0,${m[7]},0,0,1,0,${m[2]},${m[5]},0,1)`;
}
function update(el) {
  el.style.transform = 'none';
  const r = el.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h || !r.width) return;
  const sx = r.width / w, sy = r.height / h;      // px de tela por px da peça (cobre o zoom da interface)
  const q = [[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom]].map(([x, y]) => { const [u, v] = warp(x, y); return [(u - r.left) / sx, (v - r.top) / sy]; });
  el.style.transformOrigin = '0 0';
  el.style.transform = homography(w, h, q);
}
export function refresh() { items.forEach(update); }
export function attach(el) {
  if (!el || items.has(el)) return;
  items.add(el); el.classList.add('ds-glass');
  new ResizeObserver(() => update(el)).observe(el);
  if (!bound) { bound = true; window.addEventListener('resize', refresh); }
  update(el);
}
