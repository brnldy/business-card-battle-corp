// Duelo: liga o motor de regras à cena 3D. Cartas com mola, linha do tempo de animações por evento,
// interação por raycast (clique e arrastar), mira de ataque com previsão de combate.
import * as THREE from 'three';
import {
  RULES, cardDef, isEffect, other, creaturesOf, findCreature, statsOf, canAttack, maxAttacks,
  legalActions, applyAction, aiChoose, aiWeak, chooseWithProfile, createGame, handLimitStatus, previewAttack,
} from './engine.js';
import { backTexture } from './cosmetics.js';
import { save } from './save.js';
import { newTracker, track } from '../../src/meta/meta.ts';
import { RIVALS } from './cards.js';
import { CARD, LAYOUT, TABLE, cardFaceTexture, cardBackTexture, money, coinTexture } from './textures.js';
import { cardMaterial, glowMaterial, tween, wait, ease, LAYER, cardMats } from './gfx.js';
import { T as TH } from './theme.js';
import { sfx, setMusicMode } from './audio.js';
import { settings } from './settings.js';
import { describeEvent } from './log.js';
import { CardFX } from './cardfx.js';
import { RIVAL_LOOKS } from './scene.js';
import { FrostScreen } from './frost.js';

const ME = 0, OP = 1;
const C_money = (n) => `$ ${Math.round(n).toLocaleString('pt-BR')}`;
const PLAY_TYPES = new Set(['summon', 'playEffect', 'setTrap', 'discard']);
const COL = { play: TH.glow.play, pick: TH.glow.pick, picked: 0xff5a3c, foe: 0xff4a34, soft: 0x9fe8d2 };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const qEuler = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
const Q_UP = qEuler(-Math.PI / 2, 0, 0), Q_DOWN = qEuler(Math.PI / 2, 0, 0), Q_DEF = qEuler(-Math.PI / 2, Math.PI / 2, 0);
const cardGeo = new THREE.PlaneGeometry(CARD.w, CARD.h);
const glowGeo = new THREE.PlaneGeometry(CARD.w / 0.8, CARD.h / 0.8);
const hitGeo = new THREE.PlaneGeometry(CARD.w * 1.05, CARD.h * 1.7).translate(0, -CARD.h * 0.33, 0);
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const hashStr = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return ((h >>> 0) % 1000) / 1000; };
const sacKey = (a) => [...(a.type === 'summon' ? a.sacrifices : a.type === 'playEffect' ? a.costs ?? [] : [])].sort().join(',');
const tgtOf = (a) => ('target' in a ? a.target ?? null : null);
const menuKey = (a) => (a.type === 'summon' ? `summon:${a.mode}` : a.type);
const KIND_PT = { creature: 'Criatura', entity: 'Entidade', effect_instant: 'Efeito', effect_trap: 'Armadilha' };

export class Duel {
  constructor(world) {
    Object.assign(this, world); // gfx, R, particles, ui
    this.cards = new Map(); this.cardIndex = new Map();
    this.sel = null; this.busy = true; this.active = false; this.hoverUid = null; this.hoverPick = null;
    this.mouse = { x: 0.5, y: 0.5, down: null, dragging: null };
    this.shake = 0; this.lookUp = 0; this.lampVel = 0; this.lampAng = 0; this.deckShown = [0, 0];
    this.ray = new THREE.Raycaster(); this.ray.layers.enableAll(); this.caixaShown = [RULES.STARTING_CAIXA, RULES.STARTING_CAIXA]; this.group = new THREE.Group(); this.R.scene.add(this.group);
    this.slotGlow = new THREE.Mesh(glowGeo, glowMaterial()); this.slotGlow.rotation.x = -Math.PI / 2; this.slotGlow.position.y = 0.006; this.slotGlow.visible = false; this.slotGlow.layers.set(LAYER.GLOW);
    this.slotGlow.material.uniforms.uAspect.value = CARD.w / CARD.h; this.R.scene.add(this.slotGlow);
    this.buildArrow(); this.buildCoin(); this.fx = new CardFX(this); this.frost = new FrostScreen(this.gfx);
    this.oppMood = 0; this.oppGlitch = 0; this.oppTalk = 0; this.oppNod = 0; this.blinkT = 2;
    this.bindInput();
  }

  // ───────── ciclo de partida ─────────
  // opts: { training, deck, pool, plan } — treino é contra o estagiário (IA fraca) e não vale nada;
  // deck = lista de 40 ids do lobby; pool = cartas que o rival pode usar (as que o jogador já tem);
  // plan = a batalha da campanha (src/meta/campaign.ts → rivalPlan): rival, deck, IA e recompensa
  async newGame(opts = {}) {
    this.clearCards(); this.fx.clear(); this.frost.clear();
    this.ui.gameOver(null); this.ui.hud(true); this.ui.clearLog();
    this.training = !!opts.training;
    this.plan = this.training ? null : opts.plan ?? null;
    const rival = this.training ? 'ESTAGIÁRIO' : this.plan?.name ?? RIVALS[Math.floor(Math.random() * RIVALS.length)];
    this.names = [save.company() ?? 'SUA EMPRESA', rival];
    const { state, events, seed } = createGame(this.names, { myDeck: opts.deck ?? null, rivalPool: opts.pool ?? null, rivalDeck: this.plan?.deck ?? null });
    // acompanha o que o jogador faz (metas, conquistas, estatísticas) e veste as cartas dele com o verso escolhido
    this.tracker = newTracker(state, ME); track(this.tracker, events, state);
    const look = save.get().cosmetics; this.myBack = backTexture(look.back, look.logo);
    { const m = this.R.decks[ME].material[2]; m.map = this.myBack; m.emissiveMap = this.myBack; m.needsUpdate = true; }
    this.state = state; this.legal = []; this.sel = null; this.over = false; this.closed = false; this.started = false; this.active = true; this.busy = true;
    this.caixaShown = [RULES.STARTING_CAIXA, RULES.STARTING_CAIXA];
    this.deckShown = [RULES.DECK_SIZE, RULES.DECK_SIZE];
    this.R.opp.face.uDead.value = 0; this.R.opp.face.uOn.value = 1; this.oppMood = 0;
    this.gfx.u.uFade.value = 0; this.lampOn = 1;
    // o rival da mesa é sorteado a cada partida: o cabeça de monitor ou uma das 7 pessoas (scene.js → RIVAL_LOOKS)
    const looks = Object.keys(RIVAL_LOOKS); this.R.setRivalLook(looks[Math.floor(Math.random() * looks.length)]);
    setMusicMode(this.plan?.boss ? 'boss' : 'duel'); this.R.setBadge(rival);
    const where = this.plan ? (this.plan.free ? 'reunião livre' : `batalha ${this.plan.stage} de ${this.plan.total} / ${this.plan.tierName}`) : '';
    this.ui.log(this.training ? 'Treino com o estagiário / não vale PATRIMÔNIO' : `Partida contra ${rival}${where ? ` / ${where}` : ''} / protocolo ${seed.toString(36).toUpperCase()}`);
    if (this.plan && !this.plan.free) setTimeout(() => this.active && this.ui.banner(this.plan.boss ? 'O CONSELHO' : rival, this.plan.boss ? 'batalha final / o conselho não perdoa' : `batalha ${this.plan.stage} de ${this.plan.total}`, 'foe'), 200);
    this.indexCards();
    this.refreshHud();
    await wait(opts.delay ?? 350); // entrando pela porta (main.js), as cartas só são distribuídas quando a câmera chega na mesa
    await this.play(events, new Map());
    this.afterAction();
  }
  stop() { this.active = false; this.fx.clear(); this.frost.clear(); this.clearCards(); this.ui.hud(false); this.ui.gameOver(null); this.setSel(null); }
  clearCards() {
    for (const uid of [...this.cards.keys()]) this.removeCard(uid);
    this.cards.clear(); this.cardIndex.clear();
  }
  indexCards() {
    for (const p of this.state.players) {
      for (const c of [...p.deck, ...p.hand, ...p.dead]) this.cardIndex.set(c.uid, c.cardId);
      for (const c of [...p.creatures, ...p.effects]) if (c) this.cardIndex.set(c.uid, c.cardId);
    }
  }
  myTurn() { return this.active && this.state.active === ME && this.state.phase !== 'over'; }
  canAct() { return this.myTurn() && !this.busy; }

  async apply(action) {
    if (this.busy || !this.active) return;
    let res;
    try { res = applyAction(this.state, action); }
    catch (e) { console.warn('Jogada recusada', action, e); this.ui.toast('Jogada não permitida agora.'); sfx('deny'); return; }
    this.busy = true; this.setSel(null);
    const prev = this.placements(this.state);
    this.state = res.state; this.indexCards();
    if (this.tracker) track(this.tracker, res.events, this.state);
    this.refreshHud();
    await this.play(res.events, prev);
    this.afterAction();
  }
  afterAction() {
    if (!this.active) return;
    this.busy = false;
    this.legal = this.myTurn() ? legalActions(this.state) : [];
    this.refreshHud(); this.refreshGlows();
    if (this.state.phase === 'over') return;
    this.autoTips();
    if (this.state.active === OP) this.scheduleAI();
  }
  scheduleAI() {
    const sp = settings.get().speed;
    this.busy = true;
    this.thinking = true;
    wait(780 / sp).then(() => {
      this.thinking = false;
      if (!this.active || this.state.phase === 'over' || this.state.active !== OP) { this.busy = false; return; }
      const a = this.training ? aiWeak(this.state) : this.plan ? chooseWithProfile(this.state, this.plan.ai) : aiChoose(this.state);
      this.busy = false;
      this.oppNod = 1;
      this.apply(a);
    });
  }

