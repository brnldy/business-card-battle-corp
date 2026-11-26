// Vidro curvo em WebGL.
// O HUD continua sendo HTML (fonte única do desenho e dos cliques). Para cada peça presa às margens:
//   1. o HTML fica invisível, mas no lugar, recebendo os cliques. Uma transformação projetiva (matrix3d) leva
//      seus 4 cantos aonde a lente manda, para a área clicável acompanhar o desenho;
//   2. a peça é "fotografada" (o HTML vira uma imagem SVG e depois uma textura) sempre que muda;
//   3. o WebGL desenha a textura numa malha curvada pela lente da tela inteira (barril), com filtragem da placa
//      de vídeo: curva real, sem serrilhado e sem desfoque.
// Limites conhecidos: animações CSS dentro da peça não aparecem (a foto é estática); :hover e :active viram
// as classes .is-hover e .is-active. Ver docs/design-system/07-hud-webgl.md.
// Uso: glass.attach(elemento).
import * as THREE from 'three';

const K = -0.12;       // força da lente: negativo = barril; positivo = almofada; 0 = desligada
const R0 = 0.5;        // raio que fica parado (0,5 = meio das bordas)
const PAD = 28;        // folga em volta da peça (sombras e moldura)
const SEG = 18;        // subdivisões da malha: mais = curva mais lisa
const SUPER = 1.5;     // a foto é tirada maior que a tela e reduzida, para o texto ficar nítido
const items = new Map(), urls = new Map();
let renderer, scene, camera, cssText = null, cssReady = null;

