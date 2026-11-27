// Meta-jogo (o lobby): coleção, decks, loja, pacotes, reciclagem, metas do dia, conquistas, histórico.
// Lógica pura, sem tela nem navegador: recebe o save e devolve um save novo. Os números ficam em data/meta.json.
// Quem grava no navegador é remake/src/save.js; quem desenha é remake/src/lobbyui.js.
import metaData from '../../data/meta.json' with { type: 'json' };
import { CARDS, CARDS_BY_ID } from '../engine/cards.ts';
import { random } from '../engine/rng.ts';
import { TEST_DECK_RULES, validateDeck as validateList } from '../engine/setup.ts';
import type { DeckRules } from '../engine/setup.ts';
import type { GameEvent, GameState, PlayerId } from '../engine/types.ts';
import { newCampaign, fixCampaign, advanceCampaign, type CampaignState } from './campaign.ts';

export type Rarity = 'common' | 'rare' | 'legendary';
export type MissionKind = 'play' | 'win' | 'summon' | 'destroy' | 'damage' | 'effect' | 'trap' | 'sacrifice' | 'direct';
export interface MissionDef { id: string; kind: MissionKind; goal: number; reward: number; text: string }
export interface AchievementDef { id: string; name: string; text: string; reward: number }
export interface CosmeticDef { id: string; kind: 'logo' | 'back'; name: string; price: number }
export interface ReadyDeckDef { id: string; name: string; price: number; text: string; cards: Record<string, number> }

export const META = metaData as unknown as {
  startingPatrimonio: number; historyLimit: number; maxDecks: number; recycleRate: number; lossReward: number;
  singlePrice: Record<Rarity, number>;
  booster: { price: number; size: number; odds: Record<Rarity, number> };
  starterDeck: { name: string; cards: Record<string, number> };
  readyDecks: ReadyDeckDef[]; cosmetics: CosmeticDef[];
  missionsPerDay: number; missions: MissionDef[]; achievements: AchievementDef[];
};
/** Regras de deck do lobby: 40 cartas, até 3 cópias enquanto houver menos de 20 cartas diferentes (GDD §13). */
export const DECK_RULES: DeckRules = TEST_DECK_RULES;
export const RARITY_PT: Record<Rarity, string> = { common: 'Comum', rare: 'Rara', legendary: 'Lendária' };
export const rarityOf = (cardId: string): Rarity => (CARDS_BY_ID.get(cardId)?.rarity as Rarity | null | undefined) ?? 'common';

export interface Deck { name: string; cards: string[] }
export interface HistoryEntry { at: number; rival: string; result: 'win' | 'loss' | 'draw'; turns: number; caixa: [number, number]; reward: number }
export interface MissionState { id: string; progress: number; claimed: boolean }
export interface Stats {
  games: number; wins: number; losses: number; draws: number; streak: number; bestStreak: number;
  biggestHit: number; totalDamage: number; earned: number; packs: number; recycled: number;
  plays: Record<string, number>; rivals: Record<string, { w: number; l: number }>;
}
export interface Save {
  v: 1; rng: number; patrimonio: number;
  collection: Record<string, number>;
  decks: Deck[]; activeDeck: number;
  history: HistoryEntry[]; stats: Stats;
  missions: { day: string; list: MissionState[] };
  achievements: Record<string, number>;
  cosmetics: { owned: string[]; logo: string; back: string };
  /** campanha de 30 batalhas (src/meta/campaign.ts) */
  campaign: CampaignState;
}

const expand = (cards: Record<string, number>): string[] => Object.entries(cards).flatMap(([id, n]) => Array<string>(n).fill(id));
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const freeCosmetics = () => META.cosmetics.filter((c) => c.price === 0).map((c) => c.id);
const emptyStats = (): Stats => ({ games: 0, wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0, biggestHit: 0, totalDamage: 0, earned: 0, packs: 0, recycled: 0, plays: {}, rivals: {} });

