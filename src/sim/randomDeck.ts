// Decks aleatórios para simulação: sorteia cartas respeitando o limite de cópias.
import { CARDS } from '../engine/cards.ts';
import { random } from '../engine/rng.ts';
import type { DeckRules } from '../engine/setup.ts';

export function randomDeck(rng: { rng: number }, rules: DeckRules): string[] {
  const pool: string[] = [];
  for (const c of CARDS) for (let i = 0; i < rules.maxCopies; i++) pool.push(c.id);
  const deck: string[] = [];
  while (deck.length < rules.size && pool.length) {
    const i = Math.floor(random(rng) * pool.length);
    deck.push(pool.splice(i, 1)[0]);
  }
  return deck;
}
