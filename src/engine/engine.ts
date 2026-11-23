// Motor de regras do Business Card Battle Corp (GDD v0.2).
//
// Uso: legalActions(estado) lista o que o jogador da vez pode fazer;
//      applyAction(estado, ação) devolve um NOVO estado + a lista de eventos para animar.
// O estado recebido nunca é alterado. Nada aqui depende do Phaser.
import { RULES } from './rules.ts';
import type { CardAbility } from './cards.ts';
import { flipCoin, shuffle } from './rng.ts';
import {
  allCreatures,
  canAttackNow,
  cardDef,
  creaturesOf,
  findAbility,
  findCreature,
  isImmune,
  other,
  stats,
  type CombatCtx,
  type CreatureLoc,
} from './stats.ts';
import type {
  Action,
  ApplyResult,
  CardRef,
  FieldCreature,
  GameEvent,
  GameState,
  Mode,
  PlayerId,
  PlayerState,
} from './types.ts';

export class IllegalActionError extends Error {}

// ───────────────────────── Ações válidas ─────────────────────────

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  return [...combinations(rest, k - 1).map((c) => [first, ...c]), ...combinations(rest, k)];
}

function freeZones(arr: unknown[]): number {
  return arr.filter((x) => x === null).length;
}

/** Alvos possíveis de uma habilidade "ao ser invocada" com escolha. */
function summonTargets(
  s: GameState,
  ab: CardAbility,
  side: PlayerId,
  sourceCardId: string,
  excluded: Set<string>,
): string[] {
  const choose = ab.choose as { scope: string; department?: string } | undefined;
  if (!choose) return [];
  const sourceDef = cardDef(sourceCardId);
  const pool =
    choose.scope === 'opponent_creature' ? creaturesOf(s, other(side)) : choose.scope === 'any_creature' ? allCreatures(s) : [];
  return pool
    .filter(({ c }) => !excluded.has(c.uid))
    .filter(({ c }) => !choose.department || cardDef(c.cardId).department === choose.department)
    .filter(({ c }) => !isImmune(cardDef(c.cardId), sourceDef)) // efeitos de escolha são prejudiciais
    .map(({ c }) => c.uid);
}

export function legalActions(s: GameState): Action[] {
  if (s.phase === 'over') return [];
  const me = s.players[s.active];
  const out: Action[] = [];
  const handFull = me.pendingDraw;

  if (s.phase === 'main') {
    const mine = creaturesOf(s, s.active);

    // Invocação (1 por turno, custo pago com sacrifício).
    if (me.summonsThisTurn < RULES.SUMMONS_PER_TURN) {
      const seen = new Set<string>();
      for (const card of me.hand) {
        const def = cardDef(card.cardId);
        if (def.kind !== 'creature' && def.kind !== 'entity') continue;
        if (seen.has(card.cardId)) continue; // cópias iguais geram as mesmas opções
        seen.add(card.cardId);
        const cost = def.cost ?? 0;
        for (const sac of combinations(mine.map((m) => m.c.uid), cost)) {
          if (freeZones(me.creatures) + sac.length < 1) continue;
          const onSummon = def.abilities.find((a) => a.trigger === 'on_summon' && a.choose);
          let targets: (string | null)[] = [null];
          if (onSummon) {
            const t = summonTargets(s, onSummon, s.active, card.cardId, new Set(sac));
            targets = onSummon.optional || t.length === 0 ? [null, ...t] : t;
          }
          for (const mode of ['ATK', 'DEF'] as Mode[]) {
            for (const target of targets) {
              out.push({ type: 'summon', uid: card.uid, mode, sacrifices: [...sac].sort(), target });
            }
          }
        }
      }
    }

    // Efeitos instantâneos e armadilhas.
    const seenFx = new Set<string>();
    for (const card of me.hand) {
      const def = cardDef(card.cardId);
      if (seenFx.has(card.cardId)) continue;
      if (def.kind === 'effect_trap') {
        seenFx.add(card.cardId);
        if (freeZones(me.effects) > 0) out.push({ type: 'setTrap', uid: card.uid });
        continue;
      }
      if (def.kind !== 'effect_instant') continue;
      seenFx.add(card.cardId);
      if (def.durationTurns && freeZones(me.effects) === 0) continue;
      const ab = def.abilities.find((a) => a.trigger === 'on_play');
      const playCost = ab?.playCost as { sendOwnCreaturesToDead?: number } | undefined;
      const choose = ab?.choose as { scope: string } | undefined;
      if (playCost?.sendOwnCreaturesToDead) {
        for (const costs of combinations(mine.map((m) => m.c.uid), playCost.sendOwnCreaturesToDead)) {
          out.push({ type: 'playEffect', uid: card.uid, costs: [...costs].sort() });
        }
      } else if (choose?.scope === 'any_creature') {
        for (const { c } of allCreatures(s)) out.push({ type: 'playEffect', uid: card.uid, target: c.uid });
      } else {
        out.push({ type: 'playEffect', uid: card.uid });
      }
    }

    // Troca de modo: 1 vez por turno, não no turno em que entrou.
    for (const { c } of mine) {
      if (c.enteredTurn !== s.turn && c.modeChangedTurn !== s.turn) out.push({ type: 'changeMode', uid: c.uid });
    }

    // Quem começa não ataca no primeiro turno.
    if (!handFull && s.turn > 1) out.push({ type: 'enterBattle' });
  }

  if (s.phase === 'battle') {
    const opp = creaturesOf(s, other(s.active));
    for (const loc of creaturesOf(s, s.active)) {
      if (!canAttackNow(s, loc)) continue;
      if (opp.length === 0) out.push({ type: 'attack', uid: loc.c.uid, target: null });
      for (const o of opp) out.push({ type: 'attack', uid: loc.c.uid, target: o.c.uid });
    }
  }

  if (handFull) {
    const seen = new Set<string>();
    for (const card of me.hand) {
      if (seen.has(card.cardId)) continue;
      seen.add(card.cardId);
      out.push({ type: 'discard', uid: card.uid });
    }
  } else {
    out.push({ type: 'endTurn' });
  }
  return out;
}

