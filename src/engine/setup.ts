// Montagem de decks e início da partida.
import { RULES } from './rules.ts';
import { CARDS_BY_ID } from './cards.ts';
import { flipCoin, shuffle } from './rng.ts';
import type { ApplyResult, CardRef, GameEvent, GameState, PlayerId, PlayerState } from './types.ts';
import { startTurn } from './engine.ts';

export interface DeckRules {
  size: number;
  maxCopies: number;
}

export const OFFICIAL_DECK_RULES: DeckRules = { size: RULES.DECK_SIZE, maxCopies: RULES.MAX_COPIES };
/** Exceção temporária enquanto existem menos de 20 cartas diferentes. */
export const TEST_DECK_RULES: DeckRules = { size: RULES.DECK_SIZE, maxCopies: 3 };

export function validateDeck(cardIds: string[], rules: DeckRules): string[] {
  const errors: string[] = [];
  if (cardIds.length !== rules.size) errors.push(`O deck precisa ter ${rules.size} cartas (tem ${cardIds.length}).`);
  const counts = new Map<string, number>();
  for (const id of cardIds) {
    if (!CARDS_BY_ID.has(id)) errors.push(`Carta desconhecida: ${id}`);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const [id, n] of counts) {
    if (n > rules.maxCopies) errors.push(`${id}: ${n} cópias (máximo ${rules.maxCopies}).`);
  }
  return errors;
}

export interface NewGameOptions {
  seed: number;
  decks: [string[], string[]];
  names?: [string, string];
  firstPlayer?: PlayerId;
  /** Testes: mantém a ordem do deck como foi passada (índice 0 = topo). */
  noShuffle?: boolean;
  deckRules?: DeckRules | null; // null = não valida (testes)
}

function newPlayer(id: PlayerId, name: string): PlayerState {
  return {
    id,
    name,
    caixa: RULES.STARTING_CAIXA,
    deck: [],
    hand: [],
    dead: [],
    creatures: Array(RULES.CREATURE_ZONES).fill(null),
    effects: Array(RULES.EFFECT_ZONES).fill(null),
    frio: {},
    turnsStarted: 0,
    summonsThisTurn: 0,
    pendingDraw: false,
  };
}

export function createGame(opts: NewGameOptions): ApplyResult {
  const rules = opts.deckRules === undefined ? OFFICIAL_DECK_RULES : opts.deckRules;
  if (rules) {
    opts.decks.forEach((d, i) => {
      const errs = validateDeck(d, rules);
      if (errs.length) throw new Error(`Deck ${i + 1} inválido: ${errs.join(' ')}`);
    });
  }
  const names = opts.names ?? ['Jogador 1', 'Jogador 2'];
  const s: GameState = {
    version: 1,
    rng: opts.seed | 0,
    turn: 1,
    active: 0,
    firstPlayer: 0,
    phase: 'main',
    players: [newPlayer(0, names[0]), newPlayer(1, names[1])],
    winner: null,
    endReason: null,
    nextUid: 1,
  };
  const events: GameEvent[] = [];

  opts.decks.forEach((ids, p) => {
    const deck: CardRef[] = ids.map((cardId) => ({ uid: `c${s.nextUid++}`, cardId, owner: p as PlayerId }));
    if (!opts.noShuffle) shuffle(s, deck);
    s.players[p].deck = deck;
  });

  s.firstPlayer = opts.firstPlayer ?? (flipCoin(s) === 'cara' ? 0 : 1);
  s.active = s.firstPlayer;
  events.push({ type: 'gameStart', firstPlayer: s.firstPlayer });

  for (const p of s.players) {
    for (let i = 0; i < RULES.STARTING_HAND && p.deck.length; i++) {
      const card = p.deck.shift()!;
      p.hand.push(card);
      events.push({ type: 'draw', player: p.id, uid: card.uid, cardId: card.cardId });
    }
  }

  startTurn(s, events);
  return { state: s, events };
}
