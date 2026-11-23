// Motor de regras + IA — portado 1:1 do protótipo original (lógica idêntica, só des-minificado).
import { CARDS } from './cards.js';

export const RULES = {
  STARTING_CAIXA: 8000, DECK_SIZE: 40, MAX_COPIES: 2, STARTING_HAND: 5, HAND_LIMIT: 10,
  MAX_TURNS: 60, CREATURE_ZONES: 5, EFFECT_ZONES: 5, SUMMONS_PER_TURN: 1,
};
const CARD_MAP = new Map(CARDS.map((c) => [c.id, c]));

export function isEffect(def) { return def.kind === 'effect_instant' || def.kind === 'effect_trap'; }
export function cardDef(id) {
  const d = CARD_MAP.get(id);
  if (!d) throw new Error(`Carta desconhecida: ${id}`);
  return d;
}
export const other = (p) => (p === 0 ? 1 : 0);

function rand(s) {
  let g = (s.rng = (s.rng + 1831565813) | 0);
  g = Math.imul(g ^ (g >>> 15), g | 1);
  g ^= g + Math.imul(g ^ (g >>> 7), g | 61);
  return ((g ^ (g >>> 14)) >>> 0) / 4294967296;
}
function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
function coin(s) {
  return s.debugCoins && s.debugCoins.length > 0 ? s.debugCoins.shift() : rand(s) < 0.5 ? 'cara' : 'coroa';
}

export function creaturesOf(s, side) {
  const out = [];
  s.players[side].creatures.forEach((c, zone) => { if (c) out.push({ c, side, zone }); });
  return out;
}
function allCreatures(s) { return [...creaturesOf(s, s.active), ...creaturesOf(s, other(s.active))]; }
export function findCreature(s, uid) {
  for (const side of [0, 1]) {
    const zone = s.players[side].creatures.findIndex((c) => c?.uid === uid);
    if (zone >= 0) return { c: s.players[side].creatures[zone], side, zone };
  }
  return null;
}
function faceUpEffects(s) {
  const out = [];
  for (const side of [0, 1]) for (const e of s.players[side].effects) if (e && !e.faceDown) out.push({ e, side });
  return out;
}
function cardOnField(s, id) {
  return allCreatures(s).some(({ c }) => c.cardId === id) || faceUpEffects(s).some(({ e }) => e.cardId === id);
}
function findAbility(cardId, pred) { return cardDef(cardId).abilities.find(pred); }
function immune(def, source) {
  const im = def.immunities ?? [];
  return im.includes(source.element) || im.includes(`card:${source.id}`);
}
function conditionMet(s, cond, self) {
  if (!cond) return true;
  return !((cond.cardOnField && !cardOnField(s, cond.cardOnField)) || (cond.selfMode && self?.mode !== cond.selfMode));
}
function auraApplies(aura, srcUid, srcSide, tgt) {
  const def = cardDef(tgt.c.cardId);
  switch (aura.scope) {
    case 'self': return tgt.c.uid === srcUid;
    case 'card_named': return tgt.c.cardId === aura.cardId;
    case 'own_creatures': return tgt.side === srcSide && !(aura.excludeSelf && tgt.c.uid === srcUid);
    case 'all_creatures':
      return !((aura.department && def.department !== aura.department) ||
        (aura.exceptImmuneTo && (def.immunities ?? []).includes(aura.exceptImmuneTo)));
  }
  return false;
}

