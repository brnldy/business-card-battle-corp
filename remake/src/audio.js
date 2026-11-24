// Áudio (WebAudio): efeitos sintetizados, ambiente de escritório e as trilhas do autor,
// mais os efeitos gravados pelo autor (remake/assets/sfx): onde existe arquivo para o momento, toca o arquivo;
// onde não existe, toca o sintetizado.
import { settings } from './settings.js';
import { asset } from './assets.js';

let ctx = null, master, sfxBus, ambBus, reverb, noiseBuf, brownBuf;
let started = false, ambTimer = null, mode = 'menu';
let origEl = null;

const now = () => ctx.currentTime;
const rnd = (a, b) => a + Math.random() * (b - a);

function makeNoise(brown) {
  const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return b;
}
function makeImpulse(seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += ((Math.random() * 2 - 1) - lp) * (0.9 - t * 0.75); // escurece ao longo da cauda
      d[i] = lp * Math.pow(1 - t, decay) * (i < 400 ? i / 400 : 1);
    }
  }
  return b;
}

export function initAudio() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
  master.connect(comp).connect(ctx.destination);
  sfxBus = ctx.createGain(); ambBus = ctx.createGain();
  reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(2.8, 2.6);
  const revGain = ctx.createGain(); revGain.gain.value = 0.55;
  reverb.connect(revGain).connect(master);
  sfxBus.connect(master); ambBus.connect(master);
  noiseBuf = makeNoise(false); brownBuf = makeNoise(true);
  applyVolumes();
}
export function unlockAudio() {
  initAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (!started) { started = true; startAmbience(); loadFileSfx(); }
  syncOriginal();
}

// ───────── efeitos gravados pelo autor ─────────
// Ganho de cada arquivo para soar no nível dos efeitos sintetizados (medido em volume percebido, LUFS aproximado):
// efeitos ~ -18 dB, cliques/teclas mais baixos (~ -24/-26 dB), vinhetas de fim ~ -16 dB. Ajuste aqui se algo destoar.
const FILE_SFX = {
  attack: { file: 'ATTACK_BASIC.mp3', gain: 0.54 },   // -12,6 dB
  summon: { file: 'SUMMON_CARD.mp3', gain: 3.3 },     // -28,4 dB
  effect: { file: 'EFFECT.mp3', gain: 4.6 },          // -31,2 dB
  trap: { file: 'TRAP.mp3', gain: 3.8 },              // -29,7 dB
  trapSet: { file: 'TRAP.mp3', gain: 2.6 },
  sacrifice: { file: 'SACRIFICE.mp3', gain: 3.2 },    // -28,2 dB
  draw: { file: 'CARD.mp3', gain: 4 },                // -43,2 dB (baixinho de propósito)
  // O arquivo cresce devagar por ~0,3 s antes do pico, e isso soava arrastado: começa já perto do pico e toca 25% mais rápido (~0,2 s).
  select: { file: 'CHOSING_CARD.mp3', gain: 4, from: 0.26, to: 0.47, rate: 1.25 }, // -37,5 dB
  start: { file: 'START_BUTTON.mp3', gain: 2.6 },     // -26,4 dB
  battle: { file: 'BATTLE_BUTTON.mp3', gain: 4.5 },   // -31 dB
  bell: { file: 'END_TURN_BUTTON.mp3', gain: 1.5 },   // -21,8 dB (encerrar turno)
  type: { file: 'TYPE_SOUND.mp3', gain: 2.2 },        // -33 dB
  win: { file: 'YOU_WIN.m4a', gain: 0.44 },           // -8,9 dB
  lose: { file: 'YOU_LOSE.m4a', gain: 0.5 },          // -10 dB
};
const fileBufs = new Map();
function loadFileSfx() {
  const files = [...new Set(Object.values(FILE_SFX).map((x) => x.file))];
  for (const f of files) {
    fetch(asset(`sfx/${f}`))
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => fileBufs.set(f, buf))
      .catch(() => { /* sem o arquivo, fica o som sintetizado */ });
  }
}
// from/to (s) recortam um trecho do arquivo; rate acelera. O recorte ganha 4 ms de entrada e 30 ms de saída para não estalar.
function playFile(name) {
  const spec = FILE_SFX[name];
  const buf = spec && fileBufs.get(spec.file);
  if (!buf) return false;
  const src = ctx.createBufferSource(), g = ctx.createGain(), t = now();
  src.buffer = buf;
  src.playbackRate.value = spec.rate || 1;
  const from = spec.from || 0, len = ((spec.to || buf.duration) - from) / (spec.rate || 1);
  if (spec.from || spec.to) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(spec.gain, t + 0.004);
    g.gain.setValueAtTime(spec.gain, t + Math.max(0.005, len - 0.03));
    g.gain.linearRampToValueAtTime(0, t + len);
  } else g.gain.value = spec.gain;
  src.connect(g).connect(sfxBus);
  src.start(t, from, spec.to ? spec.to - from : undefined);
  return true;
}
export function applyVolumes() {
  if (!ctx) return;
  const s = settings.get(), m = s.muted ? 0 : 1;
  master.gain.setTargetAtTime(m, now(), 0.05);
  sfxBus.gain.setTargetAtTime(s.sfx * 0.9, now(), 0.05);
  ambBus.gain.setTargetAtTime(s.music * 0.55 + 0.1 * s.sfx, now(), 0.3);
  syncOriginal();
}
function syncOriginal() {
  const s = settings.get();
  const want = started && !s.muted && s.music > 0;
  if (!want) { if (origEl) origEl.pause(); return; }
  const src = asset(mode === 'duel' ? 'music/BASE_SOUNDTRACK.mp3' : 'music/MENU_BG.m4a');
  if (!origEl) { origEl = new Audio(); origEl.loop = true; }
  if (origEl.dataset.k !== mode) { origEl.src = src; origEl.dataset.k = mode; }
  origEl.volume = Math.min(1, s.music * (mode === 'duel' ? 0.25 : 0.35));
  origEl.play().catch(() => {});
}
export function setMusicMode(m) { mode = m; if (ctx) syncOriginal(); }

