// Calibra a campanha: (1) procura o deck mais forte para o chefe e (2) mede quanto um jogador vence em cada faixa.
// O "jogador" é a IA padrão (substituta de uma pessoa que joga bem, sem erros bobos).
// Uso: node scripts/campaign-sim.ts [passos da busca=40] [partidas por medida=300]
import { writeFileSync } from 'node:fs';
import { applyAction } from '../src/engine/engine.ts';
import { createGame, TEST_DECK_RULES } from '../src/engine/setup.ts';
import { CARDS } from '../src/engine/cards.ts';
import { chooseWithProfile, DEFAULT_WEIGHTS, type AIProfile } from '../src/ai/ai.ts';
import { CAMPAIGN, expandDeck, profileOf, deckFromPool } from '../src/meta/campaign.ts';
import { randomDeck } from '../src/sim/randomDeck.ts';
import metaData from '../data/meta.json' with { type: 'json' };

const STEPS = Number(process.argv[2] ?? 40), G = Number(process.argv[3] ?? 300);
const PLAYER: AIProfile = { weights: DEFAULT_WEIGHTS, mistake: 0 };
const starter = expandDeck(metaData.starterDeck.cards as Record<string, number>);
const starterIds = Object.keys(metaData.starterDeck.cards);
const allIds = CARDS.map((c) => c.id);

/** Fração de vitórias do jogador (deck `mine` e perfil `me`) contra a rival (gerador de deck + perfil), trocando quem começa. */
function winRate(mine: (r: { rng: number }) => string[], rival: (r: { rng: number }) => string[], me: AIProfile, them: AIProfile, games: number, seed0 = 1): number {
  let w = 0, dec = 0;
  for (let g = 0; g < games; g++) {
    const seed = seed0 + g * 7919, r = { rng: seed }, rr = { rng: seed ^ 0x5bd1e995 };
    let x = seed; const rnd = () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const a = mine(r), b = rival(r);
    const swap = g % 2 === 1, decks: [string[], string[]] = swap ? [b, a] : [a, b], prof = swap ? [them, me] : [me, them], meSide = swap ? 1 : 0;
    let s = createGame({ seed, decks, deckRules: TEST_DECK_RULES }).state, n = 0;
    while (s.phase !== 'over' && n++ < 5000) s = applyAction(s, chooseWithProfile(s, prof[s.active], rnd)).state;
    void rr;
    if (s.winner === 'draw' || s.winner === null) continue;
    dec++; if (s.winner === meSide) w++;
  }
  return w / Math.max(1, dec);
}
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

// 1) deck do chefe: começa no melhor deck temático e troca uma carta por vez, guardando só o que melhora.
// Adversários de teste: os decks temáticos e decks aleatórios, jogados pela IA padrão; o chefe usa a IA afiada.
const sharp = profileOf('sharp');
const panel = (r: { rng: number }) => { const k = Math.floor((r.rng >>> 3) % (CAMPAIGN.themeDecks.length + 2)); return k < CAMPAIGN.themeDecks.length ? expandDeck(CAMPAIGN.themeDecks[k].cards) : randomDeck(r, TEST_DECK_RULES); };
const strength = (deck: string[], games = 160, seed = 11) => winRate(() => deck, panel, sharp, PLAYER, games, seed);
const themes = CAMPAIGN.themeDecks.map((d) => ({ name: d.name, deck: expandDeck(d.cards), v: strength(expandDeck(d.cards)) }));
themes.sort((a, b) => b.v - a.v);
console.log('decks temáticos (IA afiada contra o painel):', themes.map((t) => `${t.name} ${pct(t.v)}`).join(' · '));
let best = [...themes[0].deck], bestV = themes[0].v;
let x = 4242; const rnd = () => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
for (let i = 0; i < STEPS; i++) {
  const cand = [...best]; const out = Math.floor(rnd() * cand.length);
  const options = allIds.filter((id) => id !== cand[out] && cand.filter((c) => c === id).length < TEST_DECK_RULES.maxCopies);
  cand[out] = options[Math.floor(rnd() * options.length)];
  const v = strength(cand);
  if (v > bestV) { best = cand; bestV = v; console.log(`passo ${i + 1}: ${pct(v)}`); }
}
const confirm = strength(best, 600, 777), confirmTheme = strength(themes[0].deck, 600, 777);
const bossMap: Record<string, number> = {}; for (const id of [...best].sort()) bossMap[id] = (bossMap[id] ?? 0) + 1;
console.log('deck do chefe:', JSON.stringify(bossMap), 'força', pct(confirm), `(melhor temático: ${pct(confirmTheme)})`);

// 2) chance de vitória do jogador em cada faixa, com o kit do novato e com um deck temático bom
const rows: string[] = [];
for (const [label, mine, pool] of [['kit do novato', () => starter, starterIds], ['deck temático (Criação em fúria)', () => expandDeck(CAMPAIGN.themeDecks[0].cards), allIds]] as const) {
  const t1 = winRate(mine, (r) => deckFromPool(r, pool as string[]), PLAYER, profileOf('sloppy'), G, 31);
  const t2 = winRate(mine, (r) => randomDeck(r, TEST_DECK_RULES), PLAYER, profileOf('normal'), G, 32);
  const t3 = winRate(mine, (r) => expandDeck(CAMPAIGN.themeDecks[Math.floor(((r.rng >>> 5) % CAMPAIGN.themeDecks.length))].cards), PLAYER, sharp, G, 33);
  const tb = winRate(mine, () => best, PLAYER, sharp, G, 34);
  rows.push(`| ${label} | ${pct(t1)} | ${pct(t2)} | ${pct(t3)} | ${pct(tb)} |`);
  console.log(label, pct(t1), pct(t2), pct(t3), pct(tb));
}
writeFileSync('docs/CAMPAIGN.md', `# Campanha: calibragem

> Gerado por \`node scripts/campaign-sim.ts ${STEPS} ${G}\` em ${new Date().toISOString().slice(0, 10)}. O "jogador" é a IA padrão sem erros.

## Faixas
| Batalhas | Faixa | IA da rival | Deck da rival | Recompensa |
|---|---|---|---|---|
${CAMPAIGN.tiers.map((t) => `| ${t.from}–${t.to} | ${t.name} | ${t.ai === 'sloppy' ? `padrão, erra ${Math.round(CAMPAIGN.ai.sloppy.mistake * 100)}% das jogadas` : t.ai === 'sharp' ? 'afiada (pesos de SHARP_WEIGHTS)' : 'padrão'} | ${t.deck === 'pool' ? 'sorteado entre as cartas que você tem' : t.deck === 'market' ? 'sorteado entre todas as cartas' : 'um dos decks temáticos'} | ×${t.reward} |`).join('\n')}
| 30 | ${CAMPAIGN.boss.name} (chefe) | afiada | o deck mais forte achado pela busca | ×${CAMPAIGN.boss.reward} |

## Chance de vitória do jogador (${G} partidas por célula)
| Deck do jogador | 1–10 | 11–20 | 21–29 | Chefe |
|---|---|---|---|---|
${rows.join('\n')}

## Deck do chefe
Busca de ${STEPS} passos a partir de "${themes[0].name}". Força contra o painel (decks temáticos + aleatórios, IA padrão): **${pct(confirm)}** (o melhor temático faz ${pct(confirmTheme)}).

\`\`\`json
${JSON.stringify(bossMap)}
\`\`\`
`);