/** Save de quem entra pela primeira vez: o kit do novato (que nunca se perde) e um troco de PATRIMÔNIO. */
export function newSave(seed = 1): Save {
  const free = freeCosmetics();
  return {
    v: 1, rng: seed | 0, patrimonio: META.startingPatrimonio,
    collection: { ...META.starterDeck.cards },
    decks: [{ name: META.starterDeck.name, cards: expand(META.starterDeck.cards) }], activeDeck: 0,
    history: [], stats: emptyStats(), missions: { day: '', list: [] }, achievements: {},
    cosmetics: { owned: free, logo: free.find((id) => id.startsWith('logo-'))!, back: free.find((id) => id.startsWith('back-'))! },
    campaign: newCampaign(seed ^ 0x2c1b3c6d),
  };
}
/** Conserta saves antigos ou incompletos sem jogar fora o que o jogador já tem. */
export function migrate(raw: unknown, seed = 1): Save {
  const base = newSave(seed);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Save>;
  const s: Save = { ...base, ...r, stats: { ...base.stats, ...(r.stats ?? {}) }, cosmetics: { ...base.cosmetics, ...(r.cosmetics ?? {}) }, missions: r.missions ?? base.missions } as Save;
  s.v = 1;
  s.campaign = fixCampaign(r.campaign, seed ^ 0x2c1b3c6d);
  // cartas que deixaram de existir saem da coleção e dos decks
  s.collection = Object.fromEntries(Object.entries(s.collection ?? {}).filter(([id, n]) => CARDS_BY_ID.has(id) && n > 0));
  s.decks = (Array.isArray(s.decks) ? s.decks : []).map((d) => ({ name: String(d.name ?? 'Deck'), cards: (d.cards ?? []).filter((id) => CARDS_BY_ID.has(id)) }));
  if (!s.decks.length) { s.decks = base.decks; for (const [id, n] of Object.entries(META.starterDeck.cards)) s.collection[id] = Math.max(s.collection[id] ?? 0, n); }
  s.activeDeck = Math.min(Math.max(0, s.activeDeck | 0), s.decks.length - 1);
  s.cosmetics.owned = [...new Set([...freeCosmetics(), ...(s.cosmetics.owned ?? [])])].filter((id) => META.cosmetics.some((c) => c.id === id));
  if (!s.cosmetics.owned.includes(s.cosmetics.logo)) s.cosmetics.logo = base.cosmetics.logo;
  if (!s.cosmetics.owned.includes(s.cosmetics.back)) s.cosmetics.back = base.cosmetics.back;
  return s;
}

// ───────── coleção e decks ─────────
export const owned = (s: Save, cardId: string): number => s.collection[cardId] ?? 0;
export const maxCopies = (): number => DECK_RULES.maxCopies;
/** Cópias além do limite de um deck: é o que dá para reciclar. */
export const extrasOf = (s: Save, cardId: string): number => Math.max(0, owned(s, cardId) - DECK_RULES.maxCopies);
export const totalExtras = (s: Save): number => CARDS.reduce((n, c) => n + extrasOf(s, c.id), 0);
export const distinctOwned = (s: Save): number => CARDS.filter((c) => owned(s, c.id) > 0).length;
export const priceOf = (cardId: string): number => META.singlePrice[rarityOf(cardId)];
export const recycleValue = (cardId: string): number => Math.round(priceOf(cardId) * META.recycleRate);

/** Erros de um deck, já em frases para mostrar ao jogador. Lista vazia = deck válido. */
export function deckErrors(s: Save, cards: string[]): string[] {
  const errors: string[] = [];
  if (cards.length !== DECK_RULES.size) errors.push(cards.length < DECK_RULES.size ? `Faltam ${DECK_RULES.size - cards.length} cartas para fechar ${DECK_RULES.size}.` : `Tem ${cards.length - DECK_RULES.size} cartas a mais (o deck é de ${DECK_RULES.size}).`);
  const counts = new Map<string, number>();
  for (const id of cards) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of counts) {
    const name = CARDS_BY_ID.get(id)?.name ?? id;
    if (!CARDS_BY_ID.has(id)) errors.push(`Carta desconhecida: ${id}.`);
    else if (n > DECK_RULES.maxCopies) errors.push(`${name}: ${n} cópias (o máximo é ${DECK_RULES.maxCopies}).`);
    else if (n > owned(s, id)) errors.push(`${name}: o deck usa ${n}, você só tem ${owned(s, id)}.`);
  }
  return errors;
}
export const activeDeck = (s: Save): Deck => s.decks[s.activeDeck] ?? s.decks[0];
export const activeDeckValid = (s: Save): boolean => deckErrors(s, activeDeck(s).cards).length === 0 && validateList(activeDeck(s).cards, DECK_RULES).length === 0;