  // ───────── posicionamento ─────────
  placements(s) {
    const m = new Map();
    for (const side of [ME, OP]) {
      const p = s.players[side];
      p.hand.forEach((c, i) => m.set(c.uid, { kind: 'hand', side, idx: i, n: p.hand.length }));
      p.creatures.forEach((c, i) => c && m.set(c.uid, { kind: 'cr', side, idx: i, mode: c.mode }));
      p.effects.forEach((c, i) => c && m.set(c.uid, { kind: 'fx', side, idx: i, faceDown: c.faceDown }));
      p.dead.forEach((c, i) => m.set(c.uid, { kind: 'dead', side, idx: i }));
    }
    return m;
  }
  deckPos(side) { const p = side === ME ? LAYOUT.myDeck : LAYOUT.oppDeck; return V(p.x, 0.03 + this.deckShown[side] * 0.006, p.z); }
  ensureCard(uid, side) {
    let c = this.cards.get(uid);
    if (c) return c;
    const cardId = this.cardIndex.get(uid);
    const group = new THREE.Group();
    const front = new THREE.Mesh(cardGeo, cardMaterial(cardFaceTexture(cardId)));
    const back = new THREE.Mesh(cardGeo, cardMaterial(this.tracker?.owner[uid] === ME && this.myBack ? this.myBack : cardBackTexture())); back.rotation.y = Math.PI;
    const glow = new THREE.Mesh(glowGeo, glowMaterial()); glow.position.z = -0.004; glow.visible = false; glow.renderOrder = 5; glow.layers.set(LAYER.GLOW);
    glow.material.uniforms.uAspect.value = CARD.w / CARD.h;
    const hit = new THREE.Mesh(hitGeo, hitMat); hit.visible = false;
    front.castShadow = true;
    for (const m of [front, back, hit]) m.userData.uid = uid;
    front.layers.set(LAYER.CARD); back.layers.set(LAYER.CARD); hit.layers.set(4);
    group.add(front, back, glow, hit);
    c = {
      uid, cardId, group, front, back, glow, hit, place: null, pos: this.deckPos(side), quat: Q_DOWN.clone(), scale: 1,
      tPos: V(), tQuat: new THREE.Quaternion(), tScale: 1, hop: 0, hopH: 0, offset: V(), glowA: 0, glowT: 0, emissive: 0.3, hoverK: 0, wob: hashStr(uid),
    };
    group.position.copy(c.pos); group.quaternion.copy(c.quat);
    this.group.add(group); this.cards.set(uid, c);
    return c;
  }
  setPlace(uid, place, opts = {}) {
    const c = this.cards.get(uid);
    if (!c) return;
    const moved = !c.place || !place || c.place.kind !== place.kind || c.place.side !== place.side || (place.kind !== 'hand' && c.place.idx !== place.idx);
    c.place = place;
    if (moved && place && !opts.noHop) { c.hop = 1; c.hopH = opts.hop ?? (place.kind === 'hand' ? 0.25 : 0.55); }
  }
  removeCard(uid) { const c = this.cards.get(uid); if (c) { this.group.remove(c.group); this.cards.delete(uid); for (const m of [c.front.material, c.back.material]) { cardMats.delete(m); m.dispose(); } c.glow.material.dispose(); } }

  targetFor(c, cam) {
    const p = c.place, T = c.tPos;
    c.tScale = 1; c.emissive = TH.card.table; c.hit.visible = false;
    if (!p) return;
    if (p.kind === 'show') {
      T.copy(cam.localToWorld(V(p.x ?? 0, 0.1, -3.1))); c.tQuat.copy(cam.quaternion); c.tScale = 1.5; c.emissive = 0.78; return;
    }
    if (p.kind === 'cr' || p.kind === 'fx') {
      const row = p.kind === 'cr' ? (p.side === ME ? LAYOUT.myCr : LAYOUT.oppCr) : (p.side === ME ? LAYOUT.myFx : LAYOUT.oppFx);
      T.set(row[p.idx].x, 0.014, row[p.idx].z);
      c.tQuat.copy(p.faceDown ? Q_DOWN : p.mode === 'DEF' ? Q_DEF : Q_UP);
      if (this.hoverUid === c.uid && !this.busy) T.y += 0.07;
      return;
    }
    if (p.kind === 'dead') {
      const d = p.side === ME ? LAYOUT.myDead : LAYOUT.oppDead;
      T.set(d.x + (c.wob - 0.5) * 0.06, 0.012 + p.idx * 0.004, d.z + (hashStr(c.uid + 'z') - 0.5) * 0.06);
      c.tQuat.copy(qEuler(-Math.PI / 2, (c.wob - 0.5) * 0.5, 0)); c.emissive = 0.14;
      return;
    }
    if (p.kind === 'hand' && p.side === OP) {
      const a = this.R.opp.handAnchor, n = p.n, dx = n > 1 ? Math.min(0.3, 2.0 / (n - 1)) : 0, k = p.idx - (n - 1) / 2;
      T.set(a.x + k * dx, a.y - Math.abs(k) * 0.02 + this.oppBob * 0.4, a.z + p.idx * 0.004);
      c.tQuat.copy(qEuler(-0.35, Math.PI, 0).multiply(qEuler(0, 0, k * 0.07))); c.tScale = 0.85; c.emissive = 0.22;
      return;
    }
    if (p.kind === 'hand') {
      const n = p.n, halfW = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 3 * cam.aspect, halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 3;
      const z = this.ui.scale, Wpx = this.gfx.w, lim = (px) => (px / Wpx * 2 - 1) * halfW;
      const xl = lim(Math.min(Wpx * 0.3, 276 * z)), xr = lim(Wpx - 46 * z), xc = (xl + xr) / 2;
      const dx = n > 1 ? Math.min(0.5, Math.max(0.12, (xr - xl - CARD.w * 0.82) / (n - 1))) : 0, k = p.idx - (n - 1) / 2, x = xc + k * dx;
      const sel = this.sel?.uid === c.uid, hov = this.hoverUid === c.uid && !this.mouse.dragging;
      const drag = this.mouse.dragging === c.uid;
      c.hit.visible = true; c.emissive = 0.8;
      let pos, roll = -(x - xc) * 0.09, sc = 0.82;
      if (drag) { pos = this.dragPoint(cam); roll = 0; sc = 0.7; }
      else if (sel) { pos = V(xc + (x - xc) * 0.25, -halfH + CARD.h * 0.5 + 0.04, -2.75); roll = 0; sc = 1.0; }
      else {
        const low = this.myTurn() ? 0 : -0.1;
        pos = V(x, -halfH + 0.3 - (x - xc) * (x - xc) * 0.03 + low + (hov ? 0.3 : 0), -3 + p.idx * 0.006 + (hov ? 0.2 : 0));
        if (hov) { roll = 0; sc = 1.22; pos.y = Math.max(pos.y, -halfH + CARD.h * sc * 0.5 + 0.02); pos.x = THREE.MathUtils.clamp(pos.x, xl * 0.9 + CARD.w * sc * 0.45, xr * 0.9 - CARD.w * sc * 0.45); }
      }
      if (!drag) T.copy(cam.localToWorld(pos)); else T.copy(pos);
      c.tQuat.copy(cam.quaternion).multiply(qEuler(0, 0, roll)); c.tScale = sc;
    }
  }
  dragPoint(cam) {
    // ponto no plano 1.2 acima da mesa sob o cursor
    this.setRay(cam);
    const o = this.ray.ray.origin, d = this.ray.ray.direction, t = (0.9 - o.y) / d.y;
    return t > 0 ? o.clone().addScaledVector(d, Math.min(t, 9)) : cam.localToWorld(V(0, -0.4, -3));
  }