/** Forma canônica de uma ação, para comparar sem depender da ordem dos campos. */
function actionKey(s: GameState, a: Action): string {
  // Cópias da mesma carta na mão são equivalentes: compara pelo cardId.
  const handCardId = (uid: string) => s.players[s.active].hand.find((c) => c.uid === uid)?.cardId ?? uid;
  switch (a.type) {
    case 'summon':
      return `summon|${handCardId(a.uid)}|${a.mode}|${[...a.sacrifices].sort().join(',')}|${a.target ?? ''}`;
    case 'playEffect':
      return `play|${handCardId(a.uid)}|${a.target ?? ''}|${[...(a.costs ?? [])].sort().join(',')}`;
    case 'setTrap':
      return `trap|${handCardId(a.uid)}`;
    case 'discard':
      return `discard|${handCardId(a.uid)}`;
    case 'changeMode':
      return `mode|${a.uid}`;
    case 'attack':
      return `attack|${a.uid}|${a.target ?? ''}`;
    default:
      return a.type;
  }
}

export function isLegal(s: GameState, a: Action): boolean {
  if (a.type === 'summon' || a.type === 'playEffect' || a.type === 'setTrap' || a.type === 'discard') {
    if (!s.players[s.active].hand.some((c) => c.uid === a.uid)) return false;
  }
  const key = actionKey(s, a);
  return legalActions(s).some((l) => actionKey(s, l) === key);
}

// ───────────────────────── Aplicar ação ─────────────────────────

export function applyAction(state: GameState, action: Action): ApplyResult {
  if (!isLegal(state, action)) throw new IllegalActionError(`Ação inválida: ${JSON.stringify(action)}`);
  const s = structuredClone(state);
  const ev: GameEvent[] = [];
  const me = s.active;

  switch (action.type) {
    case 'summon':
      doSummon(s, ev, action.uid, action.mode, action.sacrifices, action.target ?? null);
      break;
    case 'playEffect':
      doPlayEffect(s, ev, action.uid, action.target ?? null, action.costs ?? []);
      break;
    case 'setTrap': {
      const p = s.players[me];
      const card = takeFromHand(p, action.uid);
      const zone = p.effects.indexOf(null);
      p.effects[zone] = { ...card, faceDown: true, turnsLeft: null, setTurn: s.turn };
      ev.push({ type: 'trapSet', player: me, uid: card.uid, zone });
      break;
    }
    case 'changeMode': {
      const loc = findCreature(s, action.uid)!;
      loc.c.mode = loc.c.mode === 'ATK' ? 'DEF' : 'ATK';
      loc.c.modeChangedTurn = s.turn;
      ev.push({ type: 'modeChange', uid: loc.c.uid, mode: loc.c.mode });
      break;
    }
    case 'enterBattle':
      s.phase = 'battle';
      ev.push({ type: 'phase', phase: 'battle' });
      break;
    case 'attack':
      doAttack(s, ev, action.uid, action.target);
      break;
    case 'discard': {
      const p = s.players[me];
      const card = takeFromHand(p, action.uid);
      p.dead.push(card);
      ev.push({ type: 'discard', player: me, uid: card.uid, cardId: card.cardId });
      break;
    }
    case 'endTurn':
      endTurn(s, ev);
      break;
  }

  resolvePendingDraw(s, ev);
  return { state: s, events: ev };
}

