// O lobby: a recepção da empresa por dentro. Escritório decadente, pós-apocalíptico e amaldiçoado.
// Cada área do lobby é um objeto da sala que dá para clicar:
//   arquivos = decks e coleção · trituradora = reciclar · porta dupla = duelo · mural = metas do dia
//   máquina de venda = loja · quadro de luz = configurações · estagiário = treino · recepção = perfil · troféus = conquistas
// Tudo por código, mais os modelos CC0 já usados no jogo (Poly Haven e Quaternius).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { model, clips } from './assets.js';
import { fbm, hash, mkCanvas, paint, tex, woodTexture, metalTexture, paperTexture, posterTexture, portraitTexture, clockTexture, cardBackTexture, SERIF, UI } from './textures.js';
import * as GR from './grime.js';
import { dustMotes } from './gfx.js';
import { drawLogo } from './cosmetics.js';

const M = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
const B = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
const CARD_W = 0.2, CARD_R = 1257 / 1079; // carta que entra na trituradora: largura (m) e proporção da imagem
/** a carta que entra na fenda: sem luz (aparece igual à do painel), cortada pelo plano da fenda */
const cardMat = (tex, plane) => new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, clippingPlanes: [plane] });
/** as tiras: um pouco de brilho próprio (dentro do cesto a luz é pouca) e o verso de papel branco (de costas não vira palito escuro) */
function stripMat(tex, plane) {
  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x262626, emissiveMap: tex, side: THREE.DoubleSide, clippingPlanes: [plane] });
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n  if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.86, 0.84, 0.78);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  if (!gl_FrontFacing) totalEmissiveRadiance = vec3(0.16, 0.155, 0.14);');
  };
  return mat;
}
/** junta malhas irmãs com o mesmo material numa só (cada malha é um desenho por quadro): posições, normais e uv já no espaço do pai */
function mergeMeshes(list) {
  const pos = [], nor = [], uv = [], idx = [], v = new THREE.Vector3(), nm = new THREE.Matrix3(); let base = 0;
  for (const m of list) {
    m.updateMatrix(); nm.getNormalMatrix(m.matrix);
    const G = m.geometry, P = G.attributes.position, Nn = G.attributes.normal, U = G.attributes.uv;
    for (let k = 0; k < P.count; k++) { v.fromBufferAttribute(P, k).applyMatrix4(m.matrix); pos.push(v.x, v.y, v.z); v.fromBufferAttribute(Nn, k).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z); uv.push(U ? U.getX(k) : 0, U ? U.getY(k) : 0); }
    if (G.index) for (const i of G.index.array) idx.push(i + base); else for (let k = 0; k < P.count; k++) idx.push(k + base);
    base += P.count;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  const one = new THREE.Mesh(geo, list[0].material); one.castShadow = list.some((m) => m.castShadow); one.receiveShadow = list.some((m) => m.receiveShadow);
  const parent = list[0].parent; for (const m of list) { parent?.remove(m); m.geometry.dispose(); } parent?.add(one);
  return one;
}
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const rbox = (w, h, d, r, m) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), m);
const cyl = (rt, rb, h, seg, m) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const plane = (w, h, m) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const k01 = (v) => Math.max(0, Math.min(1, v));

// sala em metros: chão em y=0, parede do fundo em z=BACK
const HALF = 6, CEIL = 3.3, BACK = -4.5, FRONT = 5.5;
const AMBER = 0xf2b94c, SICK = 0xb8ffd0, WARM = 0xffc27a;

