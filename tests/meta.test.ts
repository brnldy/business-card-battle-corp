// Testes do meta-jogo (lobby): coleção, decks, loja, pacotes, reciclagem, metas, conquistas e fechamento de partida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS } from '../src/engine/cards.ts';
import { createGame } from '../src/engine/setup.ts';
import {
  META, DECK_RULES, newSave, migrate, owned, deckErrors, activeDeckValid, saveDeck, deleteDeck, buySingle, buyBooster, buyReadyDeck,
  readyDeckMissing, buyCosmetic, equipCosmetic, recycle, extrasOf, rollMissions, claimMission, missionDef, applyMatch, newTracker, track,
  priceOf, recycleValue, rarityOf, distinctOwned, duplicateDeck, autoFill,
} from '../src/meta/meta.ts';
import type { Counters, Save } from '../src/meta/meta.ts';

const counters = (o: Partial<Counters> = {}): Counters => ({ summon: 0, destroy: 0, damage: 0, biggestHit: 0, effect: 0, trap: 0, sacrifice: 0, direct: 0, redirects: 0, louro: false, plays: {}, ...o });
const rich = (s: Save, n = 1_000_000): Save => ({ ...s, patrimonio: n });
const ok = <T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> => { assert.equal(r.ok, true, JSON.stringify(r)); return r as Extract<T, { ok: true }>; };

test('dados: toda carta citada em data/meta.json existe e os decks prontos são válidos', () => {
  const ids = new Set(CARDS.map((c) => c.id));
  for (const d of [META.starterDeck, ...META.readyDecks]) {
    let total = 0;
    for (const [id, n] of Object.entries(d.cards)) { assert.ok(ids.has(id), `${d.name}: ${id}`); assert.ok(n <= DECK_RULES.maxCopies, `${d.name}: ${id} x${n}`); total += n; }
    assert.equal(total, DECK_RULES.size, d.name);
  }
  for (const c of CARDS) assert.ok(['common', 'rare', 'legendary'].includes(rarityOf(c.id)), c.id);
  assert.ok(META.cosmetics.filter((c) => c.kind === 'logo').length >= 5);
  assert.ok(META.cosmetics.filter((c) => c.kind === 'back').length >= 5);
});

test('save novo: kit do novato pronto para duelar', () => {
  const s = newSave(7);
  assert.equal(s.patrimonio, META.startingPatrimonio);
  assert.equal(s.decks[0].cards.length, 40);
  assert.equal(activeDeckValid(s), true);
  assert.ok(s.cosmetics.owned.includes(s.cosmetics.logo) && s.cosmetics.owned.includes(s.cosmetics.back));
});

test('migrate: save vazio ou quebrado vira save novo; save antigo mantém o progresso', () => {
  assert.equal(migrate(null).decks.length, 1);
  const old = { patrimonio: 1234, collection: { 'BCB-001': 2, 'XXX-999': 5 }, decks: [], stats: { wins: 4 } };
  const s = migrate(old);
  assert.equal(s.patrimonio, 1234);
  assert.equal(s.stats.wins, 4);
  assert.equal(s.collection['XXX-999'], undefined);
  assert.equal(activeDeckValid(s), true, 'sem deck, recebe o kit do novato de volta');
});

test('deck: aponta carta faltando, cópia demais e carta que o jogador não tem', () => {
  const s = newSave();
  const deck = [...s.decks[0].cards];
  assert.deepEqual(deckErrors(s, deck), []);
  assert.match(deckErrors(s, deck.slice(1))[0], /Faltam 1/);
  const semTer = [...deck.slice(1), 'BCB-005'];
  assert.match(deckErrors(s, semTer).join(' '), /CHAT GPT.*só tem 0/);
  const demais = [...deck.filter((id) => id !== 'BCB-014'), 'BCB-001', 'BCB-001'];
  assert.match(deckErrors(s, demais).join(' '), /máximo é 3/);
});

test('deck: salvar, criar, apagar e a conquista de montar o próprio deck', () => {
  let s = newSave();
  const same = ok(saveDeck(s, 0, s.decks[0]));
  assert.equal(same.unlocked.length, 0, 'salvar o kit sem mexer não é "montar um deck"');
  s = ok(buySingle(rich(s), 'BCB-005')).save;
  const cards = [...s.decks[0].cards.slice(1), 'BCB-005'];
  const r = ok(saveDeck(s, -1, { name: '  Meu   deck  ', cards }));
  assert.equal(r.save.decks[r.index].name, 'Meu deck');
  assert.ok(r.unlocked.some((a) => a.id === 'deck_builder'));
  assert.equal(ok(deleteDeck(r.save, 0)).save.decks.length, 1);
  assert.equal(deleteDeck(ok(deleteDeck(r.save, 0)).save, 0).ok, false);
});