// ───────────────────────── Turnos ─────────────────────────

/** Começo do turno do jogador ativo: frio, compra. Exportado para setup.ts. */
export function startTurn(s: GameState, ev: GameEvent[]): void {
  const p = s.players[s.active];
  p.turnsStarted++;
  p.summonsThisTurn = 0;
  s.phase = 'main';
  for (const { c } of creaturesOf(s, s.active)) c.attacksThisTurn = 0;
  ev.push({ type: 'turnStart', player: p.id, turn: s.turn });

  // Caio: frio acumulado.
  const counters = Object.values(p.frio).reduce((a, b) => a + b, 0);
  if (counters > 0) {
    ev.push({ type: 'frio', player: p.id, counters });
    damage(s, ev, p.id, 100 * counters, 'BCB-002');
    if (s.winner !== null) return;
  }

  if (RULES.FIRST_PLAYER_SKIPS_DRAW && s.turn === 1 && s.active === s.firstPlayer) {
    ev.push({ type: 'drawSkipped', player: p.id, reason: 'first_turn' });
  } else if (p.hand.length >= RULES.HAND_LIMIT) {
    p.pendingDraw = true;
    ev.push({ type: 'drawSkipped', player: p.id, reason: 'hand_limit' });
  } else {
    draw(s, ev, p.id);
  }
}

function endTurn(s: GameState, ev: GameEvent[]): void {
  const me = s.players[s.active];
  // Modificadores "até o fim do turno" acabam.
  for (const { c } of allCreatures(s)) c.mods = c.mods.filter((m) => m.until !== 'end_of_turn');
  // Efeitos com duração contam os turnos do dono.
  me.effects.forEach((e, i) => {
    if (!e || e.faceDown || e.turnsLeft === null) return;
    e.turnsLeft--;
    if (e.turnsLeft <= 0) {
      me.effects[i] = null;
      s.players[e.owner].dead.push(toRef(e));
      ev.push({ type: 'effectExpired', uid: e.uid, cardId: e.cardId });
    }
  });

  s.active = other(s.active);
  s.turn++;
  if (s.turn > RULES.MAX_TURNS) {
    const [a, b] = s.players;
    finish(s, ev, a.caixa === b.caixa ? 'draw' : a.caixa > b.caixa ? 0 : 1, 'turn_limit');
    return;
  }
  startTurn(s, ev);
}

function draw(s: GameState, ev: GameEvent[], player: PlayerId): void {
  const p = s.players[player];
  const card = p.deck.shift();
  if (!card) {
    ev.push({ type: 'drawSkipped', player, reason: 'deck_empty' });
    return;
  }
  p.hand.push(card);
  ev.push({ type: 'draw', player, uid: card.uid, cardId: card.cardId });
}

/** Mão estava no limite: assim que abrir espaço, a compra do turno acontece. */
function resolvePendingDraw(s: GameState, ev: GameEvent[]): void {
  const p = s.players[s.active];
  if (s.phase !== 'over' && p.pendingDraw && p.hand.length < RULES.HAND_LIMIT) {
    p.pendingDraw = false;
    draw(s, ev, p.id);
  }
}

// ───────────────────────── CAIXA e fim de jogo ─────────────────────────

function finish(s: GameState, ev: GameEvent[], winner: PlayerId | 'draw', reason: 'caixa' | 'turn_limit'): void {
  s.winner = winner;
  s.endReason = reason;
  s.phase = 'over';
  ev.push({ type: 'gameOver', winner, reason });
}

function damage(s: GameState, ev: GameEvent[], player: PlayerId, amount: number, source: string | null): void {
  if (amount <= 0 || s.phase === 'over') return;
  const p = s.players[player];
  p.caixa = Math.max(0, p.caixa - amount);
  ev.push({ type: 'damage', player, amount, source, caixa: p.caixa });
  if (p.caixa <= 0) finish(s, ev, other(player), 'caixa');
}

