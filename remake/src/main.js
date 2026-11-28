import * as glass from './ds/glass.js';
import * as THREE from 'three';
import { loadAll } from './assets.js';
import { Gfx, Particles, timeUniform, updateTweens } from './gfx.js';
import { buildScene } from './scene.js';
import { buildStreet } from './street.js';
import { buildLobby } from './lobby.js';
import { LobbyUI } from './lobbyui.js';
import { save, today } from './save.js';
import { applyMatch, activeDeck } from '../../src/meta/meta.ts';
import { rivalPlan } from '../../src/meta/campaign.ts';
import { Duel } from './duel.js';
import { UI } from './ui.js';
import { settings } from './settings.js';
import { initAudio, unlockAudio, sfx, setMusicMode, applyVolumes } from './audio.js';
import { CARDS, RIVALS } from './cards.js';
import { aiChoose } from './engine.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { T } from './theme.js';
import { weather, WEATHER } from './weathering.js';

document.body.classList.add('theme-buckshot');
{
  const film = document.createElement('div'); film.id = 'film';
  const c = document.createElement('canvas'); c.width = c.height = 180; const g = c.getContext('2d'), im = g.createImageData(180, 180);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); film.style.backgroundImage = `url(${c.toDataURL()})`;
  document.body.insertBefore(film, document.getElementById('ui'));
}

const ui = new UI(document.getElementById('ui'));
const canvas = document.getElementById('gl');
let gfx, R, street, lobby, lobbyUi, particles, duel, mode = 'boot', lastOutcome = null;
const camPos = new THREE.Vector3(0, 2.2, 7), camLook = new THREE.Vector3(0, 1.4, -3);

