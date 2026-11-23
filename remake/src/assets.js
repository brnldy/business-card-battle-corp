// Resolve assets: embutidos (build de arquivo único) ou por URL relativa (modo dev).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CARDS } from './cards.js';

export function asset(key) { return window.__ASSETS__?.[key] ?? `${window.__ASSET_BASE__ ?? ''}assets/${key}`; }

const images = new Map(), models = new Map(), clipsByModel = new Map();
// animações que vêm no arquivo do modelo (ex.: Walk/Idle do business_man, usados pela fila do menu)
export function clips(name) { return clipsByModel.get(name) ?? []; }
export function img(key) { return images.get(key); }
// cópia independente de um modelo (materiais clonados para poder ajustar por instância)
export function model(name) {
  const src = models.get(name);
  if (!src) return new THREE.Group();
  const o = cloneSkinned(src);
  o.traverse((c) => { if (c.isMesh) { c.material = Array.isArray(c.material) ? c.material.map((m) => m.clone()) : c.material.clone(); c.castShadow = true; } });
  return o;
}

function loadImage(key) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { images.set(key, im); res(im); };
    im.onerror = () => rej(new Error(`Falha ao carregar ${key}`));
    im.src = asset(key);
  });
}
// Modelos de terceiros, todos CC0: Poly Haven (cenário) e Quaternius (corpo do rival).
export const MODEL_LIST = ['business_man', 'Television_01', 'hanging_industrial_lamp', 'mounted_fluorescent_lights', 'drawer_cabinet', 'wall_clock', 'vintage_stapler', 'binder_notebook', 'metal_office_desk', 'metal_trash_can', 'modern_arm_chair_01'];

export async function loadAll(onProgress) {
  const keys = [
    ...CARDS.map((c) => c.art), 'cards/back.png',
    'img/mini-template.png', 'img/mini-template-effect.png', 'img/START_MENU.png',
  ];
  let done = 0;
  const total = keys.length + MODEL_LIST.length, tick = () => onProgress?.(++done / total);
  const fonts = ['400 1em "Apple Garamond"', '700 1em "Apple Garamond"', 'italic 400 1em "Apple Garamond"', '400 1em Helvena'];
  const fontWait = Promise.race([
    Promise.all(fonts.map((f) => document.fonts.load(f))).catch(() => {}),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  const loader = new GLTFLoader();
  await Promise.all([
    fontWait,
    ...keys.map((k) => loadImage(k).then(tick)),
    ...MODEL_LIST.map((m) => loader.loadAsync(asset(`models/${m}.glb`)).then((g) => { models.set(m, g.scene); clipsByModel.set(m, g.animations ?? []); tick(); }).catch((e) => { console.warn('modelo não carregou', m, e); tick(); })),
  ]);
}