export type Result<T = object> = ({ ok: true; save: Save; unlocked: AchievementDef[] } & T) | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
function done<T extends object>(s: Save, now: number, extra: T): Result<T> {
  const unlocked = grantAchievements(s, now);
  return { ok: true, save: s, unlocked, ...extra };
}

/** Salva (ou cria, com index = -1) um deck. Aceita deck incompleto: só o deck ativo precisa estar válido para duelar. */
export function saveDeck(save: Save, index: number, deck: Deck, now = 0): Result<{ index: number }> {
  const s = clone(save);
  const name = deck.name.replace(/\s+/g, ' ').trim().slice(0, 24) || 'Deck sem nome';
  const cards = deck.cards.filter((id) => CARDS_BY_ID.has(id));
  if (index < 0) { if (s.decks.length >= META.maxDecks) return fail(`Você já tem ${META.maxDecks} decks. Apague um para criar outro.`); s.decks.push({ name, cards }); index = s.decks.length - 1; }
  else if (!s.decks[index]) return fail('Deck não encontrado.');
  else s.decks[index] = { name, cards };
  if ([...cards].sort().join() !== expand(META.starterDeck.cards).sort().join()) (s as Save & { _built?: boolean })._built = true;
  return done(s, now, { index });
}
export function deleteDeck(save: Save, index: number): Result {
  if (save.decks.length <= 1) return fail('Você precisa ter pelo menos um deck.');
  const s = clone(save);
  s.decks.splice(index, 1);
  s.activeDeck = s.activeDeck === index ? 0 : s.activeDeck > index ? s.activeDeck - 1 : s.activeDeck;
  return { ok: true, save: s, unlocked: [] };
}
export function setActiveDeck(save: Save, index: number): Result {
  if (!save.decks[index]) return fail('Deck não encontrado.');
  return { ok: true, save: { ...clone(save), activeDeck: index }, unlocked: [] };
}
/** Copia um deck para uma gaveta nova, no fim da lista, com "(cópia)" no nome. */
export function duplicateDeck(save: Save, index: number, now = 0): Result<{ index: number }> {
  const d = save.decks[index];
  if (!d) return fail('Deck não encontrado.');
  if (save.decks.length >= META.maxDecks) return fail(`Você já tem ${META.maxDecks} decks. Apague um para copiar este.`);
  const tag = ' (cópia)';
  return saveDeck(save, -1, { name: d.name.slice(0, 24 - tag.length).trim() + tag, cards: [...d.cards] }, now);
}

/** Quanto cada tipo de carta pesa na montagem automática. */
const AUTO = { effectShare: 0.2, maxSacrifice: 6 };
const autoScore = (id: string): number => {
  const c = CARDS_BY_ID.get(id)!, r = rarityOf(id), bonus = r === 'legendary' ? 0.6 : r === 'rare' ? 0.3 : 0;
  if (c.kind === 'effect_instant' || c.kind === 'effect_trap') return 1 + bonus;
  return ((c.atk ?? 0) + (c.def ?? 0)) / 1000 + bonus - (c.cost ?? 0) * 0.9;
};
/**
 * Completa um deck até o tamanho oficial só com cartas da coleção, sem tirar nada do que já está nele.
 * Critério: as criaturas mais fortes (ATQ + DEF, raridade, menos sacrifício), cerca de 1 efeito a cada 5 cartas
 * e no máximo 6 cartas que pedem sacrifício. Se a coleção não fecha o deck, devolve o máximo possível.
 */