  // ───────── linha do tempo de eventos ─────────
  async play(events, prev) {
    const sp = settings.get().speed, next = this.placements(this.state), D = (ms) => ms / sp;
    const RELOC = new Set(['draw', 'summon', 'sacrifice', 'destroy', 'discard', 'mill', 'toHand', 'toDeck', 'trapSet', 'effectPlayed', 'effectExpired', 'trapTriggered', 'controlChange', 'modeChange']);
    const referenced = new Set(events.filter((e) => RELOC.has(e.type)).map((e) => e.uid));
    for (const [uid, pl] of next) if (!referenced.has(uid) && this.cards.has(uid)) this.setPlace(uid, pl, { noHop: true });
    const rel = (uid, opts) => { this.setPlace(uid, next.get(uid) ?? null, opts); };
    const ctx = { human: ME, names: this.names, cardOf: (u) => this.cardIndex.get(u) };
    const posOf = (uid) => this.cards.get(uid)?.group.position.clone();
    let lastCombat = null, tchan = false; // tchan: a Thays acabou de entrar (o próximo "volta pra mão" é dela)

    for (let i = 0; i < events.length; i++) {
      if (!this.active) return;
      const e = events[i];
      const line = describeEvent(e, ctx);
      if (line) this.ui.log(line, e.type, this.whoOf(e, prev));
      switch (e.type) {
        case 'gameStart':
          this.ui.banner(e.firstPlayer === ME ? 'Você começa' : `${this.names[OP]} começa`, 'no cara ou coroa', e.firstPlayer === ME ? 'me' : 'foe');
          sfx('coin'); await wait(D(900));
          break;
        case 'draw': {
          const c = this.ensureCard(e.uid, e.player);
          this.deckShown[e.player] = Math.max(0, this.deckShown[e.player] - 1);
          rel(e.uid); sfx('draw');
          if (e.player === ME && this.started) { c.place = { kind: 'show', x: 0 }; c.hop = 1; c.hopH = 0.2; await wait(D(480)); rel(e.uid); }
          await wait(D(this.started ? 220 : 110));
          break;
        }
        case 'turnStart': {
          this.started = true;
          const mine = e.player === ME;
          this.ui.banner(mine ? 'Sua vez' : `Vez de ${this.names[OP]}`, `turno ${e.turn}`, mine ? 'me' : 'foe');
          sfx(mine ? 'turn' : 'turnFoe');
          this.refreshHud(e.player, 'main');
          if (this.frost.level && this.frostLevel() > this.frost.level) this.frost.set(this.frostLevel()); // o vidro trinca mais um pouco
          await wait(D(mine ? 820 : 620));
          break;
        }
        case 'phase':
          this.ui.banner('Batalha', 'escolha quem ataca', 'battle'); sfx('battle'); this.bump(0.12); this.pulse('uTintWarm', 0.5, 900);
          await wait(D(650));
          break;
        case 'summon': {
          const c = this.ensureCard(e.uid, e.player);
          if (e.player === OP) { this.oppArm(1); c.place = { kind: 'show', x: 0 }; c.hop = 1; c.hopH = 0.3; sfx('card'); this.ui.detail({ cardId: e.cardId, where: 'show', owner: 'opp', notes: [`${this.names[OP]} invocou em ${e.mode === 'ATK' ? 'ataque' : 'defesa'}.`] }); await wait(D(900)); }
          rel(e.uid, { hop: 0.9 }); sfx('whoosh');
          await wait(D(300));
          const p = this.zonePos('cr', e.player, e.zone);
          sfx('summon'); this.bump(0.16); this.lampKick(0.5);
          this.puff(p, 26, [0.75, 0.72, 0.6]);
          await wait(D(260));
          if (e.cardId === 'BCB-013' && e.mode === 'DEF') await this.fx.cross(p);      // Paulo orando
          if (e.cardId === 'BCB-010') await this.fx.jaws(this.deckPos(e.player));       // a bocarra da Tênia morde o topo do deck
          if (e.cardId === 'BCB-017') tchan = true;
          break;
        }
        case 'sacrifice': case 'destroy': case 'effectExpired': case 'discard': {
          if (e.type === 'effectExpired' && e.cardId === 'BCB-003') this.frost.set(this.frostLevel()); // o disjuntor caiu: descongela ao contrário
          const c = this.cards.get(e.uid);
          if (c) {
            sfx(e.type === 'sacrifice' ? 'sacrifice' : e.type === 'discard' ? 'card' : 'destroy');
            if (e.type === 'discard') { rel(e.uid); await wait(D(300)); break; }
            this.embers(c.group.position, e.type === 'sacrifice' ? [0.55, 1, 0.6] : [1, 0.5, 0.12], 40);
            await this.dissolve(c, 0, 1, D(e.type === 'sacrifice' ? 620 : 520));
            rel(e.uid, { noHop: true }); this.snap(c);
            this.dissolve(c, 1, 0, D(260));
          }
          await wait(D(120));
          break;
        }
        case 'toHand': {
          if (tchan) { tchan = false; const p0 = posOf(e.uid); if (p0) await this.fx.stamp(p0, 'FALTOU UM', 'TCHAN!'); }
          rel(e.uid, { hop: 0.9 }); sfx('whoosh'); this.floatAt(posOf(e.uid), 'de volta pra mão', 'info'); await wait(D(450)); break; }
        case 'toDeck': {
          const c = this.cards.get(e.uid);
          if (c) {
            const owner = this.state.players.findIndex((p) => p.deck.some((d) => d.uid === e.uid));
            if (e.cardId === 'BCB-005') await this.fx.cloud(c);                           // Chat GPT sobe pra nuvem
            this.floatAt(posOf(e.uid), 'voltou pra nuvem', 'info'); sfx('glitch');
            c.place = { kind: 'free' }; c.tPos.copy(this.deckPos(owner < 0 ? ME : owner)); c.tQuat.copy(Q_DOWN); c.hop = 1; c.hopH = 0.8;
            await wait(D(480)); this.removeCard(e.uid); this.deckShown[owner < 0 ? ME : owner]++;
          }
          break;
        }
        case 'mill': {
          this.ensureCard(e.uid, e.player); this.deckShown[e.player] = Math.max(0, this.deckShown[e.player] - 1);
          rel(e.uid, { hop: 0.5 }); sfx('card'); await wait(D(210));
          break;
        }
        case 'trapSet': {
          if (e.player === OP) this.oppArm(-1);
          rel(e.uid, { hop: 0.7 }); sfx('whoosh'); await wait(D(320)); sfx('trapSet'); this.bump(0.06);
          this.puff(this.zonePos('fx', e.player, e.zone), 10, [0.6, 0.6, 0.5]);
          await wait(D(200));
          break;
        }
        case 'effectPlayed': {
          const c = this.ensureCard(e.uid, e.player);
          if (e.player === OP) { this.oppArm(1); this.ui.detail({ cardId: e.cardId, where: 'show', owner: 'opp', notes: [`${this.names[OP]} usou este efeito.`] }); }
          c.place = { kind: 'show', x: 0 }; c.hop = 1; c.hopH = 0.3;
          sfx('effect'); await wait(D(360));
          this.sparkle(c.group.position, [0.6, 1, 0.85], 34); this.pulse('uAberr', 0.006, 500);
          if (e.cardId === 'BCB-003') await this.frost.set(this.frostLevel());           // ar no 16: a tela congela e trinca
          await wait(D(700));
          if (next.get(e.uid)?.kind === 'dead') { await this.dissolve(c, 0, 1, D(380)); rel(e.uid, { noHop: true }); this.snap(c); this.dissolve(c, 1, 0, D(200)); }
          else { rel(e.uid, { hop: 0.6 }); await wait(D(380)); sfx('place'); }
          break;
        }
        case 'trapTriggered': {
          const c = this.cards.get(e.uid);
          this.ui.banner('Armadilha!', cardDef(e.cardId).name, 'trap'); this.ui.detail({ cardId: e.cardId, where: 'show', owner: e.player === ME ? 'me' : 'opp', status: { tone: e.player === ME ? 'go' : 'stop', text: e.player === ME ? 'Sua armadilha disparou.' : `Armadilha de ${this.names[OP]} disparou.` } }); sfx('trap'); this.bump(0.3); this.pulse('uFlash', 0.5, 500, [1, 0.75, 0.1]); this.pulse('uGlitch', 1, 450);
          if (e.cardId === 'BCB-015') { const pa = posOf(e.against); if (pa) await this.fx.battery(pa); }   // a pilha de quem atacou morre
          if (c) { c.place = { kind: 'show', x: 0 }; c.hop = 1; c.hopH = 0.5; await wait(D(1000)); await this.dissolve(c, 0, 1, D(380)); rel(e.uid, { noHop: true }); this.snap(c); this.dissolve(c, 1, 0, D(200)); }
          break;
        }
        case 'controlChange': { rel(e.uid, { hop: 1.0 }); sfx('whoosh'); this.floatAt(posOf(e.uid), 'pegou carona', 'info'); await wait(D(520)); break; }
        case 'modeChange': {
          rel(e.uid, { noHop: true }); const c = this.cards.get(e.uid); if (c) { c.hop = 1; c.hopH = 0.16; } sfx('card'); await wait(D(300)); sfx('place');
          if (e.mode === 'DEF' && this.cardIndex.get(e.uid) === 'BCB-013') { await wait(D(200)); const p = posOf(e.uid); if (p) await this.fx.cross(p); }
          break;
        }
        case 'attack': {
          const c = this.cards.get(e.attacker); if (!c) break;
          const side = this.sideOf(e.attacker, prev), to = e.target ? posOf(e.target) : this.directTarget(side);
          this.atkCtx = { c, from: c.group.position.clone(), to, side };
          if (side === OP) { this.oppMood = 0.6; this.oppNod = 1; }
          c.glowT = 1; c.glow.material.uniforms.uColor.value.setHex(COL.picked);
          await tween(D(260), (k) => { c.offset.set(0, 0.5 * k, (side === ME ? 0.35 : -0.35) * k); }, ease.out);
          sfx('attack');
          break;
        }
        case 'attackRedirected': {
          // Filipe conta uma fake news: o ataque muda de rumo e vai para um colega de quem atacou
          const a = this.atkCtx, f = posOf(e.from);
          if (f) { this.floatAt(f, 'fake news!', 'info'); this.sparkle(f, [1, 0.85, 0.4], 18); }
          this.ui.banner('Fake news!', 'o ataque foi desviado', 'trap'); sfx('glitch'); this.oppGlitch = 0.6;
          if (a) { const to = posOf(e.to); if (to) a.to = to; }
          await wait(D(650));
          break;
        }
        case 'attackNegated': {
          const a = this.atkCtx; if (a) { this.floatAt(a.c.group.position, 'ataque anulado', 'bad'); await tween(D(300), (k) => a.c.offset.multiplyScalar(1 - k)); a.c.offset.set(0, 0, 0); a.c.glowT = 0; this.atkCtx = null; }
          break;
        }
        case 'coin': { const b = this.cards.get(e.source); if (b) await this.fx.clap(b.group.position.clone()); await this.coinFlip(e.result, D); break; }
        case 'statMod': {
          const p = posOf(e.uid), parts = [];
          if (e.source === 'BCB-016' && p) await this.fx.mug(p);                            // café com gosto de cigarro
          if (e.mul !== undefined && e.mul !== 1) parts.push(e.mul < 1 ? 'força pela metade' : `×${e.mul}`);
          if (e.atk) parts.push(`ATQ ${e.atk > 0 ? '+' : ''}${e.atk}`);
          if (e.def) parts.push(`DEF ${e.def > 0 ? '+' : ''}${e.def}`);
          const bad = (e.mul ?? 1) < 1 || (e.atk ?? 0) + (e.def ?? 0) < 0;
          if (p && parts.length) { this.floatAt(p, parts.join(' / '), bad ? 'bad' : 'good'); sfx(bad ? 'debuff' : 'buff'); this.sparkle(p, bad ? [1, 0.4, 0.3] : [0.5, 1, 0.6], 16); }
          this.refreshChips(); await wait(D(380));
          break;
        }
        case 'combat': {
          const a = this.atkCtx; lastCombat = e;
          if (a) {
            const dir = a.to.clone().sub(a.from); dir.y = 0; const len = dir.length(); dir.normalize();
            const reach = Math.max(0, len - (e.defender ? 0.42 : 0.5));
            const o0 = a.c.offset.clone();
            await tween(D(170), (k) => { a.c.offset.copy(o0).lerp(V(dir.x * reach, 0.12, dir.z * reach), k); }, ease.in);
            const hit = a.to.clone(); hit.y = 0.15;
            sfx(e.defender ? 'clash' : 'impact'); this.bump(e.defender ? 0.3 : 0.5); this.lampKick(1.2); this.pulse('uAberr', 0.007, 380);
            this.sparks(hit, e.defender ? 46 : 60);
            if (e.defender) {
              const d = this.cards.get(e.defender);
              if (d) tween(D(320), (k) => { d.offset.set(dir.x * 0.16 * (1 - k) * Math.cos(k * 20), 0, dir.z * 0.16 * (1 - k)); });
              this.ui.clash(this.project(hit), money(e.atk), money(e.against), e.defenderMode);
            }
            await wait(D(110));
            tween(D(340), (k) => { a.c.offset.set(dir.x * reach * (1 - k), 0.12 * (1 - k), dir.z * reach * (1 - k)); }, ease.out).then(() => a.c.offset.set(0, 0, 0));
            a.c.glowT = 0;
            await wait(D(e.defender ? 420 : 200));
            this.atkCtx = null;
          }
          break;
        }
        case 'damage': {
          this.caixaShown[e.player] = e.caixa;
          sfx('damage'); this.bump(e.player === ME ? 0.45 : 0.2);
          this.coins(e.player === ME ? V(0, 0.2, 2.0) : V(0, 0.5, -2.0), Math.min(40, 8 + e.amount / 60));
          if (e.player === ME) { this.pulse('uFlash', 0.5, 650, [0.93, 0.23, 0.19]); this.pulse('uAberr', 0.012, 600); this.oppMood = -0.8; this.lampFlicker(0.5); }
          else { this.oppGlitch = 1; this.oppMood = 1; sfx('glitch'); this.pulse('uGlitch', 0.5, 280); }
          this.refreshHud();
          await wait(D(620));
          break;
        }
        case 'heal': {
          this.caixaShown[e.player] = e.caixa; sfx('heal');
          this.sparkle(e.player === ME ? V(0, 0.4, 1.9) : V(0, 0.6, -1.9), [0.5, 1, 0.55], 28);
          this.refreshHud(); await wait(D(520));
          break;
        }
        case 'lock': { const p = posOf(e.uid); if (p && e.source === 'BCB-008') await this.fx.phoneRec(p); if (p) { this.floatAt(p, 'travada: não ataca', 'bad'); sfx('lock'); this.sparkle(p, [1, 0.8, 0.3], 14); } this.refreshChips(); await wait(D(400)); break; }
        case 'frio': {
          sfx('frost'); this.pulse('uFrost', 0.75, 900);
          this.snow(e.player); this.floatAt(e.player === ME ? V(0, 0.3, 1.0) : V(0, 0.3, -1.0), `frio ×${e.counters}: −$${e.counters * 100} por turno`, 'cold');
          await wait(D(480));
          break;
        }
        case 'drawSkipped':
          if (e.player === ME) this.ui.toast(e.reason === 'hand_limit' ? 'Mão cheia: você compra assim que abrir espaço.' : 'Deck vazio: sem compra.');
          break;
        case 'gameOver': await this.finale(e, D); break;
      }
      void lastCombat;
    }
    for (const [uid, pl] of next) { if (!this.cards.has(uid)) this.ensureCard(uid, pl.side); this.setPlace(uid, pl, { noHop: true }); }
    for (const uid of [...this.cards.keys()]) if (!next.has(uid)) this.removeCard(uid);
    for (const c of this.cards.values()) { c.offset.set(0, 0, 0); c.glowT = 0; }
    this.deckShown = [this.state.players[0].deck.length, this.state.players[1].deck.length];
    this.caixaShown = [this.state.players[0].caixa, this.state.players[1].caixa];
    this.oppMood *= 0.4;
    this.refreshChips();
  }
  /** nível do gelo na tela: 1 no turno em que o Ar Condicionado entra, +1 a cada turno do dono, até 4 (0 = sem ar na mesa) */
  frostLevel() {
    let lv = 0;
    for (const p of this.state.players) for (const fx of p.effects) if (fx && fx.cardId === 'BCB-003' && !fx.faceDown && fx.turnsLeft !== null) lv = Math.max(lv, 4 - fx.turnsLeft + 1);
    return Math.min(4, lv);
  }
  sideOf(uid, prev) { return prev.get(uid)?.side ?? findCreature(this.state, uid)?.side ?? ME; }
  zonePos(kind, side, idx) { const r = kind === 'cr' ? (side === ME ? LAYOUT.myCr : LAYOUT.oppCr) : (side === ME ? LAYOUT.myFx : LAYOUT.oppFx); return V(r[idx].x, 0.02, r[idx].z); }
  directTarget(attackerSide) { return attackerSide === ME ? V(0, 0.6, -TABLE.d / 2 - 0.2) : V(0, 0.6, TABLE.d / 2 + 0.9); }
  snap(c) { this.targetFor(c, this.R.camera); c.pos.copy(c.tPos); c.quat.copy(c.tQuat); c.hop = 0; }
  dissolve(c, a, b, ms) {
    return tween(ms, (k) => { const v = a + (b - a) * k; c.front.material.userData.u.uDissolve.value = v; c.back.material.userData.u.uDissolve.value = v; }, ease.lin);
  }
  async coinFlip(result, D) {
    const coin = this.coin; coin.visible = true; sfx('coin');
    const spins = 5 + (result === 'cara' ? 0 : 0.5);
    await tween(D(900), (k, raw) => { coin.position.set(0, 0.25 + Math.sin(raw * Math.PI) * 2.0, 0); coin.rotation.x = raw * Math.PI * 2 * spins; coin.rotation.z = Math.sin(raw * 9) * 0.2; }, ease.lin);
    coin.rotation.set(result === 'cara' ? 0 : Math.PI, 0, 0); coin.position.y = 0.06;
    sfx('coinLand'); this.bump(0.1); this.puff(V(0, 0.03, 0), 10, [0.8, 0.7, 0.4]);
    this.ui.banner(result === 'coroa' ? 'Coroa' : 'Cara', result === 'coroa' ? 'a atacante fica com metade da força' : 'nada acontece', result === 'coroa' ? 'trap' : 'me');
    await wait(D(800));
    coin.visible = false;
  }
  async finale(e, D) {
    this.over = true; this.setSel(null);
    const win = e.winner === ME, draw = e.winner === 'draw', s = this.state, name = this.names[OP];
    // fecha a partida já (antes da animação): se o jogador sair no meio dela, o resultado certo vai para o lobby
    const out = this.closeMatch(draw ? 'draw' : win ? 'win' : 'loss');
    await wait(D(400));
    if (win) {
      sfx('glitch'); this.oppGlitch = 2; this.pulse('uGlitch', 1, 900);
      await wait(D(700)); this.R.opp.face.uDead.value = 1; this.oppMood = 0; sfx('win');
      await tween(1400, (k) => { this.R.opp.face.uOn.value = 1 - k * 0.75; });
    } else if (!draw) {
      sfx('lose'); this.lampFlicker(1); this.pulse('uFlash', 0.9, 1400, [1, 0.05, 0.02]);
      await tween(1600, (k) => { this.lampOn = 1 - k * 0.92; });
    }
    if (!this.active || this.state !== s) return; // saiu durante a animação ou já começou outra partida
    const camp = this.plan && !this.plan.free ? { stage: this.plan.stage, total: this.plan.total, advanced: !!out?.advanced, finished: !!out?.finished } : null;
    this.ui.gameOver({
      win, draw, me: this.names[ME], rival: name, caixa: [s.players[ME].caixa, s.players[OP].caixa], turns: e.reason === 'turn_limit' ? s.turn - 1 : s.turn, limit: e.reason === 'turn_limit',
      gain: out?.reward ?? 0, training: this.training, camp, free: !!this.plan?.free,
      title: draw ? 'EMPATE' : win ? 'VOCÊ VENCEU' : 'VOCÊ FALIU',
    });
  }

