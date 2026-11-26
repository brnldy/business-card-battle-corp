// HUD nativo em WebGL.
// O HTML de cada peça continua existindo, INVISÍVEL: ele é o esqueleto (posição, cliques, teclado, leitor de tela)
// e a fonte única do desenho (as regras continuam em CSS: tokens.css, ds.css, ds-game.css).
// Tudo o que aparece na tela é desenhado aqui, direto pela placa de vídeo, num passe final do renderizador do jogo:
//   · caixas, molduras, bordas e degradês viram geometria colorida;
//   · texto é desenhado por campo de distância (SDF), nítido em qualquer tamanho e curvatura;
//   · imagens e ícones vão para um atlas;
//   · a lente (barril) é aplicada nos VÉRTICES: a geometria nasce curva, nada é reamostrado.
// Uma transformação projetiva (matrix3d) no HTML invisível mantém a área clicável junto do desenho.
// Limites: sem cantos arredondados, sem rotação de filhos, sombras sem desfoque (o design system não usa).
// Uso: glass.attach(elemento) e, a cada quadro, glass.render(renderer). Doc: docs/design-system/07-hud-webgl.md
import * as THREE from 'three';

const K = -0.12, R0 = 0.5;         // lente: força (negativo = barril) e raio parado
const STEP = 36;                   // caixas são fatiadas a cada STEP px para a curva ficar lisa
const SDF = { size: 48, buf: 7, radius: 8, cutoff: 0.25 };
const items = new Set();
const STATS = { ms: 0, frames: 0 };
let mesh, geo, buf, sdfTex, sdfData, imgTex, imgCanvas, imgCtx, dirty = true, nVert = 0;
const AW = 2048, AH = 2048, MAXV = 90000, F = 9;

// ───────── lente e cliques ─────────
function warp(x, y) { const W = innerWidth, H = innerHeight, nx = (x / W) * 2 - 1, ny = (y / H) * 2 - 1, s = 1 + K * ((nx * nx + ny * ny) / 2 - R0); return [((nx * s + 1) / 2) * W, ((ny * s + 1) / 2) * H]; }
function solve(w, h, q) {
  const src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = q[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
  return b.map((v, i) => v / A[i][i]);
}
function hitbox(el) {              // chamado com transform:none já aplicado
  const r = el.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight; if (!w || !h || !r.width) return;
  const sx = r.width / w, sy = r.height / h, m = solve(w, h, [[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom]].map(([x, y]) => { const [u, v] = warp(x, y); return [(u - r.left) / sx, (v - r.top) / sy]; }));
  el.style.transformOrigin = '0 0'; el.style.transform = `matrix3d(${m[0]},${m[3]},0,${m[6]},${m[1]},${m[4]},0,${m[7]},0,0,1,0,${m[2]},${m[5]},0,1)`;
}

// ───────── texto por campo de distância (algoritmo do TinySDF, feito no processador: não depende da placa) ───────
const glyphs = new Map(), fonts = new Map(); let penX = 1, penY = 1, rowH = 0;
function edt1d(f, d, v, z, n) { v[0] = 0; z[0] = -1e20; z[1] = 1e20; for (let q = 1, k = 0; q < n; q++) { let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); while (s <= z[k]) { k--; s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); } k++; v[k] = q; z[k] = s; z[k + 1] = 1e20; }
  for (let q = 0, k = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; } }
function edt(g, w, h) { const n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), z = new Float64Array(n + 1), v = new Int16Array(n);
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; edt1d(f, d, v, z, h); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; edt1d(f, d, v, z, w); for (let x = 0; x < w; x++) g[y * w + x] = Math.sqrt(d[x]); } }
function fontInfo(css) { let f = fonts.get(css); if (f) return f; const c = document.createElement('canvas').getContext('2d', { willReadFrequently: true }); c.font = css; const m = c.measureText('Hg'); f = { css, asc: Math.ceil(m.fontBoundingBoxAscent), desc: Math.ceil(m.fontBoundingBoxDescent), ctx: c }; fonts.set(css, f); return f; }
function glyph(f, ch) {
  const key = f.css + '|' + ch; let g = glyphs.get(key); if (g) return g;
  const adv = f.ctx.measureText(ch).width, w = Math.ceil(adv) + SDF.buf * 2, h = f.asc + f.desc + SDF.buf * 2;
  if (penX + w + 1 > AW) { penX = 1; penY += rowH + 1; rowH = 0; } if (penY + h + 1 > AH) return (g = { adv, w: 0, h: 0, u: 0, v: 0 });
  const c = f.ctx; c.canvas.width = w; c.canvas.height = h; c.font = f.css; c.textBaseline = 'alphabetic'; c.fillStyle = '#000'; c.clearRect(0, 0, w, h); c.fillText(ch, SDF.buf, SDF.buf + f.asc);
  const a = c.getImageData(0, 0, w, h).data, n = w * h, go = new Float64Array(n), gi = new Float64Array(n);
  for (let i = 0; i < n; i++) { const al = a[i * 4 + 3] / 255; if (al === 1) { go[i] = 0; gi[i] = 1e20; } else if (al === 0) { go[i] = 1e20; gi[i] = 0; } else { const dd = 0.5 - al; go[i] = dd > 0 ? dd * dd : 0; gi[i] = dd < 0 ? dd * dd : 0; } }
  edt(go, w, h); edt(gi, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; sdfData[(penY + y) * AW + penX + x] = Math.max(0, Math.min(255, Math.round(255 - 255 * ((go[i] - gi[i]) / SDF.radius + SDF.cutoff)))); }
  g = { adv, w, h, u: penX, v: penY }; penX += w + 1; rowH = Math.max(rowH, h); glyphs.set(key, g); sdfTex.needsUpdate = true; return g;
}

