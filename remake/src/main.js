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
import { Duel } from './duel.js';
import { UI } from './ui.js';
import { settings } from './settings.js';
import { initAudio, unlockAudio, sfx, setMusicMode, applyVolumes } from './audio.js';
import { CARDS, RIVALS } from './cards.js';
import { aiChoose } from './engine.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { T } from './theme.js';

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
  R.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; R.scene.environmentIntensity = 0.16; pm.dispose();
  window.__R__ = R;
  street = buildStreet(); window.__STREET__ = street; // fundo do menu: a sede da empresa e a fila de candidatos
  lobby = buildLobby(); window.__LOBBY__ = lobby;     // o lobby: a recepção por dentro, com as áreas clicáveis
  lobby.scene.environment = R.scene.environment; lobby.scene.environmentIntensity = 0.12;
  particles = new Particles(R.scene);
  duel = new Duel({ gfx, R, particles, ui });
  lobbyUi = new LobbyUI({ ui, lobby, canvas, actions: { duel: (training) => fade(() => startDuel(training)), exit: () => fade(() => toMenu()) } });
  window.__LOBBYUI__ = lobbyUi;
  // fim de partida: o lobby paga a recompensa, grava histórico, avança metas e confere conquistas
  duel.onMatchEnd = (m) => { const out = applyMatch(save.get(), m, Date.now(), today(), RIVALS); if (out.save !== save.get()) save.set(out.save); if (!m.training) lastOutcome = lastOutcome ? { ...out, unlocked: [...lastOutcome.unlocked, ...out.unlocked], missionsDone: [...lastOutcome.missionsDone, ...out.missionsDone] } : out; return out; };
  duel.rematch = () => startDuel(duel.training);
  ui.boot(1);
  onResize();
  window.addEventListener('resize', onResize);
  settings.onChange(() => { onResize(); });
  ui.on({
    // "Iniciar expediente": na primeira vez registra a empresa; depois entra direto no lobby
    start: () => {
      sfx('start');
      if (settings.get().companyName) return fade(toLobby);
      ui.mainMenu(false); ui.nameEntry(() => fade(toLobby)); ui.onModalClose = () => { if (mode === 'menu') ui.mainMenu(true); };
      return undefined;
    },
    quit: () => (duel.over ? fade(toLobby) : ui.confirm('Abandonar a partida?', duel.training ? 'O treino acaba aqui. Não vale nada mesmo.' : 'A partida conta como derrota e o rival fica com o investimento.', 'ABANDONAR', () => { duel.forfeit(); fade(toLobby); }, 'Continuar jogando')),
    quit2: () => fade(toLobby),
  });
  window.addEventListener('keydown', (e) => { if (mode === 'menu' && e.key === 'Enter' && document.getElementById('modal').classList.contains('hidden')) { unlockAudio(); ui.h.start(); } });
  const unlock = () => { unlockAudio(); document.getElementById('unlock').classList.add('hidden'); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  initAudio(); applyVolumes();
  setTimeout(() => { ui.bootDone(); toMenu(true); document.getElementById('unlock').classList.remove('hidden'); const q = new URLSearchParams(location.search); if (q.has('duel')) { settings.set({ seenHelp: true }); startDuel(); } else if (q.has('lobby')) toLobby(); }, 250);
  requestAnimationFrame(loop);
  // ganchos de depuração/teste
  window.__DUEL__ = duel; duel.aiChoose = aiChoose;
  window.render_game_to_text = () => JSON.stringify({ mode, lobbyPanel: lobbyUi?.panel ?? null, patrimonio: save.get().patrimonio, turn: duel.state?.turn, active: duel.state?.active, phase: duel.state?.phase, busy: duel.busy, sel: duel.sel?.stage ?? null, cards: CARDS.length });
}
// troca de cena com um corte para o preto (a porta fecha atrás de você)
function fade(fn) {
  const f = document.getElementById('fade');
  f.classList.add('on'); sfx('whoosh');
  setTimeout(() => { fn(); requestAnimationFrame(() => f.classList.remove('on')); }, 320);
}
function toLobby() {
  mode = 'lobby'; duel.stop(); setMusicMode('menu'); ui.mainMenu(false);
  gfx.u.uFade.value = 0; duel.lampOn = 1; R.opp.face.uDead.value = 0; R.opp.face.uOn.value = 1;
  document.getElementById('unlock').classList.add('hidden');
  lobby.enter(); lobbyUi.show(true);
  lobbyUi.afterMatch(lastOutcome); lastOutcome = null;
}
function toMenu(first) {
  mode = 'menu'; duel.stop(); setMusicMode('menu'); lobbyUi?.show(false); ui.mainMenu(true);
  gfx.u.uFade.value = 0; duel.lampOn = 1; R.opp.face.uDead.value = 0; R.opp.face.uOn.value = 1;
  if (!first) sfx('cancel');
}
function startDuel(training = false) {
  mode = 'duel'; ui.mainMenu(false); lobbyUi.show(false); document.getElementById('unlock').classList.add('hidden');
  duel.started = false;
  const s = save.get();
  duel.newGame({ training, deck: [...activeDeck(s).cards], pool: CARDS.filter((c) => (s.collection[c.id] ?? 0) > 0).map((c) => c.id) });
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
  if (mode !== 'duel') { street.update(dt, t, duel.mouse); gfx.render(street.scene, street.camera); return; }
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
  gfx.render(R.scene, cam);
  glass.render(gfx.renderer);   // interface curva (quando ligada): passe final, por cima da cena
}
boot().catch((e) => { console.error(e); document.getElementById('boot-line').textContent = `Erro ao abrir o caixa: ${e.message}`; });
