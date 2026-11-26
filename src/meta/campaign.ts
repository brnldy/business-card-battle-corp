// Campanha: 30 batalhas contra empresas sorteadas, com a dificuldade subindo de 10 em 10 e um chefe na 30ª.
// Lógica pura (sem tela): quem grava é o save (src/meta/meta.ts → applyMatch) e quem mostra é o lobby.
// Números e nomes em data/campaign.json; calibragem em docs/CAMPAIGN.md (scripts/campaign-sim.ts).
import data from '../../data/campaign.json' with { type: 'json' };
import { DEFAULT_WEIGHTS, SHARP_WEIGHTS, type AIProfile } from '../ai/ai.ts';
import { random, shuffle } from '../engine/rng.ts';
import { TEST_DECK_RULES } from '../engine/setup.ts';
import { randomDeck } from '../sim/randomDeck.ts';

type DeckMap = Record<string, number>;
interface TierDef { from: number; to: number; name: string; ai: string; deck: 'pool' | 'market' | 'theme'; reward: number }
export const CAMPAIGN = data as unknown as {
  length: number; companies: string[]; tiers: TierDef[];
  boss: { name: string; ai: string; reward: number; deck: DeckMap | null };
  ai: Record<string, { mistake: number; weights: 'default' | 'sharp' }>;
  themeDecks: { name: string; cards: DeckMap }[];
};
/** Todas as rivais da campanha (as 29 sorteadas + o chefe). */
export const ALL_RIVALS = [...CAMPAIGN.companies, CAMPAIGN.boss.name];

/** Onde o jogador está: `stage` = batalhas já vencidas (0 a 30); `order` = as 30 rivais na ordem desta empresa. */
export interface CampaignState { order: string[]; stage: number; cleared: boolean }

export const expandDeck = (m: DeckMap): string[] => Object.entries(m).flatMap(([id, n]) => Array<string>(n).fill(id));

/** Campanha nova: as 29 empresas embaralhadas e o chefe sempre no fim. */
export function newCampaign(seed = 1): CampaignState {
  const r = { rng: seed | 0 || 1 }, list = [...CAMPAIGN.companies];
  shuffle(r, list);
  return { order: [...list, CAMPAIGN.boss.name], stage: 0, cleared: false };
}
/** Conserta campanhas antigas ou incompletas (empresas novas no arquivo, chefe trocado). */
export function fixCampaign(c: Partial<CampaignState> | undefined, seed = 1): CampaignState {
  if (!c || !Array.isArray(c.order)) return newCampaign(seed);
  const known = new Set(CAMPAIGN.companies), keep = c.order.filter((n) => known.has(n));
  const missing = CAMPAIGN.companies.filter((n) => !keep.includes(n));
  const order = [...keep, ...missing].slice(0, CAMPAIGN.length - 1).concat(CAMPAIGN.boss.name);
  const stage = Math.max(0, Math.min(CAMPAIGN.length, Number(c.stage) | 0));
  return { order, stage, cleared: !!c.cleared || stage >= CAMPAIGN.length };
}

export const isBossStage = (stage: number): boolean => stage === CAMPAIGN.length - 1;
/** Faixa (0, 1, 2) ou 3 para o chefe, pela batalha (0 = primeira). */
export function tierOf(stage: number): number {
  if (isBossStage(stage)) return 3;
  const n = stage + 1;
  return Math.max(0, CAMPAIGN.tiers.findIndex((t) => n >= t.from && n <= t.to));
}
export function profileOf(key: string): AIProfile {
  const a = CAMPAIGN.ai[key] ?? CAMPAIGN.ai.normal;
  return { mistake: a.mistake, weights: a.weights === 'sharp' ? SHARP_WEIGHTS : DEFAULT_WEIGHTS };
}

/** Deck sorteado só entre as cartas que o jogador tem (até 3 cópias): a faixa 1 joga com as mesmas armas que você. */
export function deckFromPool(r: { rng: number }, ids: string[]): string[] {
  const pool = ids.flatMap((id) => Array<string>(TEST_DECK_RULES.maxCopies).fill(id));
  if (pool.length < TEST_DECK_RULES.size) return randomDeck(r, TEST_DECK_RULES);
  const deck: string[] = [];
  while (deck.length < TEST_DECK_RULES.size) deck.push(pool.splice(Math.floor(random(r) * pool.length), 1)[0]);
  return deck;
}
export const bossDeck = (): string[] => expandDeck(CAMPAIGN.boss.deck ?? CAMPAIGN.themeDecks[0].cards);

export interface RivalPlan {
  name: string; stage: number; total: number; tier: number; tierName: string; boss: boolean; free: boolean;
  ai: AIProfile; deck: string[]; deckName: string | null; reward: number;
}
/**
 * A próxima reunião: quem é a rival, com que deck e que IA. Depois da campanha concluída, as reuniões são livres:
 * rival qualquer das 30, no nível mais alto, sem avançar nada.
 */
export function rivalPlan(c: CampaignState, poolIds: string[], seed: number): RivalPlan {
  const r = { rng: seed | 0 || 1 };
  const free = c.cleared || c.stage >= CAMPAIGN.length;
  const stage = free ? Math.floor(random(r) * (CAMPAIGN.length - 1)) : c.stage;
  const tier = free ? 2 : tierOf(stage), boss = !free && tier === 3;
  const name = free ? c.order[Math.floor(random(r) * c.order.length)] : c.order[stage];
  if (boss) return { name, stage: stage + 1, total: CAMPAIGN.length, tier, tierName: 'Chefe final', boss, free, ai: profileOf(CAMPAIGN.boss.ai), deck: bossDeck(), deckName: null, reward: CAMPAIGN.boss.reward };
  const t = CAMPAIGN.tiers[tier];
  let deck: string[], deckName: string | null = null;
  if (t.deck === 'pool') deck = deckFromPool(r, poolIds);
  else if (t.deck === 'market') deck = randomDeck(r, TEST_DECK_RULES);
  else { const d = CAMPAIGN.themeDecks[Math.floor(random(r) * CAMPAIGN.themeDecks.length)]; deck = expandDeck(d.cards); deckName = d.name; }
  return { name, stage: stage + 1, total: CAMPAIGN.length, tier, tierName: t.name, boss, free, ai: profileOf(t.ai), deck, deckName, reward: free ? 1 : t.reward };
}

/** Resultado de uma batalha da campanha: vitória avança uma casa; derrota e empate deixam na mesma. */
export function advanceCampaign(c: CampaignState, stagePlayed: number, result: 'win' | 'loss' | 'draw'): { campaign: CampaignState; advanced: boolean; finished: boolean } {
  if (c.cleared || result !== 'win' || stagePlayed !== c.stage + 1) return { campaign: c, advanced: false, finished: false };
  const stage = c.stage + 1, cleared = stage >= CAMPAIGN.length;
  return { campaign: { ...c, stage, cleared }, advanced: true, finished: cleared };
}