// ───────── blocos de síntese ─────────
function env(g, t, a, peak, d, sustain = 0.0001) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
}
function tone({ f = 440, f2, type = 'sine', t = now(), a = 0.005, d = 0.2, vol = 0.3, bus = sfxBus, rev = 0, detune = 0 }) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + a + d);
  env(g, t, a, vol, d);
  o.connect(g).connect(bus);
  if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r).connect(reverb); }
  o.start(t); o.stop(t + a + d + 0.05);
  return g;
}
function noise({ t = now(), a = 0.003, d = 0.15, vol = 0.3, type = 'bandpass', f = 1200, f2, q = 1, bus = sfxBus, rev = 0, brown = false }) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = brown ? brownBuf : noiseBuf; s.loop = true;
  s.playbackRate.value = rnd(0.8, 1.25);
  fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(f2, 20), t + a + d);
  env(g, t, a, vol, d);
  s.connect(fl).connect(g).connect(bus);
  if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r).connect(reverb); }
  s.start(t, rnd(0, 1.5)); s.stop(t + a + d + 0.05);
}
function bell(f, t, vol = 0.2, d = 1.4, bus = sfxBus) {
  // parciais inarmônicos = metal (campainha de balcão, moeda, registradora)
  [[1, 1], [2.76, 0.55], [5.4, 0.3], [8.93, 0.16]].forEach(([m, v], i) => f * m < 15000 &&
    tone({ f: f * m, t, a: 0.002, d: d / (1 + i * 0.9), vol: vol * v, bus, rev: 0.5 }));
}