export function statsOf(s, uid, combat) {
  const me = findCreature(s, uid);
  if (!me) throw new Error(`Criatura não está na mesa: ${uid}`);
  const def = cardDef(me.c.cardId);
  let atk = def.atk ?? 0, dfs = def.def ?? 0;
  const add = (a, src) => {
    const im = immune(def, src), da = a.atk ?? 0, dd = a.def ?? 0;
    if (!(im && da < 0)) atk += da;
    if (!(im && dd < 0)) dfs += dd;
  };
  for (const r of allCreatures(s)) {
    const rd = cardDef(r.c.cardId);
    for (const ab of rd.abilities) {
      if (ab.trigger !== 'continuous' || !ab.aura) continue;
      if (conditionMet(s, ab.condition, r.c) && auraApplies(ab.aura, r.c.uid, r.side, me)) add(ab.aura, rd);
    }
  }
  for (const { e, side } of faceUpEffects(s)) {
    const ed = cardDef(e.cardId);
    for (const ab of ed.abilities) {
      if (ab.trigger !== 'continuous' || !ab.aura) continue;
      if (conditionMet(s, ab.condition, null) && auraApplies(ab.aura, e.uid, side, me)) add(ab.aura, ed);
    }
  }
  let mulA = 1, mulD = 1;
  for (const m of me.c.mods) { atk += m.atk; dfs += m.def; mulA *= m.mulAtk ?? 1; mulD *= m.mulDef ?? 1; }
  if (combat && combat.attackerUid === uid) {
    if (combat.defenderUid) {
      const d = findCreature(s, combat.defenderUid);
      if (d) {
        const dd = cardDef(d.c.cardId);
        for (const ab of dd.abilities) {
          if (ab.trigger !== 'on_attacked') continue;
          const cond = ab.condition;
          if (cond?.attackerDepartment && cond.attackerDepartment !== def.department) continue;
          const ef = ab.effect;
          if (ef.attackerAtk && !(immune(def, dd) && ef.attackerAtk < 0)) atk += ef.attackerAtk;
        }
      }
    }
    if (combat.secondAttack) {
      const ab = findAbility(me.c.cardId, (a) => typeof a.extraAttackAtkMultiplier === 'number');
      if (ab) mulA *= ab.extraAttackAtkMultiplier;
    }
  }
  return { atk: Math.max(0, Math.round(atk * mulA)), def: Math.max(0, Math.round(dfs * mulD)) };
}

export function maxAttacks(cardId) {
  return 1 + (findAbility(cardId, (a) => typeof a.extraAttacks === 'number')?.extraAttacks ?? 0);
}
export function canAttack(s, e) {
  return e.c.mode === 'ATK' && e.c.attacksThisTurn < maxAttacks(e.c.cardId) &&
    s.players[e.side].turnsStarted > e.c.lockedUntilOwnerTurn;
}
function combos(arr, n) {
  if (n === 0) return [[]];
  if (arr.length < n) return [];
  const [h, ...t] = arr;
  return [...combos(t, n - 1).map((c) => [h, ...c]), ...combos(t, n)];
}
const empties = (arr) => arr.filter((x) => x === null).length;

function summonTargets(s, ab, side, cardId, sacrificed) {
  const ch = ab.choose;
  if (!ch) return [];
  const src = cardDef(cardId);
  const pool = ch.scope === 'opponent_creature' ? creaturesOf(s, other(side)) : ch.scope === 'any_creature' ? allCreatures(s) : [];
  return pool
    .filter(({ c }) => !sacrificed.has(c.uid))
    .filter(({ c }) => !ch.department || cardDef(c.cardId).department === ch.department)
    .filter(({ c }) => !immune(cardDef(c.cardId), src))
    .map(({ c }) => c.uid);
}

