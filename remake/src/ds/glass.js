// Vidro curvo: as peças presas às margens da tela são deformadas por UMA lente da tela inteira
// (barril: o centro abaula para fora e os cantos recolhem, como num monitor de tubo).
// Duas etapas, para ter curva de verdade sem perder os cliques:
//   1. transformação projetiva (matrix3d) que leva os 4 cantos da peça ao lugar certo. O navegador acompanha
//      os cliques, então a área clicável coincide com o desenho.
//   2. filtro que aplica só o que falta: a curvatura dentro da peça (poucos pixels). Antes de curvar, a imagem
//      passa por um desfoque de meio pixel, que é o que evita o serrilhado.
// Uso: glass.attach(elemento).
const NS = 'http://www.w3.org/2000/svg';
const K = -0.08;       // força da lente: negativo = barril (centro para fora, cantos recolhidos); positivo = almofada; 0 = desligada
const R0 = 0.5;        // raio que fica parado (0,5 = meio das bordas): nada é empurrado para fora da tela
const PAD = 22;        // folga em volta da peça para a curva não ser cortada
const SOFT = 0.55;     // desfoque antes de curvar, em px
const AFTER = 0.4;     // desfoque depois de curvar: desmancha o degrau de 1 px que a curva deixa nas bordas
const N = 40;          // resolução do mapa de curvatura
const items = new Map();
let svg, seq = 0;

const norm = (x, y) => [(x / window.innerWidth) * 2 - 1, (y / window.innerHeight) * 2 - 1];
const denorm = (nx, ny) => [((nx + 1) / 2) * window.innerWidth, ((ny + 1) / 2) * window.innerHeight];
function warp(x, y) { const [nx, ny] = norm(x, y), s = 1 + K * ((nx * nx + ny * ny) / 2 - R0); return denorm(nx * s, ny * s); }
function unwarp(x, y) {                         // inverso da lente, por aproximações sucessivas
  const [tx, ty] = norm(x, y); let nx = tx, ny = ty;
  for (let i = 0; i < 6; i++) { const s = 1 + K * ((nx * nx + ny * ny) / 2 - R0); nx = tx / s; ny = ty / s; }
  return denorm(nx, ny);
}
function solve(w, h, q) {                       // homografia (0,0),(w,0),(w,h),(0,h) → q
  const src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = q[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  return b.map((v, i) => v / A[i][i]);
}
function host() {
  if (svg) return svg;
  svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
  svg.appendChild(document.createElementNS(NS, 'defs')); document.body.appendChild(svg);
  window.addEventListener('resize', refresh);
  return svg;
}
function update(el) {
  const it = items.get(el);
  el.style.transform = 'none';
  const r = el.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h || !r.width) return;
  const sx = r.width / w, sy = r.height / h;    // px de tela por px da peça (cobre zoom)
  const toLocal = ([u, v]) => [(u - r.left) / sx, (v - r.top) / sy];
  const m = solve(w, h, [[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom]].map(([x, y]) => toLocal(warp(x, y))));
  el.style.transformOrigin = '0 0';
  el.style.transform = `matrix3d(${m[0]},${m[3]},0,${m[6]},${m[1]},${m[4]},0,${m[7]},0,0,1,0,${m[2]},${m[5]},0,1)`;
  // etapa 2: para cada ponto de saída o (local), de que ponto p da peça vem a imagem? H(o) = lente(p)  →  p = lente⁻¹(H(o))
  const c = document.createElement('canvas'); c.width = N; c.height = N; const g = c.getContext('2d'), d = g.createImageData(N, N), dx = new Float32Array(N * N), dy = new Float32Array(N * N);
  let D = 0.01;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const ox = -PAD + (i / (N - 1)) * (w + PAD * 2), oy = -PAD + (j / (N - 1)) * (h + PAD * 2), k = m[6] * ox + m[7] * oy + 1;
    const hx = (m[0] * ox + m[1] * oy + m[2]) / k, hy = (m[3] * ox + m[4] * oy + m[5]) / k;
    const [px, py] = toLocal(unwarp(r.left + hx * sx, r.top + hy * sy));
    dx[j * N + i] = px - ox; dy[j * N + i] = py - oy; D = Math.max(D, Math.abs(px - ox), Math.abs(py - oy));
  }
  for (let n = 0; n < N * N; n++) { d.data[n * 4] = 127.5 + (127.5 * dx[n]) / D; d.data[n * 4 + 1] = 127.5 + (127.5 * dy[n]) / D; d.data[n * 4 + 2] = 127; d.data[n * 4 + 3] = 255; }
  g.putImageData(d, 0, 0);
  for (const node of [it.filter, it.img]) { node.setAttribute('x', -PAD); node.setAttribute('y', -PAD); node.setAttribute('width', w + PAD * 2); node.setAttribute('height', h + PAD * 2); }
  it.img.setAttribute('href', c.toDataURL()); it.map.setAttribute('scale', D * 2);
}
export function refresh() { items.forEach((_, el) => update(el)); }
export function attach(el) {
  if (!el || items.has(el)) return;
  const id = `ds-glass-${++seq}`, f = document.createElementNS(NS, 'filter');
  f.setAttribute('id', id); f.setAttribute('filterUnits', 'userSpaceOnUse'); f.setAttribute('color-interpolation-filters', 'sRGB');
  const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); f.appendChild(n); return n; };
  const img = mk('feImage', { preserveAspectRatio: 'none', result: 'lens' });
  mk('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: SOFT, result: 'soft' });
  const map = mk('feDisplacementMap', { in: 'soft', in2: 'lens', xChannelSelector: 'R', yChannelSelector: 'G', result: 'bent' });
  mk('feGaussianBlur', { in: 'bent', stdDeviation: AFTER });
  host().firstChild.appendChild(f);
  items.set(el, { filter: f, img, map });
  el.classList.add('ds-glass'); el.style.setProperty('--ds-glass', `url(#${id})`);
  new ResizeObserver(() => update(el)).observe(el);
  update(el);
}