function warp(x, y) {
  const W = window.innerWidth, H = window.innerHeight, nx = (x / W) * 2 - 1, ny = (y / H) * 2 - 1;
  const s = 1 + K * ((nx * nx + ny * ny) / 2 - R0);
  return [((nx * s + 1) / 2) * W, ((ny * s + 1) / 2) * H];
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

// ── recursos externos viram data: (uma imagem SVG não pode buscar nada de fora) ──
async function dataUrl(u) {
  if (!urls.has(u)) urls.set(u, fetch(new URL(u, document.baseURI)).then((r) => r.blob()).then((b) => new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); })).catch(() => ''));
  return urls.get(u);
}
async function inline(text) {
  const found = new Set();
  text.replace(/url\((&quot;|["']?)(?!data:|#)([^)"'&]+)\1\)/g, (_, q, u) => found.add(u)); text.replace(/\ssrc="(?!data:)([^"]+)"/g, (_, u) => found.add(u));
  if (!found.size) return text;
  const map = new Map(await Promise.all([...found].map(async (u) => [u, await dataUrl(u.replace(/&amp;/g, '&'))])));
  return text.replace(/url\((&quot;|["']?)(?!data:|#)([^)"'&]+)\1\)/g, (m, q, u) => `url(${q}${map.get(u) || u}${q})`).replace(/\ssrc="(?!data:)([^"]+)"/g, (m, u) => ` src="${map.get(u) || u}"`);
}
function loadCss() {
  cssReady ??= (async () => {
    let css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    const faces = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
    const keep = faces.filter((f) => /VT323/.test(f) || (/Basis Grotesque Pro/.test(f) && /font-style:\s*normal/.test(f)));   // só as fontes que o HUD usa
    css = css.replace(/@font-face\s*\{[^}]*\}/g, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
      .replace(/\bbody\./g, '.sg-root.').replace(/:hover/g, '.is-hover').replace(/:active/g, '.is-active');
    // o salpico do papel é um SVG com filtro, que não desenha dentro de uma foto: vira uma imagem pronta
    const sp = document.createElement('canvas'); sp.width = sp.height = 160; const g = sp.getContext('2d'), d = g.createImageData(160, 160);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 160 * 160; i++) { const on = rnd() > 0.93; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = 255; d.data[i * 4 + 3] = on ? 40 + rnd() * 110 : 0; }
    g.putImageData(d, 0, 0);
    const speck = `:root { --ds-tex-speck: url(${sp.toDataURL()}); }`;
    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: speck }));
    cssText = await inline(keep.join('\n') + css) + speck;
  })();
  return cssReady;
}

function init() {
  if (renderer) return;
  const canvas = document.createElement('canvas'); canvas.id = 'ds-glass';
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:1';
  const ui = document.getElementById('ui'); ui.parentNode.insertBefore(canvas, ui);
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  scene = new THREE.Scene(); camera = new THREE.OrthographicCamera(0, 1, 0, 1, -1, 1);
  const size = () => { renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(window.innerWidth, window.innerHeight, false); camera.right = window.innerWidth; camera.bottom = window.innerHeight; camera.updateProjectionMatrix(); items.forEach((it) => { it.dirty = true; }); };
  window.addEventListener('resize', size); size();
  const frame = () => { items.forEach((it) => { if (it.dirty && !it.busy) shoot(it); }); renderer.render(scene, camera); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
}

function place(it) {                              // posição da peça: cliques (matrix3d) e malha (lente)
  const el = it.el; el.style.transform = 'none';
  const r = el.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h || !r.width) { it.mesh.visible = false; return null; }
  const sx = r.width / w, sy = r.height / h;
  const m = solve(w, h, [[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom]].map(([x, y]) => { const [u, v] = warp(x, y); return [(u - r.left) / sx, (v - r.top) / sy]; }));
  el.style.transformOrigin = '0 0';
  el.style.transform = `matrix3d(${m[0]},${m[3]},0,${m[6]},${m[1]},${m[4]},0,${m[7]},0,0,1,0,${m[2]},${m[5]},0,1)`;
  const pos = it.mesh.geometry.attributes.position; let n = 0;
  for (let j = 0; j <= SEG; j++) for (let i = 0; i <= SEG; i++) { const [x, y] = warp(r.left - PAD * sx + (i / SEG) * (r.width + PAD * 2 * sx), r.top - PAD * sy + (j / SEG) * (r.height + PAD * 2 * sy)); pos.setXYZ(n++, x, y, 0); }
  pos.needsUpdate = true; it.mesh.visible = true;
  return { w, h, scale: Math.min(3, Math.max(sx, sy) * Math.min(2, window.devicePixelRatio || 1) * SUPER) };
}
async function shoot(it) {                        // fotografa o HTML da peça para a textura
  it.dirty = false; it.busy = true;
  try {
    await loadCss();
    const g = place(it); if (!g) return;
    const clone = it.el.cloneNode(true); clone.removeAttribute('id');
    clone.style.cssText = `position:static;transform:none;translate:none;zoom:1;opacity:1;margin:0;width:${g.w}px;height:${g.h}px`;
    const html = await inline(new XMLSerializer().serializeToString(clone));
    const W = g.w + PAD * 2, H = g.h + PAD * 2, pw = Math.round(W * g.scale), ph = Math.round(H * g.scale);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${W} ${H}"><style><![CDATA[${cssText}]]></style><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" class="sg-root ${document.body.className}" style="box-sizing:border-box;width:${W}px;height:${H}px;padding:${PAD}px;font:400 14px/1.4 var(--sans);color:var(--paper)"><div class="h-hud" style="position:static;display:block;inset:auto">${html}</div></div></foreignObject></svg>`;
    it.svg = svg; const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode();
    const c = it.canvas; if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; it.tex.dispose(); }
    const ctx = c.getContext('2d'); ctx.clearRect(0, 0, pw, ph); ctx.drawImage(img, 0, 0, pw, ph);
    it.tex.needsUpdate = true;
  } catch (e) { console.warn('vidro: foto falhou', e); } finally { it.busy = false; }
}
if (typeof window !== 'undefined') window.__GLASS__ = items;
export function refresh() { items.forEach((it) => { it.dirty = true; }); }
export function attach(el) {
  if (!el || items.has(el)) return;
  init();
  const geo = new THREE.BufferGeometry(), n = (SEG + 1) * (SEG + 1), uv = new Float32Array(n * 2), idx = [];
  for (let j = 0, k = 0; j <= SEG; j++) for (let i = 0; i <= SEG; i++) { uv[k++] = i / SEG; uv[k++] = 1 - j / SEG; }
  for (let j = 0; j < SEG; j++) for (let i = 0; i < SEG; i++) { const a = j * (SEG + 1) + i, b = a + 1, c = a + SEG + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2;
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 8;
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthTest: false })); mesh.frustumCulled = false; mesh.visible = false; scene.add(mesh);
  const it = { el, mesh, tex, canvas, dirty: true, busy: false }; items.set(el, it);
  el.classList.add('ds-glass');
  const mark = () => { it.dirty = true; };
  new MutationObserver((list) => { if (list.some((m) => !(m.type === 'attributes' && m.target === el && m.attributeName === 'style'))) mark(); }).observe(el, { subtree: true, childList: true, attributes: true, characterData: true });
  new ResizeObserver(mark).observe(el);
  // :hover e :active não existem numa foto: viram classes
  const flag = (cls, on) => (e) => { const b = e.target.closest?.('button, [data-act], .h-menu__opt'); if (b && el.contains(b)) b.classList.toggle(cls, on); };
  el.addEventListener('pointerover', flag('is-hover', true)); el.addEventListener('pointerout', flag('is-hover', false));
  el.addEventListener('pointerdown', flag('is-active', true)); window.addEventListener('pointerup', () => el.querySelectorAll('.is-active').forEach((b) => b.classList.remove('is-active')));
}