// ───────── texto pequeno: glifo em bitmap no tamanho exato de tela ─────────
// Abaixo de ~18 px o campo de distância perde traços finos (sem hinting). O texto pequeno é rasterizado pelo
// próprio navegador no tamanho exato em pixels de tela e colocado em posição inteira. A lente move cada letra
// (as linhas acompanham a curva), mas não a deforma: num glifo de 12 px a curva seria menor que um pixel.
let BUFW = 1;
const BMP_MAX = 18; const bmp = new Map(); let bx = 1, by = 1, bh = 0, bmpCanvas, bmpCtx, bmpTex, DPR = 1;
function bmpGlyph(css, ch) {
  const key = css + '|' + ch; let g = bmp.get(key); if (g) return g;
  const c = bmpCtx; c.font = css; const m = c.measureText(ch), fm = c.measureText('Hg'), asc = Math.ceil(fm.fontBoundingBoxAscent), desc = Math.ceil(fm.fontBoundingBoxDescent), pad = 3;
  const w = Math.ceil(Math.max(m.width, m.actualBoundingBoxRight || 0)) + pad * 2 + Math.ceil(Math.max(0, m.actualBoundingBoxLeft || 0)), h = asc + desc + pad * 2;
  if (bx + w + 1 > AW) { bx = 1; by += bh + 1; bh = 0; } if (by + h + 1 > AH) return (g = { adv: m.width, w: 0 });
  c.save(); c.beginPath(); c.rect(bx, by, w, h); c.clip(); c.clearRect(bx, by, w, h); c.fillStyle = '#fff'; c.textBaseline = 'alphabetic'; c.fillText(ch, bx + pad + Math.ceil(Math.max(0, m.actualBoundingBoxLeft || 0)), by + pad + asc); c.restore();
  g = { adv: m.width, w, h, u: bx, v: by, ox: pad + Math.ceil(Math.max(0, m.actualBoundingBoxLeft || 0)), oy: pad + asc, asc, desc }; bx += w + 1; bh = Math.max(bh, h); bmp.set(key, g); bmpTex.needsUpdate = true; return g;
}

// ───────── atlas de imagens e ícones ─────────
const images = new Map(); let ix = 1, iy = 1, ih = 0;
function image(src, maxW = 640) {
  let e = images.get(src); if (e) return e.ok ? e : null;
  e = { ok: false }; images.set(src, e);
  const im = new Image(); im.crossOrigin = 'anonymous';
  im.onload = () => { const k = Math.min(1, maxW / im.naturalWidth), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
    if (ix + w + 1 > AW) { ix = 1; iy += ih + 1; ih = 0; } if (iy + h + 1 > AH) return;
    imgCtx.drawImage(im, ix, iy, w, h); Object.assign(e, { ok: true, x: ix, y: iy, w, h, nw: im.naturalWidth, nh: im.naturalHeight }); ix += w + 1; ih = Math.max(ih, h); imgTex.needsUpdate = true; dirty = true; };
  im.src = src; return null;
}