export function autoFill(s: Save, cards: string[] = []): string[] {
  const out = cards.filter((id) => CARDS_BY_ID.has(id)).slice(0, DECK_RULES.size);
  const inDeck = (id: string) => out.filter((x) => x === id).length;
  const free = (id: string) => Math.max(0, Math.min(owned(s, id), DECK_RULES.maxCopies) - inDeck(id));
  const isEffect = (id: string) => { const k = CARDS_BY_ID.get(id)!.kind; return k === 'effect_instant' || k === 'effect_trap'; };
  const needsSac = (id: string) => (CARDS_BY_ID.get(id)!.cost ?? 0) > 0;
  const ranked = CARDS.map((c) => c.id).filter((id) => free(id) > 0).sort((a, b) => autoScore(b) - autoScore(a) || a.localeCompare(b));
  const effectGoal = Math.round(DECK_RULES.size * AUTO.effectShare);
  const add = (pick: (id: string) => boolean) => {
    for (const id of ranked) {
      while (out.length < DECK_RULES.size && free(id) > 0 && pick(id)) out.push(id);
    }
  };
  // 1) efeitos até a cota, 2) criaturas, 3) o que sobrar (se faltar criatura ou efeito para fechar)
  add((id) => isEffect(id) && out.filter(isEffect).length < effectGoal);
  add((id) => !isEffect(id) && (!needsSac(id) || out.filter(needsSac).length < AUTO.maxSacrifice) && out.filter((x) => !isEffect(x)).length < DECK_RULES.size - effectGoal);
  add(() => true);
  return out.sort((a, b) => a.localeCompare(b));
}

// ───────── loja ─────────
export function buySingle(save: Save, cardId: string, now = 0): Result {
  if (!CARDS_BY_ID.has(cardId)) return fail('Carta desconhecida.');
  if (owned(save, cardId) >= DECK_RULES.maxCopies) return fail(`Você já tem as ${DECK_RULES.maxCopies} cópias que cabem num deck.`);
  const price = priceOf(cardId);
  if (save.patrimonio < price) return fail('PATRIMÔNIO insuficiente.');
  const s = clone(save);
  s.patrimonio -= price; s.collection[cardId] = owned(s, cardId) + 1;
  return done(s, now, {});
}

export interface PackCard { cardId: string; rarity: Rarity; isNew: boolean; extra: boolean }
/**
 * Abre um pacote. Cada carta sorteia a raridade pelas chances de data/meta.json e depois uma carta daquela raridade.
 * Proteção contra repetida: enquanto existir carta que você ainda não completou, o pacote não entrega cópia sobrando.
 */
export function buyBooster(save: Save, now = 0): Result<{ cards: PackCard[] }> {
  const { price, size, odds } = META.booster;
  if (save.patrimonio < price) return fail('PATRIMÔNIO insuficiente.');
  const s = clone(save);
  s.patrimonio -= price;
  const rng = { rng: s.rng };
  const cards: PackCard[] = [];
  const total = odds.common + odds.rare + odds.legendary;
  const open = (r?: Rarity) => CARDS.filter((c) => (!r || rarityOf(c.id) === r) && owned(s, c.id) < DECK_RULES.maxCopies);
  for (let i = 0; i < size; i++) {
    const roll = random(rng) * total;
    const rarity: Rarity = roll < odds.legendary ? 'legendary' : roll < odds.legendary + odds.rare ? 'rare' : 'common';
    let pool = open(rarity);
    if (!pool.length) pool = open();
    const extra = pool.length === 0;
    if (extra) pool = CARDS.filter((c) => rarityOf(c.id) === rarity);
    const card = pool[Math.floor(random(rng) * pool.length)];
    cards.push({ cardId: card.id, rarity: rarityOf(card.id), isNew: owned(s, card.id) === 0, extra });
    s.collection[card.id] = owned(s, card.id) + 1;
  }
  s.rng = rng.rng; s.stats.packs += 1;
  return done(s, now, { cards });
}