function heal(s: GameState, ev: GameEvent[], player: PlayerId, amount: number, source: string): void {
  if (amount <= 0 || s.phase === 'over') return;
  const p = s.players[player];
  p.caixa += amount;
  ev.push({ type: 'heal', player, amount, source, caixa: p.caixa });
}

// ───────────────────────── Movimento de cartas ─────────────────────────

function toRef(c: CardRef): CardRef {
  return { uid: c.uid, cardId: c.cardId, owner: c.owner };
}

function takeFromHand(p: PlayerState, uid: string): CardRef {
  const i = p.hand.findIndex((c) => c.uid === uid);
  return p.hand.splice(i, 1)[0];
}

type LeaveReason = 'destroyed' | 'sacrificed' | 'bounced';

/** Tira uma criatura da mesa e manda para o lugar certo (Morto, deck ou mão). */
function leaveField(s: GameState, ev: GameEvent[], uid: string, reason: LeaveReason): void {
  const loc = findCreature(s, uid);
  if (!loc) return;
  s.players[loc.side].creatures[loc.zone] = null;
  const ref = toRef(loc.c);
  const owner = s.players[ref.owner];

  // Caio: os marcadores de frio somem quando ele sai.
  for (const p of s.players) delete p.frio[uid];

  if (reason === 'bounced') {
    if (owner.hand.length < RULES.HAND_LIMIT) {
      owner.hand.push(ref);
      ev.push({ type: 'toHand', uid, cardId: ref.cardId });
    } else {
      owner.dead.push(ref);
      ev.push({ type: 'destroy', uid, cardId: ref.cardId });
    }
    return;
  }

  if (reason === 'destroyed') {
    // Chat GPT: "Estou na nuvem, otário." Destruída, volta para o deck.
    const cloud = findAbility(ref.cardId, (a) => a.trigger === 'on_destroyed' && a.replace === 'shuffle_into_owner_deck');
    if (cloud) {
      owner.deck.push(ref);
      shuffle(s, owner.deck);
      ev.push({ type: 'toDeck', uid, cardId: ref.cardId });
      return;
    }
    owner.dead.push(ref);
    ev.push({ type: 'destroy', uid, cardId: ref.cardId });
    return;
  }

  owner.dead.push(ref);
  ev.push({ type: 'sacrifice', player: ref.owner, uid, cardId: ref.cardId });
}

// ───────────────────────── Invocação ─────────────────────────

function doSummon(
  s: GameState,
  ev: GameEvent[],
  uid: string,
  mode: Mode,
  sacrifices: string[],
  target: string | null,
): void {
  const side = s.active;
  const p = s.players[side];
  for (const sac of sacrifices) leaveField(s, ev, sac, 'sacrificed');

  const card = takeFromHand(p, uid);
  const zone = p.creatures.indexOf(null);
  const creature: FieldCreature = {
    ...card,
    mode,
    enteredTurn: s.turn,
    modeChangedTurn: -1,
    attacksThisTurn: 0,
    lockedUntilOwnerTurn: 0,
    mods: [],
    flags: {},
  };
  p.creatures[zone] = creature;
  p.summonsThisTurn++;
  ev.push({ type: 'summon', player: side, uid: card.uid, cardId: card.cardId, mode, zone });

  // Thays ("Carona"): guarda se o gatilho já estava na mesa quando ela entrou.
  const carona = findAbility(card.cardId, (a) => a.on === 'opponent_summons');
  if (carona) {
    const id = (carona.condition as { summonedCardId: string }).summonedCardId;
    creature.flags.caronaBlocked = allCreatures(s).some(({ c }) => c.cardId === id);
  }

  // Habilidades "ao ser invocada".
  for (const ab of cardDef(card.cardId).abilities) {
    if (ab.trigger !== 'on_summon') continue;
    const eff = (ab.effect ?? {}) as Record<string, unknown>;
    if (typeof eff.millSelf === 'number') {
      for (let i = 0; i < eff.millSelf && p.deck.length; i++) {
        const milled = p.deck.shift()!;
        p.dead.push(milled);
        ev.push({ type: 'mill', player: side, uid: milled.uid, cardId: milled.cardId });
      }
    }
    if (ab.choose && target) {
      const tLoc = findCreature(s, target);
      if (!tLoc) continue;
      if (eff.cannotAttack && typeof eff.forTargetOwnerTurns === 'number') {
        const until = s.players[tLoc.side].turnsStarted + eff.forTargetOwnerTurns;
        tLoc.c.lockedUntilOwnerTurn = Math.max(tLoc.c.lockedUntilOwnerTurn, until);
        ev.push({ type: 'lock', uid: target, untilOwnerTurn: until, source: card.cardId });
      }
      if (eff.returnToHand) leaveField(s, ev, target, 'bounced');
    }
  }

  // Carona: se este card dispara a troca de lado de uma Thays do oponente.
  for (const o of creaturesOf(s, other(side))) {
    const ab = findAbility(o.c.cardId, (a) => a.on === 'opponent_summons');
    if (!ab || o.c.flags.caronaBlocked) continue;
    if ((ab.condition as { summonedCardId: string }).summonedCardId !== card.cardId) continue;
    const free = p.creatures.indexOf(null);
    if (free < 0) continue;
    s.players[o.side].creatures[o.zone] = null;
    p.creatures[free] = o.c;
    ev.push({ type: 'controlChange', uid: o.c.uid, to: side });
  }
}

