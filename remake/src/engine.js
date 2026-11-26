// Ponte para o motor oficial (TypeScript, coberto pelos testes em tests/):
// regras em src/engine, IA em src/ai. Mantém os nomes que a interface do remake já usa.
// O motor JS antigo deste arquivo era uma cópia 1:1 do motor oficial (verificado em 300 partidas /
// 51.890 jogadas sem nenhuma diferença antes da troca).
import { createGame as baseCreateGame, TEST_DECK_RULES } from '../../src/engine/setup.ts';
import { randomDeck } from '../../src/sim/randomDeck.ts';
import { legalActions as legalOf } from '../../src/engine/engine.ts';
import { chooseAction } from '../../src/ai/ai.ts';
import { random as randomOf } from '../../src/engine/rng.ts';

export { RULES } from '../../src/engine/rules.ts';
export { legalActions, applyAction, handLimitStatus } from '../../src/engine/engine.ts';
export {
  cardDef,
  other,
  creaturesOf,
  findCreature,
  stats as statsOf,
  attacksAllowed as maxAttacks,
  canAttackNow as canAttack,
} from '../../src/engine/stats.ts';
export { chooseAction as aiChoose, chooseWithProfile } from '../../src/ai/ai.ts';
export { previewAttack } from '../../src/engine/preview.ts';

export function isEffect(def) {
  return def.kind === 'effect_instant' || def.kind === 'effect_trap';
}

/**
 * Deck do rival sorteado só entre as cartas que o jogador já tem (`ids`), até 3 cópias de cada.
 * Sem isso, o kit do novato perdia 89% das partidas para rivais com as cartas raras (simulação de 300 partidas);
 * com isso, ganha 59%. Conforme a coleção cresce, os rivais ganham as mesmas cartas.
 */
function deckFromPool(r, ids) {
  const pool = ids.flatMap((id) => Array(TEST_DECK_RULES.maxCopies).fill(id));
  if (pool.length < TEST_DECK_RULES.size) return randomDeck(r, TEST_DECK_RULES);
  const deck = [];
  while (deck.length < TEST_DECK_RULES.size) deck.push(pool.splice(Math.floor(randomOf(r) * pool.length), 1)[0]);
  return deck;
}

/** IA do estagiário (treino): quase metade das vezes faz uma jogada qualquer em vez da melhor. */
export function aiWeak(state) {
  const legal = legalOf(state);
  return Math.random() < 0.45 && legal.length ? legal[Math.floor(Math.random() * legal.length)] : chooseAction(state);
}

/**
 * Partida nova. O jogador entra com o deck escolhido no lobby (`myDeck`); o rival, com um deck sorteado
 * entre as cartas que o jogador já tem (`rivalPool`), até 3 cópias (exceção de teste do GDD enquanto houver poucas cartas).
 */
export function createGame(names, { myDeck = null, rivalPool = null, rivalDeck = null } = {}) {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const r = { rng: seed };
  const decks = [myDeck ?? randomDeck(r, TEST_DECK_RULES), rivalDeck ?? (rivalPool ? deckFromPool(r, rivalPool) : randomDeck(r, TEST_DECK_RULES))];
  const { state, events } = baseCreateGame({ seed, decks, names, deckRules: TEST_DECK_RULES });
  return { state, events, seed };
}