/** Cartas de um deck pronto que ainda faltam na coleção. */
export function readyDeckMissing(s: Save, deckId: string): Record<string, number> {
  const d = META.readyDecks.find((x) => x.id === deckId);
  const out: Record<string, number> = {};
  if (d) for (const [id, n] of Object.entries(d.cards)) if (n > owned(s, id)) out[id] = n - owned(s, id);
  return out;
}
/** Compra um deck pronto: entrega as cartas que faltam e guarda a lista como um deck seu (já escolhido para duelar). */
export function buyReadyDeck(save: Save, deckId: string, now = 0): Result<{ gained: Record<string, number>; index: number }> {
  const d = META.readyDecks.find((x) => x.id === deckId);
  if (!d) return fail('Deck não encontrado.');
  if (save.patrimonio < d.price) return fail('PATRIMÔNIO insuficiente.');
  if (save.decks.length >= META.maxDecks && !save.decks.some((x) => x.name === d.name)) return fail(`Você já tem ${META.maxDecks} decks. Apague um para abrir espaço.`);
  const s = clone(save);
  const gained = readyDeckMissing(s, deckId);
  s.patrimonio -= d.price;
  for (const [id, n] of Object.entries(gained)) s.collection[id] = owned(s, id) + n;
  let index = s.decks.findIndex((x) => x.name === d.name);
  if (index < 0) { s.decks.push({ name: d.name, cards: expand(d.cards) }); index = s.decks.length - 1; } else s.decks[index].cards = expand(d.cards);
  s.activeDeck = index;
  return done(s, now, { gained, index });
}

export function buyCosmetic(save: Save, id: string, now = 0): Result {
  const c = META.cosmetics.find((x) => x.id === id);
  if (!c) return fail('Item não encontrado.');
  if (save.cosmetics.owned.includes(id)) return fail('Você já tem este item.');
  if (save.patrimonio < c.price) return fail('PATRIMÔNIO insuficiente.');
  const s = clone(save);
  s.patrimonio -= c.price; s.cosmetics.owned.push(id);
  return done(s, now, {});
}
export function equipCosmetic(save: Save, id: string, now = 0): Result {
  const c = META.cosmetics.find((x) => x.id === id);
  if (!c || !save.cosmetics.owned.includes(id)) return fail('Você ainda não tem este item.');
  const s = clone(save) as Save & { _styled?: Record<string, boolean> };
  s.cosmetics[c.kind] = id;
  s._styled = { ...(s._styled ?? {}), [c.kind]: true };
  return done(s, now, {});
}

// ───────── reciclagem ─────────
/** Recicla cópias que passam do limite de um deck. Sem cardId, recicla todas as sobras de uma vez. */
export function recycle(save: Save, cardId: string | null, now = 0): Result<{ gained: number; count: number }> {
  const s = clone(save);
  const ids = cardId ? [cardId] : CARDS.map((c) => c.id);
  let gained = 0, count = 0;
  for (const id of ids) {
    const n = extrasOf(s, id);
    if (!n) continue;
    s.collection[id] = owned(s, id) - n; gained += recycleValue(id) * n; count += n;
  }
  if (!count) return fail('Não há cópias sobrando para reciclar.');
  s.patrimonio += gained; s.stats.recycled += count; s.stats.earned += gained;
  return done(s, now, { gained, count });
}

// ───────── metas do dia ─────────
export const missionDef = (id: string): MissionDef | undefined => META.missions.find((m) => m.id === id);
/** Garante as metas do dia: troca a lista quando o dia muda (as mesmas para o mesmo dia). */
export function rollMissions(save: Save, day: string): Save {
  if (save.missions.day === day && save.missions.list.length) return save;
  const s = clone(save);
  let h = 2166136261;
  for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rng = { rng: h | 0 };
  const pool = [...META.missions];
  const list: MissionState[] = [];
  while (list.length < META.missionsPerDay && pool.length) list.push({ id: pool.splice(Math.floor(random(rng) * pool.length), 1)[0].id, progress: 0, claimed: false });
  s.missions = { day, list };
  return s;
}
export function claimMission(save: Save, index: number, now = 0): Result<{ reward: number }> {
  const m = save.missions.list[index], def = m && missionDef(m.id);
  if (!m || !def) return fail('Meta não encontrada.');
  if (m.claimed) return fail('Esta meta já foi resgatada.');
  if (m.progress < def.goal) return fail('Esta meta ainda não foi cumprida.');
  const s = clone(save);
  s.missions.list[index].claimed = true; s.patrimonio += def.reward; s.stats.earned += def.reward;
  return done(s, now, { reward: def.reward });
}
export const claimableMissions = (s: Save): number => s.missions.list.filter((m) => !m.claimed && m.progress >= (missionDef(m.id)?.goal ?? Infinity)).length;