export function legalActions(s) {
  if (s.phase === 'over') return [];
  const p = s.players[s.active], out = [], pending = p.pendingDraw;
  if (s.phase === 'main') {
    const mine = creaturesOf(s, s.active);
    if (p.summonsThisTurn < RULES.SUMMONS_PER_TURN) {
      const seen = new Set();
      for (const h of p.hand) {
        const d = cardDef(h.cardId);
        if ((d.kind !== 'creature' && d.kind !== 'entity') || seen.has(h.cardId)) continue;
        seen.add(h.cardId);
        const cost = d.cost ?? 0;
        for (const sac of combos(mine.map((m) => m.c.uid), cost)) {
          if (empties(p.creatures) + sac.length < 1) continue;
          const ab = d.abilities.find((a) => a.trigger === 'on_summon' && a.choose);
          let targets = [null];
          if (ab) {
            const t = summonTargets(s, ab, s.active, h.cardId, new Set(sac));
            targets = ab.optional || t.length === 0 ? [null, ...t] : t;
          }
          for (const mode of ['ATK', 'DEF']) for (const target of targets)
            out.push({ type: 'summon', uid: h.uid, mode, sacrifices: [...sac].sort(), target });
        }
      }
    }
    const seen = new Set();
    for (const h of p.hand) {
      const d = cardDef(h.cardId);
      if (seen.has(h.cardId)) continue;
      if (d.kind === 'effect_trap') {
        seen.add(h.cardId);
        if (empties(p.effects) > 0) out.push({ type: 'setTrap', uid: h.uid });
        continue;
      }
      if (d.kind !== 'effect_instant') continue;
      seen.add(h.cardId);
      if (d.durationTurns && empties(p.effects) === 0) continue;
      const ab = d.abilities.find((a) => a.trigger === 'on_play'), cost = ab?.playCost, ch = ab?.choose;
      if (cost?.sendOwnCreaturesToDead) {
        for (const c of combos(mine.map((m) => m.c.uid), cost.sendOwnCreaturesToDead))
          out.push({ type: 'playEffect', uid: h.uid, costs: [...c].sort() });
      } else if (ch?.scope === 'any_creature') {
        for (const { c } of allCreatures(s)) out.push({ type: 'playEffect', uid: h.uid, target: c.uid });
      } else out.push({ type: 'playEffect', uid: h.uid });
    }
    for (const { c } of mine)
      if (c.enteredTurn !== s.turn && c.modeChangedTurn !== s.turn) out.push({ type: 'changeMode', uid: c.uid });
    if (!pending && s.turn > 1) out.push({ type: 'enterBattle' });
  }
  if (s.phase === 'battle') {
    const foes = creaturesOf(s, other(s.active));
    for (const m of creaturesOf(s, s.active)) {
      if (!canAttack(s, m)) continue;
      if (foes.length === 0) out.push({ type: 'attack', uid: m.c.uid, target: null });
      for (const f of foes) out.push({ type: 'attack', uid: m.c.uid, target: f.c.uid });
    }
  }
  if (pending) {
    const seen = new Set();
    for (const h of p.hand) if (!seen.has(h.cardId)) { seen.add(h.cardId); out.push({ type: 'discard', uid: h.uid }); }
  } else out.push({ type: 'endTurn' });
  return out;
}

function actionKey(s, a) {
  const id = (uid) => s.players[s.active].hand.find((h) => h.uid === uid)?.cardId ?? uid;
  switch (a.type) {
    case 'summon': return `summon|${id(a.uid)}|${a.mode}|${[...a.sacrifices].sort().join(',')}|${a.target ?? ''}`;
    case 'playEffect': return `play|${id(a.uid)}|${a.target ?? ''}|${[...(a.costs ?? [])].sort().join(',')}`;
    case 'setTrap': return `trap|${id(a.uid)}`;
    case 'discard': return `discard|${id(a.uid)}`;
    case 'changeMode': return `mode|${a.uid}`;
    case 'attack': return `attack|${a.uid}|${a.target ?? ''}`;
    default: return a.type;
  }
}
function isLegal(s, a) {
  if (['summon', 'playEffect', 'setTrap', 'discard'].includes(a.type) && !s.players[s.active].hand.some((h) => h.uid === a.uid)) return false;
  const k = actionKey(s, a);
  return legalActions(s).some((x) => actionKey(s, x) === k);
}

