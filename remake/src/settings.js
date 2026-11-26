// Preferências salvas no navegador (mesma chave do protótipo original, para preservar nome/volume).
const KEY = 'bcbc:settings';
const DEFAULTS = {
  companyName: null, music: 0.8, sfx: 0.9, muted: false,
  soundtrack: 'original',   // 'original' (trilhas do autor) | 'procedural'
  sfxSource: 'files',       // 'files' (efeitos gravados do autor + gerados onde não há arquivo) | 'procedural'
  uiSize: 1,               // tamanho da interface: 0.85 | 1 | 1.15
  pixel: 3,                 // 1 = nítida, 2 = retrô, 3 = pixelada (cartas sempre nítidas)
  hudCurve: null,           // interface curva: null = automático (ligada em telas 4K) | true | false
  shake: true, speed: 1, seenHelp: false, tipsOff: false, tips: {},
};
let cache = null;
const listeners = new Set();
export const settings = {
  get() {
    if (cache) return cache;
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { raw = {}; }
    cache = { ...DEFAULTS, ...raw };
    return cache;
  },
  set(patch) {
    cache = { ...this.get(), ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* modo privado */ }
    listeners.forEach((fn) => fn(cache));
    return cache;
  },
  onChange(fn) { listeners.add(fn); },
};
export const MAX_NAME = 22;
export function cleanName(s) { return s.replace(/\s+/g, ' ').trim().toUpperCase().slice(0, MAX_NAME); }
