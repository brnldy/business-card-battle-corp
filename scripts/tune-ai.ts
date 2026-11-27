// Procura pesos de IA mais fortes que os padrões (para a IA "afiada" das batalhas 21–30).
// Cada candidato joga contra a IA padrão com decks aleatórios, trocando de lugar a cada partida.
// Uso: node scripts/tune-ai.ts [candidatos=14] [partidas=200]
import { playOut, DEFAULT_WEIGHTS, type AIWeights } from '../src/ai/ai.ts';
import { createGame, TEST_DECK_RULES } from '../src/engine/setup.ts';
import { randomDeck } from '../src/sim/randomDeck.ts';

const N = Number(process.argv[2] ?? 14), G = Number(process.argv[3] ?? 200);
let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

export function score(w: AIWeights, games: number, seed0 = 7): number {
  let wins = 0, decided = 0;
  for (let g = 0; g < games; g++) {
    const seed = seed0 + g * 7919, r = { rng: seed };
    const decks: [string[], string[]] = [randomDeck(r, TEST_DECK_RULES), randomDeck(r, TEST_DECK_RULES)];
    const me = g % 2 as 0 | 1;
    const { state } = createGame({ seed, decks, deckRules: TEST_DECK_RULES });
    const ws: [AIWeights, AIWeights] = me === 0 ? [w, DEFAULT_WEIGHTS] : [DEFAULT_WEIGHTS, w];
    const end = playOut(state, ws, 5000).state;
    if (end.winner === 'draw' || end.winner === null) continue;
    decided++; if (end.winner === me) wins++;
  }
  return wins / Math.max(1, decided);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cands: AIWeights[] = [];
  for (let i = 0; i < N; i++) {
    const m = (v: number, a = 0.6) => Math.round(v * (1 - a + rnd() * 2 * a) * 100) / 100;
    cands.push({ creatureValue: m(DEFAULT_WEIGHTS.creatureValue), creatureBase: m(DEFAULT_WEIGHTS.creatureBase), handCard: m(DEFAULT_WEIGHTS.handCard), trap: m(DEFAULT_WEIGHTS.trap), frioCounter: m(DEFAULT_WEIGHTS.frioCounter), threat: m(DEFAULT_WEIGHTS.threat), minGain: 1 });
  }
  const res = cands.map((w) => ({ w, r: score(w, G) })).sort((a, b) => b.r - a.r);
  for (const x of res.slice(0, 5)) console.log((x.r * 100).toFixed(1) + '%', JSON.stringify(x.w));
  console.log('confirmando o melhor com', G * 3, 'partidas (sementes novas):', (score(res[0].w, G * 3, 99991) * 100).toFixed(1) + '%');
}