export function applyAction(s0, a) {
  if (!isLegal(s0, a)) throw new Error(`Ação inválida: ${JSON.stringify(a)}`);
  const s = structuredClone(s0), ev = [], me = s.active;
  switch (a.type) {
    case 'summon': doSummon(s, ev, a.uid, a.mode, a.sacrifices, a.target ?? null); break;
    case 'playEffect': doEffect(s, ev, a.uid, a.target ?? null, a.costs ?? []); break;
    case 'setTrap': {
      const p = s.players[me], c = takeFromHand(p, a.uid), zone = p.effects.indexOf(null);
      p.effects[zone] = { ...c, faceDown: true, turnsLeft: null, setTurn: s.turn };
      ev.push({ type: 'trapSet', player: me, uid: c.uid, zone });
      break;
    }
    case 'changeMode': {
      const f = findCreature(s, a.uid);
      f.c.mode = f.c.mode === 'ATK' ? 'DEF' : 'ATK';
      f.c.modeChangedTurn = s.turn;
      ev.push({ type: 'modeChange', uid: f.c.uid, mode: f.c.mode });
      break;
    }
    case 'enterBattle': s.phase = 'battle'; ev.push({ type: 'phase', phase: 'battle' }); break;
    case 'attack': doAttack(s, ev, a.uid, a.target); break;
    case 'discard': {
      const p = s.players[me], c = takeFromHand(p, a.uid);
      p.dead.push(c);
      ev.push({ type: 'discard', player: me, uid: c.uid, cardId: c.cardId });
      break;
    }
    case 'endTurn': endTurn(s, ev); break;
  }
  resolvePendingDraw(s, ev);
  return { state: s, events: ev };
}

