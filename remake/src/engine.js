// Ponte para o motor oficial (TypeScript, coberto pelos testes em tests/):
// regras em src/engine, IA em src/ai. Mantém os nomes que a interface do remake já usa.
// O motor JS antigo deste arquivo era uma cópia 1:1 do motor oficial (verificado em 300 partidas /
// 51.890 jogadas sem nenhuma diferença antes da troca).
import { createGame as baseCreateGame, TEST_DECK_RULES } from '../../src/engine/setup.ts';
import { randomDeck } from '../../src/sim/randomDeck.ts';

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
export { chooseAction as aiChoose } from '../../src/ai/ai.ts';
export { previewAttack } from '../../src/engine/preview.ts';

export function isEffect(def) {
  return def.kind === 'effect_instant' || def.kind === 'effect_trap';
}

/** Partida nova com decks sorteados (até 3 cópias enquanto houver poucas cartas — exceção de teste do GDD). */
export function createGame(names) {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const r = { rng: seed };
  const decks = [randomDeck(r, TEST_DECK_RULES), randomDeck(r, TEST_DECK_RULES)];
  const { state, events } = baseCreateGame({ seed, decks, names, deckRules: TEST_DECK_RULES });
  return { state, events, seed };
}