  /** Fecha a partida uma vez só e entrega o resultado ao lobby (main.js grava e devolve recompensa e conquistas). */
  closeMatch(result) {
    if (this.closed || !this.tracker || !this.state) return null;
    this.closed = true;
    const s = this.state;
    return this.onMatchEnd?.({ rival: this.names[OP], result, turns: s.turn, caixa: [s.players[ME].caixa, s.players[OP].caixa], counters: this.tracker.c, training: this.training, startingCaixa: RULES.STARTING_CAIXA, campaignStage: this.plan && !this.plan.free ? this.plan.stage : undefined, rewardMul: this.plan?.reward ?? 1 }) ?? null;
  }
  /** Abandonar uma partida em andamento conta como derrota. */
  forfeit() { if (this.active && !this.over) this.closeMatch('loss'); }

  // ───────── VFX procedurais ─────────
  bump(a) { if (settings.get().shake) this.shake = Math.min(1, this.shake + a); }
  lampKick(a) { this.lampVel += (Math.random() < 0.5 ? -1 : 1) * a * 0.25; }
  lampFlicker(a) { this.flick = Math.max(this.flick ?? 0, a); sfx('flicker'); }
  pulse(name, peak, ms, color) {
    const u = this.gfx.u[name], base = name === 'uAberr' ? this.gfx.base.aberr : 0;
    if (name === 'uFlash') { if (!settings.get().shake) peak *= 0.3; if (color) this.gfx.u.uFlashCol.value.setRGB(...color); }
    tween(ms, (k) => { u.value = base + (peak - base) * (1 - k); }, ease.out).then(() => { u.value = base; });
  }
  puff(p, n, col) {
    this.particles.burst(p, n, () => { const a = Math.random() * 6.28, s = 0.5 + Math.random() * 1.2; return { vx: Math.cos(a) * s, vy: 0.15 + Math.random() * 0.5, vz: Math.sin(a) * s, r: col[0], g: col[1], b: col[2], a: 0.5, size: 0.035 + Math.random() * 0.04, life: 0.5 + Math.random() * 0.5, drag: 3.5, grav: -0.2 }; });
  }
  sparks(p, n) {
    this.particles.burst(p, n, () => { const a = Math.random() * 6.28, s = 1.5 + Math.random() * 4; return { vx: Math.cos(a) * s, vy: 1 + Math.random() * 3.2, vz: Math.sin(a) * s, r: 1, g: 0.55 + Math.random() * 0.4, b: 0.15, size: 0.022 + Math.random() * 0.03, life: 0.35 + Math.random() * 0.55, grav: 9, drag: 1.2, floor: 0.01 }; });
    this.particles.burst(p, 10, () => ({ vx: (Math.random() - 0.5) * 0.8, vy: 0.6, vz: (Math.random() - 0.5) * 0.8, r: 1, g: 1, b: 0.9, size: 0.12, life: 0.12 }));
  }
  embers(p, col, n) {
    this.particles.burst(p, n, () => ({ x: p.x + (Math.random() - 0.5) * CARD.w, z: p.z + (Math.random() - 0.5) * CARD.h, y: p.y + 0.03, vx: (Math.random() - 0.5) * 0.5, vy: 0.5 + Math.random() * 1.6, vz: (Math.random() - 0.5) * 0.5, r: col[0], g: col[1], b: col[2], size: 0.018 + Math.random() * 0.03, life: 0.7 + Math.random() * 0.9, drag: 1.2, grav: -0.5 }));
  }
  sparkle(p, col, n) {
    this.particles.burst(p, n, () => { const a = Math.random() * 6.28, s = 0.3 + Math.random() * 1.1; return { vx: Math.cos(a) * s, vy: (Math.random() - 0.2) * 1.4, vz: Math.sin(a) * s, r: col[0], g: col[1], b: col[2], size: 0.02 + Math.random() * 0.025, life: 0.5 + Math.random() * 0.6, drag: 2.5 }; });
  }
  coins(p, n) {
    this.particles.burst(p.clone().add(V(0, 0.4, 0)), n, () => { const a = Math.random() * 6.28, s = 0.6 + Math.random() * 2.2; return { vx: Math.cos(a) * s, vy: 1.6 + Math.random() * 2.6, vz: Math.sin(a) * s, r: 1, g: 0.78, b: 0.22, size: 0.035, life: 1 + Math.random() * 0.8, grav: 10, drag: 0.4, floor: 0.02 }; });
  }
  snow(side) {
    const z0 = side === ME ? 1 : -1;
    for (let i = 0; i < 70; i++) this.particles.emit({ x: (Math.random() - 0.5) * 5, y: 1.2 + Math.random() * 1.6, z: z0 + (Math.random() - 0.5) * 2.2, vx: (Math.random() - 0.5) * 0.4, vy: -0.6 - Math.random() * 0.7, vz: (Math.random() - 0.5) * 0.3, r: 0.8, g: 0.95, b: 1, size: 0.022, life: 1.2 + Math.random() * 1.2, floor: 0.02, drag: 0.3 });
  }
  oppArm(sx) { const a = this.R.opp.arms[sx < 0 ? 0 : 1]; tween(520, (k, raw) => { a.rotation.x = -Math.sin(raw * Math.PI) * 0.22; a.position.z = Math.sin(raw * Math.PI) * 0.35; }, ease.lin); this.oppTalk = 1; this.oppNod = 1; }
  project(v) {
    const p = v.clone().project(this.R.camera), k = this.gfx.u.uBarrel.value;
    let ux = p.x * 0.5 + 0.5, uy = p.y * 0.5 + 0.5;
    const cx = ux - 0.5, cy = uy - 0.5, r2 = cx * cx + cy * cy; ux -= cx * r2 * k; uy -= cy * r2 * k;
    return { x: ux * this.gfx.w, y: (1 - uy) * this.gfx.h, behind: p.z > 1 };
  }
  floatAt(pos, text, cls) { if (!pos) return; const s = this.project(pos); this.ui.float(s.x, s.y, text, cls); }
  buildArrow() {
    const N = 16, mat = new THREE.MeshBasicMaterial({ color: 0xff4a34 });
    this.arrow = new THREE.Group(); this.arrow.visible = false;
    this.arrowDots = [];
    for (let i = 0; i < N; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.13), mat); this.arrow.add(m); this.arrowDots.push(m); }
    this.arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4), mat); this.arrow.add(this.arrowHead);
    this.arrowMat = mat; this.arrow.traverse((o) => o.layers.set(LAYER.GLOW)); this.R.scene.add(this.arrow);
  }
  updateArrow(t) {
    const s = this.sel;
    if (!s || s.stage !== 'target' || !s.attacker || !this.cards.get(s.attacker)) { this.arrow.visible = false; return; }
    const from = this.cards.get(s.attacker).group.position;
    let to;
    if (this.hoverUid && s.selectable.has(this.hoverUid)) to = this.cards.get(this.hoverUid).group.position.clone();
    else if (s.allowNull && this.hoverPick === 'opp') to = V(0, 0.9, -TABLE.d / 2 - 0.3);
    else { this.setRay(this.R.camera); const o = this.ray.ray.origin, d = this.ray.ray.direction, k = (0.05 - o.y) / d.y; to = k > 0 ? o.clone().addScaledVector(d, Math.min(k, 14)) : from.clone(); }
    this.arrow.visible = true;
    const mid = from.clone().lerp(to, 0.5); mid.y += 0.5 + from.distanceTo(to) * 0.22;
    const P = (u) => V().addScaledVector(from, (1 - u) * (1 - u)).addScaledVector(mid, 2 * (1 - u) * u).addScaledVector(to, u * u);
    const n = this.arrowDots.length;
    this.arrowDots.forEach((m, i) => { const u = ((i + (t * 1.6) % 1) / n) * 0.93 + 0.03; m.position.copy(P(u)); m.lookAt(P(Math.min(1, u + 0.02))); });
    this.arrowHead.position.copy(P(0.985)); this.arrowHead.lookAt(P(1).add(P(1).sub(P(0.95)))); this.arrowHead.rotateX(Math.PI / 2);
    const valid = (this.hoverUid && s.selectable.has(this.hoverUid)) || (s.allowNull && this.hoverPick === 'opp');
    this.arrowMat.color.setHex(valid ? 0xff3a22 : 0xb98a2a);
  }
  buildCoin() {
    const side = new THREE.MeshBasicMaterial({ color: 0x8a6a1c });
    this.coin = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 14), [side, new THREE.MeshBasicMaterial({ map: coinTexture('$', 'CARA') }), new THREE.MeshBasicMaterial({ map: coinTexture('♛', 'COROA') })]);
    this.coin.visible = false; this.coin.layers.set(LAYER.FX); this.R.scene.add(this.coin);
  }

  // ───────── entrada ─────────
  bindInput() {
    const el = this.gfx.renderer.domElement;
    el.addEventListener('pointermove', (e) => { this.mouse.x = e.clientX / this.gfx.w; this.mouse.y = e.clientY / this.gfx.h; this.onMove(e); });
    el.addEventListener('pointerdown', (e) => { if (!this.active) return; if (e.button === 2) { this.cancel(); return; } this.mouse.x = e.clientX / this.gfx.w; this.mouse.y = e.clientY / this.gfx.h; const h = this.pick(); this.mouse.down = { x: e.clientX, y: e.clientY, uid: h.uid ?? null, pick: h.pick ?? null }; });
    window.addEventListener('pointerup', (e) => { if (!this.active || e.button === 2) return; this.onUp(e); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      if (!this.active || e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape') this.cancel();
      else if (e.key === ' ' || e.key === 'e' || e.key === 'E') { e.preventDefault(); this.pressEnd(); }
      else if (e.key === 'b' || e.key === 'B') this.pressBattle();
      else if (e.key === 'l' || e.key === 'L') this.ui.toggleLog();
      else if (this.sel?.stage === 'menu') { const k = e.key.toLowerCase(), ks = this.sel.kinds; const hit = k === 'a' ? ks.find((x) => x === 'summon:ATK' || x === 'attack' || x === 'goAttack') : k === 'd' ? ks.find((x) => x === 'summon:DEF' || x === 'changeMode') : k === 'enter' ? ks[0] : null; if (hit) this.pickMenu(hit); }
    });
    this.ui.on({
      battle: () => this.pressBattle(), end: () => this.pressEnd(), menuPick: (k) => this.pickMenu(k), cancel: () => this.cancel(),
      direct: () => this.pickDirect(), again: () => (this.rematch ? this.rematch() : this.newGame()),
    });
  }
  setRay(cam) {
    const k = this.gfx.u.uBarrel.value, ux = this.mouse.x, uy = 1 - this.mouse.y, cx = ux - 0.5, cy = uy - 0.5, r2 = cx * cx + cy * cy;
    this.ray.setFromCamera(new THREE.Vector2((ux + cx * r2 * k) * 2 - 1, (uy + cy * r2 * k) * 2 - 1), cam);
  }
  pick() {
    this.setRay(this.R.camera);
    const objs = [];
    for (const c of this.cards.values()) { objs.push(c.front, c.back); if (c.hit.visible) objs.push(c.hit); }
    objs.push(this.R.bell, this.R.opp.group, this.R.decks[0], this.R.decks[1]);
    const hits = this.ray.intersectObjects(objs, true);
    // cartas da mão têm prioridade (ficam na frente de tudo)
    let best = null;
    for (const h of hits) {
      const uid = h.object.userData.uid;
      if (uid) { const c = this.cards.get(uid); if (c?.place?.kind === 'hand' && c.place.side === ME) { if (!best || best.dist > h.distance - (uid === this.hoverUid ? 0.3 : 0)) best = { uid, dist: h.distance - (uid === this.hoverUid ? 0.3 : 0) }; } }
    }
    if (best) return { uid: best.uid };
    for (const h of hits) {
      if (h.object.userData.uid) return { uid: h.object.userData.uid };
      let o = h.object; while (o) { if (o === this.R.bell) return { pick: 'bell' }; if (o === this.R.opp.group) return { pick: 'opp' }; if (o === this.R.decks[0]) return { pick: 'deck0' }; if (o === this.R.decks[1]) return { pick: 'deck1' }; o = o.parent; }
    }
    return {};
  }
  onMove(e) {
    if (!this.active) return;
    const d = this.mouse.down;
    if (d && !this.mouse.dragging && d.uid && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 9 && this.canAct()) {
      const c = this.cards.get(d.uid);
      if (c?.place?.kind === 'hand' && c.place.side === ME && this.handCands(c).length) { this.setSel(null); this.mouse.dragging = d.uid; sfx('select'); this.refreshGlows(); this.dragHint(c); }
      else if (c?.place?.kind === 'cr' && c.place.side === ME && this.state.phase === 'battle' && this.legal.some((a) => a.type === 'attack' && a.uid === d.uid)) { if (this.sel?.attacker !== d.uid) this.clickCreature(d.uid); this.mouse.dragAtk = true; }
    }
  }
  onUp(e) {
    const d = this.mouse.down; this.mouse.down = null;
    if (this.mouse.dragging) {
      const uid = this.mouse.dragging, c = this.cards.get(uid); this.mouse.dragging = null;
      // soltar sobre a mesa = jogar; soltar de volta na mão = cancelar
      this.slotGlow.visible = false; this.ui.prompt(null);
      if (c && this.mouse.y < 0.74) this.clickHand(uid); else sfx('cancel');
      this.refreshGlows();
      return;
    }
    if (this.mouse.dragAtk) {
      this.mouse.dragAtk = false;
      const h = this.pick();
      if (this.sel?.stage === 'target' && ((h.uid && this.sel.selectable.has(h.uid)) || (h.pick === 'opp' && this.sel.allowNull))) this.clickAt(h); else this.cancel();
      return;
    }
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 9 || e.target !== this.gfx.renderer.domElement) return;
    this.clickAt(this.pick());
  }
  clickAt(h) {
    if (this.over) return;
    if (h.uid) {
      const c = this.cards.get(h.uid), p = c?.place;
      if (!p) return;
      if (p.kind === 'hand' && p.side === ME) return this.clickHand(h.uid);
      if (p.kind === 'cr') return this.clickCreature(h.uid);
      if (this.sel) this.cancel();
      return;
    }
    if (h.pick === 'bell') return this.pressEnd();
    if (h.pick === 'opp') { if (this.sel?.stage === 'target' && this.sel.allowNull) return this.pickDirect(); }
    if (this.sel) this.cancel();
  }
  pressEnd() {
    if (this.sel && this.sel.stage !== 'menu') { this.ui.toast('Conclua a escolha ou Esc.'); sfx('deny'); return; }
    if (!this.canAct() || !this.legal.some((a) => a.type === 'endTurn')) { if (this.myTurn() && !this.busy) { this.ui.toast('Mão cheia: jogue ou descarte antes de encerrar.'); sfx('deny'); } return; }
    if (this.attacksLeft() && performance.now() - (this.endArmed ?? 0) > 4000) { this.endArmed = performance.now(); this.ui.toast('Ainda dá para atacar. Aperte de novo para encerrar.'); sfx('deny'); return; }
    this.endArmed = 0;
    const b = this.R.bell.userData.btn; tween(220, (k, raw) => { b.position.y = 0.36 - Math.sin(raw * Math.PI) * 0.07; }, ease.lin);
    sfx('bell'); this.apply({ type: 'endTurn' });
  }
  pressBattle() {
    if (!this.canAct()) return;
    if (this.sel && this.sel.stage !== 'menu') { this.ui.toast('Conclua a escolha ou Esc.'); sfx('deny'); return; }
    if (!this.legal.some((a) => a.type === 'enterBattle')) { if (this.state.phase === 'main') { this.ui.toast(this.state.turn === 1 ? 'No 1º turno ninguém ataca.' : 'Mão cheia: jogue ou descarte uma carta antes da batalha.'); sfx('deny'); } return; }
    this.apply({ type: 'enterBattle' });
  }
  handCands(c) { return this.legal.filter((a) => PLAY_TYPES.has(a.type) && this.cardIndex.get(a.uid) === c.cardId).map((a) => ({ ...a, uid: c.uid })); }
  clickHand(uid) {
    const c = this.cards.get(uid);
    if (!this.myTurn()) { this.ui.toast('Espere a sua vez.'); sfx('deny'); return; }
    if (this.busy) return;
    if (this.sel?.uid === uid && this.sel.stage === 'menu') return this.cancel();
    const cands = this.handCands(c);
    if (!cands.length) { this.ui.toast(this.whyNot(c.cardId)); sfx('deny'); this.setSel(null); if (cardDef(c.cardId).cost && this.state.phase === 'main') this.ui.tutor('cost', { title: 'Custo', anchor: 'sheet', html: 'Cada <b>✕</b> = 1 criatura sua <b>sacrificada</b>. Comece pelas sem ✕.' }); return; }
    sfx('select');
    this.resolve(cands, { menu: true, uid });
  }
  clickCreature(uid) {
    const s = this.sel, side = this.cards.get(uid).place.side;
    if (s?.stage === 'multi' && s.selectable.has(uid)) {
      s.picks = s.picks.includes(uid) ? s.picks.filter((x) => x !== uid) : [...s.picks, uid]; sfx('select');
      if (s.picks.length === s.needed) { const key = [...s.picks].sort().join(','); return this.resolve(s.cands.filter((a) => sacKey(a) === key), { setsDone: true, uid: s.uid }); }
      this.refreshSel(); return;
    }
    if (s?.stage === 'target' && s.selectable.has(uid)) return this.resolve(s.cands.filter((a) => tgtOf(a) === uid), { setsDone: true, targetDone: true, uid: s.uid });
    if (!this.myTurn()) { this.ui.toast('Espere a sua vez.'); sfx('deny'); return; }
    if (this.busy) return;
    if (side !== ME) { if (this.state.phase === 'battle') { this.ui.toast('Escolha a atacante primeiro.'); sfx('deny'); } this.setSel(null); return; }
    if (s?.uid === uid) return this.cancel();
    const cands = this.legal.filter((a) => (a.type === 'changeMode' || a.type === 'attack') && a.uid === uid);
    if (this.state.phase === 'main' && this.couldAttack(uid)) { sfx('select'); return this.setSel({ stage: 'menu', cands, uid, kinds: ['goAttack', ...new Set(cands.map(menuKey))] }); }
    if (!cands.length) {
      const f = findCreature(this.state, uid);
      this.ui.toast(this.state.phase === 'battle'
        ? (f.c.mode === 'DEF' ? 'Criatura em defesa não ataca.' : f.c.attacksThisTurn >= maxAttacks(f.c.cardId) ? 'Ela já atacou neste turno.' : 'Ela está travada e não ataca agora.')
        : (f.c.enteredTurn === this.state.turn ? 'Ela entrou agora: só muda de posição no próximo turno.' : 'É 1 mudança de posição por turno.'));
      sfx('deny'); this.setSel(null); return;
    }
    sfx('select');
    this.resolve(cands, { menu: cands[0].type !== 'attack', uid, attacker: cands[0].type === 'attack' ? uid : null });
  }
  resolve(cands, o = {}) {
    const uniq = [...new Map(cands.map((a) => [JSON.stringify(a), a])).values()];
    if (!uniq.length) return this.setSel(null);
    const kinds = [...new Set(uniq.map(menuKey))];
    if (kinds.length > 1 || o.menu) return this.setSel({ stage: 'menu', cands: uniq, uid: o.uid, kinds });
    const a = uniq[0];
    if (!o.setsDone && uniq.some((x) => sacKey(x) !== '')) {
      const needed = a.type === 'summon' ? a.sacrifices.length : a.costs?.length ?? 0, pl = needed > 1;
      return this.setSel({ stage: 'multi', cands: uniq, uid: o.uid, needed, picks: [], selectable: new Set(uniq.flatMap((x) => sacKey(x).split(',').filter(Boolean))),
        label: `Sacrifique ${needed} criatura${pl ? 's' : ''} sua${pl ? 's' : ''}` });
    }
    const tg = new Set(uniq.map(tgtOf));
    if (!o.targetDone && [...tg].some((t) => t !== null)) {
      const atk = a.type === 'attack';
      return this.setSel({ stage: 'target', cands: uniq, uid: o.uid, attacker: atk ? a.uid : null, selectable: new Set([...tg].filter((t) => t !== null)), allowNull: tg.has(null),
        nullLabel: atk ? 'Atacar o CAIXA' : 'Pular efeito', label: atk ? 'Escolha quem atacar' : a.type === 'summon' ? 'Escolha o alvo' : 'Escolha o alvo' });
    }
    if (a.type === 'attack' && a.target === null && !o.targetDone)
      return this.setSel({ stage: 'target', cands: uniq, uid: o.uid, attacker: a.uid, selectable: new Set(), allowNull: true, nullLabel: 'Atacar o CAIXA', label: 'Mesa do rival vazia' });
    this.apply(a);
  }
  pickMenu(key) {
    const s = this.sel; if (s?.stage !== 'menu') return;
    sfx('select');
    if (key === 'goAttack') { const uid = s.uid; this.apply({ type: 'enterBattle' }).then(() => { if (this.canAct() && this.cards.get(uid)?.place?.kind === 'cr') this.clickCreature(uid); }); return; }
    this.resolve(s.cands.filter((a) => menuKey(a) === key), { uid: s.uid });
  }
  // a criatura poderia atacar se entrássemos na batalha agora?
  couldAttack(uid) {
    if (!this.legal.some((a) => a.type === 'enterBattle')) return false;
    const f = findCreature(this.state, uid); return !!f && f.side === ME && canAttack(this.state, f);
  }
  attacksLeft() {
    if (!this.canAct()) return false;
    if (this.state.phase === 'battle') return this.legal.some((a) => a.type === 'attack');
    return creaturesOf(this.state, ME).some((f) => this.couldAttack(f.c.uid));
  }
  dragHint(c) {
    const def = cardDef(c.cardId), p = this.state.players[ME];
    this.ui.prompt({ icon: 'hand', text: 'Solte na mesa para jogar', cancel: false });
    if (!isEffect(def) && !def.cost) { const z = p.creatures.indexOf(null); if (z >= 0) this.showSlot('cr', z); }
    else if (def.kind === 'effect_trap' || def.durationTurns) { const z = p.effects.indexOf(null); if (z >= 0) this.showSlot('fx', z); }
  }
  pickDirect() { const s = this.sel; if (s?.stage === 'target' && s.allowNull) this.resolve(s.cands.filter((a) => tgtOf(a) === null), { setsDone: true, targetDone: true, uid: s.uid }); }
  cancel() { if (this.sel) { sfx('cancel'); this.setSel(null); } this.mouse.dragging = null; }
  whyNot(cardId) {
    const s = this.state, p = s.players[ME], d = cardDef(cardId);
    if (s.phase === 'battle') return 'Batalha em curso: cartas só no próximo turno.';
    if (d.kind === 'creature' || d.kind === 'entity') {
      if (p.summonsThisTurn >= RULES.SUMMONS_PER_TURN) return 'Invocação do turno já usada.';
      const n = p.creatures.filter(Boolean).length, c = d.cost ?? 0;
      return c > n ? `Precisa de ${c} criatura${c > 1 ? 's' : ''} na mesa para sacrificar.` : 'Fileira de criaturas cheia.';
    }
    const ab = d.abilities.find((a) => a.trigger === 'on_play');
    if (ab?.playCost?.sendOwnCreaturesToDead) return `Custa ${ab.playCost.sendOwnCreaturesToDead} criaturas suas da mesa.`;
    if (ab?.choose) return 'Sem criatura na mesa para o efeito.';
    return p.effects.some((e) => e === null) ? 'Não dá para usar agora.' : 'Fileira de efeitos cheia.';
  }
  setSel(sel) { this.sel = sel; this.refreshSel(); if (this.state) this.refreshHud(); }
  refreshSel() {
    const s = this.sel;
    this.slotGlow.visible = false;
    if (!s) { this.ui.menu(null); this.ui.prompt(null); this.refreshGlows(); return; }
    if (s.stage === 'menu') {
      const def = cardDef(this.cardIndex.get(s.uid)), f = findCreature(this.state, s.uid);
      const opt = (k) => {
        if (k === 'summon:ATK') return { icon: 'atk', tone: 'atk', label: 'Invocar em ataque', keycap: 'A', sub: 'Pode atacar. Se perder, a diferença sai do seu CAIXA.' };
        if (k === 'summon:DEF') return { icon: 'def', tone: 'def', label: 'Invocar em defesa', keycap: 'D', sub: 'Não ataca. Se for destruída, o seu CAIXA não sofre.' };
        if (k === 'playEffect') return { icon: 'fx', label: 'Usar efeito', keycap: 'Enter', sub: def.durationTurns ? `Fica na mesa por ${def.durationTurns} turnos seus.` : 'Vale agora. Depois a carta vai para o Morto.' };
        if (k === 'setTrap') return { icon: 'trap', label: 'Armar armadilha', keycap: 'Enter', sub: 'Fica virada para baixo e dispara quando o rival atacar.' };
        if (k === 'discard') return { icon: 'bin', tone: 'stop', label: 'Descartar', sub: 'Manda a carta para o Morto.' };
        if (k === 'goAttack' || k === 'attack') return { icon: 'atk', tone: 'atk', label: 'Atacar', keycap: 'A', sub: k === 'goAttack' ? 'Começa a batalha. Depois, nada de jogar cartas.' : 'Escolha o alvo em seguida.' };
        if (k === 'changeMode') return f?.c.mode === 'ATK' ? { icon: 'swap', label: 'Passar para defesa', keycap: 'D', sub: 'Para de atacar e protege o seu CAIXA. 1 vez por turno.' } : { icon: 'swap', label: 'Passar para ataque', keycap: 'D', sub: 'Volta a poder atacar. 1 vez por turno.' };
        return { label: k };
      };
      const a = s.cands[0] ?? { type: 'none' };
      const note = f ? (f.c.mode === 'ATK' ? 'em ataque' : 'em defesa') : isEffect(def) ? (def.kind === 'effect_trap' ? 'armadilha' : 'efeito') : def.cost ? `custo: ${def.cost} sacrifício${def.cost > 1 ? 's' : ''}` : 'custo: grátis';
      this.ui.menu({ title: def.name, note, options: s.kinds.map((k) => ({ key: k, ...opt(k) })) });
      this.ui.prompt(null);
      if (s.kinds.some((k) => k.startsWith('summon'))) this.ui.tutor('modes', { title: 'Ataque ou defesa', anchor: 'menu', html: '<b>Em pé</b>: ataca, mas se perder você paga a diferença. <b>Deitada</b>: só protege, seu CAIXA fica a salvo.' });
      if (a.type === 'summon') { const z = this.state.players[ME].creatures.indexOf(null); if (z >= 0 && !def.cost) this.showSlot('cr', z); }
      if (a.type === 'setTrap' || (a.type === 'playEffect' && def.durationTurns)) { const z = this.state.players[ME].effects.indexOf(null); if (z >= 0) this.showSlot('fx', z); }
    } else {
      this.ui.menu(null);
      this.ui.prompt({
        icon: s.stage === 'multi' ? 'summon' : s.attacker ? 'atk' : 'arrow', text: s.label,
        count: s.stage === 'multi' && s.needed > 1 ? { n: s.picks.length, of: s.needed } : null,
        action: s.stage === 'target' && s.allowNull ? { act: 'direct', label: s.nullLabel, tone: s.attacker ? 'danger' : 'secondary', icon: s.attacker ? 'atk' : null } : null,
      });
    }
    this.refreshGlows();
  }
  showSlot(kind, idx) { const p = this.zonePos(kind, ME, idx); this.slotGlow.position.set(p.x, 0.008, p.z); this.slotGlow.visible = true; this.slotGlow.material.uniforms.uAlpha.value = 0.9; this.slotGlow.material.uniforms.uColor.value.setHex(COL.play); }
  refreshGlows() {
    const s = this.sel, can = this.canAct();
    for (const c of this.cards.values()) {
      let col = null;
      const p = c.place;
      if (!p) continue;
      if (s && s.stage === 'multi') col = s.picks.includes(c.uid) ? COL.picked : s.selectable.has(c.uid) ? COL.pick : null;
      else if (s && s.stage === 'target') col = s.selectable.has(c.uid) ? COL.foe : c.uid === s.attacker ? COL.pick : null;
      else if (s && s.stage === 'menu') col = c.uid === s.uid ? COL.pick : null;
      else if (can && p.side === ME) {
        if (p.kind === 'hand' && this.legal.some((a) => PLAY_TYPES.has(a.type) && this.cardIndex.get(a.uid) === c.cardId)) col = COL.play;
        else if (p.kind === 'cr' && this.state.phase === 'battle' && this.legal.some((a) => a.type === 'attack' && a.uid === c.uid)) col = COL.play;
      }
      if (this.atkCtx?.c === c) continue;
      c.glowT = col === null ? 0 : 1;
      if (col !== null) c.glow.material.uniforms.uColor.value.setHex(col);
      // escurece criaturas que não podem agir na batalha
      const dim = can && !s && this.state.phase === 'battle' && p.kind === 'cr' && p.side === ME && !this.legal.some((a) => a.type === 'attack' && a.uid === c.uid);
      const dimHand = can && p.kind === 'hand' && p.side === ME && col === null && !(s && s.uid === c.uid) && this.mouse.dragging !== c.uid;
      c.front.material.userData.u.uDim.value = dim ? 0.55 : dimHand ? 0.62 : 1;
    }
    this.refreshChips();
  }

  // ───────── HUD ─────────
  refreshHud(activeOverride, phaseOverride) {
    const s = this.state, can = this.canAct(), battle = this.legal.some((a) => a.type === 'enterBattle'), end = this.legal.some((a) => a.type === 'endTurn');
    const other = can ? this.legal.filter((a) => a.type !== 'endTurn' && a.type !== 'changeMode') : [];
    const active = activeOverride ?? s.active, over = s.phase === 'over', mine = active === ME && !over, phase = phaseOverride ?? s.phase;
    const folder = (i) => {
      const p = s.players[i], frio = Object.values(p.frio).reduce((a, b) => a + b, 0), meta = [];
      if (i === OP) meta.push({ icon: 'hand', text: `${p.hand.length} carta${p.hand.length === 1 ? '' : 's'} na mão`, title: 'Cartas na mão do rival' });
      if (frio) meta.push({ icon: 'cold', tone: 'cold', html: `Frio ×${frio}: perde <b>${C_money(frio * 100)}</b> por turno`, title: 'No início de cada turno, perde $100 por marcador de Frio' });
      return { who: i === ME ? 'me' : 'opp', name: this.names[i], caixa: this.caixaShown[i], max: RULES.STARTING_CAIXA, active: !over && active === i, meta };
    };
    this.ui.setFolders({ me: folder(ME), opp: folder(OP), mine, over });
    const me = s.players[ME], canAtk = can && (s.phase === 'battle' ? this.legal.some((a) => a.type === 'attack') : this.attacksLeft());
    const atkN = mine ? (s.phase === 'battle' ? new Set(this.legal.filter((a) => a.type === 'attack').map((a) => a.uid)).size : creaturesOf(s, ME).filter((f) => this.couldAttack(f.c.uid)).length) : 0;
    const plays = other.some((a) => PLAY_TYPES.has(a.type)), idle = can && !plays && !canAtk;
    const END = { act: 'end', label: 'Encerrar turno', keycap: 'Espaço', disabled: !(can && end) };
    const BAT = { act: 'battle', label: 'Ir para a batalha', keycap: 'B', disabled: !(can && battle) };
    let primary, secondary = null;
    if (!mine) primary = { act: 'end', label: over ? 'Partida encerrada' : 'Aguarde a sua vez', disabled: true };
    else if (phase === 'main' && battle && canAtk) { primary = { ...BAT, ready: !plays }; secondary = END; }
    else primary = { ...END, ready: idle || (phase === 'battle' && !canAtk) };
    this.ui.setTurn({
      mine, over, turn: s.turn, who: this.names[OP], phase, coach: this.coachLine(can, other), primary, secondary,
      res: mine ? [
        { icon: 'summon', label: 'Invocação', value: me.summonsThisTurn >= RULES.SUMMONS_PER_TURN ? 'usada' : phase === 'battle' ? 'antes da batalha' : 'livre', on: me.summonsThisTurn < RULES.SUMMONS_PER_TURN && phase !== 'battle', title: 'Você pode invocar 1 criatura por turno, antes da batalha' },
        s.turn === 1 ? { icon: 'atk', label: 'Ataques', value: 'no turno 2', on: false } : { icon: 'atk', label: 'Ataques', value: atkN ? `${atkN} pronto${atkN > 1 ? 's' : ''}` : 'nenhum', on: atkN > 0, title: 'Criaturas suas em ataque que ainda podem atacar neste turno' },
      ] : [],
    });
    const lim = this.myTurn() ? handLimitStatus(s) : 'ok';
    this.ui.limit(lim === 'ok' ? null : lim === 'play_cards' ? 'Mão cheia (10). Jogue uma carta para voltar a comprar.' : 'Mão e mesa cheias. Descarte uma carta da mão.');
  }
  coachLine(can, other) {
    const s = this.state;
    if (s.phase === 'over') return '';
    if (s.active !== ME) return `${this.names[OP]} está jogando.`;
    if (!can) return '';
    if (this.sel && this.sel.stage !== 'menu') return 'Conclua a escolha do topo ou Esc.';
    if (handLimitStatus(s) !== 'ok') return 'Mão cheia: jogue ou descarte.';
    if (s.phase === 'battle') return this.legal.some((a) => a.type === 'attack') ? 'Escolha quem ataca.' : 'Sem ataques. Encerre o turno.';
    if (other.some((a) => PLAY_TYPES.has(a.type))) return s.players[ME].summonsThisTurn ? 'Ainda dá para usar efeitos.' : 'Jogue uma carta verde.';
    if (this.attacksLeft()) return 'Você pode atacar.';
    return s.turn === 1 ? '1º turno: sem ataques. Encerre.' : 'Nada mais a fazer. Encerre.';
  }
  refreshChips() { this.chipsDirty = true; }
  buildChips() {
    const s = this.state, out = [];
    for (const side of [ME, OP]) {
      const p = s.players[side];
      p.creatures.forEach((c) => {
        if (!c || this.cards.get(c.uid)?.place?.kind !== 'cr') return;
        const st = statsOf(s, c.uid), d = cardDef(c.cardId), tone = (v, b) => (v > b ? 'up' : v < b ? 'down' : null);
        out.push({ id: c.uid, uid: c.uid, chip: { kind: 'creature', atk: st.atk, def: st.def, mode: c.mode, atkTone: tone(st.atk, d.atk ?? 0), defTone: tone(st.def, d.def ?? 0), locked: c.lockedUntilOwnerTurn > 0 && c.lockedUntilOwnerTurn >= p.turnsStarted, multi: maxAttacks(c.cardId) > 1 } });
      });
      p.effects.forEach((e) => {
        if (!e || this.cards.get(e.uid)?.place?.kind !== 'fx') return;
        if (e.faceDown) out.push({ id: e.uid, uid: e.uid, chip: { kind: 'trap', mine: side === ME } });
        else if (e.turnsLeft !== null) out.push({ id: e.uid, uid: e.uid, chip: { kind: 'duration', turns: e.turnsLeft } });
      });
      const dk = side === ME ? LAYOUT.myDeck : LAYOUT.oppDeck, dd = side === ME ? LAYOUT.myDead : LAYOUT.oppDead, off = -CARD.h * 0.5 - 0.3;
      out.push({ id: `deck${side}`, pos: V(dk.x, 0.05 + this.deckShown[side] * 0.006, dk.z + off), chip: { kind: 'pile', icon: 'deck', label: 'deck', n: this.deckShown[side] } });
      if (p.dead.length) out.push({ id: `dead${side}`, pos: V(dd.x, 0.05, dd.z + off), chip: { kind: 'pile', icon: 'dead', label: 'morto', n: p.dead.length } });
    }
    return out;
  }
  // dicas de primeira vez, disparadas pelo contexto
  autoTips() {
    const s = this.state, ui = this.ui;
    if (s.active === ME) {
      ui.tutor('start', { ctx: 'me', title: 'Objetivo', anchor: 'folder', html: 'Zere o <b>CAIXA</b> do rival (pasta de cima). O seu é a de baixo.' });
      ui.tutor('hand', { ctx: 'me', title: 'Sua mão', anchor: 'hand', html: '<b>Contorno verde</b> = pode jogar. Clique ou arraste para a mesa.' });
      ui.tutor('turn', { ctx: 'me', title: 'Próximo passo', anchor: 'turn', html: 'O botão grande é o <b>próximo passo</b>. Pulsando: nada mais a fazer.' });
      if (s.phase === 'main' && this.attacksLeft()) ui.tutor('battle', { ctx: 'me', title: 'Atacar', anchor: 'turn', html: 'Clique numa criatura e escolha <b>Atacar</b>. O resultado aparece antes de confirmar. Jogue suas cartas antes da batalha.' });
      if (s.players[OP].effects.some((e) => e?.faceDown)) ui.tutor('trap', { ctx: 'me', title: 'Armadilha', anchor: 'top', html: 'Carta do rival <b>virada</b> = armadilha. Pode anular seu ataque.' });
    } else ui.tutor('foe', { ctx: 'foe', title: 'Vez do rival', anchor: 'top', html: 'A jogada dele aparece à esquerda. Tudo fica no <b>Relatório</b>.' });
  }
  detailFor(uid) {
    const c = this.cards.get(uid), p = c?.place; if (!p) return null;
    const s = this.state;
    if (p.kind === 'hand' && p.side === OP) return { faceDown: true, notes: [`Mão de ${this.names[OP]}: ${p.n} carta${p.n > 1 ? 's' : ''}.`] };
    if (p.kind === 'fx' && p.faceDown && p.side === OP) return { faceDown: true, notes: ['Armadilha do rival: dispara no seu ataque.'] };
    const owner = p.side === ME ? 'me' : 'opp';
    if (p.kind === 'hand') {
      const playable = this.legal.some((a) => PLAY_TYPES.has(a.type) && this.cardIndex.get(a.uid) === c.cardId);
      return { cardId: c.cardId, where: 'hand', owner, status: !this.myTurn() ? { tone: 'info', text: 'Jogue na sua vez.' } : playable ? { tone: 'go', text: 'Clique ou arraste.' } : { tone: 'stop', text: this.whyNot(c.cardId) } };
    }
    if (p.kind === 'cr') {
      const f = findCreature(s, uid); if (!f) return { cardId: c.cardId, where: 'table', owner };
      const pl = s.players[f.side], notes = [f.c.mode === 'ATK' ? 'Em ataque (em pé).' : 'Em defesa (deitada).'];
      if (f.c.lockedUntilOwnerTurn > 0 && f.c.lockedUntilOwnerTurn >= pl.turnsStarted) notes.push('Travada: não ataca por enquanto.');
      for (const m of f.c.mods) {
        const t = [];
        if (m.mulAtk !== undefined && m.mulAtk !== 1) t.push(m.mulAtk < 1 ? 'força pela metade' : `×${m.mulAtk}`);
        if (m.atk) t.push(`ATQ ${m.atk > 0 ? '+' : '−'}${Math.abs(m.atk)}`); if (m.def) t.push(`DEF ${m.def > 0 ? '+' : '−'}${Math.abs(m.def)}`);
        if (t.length) notes.push(`${cardDef(m.source).name}: ${t.join(', ')}${m.until === 'end_of_turn' ? ' (até o fim do turno)' : ''}`);
      }
      const cur = statsOf(s, uid), d = cardDef(c.cardId);
      if ((cur.atk !== (d.atk ?? 0) || cur.def !== (d.def ?? 0)) && !f.c.mods.length) notes.push('Valores alterados por outras cartas na mesa.');
      return { cardId: c.cardId, where: 'table', owner, cur, notes };
    }
    if (p.kind === 'fx') {
      const e = s.players[p.side].effects[p.idx];
      return { cardId: c.cardId, where: 'table', owner, notes: [p.faceDown ? 'Sua armadilha: o rival não vê.' : e?.turnsLeft != null ? `Na mesa por mais ${e.turnsLeft} turno${e.turnsLeft > 1 ? 's' : ''} do dono.` : 'Efeito na mesa.'] };
    }
    if (p.kind === 'dead') {
      const dead = s.players[p.side].dead;
      return { cardId: dead[dead.length - 1].cardId, where: 'dead', owner, notes: [`Morto de ${p.side === ME ? 'você' : this.names[OP]}: ${dead.length} carta${dead.length > 1 ? 's' : ''}.`, `Últimas: ${dead.slice(-3).reverse().map((d) => cardDef(d.cardId).name).join(', ')}`] };
    }
    return { cardId: c.cardId, owner };
  }
  previewFor(uid) {
    const s = this.sel; if (!s || s.stage !== 'target' || !s.attacker) return null;
    const pv = previewAttack(this.state, s.attacker, uid); if (!pv) return null;
    return { ...pv, trap: this.state.players[OP].effects.some((e) => e?.faceDown) };
  }
  whoOf(e, prev) {
    if (e.player !== undefined && e.type !== 'damage' && e.type !== 'heal' && e.type !== 'frio') return e.player === ME ? 'me' : 'opp';
    if (e.type === 'damage' || e.type === 'heal' || e.type === 'frio') return e.player === ME ? 'me' : 'opp';
    const u = e.attacker ?? e.uid; if (!u) return 'sys';
    return this.sideOf(u, prev ?? new Map()) === ME ? 'me' : 'opp';
  }

  // ───────── por quadro ─────────
  update(dt, t) {
    const R = this.R, cam = R.camera;
    this.oppBob = Math.sin(t * 1.1) * 0.03;
    // hover
    this.pickTick = (this.pickTick ?? 0) + 1;
    const moved = this.mouse.x !== this.lastMx || this.mouse.y !== this.lastMy;
    if (this.active && !this.mouse.dragging && (moved || this.pickTick % 6 === 0)) {
      this.lastMx = this.mouse.x; this.lastMy = this.mouse.y;
      const h = this.ui.pointerOverUi ? {} : this.pick(), hu = h.uid ?? null, hp = h.pick ?? null;
      if (hu !== this.hoverUid || hp !== this.hoverPick) {
        this.hoverUid = hu; this.hoverPick = hp;
        if (h.uid) { const c = this.cards.get(h.uid); if (c?.place?.kind === 'hand' && c.place.side === ME) sfx('hover'); }
        this.ui.detail(this.hoverUid ? this.detailFor(this.hoverUid) : null);
        const tgt = this.hoverUid && this.sel?.stage === 'target' && this.sel.selectable.has(this.hoverUid) ? this.previewFor(this.hoverUid)
          : this.hoverPick === 'opp' && this.sel?.stage === 'target' && this.sel.allowNull && this.sel.attacker ? this.previewFor(null) : null;
        this.ui.preview(tgt);
        const clickable = (h.uid && this.isClickable(h.uid)) || (h.pick === 'bell' && this.canAct()) || (h.pick === 'opp' && this.sel?.allowNull);
        this.gfx.renderer.domElement.style.cursor = clickable ? 'pointer' : 'default';
        const tip = h.pick === 'bell' ? 'Campainha: encerrar turno (Espaço)' : h.pick === 'deck0' ? `Seu deck: ${this.state.players[ME].deck.length} cartas` : h.pick === 'deck1' ? `Deck do rival: ${this.state.players[OP].deck.length} cartas` : null;
        this.ui.tip(tip);
      }
    }
    // cartas
    for (const c of this.cards.values()) {
      if (c.place?.kind !== 'free') this.targetFor(c, cam);
      const isHand = c.place?.kind === 'hand' && c.place.side === ME;
      const k = 1 - Math.exp(-dt * (isHand ? 16 : 11));
      c.pos.lerp(c.tPos, k); c.quat.slerp(c.tQuat, k); c.scale += (c.tScale - c.scale) * k;
      if (c.hop > 0) c.hop = Math.max(0, c.hop - dt * 2.6);
      const hopY = Math.sin((1 - c.hop) * Math.PI) * c.hopH * (c.hop > 0 ? 1 : 0);
      c.group.position.copy(c.pos).add(c.offset); c.group.position.y += hopY;
      c.group.quaternion.copy(c.quat); c.group.scale.setScalar(c.scale);
      c.glowA += (c.glowT - c.glowA) * Math.min(1, dt * 10);
      c.glow.visible = c.glowA > 0.02; c.glow.material.uniforms.uAlpha.value = c.glowA;
      c.front.material.emissiveIntensity += (c.emissive - c.front.material.emissiveIntensity) * k;
      c.back.material.emissiveIntensity = c.front.material.emissiveIntensity * 0.7;
    }
    this.updateArrow(t);
    // pilhas de deck e displays
    R.decks.forEach((m, i) => { const n = this.active ? this.deckShown[i] : 40, h = Math.max(0.002, n * 0.006); m.visible = n > 0; m.scale.y = h; m.position.y = h / 2; });
    // HUD projetado
    if (this.active) {
      if (this.chipsDirty) { this.chipList = this.buildChips(); this.chipsDirty = false; }
      const list = (this.chipList ?? []).map((ch) => { const c = ch.pos ? null : this.cards.get(ch.uid); if (!ch.pos && !c) return null; const s = this.project(ch.pos ?? c.group.position.clone().add(V(0, 0.02, CARD.h * 0.5 + 0.02))); return { ...ch, x: s.x, y: s.y + 2 }; }).filter(Boolean);
      this.ui.chips(list);
      if (this.sel?.stage === 'menu') { const c = this.cards.get(this.sel.uid); if (c) { const s = this.project(c.group.position.clone().add(V(0, c.place.kind === 'hand' ? CARD.h * 0.5 * c.scale : 0.5, 0))); this.ui.menuPos(s.x, s.y); } }
      this.ui.previewPos(this.mouse.x * this.gfx.w, this.mouse.y * this.gfx.h);
      if (this.mouse.dragging && this.slotGlow.visible) this.slotGlow.material.uniforms.uAlpha.value = this.mouse.y < 0.74 ? 1 : 0.35;
    }
    // o Rival: respiração, olhar, humor
    const o = R.opp, f = o.face;
    const myT = this.active && this.state?.active === ME;
    o.group.position.y = o.baseY + Math.sin(t * 1.1) * 0.03; o.tick(t);
    const think = this.active ? (this.thinking && !this.over ? 1 : 0) : (Math.sin(t * 0.45) > 0.72 ? 1 : 0);
    f.uThink.value += (think - f.uThink.value) * Math.min(1, dt * 6);
    this.blinkT -= dt; if (this.blinkT < 0) { this.blinkT = 1.5 + Math.random() * 4; tween(160, (k, raw) => { f.uBlink.value = Math.sin(raw * Math.PI); }, ease.lin); }
    const look = this.hoverUid && this.cards.get(this.hoverUid) ? this.cards.get(this.hoverUid).group.position : V((this.mouse.x - 0.5) * 6, 0, 2);
    f.uLook.value.x += (THREE.MathUtils.clamp(look.x / 3, -1, 1) - f.uLook.value.x) * dt * 4; f.uLook.value.y += ((myT ? -0.6 : -0.9) - f.uLook.value.y) * dt * 3;
    this.oppGlitch = Math.max(0, this.oppGlitch - dt * 2.2); f.uGlitch.value = this.oppGlitch + (Math.random() < 0.004 ? 0.6 : 0);
    this.oppTalk = Math.max(0, this.oppTalk - dt * 1.4); f.uTalk.value = this.oppTalk;
    f.uMood.value += (this.oppMood - f.uMood.value) * dt * 4; this.oppMood *= 1 - dt * 0.25;
    this.oppNod = Math.max(0, this.oppNod - dt * 2.4);
    o.head.rotation.set(0.14 + Math.sin(this.oppNod * Math.PI) * 0.14 + Math.sin(t * 0.7) * 0.015, f.uLook.value.x * 0.16 + Math.sin(t * 0.43) * 0.03, Math.sin(t * 0.31) * 0.035 + this.oppGlitch * (Math.random() - 0.5) * 0.1);
    R.crtLight.position.set(o.group.position.x, o.group.position.y + o.headRest.y + 1.2, o.group.position.z + 2.4);
    R.crtLight.intensity = (4 + Math.sin(t * 40) * 0.25 + this.oppGlitch * 6) * f.uOn.value * (o.tv ? 1 : 0.25); // pessoas: só um resto da luz do monitor
    R.crtLight.color.setRGB(0.62 + Math.max(0, f.uMood.value) * 0.4, 0.92 - Math.max(0, f.uMood.value) * 0.6, 1 - Math.max(0, f.uMood.value) * 0.7);
    // luz: no porão a luminária é um pêndulo amortecido que balança com os impactos; no andar seccionado ela é fixa
    if (TH.lamp.sway) {
      this.lampVel += (-this.lampAng * 7 - this.lampVel * 0.5) * dt; this.lampAng += this.lampVel * dt;
      R.lampPivot.rotation.z = this.lampAng + Math.sin(t * 0.55) * 0.012; R.lampPivot.rotation.x = Math.sin(t * 0.41) * 0.008;
      if (Math.random() < 0.0012) this.lampFlicker(0.3);
    }
    this.flick = Math.max(0, (this.flick ?? 0) - dt * 1.8);
    const fl = (this.flick > 0 && Math.sin(t * 90) > 0.2 ? 1 - this.flick * 0.7 : 1) * (this.lampOn ?? 1);
    R.lamp.intensity = R.lampBase * fl;
    if (R.bulb) R.bulb.material.color.setRGB(1 * fl, 0.89 * fl, 0.66 * fl);
    R.cold.intensity = R.coldBase * (0.35 + 0.65 * fl);
    const bad = (Math.sin(t * 3.1) > 0.93 || Math.random() < 0.01) ? 0.15 : 1;
    R.tubes.forEach((m, i) => { const v = (0.35 + 0.65 * fl) * (i === 0 ? bad : 1); if (m.emissiveIntensity !== undefined && m.isMeshStandardMaterial) m.emissiveIntensity = 2.2 * v; else m.color.setRGB(1.9 * v, 2.0 * v, 1.95 * v); });
    // câmera
    this.lookUp += ((this.active && !myT && !this.over ? 1 : this.over ? 0.7 : 0) - this.lookUp) * Math.min(1, dt * 2.2);
    this.shake = Math.max(0, this.shake - dt * 2.4);
  }
  isClickable(uid) {
    const c = this.cards.get(uid), p = c?.place; if (!p || !this.canAct()) return false;
    if (this.sel?.selectable?.has(uid)) return true;
    return p.side === ME && (p.kind === 'hand' || p.kind === 'cr');
  }
}