function startTurn(s, ev) {
  const p = s.players[s.active];
  p.turnsStarted++; p.summonsThisTurn = 0; s.phase = 'main';
  for (const { c } of creaturesOf(s, s.active)) c.attacksThisTurn = 0;
  ev.push({ type: 'turnStart', player: p.id, turn: s.turn });
  const frio = Object.values(p.frio).reduce((a, b) => a + b, 0);
  if (frio > 0) {
    ev.push({ type: 'frio', player: p.id, counters: frio });
    damage(s, ev, p.id, 100 * frio, 'BCB-002');
    if (s.winner !== null) return;
  }
  if (p.hand.length >= RULES.HAND_LIMIT) { p.pendingDraw = true; ev.push({ type: 'drawSkipped', player: p.id, reason: 'hand_limit' }); }
  else draw(s, ev, p.id);
}
function endTurn(s, ev) {
  const p = s.players[s.active];
  for (const { c } of allCreatures(s)) c.mods = c.mods.filter((m) => m.until !== 'end_of_turn');
  p.effects.forEach((e, i) => {
    if (!e || e.faceDown || e.turnsLeft === null) return;
    e.turnsLeft--;
    if (e.turnsLeft <= 0) {
      p.effects[i] = null;
      s.players[e.owner].dead.push(strip(e));
      ev.push({ type: 'effectExpired', uid: e.uid, cardId: e.cardId });
    }
  });
  s.active = other(s.active);
  s.turn++;
  if (s.turn > RULES.MAX_TURNS) {
    const [a, b] = s.players;
    gameOver(s, ev, a.caixa === b.caixa ? 'draw' : a.caixa > b.caixa ? 0 : 1, 'turn_limit');
    return;
  }
  startTurn(s, ev);
}
function draw(s, ev, pid) {
  const p = s.players[pid], c = p.deck.shift();
  if (!c) { ev.push({ type: 'drawSkipped', player: pid, reason: 'deck_empty' }); return; }
  p.hand.push(c);
  ev.push({ type: 'draw', player: pid, uid: c.uid, cardId: c.cardId });
}
function resolvePendingDraw(s, ev) {
  const p = s.players[s.active];
  if (s.phase !== 'over' && p.pendingDraw && p.hand.length < RULES.HAND_LIMIT) { p.pendingDraw = false; draw(s, ev, p.id); }
}
function gameOver(s, ev, winner, reason) {
  s.winner = winner; s.endReason = reason; s.phase = 'over';
  ev.push({ type: 'gameOver', winner, reason });
}
function damage(s, ev, pid, amount, source) {
  if (amount <= 0 || s.phase === 'over') return;
  const p = s.players[pid];
  p.caixa = Math.max(0, p.caixa - amount);
  ev.push({ type: 'damage', player: pid, amount, source, caixa: p.caixa });
  if (p.caixa <= 0) gameOver(s, ev, other(pid), 'caixa');
}
function heal(s, ev, pid, amount, source) {
  if (amount <= 0 || s.phase === 'over') return;
  const p = s.players[pid];
  p.caixa += amount;
  ev.push({ type: 'heal', player: pid, amount, source, caixa: p.caixa });
}
const strip = (c) => ({ uid: c.uid, cardId: c.cardId, owner: c.owner });
function takeFromHand(p, uid) {
  const i = p.hand.findIndex((h) => h.uid === uid);
  return p.hand.splice(i, 1)[0];
}
function removeCreature(s, ev, uid, how) {
  const f = findCreature(s, uid);
  if (!f) return;
  s.players[f.side].creatures[f.zone] = null;
  const c = strip(f.c), owner = s.players[c.owner];
  for (const pl of s.players) delete pl.frio[uid];
  if (how === 'bounced') {
    if (owner.hand.length < RULES.HAND_LIMIT) { owner.hand.push(c); ev.push({ type: 'toHand', uid, cardId: c.cardId }); }
    else { owner.dead.push(c); ev.push({ type: 'destroy', uid, cardId: c.cardId }); }
    return;
  }
  if (how === 'destroyed') {
    if (findAbility(c.cardId, (a) => a.trigger === 'on_destroyed' && a.replace === 'shuffle_into_owner_deck')) {
      owner.deck.push(c); shuffle(s, owner.deck);
      ev.push({ type: 'toDeck', uid, cardId: c.cardId });
      return;
    }
    owner.dead.push(c);
    ev.push({ type: 'destroy', uid, cardId: c.cardId });
    return;
  }
  owner.dead.push(c);
  ev.push({ type: 'sacrifice', player: c.owner, uid, cardId: c.cardId });
}
function doSummon(s, ev, uid, mode, sacrifices, target) {
  const me = s.active, p = s.players[me];
  for (const u of sacrifices) removeCreature(s, ev, u, 'sacrificed');
  const h = takeFromHand(p, uid), zone = p.creatures.indexOf(null);
  const c = { ...h, mode, enteredTurn: s.turn, modeChangedTurn: -1, attacksThisTurn: 0, lockedUntilOwnerTurn: 0, mods: [], flags: {} };
  p.creatures[zone] = c;
  p.summonsThisTurn++;
  ev.push({ type: 'summon', player: me, uid: h.uid, cardId: h.cardId, mode, zone });
  const carona = findAbility(h.cardId, (a) => a.on === 'opponent_summons');
  if (carona) {
    const id = carona.condition.summonedCardId;
    c.flags.caronaBlocked = allCreatures(s).some(({ c: x }) => x.cardId === id);
  }
  for (const ab of cardDef(h.cardId).abilities) {
    if (ab.trigger !== 'on_summon') continue;
    const ef = ab.effect ?? {};
    if (typeof ef.millSelf === 'number')
      for (let i = 0; i < ef.millSelf && p.deck.length; i++) {
        const m = p.deck.shift();
        p.dead.push(m);
        ev.push({ type: 'mill', player: me, uid: m.uid, cardId: m.cardId });
      }
    if (ab.choose && target) {
      const t = findCreature(s, target);
      if (!t) continue;
      if (ef.cannotAttack && typeof ef.forTargetOwnerTurns === 'number') {
        const until = s.players[t.side].turnsStarted + ef.forTargetOwnerTurns;
        t.c.lockedUntilOwnerTurn = Math.max(t.c.lockedUntilOwnerTurn, until);
        ev.push({ type: 'lock', uid: target, untilOwnerTurn: until, source: h.cardId });
      }
      if (ef.returnToHand) removeCreature(s, ev, target, 'bounced');
    }
  }
  for (const f of creaturesOf(s, other(me))) {
    const ab = findAbility(f.c.cardId, (a) => a.on === 'opponent_summons');
    if (!ab || f.c.flags.caronaBlocked || ab.condition.summonedCardId !== h.cardId) continue;
    const z = p.creatures.indexOf(null);
    if (z < 0) continue;
    s.players[f.side].creatures[f.zone] = null;
    p.creatures[z] = f.c;
    ev.push({ type: 'controlChange', uid: f.c.uid, to: me });
  }
}
function doEffect(s, ev, uid, target, costs) {
  const me = s.active, p = s.players[me], h = takeFromHand(p, uid), d = cardDef(h.cardId);
  ev.push({ type: 'effectPlayed', player: me, uid, cardId: h.cardId, target });
  if (d.durationTurns) {
    const z = p.effects.indexOf(null);
    p.effects[z] = { ...h, faceDown: false, turnsLeft: d.durationTurns, setTurn: s.turn };
    return;
  }
  const ef = d.abilities.find((a) => a.trigger === 'on_play')?.effect ?? {};
  for (const c of costs) removeCreature(s, ev, c, 'sacrificed');
  if (typeof ef.healOwner === 'number') heal(s, ev, me, ef.healOwner, h.cardId);
  if (target && (typeof ef.atk === 'number' || typeof ef.def === 'number')) {
    const t = findCreature(s, target), td = cardDef(t.c.cardId), imm = ef.defReductionImmune ?? [], da = ef.atk ?? 0;
    let dd = ef.def ?? 0;
    if (dd < 0 && (imm.includes(t.c.cardId) || immune(td, d))) dd = 0;
    t.c.mods.push({ atk: da, def: dd, until: 'permanent', source: h.cardId });
    ev.push({ type: 'statMod', uid: target, source: h.cardId, atk: da, def: dd });
  }
  p.dead.push(h);
}
function doAttack(s, ev, uid, target) {
  const me = s.active, foe = other(me), a = findCreature(s, uid), ad = cardDef(a.c.cardId), second = a.c.attacksThisTurn >= 1;
  a.c.attacksThisTurn++;
  ev.push({ type: 'attack', attacker: uid, target, second });
  const fp = s.players[foe];
  for (let i = 0; i < fp.effects.length; i++) {
    const t = fp.effects[i];
    if (!t || !t.faceDown) continue;
    const td = cardDef(t.cardId), ab = td.abilities.find((x) => x.trigger === 'trap' && x.on === 'enemy_attack_declared');
    if (!ab) continue;
    const cond = ab.condition;
    if ((cond?.attackerDepartment && cond.attackerDepartment !== ad.department) || immune(ad, td)) continue;
    fp.effects[i] = null;
    fp.dead.push(strip(t));
    ev.push({ type: 'trapTriggered', player: foe, uid: t.uid, cardId: t.cardId, against: uid });
    const ef = ab.effect;
    if (ef.negateAttack) ev.push({ type: 'attackNegated', attacker: uid, by: t.cardId });
    if (ef.endTurn) endTurn(s, ev);
    if (ef.negateAttack) return;
  }
  for (const f of creaturesOf(s, foe)) {
    const fd = cardDef(f.c.cardId);
    for (const ab of fd.abilities) {
      if (ab.trigger !== 'continuous' || ab.on !== 'enemy_attack_declared' || !ab.coinFlip || immune(ad, fd)) continue;
      const r = coin(s);
      ev.push({ type: 'coin', source: f.c.uid, result: r, target: uid });
      if (r === 'coroa') {
        const l = ab.onLose;
        a.c.mods.push({ atk: 0, def: 0, mulAtk: l.multiplyAtk, mulDef: l.multiplyDef, until: 'end_of_turn', source: fd.id });
        ev.push({ type: 'statMod', uid, source: fd.id, atk: 0, def: 0, mul: l.multiplyAtk });
      }
    }
  }
  for (const ab of ad.abilities) {
    if (ab.trigger !== 'on_attack') continue;
    const ef = ab.effect;
    if (ef.addCounterToOpponent === 'frio') {
      fp.frio[uid] = (fp.frio[uid] ?? 0) + (ef.amount ?? 1);
      ev.push({ type: 'frio', player: foe, counters: Object.values(fp.frio).reduce((x, y) => x + y, 0) });
    }
  }
  const ctx = { attackerUid: uid, defenderUid: target, secondAttack: second }, atk = statsOf(s, uid, ctx).atk;
  if (target === null) {
    ev.push({ type: 'combat', attacker: uid, defender: null, atk, against: 0, defenderMode: null });
    combatDamage(s, ev, a, null, foe, atk, true);
    return;
  }
  const d = findCreature(s, target), mode = d.c.mode, ds = statsOf(s, target, ctx), against = mode === 'ATK' ? ds.atk : ds.def;
  ev.push({ type: 'combat', attacker: uid, defender: target, atk, against, defenderMode: mode });
  if (mode === 'ATK') {
    if (atk > against) { removeCreature(s, ev, target, 'destroyed'); combatDamage(s, ev, a, d, foe, atk - against, false); }
    else if (atk < against) { removeCreature(s, ev, uid, 'destroyed'); combatDamage(s, ev, d, a, me, against - atk, false); }
    else { removeCreature(s, ev, target, 'destroyed'); removeCreature(s, ev, uid, 'destroyed'); }
  } else if (atk > against) removeCreature(s, ev, target, 'destroyed');
  else if (atk < against) combatDamage(s, ev, d, a, me, against - atk, false);
}
function combatDamage(s, ev, winner, loser, victim, diff, direct) {
  const wd = cardDef(winner.c.cardId);
  let amount = diff;
  const ab = wd.abilities.find((a) => a.trigger === 'on_combat_won' && typeof a.combatDifferenceMultiplier === 'number');
  if (ab && !(direct && ab.excludesDirectAttack)) amount *= ab.combatDifferenceMultiplier;
  damage(s, ev, victim, amount, winner.c.cardId);
  if (wd.abilities.some((a) => a.lifelink)) heal(s, ev, winner.side, amount, winner.c.cardId);
}
export function handLimitStatus(s) {
  const p = s.players[s.active];
  return p.pendingDraw ? (empties(p.creatures) === 0 && empties(p.effects) === 0 ? 'must_discard' : 'play_cards') : 'ok';
}