test('deck: duplicar copia as cartas, marca o nome e respeita o limite de decks', () => {
  let s = newSave();
  s = ok(saveDeck(s, 0, { name: 'Um nome comprido demais aa', cards: s.decks[0].cards })).save;
  const r = ok(duplicateDeck(s, 0));
  assert.equal(r.index, 1);
  assert.deepEqual(r.save.decks[1].cards, s.decks[0].cards);
  assert.ok(r.save.decks[1].name.endsWith('(cópia)') && r.save.decks[1].name.length <= 24, r.save.decks[1].name);
  assert.equal(r.save.activeDeck, 0, 'a cópia não vira o deck do duelo');
  let t = r.save;
  while (t.decks.length < META.maxDecks) t = ok(saveDeck(t, -1, { name: 'x', cards: [] })).save;
  assert.equal(duplicateDeck(t, 0).ok, false);
  assert.equal(duplicateDeck(newSave(), 5).ok, false);
});

test('deck: completar automático fecha um deck válido só com cartas da coleção', () => {
  const s = newSave();
  const full = autoFill(s);
  assert.equal(full.length, DECK_RULES.size);
  assert.deepEqual(deckErrors(s, full), [], 'com o kit do novato, o automático monta um deck válido');
  // mantém o que já estava no deck
  const start = ['BCB-013', 'BCB-013', 'BCB-012'];
  const kept = autoFill(s, start);
  assert.equal(kept.filter((id) => id === 'BCB-013').length, 2 + Math.min(1, owned(s, 'BCB-013') - 2));
  assert.ok(kept.includes('BCB-012'));
  assert.deepEqual(deckErrors(s, kept), []);
  // coleção maior: escolhe, não despeja tudo; respeita cópias, cota de efeitos e de sacrifício
  const big = { ...s, collection: Object.fromEntries(CARDS.map((c) => [c.id, 3])) };
  const best = autoFill(big);
  assert.deepEqual(deckErrors(big, best), []);
  const kind = (id: string) => CARDS.find((c) => c.id === id)!;
  const fx = best.filter((id) => kind(id).kind.startsWith('effect')).length;
  assert.equal(fx, Math.round(DECK_RULES.size * 0.2));
  assert.ok(best.filter((id) => (kind(id).cost ?? 0) > 0).length <= 6);
  // coleção pequena: devolve o máximo possível, sem inventar carta
  const poor = { ...s, collection: { 'BCB-001': 3, 'BCB-003': 1 } };
  assert.deepEqual(autoFill(poor), ['BCB-001', 'BCB-001', 'BCB-001', 'BCB-003']);
  // deck cheio não muda
  assert.deepEqual(autoFill(s, full), full);
});

test('loja: carta avulsa cobra pela raridade e respeita o limite de cópias', () => {
  const s = newSave();
  assert.equal(buySingle(s, 'BCB-005').ok, false, 'sem dinheiro para lendária');
  let r = rich(s, 20_000);
  for (let i = 0; i < 3; i++) r = ok(buySingle(r, 'BCB-005')).save;
  assert.equal(owned(r, 'BCB-005'), 3);
  assert.equal(r.patrimonio, 20_000 - 3 * priceOf('BCB-005'));
  assert.equal(buySingle(r, 'BCB-005').ok, false);
});

test('pacote: entrega o tamanho certo, cobra o preço e não repete carta completa enquanto falta alguma', () => {
  let s = rich(newSave(42));
  const missing = () => CARDS.reduce((n, c) => n + Math.max(0, DECK_RULES.maxCopies - owned(s, c.id)), 0);
  let packs = 0;
  while (missing() > 0) {
    const before = missing();
    const r = ok(buyBooster(s));
    assert.equal(r.cards.length, META.booster.size);
    assert.equal(r.save.patrimonio, s.patrimonio - META.booster.price + r.unlocked.reduce((n, a) => n + a.reward, 0));
    s = r.save; packs++;
    assert.equal(missing(), Math.max(0, before - META.booster.size), 'cada carta do pacote preenche uma vaga');
    assert.ok(packs < 20);
  }
  assert.equal(distinctOwned(s), CARDS.length);
  const extra = ok(buyBooster(s));
  assert.ok(extra.cards.every((c) => c.extra), 'coleção completa: o pacote vira sobra para reciclar');
  assert.equal(extra.save.stats.packs, packs + 1);
});