// ───────────────────────── Efeitos ─────────────────────────

function doPlayEffect(s: GameState, ev: GameEvent[], uid: string, target: string | null, costs: string[]): void {
  const side = s.active;
  const p = s.players[side];
  const card = takeFromHand(p, uid);
  const def = cardDef(card.cardId);
  ev.push({ type: 'effectPlayed', player: side, uid, cardId: card.cardId, target });

  if (def.durationTurns) {
    // Fica na mesa (ex.: Ar Condicionado). A aura é calculada em stats.ts.
    const zone = p.effects.indexOf(null);
    p.effects[zone] = { ...card, faceDown: false, turnsLeft: def.durationTurns, setTurn: s.turn };
    return;
  }

  const ab = def.abilities.find((a) => a.trigger === 'on_play');
  const eff = (ab?.effect ?? {}) as Record<string, unknown>;
  for (const c of costs) leaveField(s, ev, c, 'sacrificed');
  if (typeof eff.healOwner === 'number') heal(s, ev, side, eff.healOwner, card.cardId);

  if (target && (typeof eff.atk === 'number' || typeof eff.def === 'number')) {
    const tLoc = findCreature(s, target)!;
    const tDef = cardDef(tLoc.c.cardId);
    const immuneList = (eff.defReductionImmune as string[] | undefined) ?? [];
    const atk = (eff.atk as number | undefined) ?? 0;
    let defMod = (eff.def as number | undefined) ?? 0;
    if (defMod < 0 && (immuneList.includes(tLoc.c.cardId) || isImmune(tDef, def))) defMod = 0;
    tLoc.c.mods.push({ atk, def: defMod, until: 'permanent', source: card.cardId });
    ev.push({ type: 'statMod', uid: target, source: card.cardId, atk, def: defMod });
  }

  p.dead.push(card);
}

// ───────────────────────── Combate ─────────────────────────