const SFX = {
  hover() { tone({ f: rnd(1900, 2100), type: 'square', d: 0.018, vol: 0.025 }); },
  select() { tone({ f: 1250, type: 'square', d: 0.03, vol: 0.06 }); tone({ f: 1870, type: 'square', t: now() + 0.03, d: 0.04, vol: 0.05 }); },
  cancel() { tone({ f: 620, f2: 310, type: 'square', d: 0.09, vol: 0.06 }); },
  // Interface do lobby e das janelas: "toc" abafado de pasta de papelão, curto e grave, com leve variação para não cansar.
  nav() { const p = rnd(0.94, 1.06); tone({ f: 330 * p, f2: 250 * p, d: 0.06, vol: 0.07 }); noise({ type: 'lowpass', f: 1500 * p, f2: 500, d: 0.035, vol: 0.05 }); },
  navBack() { const p = rnd(0.94, 1.06); tone({ f: 260 * p, f2: 190 * p, d: 0.06, vol: 0.055 }); noise({ type: 'lowpass', f: 1100 * p, f2: 400, d: 0.03, vol: 0.04 }); },
  deny() { tone({ f: 140, type: 'sawtooth', d: 0.11, vol: 0.12 }); tone({ f: 140, type: 'sawtooth', t: now() + 0.14, d: 0.13, vol: 0.12 }); },
  card() { noise({ f: 3200, f2: 900, q: 0.8, d: 0.11, vol: 0.2 }); },
  draw() { noise({ f: 1800, f2: 4200, q: 0.7, d: 0.12, vol: 0.17 }); tone({ f: 190, f2: 120, d: 0.05, vol: 0.05 }); },
  place() { tone({ f: 115, f2: 48, d: 0.16, vol: 0.5 }); noise({ type: 'lowpass', f: 900, d: 0.06, vol: 0.3 }); },
  summon() {
    tone({ f: 92, f2: 36, d: 0.34, vol: 0.7, rev: 0.4 }); noise({ type: 'lowpass', f: 1400, f2: 200, d: 0.2, vol: 0.4, rev: 0.3 });
    tone({ f: 330, f2: 660, type: 'triangle', t: now() + 0.05, d: 0.25, vol: 0.06, rev: 0.6 });
  },
  effect() {
    [0, 0.06, 0.12, 0.18].forEach((dt, i) => tone({ f: 520 * Math.pow(1.335, i), type: 'triangle', t: now() + dt, d: 0.3, vol: 0.09, rev: 0.7 }));
    noise({ type: 'highpass', f: 5000, d: 0.5, vol: 0.05, rev: 0.5 });
  },
  trapSet() { tone({ f: 70, d: 0.2, vol: 0.4 }); noise({ f: 2500, q: 6, d: 0.05, vol: 0.2, t: now() + 0.08 }); tone({ f: 2400, type: 'square', t: now() + 0.08, d: 0.03, vol: 0.05 }); },
  trap() {
    for (let i = 0; i < 4; i++) tone({ f: i % 2 ? 660 : 880, type: 'square', t: now() + i * 0.11, d: 0.1, vol: 0.11, rev: 0.3 });
    noise({ type: 'lowpass', f: 500, d: 0.5, vol: 0.35, rev: 0.5 }); tone({ f: 55, d: 0.6, vol: 0.5 });
  },
  whoosh() { noise({ f: 500, f2: 3600, q: 1.4, a: 0.12, d: 0.12, vol: 0.3 }); },
  attack() { SFX.whoosh(); }, // investida do ataque (o autor tem arquivo próprio: ATTACK_BASIC)
  impact() {
    tone({ f: 150, f2: 32, d: 0.3, vol: 0.9, rev: 0.3 }); noise({ type: 'lowpass', f: 3500, f2: 300, d: 0.22, vol: 0.55, rev: 0.4 });
    tone({ f: 61, type: 'sawtooth', d: 0.18, vol: 0.2 });
  },
  clash() { SFX.impact(); bell(1480, now(), 0.07, 0.5); noise({ f: 6000, q: 3, d: 0.08, vol: 0.2 }); },
  destroy() {
    noise({ type: 'bandpass', f: 4200, f2: 500, q: 0.6, d: 0.55, vol: 0.32, rev: 0.3 });
    for (let i = 0; i < 7; i++) noise({ type: 'highpass', f: rnd(3000, 7000), t: now() + rnd(0, 0.45), d: 0.02, vol: 0.16 });
    tone({ f: 220, f2: 40, type: 'sawtooth', d: 0.5, vol: 0.09, rev: 0.4 });
  },
  sacrifice() {
    tone({ f: 60, f2: 240, type: 'sawtooth', a: 0.35, d: 0.1, vol: 0.13, rev: 0.6 });
    noise({ type: 'bandpass', f: 300, f2: 5000, q: 2, a: 0.35, d: 0.12, vol: 0.2, rev: 0.5 });
    tone({ f: 48, t: now() + 0.38, d: 0.4, vol: 0.6 });
  },
  damage() {
    // registradora ao contrário: sininhos descendo + moedas caindo
    [0, 0.07, 0.14].forEach((dt, i) => bell(1900 / (1 + i * 0.33), now() + dt, 0.1, 0.45));
    for (let i = 0; i < 6; i++) tone({ f: rnd(2600, 4800), type: 'triangle', t: now() + 0.1 + i * rnd(0.03, 0.06), d: 0.05, vol: 0.05 });
    tone({ f: 82, f2: 41, type: 'sawtooth', d: 0.35, vol: 0.22 });
  },
  heal() { [0, 0.08, 0.16, 0.24].forEach((dt, i) => bell(880 * Math.pow(1.26, i), now() + dt, 0.08, 0.7)); },
  coin() { for (let i = 0; i < 7; i++) bell(3100 + i * 40, now() + i * 0.085, 0.045, 0.2); },
  coinLand() { bell(2500, now(), 0.14, 0.9); noise({ f: 5000, q: 2, d: 0.05, vol: 0.2 }); tone({ f: 130, f2: 70, d: 0.08, vol: 0.3 }); },
  bell() { bell(2090, now(), 0.3, 2.2); noise({ type: 'highpass', f: 6000, d: 0.02, vol: 0.2 }); },
  battle() {
    [55, 82.4, 110].forEach((f) => { const g = tone({ f, type: 'sawtooth', a: 0.02, d: 0.9, vol: 0.16, rev: 0.5, detune: rnd(-8, 8) }); g; });
    noise({ type: 'lowpass', f: 300, d: 0.7, vol: 0.5, rev: 0.5, brown: true }); tone({ f: 41, d: 0.8, vol: 0.6 });
  },
  turn() { bell(1318, now(), 0.1, 1.6); bell(988, now() + 0.22, 0.1, 2.0); },
  turnFoe() { bell(740, now(), 0.08, 1.4); bell(554, now() + 0.22, 0.09, 1.9); },
  type() { noise({ f: rnd(2400, 3400), q: 4, d: 0.025, vol: 0.2 }); tone({ f: rnd(140, 180), d: 0.03, vol: 0.12 }); },
  start() {
    tone({ f: 49, d: 1.6, vol: 0.6, rev: 0.6 }); noise({ type: 'lowpass', f: 200, f2: 2400, a: 0.8, d: 0.5, vol: 0.25, rev: 0.6 });
    [0.0, 0.5, 1.0].forEach((dt, i) => bell(660 * (1 + i * 0.25), now() + dt, 0.07, 1.6));
  },
  frost() {
    for (let i = 0; i < 9; i++) tone({ f: rnd(3200, 7200), type: 'sine', t: now() + i * 0.045, d: 0.25, vol: 0.035, rev: 0.8 });
    noise({ type: 'highpass', f: 7000, a: 0.2, d: 0.6, vol: 0.07 });
  },
  lock() { noise({ f: 1800, q: 8, d: 0.04, vol: 0.3 }); tone({ f: 300, f2: 150, type: 'square', d: 0.07, vol: 0.1 }); noise({ f: 900, q: 6, d: 0.06, vol: 0.3, t: now() + 0.09 }); },
  buff() { tone({ f: 440, f2: 880, type: 'triangle', d: 0.22, vol: 0.1, rev: 0.4 }); },
  debuff() { tone({ f: 440, f2: 196, type: 'triangle', d: 0.26, vol: 0.1, rev: 0.4 }); },
  glitch() { for (let i = 0; i < 6; i++) tone({ f: rnd(90, 2400), type: 'square', t: now() + i * 0.028, d: 0.025, vol: 0.06 }); noise({ f: 2000, q: 0.5, d: 0.16, vol: 0.12 }); },
  flicker() { noise({ type: 'bandpass', f: 120, q: 9, d: 0.09, vol: 0.5 }); noise({ type: 'highpass', f: 5000, d: 0.03, vol: 0.08 }); },
  win() {
    [0, 0.16, 0.32, 0.6].forEach((dt, i) => bell([784, 988, 1175, 1568][i], now() + dt, 0.13, 2.4));
    for (let i = 0; i < 16; i++) tone({ f: rnd(2600, 5200), type: 'triangle', t: now() + 0.5 + i * 0.05, d: 0.06, vol: 0.05 });
    tone({ f: 98, d: 2.2, vol: 0.4, rev: 0.6 });
  },
  lose() {
    [0, 0.5, 1.0, 1.6].forEach((dt, i) => tone({ f: [220, 207.6, 174.6, 110][i], type: 'sawtooth', t: now() + dt, a: 0.05, d: 1.2, vol: 0.12, rev: 0.7 }));
    tone({ f: 55, f2: 27, d: 3, vol: 0.6, rev: 0.5 }); noise({ type: 'lowpass', f: 400, f2: 60, d: 3, vol: 0.4, brown: true });
  },
};
const lastPlayed = {};
export function sfx(name, delay = 0) {
  if (!ctx || !started || settings.get().muted) return;
  const fn = SFX[name];
  if (!fn) return;
  const run = () => {
    const t = performance.now();
    if (lastPlayed[name] && t - lastPlayed[name] < 35) return; // evita empilhar o mesmo som
    lastPlayed[name] = t;
    try { if (!playFile(name)) fn(); } catch (e) { /* áudio nunca deve quebrar o jogo */ }
  };
  delay > 0 ? setTimeout(run, delay) : run();
}

