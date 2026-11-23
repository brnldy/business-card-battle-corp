// Simulação de balanceamento: N partidas IA × IA com decks aleatórios.
// Uso: node scripts/simulate.ts [partidas=500] [semente=1]
import { mkdirSync, writeFileSync } from 'node:fs';
import { playOut } from '../src/ai/ai.ts';
import { CARDS, CARDS_BY_ID } from '../src/engine/cards.ts';
import { createGame, TEST_DECK_RULES } from '../src/engine/setup.ts';
import { randomDeck } from '../src/sim/randomDeck.ts';
import type { PlayerId } from '../src/engine/types.ts';

const games = Number(process.argv[2] ?? 500);
const seed0 = Number(process.argv[3] ?? 1);

interface CardStat { played: number; playedByWinner: number; copyDiff: number; copyDiffSq: number; }
const cardStats = new Map<string, CardStat>(CARDS.map((c) => [c.id, { played: 0, playedByWinner: 0, copyDiff: 0, copyDiffSq: 0 }]));
let firstWins = 0, draws = 0, turnLimit = 0, totalTurns = 0, totalActions = 0, stalled = 0;
const turnHist: number[] = [];
const t0 = Date.now();

for (let g = 0; g < games; g++) {
  const seed = seed0 + g * 104729;
  const rng = { rng: seed };
  const decks: [string[], string[]] = [randomDeck(rng, TEST_DECK_RULES), randomDeck(rng, TEST_DECK_RULES)];
  const { state } = createGame({ seed, decks, deckRules: TEST_DECK_RULES });
  const played: [Set<string>, Set<string>] = [new Set(), new Set()];
  const result = playOut(state, undefined, 5000, (before, action) => {
    if (action.type === 'summon' || action.type === 'playEffect' || action.type === 'setTrap') {
      const card = before.players[before.active].hand.find((c) => c.uid === action.uid)!;
      played[before.active].add(card.cardId);
    }
  });
  const end = result.state;
  if (end.phase !== 'over') { stalled++; continue; }
  totalTurns += end.turn;
  turnHist.push(end.turn);
  totalActions += result.actions;
  if (end.endReason === 'turn_limit') turnLimit++;
  if (end.winner === 'draw') { draws++; continue; }
  if (end.winner === end.firstPlayer) firstWins++;
  // Cópias a mais no deck do vencedor (positivo = a carta ajuda a vencer).
  const count = (deck: string[], id: string) => deck.filter((x) => x === id).length;
  for (const c of CARDS) {
    const w = end.winner as PlayerId;
    const d = count(decks[w], c.id) - count(decks[w === 0 ? 1 : 0], c.id);
    const st = cardStats.get(c.id)!;
    st.copyDiff += d;
    st.copyDiffSq += d * d;
  }
  for (const p of [0, 1] as PlayerId[]) {
    for (const id of played[p]) {
      const st = cardStats.get(id)!;
      st.played++;
      if (end.winner === p) st.playedByWinner++;
    }
  }
}

const decided = games - draws - stalled;
const n = Math.max(1, decided);
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-') + '%';
turnHist.sort((a, b) => a - b);
const median = turnHist[Math.floor(turnHist.length / 2)];

const rows = [...cardStats.entries()]
  .map(([id, st]) => ({
    id,
    name: CARDS_BY_ID.get(id)!.name,
    ...st,
    winRate: st.played ? st.playedByWinner / st.played : 0,
    copyEdge: st.copyDiff / n,
    copyEdgeErr: Math.sqrt(Math.max(0, st.copyDiffSq / n - (st.copyDiff / n) ** 2) / n),
  }))
  .sort((a, b) => b.copyEdge - a.copyEdge);

const lines: string[] = [];
lines.push(`Partidas: ${games} (${decided} com vencedor, ${draws} empates, ${stalled} travadas) em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
lines.push(`Quem começa vence: ${pct(firstWins, decided)}`);
lines.push(`Duração: média ${(totalTurns / Math.max(1, games - stalled)).toFixed(1)} turnos, mediana ${median}, ${pct(turnLimit, games)} chegaram ao limite de 60`);
lines.push('');
lines.push('| Carta | Cópias a mais no vencedor | Jogada em | Vitória quando jogada |');
lines.push('|---|---|---|---|');
for (const r of rows) {
  const edge = `${r.copyEdge >= 0 ? '+' : ''}${r.copyEdge.toFixed(3)} ± ${(2 * r.copyEdgeErr).toFixed(3)}`;
  lines.push(`| ${r.id} ${r.name} | ${edge} | ${r.played} | ${(100 * r.winRate).toFixed(1)}% |`);
}
console.log(lines.join('\n'));

mkdirSync('output', { recursive: true });
writeFileSync('output/balance.json', JSON.stringify({ games, decided, draws, stalled, firstWins, turnLimit, avgTurns: totalTurns / Math.max(1, games - stalled), median, cards: rows }, null, 2));