// ───────── geometria ─────────
const ROT = { a: 0, cx: 0, cy: 0, cos: 1, sin: 0 };
function setRot(a, cx, cy) { ROT.a = a; ROT.cx = cx; ROT.cy = cy; ROT.cos = Math.cos(a); ROT.sin = Math.sin(a); }
function vert(x, y, u, v, c, mode) { if (nVert >= MAXV) return; if (ROT.a) { const dx = x - ROT.cx, dy = y - ROT.cy; x = ROT.cx + dx * ROT.cos - dy * ROT.sin; y = ROT.cy + dx * ROT.sin + dy * ROT.cos; } const o = nVert++ * F; buf[o] = x; buf[o + 1] = y; buf[o + 2] = u; buf[o + 3] = v; buf[o + 4] = c[0]; buf[o + 5] = c[1]; buf[o + 6] = c[2]; buf[o + 7] = c[3]; buf[o + 8] = mode; }
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
// retângulo fatiado; c0→c1 é o degrade (vertical, ou horizontal se horiz); uv opcional (u0,v0,u1,v1)
let CLIP = null;   // recorte de elementos com overflow (relatório com rolagem, listas)
function quad(x, y, w, h, c0, c1 = c0, mode = 0, uv = null, horiz = false) {
  if (w <= 0 || h <= 0 || (c0[3] <= 0 && c1[3] <= 0)) return;
  if (CLIP && !ROT.a) {
    const x0 = Math.max(x, CLIP[0]), y0 = Math.max(y, CLIP[1]), x1 = Math.min(x + w, CLIP[2]), y1 = Math.min(y + h, CLIP[3]); if (x1 <= x0 || y1 <= y0) return;
    if (x0 !== x || y0 !== y || x1 !== x + w || y1 !== y + h) {
      const ta0 = (x0 - x) / w, ta1 = (x1 - x) / w, tb0 = (y0 - y) / h, tb1 = (y1 - y) / h;
      if (uv) uv = [uv[0] + (uv[2] - uv[0]) * ta0, uv[1] + (uv[3] - uv[1]) * tb0, uv[0] + (uv[2] - uv[0]) * ta1, uv[1] + (uv[3] - uv[1]) * tb1];
      const m0 = mix(c0, c1, horiz ? ta0 : tb0), m1 = mix(c0, c1, horiz ? ta1 : tb1); c0 = m0; c1 = m1; x = x0; y = y0; w = x1 - x0; h = y1 - y0;
    }
  }
  const nx = Math.max(1, Math.ceil(w / STEP)), ny = Math.max(1, Math.ceil(h / STEP));
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a0 = i / nx, a1 = (i + 1) / nx, b0 = j / ny, b1 = (j + 1) / ny;
    const P = (a, b) => { const col = mix(c0, c1, horiz ? a : b); vert(x + w * a, y + h * b, uv ? uv[0] + (uv[2] - uv[0]) * a : 0, uv ? uv[1] + (uv[3] - uv[1]) * b : 0, col, mode); };
    P(a0, b0); P(a1, b0); P(a0, b1); P(a1, b0); P(a1, b1); P(a0, b1);
  }
}
const rgba = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null; const p = m[1].split(/[,\s/]+/).map(Number); return [p[0] / 255, p[1] / 255, p[2] / 255, p[3] ?? 1]; };
const fade = (c, a) => [c[0], c[1], c[2], c[3] * a];
function layers(s) { const out = []; let d = 0, st = 0; for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch === '(') d++; else if (ch === ')') d--; else if (ch === ',' && d === 0) { out.push(s.slice(st, i).trim()); st = i + 1; } } out.push(s.slice(st).trim()); return out; }
const px = (v) => parseFloat(v) || 0;