// ───────── acompanhamento da partida ─────────
export interface Counters {
  summon: number; destroy: number; damage: number; biggestHit: number; effect: number; trap: number; sacrifice: number; direct: number;
  redirects: number; louro: boolean; plays: Record<string, number>;
}
export interface Tracker { me: PlayerId; owner: Record<string, PlayerId>; c: Counters }
export function newTracker(state: GameState, me: PlayerId): Tracker {
  const owner: Record<string, PlayerId> = {};
  for (const p of state.players) for (const c of [...p.deck, ...p.hand, ...p.dead]) owner[c.uid] = c.owner;
  return { me, owner, c: { summon: 0, destroy: 0, damage: 0, biggestHit: 0, effect: 0, trap: 0, sacrifice: 0, direct: 0, redirects: 0, louro: false, plays: {} } };
}
/** Conta, a partir dos eventos do motor, o que o jogador fez na partida (para metas, conquistas e estatísticas). */
export function track(t: Tracker, events: GameEvent[], state: GameState): void {
  const { me, c } = t, mine = (uid: string) => t.owner[uid] === me;
  const play = (id: string) => { c.plays[id] = (c.plays[id] ?? 0) + 1; };
  for (const e of events) {
    switch (e.type) {
      case 'summon': if (e.player === me) { c.summon++; play(e.cardId); } break;
      case 'effectPlayed': if (e.player === me) { c.effect++; play(e.cardId); } break;
      case 'trapSet': if (e.player === me) c.trap++; break;
      case 'sacrifice': if (e.player === me) c.sacrifice++; break;
      case 'destroy': { const k = CARDS_BY_ID.get(e.cardId)?.kind; if (!mine(e.uid) && (k === 'creature' || k === 'entity')) c.destroy++; break; }
      case 'damage': if (e.player !== me) { c.damage += e.amount; c.biggestHit = Math.max(c.biggestHit, e.amount); } break;
      case 'attack': if (e.target === null && mine(e.attacker)) c.direct++; break;
      case 'attackRedirected': if (mine(e.by)) c.redirects++; break;
      default: break;
    }
  }
  const ids = state.players[me].creatures.filter(Boolean).map((x) => x!.cardId);
  if (ids.includes('BCB-004') && ids.includes('BCB-019')) c.louro = true;
}

export interface MatchResult {
  rival: string; result: 'win' | 'loss' | 'draw'; turns: number; caixa: [number, number]; counters: Counters; training?: boolean; startingCaixa?: number;
  /** batalha da campanha jogada (1 a 30) e multiplicador da recompensa da faixa */
  campaignStage?: number; rewardMul?: number;
}
export interface MatchOutcome { save: Save; reward: number; unlocked: AchievementDef[]; missionsDone: MissionDef[]; advanced?: boolean; finished?: boolean }
/**
 * Fecha uma partida: paga a recompensa (o CAIXA que sobrou, só na vitória), grava histórico e estatísticas,
 * avança as metas do dia e confere as conquistas. Treino não paga, não grava e não conta para nada.
 */