// Previsão de combate para a UI (não altera o estado; ignora moeda/armadilhas, que são ocultas).
export function previewAttack(s, uid, target) {
  const a = findCreature(s, uid);
  if (!a) return null;
  const second = a.c.attacksThisTurn >= 1;
  const ctx = { attackerUid: uid, defenderUid: target, secondAttack: second };
  const atk = statsOf(s, uid, ctx).atk, ad = cardDef(a.c.cardId);
  const mult = ad.abilities.find((x) => x.trigger === 'on_combat_won' && typeof x.combatDifferenceMultiplier === 'number');
  if (target === null) return { atk, against: 0, mode: null, result: 'direct', dmgFoe: atk, dmgMe: 0 };
  const d = findCreature(s, target), mode = d.c.mode, ds = statsOf(s, target, ctx), against = mode === 'ATK' ? ds.atk : ds.def;
  const dd = cardDef(d.c.cardId);
  const dmult = dd.abilities.find((x) => x.trigger === 'on_combat_won' && typeof x.combatDifferenceMultiplier === 'number');
  let result, dmgFoe = 0, dmgMe = 0;
  if (atk > against) { result = 'win'; if (mode === 'ATK') dmgFoe = (atk - against) * (mult ? mult.combatDifferenceMultiplier : 1); }
  else if (atk < against) { result = mode === 'ATK' ? 'lose' : 'bounce'; dmgMe = (against - atk) * (dmult ? dmult.combatDifferenceMultiplier : 1); }
  else result = mode === 'ATK' ? 'trade' : 'nothing';
  return { atk, against, mode, result, dmgFoe, dmgMe };
}

