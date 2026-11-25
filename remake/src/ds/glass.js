// Vidro curvo: as peças presas às margens da tela são deformadas como se estivessem num monitor de tubo.
// É UMA lente para a tela inteira (barril): cada peça recebe o pedaço da lente que corresponde à sua posição,
// então o que está no canto curva mais e o que está no centro quase nada. Os três canais de cor são
// deslocados com forças um pouco diferentes, o que cria a franja vermelha/ciano perto das bordas.
// Uso: glass.attach(elemento). Recalcula sozinho quando a peça ou a janela muda de tamanho.
const NS = 'http://www.w3.org/2000/svg';
const STRENGTH = 0.028;     // deslocamento máximo no canto, em fração da largura da tela
const FRINGE = 0.028;       // diferença de força entre vermelho e azul
const PAD = 26;             // folga em volta da peça, para a curva não ser cortada
let svg, seq = 0;
const items = new Map();

function host() {
  if (svg) return svg;
  svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
  svg.appendChild(document.createElementNS(NS, 'defs')); document.body.appendChild(svg);
  window.addEventListener('resize', () => items.forEach((_, el) => update(el)));
  return svg;
}
function lens(rect, scale) {
  const N = 48, c = document.createElement('canvas'); c.width = N; c.height = N;
  const g = c.getContext('2d'), d = g.createImageData(N, N), W = window.innerWidth, H = window.innerHeight;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const sx = (rect.left - PAD + (i / (N - 1)) * (rect.width + PAD * 2)) * scale, sy = (rect.top - PAD + (j / (N - 1)) * (rect.height + PAD * 2)) * scale;
    const nx = (sx / W) * 2 - 1, ny = (sy / H) * 2 - 1, r2 = Math.min(1, (nx * nx + ny * ny) / 2), k = (j * N + i) * 4;
    d.data[k] = 127.5 + 127.5 * nx * r2; d.data[k + 1] = 127.5 + 127.5 * ny * r2 * (H / W) * 1.3; d.data[k + 2] = 127; d.data[k + 3] = 255;
  }
  g.putImageData(d, 0, 0); return c.toDataURL();
}
function update(el) {
  const it = items.get(el); if (!it) return;
  const z = Number(getComputedStyle(document.getElementById('ui') ?? document.body).zoom) || 1;
  const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
  const w = r.width / z, h = r.height / z, amount = (STRENGTH * window.innerWidth * 2) / z;
  const f = it.filter;
  for (const [k, v] of [['x', -PAD], ['y', -PAD], ['width', w + PAD * 2], ['height', h + PAD * 2]]) { f.setAttribute(k, v); it.img.setAttribute(k, v); }
  it.img.setAttribute('href', lens({ left: r.left / z, top: r.top / z, width: w, height: h }, z));
  it.maps.forEach((m, i) => m.setAttribute('scale', amount * (1 + (1 - i) * FRINGE)));
}
export function attach(el) {
  if (!el || items.has(el)) return;
  const id = `ds-glass-${++seq}`, f = document.createElementNS(NS, 'filter');
  f.setAttribute('id', id); f.setAttribute('filterUnits', 'userSpaceOnUse'); f.setAttribute('color-interpolation-filters', 'sRGB');
  const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); f.appendChild(n); return n; };
  const img = mk('feImage', { preserveAspectRatio: 'none', result: 'lens' });
  const maps = ['r', 'g', 'b'].map((c) => mk('feDisplacementMap', { in: 'SourceGraphic', in2: 'lens', xChannelSelector: 'R', yChannelSelector: 'G', result: `d${c}` }));
  mk('feColorMatrix', { in: 'dr', values: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', result: 'r' });
  mk('feColorMatrix', { in: 'dg', values: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', result: 'g' });
  mk('feColorMatrix', { in: 'db', values: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', result: 'b' });
  mk('feBlend', { in: 'r', in2: 'g', mode: 'screen', result: 'rg' }); mk('feBlend', { in: 'rg', in2: 'b', mode: 'screen' });
  host().firstChild.appendChild(f);
  items.set(el, { filter: f, img, maps });
  el.style.filter = `url(#${id})`;
  new ResizeObserver(() => update(el)).observe(el);
  update(el);
}