export function applyMatch(save: Save, m: MatchResult, now: number, day: string, allRivals: string[] = []): MatchOutcome {
  if (m.training) return { save, reward: 0, unlocked: [], missionsDone: [], advanced: false, finished: false };
  const s = clone(rollMissions(save, day)) as Save & { _last?: MatchResult };
  const win = m.result === 'win';
  const reward = win ? Math.round(Math.max(0, m.caixa[0]) * (m.rewardMul ?? 1)) : META.lossReward;
  s.patrimonio += reward;
  s.history.unshift({ at: now, rival: m.rival, result: m.result, turns: m.turns, caixa: m.caixa, reward });
  s.history.length = Math.min(s.history.length, META.historyLimit);
  const st = s.stats;
  st.games++; st.earned += reward;
  if (win) { st.wins++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); } else { if (m.result === 'loss') st.losses++; else st.draws++; st.streak = 0; }
  st.biggestHit = Math.max(st.biggestHit, m.counters.biggestHit); st.totalDamage += m.counters.damage;
  for (const [id, n] of Object.entries(m.counters.plays)) st.plays[id] = (st.plays[id] ?? 0) + n;
  const rv = (st.rivals[m.rival] ??= { w: 0, l: 0 });
  if (win) rv.w++; else if (m.result === 'loss') rv.l++;
  // metas do dia
  const add: Record<MissionKind, number> = { play: 1, win: win ? 1 : 0, summon: m.counters.summon, destroy: m.counters.destroy, damage: m.counters.damage, effect: m.counters.effect, trap: m.counters.trap, sacrifice: m.counters.sacrifice, direct: m.counters.direct };
  const missionsDone: MissionDef[] = [];
  for (const ms of s.missions.list) {
    const def = missionDef(ms.id);
    if (!def || ms.claimed) continue;
    const before = ms.progress;
    ms.progress = Math.min(def.goal, ms.progress + add[def.kind]);
    if (before < def.goal && ms.progress >= def.goal) missionsDone.push(def);
  }
  s._last = { ...m, startingCaixa: m.startingCaixa ?? 8000 };
  (s as Save & { _rivals?: string[] })._rivals = allRivals;
  // campanha: vencer a batalha da vez avança uma casa
  let advanced = false, finished = false;
  if (m.campaignStage) { const r = advanceCampaign(s.campaign, m.campaignStage, m.result); s.campaign = r.campaign; advanced = r.advanced; finished = r.finished; }
  const unlocked = grantAchievements(s, now);
  return { save: s, reward, unlocked, missionsDone, advanced, finished };
}

// ───────── conquistas ─────────
type Scratch = Save & { _last?: MatchResult; _rivals?: string[]; _built?: boolean; _styled?: Record<string, boolean> };
const CHECKS: Record<string, (s: Scratch) => boolean> = {
  first_win: (s) => s.stats.wins >= 1,
  wins_5: (s) => s.stats.wins >= 5,
  wins_10: (s) => s.stats.wins >= 10,
  wins_25: (s) => s.stats.wins >= 25,
  streak_3: (s) => s.stats.bestStreak >= 3,
  flawless: (s) => !!s._last && s._last.result === 'win' && s._last.caixa[0] >= (s._last.startingCaixa ?? 8000),
  clutch: (s) => !!s._last && s._last.result === 'win' && s._last.caixa[0] <= 500,
  fast: (s) => !!s._last && s._last.result === 'win' && s._last.turns <= 10,
  big_hit: (s) => s.stats.biggestHit >= 2500,
  fake_news: (s) => (s._last?.counters.redirects ?? 0) > 0,
  louro: (s) => !!s._last?.counters.louro,
  collector: (s) => distinctOwned(s) >= CARDS.length,
  packs_10: (s) => s.stats.packs >= 10,
  recycler: (s) => s.stats.recycled >= 10,
  rivals_all: (s) => (s._rivals?.length ?? 0) > 0 && s._rivals!.every((r) => (s.stats.rivals[r]?.w ?? 0) > 0),
  deck_builder: (s) => !!s._built,
  stylist: (s) => !!s._styled?.logo && !!s._styled?.back,
};
/** Confere as conquistas, paga os bônus das novas e limpa as anotações temporárias. Altera o save recebido (já é uma cópia). */
function grantAchievements(s: Scratch, now: number): AchievementDef[] {
  const out: AchievementDef[] = [];
  for (const a of META.achievements) {
    if (s.achievements[a.id] !== undefined || !CHECKS[a.id]?.(s)) continue;
    s.achievements[a.id] = now; s.patrimonio += a.reward; s.stats.earned += a.reward; out.push(a);
  }
  delete s._last; delete s._rivals; delete s._built;
  // "_styled" precisa sobreviver entre duas trocas (logo e verso); some quando a conquista sai
  if (s.achievements.stylist !== undefined) delete s._styled;
  return out;
}

// ───────── leitura para as telas ─────────
export function favoriteCard(s: Save): string | null {
  const top = Object.entries(s.stats.plays).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}
export const winRate = (s: Save): number => (s.stats.games ? Math.round((s.stats.wins / s.stats.games) * 100) : 0);
