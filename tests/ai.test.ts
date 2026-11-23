// A IA joga partidas inteiras sem travar e sem ações inválidas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playOut } from '../src/ai/ai.ts';
import { createGame, TEST_DECK_RULES } from '../src/engine/setup.ts';
import { randomDeck } from '../src/sim/randomDeck.ts';

test('IA × IA: 30 partidas com decks aleatórios terminam com vencedor', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const rng = { rng: seed * 7919 };
    const decks: [string[], string[]] = [randomDeck(rng, TEST_DECK_RULES), randomDeck(rng, TEST_DECK_RULES)];
    const { state } = createGame({ seed, decks, deckRules: TEST_DECK_RULES });
    const result = playOut(state);
    assert.equal(result.state.phase, 'over', `semente ${seed} não terminou em ${result.actions} ações`);
    assert.notEqual(result.state.winner, null);
  }
});