function doAttack(s: GameState, ev: GameEvent[], attackerUid: string, targetUid: string | null): void {
  const side = s.active;
  const oppSide = other(side);
  const att = findCreature(s, attackerUid)!;
  const attDef = cardDef(att.c.cardId);
  const second = att.c.attacksThisTurn >= 1;
  att.c.attacksThisTurn++;
  ev.push({ type: 'attack', attacker: attackerUid, target: targetUid, second });

  // 1) Armadilhas do oponente.
  const opp = s.players[oppSide];
  for (let i = 0; i < opp.effects.length; i++) {
    const trap = opp.effects[i];
    if (!trap || !trap.faceDown) continue;
    const tDef = cardDef(trap.cardId);
    const ab = tDef.abilities.find((a) => a.trigger === 'trap' && a.on === 'enemy_attack_declared');
    if (!ab) continue;
    const cond = ab.condition as { attackerDepartment?: string } | undefined;
    if (cond?.attackerDepartment && cond.attackerDepartment !== attDef.department) continue;
    if (isImmune(attDef, tDef)) continue;
    opp.effects[i] = null;
    opp.dead.push(toRef(trap));
    ev.push({ type: 'trapTriggered', player: oppSide, uid: trap.uid, cardId: trap.cardId, against: attackerUid });
    const eff = ab.effect as { negateAttack?: boolean; endTurn?: boolean };
    if (eff.negateAttack) ev.push({ type: 'attackNegated', attacker: attackerUid, by: trap.cardId });
    if (eff.endTurn) endTurn(s, ev);
    if (eff.negateAttack) return;
  }

  // 2) Gatilhos "quando o inimigo ataca" (Bruno: moeda).
  for (const o of creaturesOf(s, oppSide)) {
    const oDef = cardDef(o.c.cardId);
    for (const ab of oDef.abilities) {
      if (ab.trigger !== 'continuous' || ab.on !== 'enemy_attack_declared' || !ab.coinFlip) continue;
      if (isImmune(attDef, oDef)) continue;
      const result = flipCoin(s);
      ev.push({ type: 'coin', source: o.c.uid, result, target: attackerUid });
      if (result === 'coroa') {
        const onLose = ab.onLose as { multiplyAtk?: number; multiplyDef?: number };
        att.c.mods.push({ atk: 0, def: 0, mulAtk: onLose.multiplyAtk, mulDef: onLose.multiplyDef, until: 'end_of_turn', source: oDef.id });
        ev.push({ type: 'statMod', uid: attackerUid, source: oDef.id, atk: 0, def: 0, mul: onLose.multiplyAtk });
      }
    }
  }

  // 3) Gatilhos "ao atacar" do próprio atacante (Caio: frio).
  for (const ab of attDef.abilities) {
    if (ab.trigger !== 'on_attack') continue;
    const eff = ab.effect as { addCounterToOpponent?: string; amount?: number };
    if (eff.addCounterToOpponent === 'frio') {
      opp.frio[attackerUid] = (opp.frio[attackerUid] ?? 0) + (eff.amount ?? 1);
      ev.push({ type: 'frio', player: oppSide, counters: Object.values(opp.frio).reduce((a, b) => a + b, 0) });
    }
  }

  // 4) Resolução.
  const ctx: CombatCtx = { attackerUid, defenderUid: targetUid, secondAttack: second };
  const A = stats(s, attackerUid, ctx).atk;

  if (targetUid === null) {
    ev.push({ type: 'combat', attacker: attackerUid, defender: null, atk: A, against: 0, defenderMode: null });
    dealCombatDamage(s, ev, att, null, oppSide, A, true);
    return;
  }

  const dLoc = findCreature(s, targetUid)!;
  const defMode = dLoc.c.mode;
  const dStats = stats(s, targetUid, ctx);
  const D = defMode === 'ATK' ? dStats.atk : dStats.def;
  ev.push({ type: 'combat', attacker: attackerUid, defender: targetUid, atk: A, against: D, defenderMode: defMode });

  if (defMode === 'ATK') {
    if (A > D) {
      leaveField(s, ev, targetUid, 'destroyed');
      dealCombatDamage(s, ev, att, dLoc, oppSide, A - D, false);
    } else if (A < D) {
      leaveField(s, ev, attackerUid, 'destroyed');
      dealCombatDamage(s, ev, dLoc, att, side, D - A, false);
    } else {
      leaveField(s, ev, targetUid, 'destroyed');
      leaveField(s, ev, attackerUid, 'destroyed');
    }
  } else {
    if (A > D) {
      leaveField(s, ev, targetUid, 'destroyed');
    } else if (A < D) {
      dealCombatDamage(s, ev, dLoc, att, side, D - A, false);
    }
  }
}

/**
 * Dano de combate ao CAIXA. `winner` é a criatura que "causou" o dano.
 * Ralph dobra a diferença quando ele vence (nunca em ataque direto). Siamesas devolvem o dano como cura.
 */
function dealCombatDamage(
  s: GameState,
  ev: GameEvent[],
  winner: CreatureLoc,
  _loser: CreatureLoc | null,
  victim: PlayerId,
  amount: number,
  direct: boolean,
): void {
  const wDef = cardDef(winner.c.cardId);
  let dmg = amount;
  const ralph = wDef.abilities.find((a) => a.trigger === 'on_combat_won' && typeof a.combatDifferenceMultiplier === 'number');
  if (ralph && !(direct && ralph.excludesDirectAttack)) dmg *= ralph.combatDifferenceMultiplier as number;
  damage(s, ev, victim, dmg, winner.c.cardId);
  if (wDef.abilities.some((a) => a.lifelink)) heal(s, ev, winner.side, dmg, winner.c.cardId);
}

// ───────────────────────── Utilidades para a tela e a IA ─────────────────────────

/** Situação do limite de mão, para a tela mostrar os avisos do GDD §7.1. */
export function handLimitStatus(s: GameState): 'ok' | 'play_cards' | 'must_discard' {
  const p = s.players[s.active];
  if (!p.pendingDraw) return 'ok';
  const fieldFull = freeZones(p.creatures) === 0 && freeZones(p.effects) === 0;
  return fieldFull ? 'must_discard' : 'play_cards';
}