// ───────── IA (gulosa de 1 jogada, igual ao original) ─────────
const W = { creatureValue: 0.5, creatureBase: 300, handCard: 150, trap: 400, frioCounter: 250, threat: 0.6, minGain: 1 };
function sideScore(s, side, w) {
  const p = s.players[side];
  let v = p.caixa;
  const mine = creaturesOf(s, side);
  const foeAtk = creaturesOf(s, other(side)).filter((f) => f.c.mode === 'ATK').map((f) => statsOf(s, f.c.uid).atk);
  const top = foeAtk.length ? Math.max(...foeAtk) : 0;
  for (const { c } of mine) {
    const st = statsOf(s, c.uid), val = w.creatureBase + w.creatureValue * (st.atk + st.def);
    v += val;
    if (c.mode === 'ATK' && top > st.atk) v -= w.threat * (top - st.atk + val);
    if (c.mode === 'DEF' && top > st.def) v -= w.threat * 0.5 * val;
  }
  if (mine.length === 0) v -= w.threat * foeAtk.reduce((a, b) => a + b, 0);
  v += w.handCard * p.hand.length;
  v += w.trap * p.effects.filter((e) => e?.faceDown).length;
  v -= w.frioCounter * Object.values(p.frio).reduce((a, b) => a + b, 0);
  return v;
}
function evaluate(s, side, w = W) {
  if (s.winner === side) return 1e9;
  if (s.winner !== null) return s.winner === 'draw' ? 0 : -1e9;
  return sideScore(s, side, w) - sideScore(s, other(side), w);
}
export function aiChoose(s, w = W) {
  const me = s.active, acts = legalActions(s);
  if (acts.length === 1) return acts[0];
  const base = evaluate(s, me, w);
  let best = null, bestV = -Infinity;
  for (const a of acts) {
    if (a.type === 'endTurn' || a.type === 'enterBattle') continue;
    const v = evaluate(applyAction(s, a).state, me, w);
    if (v > bestV) { bestV = v; best = a; }
  }
  const mustAct = !acts.some((a) => a.type === 'endTurn');
  if (best && (mustAct || bestV > base + w.minGain)) return best;
  const eb = acts.find((a) => a.type === 'enterBattle');
  if (eb) {
    const s2 = applyAction(s, eb).state, v2 = evaluate(s2, me, w);
    if (legalActions(s2).some((a) => a.type === 'attack' && evaluate(applyAction(s2, a).state, me, w) > v2 + w.minGain)) return eb;
  }
  return acts.find((a) => a.type === 'endTurn') ?? acts[0];
}

