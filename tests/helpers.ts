// Utilidades de teste: montam situações de mesa diretamente, sem jogar a partida toda.
import { applyAction } from '../src/engine/engine.ts';
import { createGame } from '../src/engine/setup.ts';
import { cardDef } from '../src/engine/stats.ts';
import type { Action, FieldCreature, GameEvent, GameState, Mode, PlayerId } from '../src/engine/types.ts';

export const FILLER = 'BCB-012'; // César: criatura sem habilidade

/** ATQ/DEF impressos na carta (data/cards.json): os testes calculam a partir deles, para sobreviver a rebalanceamentos. */
export const ATK = (id: string): number => cardDef(id).atk ?? 0;
export const DEF = (id: string): number => cardDef(id).def ?? 0;

/** Partida com decks previsíveis (sem embaralhar). Começa no turno 3 para permitir ataques. */
export function newGame(opts: { deck0?: string[]; deck1?: string[]; turn?: number } = {}): GameState {
  const deck = (d?: string[]) => [...(d ?? []), ...Array(40).fill(FILLER)].slice(0, 40);
  const { state } = createGame({
    seed: 1,
    decks: [deck(opts.deck0), deck(opts.deck1)],
    firstPlayer: 0,
    noShuffle: true,
    deckRules: null,
  });
  // Limpa as mãos para os testes controlarem tudo.
  for (const p of state.players) {
    p.deck.unshift(...p.hand);
    p.hand = [];
  }
  state.turn = opts.turn ?? 3;
  return state;
}

let uidCounter = 10_000;

export function hand(s: GameState, side: PlayerId, cardId: string): string {
  const uid = `t${uidCounter++}`;
  s.players[side].hand.push({ uid, cardId, owner: side });
  return uid;
}

export function put(
  s: GameState,
  side: PlayerId,
  cardId: string,
  mode: Mode = 'ATK',
  extra: Partial<FieldCreature> = {},
): string {
  const uid = `t${uidCounter++}`;
  const zone = s.players[side].creatures.indexOf(null);
  s.players[side].creatures[zone] = {
    uid,
    cardId,
    owner: side,
    mode,
    enteredTurn: 0,
    modeChangedTurn: -1,
    attacksThisTurn: 0,
    lockedUntilOwnerTurn: 0,
    mods: [],
    flags: {},
    ...extra,
  };
  return uid;
}

export function putTrap(s: GameState, side: PlayerId, cardId: string): string {
  const uid = `t${uidCounter++}`;
  const zone = s.players[side].effects.indexOf(null);
  s.players[side].effects[zone] = { uid, cardId, owner: side, faceDown: true, turnsLeft: null, setTurn: 0 };
  return uid;
}

export function act(s: GameState, a: Action): GameState {
  return applyAction(s, a).state;
}

export function actEv(s: GameState, a: Action): { state: GameState; events: GameEvent[] } {
  return applyAction(s, a);
}

/** Entra em batalha e ataca. */
export function attack(s: GameState, uid: string, target: string | null) {
  const inBattle = s.phase === 'battle' ? s : act(s, { type: 'enterBattle' });
  return actEv(inBattle, { type: 'attack', uid, target });
}

export function onField(s: GameState, uid: string): boolean {
  return s.players.some((p) => p.creatures.some((c) => c?.uid === uid));
}

export function inDead(s: GameState, side: PlayerId, uid: string): boolean {
  return s.players[side].dead.some((c) => c.uid === uid);
}