// ───────── texturas ─────────
const canvasTex = (c, pixel = true) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (pixel) { t.magFilter = THREE.NearestFilter; } return t; };
function signTexture(text, { w = 512, h = 96, bg = '#0b0f0c', fg = '#f2b94c', font = `700 54px ${UI}`, border = true } = {}) {
  const { c, g } = mkCanvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12); }
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 3);
  return canvasTex(c);
}
function corkTexture() {
  const W = 256, H = 192, { c, g } = mkCanvas(W, H);
  paint(g, W, H, (x, y) => { const v = 0.5 + fbm(x / 9, y / 9, 31, 3) * 0.5 + (hash(x, y, 2) - 0.5) * 0.2; return [150 * v, 104 * v, 60 * v]; });
  // memorandos presos, carimbo e barbante vermelho ligando os alfinetes
  const notes = [[22, 20, 62, 78, '#e7e0c4'], [98, 30, 58, 70, '#d9d3b6'], [172, 18, 64, 84, '#efe8cf'], [60, 112, 70, 60, '#cfc9ab'], [150, 116, 82, 56, '#e2dcc0']];
  notes.forEach(([x, y, w, h, col], i) => {
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((hash(i, 3, 5) - 0.5) * 0.24); g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = 'rgba(20,24,20,0.75)'; g.fillRect(-w / 2 + 6, -h / 2 + 7, w * 0.5, 4);
    for (let l = 0; l < 6; l++) g.fillRect(-w / 2 + 6, -h / 2 + 18 + l * 7, (w - 14) * (0.5 + hash(i, l, 9) * 0.5), 2);
    if (i % 2 === 0) { g.strokeStyle = 'rgba(190,30,20,0.85)'; g.lineWidth = 3; g.strokeRect(w / 2 - 30, h / 2 - 20, 24, 13); }
    g.fillStyle = '#c0261c'; g.beginPath(); g.arc(0, -h / 2 + 4, 4, 0, 7); g.fill();
    g.restore();
  });
  g.strokeStyle = 'rgba(200,30,22,0.9)'; g.lineWidth = 2; g.beginPath();
  [[53, 24], [127, 34], [204, 22], [191, 120], [95, 116], [53, 24], [191, 120]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  return canvasTex(c);
}
function vendingTexture() {
  const W = 256, H = 480, { c, g } = mkCanvas(W, H);
  g.fillStyle = '#0c1410'; g.fillRect(0, 0, W, H);
  // vitrine: fileiras de envelopes (pacotes) em molas; alguns vazios, um caído
  g.fillStyle = '#18332a'; g.fillRect(14, 16, 166, 330);
  for (let r = 0; r < 5; r++) {
    g.fillStyle = '#060a08'; g.fillRect(14, 16 + r * 66 + 58, 166, 6);
    for (let k = 0; k < 4; k++) {
      const x = 22 + k * 40, y = 22 + r * 66, h = hash(r, k, 91);
      if (h < 0.18) continue;
      g.save(); g.translate(x + 16, y + 26); if (h > 0.93) g.rotate(0.7);
      g.fillStyle = h > 0.8 ? '#f2b94c' : h > 0.5 ? '#d7d0b3' : '#9fb6a4'; g.fillRect(-15, -24, 30, 46);
      g.fillStyle = '#0c1410'; g.font = `700 22px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(h > 0.8 ? '$' : '?', 0, 0);
      g.restore();
    }
  }
  // painel lateral: visor de preço, fenda de moedas, teclado
  g.fillStyle = '#060a08'; g.fillRect(190, 16, 54, 330);
  g.fillStyle = '#0a2014'; g.fillRect(194, 26, 46, 26); g.fillStyle = '#7dff9e'; g.font = `700 15px ${UI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('3000', 217, 40);
  for (let i = 0; i < 12; i++) { g.fillStyle = hash(i, 4, 6) > 0.85 ? '#ee3a30' : '#3a4a40'; g.fillRect(196 + (i % 3) * 15, 66 + Math.floor(i / 3) * 15, 11, 11); }
  g.fillStyle = '#c9c2a6'; g.fillRect(208, 140, 18, 5); g.fillStyle = '#ee3a30'; g.fillRect(200, 160, 34, 8);
  // gaveta de retirada e mancha escorrendo
  g.fillStyle = '#020403'; g.fillRect(24, 372, 150, 60); g.strokeStyle = '#2a3a32'; g.lineWidth = 3; g.strokeRect(24, 372, 150, 60);
  g.fillStyle = 'rgba(70,10,6,0.75)'; g.fillRect(120, 432, 8, 48); g.fillRect(132, 432, 4, 30);
  const im = g.getImageData(0, 0, W, H), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const x = (i / 4) % W, y = Math.floor(i / 4 / W), n = 0.72 + fbm(x / 40, y / 40, 8, 3) * 0.5; d[i] *= n; d[i + 1] *= n; d[i + 2] *= n; }
  g.putImageData(im, 0, 0);
  return canvasTex(c);
}
// carpete de escritório dos anos 70: losangos concêntricos em mostarda, laranja, marrom e verde-água,
// desalinhados de propósito, com manchas e trilhas gastas. A padronagem é para incomodar.
function annoyingCarpet() {
  const S = 128, { c, g } = mkCanvas(S, S), T = 32;
  const PAL = [[104, 40, 18], [226, 122, 22], [236, 198, 62], [30, 128, 112]];
  paint(g, S, S, (x, y) => {
    const tx = Math.floor(x / T), ty = Math.floor(y / T), odd = (tx + ty) % 2;
    const u = (x % T) - T / 2 + 0.5, v = (y % T) - T / 2 + 0.5;
    const d = odd ? Math.abs(u) + Math.abs(v) : Math.max(Math.abs(u), Math.abs(v)) * 1.35; // losango num ladrilho, quadrado no vizinho
    let k = (Math.floor(d / 3.2) + (odd ? 1 : 0) + tx) % 4;
    if (Math.abs(((x + y * 2) % 16) - 8) < 1.2) k = (k + 2) % 4;                              // zigue-zague atravessando tudo
    const col = PAL[k], fuzz = 0.8 + hash(x, y, 5) * 0.32;
    const stain = 1 - k01((fbm(x / 34, y / 34, 77, 3) - 0.6) * 4) * 0.45;
    return [col[0] * fuzz * stain, col[1] * fuzz * stain, col[2] * fuzz * stain];
  });
  return tex(c, { repeat: [3.4, 4], pixel: true });
}
function fuseTexture() {
  const W = 128, H = 176, { c, g } = mkCanvas(W, H);
  paint(g, W, H, (x, y) => { const v = 0.5 + fbm(x / 30, y / 30, 5, 4) * 0.5, rust = k01((fbm(x / 14, y / 14, 61, 4) - 0.55) * 6); return [78 * v + rust * 70, 84 * v + rust * 10, 80 * v - rust * 20]; });
  g.fillStyle = '#f2b94c'; g.fillRect(34, 12, 60, 22); g.fillStyle = '#0b0f0c'; g.font = `700 13px ${UI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PERIGO', 64, 24);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const x = 16 + k * 25, y = 46 + r * 40, on = hash(r, k, 12) > 0.4; g.fillStyle = '#0a0d0b'; g.fillRect(x, y, 20, 32); g.fillStyle = on ? '#d8d2b8' : '#5a3a34'; g.fillRect(x + 5, on ? y + 4 : y + 16, 10, 12); g.fillStyle = on ? '#6fe89a' : '#ee3a30'; g.fillRect(x + 8, y + 28, 4, 3); }
  return canvasTex(c);
}
function crtTexture() {
  const { c, g } = mkCanvas(256, 192);
  const t = canvasTex(c, false);
  t.userData.draw = ({ name, logo, patrimonio }) => {
    g.fillStyle = '#04130a'; g.fillRect(0, 0, 256, 192);
    drawLogo(g, logo, 88, 14, 80, { ink: '#9dffb8', accent: '#f2b94c', bg: '#04130a' });
    g.fillStyle = '#9dffb8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 26; g.font = `700 ${size}px ${UI}`; while (g.measureText(name).width > 236 && size > 11) { size -= 1; g.font = `700 ${size}px ${UI}`; }
    g.fillText(name, 128, 120);
    g.fillStyle = '#f2b94c'; g.font = `700 17px ${UI}`; g.fillText(`$ ${Math.round(patrimonio).toLocaleString('pt-BR')}`, 128, 150);
    g.fillStyle = 'rgba(157,255,184,0.5)'; g.font = `700 10px ${UI}`; g.fillText('PATRIMONIO', 128, 170);
    for (let y = 0; y < 192; y += 3) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, y, 256, 1); }
    t.needsUpdate = true;
  };
  return t;
}
function boxFaceTexture() {
  const S = 128, { c, g } = mkCanvas(S, S);
  paint(g, S, S, (x, y) => { const v = 0.75 + fbm(x / 26, y / 26, 14, 3) * 0.35; return [164 * v, 128 * v, 84 * v]; });
  g.fillStyle = '#0a0806'; g.beginPath(); g.ellipse(40, 56, 11, 14, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(88, 56, 11, 14, 0, 0, 7); g.fill();
  g.strokeStyle = '#0a0806'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(40, 96); g.quadraticCurveTo(64, 108, 90, 92); g.stroke();
  g.fillStyle = 'rgba(120,10,6,0.6)'; g.fillRect(38, 70, 4, 26);
  return canvasTex(c);
}
// trituradora: frente da cabeça (adesivo de perigo, marca e o soquete da luz), vidro da janela do cesto e o papel picado
function shredderFaceTexture() {
  const W = 256, H = 64, { c, g } = mkCanvas(W, H);
  paint(g, W, H, (x, y) => { const v = 0.8 + fbm(x / 18, y / 18, 44, 3) * 0.4; return [30 * v, 33 * v, 36 * v]; });
  g.fillStyle = '#e2b232'; g.fillRect(8, 9, 46, 46); g.strokeStyle = '#14110c'; g.lineWidth = 3; g.strokeRect(11, 12, 40, 40);
  g.fillStyle = '#14110c'; g.beginPath(); g.moveTo(31, 17); g.lineTo(47, 47); g.lineTo(15, 47); g.closePath(); g.fill();
  g.fillStyle = '#e2b232'; g.fillRect(29, 27, 4, 11); g.fillRect(29, 41, 4, 4);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#a3a9ad'; g.font = `700 21px ${UI}`; g.fillText('PICOTA 900', 136, 26);
  g.fillStyle = '#6c7276'; g.font = `700 10px ${UI}`; g.fillText('CORTE EM TIRAS', 136, 46);
  g.fillStyle = '#08090a'; g.beginPath(); g.arc(228, 30, 11, 0, 7); g.fill(); g.strokeStyle = '#5a5f63'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#6c7276'; g.font = `700 8px ${UI}`; g.fillText('LIGA', 228, 54);
  g.strokeStyle = 'rgba(190,190,180,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(70, 52); g.lineTo(98, 47); g.moveTo(178, 12); g.lineTo(196, 18); g.stroke();
  return canvasTex(c);
}
function shredBodyTexture() {
  // plástico cinza de escritório: manchas, encardido de chute perto do chão e riscos
  const S = 128, { c, g } = mkCanvas(S, S);
  paint(g, S, S, (x, y) => {
    const v = 0.86 + fbm(x / 30, y / 30, 19, 3) * 0.2 - k01((fbm(x / 9, y / 9, 23, 3) - 0.62) * 5) * 0.22 - k01((y - 96) / 32) * fbm(x / 6, y / 4, 29, 2) * 0.4;
    return [142 * v, 147 * v, 144 * v];
  });
  g.strokeStyle = 'rgba(40,40,36,0.35)'; g.lineWidth = 1; g.beginPath();
  for (let i = 0; i < 7; i++) { const x = hash(i, 1, 57) * S, y = hash(i, 2, 57) * S; g.moveTo(x, y); g.lineTo(x + 6 + hash(i, 3, 57) * 14, y + (hash(i, 4, 57) - 0.5) * 6); }
  g.stroke();
  return canvasTex(c);
}
function shredGlassTexture() {
  const W = 128, H = 168, { c, g } = mkCanvas(W, H);
  g.fillStyle = 'rgba(150,190,180,0.08)'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.13)'; // um reflexo só, fraco, no canto
  g.beginPath(); g.moveTo(14, 0); g.lineTo(30, 0); g.lineTo(0, 44); g.lineTo(0, 21); g.fill();
  // escala de enchimento na borda e o limite de "cheio"
  g.fillStyle = 'rgba(232,230,218,0.6)'; for (let y = 34; y < H - 6; y += 14) g.fillRect(W - 15, y, (y - 34) % 28 ? 6 : 11, 2);
  g.fillStyle = 'rgba(226,58,44,0.9)'; for (let x = 4; x < W - 8; x += 10) g.fillRect(x, 20, 6, 2);
  g.font = `700 11px ${UI}`; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText('CHEIO', W - 5, 17);
  return canvasTex(c);
}
function shredPileTexture() {
  const S = 128, { c, g } = mkCanvas(S, S);
  g.fillStyle = '#4a4438'; g.fillRect(0, 0, S, S);
  const PAPER = ['#d9d3b8', '#e8e4d6', '#cfc8ac', '#bdb69c', '#e2dcc0', '#a9b8c0', '#d6b0a2', '#ece2ae'];
  for (let i = 0; i < 420; i++) {
    const x = hash(i, 1, 81) * S, y = hash(i, 2, 81) * S, len = 12 + hash(i, 5, 81) * 32;
    const a = (hash(i, 3, 81) - 0.5) * 1.3 + (hash(i, 4, 81) > 0.6 ? Math.PI / 2 : 0);
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(-len / 2 + 1, 1, len, 4);
    g.fillStyle = PAPER[Math.floor(hash(i, 6, 81) * PAPER.length)]; g.fillRect(-len / 2, -2, len, 4);
    if (hash(i, 7, 81) > 0.55) { g.fillStyle = 'rgba(30,30,40,0.55)'; g.fillRect(-len / 2 + 2, -0.5, len * (0.3 + hash(i, 8, 81) * 0.4), 1); }
    g.restore();
  }
  return canvasTex(c);
}

// encaixa um modelo: escala pela altura (ou largura), centra e apoia no chão. Só para malhas sem esqueleto.
function fit(o, { h, w } = {}) {
  let b = new THREE.Box3().setFromObject(o), s = b.getSize(V(0, 0, 0));
  o.scale.multiplyScalar(h ? h / s.y : w / Math.max(s.x, s.z));
  b = new THREE.Box3().setFromObject(o);
  o.position.set(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  o.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  const g = new THREE.Group(); g.add(o);
  return g;
}
const eyes = (scene, x, y, z, color = 0xff3a20, gap = 0.09) => {
  const g = new THREE.Group(), m = B(color, { transparent: true, opacity: 0, fog: false });
  g.add(at(plane(0.035, 0.02, m), -gap / 2, 0, 0), at(plane(0.035, 0.02, m), gap / 2, 0, 0)); at(g, x, y, z); scene.add(g);
  return { g, m, seed: hash(Math.round(x * 10), Math.round(y * 10), 3) * 40 };
};

export function buildLobby() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030504);
  scene.fog = new THREE.FogExp2(0x050806, 0.045);
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 60);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0x9fbfa8, 0x1a130c, 0.62));
  { const fill = new THREE.PointLight(0xbfd8c8, 16, 14, 1.4); fill.position.set(0, 2.9, 0.5); scene.add(fill); }
  const flick = [], spots = [], pulses = [];
  const add = (o) => { scene.add(o); return o; };

  // ───── casca da sala ─────
  const wallMap = GR.wallGrimy(), wallMat = M(0x9a9482, { map: wallMap });
  const floor = plane(HALF * 2, FRONT - BACK + 4, M(0xc4bca8, { map: annoyingCarpet() })); floor.rotation.x = -Math.PI / 2; at(floor, 0, 0, (FRONT + BACK) / 2 + 2); floor.receiveShadow = true; add(floor);
  const ceilMat = M(0x77786c, { map: GR.ceilingGrimy() });
  const ceil = plane(HALF * 2, FRONT - BACK + 4, ceilMat); ceil.rotation.x = Math.PI / 2; at(ceil, 0, CEIL, (FRONT + BACK) / 2 + 2); add(ceil);
  const back = plane(HALF * 2, CEIL, wallMat); at(back, 0, CEIL / 2, BACK); back.receiveShadow = true; add(back);
  for (const sx of [-1, 1]) { const w = plane(FRONT - BACK + 4, CEIL, wallMat); w.rotation.y = -sx * Math.PI / 2; at(w, sx * HALF, CEIL / 2, (FRONT + BACK) / 2 + 2); w.receiveShadow = true; add(w); }
  // rodapé escuro e faixa de umidade subindo pela parede
  const dark = M(0x1a1712);
  add(at(box(HALF * 2, 0.16, 0.05, dark), 0, 0.08, BACK + 0.03));
  for (const sx of [-1, 1]) add(at(box(0.05, 0.16, FRONT - BACK, dark), sx * (HALF - 0.03), 0.08, (FRONT + BACK) / 2));
  {
    const { c, g } = mkCanvas(256, 64);
    paint(g, 256, 64, (x, y) => { const v = k01((fbm(x / 22, y / 30, 71, 4) - 0.3 - (1 - y / 64) * 0.5) * 3); return [14 + v * 26, 26 + v * 42, 12 + v * 16]; });
    const im = g.getImageData(0, 0, 256, 64); for (let i = 0; i < im.data.length; i += 4) { im.data[i + 3] = k01((im.data[i + 1] - 26) / 30) * 200; } g.putImageData(im, 0, 0);
    const mold = plane(HALF * 2, 1.3, new THREE.MeshLambertMaterial({ map: canvasTex(c), transparent: true, depthWrite: false })); at(mold, 0, 0.65, BACK + 0.012); add(mold);
  }
  // buracos no forro (placas faltando) com fios pendurados e olhos lá dentro
  const hole = B(0x010201), cable = M(0x0c0c0a);
  const HOLES = [[-2.6, -1.4, 1.2, 0.9], [3.9, -2.6, 0.9, 0.9], [0.9, 1.6, 1.2, 0.6]];
  const watchers = [];
  HOLES.forEach(([x, z, w, d], i) => {
    const h = plane(w, d, hole); h.rotation.x = Math.PI / 2; at(h, x, CEIL - 0.006, z); add(h);
    for (let k = 0; k < 3; k++) { const len = 0.5 + hash(i, k, 21) * 1.1, wire = cyl(0.012, 0.012, len, 5, cable); at(wire, x + (hash(i, k, 22) - 0.5) * w * 0.7, CEIL - len / 2, z + (hash(i, k, 23) - 0.5) * d * 0.7); wire.rotation.z = (hash(i, k, 24) - 0.5) * 0.3; add(wire); pulses.push({ o: wire, base: wire.rotation.z, sp: 0.6 + hash(i, k, 25), amp: 0.05 }); }
    watchers.push(eyes(scene, x + (hash(i, 1, 5) - 0.5) * w * 0.4, CEIL + 0.04, z, i === 1 ? 0xf2e36a : 0xff3a20));
    watchers[watchers.length - 1].g.rotation.x = Math.PI / 2 - 0.5;
  });
  // goteira: mancha no forro, poça no chão
  { const st = plane(1.3, 1.1, B(0x1c1a10, { transparent: true, opacity: 0.6 })); st.rotation.x = Math.PI / 2; at(st, -0.8, CEIL - 0.004, -2.4); add(st); const pd = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshStandardMaterial({ color: 0x0a0f0c, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85 })); pd.rotation.x = -Math.PI / 2; at(pd, -3.1, 0.006, -2.2); add(pd); }

  // ───── luz de teto: duas calhas fluorescentes, uma morrendo e outra caída de um lado ─────
  const tubes = [];
  [[-2.2, 0.6, 0, 0], [2.6, -0.6, 0.34, 1]].forEach(([x, z, tilt, i]) => {
    const g = fit(model('mounted_fluorescent_lights'), { w: 1.3 }), gh = new THREE.Box3().setFromObject(g).getSize(V(0, 0, 0));
    const holder = new THREE.Group(); holder.add(g); g.position.y = -gh.y; at(holder, x, CEIL - (tilt ? 0.2 : 0.0), z); holder.rotation.z = tilt; add(holder);
    const long = gh.x > gh.z, glow = at(box(long ? 1.18 : 0.1, 0.02, long ? 0.1 : 1.18, B(0xe8ffe8)), 0, -gh.y - 0.012, 0); holder.add(glow);
    const l = new THREE.PointLight(0xcfe8d8, 16, 11, 1.5); at(l, 0, -0.3, 0); holder.add(l);
    tubes.push({ glow, l });
    flick.push({ set: (k) => { l.intensity = (i ? 12 : 16) * k; glow.material.color.setScalar(0.25 + 0.75 * k); }, rate: i ? 1.3 : 0.5, seed: 30 + i, hard: !!i });
    if (tilt) pulses.push({ o: holder, base: tilt, sp: 0.5, amp: 0.025 });
  });

  // ───── áreas clicáveis ─────
  const hot = [];
  const hotspot = (id, label, sub, group, { hit, anchor, light, lit = 2.4 }) => {
    const [hw, hh, hd, hx = 0, hy = hh / 2, hz = 0] = hit;
    const h = at(box(hw, hh, hd, B(0xff00ff)), hx, hy, hz); h.layers.set(4); h.userData.hot = id; group.add(h);
    const mats = [];
    group.traverse((c) => { if (c.isMesh && c !== h && c.material?.emissive) { c.material = c.material.clone(); mats.push({ m: c.material, e: c.material.emissive.clone(), i: c.material.emissiveIntensity ?? 1 }); } });
    const a = new THREE.Object3D(); a.position.set(...anchor); group.add(a);
    hot.push({ id, label, sub, group, hit: h, anchor: a, light, base: light?.intensity ?? 0, lit, mats, k: 0 });
    add(group);
  };
  const spot = (color, intensity, x, y, z, tx, ty, tz, angle = 0.6, shadow = false) => {
    const l = new THREE.SpotLight(color, intensity, 9, angle, 0.7, 1.6); l.position.set(x, y, z); l.target.position.set(tx, ty, tz);
    if (shadow) { l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.002; l.shadow.camera.near = 0.5; l.shadow.camera.far = 9; }
    scene.add(l, l.target); spots.push(l); return l;
  };

  // 1) ARQUIVOS — decks e coleção (canto esquerdo do fundo)
  {
    const g = new THREE.Group(); at(g, -3.5, 0, BACK + 0.36);
    [-0.4, 0.4].forEach((x, i) => { const c = fit(model('drawer_cabinet'), { h: 1.32 + (i === 1 ? 0.06 : 0) }); at(c, x, 0, 0); c.rotation.y = (hash(i, 2, 61) - 0.5) * 0.08; g.add(c); });
    // gaveta aberta com fichas saindo, baralho e fichário em cima
    const backTex = cardBackTexture();
    const drawer = at(box(0.46, 0.2, 0.5, M(0x4a5148, { map: metalTexture(4) })), -0.4, 0.74, 0.34); g.add(drawer);
    for (let i = 0; i < 6; i++) { const cd = at(box(0.3, 0.42, 0.012, M(0xd9d3b8, { map: paperTexture(true, 3 + i) })), -0.4 + (hash(i, 1, 6) - 0.5) * 0.06, 0.9 + hash(i, 2, 6) * 0.05, 0.16 + i * 0.065); cd.rotation.x = -0.12 - hash(i, 3, 6) * 0.2; g.add(cd); }
    const deck = at(box(0.2, 0.09, 0.28, [M(0xe9ece4), M(0xe9ece4), M(0x9a9a9a, { map: backTex }), M(0xe9ece4), M(0xe9ece4), M(0xe9ece4)]), 0.52, 1.43, 0.02); deck.rotation.y = 0.4; g.add(deck);
    const nb = fit(model('binder_notebook'), { w: 0.34 }); at(nb, 0.2, 1.39, 0.04); nb.rotation.y = -0.3; g.add(nb);
    const l = spot(WARM, 46, -3.2, 3.1, -2.2, -3.5, 0.8, BACK + 0.3, 0.55, true);
    hotspot('deck', 'Arquivo', 'Decks e coleção', g, { hit: [1.75, 1.7, 0.9, 0, 0.85, 0.15], anchor: [0, 1.74, 0.3], light: l });
  }
  // prateleira de troféus em cima dos arquivos — conquistas
  {
    const g = new THREE.Group(); at(g, -3.5, 2.3, BACK + 0.2);
    g.add(box(1.8, 0.05, 0.34, M(0x3a2c1e, { map: woodTexture() })));
    for (const x of [-0.8, 0.8]) g.add(at(box(0.05, 0.26, 0.3, dark), x, -0.15, 0));
    const gold = new THREE.MeshStandardMaterial({ color: 0xb8923a, metalness: 0.85, roughness: 0.42, emissive: 0x2a1c04 }), tarn = new THREE.MeshStandardMaterial({ color: 0x5b6a52, metalness: 0.7, roughness: 0.6, emissive: 0x0a1408 });
    [-0.66, -0.33, 0, 0.33, 0.66].forEach((x, i) => {
      const t = new THREE.Group(), m = i % 2 ? tarn : gold, hgt = 0.2 + hash(i, 4, 8) * 0.16;
      t.add(at(box(0.14, 0.05, 0.14, dark), 0, 0.05, 0), at(cyl(0.02, 0.03, hgt * 0.5, 8, m), 0, 0.075 + hgt * 0.25, 0));
      const cup = new THREE.Mesh(new THREE.LatheGeometry([[0.02, 0], [0.07, 0.05], [0.085, 0.13], [0.075, 0.16]].map(([a, b]) => new THREE.Vector2(a, b)), 12), m); cup.material.side = THREE.DoubleSide; at(cup, 0, 0.075 + hgt * 0.5, 0); t.add(cup);
      at(t, x, 0, 0); if (i === 3) { t.rotation.z = 1.45; t.position.y = 0.1; } g.add(t);
    });
    const l = new THREE.PointLight(AMBER, 5, 3.4, 1.7); at(l, 0, 0.5, 0.8); g.add(l);
    hotspot('achievements', 'Troféus', 'Conquistas', g, { hit: [1.85, 0.75, 0.5, 0, 0.3, 0.05], anchor: [0, 0.72, 0.2], light: l, lit: 3.2 });
  }
  // 2) TRITURADORA — reciclar cartas repetidas. Trituradora de piso, uma peça só: a cabeça de corte fica em cima do
  // gabinete com rodinhas; as tiras caem no cesto de dentro e vão se empilhando, à vista pela frente de acrílico.
  let shredRig = null;
  {
    const g = new THREE.Group(); at(g, -2.1, 0, -1.05); g.rotation.y = 0.2;
    const body = M(0xffffff, { map: shredBodyTexture(), emissive: 0x000000 }), shell = M(0x1e2124, { emissive: 0x000000 }), rubber = M(0x0e0f10), liner = M(0x161817);
    const solid = (o) => { o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
    // rodinhas e rodapé: a máquina pisa no chão
    for (const [x, z] of [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]]) { const w = at(cyl(0.025, 0.025, 0.022, 10, rubber), x, 0.025, z); w.rotation.z = Math.PI / 2; g.add(w, at(box(0.032, 0.03, 0.03, rubber), x, 0.045, z)); }
    solid(at(box(0.5, 0.035, 0.4, rubber), 0, 0.0675, 0));
    // gabinete: laterais, fundo e a moldura da frente, vazada de verdade (dá para ver o cesto por dentro)
    const CY0 = 0.085, CY1 = 0.74, CW = 0.5, CD = 0.4, T = 0.02, cy = (CY0 + CY1) / 2, CH = CY1 - CY0;
    const WX = 0.195, WY0 = 0.16, WY1 = 0.7, fz = CD / 2 - T / 2;
    for (const sx of [-1, 1]) solid(at(box(T, CH, CD - T, body), sx * (CW / 2 - T / 2), cy, -T / 2));
    solid(at(box(CW - 2 * T, CH, T, body), 0, cy, -CD / 2 + T / 2));
    solid(at(box(CW, WY0 - CY0, T, body), 0, (CY0 + WY0) / 2, fz));
    solid(at(box(CW, CY1 - WY1, T, body), 0, (WY1 + CY1) / 2, fz));
    for (const sx of [-1, 1]) solid(at(box(CW / 2 - WX, WY1 - WY0, T, body), sx * (WX + CW / 2) / 2, (WY0 + WY1) / 2, fz));
    // frente de acrílico fumê com a escala de enchimento
    g.add(at(plane(WX * 2, WY1 - WY0, new THREE.MeshBasicMaterial({ map: shredGlassTexture(), transparent: true, depthWrite: false })), 0, (WY0 + WY1) / 2, CD / 2 - 0.004));
    // forro escuro por dentro, para o papel aparecer
    g.add(at(plane(CW - 2 * T, CH, liner), 0, cy, -CD / 2 + T + 0.001));
    for (const sx of [-1, 1]) { const p = at(plane(CD - 2 * T, CH, liner), sx * (CW / 2 - T - 0.001), cy, 0); p.rotation.y = -sx * Math.PI / 2; g.add(p); }
    // o cesto já está pela metade: monte de papel picado (altura guardada numa grade, para as tiras novas pousarem por cima)
    // o monte começa baixo (um quarto da janela): sobra altura para ver as tiras novas caindo pelo acrílico
    const IX = CW / 2 - T - 0.006, IZ = CD / 2 - T - 0.006, FLOOR = CY0 + 0.01, MAXF = 0.5, PX = 12, PZ = 8;
    const h0 = (x, z) => 0.27 + 0.04 * (1 - (x / IX) ** 2) * (1 - 0.5 * (z / IZ) ** 2) + (fbm(x * 30 + 5, z * 30, 7, 2) - 0.5) * 0.02;
    // a frente do monte fica um dedo atrás do acrílico: ali as tiras novas escorregam e ficam prensadas, à vista
    const GAP = 0.016, pileGeo = new THREE.BoxGeometry(IX * 2, 1, IZ * 2 - GAP, 12, 1, 8).translate(0, 0, -GAP / 2), pp = pileGeo.attributes.position;
    const tops = [];
    for (let k = 0; k < pp.count; k++) { if (pp.getY(k) > 0) tops.push(k); pp.setY(k, pp.getY(k) > 0 ? h0(pp.getX(k), pp.getZ(k)) - 0.004 : FLOOR); }
    pileGeo.computeVertexNormals();
    // o corpo do monte tem brilho próprio fraco: visto pelo acrílico, abaixo da superfície também é papel (sem isso ficava escuro como o vidro)
    const pileTex = shredPileTexture(), pile = new THREE.Mesh(pileGeo, M(0xb8b098, { map: pileTex, emissive: 0x4a4536, emissiveMap: pileTex }));
    pile.receiveShadow = true; pile.frustumCulled = false; g.add(pile);
    const PAPER = [0xe4dfcc, 0xd9d3b8, 0xc9c2a6, 0xeeeadf, 0xb9c4c6, 0xd9b4a6, 0xe6d9a0], NB = 150;
    const bits = new THREE.InstancedMesh(new THREE.BoxGeometry(0.013, 0.002, 1), M(0xffffff, { emissive: 0x000000 }), NB), d = new THREE.Object3D(), col = new THREE.Color();
    for (let i = 0; i < NB; i++) {
      const len = 0.05 + hash(i, 1, 77) * 0.09, yaw = hash(i, 2, 77) * Math.PI;
      const ex = Math.abs(Math.sin(yaw)) * len / 2 + 0.012, ez = Math.abs(Math.cos(yaw)) * len / 2 + 0.012;
      const x = (hash(i, 3, 77) * 2 - 1) * (IX - ex), z = -GAP / 2 + (hash(i, 4, 77) * 2 - 1) * (IZ - GAP / 2 - ez);
      d.position.set(x, h0(x, z) + 0.002 + hash(i, 5, 77) * 0.012, z); d.rotation.set((hash(i, 6, 77) - 0.5) * 0.6, yaw, (hash(i, 7, 77) - 0.5) * 0.5); d.scale.set(1, 1, len);
      d.updateMatrix(); bits.setMatrixAt(i, d.matrix); bits.setColorAt(i, col.setHex(PAPER[i % PAPER.length]).multiplyScalar(0.7 + hash(i, 8, 77) * 0.25));
    }
    bits.frustumCulled = false; bits.receiveShadow = true; g.add(bits);
    const pileH = new Float32Array(PX * PZ), cellOf = (x, z) => Math.min(PZ - 1, Math.max(0, Math.floor(((z + IZ) / (2 * IZ)) * PZ))) * PX + Math.min(PX - 1, Math.max(0, Math.floor(((x + IX) / (2 * IX)) * PX)));
    for (let j = 0; j < PZ; j++) for (let i = 0; i < PX; i++) pileH[j * PX + i] = h0(-IX + ((i + 0.5) * 2 * IX) / PX, -IZ + ((j + 0.5) * 2 * IZ) / PZ) - 0.001;
    // o que cai se espalha um pouco para as casas vizinhas (papel picado não faz pico); a superfície é a média das casas em volta,
    // a mesma usada para desenhar o monte e para pousar as tiras: nada fica boiando acima do papel
    const cell = (i, j) => pileH[Math.min(PZ - 1, Math.max(0, j)) * PX + Math.min(PX - 1, Math.max(0, i))];
    const pileAdd = (x, z, dh) => {
      const c = cellOf(x, z), i = c % PX, j = (c - i) / PX;
      for (const [di, dj, w] of [[0, 0, 1], [1, 0, 0.45], [-1, 0, 0.45], [0, 1, 0.45], [0, -1, 0.45]]) { const a = i + di, b = j + dj; if (a >= 0 && a < PX && b >= 0 && b < PZ) pileH[b * PX + a] = Math.min(MAXF, pileH[b * PX + a] + dh * w); }
    };
    const pileAt = (x, z) => {
      const fx = ((x + IX) / (2 * IX)) * PX - 0.5, fz = ((z + IZ) / (2 * IZ)) * PZ - 0.5, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
      return (cell(i, j) * (1 - u) + cell(i + 1, j) * u) * (1 - v) + (cell(i, j + 1) * (1 - u) + cell(i + 1, j + 1) * u) * v;
    };
    // o monte sobe junto com o que cai: a superfície de papel acompanha a grade e vai enterrando as tiras antigas
    const pileSync = () => {
      for (const k of tops) { const x = pp.getX(k), z = pp.getZ(k); pp.setY(k, Math.max(h0(x, z) - 0.004, pileAt(x, z) - 0.003)); }
      pp.needsUpdate = true; pileGeo.computeVertexNormals();
    };
    // cabeça de corte: casco escuro, tampa clara com a fenda, chave, luz e a etiqueta da frente
    const HY = CY1 + 0.09, head = at(new THREE.Group(), 0, HY, 0); g.add(head);
    const hs = rbox(0.56, 0.18, 0.46, 0.035, shell); hs.castShadow = true; hs.receiveShadow = true; head.add(hs);
    head.add(at(rbox(0.48, 0.008, 0.36, 0.003, M(0x50555a, { map: metalTexture(12), emissive: 0x000000 })), 0, 0.091, 0));
    // fenda um pouco à frente do centro: as tiras descem logo atrás do acrílico, onde dá para ver
    const SZ = 0.07;
    head.add(at(box(0.34, 0.004, 0.02, B(0x040404)), 0, 0.0955, SZ));
    for (const sz of [-1, 1]) head.add(at(box(0.36, 0.006, 0.01, M(0x2a2d30)), 0, 0.097, SZ + sz * 0.016));
    head.add(at(box(0.05, 0.012, 0.03, M(0x0f1012)), 0.17, 0.099, -0.12), at(box(0.018, 0.008, 0.026, M(0x7a2a20)), 0.185, 0.106, -0.12));
    head.add(at(plane(0.48, 0.12, M(0xffffff, { map: shredderFaceTexture(), emissive: 0x000000 })), 0, -0.005, 0.2305));
    // um único acento de cor, apagado: o friso âmbar do pé da cabeça (destaca a máquina de longe sem virar brinquedo)
    head.add(at(plane(0.5, 0.014, M(0xa8742c, { emissive: 0x000000 })), 0, -0.078, 0.2302));
    const led = at(box(0.026, 0.026, 0.008, B(0xee3a30)), 0.1875, -0.002, 0.233); head.add(led);
    const l = new THREE.PointLight(0xff7a4a, 3.2, 3, 1.7); at(l, 0.25, 1.3, 0.75); g.add(l);
    flick.push({ set: (k) => { if (!shredBusy && !shredHot) led.material.color.setRGB(0.93 * k, 0.23 * k, 0.19 * k); }, rate: 2.2, seed: 41, hard: true });
    // as peças paradas do gabinete com o mesmo material viram uma malha só (16 desenhos a menos por quadro)
    for (const mat of [body, rubber, liner]) { const list = g.children.filter((c) => c.isMesh && c.material === mat); if (list.length > 1) mergeMeshes(list); }
    shredRig = { g, head, headY: HY, led, light: l, slotY: HY + 0.0975, slotZ: SZ, slotX: 0, outY: CY1, IX, IZ, GAP, pileAt, pileAdd, pileSync, dirty: false, front: 0, pressed: [], last: null };
    hotspot('recycle', 'Trituradora', 'Reciclar repetidas', g, { hit: [0.62, 1.02, 0.56, 0, 0.51, 0.02], anchor: [0, 1.0, 0.1], light: l, lit: 1.8 });
    // o casco preto não acende com o mouse: só a luz da sala reforça, e a cabeça continua preta
    { const H = hot[hot.length - 1]; H.mats = H.mats.filter((x) => x.m !== hs.material); }
    // o fio vai pelo carpete até a tomada da parede do fundo
    g.updateMatrixWorld(true);
    const wp = (x, y, z) => g.localToWorld(V(x, y, z)), outlet = V(-2.5, 0.28, BACK);
    const cord = new THREE.CatmullRomCurve3([wp(0.12, 0.2, -CD / 2 - 0.004), wp(0.12, 0.05, -CD / 2 - 0.03), wp(0.1, 0.008, -CD / 2 - 0.14), V(-2.62, 0.008, -2.2), V(-2.34, 0.008, -3.1), V(-2.56, 0.008, -3.85), V(-2.5, 0.008, BACK + 0.12), V(-2.5, 0.1, BACK + 0.04), V(-2.5, 0.25, BACK + 0.04)]);
    add(new THREE.Mesh(new THREE.TubeGeometry(cord, 80, 0.007, 5, false), M(0x0b0b0a)));
    add(at(box(0.09, 0.13, 0.014, M(0xb3ac94)), outlet.x, outlet.y, BACK + 0.007), at(box(0.05, 0.06, 0.03, M(0x121212)), outlet.x, outlet.y - 0.015, BACK + 0.024));
  }
  // relógio andando para trás, acima da trituradora
  const clock = fit(model('wall_clock'), { h: 0.46 }); clock.children[0].position.y -= 0.23; at(clock, -2.02, 2.62, BACK + 0.05); add(clock);
  const clockHand = at(box(0.012, 0.17, 0.006, B(0xb81c14)), 0, 0, 0.06); clockHand.geometry.translate(0, 0.085, 0); clock.add(clockHand); void clockTexture;

  // 3) PORTA DUPLA — sala de reunião (duelo), no meio do fundo
  let doorLeaf, doorLeft, doorGlow, redBulb;
  {
    const g = new THREE.Group(); at(g, 0, 0, BACK);
    const wood = M(0x5a4636, { map: woodTexture(), emissive: 0x000000 }), frame = M(0x1c1814);
    g.add(at(box(2.56, 0.14, 0.2, frame), 0, 2.46, 0.04), at(box(0.14, 2.5, 0.2, frame), -1.21, 1.25, 0.04), at(box(0.14, 2.5, 0.2, frame), 1.21, 1.25, 0.04));
    g.add(at(plane(2.3, 2.4, B(0x010302)), 0, 1.2, 0.012)); // o escuro lá dentro
    const leaf = (sx) => {
      const p = new THREE.Group(); at(p, sx * 1.14, 0, 0.1);
      const d = at(box(1.1, 2.36, 0.06, wood), -sx * 0.56, 1.19, 0); d.castShadow = true; p.add(d);
      p.add(at(box(0.3, 0.5, 0.07, B(0x143a26)), -sx * 0.56, 1.72, 0)); // vidro aramado, verde por dentro
      p.add(at(box(0.05, 0.3, 0.1, M(0x8a8474)), -sx * 0.98, 1.12, 0.03));
      p.add(at(box(0.9, 0.3, 0.064, M(0x2a2622)), -sx * 0.56, 0.2, 0));
      return p;
    };
    doorLeft = leaf(-1); doorLeaf = leaf(1); doorLeaf.rotation.y = -0.5; g.add(doorLeft, doorLeaf);
    // luz verde vazando pela fresta + faixa no chão
    doorGlow = new THREE.PointLight(0x7dffa6, 14, 6.5, 1.6); at(doorGlow, 0.5, 1.1, -0.5); g.add(doorGlow);
    const wedge = plane(1.3, 3.2, new THREE.MeshBasicMaterial({ color: 0x3aa864, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false })); wedge.rotation.x = -Math.PI / 2; wedge.rotation.z = -0.22; at(wedge, 0.62, 0.012, 1.7); g.add(wedge);
    // placa e lâmpada vermelha de "em reunião"
    g.add(at(plane(1.7, 0.3, B(0xffffff, { map: signTexture('SALA DE REUNIAO', { font: `700 46px ${UI}` }) })), 0, 2.74, 0.06));
    redBulb = at(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), B(0xee3a30)), 1.06, 2.74, 0.12); g.add(redBulb);
    const rl = new THREE.PointLight(0xff3020, 3.5, 4.5, 1.8); at(rl, 1.06, 2.7, 0.5); g.add(rl);
    pulses.push({ fn: (t) => { const k = 0.55 + 0.45 * Math.sin(t * 2.4); redBulb.material.color.setRGB(0.93 * k + 0.07, 0.2 * k, 0.16 * k); rl.intensity = 3.5 * k * (1 + doorHot.k); } });
    hotspot('duel', 'Sala de reunião', 'Iniciar duelo', g, { hit: [2.6, 2.6, 0.5, 0, 1.3, 0.2], anchor: [0, 2.05, 0.4], light: doorGlow, lit: 2.2 });
  }
  const doorHot = hot[hot.length - 1];
  // 4) MURAL — metas do dia
  {
    const g = new THREE.Group(); at(g, 2.06, 1.62, BACK + 0.04);
    g.add(box(1.16, 0.92, 0.05, M(0x2a2018)));
    g.add(at(plane(1.06, 0.82, M(0xffffff, { map: corkTexture(), emissive: 0x000000 })), 0, 0, 0.03));
    const l = spot(WARM, 30, 2.06, 3.1, -3.0, 2.06, 1.6, BACK, 0.42);
    hotspot('missions', 'Mural', 'Metas do dia', g, { hit: [1.2, 1.0, 0.3, 0, 0, 0.1], anchor: [0, 0.6, 0.1], light: l, lit: 2.6 });
  }
  // 5) MÁQUINA DE VENDA — loja
  let vendFront;
  {
    const g = new THREE.Group(); at(g, 3.4, 0, BACK + 0.44);
    const body = rbox(1.08, 2.0, 0.8, 0.03, M(0x3a1512, { map: metalTexture(7), emissive: 0x000000 })); at(body, 0, 1.0, 0); body.castShadow = true; g.add(body);
    vendFront = at(plane(0.98, 1.84, B(0xffffff, { map: vendingTexture() })), 0, 1.02, 0.405); g.add(vendFront);
    g.add(at(plane(0.96, 0.16, B(0xffffff, { map: signTexture('BENEFICIOS', { w: 384, h: 64, font: `700 40px ${UI}`, fg: '#b8ffd0', bg: '#06120c' }) })), 0, 2.09, 0.2));
    g.add(at(box(1.0, 0.2, 0.42, M(0x2a100e)), 0, 2.09, 0));
    const l = new THREE.PointLight(SICK, 11, 5.5, 1.6); at(l, 0, 1.2, 1.1); g.add(l);
    flick.push({ set: (k) => { vendFront.material.color.setScalar(0.5 + 0.5 * k); }, rate: 0.8, seed: 52 });
    hotspot('shop', 'Máquina de benefícios', 'Loja', g, { hit: [1.15, 2.2, 0.9, 0, 1.1, 0.1], anchor: [0, 2.32, 0.3], light: l, lit: 2.0 });
    // pôster torto ao lado e retrato do Fundador com os olhos riscados
    const p1 = at(plane(0.5, 0.69, M(0xffffff, { map: posterTexture([['SORRIA', 22, 700], ['ESTAO', 15, 700], ['OLHANDO', 15, 700], ['', 8], ['RH', 26]], '#c9c2a0') })), 1.4, 1.75, -0.4 + 0.02); p1.rotation.z = 0.06; g.add(p1);
  }
  {
    const port = at(plane(0.56, 0.7, M(0xffffff, { map: portraitTexture() })), 2.06, 2.72, BACK + 0.03); port.rotation.z = -0.05; add(port);
    add(at(box(0.64, 0.78, 0.03, M(0x2a2018)), 2.06, 2.72, BACK + 0.012));
    const scratch = B(0x6a0c08); for (const sx of [-1, 1]) { const s = at(box(0.2, 0.018, 0.004, scratch), 2.06 + sx * 0.02, 2.82, BACK + 0.04); s.rotation.z = sx * 0.5 - 0.05; add(s); }
  }
  // 6) QUADRO DE LUZ — configurações (canto direito do fundo)
  const sparks = [];
  {
    const g = new THREE.Group(); at(g, -2.02, 1.55, BACK + 0.07);
    g.add(box(0.62, 0.86, 0.14, M(0x3a4038, { map: metalTexture(2), emissive: 0x000000 })));
    const doorP = new THREE.Group(); at(doorP, -0.31, 0, 0.08); const dd = at(box(0.6, 0.84, 0.02, M(0x4a5148, { map: metalTexture(5), emissive: 0x000000 })), 0.3, 0, 0); doorP.add(dd); doorP.rotation.y = -1.9; g.add(doorP);
    g.add(at(plane(0.54, 0.76, B(0xdddddd, { map: fuseTexture() })), 0, 0, 0.075));
    for (let i = 0; i < 4; i++) { const len = 0.5 + hash(i, 1, 33) * 0.9, w = at(cyl(0.012, 0.012, len, 5, M([0x0c0c0a, 0x6a1410, 0x1c2a4a, 0x8a7a1a][i])), -0.2 + i * 0.13, -0.43 - len / 2, 0.02); w.rotation.z = (hash(i, 2, 33) - 0.5) * 0.25; g.add(w); }
    const l = new THREE.PointLight(0xffe08a, 4.5, 3.4, 1.7); at(l, 0, 0.1, 0.8); g.add(l);
    for (let i = 0; i < 6; i++) { const s = at(plane(0.03, 0.03, B(0xfff0b0, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })), 0, 0, 0); g.add(s); sparks.push({ s, t: 9, v: V(0, 0, 0) }); }
    hotspot('settings', 'Quadro de luz', 'Configurações', g, { hit: [0.85, 1.7, 0.5, 0, -0.3, 0.1], anchor: [0, 0.6, 0.2], light: l, lit: 3.4 });
  }

  // 7) ESTAGIÁRIO — treino (lateral esquerda, mais perto da câmera)
  let intern = null;
  {
    const g = new THREE.Group(); at(g, -3.75, 0, -1.0); g.rotation.y = 0.5;
    const desk = fit(model('metal_office_desk'), { w: 1.45 }); g.add(desk);
    const deskTop = new THREE.Box3().setFromObject(desk).max.y;
    g.add(at(plane(0.7, 0.2, B(0xffffff, { map: signTexture('ESTAGIARIO', { w: 384, h: 96, font: `700 50px ${UI}`, bg: '#d9d3b8', fg: '#17110c', border: false }) })), 0, deskTop * 0.55, 0.38));
    const st = fit(model('vintage_stapler'), { w: 0.2 }); at(st, 0.42, deskTop, 0.05); st.rotation.y = 0.5; g.add(st);
    const pile = at(box(0.2, 0.05, 0.28, [M(0xe9ece4), M(0xe9ece4), M(0x9a9a9a, { map: cardBackTexture() }), M(0xe9ece4), M(0xe9ece4), M(0xe9ece4)]), -0.35, deskTop + 0.025, 0.08); pile.rotation.y = -0.2; g.add(pile);
    // o estagiário: terno, caixa de papelão na cabeça
    const man = model('business_man'); man.scale.setScalar(0.9); at(man, 0.05, 0, -0.62);
    const pal = mkCanvas(32, 4); ['#3b3f3a', '#c9c4ae', '#7a1410', '#b7a98c', '#1c1a18', '#1c1a18', '#382d28', '#2a1f1a'].forEach((col, k) => { pal.g.fillStyle = col; pal.g.fillRect(k * 4, 0, 4, 4); });
    const palTex = new THREE.CanvasTexture(pal.c); palTex.colorSpace = THREE.SRGBColorSpace; palTex.magFilter = palTex.minFilter = THREE.NearestFilter; palTex.flipY = false;
    let headBone = null;
    man.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.frustumCulled = false; c.material.map = palTex; c.material.roughness = 0.9; c.material.metalness = 0; } if (c.isBone && /head/i.test(c.name) && !headBone) headBone = c; });
    g.add(man);
    const mixer = new THREE.AnimationMixer(man), list = clips('business_man'), idle = list.find((c) => c.name.endsWith('|Idle_Neutral')) ?? list.find((c) => c.name.endsWith('|Idle'));
    if (idle) mixer.clipAction(idle).play();
    const cardboard = M(0xa8855a, { map: boxFaceTexture(), emissive: 0x000000 }), plain = M(0x9a7850);
    const headBox = box(0.36, 0.36, 0.36, [plain, plain, plain, plain, cardboard, plain]);
    at(headBox, 0.05, 1.62, -0.62); g.add(headBox);
    const lampHolder = new THREE.Group(); at(lampHolder, 0, CEIL, -0.1); g.add(lampHolder);
    const lampM = fit(model('hanging_industrial_lamp'), { h: 1.1 }); lampM.children[0].position.y -= 1.1; lampHolder.add(lampM);
    const l = new THREE.SpotLight(WARM, 60, 7, 0.66, 0.8, 1.5); at(l, 0, -1.05, 0); l.target.position.set(0, -4, 0.1); l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.002; lampHolder.add(l, l.target); spots.push(l);
    pulses.push({ o: lampHolder, base: 0, sp: 0.9, amp: 0.05 });
    intern = { mixer, headBox, headBone, g, spot: l };
    hotspot('training', 'Estagiário', 'Treino sem valer', g, { hit: [1.6, 1.95, 1.3, 0, 0.98, -0.25], anchor: [0, 2.06, -0.4], light: l, lit: 1.9 });
  }
  // 8) RECEPÇÃO — perfil da empresa (lateral direita)
  const crt = crtTexture();
  {
    const g = new THREE.Group(); at(g, 3.8, 0, -1.0); g.rotation.y = -0.5;
    const counter = at(box(1.7, 1.02, 0.62, M(0x4a3626, { map: woodTexture(), emissive: 0x000000 })), 0, 0.51, 0); counter.castShadow = true; counter.receiveShadow = true; g.add(counter);
    g.add(at(box(1.8, 0.06, 0.74, M(0x211a14)), 0, 1.05, 0));
    g.add(at(plane(1.1, 0.2, B(0xffffff, { map: signTexture('RECEPCAO', { w: 384, h: 72, font: `700 44px ${UI}` }) })), 0, 0.62, 0.315));
    const tv = fit(model('Television_01'), { h: 0.52 }); at(tv, -0.42, 1.08, 0.02); tv.rotation.y = 0.18; g.add(tv);
    const tb = new THREE.Box3().setFromObject(tv), ts = tb.getSize(V(0, 0, 0));
    const screen = plane(0.4, 0.3, B(0xffffff, { map: crt })); at(screen, -0.455, 1.08 + 0.29, 0.02 + ts.z * 0.36); screen.rotation.y = 0.18; g.add(screen);
    const bell = at(cyl(0.05, 0.07, 0.05, 12, new THREE.MeshStandardMaterial({ color: 0xa8a290, metalness: 0.8, roughness: 0.35, emissive: 0x000000 })), 0.45, 1.105, 0.16); g.add(bell);
    const plant = new THREE.Group(); plant.add(at(cyl(0.11, 0.08, 0.18, 10, M(0x6a3a24)), 0, 0.09, 0)); for (let i = 0; i < 6; i++) { const s = at(box(0.012, 0.3 + hash(i, 1, 9) * 0.2, 0.012, M(0x2a2412)), 0, 0.3, 0); s.geometry.translate(0, 0.15, 0); s.position.y = 0.16; s.rotation.set((hash(i, 2, 9) - 0.5) * 1.3, i, (hash(i, 3, 9) - 0.5) * 1.3); plant.add(s); } at(plant, 0.64, 1.08, -0.05); g.add(plant);
    const chair = fit(model('modern_arm_chair_01'), { h: 0.92 }); at(chair, 0.2, 0, -0.75); chair.rotation.y = 2.6; g.add(chair);
    const l = new THREE.PointLight(0x9dffb8, 6, 4.4, 1.7); at(l, -0.4, 1.5, 0.8); g.add(l);
    flick.push({ set: (k) => { screen.material.color.setScalar(0.6 + 0.4 * k); }, rate: 1.1, seed: 63 });
    spot(WARM, 38, 3.2, 3.15, 0.4, 3.8, 0.9, -1.0, 0.55, true);
    hotspot('profile', 'Recepção', 'Perfil da empresa', g, { hit: [1.9, 1.75, 1.0, 0, 0.88, 0], anchor: [0, 1.8, 0.1], light: l, lit: 2.6 });
  }
  // papéis pelo chão, caixas empilhadas, extintor no canto: o escritório foi largado às pressas
  for (let i = 0; i < 16; i++) { const p = plane(0.21, 0.3, M(0xcfc8ac, { map: paperTexture(true, 20 + (i % 4)) })); p.rotation.x = -Math.PI / 2; p.rotation.z = hash(i, 1, 70) * 6; at(p, (hash(i, 2, 70) - 0.5) * 9.5, 0.012 + i * 0.0006, -3.6 + hash(i, 3, 70) * 5.2); p.receiveShadow = true; add(p); }
  { const card = M(0x8a6c46); [[-5.55, 0.2, 1.1, 0.5, 0.4, 0.5, 0.2], [-5.5, 0.57, 1.05, 0.42, 0.34, 0.42, -0.3], [5.5, 0.22, 1.6, 0.55, 0.44, 0.5, 0.4]].forEach(([x, y, z, w, h, d, r]) => { const b = at(box(w, h, d, card), x, y, z); b.rotation.y = r; b.castShadow = true; add(b); }); }
  // "DIAS SEM ACIDENTE: 0" na parede esquerda
  { const s = plane(1.1, 0.62, M(0xffffff, { map: posterTexture([['DIAS SEM', 15, 700], ['ACIDENTE', 15, 700], ['', 6], ['0', 58]], '#d6cfae') })); s.rotation.y = Math.PI / 2; at(s, -HALF + 0.02, 2.2, -2.9); add(s); }

  const dust = dustMotes(180, [-4.4, 2.3, -0.9], [1.0, 0.86, 0.6]); dust.scale.set(1.6, 1, 1.4); at(dust, 0, 0, -1); add(dust);
  scene.traverse((o) => { if (o.isLight) o.layers.enableAll(); });

  // ───── câmera, mouse e animação ─────
  const ray = new THREE.Raycaster(); ray.layers.set(4);
  const hits = hot.map((h) => h.hit), ndc = new THREE.Vector2(), tmp = V(0, 0, 0);
  const base = V(0, 2.45, 6.2), look = V(0, 1.15, BACK);
  let hoverId = null, enterK = 1, aspect = 16 / 9;
  // foco da câmera (Reciclar, proposta "sala"): viaja até a trituradora e deixa a esquerda da tela para o painel 2D
  let focusId = null, focusK = 0, shredBusy = 0, shredHot = 0;
  // caminhada até a sala de reunião (início do duelo): tempos em segundos
  // a câmera anda com velocidade própria: devagar até a porta abrir e, do meio do caminho em diante, acelera e treme (sonho)
  const WALK = { door: 0.3, fov: 42, fovDream: 62 };
  let walk = null, walkFade = 0;
  const walkFx = { aberr: 0, wobble: 0 };
  const FOCUS = { recycle: { pos: V(-1.15, 1.55, 1.0), look: V(-2.8, 0.5, -1.05) } };
  let free = 0.5; // onde a máquina fica na tela no foco (horizontal, -1 a 1)
  const curPos = V(0, 0, 0), curLook = V(0, 0, 0), falling = [], landed = [];
  // tira deitada: comprimento no eixo x do cesto, face para cima
  const lieQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, 1), V(1, 0, 0), V(0, 1, 0))), yawQ = new THREE.Quaternion(), UP = V(0, 1, 0);
  const flipQ = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI); // vira a tira sobre o comprimento: mostra o verso
  const clampTo = (v, a, b) => Math.max(a, Math.min(b, v));
  const dropStrip = (m) => {
    const R = shredRig, i = landed.indexOf(m), j = R.pressed.indexOf(m); if (i >= 0) landed.splice(i, 1); if (j >= 0) R.pressed.splice(j, 1);
    R.g.remove(m); m.geometry.dispose(); if ((m.material.userData.left -= m.userData.n ?? 1) <= 0) { m.material.map?.dispose(); m.material.dispose(); }
  };
  // desempenho: cada tira é um objeto desenhado à parte. Quando as tiras deitadas de uma carta pousam, viram um objeto só
  // (as 9 de uma carta custavam 9 desenhos por quadro; juntas, custam 1). As do acrílico continuam soltas (no máximo 10).
  const mergeStrips = (list) => {
    for (const m of list) { const i = landed.indexOf(m); if (i >= 0) landed.splice(i, 1); }
    const one = mergeMeshes(list); one.userData.n = list.length; landed.push(one);
  };
  const api = {
    scene, camera, dust, hot,
    resize(a) {
      aspect = a; camera.aspect = a;
      // afasta a câmera em telas estreitas para a parede do fundo caber inteira
      // e a fileira da frente (estagiário e recepção, em z = -1) caber nos cantos
      const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * a;
      base.z = Math.max(BACK + 6.2 / th, -1 + 4.75 / th, 5.4); camera.updateProjectionMatrix();
    },
    /** id da área sob o cursor (x, y de 0 a 1 na tela) ou null */
    pick(mx, my) {
      ndc.set(mx * 2 - 1, -(my * 2 - 1)); ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(hits, false)[0];
      return h ? h.object.userData.hot : null;
    },
    setHover(id) { hoverId = id; },
    /** retrato 3×4 do estagiário, renderizado do modelo real da sala (para a ficha dele) */
    internPortrait(renderer, w = 368, h = 448) {
      if (!intern || !renderer) return null;
      if (this._portrait) return this._portrait;
      const rt = new THREE.WebGLRenderTarget(w, h), cam = new THREE.PerspectiveCamera(15, w / h, 0.1, 50), c = new THREE.Vector3();
      intern.headBox.getWorldPosition(c);
      cam.position.set(c.x + 0.55, c.y + 0.1, c.z + 3.2); cam.lookAt(c.x, c.y - 0.16, c.z);
      // luz de estúdio neutra: a luminária quente da sala (e o reforço de quando o mouse está em cima) saturava o papelão
      const spotI = intern.spot.intensity, tilt = intern.headBox.rotation.z; intern.spot.intensity = 0; intern.headBox.rotation.z = 0;
      const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(c.x + 2, c.y + 2, c.z + 4); key.target.position.copy(c);
      const fill = new THREE.AmbientLight(0xffffff, 0.55); scene.add(key, key.target, fill);
      const fog = scene.fog, bg = scene.background, target = renderer.getRenderTarget(); scene.fog = null; scene.background = new THREE.Color(0x6f7a72);
      const vis = hits.map((o) => o.visible); hits.forEach((o) => { o.visible = false; });
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
      const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
      renderer.setRenderTarget(target); scene.fog = fog; scene.background = bg; scene.remove(key, key.target, fill); hits.forEach((o, i) => { o.visible = vis[i]; }); rt.dispose();
      intern.spot.intensity = spotI; intern.headBox.rotation.z = tilt;
      // o alvo guarda luz linear: converte para sRGB (sem isso a foto sai escura e com a cor estourada)
      const enc = (v) => { v = Math.min(1, Math.max(0, v)); return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); };
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'), im = g.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((h - 1 - y) * w + x) * 4, o = (y * w + x) * 4; im.data[o] = enc(px[i] / 255); im.data[o + 1] = enc(px[i + 1] / 255); im.data[o + 2] = enc(px[i + 2] / 255); im.data[o + 3] = 255; }
      g.putImageData(im, 0, 0); return (this._portrait = cv.toDataURL('image/jpeg', 0.92));
    },

    get hover() { return hoverId; },
    /** posição na tela (0..1) da etiqueta de cada área */
    anchors() {
      return hot.map((h) => { h.anchor.getWorldPosition(tmp); tmp.project(camera); return { id: h.id, label: h.label, sub: h.sub, x: tmp.x * 0.5 + 0.5, y: -tmp.y * 0.5 + 0.5, on: tmp.z < 1 }; });
    },
    /** câmera viaja até uma área (null volta para a sala) */
    focus(id) {
      focusId = FOCUS[id] ? id : null;
      // na primeira ida até a trituradora, os materiais da carta e das tiras já ficam prontos (o navegador monta o shader
      // agora, com a câmera andando, e não na hora em que a carta é solta: era o tranco da primeira trituração)
      if (id === 'recycle' && shredRig && this.renderer && !shredRig.warm) {
        const r = this.renderer, t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
        r.localClippingEnabled = true;
        // desenhados de verdade por dois quadros, dentro do gabinete e cortados pelo plano (não aparecem); depois se escondem
        // e ficam guardados, para o programa do shader não ser descartado
        const pl = new THREE.Plane(V(0, -1, 0), 0), warm = [new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), cardMat(t, pl)), new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), stripMat(t, pl))];
        warm.forEach((m) => { m.position.set(0, 0.3, 0); shredRig.g.add(m); });
        shredRig.warm = { list: warm, frames: 3 };
      }
    },
    focusSpots: FOCUS,
    /** onde a máquina deve ficar na tela, na horizontal (-1 a 1): o painel calcula o meio do espaço livre à direita dele */
    focusFree(x) { free = clampTo(x, -0.9, 0.9); },
    /** a trituradora acende quando uma carta arrastada passa por cima */
    setShredHot(b) { shredHot = b ? 1 : 0; },
    /** ponto da fenda da trituradora na tela (pixels do navegador) */
    shredderScreen() {
      if (!shredRig) return null;
      const R = shredRig, W = window.innerWidth, H = window.innerHeight, scr = (x, y) => { const v = V(x, y, R.slotZ); R.g.localToWorld(v); v.project(camera); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; };
      // também o tamanho, na tela, da carta 3D que vai entrar: a carta arrastada encolhe até ele antes da troca
      const [x, y] = scr(R.slotX, R.slotY), [x0] = scr(R.slotX - CARD_W / 2, R.slotY), [x1] = scr(R.slotX + CARD_W / 2, R.slotY), [, yt] = scr(R.slotX, R.slotY + 0.02 + CARD_W * CARD_R);
      return { x, y, w: Math.abs(x1 - x0), h: Math.abs(y - yt) };
    },
    /** a carta desce pela fenda da cabeça; por baixo da lâmina saem as tiras, dentro do cesto, que caem na pilha e ficam lá */
    async shredIn(url, { feed = 1100 } = {}) {
      if (!shredRig) return;
      const r = this.renderer; if (r) r.localClippingEnabled = true;
      const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; });
      if (!img) return; // imagem que não carregou: a carta é gravada do mesmo jeito, só sem a animação
      const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
      const R = shredRig, g = R.g, Wc = CARD_W, Hc = Wc * CARD_R, N = 9, { slotX, slotY, slotZ, outY } = R;
      const wy = (y) => { const v = V(0, y, slotZ); g.localToWorld(v); return v.y; };
      const above = new THREE.Plane(V(0, 1, 0), -wy(slotY)), below = new THREE.Plane(V(0, -1, 0), wy(outY));
      const card = at(new THREE.Mesh(new THREE.PlaneGeometry(Wc, Hc), cardMat(tex, above)), slotX, slotY + Hc / 2 + 0.02, slotZ);
      g.add(card);
      const mat = stripMat(tex, below); mat.userData.left = N; mat.userData.cut = N;
      const strips = [];
      for (let i = 0; i < N; i++) {
        const geo = new THREE.PlaneGeometry(Wc / N - 0.002, Hc, 1, 12), uv = geo.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / N);
        const m = at(new THREE.Mesh(geo, mat), slotX - Wc / 2 + (i + 0.5) * (Wc / N), outY + Hc / 2, slotZ); m.userData.L = Hc; g.add(m); strips.push(m);
      }
      // as tiras da carta anterior perdem o brilho e afundam no monte; as desta ficam vivas até a próxima
      if (R.last) R.last.emissive.setHex(0x080808);
      R.last = mat; shredBusy++;
      const t0 = performance.now(), top = card.position.y, dist = Hc + 0.015;
      await new Promise((ok) => {
        const go = () => {
          const k = Math.min(1, (performance.now() - t0) / feed), e = k < 0.15 ? k * 0.4 : 0.06 + ((k - 0.15) / 0.85) * 0.94;
          card.position.y = top - dist * e; strips.forEach((m, i) => { m.position.y = outY + Hc / 2 - dist * e - (i % 3) * 0.004; m.rotation.z = Math.sin(e * 7 + i * 1.7) * 0.05 * e; });
          if (k < 1) requestAnimationFrame(go); else ok();
        };
        requestAnimationFrame(go);
      });
      g.remove(card); card.geometry.dispose(); card.material.dispose(); shredBusy--;
      // as tiras se soltam da lâmina e caem em pé, balançando, até a ponta tocar a pilha
      for (const m of strips) falling.push({ m, v: V((Math.random() - 0.5) * 0.3, -0.15 - Math.random() * 0.25, (Math.random() - 0.5) * 0.3), spin: (Math.random() - 0.5) * 6, fr: 5 + Math.random() * 4, ph: Math.random() * 6, st: -1 });
    },
    /** entrada: a câmera vem da porta da rua */
    enter() { enterK = 0; walk = null; walkFade = 0; doorLeft.rotation.y = 0; walkFx.aberr = walkFx.wobble = 0; if (camera.fov !== WALK.fov) { camera.fov = WALK.fov; camera.updateProjectionMatrix(); } },
    /**
     * Ir para o duelo sem corte: a câmera anda até o centro da porta da sala de reunião, a folha da esquerda abre e, do meio do
     * caminho em diante, a câmera acelera, treme de leve, a lente abre e a imagem ondula, como quem entra num sonho; aí some
     * no escuro do vão. done() é chamado quando a tela está toda escura (o duelo começa no escuro e continua dali).
     */
    walkIn(done, onDoor) {
      const d = new THREE.Vector3(); camera.getWorldDirection(d);
      walk = { t: 0, u: 0, done, onDoor, p: [camera.position.clone(), V(0, 1.85, BACK + 3.4), V(0, 1.62, BACK + 1.05), V(0, 1.52, BACK + 0.15)],
        l: [camera.position.clone().addScaledVector(d, 6), V(0, 1.5, BACK), V(0, 1.46, BACK - 2), V(0, 1.45, BACK - 4)] };
      walk.cp = new THREE.CatmullRomCurve3(walk.p); walk.cl = new THREE.CatmullRomCurve3(walk.l); hoverId = null;
    },
    get fade() { return walkFade; },
    /** efeitos de tela da caminhada (o main.js soma aos de base): aberração de cor e ondulação da imagem */
    walkFx,
    setCompany(info) { crt.userData.draw(info); },
    update(dt, t, mouse) {
      enterK = Math.min(1, enterK + dt * 0.7);
      const e = 1 - Math.pow(1 - enterK, 3), mx = (mouse?.x ?? 0.5) - 0.5, my = (mouse?.y ?? 0.5) - 0.5;
      focusK += ((focusId ? 1 : 0) - focusK) * Math.min(1, dt * 2.6);
      const f = focusK * focusK * (3 - 2 * focusK), par = 1 - f; // no foco, o mouse quase não mexe a câmera
      curPos.set(base.x + mx * 0.5 * par + Math.sin(t * 0.4) * 0.02, base.y - my * 0.16 * par + Math.sin(t * 0.7) * 0.012 - (1 - e) * 0.15, base.z + (1 - e) * 3.2);
      curLook.set(look.x + mx * 0.7 * par, look.y - my * 0.35 * par, look.z);
      if (f > 0.0005) { const F = FOCUS[focusId ?? 'recycle']; curPos.lerp(F.pos, f); curLook.lerp(F.look, f); }
      camera.position.copy(curPos); camera.lookAt(curLook);
      if (f > 0.0005 && shredRig) {
        // a máquina fica no meio da área livre, em qualquer proporção de tela: gira a câmera no eixo vertical até ela chegar lá
        const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
        for (let it = 0; it < 2; it++) { // duas passadas: a câmera está inclinada para baixo, a primeira chega perto e a segunda acerta
          camera.updateMatrixWorld(); tmp.set(0, 0.46, 0); shredRig.g.localToWorld(tmp); tmp.applyMatrix4(camera.matrixWorldInverse);
          camera.rotateOnWorldAxis(UP, (Math.atan(free * th) - Math.atan2(tmp.x, -tmp.z)) * f);
        }
      }
      if (walk) {
        // a caminhada até a porta: começa parada e chega ao vão ainda andando (a entrada no duelo continua o movimento)
        // velocidade (fração do caminho por segundo): sai do parado e anda; do meio em diante dispara
        walk.t += dt; const st = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
        walk.u = Math.min(1, walk.u + dt * (0.42 * st(0, 0.55, walk.t) + 1.7 * st(0.85, 1.5, walk.t)));
        const u = walk.u, dream = st(0.38, 0.95, u);
        walk.cp.getPoint(u, camera.position); walk.cl.getPoint(u, tmp);
        camera.position.y += Math.sin(walk.t * 9) * 0.012 * (1 - dream); // passo, de leve
        // o tremor leve do sonho: cresce do meio para o fim, rápido e pequeno
        const sh = 0.022 * dream; camera.position.x += (Math.sin(walk.t * 37) + Math.sin(walk.t * 23.7)) * sh; camera.position.y += (Math.sin(walk.t * 31.3) + Math.sin(walk.t * 19.1)) * sh * 0.8;
        camera.lookAt(tmp); camera.rotateZ(Math.sin(walk.t * 5.3) * 0.035 * dream);
        const fov = WALK.fov + (WALK.fovDream - WALK.fov) * dream; if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
        walkFx.aberr = 0.014 * dream; walkFx.wobble = 0.006 * dream;
        // a folha da esquerda abre para fora (para o lado da câmera) e mostra o escuro lá dentro; a câmera passa pelo meio
        const o = Math.min(1, Math.max(0, (walk.t - WALK.door) / 0.8)); doorLeft.rotation.y = -1.4 * (1 - Math.pow(1 - o, 3));
        if (walk.t >= WALK.door && !walk.creak) { walk.creak = true; walk.onDoor?.(); }
        walkFade = st(0.8, 1, u);
        if (u >= 1 && walk.done) { walk.hold = (walk.hold ?? 0) + dt; if (walk.hold > 0.08) { const cb = walk.done; walk.done = null; cb(); } }
      }
      // no foco a luminária do estagiário baixa: a mesa dele, ao lado, não disputa a atenção com a trituradora
      if (intern) intern.spot.userData.f = 1 - 0.6 * f;
      if (shredRig) {
        const R = shredRig;
        if (R.warm?.frames && --R.warm.frames === 0) R.warm.list.forEach((m) => { m.visible = false; });
        // motor ligado: a cabeça trepida; a luz pisca; a lâmpada da sala acende quando uma carta passa por cima
        R.head.position.x = shredBusy ? Math.sin(t * 90) * 0.003 : 0; R.head.position.y = R.headY + (shredBusy ? Math.sin(t * 130) * 0.002 : 0);
        if (shredBusy) R.led.material.color.setRGB(Math.sin(t * 30) > 0 ? 1 : 0.3, 0.12, 0.1);
        else if (shredHot) R.led.material.color.setRGB(0.95, 0.72, 0.3);
        R.light.userData.f = (shredHot ? 1.3 : 1) * (shredBusy ? 1.2 : 1);
        // tiras dentro do cesto (coordenadas da máquina): caem em pé, tombam ao tocar a pilha e ficam deitadas por cima dela
        for (const s of falling) {
          const m = s.m, p = m.position, L = m.userData.L;
          if (s.st < 0) {
            s.v.y = Math.max(-1.1, s.v.y - 5 * dt); p.addScaledVector(s.v, dt);
            if (Math.abs(p.x) > R.IX - 0.015) { p.x = Math.sign(p.x) * (R.IX - 0.015); s.v.x *= -0.4; }
            if (Math.abs(p.z) > R.IZ - 0.015) { p.z = Math.sign(p.z) * (R.IZ - 0.015); s.v.z *= -0.4; }
            m.rotation.z = Math.sin(t * s.fr + s.ph) * 0.16; m.rotation.y += s.spin * dt;
            if (p.y - L / 2 <= R.pileAt(p.x, p.z)) {
              const pos = m.geometry.attributes.position, tw = (Math.random() - 0.5) * 0.01;
              s.q0 = m.quaternion.clone(); s.p0 = p.clone(); s.st = 0;
              if (Math.random() < 0.3) {
                // escorrega para a frente e fica prensada no acrílico, em pé e torta, com a face para fora
                const lean = (Math.random() - 0.5) * 0.55, ex = Math.abs(Math.sin(lean)) * (L / 2) + 0.022;
                const fx = clampTo(p.x + (Math.random() - 0.5) * 0.22, -R.IX + ex, R.IX - ex), fz = R.IZ - 0.003 - (R.front++ % 13) * 0.0008;
                const fy = R.pileAt(fx, R.IZ - R.GAP - 0.01) - L * (0.12 + Math.random() * 0.22) * Math.cos(lean);
                // papel picado não fica reto: a tira ondula de lado ao longo do comprimento, como uma fita amassada
                const wa = 0.006 + Math.random() * 0.008, wf = 1.2 + Math.random() * 1.3, wp = Math.random() * 6;
                for (let k = 0; k < pos.count; k++) { const y = pos.getY(k) / L + 0.5; pos.setX(k, pos.getX(k) + wa * Math.sin(y * wf * Math.PI * 2 + wp)); pos.setZ(k, -0.006 * Math.sin(Math.PI * y) + tw * pos.getX(k) * 30 * (y - 0.5)); }
                s.q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, Math.random() < 0.5 ? Math.PI : 0, lean)); s.p1 = V(fx, fy, fz); s.u = [Math.sin(lean) * L * 0.3, 0]; s.front = true;
              } else {
                // tomba e deita por cima do monte, arqueada como papel picado de verdade
                const a = (Math.random() - 0.5) * 1.8, ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a)), ex = (L / 2) * ca + 0.014 * sa, ez = (L / 2) * sa + 0.014 * ca;
                const fx = clampTo(p.x + (Math.random() < 0.5 ? -1 : 1) * L * 0.3 * ca, -R.IX + ex, R.IX - ex), fz = clampTo(p.z + (Math.random() - 0.5) * 0.16, -R.IZ + ez, R.IZ - R.GAP - ez);
                const ux = Math.cos(a) * L * 0.42, uz = -Math.sin(a) * L * 0.42;
                const fy = Math.max(R.pileAt(fx, fz), R.pileAt(fx + ux, fz + uz), R.pileAt(fx - ux, fz - uz)) + 0.002, amp = 0.006 + Math.random() * 0.02;
                for (let k = 0; k < pos.count; k++) { const y = pos.getY(k) / L + 0.5; pos.setZ(k, amp * Math.sin(Math.PI * y) + tw * pos.getX(k) * 60 * (y - 0.5)); }
                s.q1 = yawQ.setFromAxisAngle(UP, a + (Math.random() < 0.5 ? Math.PI : 0)).clone().multiply(lieQ); if (Math.random() < 0.45) s.q1.multiply(flipQ); s.p1 = V(fx, fy, fz); s.u = [ux, uz];
              }
              pos.needsUpdate = true; m.geometry.computeVertexNormals();
            }
          } else {
            s.st = Math.min(1, s.st + dt / 0.3); const k = 1 - (1 - s.st) * (1 - s.st);
            m.quaternion.slerpQuaternions(s.q0, s.q1, k); p.lerpVectors(s.p0, s.p1, k);
            if (s.st >= 1) {
              s.done = true; landed.push(m);
              for (const f of [-1, -0.33, 0.33, 1]) R.pileAdd(s.p1.x + s.u[0] * f, s.p1.z + s.u[1] * f, 0.004);
              R.dirty = true;
              // no acrílico ficam só as últimas tiras (umas três cartas): a janela mostra o que acabou de cair, sem virar chuvisco
              if (s.front) { R.pressed.push(m); if (R.pressed.length > 10) dropStrip(R.pressed.shift()); }
              const ud = m.material.userData; if (!s.front) (ud.lying ??= []).push(m);
              if ((ud.down = (ud.down ?? 0) + 1) === ud.cut && ud.lying?.length) { mergeStrips(ud.lying); ud.lying = null; }
            }
          }
        }
        for (let i = falling.length - 1; i >= 0; i--) if (falling[i].done) falling.splice(i, 1);
        if (R.dirty) { R.dirty = false; R.pileSync(); }
        // o que fica no cesto: as cartas mais antigas já estão enterradas no monte; acima disso, saem
        while (landed.length > 40) dropStrip(landed[0]);
      }
      for (const f of flick) {
        const s = Math.sin(t * f.rate + f.seed * 13.1) + Math.sin(t * f.rate * 2.7 + f.seed * 3.3);
        f.set(s > 1.5 ? (hash(Math.floor(t * 18), f.seed, 1) > 0.45 ? (f.hard ? 0.04 : 0.35) : 1) : 0.93 + 0.07 * Math.sin(t * 23 + f.seed));
      }
      for (const p of pulses) { if (p.fn) p.fn(t); else p.o.rotation.z = p.base + Math.sin(t * p.sp + p.base * 9) * p.amp; }
      for (const h of hot) {
        h.k += ((h.id === hoverId ? 1 : 0) - h.k) * Math.min(1, dt * 9);
        if (h.light && h.id !== 'duel') h.light.intensity = h.base * (1 + (h.lit - 1) * h.k) * (h.light.userData.f ?? 1);
        for (const m of h.mats) { m.m.emissive.copy(m.e).addScalar(0.07 * h.k); }
      }
      // porta: abre mais e a luz verde cresce quando o mouse chega perto
      doorLeaf.rotation.y += ((-0.5 - doorHot.k * 0.55) - doorLeaf.rotation.y) * Math.min(1, dt * 5);
      doorGlow.intensity = doorHot.base * (0.85 + 0.15 * Math.sin(t * 1.7)) * (1 + doorHot.k * 1.4);
      watchers.forEach((w, i) => { const ph = (t * 0.23 + w.seed) % 9; w.m.opacity = ph < 2.2 ? k01(Math.sin((ph / 2.2) * Math.PI) * 1.6) * (Math.sin(t * 9 + i) > -0.96 ? 1 : 0) : 0; });
      clockHand.rotation.z = t * 0.9; // ponteiro vermelho girando ao contrário
      // faíscas do quadro de luz
      for (const sp of sparks) {
        sp.t += dt;
        if (sp.t > 1 && Math.random() < dt * 0.5) { sp.t = 0; sp.s.position.set((Math.random() - 0.5) * 0.3, -0.42, 0.1); sp.v.set((Math.random() - 0.5) * 0.8, 0.5 + Math.random() * 0.6, 0.3 + Math.random() * 0.5); }
        if (sp.t < 0.6) { sp.v.y -= dt * 4; sp.s.position.addScaledVector(sp.v, dt); sp.s.material.opacity = 1 - sp.t / 0.6; } else sp.s.material.opacity = 0;
      }
      intern?.mixer.update(dt);
      if (intern) {
        if (intern.headBone) { intern.headBone.getWorldPosition(tmp); intern.g.worldToLocal(tmp); intern.headBox.position.set(tmp.x, tmp.y + 0.1, tmp.z + 0.03); }
        intern.tilt = (intern.tilt ?? 0) + (((hoverId === 'training' ? 0.3 : 0) + Math.sin(t * 0.6) * 0.06) - (intern.tilt ?? 0)) * Math.min(1, dt * 4);
        intern.headBox.rotation.z = intern.tilt;
      }
    },
  };
  api.resize(aspect);
  return api;
}