function paintBox(cs, x, y, w, h, alpha) {
  const rad = px(cs.borderTopLeftRadius), circle = rad > 0 && (cs.borderTopLeftRadius.endsWith('%') ? parseFloat(cs.borderTopLeftRadius) >= 45 : rad >= Math.min(w, h) / 2 - 0.5);
  if (circle) {                                     // pinos, luzes, selos: círculo desenhado no shader
    const bw = px(cs.borderTopWidth), bc = rgba(cs.borderTopColor), bg = rgba(cs.backgroundColor) ?? (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(rgba).pop();
    if (cs.boxShadow && cs.boxShadow !== 'none') for (const sh of layers(cs.boxShadow).reverse()) { if (sh.includes('inset')) continue; const c = rgba(sh); if (!c) continue; const n = sh.replace(/rgba?\([^)]+\)/, '').trim().split(/\s+/).map(px), sp = n[3] || 0; quad(x + n[0] - sp, y + n[1] - sp, w + sp * 2, h + sp * 2, fade(c, alpha), undefined, 4, [0, 0, 1, 1]); }
    if (bw > 0 && bc && cs.borderTopStyle !== 'none') quad(x, y, w, h, fade(bc, alpha), undefined, 4, [0, 0, 1, 1]);
    if (bg && bg[3] > 0) quad(x + bw, y + bw, w - bw * 2, h - bw * 2, fade(bg, alpha), undefined, 4, [0, 0, 1, 1]);
    return;
  }
  // sombras sem desfoque = camadas da moldura; a primeira da lista fica por cima
  if (cs.boxShadow && cs.boxShadow !== 'none') { const sh = layers(cs.boxShadow); for (let i = sh.length - 1; i >= 0; i--) { const s = sh[i]; if (s.includes('inset')) continue; const c = rgba(s); if (!c) continue; const n = s.replace(/rgba?\([^)]+\)/, '').trim().split(/\s+/).map(px); const sp = n[3] || 0; quad(x + n[0] - sp, y + n[1] - sp, w + sp * 2, h + sp * 2, fade(c, alpha * (n[2] > 0 ? 0.6 : 1))); } }
  // fundo: cor ou degrade (a última camada é a base; ter mais camadas = papel texturizado)
  let c0 = rgba(cs.backgroundColor), c1 = c0, horiz = false, paper = 0; const bi = cs.backgroundImage; let art = null, stripes = null;
  if (bi && bi !== 'none') { const ls = layers(bi), last = ls[ls.length - 1];
    if (/^linear-gradient/.test(last)) { const cols = last.match(/rgba?\([^)]+\)/g); if (cols) { c0 = rgba(cols[0]); c1 = rgba(cols[cols.length - 1]); horiz = /^linear-gradient\((90deg|to right)/.test(last); } }
    if (/^repeating-linear-gradient/.test(last)) { const cols = last.match(/rgba?\([^)]+\)/g), stops = last.match(/(\d+(?:\.\d+)?)px/g); if (cols && stops && rgba(cols[0])[3] === 1) stripes = { a: rgba(cols[0]), b: rgba(cols[cols.length - 1]), p: px(stops[stops.length - 1]) }; }
    if (ls.length > 1) paper = 1;
    for (const l of ls) { const m = /^url\("?([^")]+)"?\)/.exec(l); if (m && !/feTurbulence/.test(m[1])) art = m[1]; }
  }
  if (stripes) { for (let yy = 0, k = 0; yy < h; yy += stripes.p / 2, k++) quad(x, y + yy, w, Math.min(stripes.p / 2, h - yy), fade(k % 2 ? stripes.b : stripes.a, alpha), undefined, 3); }
  else if (c0 && (c0[3] > 0 || c1[3] > 0)) quad(x, y, w, h, fade(c0, alpha), fade(c1, alpha), paper ? 3 : 0, null, horiz);
  if (art) { const e = image(art); if (e) { let iw = e.nw, ihh = e.nh; const bs = cs.backgroundSize, m = /^([\d.]+)% auto/.exec(bs);
      if (bs === 'cover') { const k = Math.max(w / iw, h / ihh); iw *= k; ihh *= k; } else if (bs === 'contain') { const k = Math.min(w / iw, h / ihh); iw *= k; ihh *= k; } else if (m) { const k = (w * m[1]) / 100 / iw; iw *= k; ihh *= k; } else if (/px/.test(bs)) { const p = bs.split(' ').map(px); ihh = p[1] || (ihh * p[0]) / iw; iw = p[0]; }
      const bp = cs.backgroundPosition.split(' ').map(px), ox = ((w - iw) * (bp[0] ?? 50)) / 100, oy = ((h - ihh) * (bp[1] ?? 50)) / 100;
      const x0 = Math.max(0, ox), y0 = Math.max(0, oy), x1 = Math.min(w, ox + iw), y1 = Math.min(h, oy + ihh);
      if (x1 > x0 && y1 > y0) quad(x + x0, y + y0, x1 - x0, y1 - y0, [1, 1, 1, alpha], undefined, 2, [(e.x + ((x0 - ox) / iw) * e.w) / AW, (e.y + ((y0 - oy) / ihh) * e.h) / AH, (e.x + ((x1 - ox) / iw) * e.w) / AW, (e.y + ((y1 - oy) / ihh) * e.h) / AH]); } }
  // bordas
  const bt = px(cs.borderTopWidth), br = px(cs.borderRightWidth), bb = px(cs.borderBottomWidth), bl = px(cs.borderLeftWidth);
  const side = (wd, st, col, X, Y, W2, H2) => { if (wd > 0 && st !== 'none' && st !== 'hidden') { const c = rgba(col); if (c) quad(X, Y, W2, H2, fade(c, alpha * (st === 'solid' ? 1 : 0.55))); } };
  side(bt, cs.borderTopStyle, cs.borderTopColor, x, y, w, bt); side(bb, cs.borderBottomStyle, cs.borderBottomColor, x, y + h - bb, w, bb);
  side(bl, cs.borderLeftStyle, cs.borderLeftColor, x, y, bl, h); side(br, cs.borderRightStyle, cs.borderRightColor, x + w - br, y, br, h);
  // contorno externo (outline): carimbos com traço duplo
  const ow = px(cs.outlineWidth); if (ow > 0 && cs.outlineStyle !== 'none') { const c = rgba(cs.outlineColor); if (c) { const o = px(cs.outlineOffset), X = x - o - ow, Y = y - o - ow, W2 = w + (o + ow) * 2, H2 = h + (o + ow) * 2, cc = fade(c, alpha); quad(X, Y, W2, ow, cc); quad(X, Y + H2 - ow, W2, ow, cc); quad(X, Y, ow, H2, cc); quad(X + W2 - ow, Y, ow, H2, cc); } }
  // fio interno (inset sem deslocamento)
  if (cs.boxShadow && cs.boxShadow.includes('inset')) for (const s of layers(cs.boxShadow)) { if (!s.includes('inset')) continue; const c = rgba(s), n = s.replace(/rgba?\([^)]+\)|inset/g, '').trim().split(/\s+/).map(px), t = n[3] || 0; if (!c || !t || n[0] || n[1]) continue; const X = x + bl, Y = y + bt, W2 = w - bl - br, H2 = h - bt - bb, cc = fade(c, alpha); quad(X, Y, W2, t, cc); quad(X, Y + H2 - t, W2, t, cc); quad(X, Y, t, H2, cc); quad(X + W2 - t, Y, t, H2, cc); }
}
let KROOT = 1;
function paintText(node, cs, alpha) {
  const col = rgba(cs.color); if (!col) return; const fs = px(cs.fontSize); if (fs < 4) return;
  const f = fontInfo(`${cs.fontStyle} ${cs.fontWeight} ${SDF.size}px ${cs.fontFamily}`), s = fs / SDF.size, ls = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing), up = cs.textTransform === 'uppercase';
  const range = document.createRange(), txt = node.data, re = /\S+/g; let m;
  const devPx = Math.round(fs * KROOT * DPR);
  if (!ROTA && devPx <= BMP_MAX * DPR) {             // texto pequeno: bitmap nítido, em pixel inteiro
    const css = `${cs.fontStyle} ${cs.fontWeight} ${devPx}px ${cs.fontFamily}`, lsd = ls * KROOT;
    while ((m = re.exec(txt))) {
      range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length); const rs = range.getClientRects(); if (!rs.length) continue; const r = rs[0]; if (!r.width) continue;
      const word = up ? m[0].toUpperCase() : m[0], gl = [...word].map((ch) => bmpGlyph(css, ch)), nat = gl.reduce((n, g) => n + g.adv / DPR + lsd, 0) - lsd, kx = nat > 0 ? Math.min(1.25, Math.max(0.8, r.width / nat)) : 1;
      const asc = (gl.find((g) => g.w)?.asc ?? devPx * 0.8) / DPR, desc = (gl.find((g) => g.w)?.desc ?? devPx * 0.2) / DPR, base = r.top + (r.height - asc - desc) / 2 + asc;
      // altura: a palavra inteira anda junto (a linha não "pula" letra a letra); largura: cada letra segue a lente,
      // para o aperto da curva nas bordas se espalhar entre as letras em vez de engolir o espaço entre palavras
      let pen = r.left; const oy = Math.round((warp(r.left + r.width / 2, base)[1] - base) * DPR) / DPR;
      for (const g of gl) { if (g.w) { const X = Math.round(warp(pen, base)[0] * DPR) - g.ox, Y = Math.round((base + oy) * DPR) - g.oy; quad(X / DPR, Y / DPR, g.w / DPR, g.h / DPR, fade(col, alpha), undefined, 5, [g.u / AW, g.v / AH, (g.u + g.w) / AW, (g.v + g.h) / AH]); } pen += (g.adv / DPR + lsd) * kx; }
    }
    return;
  }
  while ((m = re.exec(txt))) {
    range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length); const rs = range.getClientRects(); if (!rs.length) continue; const r = rs[0]; if (!r.width) continue;
    const word = up ? m[0].toUpperCase() : m[0], gl = [...word].map((ch) => glyph(f, ch)), zoom = KROOT;   // zoom: escala da peça
    const nat = gl.reduce((n, g) => n + g.adv * s * zoom + ls * zoom, 0) - ls * zoom, kx = ROTA ? 1 : nat > 0 ? Math.min(1.3, Math.max(0.75, r.width / nat)) : 1;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, hh = (f.asc + f.desc) * s * zoom; setRot(ROTA, cx, cy);
    let pen = ROTA ? cx - nat / 2 : r.left; const base = (ROTA ? cy - hh / 2 : r.top) + f.asc * s * zoom;
    for (const g of gl) { if (g.w) { const k = s * zoom, x0 = pen - SDF.buf * k * kx, y0 = base - (f.asc + SDF.buf) * k; quad(x0, y0, g.w * k * kx, g.h * k, fade(col, alpha), undefined, 1, [g.u / AW, g.v / AH, (g.u + g.w) / AW, (g.v + g.h) / AH]); } pen += (g.adv * s * zoom + ls * zoom) * kx; }
  }
  setRot(0, 0, 0);
}
function paintPseudo(el, which, r, cs, alpha) {
  const ps = getComputedStyle(el, which); if (!ps.content || ps.content === 'none' || ps.display === 'none' || ps.position !== 'absolute') return;
  const k = r.width / (el.offsetWidth || r.width) || 1, w = px(ps.width) * k, h = px(ps.height) * k; if (!w || !h) return;
  const L = px(cs.borderLeftWidth) * k, T = px(cs.borderTopWidth) * k, R = px(cs.borderRightWidth) * k, B = px(cs.borderBottomWidth) * k;
  const x = ps.left !== 'auto' ? r.left + L + px(ps.left) * k + px(ps.marginLeft) * k : r.right - R - px(ps.right) * k - w, y = ps.top !== 'auto' ? r.top + T + px(ps.top) * k + px(ps.marginTop) * k : r.bottom - B - px(ps.bottom) * k - h;
  paintBox(ps, x, y, w, h, alpha * (parseFloat(ps.opacity) || 1));
}
let ROTA = 0;
function ownAngle(cs) { let a = 0; const t = cs.transform; if (t && t !== 'none') { const m = /matrix\(([^)]+)\)/.exec(t); if (m) { const v = m[1].split(',').map(Number); a += Math.atan2(v[1], v[0]); } } if (cs.rotate && cs.rotate !== 'none') a += (parseFloat(cs.rotate) * Math.PI) / 180; return a; }
function paintEl(el, alpha) {
  const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
  const root = !!el.dataset.glassRoot, a = alpha * (root ? 1 : parseFloat(cs.opacity)); if (a <= 0.01) return;
  const prevRot = ROTA; if (!root) ROTA += ownAngle(cs);
  let r = el.getBoundingClientRect();
  if (ROTA && el.offsetWidth) { const w = el.offsetWidth * KROOT, h = el.offsetHeight * KROOT, cx = r.left + r.width / 2, cy = r.top + r.height / 2; r = { left: cx - w / 2, top: cy - h / 2, width: w, height: h, right: cx + w / 2, bottom: cy + h / 2 }; }
  if (el.tagName === 'svg' && !ROTA && el.classList.contains('h-ico')) {
    const dw = Math.max(1, Math.round(r.width * DPR)), dh = Math.max(1, Math.round(r.height * DPR)), key = 'ico|' + dw + 'x' + dh + '|' + el.innerHTML + '|' + (el.getAttribute('viewBox') || '');
    let g = bmp.get(key);
    if (!g) { g = { ok: false }; bmp.set(key, g); const cl = el.cloneNode(true); cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); cl.setAttribute('width', dw); cl.setAttribute('height', dh); cl.removeAttribute('class'); const src = [el, ...el.querySelectorAll('*')], dst = [cl, ...cl.querySelectorAll('*')]; src.forEach((n, i) => { const c = getComputedStyle(n); dst[i].setAttribute('style', `fill:${c.fill === 'none' ? 'none' : '#fff'};stroke:${c.stroke === 'none' ? 'none' : '#fff'};stroke-width:${c.strokeWidth};stroke-linecap:${c.strokeLinecap};stroke-linejoin:${c.strokeLinejoin};fill-rule:${c.fillRule}`); });
      const im = new Image(); im.onload = () => { if (bx + dw + 1 > AW) { bx = 1; by += bh + 1; bh = 0; } if (by + dh + 1 > AH) return; bmpCtx.clearRect(bx, by, dw, dh); bmpCtx.drawImage(im, bx, by, dw, dh); Object.assign(g, { ok: true, u: bx, v: by }); bx += dw + 1; bh = Math.max(bh, dh); bmpTex.needsUpdate = true; dirty = true; };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(cl)); }
    if (g.ok) { const col = rgba(cs.color) ?? [1, 1, 1, 1], [lx, ly] = warp(r.left, r.top); quad(Math.round(lx * DPR) / DPR, Math.round(ly * DPR) / DPR, dw / DPR, dh / DPR, fade(col, a), undefined, 5, [g.u / AW, g.v / AH, (g.u + dw) / AW, (g.v + dh) / AH]); }
    ROTA = prevRot; return; }
  if (el.tagName === 'svg') { const c = cs.color, key = 'svg|' + c + '|' + el.outerHTML; let src = images.get(key)?.src; if (!src) { const cl = el.cloneNode(true); cl.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); cl.setAttribute('width', 64); cl.setAttribute('height', 64); cl.style.color = c; src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(cl)); }
    const e = image(src, 128); setRot(ROTA, r.left + r.width / 2, r.top + r.height / 2); if (e) quad(r.left, r.top, r.width, r.height, [1, 1, 1, a], undefined, 2, [e.x / AW, e.y / AH, (e.x + e.w) / AW, (e.y + e.h) / AH]); setRot(0, 0, 0); ROTA = prevRot; return; }
  if (el.tagName === 'IMG') { const e = el.currentSrc || el.src ? image(el.currentSrc || el.src) : null; setRot(ROTA, r.left + r.width / 2, r.top + r.height / 2); if (e) quad(r.left, r.top, r.width, r.height, [1, 1, 1, a], undefined, 2, [e.x / AW, e.y / AH, (e.x + e.w) / AW, (e.y + e.h) / AH]); setRot(0, 0, 0); ROTA = prevRot; return; }
  if (r.width && r.height) { setRot(ROTA, r.left + r.width / 2, r.top + r.height / 2); paintBox(cs, r.left, r.top, r.width, r.height, a); paintPseudo(el, '::before', r, cs, a); setRot(0, 0, 0); }
  const prevClip = CLIP;
  if (!root && !ROTA && /hidden|auto|scroll|clip/.test(cs.overflowX + cs.overflowY) && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)) { const c = [r.left + px(cs.borderLeftWidth), r.top + px(cs.borderTopWidth), r.right - px(cs.borderRightWidth), r.bottom - px(cs.borderBottomWidth)]; CLIP = prevClip ? [Math.max(c[0], prevClip[0]), Math.max(c[1], prevClip[1]), Math.min(c[2], prevClip[2]), Math.min(c[3], prevClip[3])] : c; }
  for (const n of el.childNodes) { if (n.nodeType === 3) { if (n.data.trim()) paintText(n, cs, a); } else if (n.nodeType === 1) paintEl(n, a); }
  CLIP = prevClip;
  if (r.width && r.height) { setRot(ROTA, r.left + r.width / 2, r.top + r.height / 2); paintPseudo(el, '::after', r, cs, a); setRot(0, 0, 0); }
  ROTA = prevRot;
}
function repaint() {
  nVert = 0;
  for (const el of items) { el.style.transform = 'none'; }
  const dpr = BUFW / innerWidth; if (Math.abs(dpr - DPR) > 0.001) { DPR = dpr; bmp.clear(); bmpCtx.clearRect(0, 0, AW, AH); bx = by = 1; bh = 0; bmpTex.needsUpdate = true; }
  const t0 = performance.now();
  for (const el of items) { if (!el.offsetWidth || !el.offsetHeight) continue; KROOT = el.getBoundingClientRect().width / el.offsetWidth || 1; ROTA = 0; CLIP = null; paintEl(el, 1); }
  STATS.ms = performance.now() - t0; STATS.frames++;
  for (const el of items) hitbox(el);
  geo.attributes.position.data.needsUpdate = true; geo.setDrawRange(0, nVert);
}