// ───────── ambiente: zumbido de lâmpada fluorescente, ar-condicionado, sala ─────────
function startAmbience() {
  const hum = ctx.createGain(); hum.gain.value = 0.05;
  [[60, 'sawtooth', 0.5], [120, 'sine', 0.8], [180, 'sine', 0.25]].forEach(([f, type, v]) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v;
    o.connect(g).connect(hum); o.start();
  });
  const humLP = ctx.createBiquadFilter(); humLP.type = 'lowpass'; humLP.frequency.value = 420;
  hum.connect(humLP).connect(ambBus);
  // ar-condicionado: ruído filtrado com LFO lento
  const air = ctx.createBufferSource(); air.buffer = noiseBuf; air.loop = true;
  const airF = ctx.createBiquadFilter(); airF.type = 'bandpass'; airF.frequency.value = 520; airF.Q.value = 0.5;
  const airG = ctx.createGain(); airG.gain.value = 0.035;
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = 180;
  lfo.connect(lfoG).connect(airF.frequency); lfo.start();
  air.connect(airF).connect(airG).connect(ambBus); air.start();
  // ronco grave da sala
  const room = ctx.createBufferSource(); room.buffer = brownBuf; room.loop = true;
  const roomF = ctx.createBiquadFilter(); roomF.type = 'lowpass'; roomF.frequency.value = 110;
  const roomG = ctx.createGain(); roomG.gain.value = 0.3;
  room.connect(roomF).connect(roomG).connect(ambBus); room.start();
  // eventos distantes
  const far = () => {
    const r = Math.random(), t = now();
    if (r < 0.3) { // cano
      tone({ f: rnd(180, 260), type: 'triangle', t, d: 0.5, vol: 0.05, bus: ambBus, rev: 1 });
      tone({ f: rnd(380, 520), type: 'sine', t: t + 0.02, d: 0.3, vol: 0.03, bus: ambBus, rev: 1 });
    } else if (r < 0.5) { // telefone longe
      for (let k = 0; k < 2; k++) for (let i = 0; i < 12; i++) tone({ f: i % 2 ? 1400 : 1150, type: 'sine', t: t + k * 1.6 + i * 0.045, d: 0.04, vol: 0.012, bus: ambBus, rev: 1 });
    } else if (r < 0.7) { // elevador
      bell(1046, t, 0.02, 2.5, ambBus);
    } else if (r < 0.85) { // passos no andar de cima
      for (let i = 0; i < 5; i++) tone({ f: 70, f2: 45, t: t + i * 0.55, d: 0.09, vol: 0.09, bus: ambBus, rev: 0.8 });
    } else noise({ type: 'bandpass', f: 240, q: 3, a: 0.6, d: 1.4, vol: 0.04, bus: ambBus, rev: 1 });
    ambTimer = setTimeout(far, rnd(9000, 26000));
  };
  ambTimer = setTimeout(far, 6000);
}