async function boot() {
  await loadAll((p) => ui.boot(p * 0.9));
  gfx = new Gfx(canvas);
  gfx.renderer.setClearColor(T.bg, 1);
  R = buildScene();
  // reflexos suaves para os modelos PBR (TV, luminária, arquivos)
  const pm = new THREE.PMREMGenerator(gfx.renderer);
  R.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; R.scene.environmentIntensity = 0.04; pm.dispose();
  window.__R__ = R;
  street = buildStreet(); window.__STREET__ = street; // fundo do menu: a sede da empresa e a fila de candidatos
  lobby = buildLobby(); window.__LOBBY__ = lobby; lobby.renderer = gfx.renderer;     // o lobby: a recepção por dentro, com as áreas clicáveis
  lobby.scene.environment = R.scene.environment; lobby.scene.environmentIntensity = 0.03;
  // a sujeira na superfície dos objetos, igual nas três cenas (rua, lobby e duelo): ver weathering.js
  weather(street.scene); weather(lobby.scene); weather(R.scene);
  window.__WEATHER__ = WEATHER; window.__GFX__ = gfx; // ganchos de teste: força da sujeira e do contorno
  particles = new Particles(R.scene);
  duel = new Duel({ gfx, R, particles, ui });
  lobbyUi = new LobbyUI({ ui, lobby, canvas, actions: { duel: (training) => fade(() => startDuel(training)), exit: () => fade(() => toMenu()) } });
  window.__LOBBYUI__ = lobbyUi;
  // fim de partida: o lobby paga a recompensa, grava histórico, avança metas e confere conquistas
  duel.onMatchEnd = (m) => { const out = applyMatch(save.get(), m, Date.now(), today(), RIVALS); if (out.save !== save.get()) save.set(out.save); if (!m.training) lastOutcome = lastOutcome ? { ...out, finished: out.finished || lastOutcome.finished, unlocked: [...lastOutcome.unlocked, ...out.unlocked], missionsDone: [...lastOutcome.missionsDone, ...out.missionsDone] } : out; return out; };
  duel.rematch = () => startDuel(duel.training);
  ui.boot(1);
  onResize();
  window.addEventListener('resize', onResize);
  settings.onChange(() => { onResize(); });
  ui.on({
    // menu: Continuar (último slot), Novo jogo (escolhe a gaveta e registra a empresa) e Carregar
    continue: () => {
      const n = save.lastSlot(); if (!n) return ui.h.newgame();
      sfx('start'); save.use(n);
      if (save.company()) return fade(toLobby);
      return askName();
    },
    newgame: () => { sfx('nav'); keepMenu(); ui.slots('new', { pick: (n) => askName((name) => save.create(n, name)) }); },
    load: () => { sfx('nav'); keepMenu(); ui.slots('load', { load: (n) => { ui.closeModal(); save.use(n); sfx('start'); if (save.company()) fade(toLobby); else askName(); } }); },
    quit: () => (duel.over ? fade(toLobby) : ui.confirm('Abandonar a partida?', duel.training ? 'O treino acaba aqui. Não vale nada mesmo.' : 'A partida conta como derrota e o rival fica com o investimento.', 'Abandonar', () => { duel.forfeit(); fade(toLobby); }, 'Continuar jogando', { tone: duel.training ? '' : 'danger', kind: duel.training ? 'Treino' : 'Partida' })),
    quit2: () => fade(toLobby),
  });
  // abertura do menu: qualquer clique ou tecla pula a animação e mostra tudo no lugar (e não vale como escolha)
  const skip = (e) => { if (mode === 'menu' && street.introOn) { street.skipIntro(); ui.menuStage('show'); unlock(); e.preventDefault(); e.stopImmediatePropagation(); } };
  window.addEventListener('pointerdown', skip, true); window.addEventListener('keydown', skip, true);
  window.addEventListener('keydown', (e) => { if (mode === 'menu' && e.key === 'Enter' && !ui.menuBusy && document.getElementById('modal').classList.contains('hidden')) { unlockAudio(); if (save.lastSlot()) ui.h.continue(); else ui.h.newgame(); } });
  const unlock = () => { unlockAudio(); document.getElementById('unlock').classList.add('hidden'); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  initAudio(); applyVolumes();
  setTimeout(() => { ui.bootDone(); toMenu(true); document.getElementById('unlock').classList.remove('hidden'); const q = new URLSearchParams(location.search); testShortcuts(q); if (q.has('duel')) { settings.set({ seenHelp: true }); startDuel(); } else if (q.has('lobby')) toLobby(); }, 250);
  requestAnimationFrame(loop);
  // ganchos de depuração/teste
  window.__DUEL__ = duel; duel.aiChoose = aiChoose; window.__SAVE__ = save;
  window.__STEP__ = async (ms = 1000) => { for (let t = 0; t < ms; t += 16) { updateTweens(16); for (let i = 0; i < 8; i++) await null; } }; // avança as animações sem depender da tela (testes)
  window.render_game_to_text = () => JSON.stringify({ mode, lobbyPanel: lobbyUi?.panel ?? null, patrimonio: save.get().patrimonio, turn: duel.state?.turn, active: duel.state?.active, phase: duel.state?.phase, busy: duel.busy, sel: duel.sel?.stage ?? null, cards: CARDS.length });
}
// troca de cena com um corte para o preto (a porta fecha atrás de você)
// o menu volta a aparecer quando a janela fecha sem escolha
function keepMenu() { ui.onModalClose = () => { if (mode === 'menu') ui.mainMenu(true); }; }
// registro da empresa (nome); `onName` decide onde gravar (slot novo ou o slot carregado sem nome)
function askName(onName = (name) => save.rename(name)) {
  ui.mainMenu(false); ui.nameEntry((name) => { onName(name); fade(toLobby); }); keepMenu();
}
function fade(fn) {
  const f = document.getElementById('fade');
  f.classList.add('on'); sfx('whoosh');
  setTimeout(() => { fn(); requestAnimationFrame(() => f.classList.remove('on')); }, 320);
}
/**
 * Atalhos de teste pelo endereço (como ?lobby e ?duel): ?verba=100000 garante esse PATRIMÔNIO (sem número: $ 100.000);
 * ?sobras põe de 1 a 3 cópias sobrando em metade das cartas, para testar a trituradora. Valem para a gaveta em uso.
 * Antes de lançar o jogo: tirar ou esconder (ver docs/design-system/HANDOFF.md).
 */
function testShortcuts(q) {
  if (!q.has('verba') && !q.has('sobras')) return;
  const s = structuredClone(save.get());
  if (q.has('verba')) s.patrimonio = Math.max(s.patrimonio, Number(q.get('verba')) || 100000);
  if (q.has('sobras')) CARDS.forEach((c, i) => { if (i % 2 === 0) s.collection[c.id] = Math.max(s.collection[c.id] ?? 0, 3 + (i % 3) + 1); });
  save.set(s);
}
// ao sair da rua, os efeitos dela não vão junto (tom sépia, paleta, clarão, brilho)
function resetPost() { const u = gfx.u; u.uTintWarm.value = 0; u.uFlash.value = 0; u.uGlitch.value = 0; u.uBloom.value = T.post.bloom; u.uAberr.value = gfx.base.aberr; }
function toLobby() {
  mode = 'lobby'; duel.stop(); setMusicMode('menu'); ui.mainMenu(false); resetPost();
  gfx.u.uFade.value = 0; duel.lampOn = 1; R.opp.face.uDead.value = 0; R.opp.face.uOn.value = 1;
  document.getElementById('unlock').classList.add('hidden');
  lobby.enter(); lobbyUi.show(true);
  lobbyUi.afterMatch(lastOutcome); lastOutcome = null;
}
function toMenu(first) {
  mode = 'menu'; duel.stop(); setMusicMode('menu'); lobbyUi?.show(false); ui.mainMenu(true);
  gfx.u.uFade.value = 0; duel.lampOn = 1; R.opp.face.uDead.value = 0; R.opp.face.uOn.value = 1;
  if (!first) sfx('cancel');
  // ao abrir o jogo: a rua acende e a câmera desce do céu até a fachada; só então o logotipo e o cartão de ponto aparecem.
  // Voltando da sala, só o logotipo e o cartão entram. Com "reduzir movimento", aparece tudo de uma vez.
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (first && !still) { ui.menuStage('intro'); street.intro(() => ui.menuStage('reveal')); }
  else ui.menuStage(still ? 'show' : 'reveal');
}
function startDuel(training = false) {
  mode = 'duel'; resetPost(); ui.mainMenu(false); lobbyUi.show(false); document.getElementById('unlock').classList.add('hidden');
  duel.started = false;
  const s = save.get();
  const pool = CARDS.filter((c) => (s.collection[c.id] ?? 0) > 0).map((c) => c.id);
  const plan = training ? null : rivalPlan(s.campaign, pool, Math.floor(Math.random() * 2 ** 31)); // a próxima batalha da campanha
  duel.newGame({ training, deck: [...activeDeck(s).cards], pool, plan });
  if (!settings.get().seenHelp) { settings.set({ seenHelp: true }); setTimeout(() => ui.help(), 1400); }
}
function onResize() {
  if (!gfx) return;
  gfx.resize();
  R.camera.aspect = gfx.w / gfx.h; R.camera.updateProjectionMatrix(); street.resize(gfx.w / gfx.h); lobby.resize(gfx.w / gfx.h);
  particles.mat.uniforms.uScale.value = gfx.pointScale; R.dust.material.uniforms.uScale.value = gfx.pointScale; lobby.dust.material.uniforms.uScale.value = gfx.pointScale;
}

let last = performance.now();
const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
function loop(nowMs) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs;
  const t = nowMs / 1000;
  timeUniform.value = t;
  updateTweens(dt * 1000);
  duel.update(dt, t);
  particles.update(dt);
  // lobby: a recepção por dentro
  if (mode === 'lobby') { lobby.update(dt, t, duel.mouse); gfx.render(lobby.scene, lobby.camera); lobbyUi.frame(); return; }
  // menu: a rua com o prédio e a fila (cena própria, mesmo filtro de imagem)
  if (mode !== 'duel') {
    // a rua do menu: estilo da arte de referência (paleta e contorno), tom sépia e os efeitos do estalo do letreiro na abertura
    street.update(dt, t, duel.mouse);
    const fx = street.fx, u = gfx.u;
    u.uFade.value = street.fade; u.uTintWarm.value = fx.warm; u.uGlitch.value = fx.glitch;
    u.uFlash.value = fx.flash; if (fx.flash > 0) u.uFlashCol.value.setRGB(1, 0.72, 0.36);
    u.uBloom.value = T.post.bloom + fx.bloom; u.uAberr.value = gfx.base.aberr + fx.aberr;
    gfx.render(street.scene, street.camera); return;
  }
  // câmera: pose-alvo por modo + paralaxe do mouse + respiração + tremor
  const cam = R.camera, wide = Math.max(1, 1.62 / cam.aspect);
  if (mode === 'duel') {
    const up = duel.lookUp;
    tmpP.set(0, 4.75 * wide - up * 0.35, 0.25 + 4.45 * wide + up * 0.3);
    tmpL.set(0, up * 1.3, 0.3 - up * 1.55);
  } else {
    tmpP.set(Math.sin(t * 0.09) * 1.4 + 1.6, 2.5 + Math.sin(t * 0.13) * 0.15, 4.6);
    tmpL.set(-1.1, 1.9, -3.6);
  }
  const k = 1 - Math.exp(-dt * 2.6);
  camPos.lerp(tmpP, k); camLook.lerp(tmpL, k);
  const mx = duel.mouse.x - 0.5, my = duel.mouse.y - 0.5, sh = duel.shake * duel.shake * 0.16;
  cam.position.set(camPos.x + mx * 0.3 + Math.sin(t * 0.5) * 0.02 + (Math.random() - 0.5) * sh, camPos.y - my * 0.14 + Math.sin(t * 0.8) * 0.015 + (Math.random() - 0.5) * sh, camPos.z);
  cam.lookAt(camLook.x + mx * 0.35, camLook.y - my * (mode === 'duel' ? 0.55 : 0.2), camLook.z);
  cam.rotation.z += (Math.random() - 0.5) * sh * 0.15;
  if (window.__CAMOVR__) { const o = window.__CAMOVR__; cam.position.set(...o.pos); cam.lookAt(...o.look); } // testes: câmera fixa
  gfx.render(R.scene, cam);
  glass.render(gfx.renderer);   // interface curva (quando ligada): passe final, por cima da cena
}
boot().catch((e) => { console.error(e); document.getElementById('boot-line').textContent = `Erro ao abrir o caixa: ${e.message}`; });