function init() {
  if (mesh) return;
  buf = new Float32Array(MAXV * F); const ib = new THREE.InterleavedBuffer(buf, F); ib.setUsage(THREE.DynamicDrawUsage);
  geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.InterleavedBufferAttribute(ib, 2, 0)); geo.setAttribute('uv', new THREE.InterleavedBufferAttribute(ib, 2, 2)); geo.setAttribute('aColor', new THREE.InterleavedBufferAttribute(ib, 4, 4)); geo.setAttribute('aMode', new THREE.InterleavedBufferAttribute(ib, 1, 8));
  sdfData = new Uint8Array(AW * AH); sdfTex = new THREE.DataTexture(sdfData, AW, AH, THREE.RedFormat); sdfTex.minFilter = sdfTex.magFilter = THREE.LinearFilter; sdfTex.needsUpdate = true;
  bmpCanvas = document.createElement('canvas'); bmpCanvas.width = AW; bmpCanvas.height = AH; bmpCtx = bmpCanvas.getContext('2d'); bmpTex = new THREE.CanvasTexture(bmpCanvas); bmpTex.flipY = false; bmpTex.colorSpace = THREE.NoColorSpace; bmpTex.minFilter = bmpTex.magFilter = THREE.NearestFilter; bmpTex.generateMipmaps = false;
  imgCanvas = document.createElement('canvas'); imgCanvas.width = AW; imgCanvas.height = AH; imgCtx = imgCanvas.getContext('2d'); imgTex = new THREE.CanvasTexture(imgCanvas); imgTex.flipY = false; imgTex.colorSpace = THREE.NoColorSpace; imgTex.minFilter = THREE.LinearFilter; imgTex.generateMipmaps = false;
  // mistura separada para o alfa: o canal alfa da tela fica sempre opaco (sem 'buracos' onde letras se sobrepõem)
  const mat = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uSdf: { value: sdfTex }, uImg: { value: imgTex }, uBmp: { value: bmpTex } },
    vertexShader: `attribute vec4 aColor; attribute float aMode; uniform vec2 uRes; varying vec2 vUv; varying vec4 vColor; varying float vMode;
      void main() { vUv = uv; vColor = aColor; vMode = aMode; vec2 n = position.xy / uRes * 2.0 - 1.0; if (aMode < 4.5) { float r2 = dot(n, n) / 2.0; n *= 1.0 + (${K.toFixed(3)}) * (r2 - ${R0.toFixed(2)}); } gl_Position = vec4(n.x, -n.y, 0.0, 1.0); }`,   // modo 5 já vem posicionado pela lente (texto pequeno)
    fragmentShader: `uniform sampler2D uSdf, uImg, uBmp; varying vec2 vUv; varying vec4 vColor; varying float vMode;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() { vec4 c = vColor;
        if (vMode > 4.5) { c.a *= texture2D(uBmp, vUv).a; }
        else if (vMode > 3.5) { float r = length(vUv * 2.0 - 1.0), w = max(fwidth(r), 0.0001); c.a *= 1.0 - smoothstep(1.0 - w, 1.0, r); }
        else if (vMode > 2.5) { vec2 f = floor(gl_FragCoord.xy); c.rgb += (hash(f) - 0.5) * 0.035; c.rgb -= step(mod(f.y, 3.0), 0.5) * 0.022; c.rgb += step(0.965, hash(f * 0.5 + 7.0)) * 0.06; }   // papel: grão, linhas finas, salpico
        else if (vMode > 1.5) { vec4 t = texture2D(uImg, vUv); c = vec4(t.rgb, t.a * vColor.a); }
        else if (vMode > 0.5) { float d = texture2D(uSdf, vUv).r, fw = max(fwidth(d), 0.0001), e = ${(1 - SDF.cutoff).toFixed(2)}; c.a *= clamp((d - e) / fw + 0.5, 0.0, 1.0); }   // cobertura por pixel; texto pequeno ganha ~0,4 px de espessura para traços finos não sumirem
        if (c.a < 0.004) discard; gl_FragColor = c; }` });
  mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
  window.addEventListener('resize', () => { dirty = true; });
  document.fonts?.addEventListener?.('loadingdone', () => { glyphs.clear(); fonts.clear(); sdfData.fill(0); penX = penY = 1; rowH = 0; bmp.clear(); bmpCtx.clearRect(0, 0, AW, AH); bx = by = 1; bh = 0; sdfTex.needsUpdate = bmpTex.needsUpdate = true; dirty = true; });
}
const scene = new THREE.Scene(), cam = new THREE.Camera();
/** chamado a cada quadro, depois de a cena do jogo ter sido desenhada */
export function render(renderer) {
  if (!mesh) return;
  const bw = renderer.getDrawingBufferSize(new THREE.Vector2()).x; if (bw !== BUFW) { BUFW = bw; dirty = true; }
  if (!dirty) for (const el of items) { if (el.offsetWidth && el.getAnimations && el.getAnimations({ subtree: true }).some((a) => a.playState === 'running')) { dirty = true; break; } }
  if (dirty) { dirty = false; try { repaint(); } catch (e) { console.warn('hud webgl: falha ao desenhar', e); } }
  if (!nVert) return;
  mesh.material.uniforms.uRes.value.set(innerWidth, innerHeight);
  if (!mesh.parent) scene.add(mesh);
  const ac = renderer.autoClear; renderer.autoClear = false; renderer.setRenderTarget(null); renderer.render(scene, cam); renderer.autoClear = ac;
}
export function refresh() { dirty = true; }
if (typeof window !== 'undefined') window.__HUDGL__ = { atlas: () => ({ sdf: sdfData, AW, AH, glyphs }), stats: () => ({ nVert, items: items.size, ...STATS }) };
export function attach(el) {
  if (!el || items.has(el)) return; init(); items.add(el); el.classList.add('ds-glass'); el.dataset.glassRoot = '1';
  new MutationObserver((list) => { if (list.some((m) => !(m.type === 'attributes' && m.target === el && m.attributeName === 'style'))) dirty = true; }).observe(el, { subtree: true, childList: true, attributes: true, characterData: true });
  new ResizeObserver(() => { dirty = true; }).observe(el);
  el.addEventListener('scroll', () => { dirty = true; }, true);
  for (const ev of ['pointerover', 'pointerout', 'pointerdown', 'pointerup', 'focusin', 'focusout']) el.addEventListener(ev, () => { dirty = true; requestAnimationFrame(() => { dirty = true; }); });
}