// ───────── Criação de partida ─────────
const DECK_RULES = { size: RULES.DECK_SIZE, maxCopies: 3 };
function newPlayer(id, name) {
  return {
    id, name, caixa: RULES.STARTING_CAIXA, deck: [], hand: [], dead: [],
    creatures: Array(RULES.CREATURE_ZONES).fill(null), effects: Array(RULES.EFFECT_ZONES).fill(null),
    frio: {}, turnsStarted: 0, summonsThisTurn: 0, pendingDraw: false,
  };
}
function randomDeck(r, rules) {
  const pool = [];
  for (const c of CARDS) for (let i = 0; i < rules.maxCopies; i++) pool.push(c.id);
  const deck = [];
  while (deck.length < rules.size && pool.length) deck.push(pool.splice(Math.floor(rand(r) * pool.length), 1)[0]);
  return deck;
}
export function createGame(names) {
  const seed = Math.floor(Math.random() * 2 ** 31), r = { rng: seed };
  const decks = [randomDeck(r, DECK_RULES), randomDeck(r, DECK_RULES)];
  const s = {
    version: 1, rng: seed | 0, turn: 1, active: 0, firstPlayer: 0, phase: 'main',
    players: [newPlayer(0, names[0]), newPlayer(1, names[1])], winner: null, endReason: null, nextUid: 1,
  };
  const ev = [];
  decks.forEach((d, i) => {
    const cards = d.map((cardId) => ({ uid: `c${s.nextUid++}`, cardId, owner: i }));
    shuffle(s, cards);
    s.players[i].deck = cards;
  });
  s.firstPlayer = coin(s) === 'cara' ? 0 : 1;
  s.active = s.firstPlayer;
  ev.push({ type: 'gameStart', firstPlayer: s.firstPlayer });
  for (const p of s.players)
    for (let i = 0; i < RULES.STARTING_HAND && p.deck.length; i++) {
      const c = p.deck.shift();
      p.hand.push(c);
      ev.push({ type: 'draw', player: p.id, uid: c.uid, cardId: c.cardId });
    }
  startTurn(s, ev);
  return { state: s, events: ev, seed };
}