test('pacote: mesma semente, mesmas cartas', () => {
  const a = ok(buyBooster(rich(newSave(5)))), b = ok(buyBooster(rich(newSave(5))));
  assert.deepEqual(a.cards, b.cards);
});

test('reciclar: só as cópias além do limite viram PATRIMÔNIO', () => {
  let s = newSave();
  assert.equal(recycle(s, null).ok, false);
  s = { ...s, collection: { ...s.collection, 'BCB-001': 5, 'BCB-005': 4 } };
  assert.equal(extrasOf(s, 'BCB-001'), 2);
  const r = ok(recycle(s, null));
  assert.equal(r.count, 3);
  assert.equal(r.gained, 2 * recycleValue('BCB-001') + recycleValue('BCB-005'));
  assert.equal(owned(r.save, 'BCB-001'), 3);
  assert.equal(r.save.patrimonio, s.patrimonio + r.gained);
  assert.ok(recycleValue('BCB-005') * 4 < priceOf('BCB-005') * 2, 'reciclar nunca dá lucro sobre comprar');
});

test('deck pronto: entrega só o que falta, vira o deck ativo e fica válido', () => {
  const s = rich(newSave());
  const d = META.readyDecks[0], miss = readyDeckMissing(s, d.id);
  assert.ok(Object.keys(miss).length > 0);
  const r = ok(buyReadyDeck(s, d.id));
  assert.deepEqual(r.gained, miss);
  assert.equal(r.save.decks[r.save.activeDeck].name, d.name);
  assert.equal(activeDeckValid(r.save), true);
  assert.deepEqual(readyDeckMissing(r.save, d.id), {});
});

test('visual: comprar, equipar e a conquista de trocar logo e verso', () => {
  let s = rich(newSave());
  assert.equal(equipCosmetic(s, 'logo-olho').ok, false, 'não equipa o que não tem');
  s = ok(buyCosmetic(s, 'logo-olho')).save;
  assert.equal(buyCosmetic(s, 'logo-olho').ok, false);
  const a = ok(equipCosmetic(s, 'logo-olho'));
  assert.equal(a.save.cosmetics.logo, 'logo-olho'); assert.equal(a.unlocked.length, 0);
  const b = ok(equipCosmetic(a.save, 'back-carbono'));
  assert.ok(b.unlocked.some((x) => x.id === 'stylist'));
});

test('metas do dia: mesmas metas no mesmo dia, novas no dia seguinte', () => {
  const a = rollMissions(newSave(1), '2026-11-23'), b = rollMissions(newSave(99), '2026-11-23');
  assert.equal(a.missions.list.length, META.missionsPerDay);
  assert.deepEqual(a.missions.list.map((m) => m.id), b.missions.list.map((m) => m.id));
  assert.equal(rollMissions(a, '2026-11-23'), a, 'no mesmo dia não troca nem zera o progresso');
  assert.equal(rollMissions(a, '2026-11-24').missions.day, '2026-11-24');
});

test('partida: vitória paga o CAIXA que sobrou, derrota não paga, treino não conta', () => {
  const s = newSave();
  const win = applyMatch(s, { rival: 'BORD', result: 'win', turns: 14, caixa: [4200, 0], counters: counters({ summon: 6, damage: 8000, biggestHit: 1900, plays: { 'BCB-001': 3 } }) }, 1000, '2026-11-23');
  assert.equal(win.reward, 4200);
  assert.ok(win.unlocked.some((a) => a.id === 'first_win'));
  assert.equal(win.save.patrimonio, s.patrimonio + 4200 + win.unlocked.reduce((n, a) => n + a.reward, 0));
  assert.deepEqual(win.save.history[0], { at: 1000, rival: 'BORD', result: 'win', turns: 14, caixa: [4200, 0], reward: 4200 });
  assert.equal(win.save.stats.plays['BCB-001'], 3);
  const loss = applyMatch(win.save, { rival: 'MIKE', result: 'loss', turns: 9, caixa: [0, 3000], counters: counters() }, 2000, '2026-11-23');
  assert.equal(loss.reward, 0);
  assert.equal(loss.save.stats.streak, 0);
  assert.equal(loss.save.history.length, 2);
  const treino = applyMatch(s, { rival: 'ESTAGIÁRIO', result: 'win', turns: 5, caixa: [8000, 0], counters: counters(), training: true }, 3000, '2026-11-23');
  assert.equal(treino.save, s);
});

test('partida: avança as metas do dia e deixa resgatar uma vez só', () => {
  const s0 = rollMissions(newSave(), '2026-11-23');
  const id = s0.missions.list[0].id, def = missionDef(id)!;
  const big = counters({ summon: 99, destroy: 99, damage: 99_999, effect: 99, trap: 99, sacrifice: 99, direct: 99 });
  let s = s0, done: string[] = [];
  for (let i = 0; i < 2; i++) { const r = applyMatch(s, { rival: 'BORD', result: 'win', turns: 20, caixa: [100, 0], counters: big }, i, '2026-11-23'); s = r.save; done.push(...r.missionsDone.map((m) => m.id)); }
  assert.ok(done.includes(id));
  assert.equal(s.missions.list[0].progress, def.goal, 'o progresso para na meta');
  const before = s.patrimonio;
  const c = ok(claimMission(s, 0));
  assert.equal(c.save.patrimonio, before + def.reward);
  assert.equal(claimMission(c.save, 0).ok, false);
});

test('conquistas de partida: balanço perfeito, cheque especial, reunião rápida, sequência e monopólio', () => {
  const play = (s: Save, m: Partial<Parameters<typeof applyMatch>[1]>, rivals: string[] = []) => applyMatch(s, { rival: 'BORD', result: 'win', turns: 30, caixa: [3000, 0], counters: counters(), ...m }, 1, '2026-11-23', rivals);
  const got = (r: ReturnType<typeof play>) => r.unlocked.map((a) => a.id);
  assert.ok(got(play(newSave(), { caixa: [8000, 0] })).includes('flawless'));
  assert.ok(got(play(newSave(), { caixa: [300, 0] })).includes('clutch'));
  assert.ok(got(play(newSave(), { turns: 8 })).includes('fast'));
  assert.ok(got(play(newSave(), { counters: counters({ redirects: 1, louro: true, biggestHit: 2600 }) })).includes('fake_news'));
  let r = play(newSave(), {}); r = play(r.save, {}); const third = play(r.save, {});
  assert.ok(got(third).includes('streak_3'));
  assert.ok(!got(play(third.save, { caixa: [8000, 0] })).includes('first_win'), 'conquista não paga duas vezes');
  const rivals = ['BORD', 'MIKE'];
  const one = play(newSave(), { rival: 'BORD' }, rivals);
  assert.ok(!got(one).includes('rivals_all'));
  assert.ok(got(play(one.save, { rival: 'MIKE' }, rivals)).includes('rivals_all'));
});

test('tracker: conta invocações, dano, ataque direto e destruições só do lado do jogador', () => {
  const deck = Array(40).fill('BCB-012');
  const { state } = createGame({ seed: 3, decks: [deck, deck], firstPlayer: 0, deckRules: null });
  const t = newTracker(state, 0);
  const mine = state.players[0].hand[0].uid, theirs = state.players[1].hand[0].uid;
  track(t, [
    { type: 'summon', player: 0, uid: mine, cardId: 'BCB-012', mode: 'ATK', zone: 0 },
    { type: 'summon', player: 1, uid: theirs, cardId: 'BCB-012', mode: 'ATK', zone: 0 },
    { type: 'attack', attacker: mine, target: null, second: false },
    { type: 'attack', attacker: theirs, target: null, second: false },
    { type: 'damage', player: 1, amount: 1000, source: mine, caixa: 7000 },
    { type: 'damage', player: 0, amount: 400, source: theirs, caixa: 7600 },
    { type: 'destroy', uid: theirs, cardId: 'BCB-012' },
    { type: 'destroy', uid: mine, cardId: 'BCB-012' },
  ], state);
  assert.deepEqual({ ...t.c, plays: undefined }, { ...counters({ summon: 1, direct: 1, damage: 1000, biggestHit: 1000, destroy: 1 }), plays: undefined });
  assert.deepEqual(t.c.plays, { 'BCB-012': 1 });
});
