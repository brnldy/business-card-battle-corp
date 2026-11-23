// Regras gerais do GDD v0.2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction, handLimitStatus, IllegalActionError, legalActions } from '../src/engine/engine.ts';
import { createGame, OFFICIAL_DECK_RULES, validateDeck } from '../src/engine/setup.ts';
import { act, ATK, attack, FILLER, hand, inDead, newGame, onField, put } from './helpers.ts';

const filler40 = Array(40).fill(FILLER);

test('preparação: CAIXA $8.000, mão de 5, quem começa já compra no turno 1', () => {
  const { state } = createGame({ seed: 7, decks: [filler40, filler40], firstPlayer: 1, deckRules: null });
  assert.equal(state.players[0].caixa, 8000);
  assert.equal(state.players[1].caixa, 8000);
  assert.equal(state.active, 1);
  assert.equal(state.players[1].hand.length, 6, 'primeiro jogador compra no turno 1');
  assert.equal(state.players[0].hand.length, 5);
  const next = act(state, { type: 'endTurn' });
  assert.equal(next.players[0].hand.length, 6, 'segundo jogador compra');
});

test('quem começa não ataca no primeiro turno', () => {
  const { state } = createGame({ seed: 7, decks: [filler40, filler40], firstPlayer: 0, deckRules: null });
  assert.ok(!legalActions(state).some((a) => a.type === 'enterBattle'));
  const t2 = act(state, { type: 'endTurn' });
  assert.ok(legalActions(t2).some((a) => a.type === 'enterBattle'));
});

test('deck oficial: 40 cartas e no máximo 2 cópias', () => {
  assert.deepEqual(validateDeck([...Array(20).fill('BCB-001'), ...Array(20).fill('BCB-002')], OFFICIAL_DECK_RULES).length, 2);
  assert.ok(validateDeck(['BCB-001'], OFFICIAL_DECK_RULES).length > 0);
});

test('invocação de custo 0 e limite de 1 por turno', () => {
  let s = newGame();
  const a = hand(s, 0, 'BCB-001');
  const b = hand(s, 0, 'BCB-009');
  s = act(s, { type: 'summon', uid: a, mode: 'ATK', sacrifices: [] });
  assert.ok(onField(s, a));
  assert.throws(() => applyAction(s, { type: 'summon', uid: b, mode: 'ATK', sacrifices: [] }), IllegalActionError);
});

test('custo pago com sacrifício: custo 1 exige 1 criatura sua na mesa', () => {
  let s = newGame();
  const sia = hand(s, 0, 'BCB-011'); // Siamesas: custo 1
  assert.throws(() => applyAction(s, { type: 'summon', uid: sia, mode: 'ATK', sacrifices: [] }), IllegalActionError);
  const roger = put(s, 0, 'BCB-009');
  s = act(s, { type: 'summon', uid: sia, mode: 'ATK', sacrifices: [roger] });
  assert.ok(onField(s, sia));
  assert.ok(inDead(s, 0, roger));
});

test('combate ATQ × ATQ: o menor morre e o dono perde a diferença', () => {
  const s = newGame();
  const caio = put(s, 0, 'BCB-002');
  const cesar = put(s, 1, FILLER);
  const r = attack(s, caio, cesar).state;
  assert.ok(!onField(r, cesar));
  assert.equal(r.players[1].caixa, 8000 - (ATK('BCB-002') - ATK(FILLER)));
  assert.equal(r.players[0].caixa, 8000);
});

test('combate ATQ × ATQ: atacante mais fraco morre e o dono dele perde', () => {
  const s = newGame();
  const cesar = put(s, 0, FILLER);
  const caio = put(s, 1, 'BCB-002');
  const r = attack(s, cesar, caio).state;
  assert.ok(!onField(r, cesar));
  assert.ok(onField(r, caio));
  assert.equal(r.players[0].caixa, 8000 - (ATK('BCB-002') - ATK(FILLER)));
});

test('combate ATQ × ATQ: empate destrói as duas, sem dano', () => {
  const s = newGame();
  const a = put(s, 0, FILLER);
  const b = put(s, 1, FILLER);
  const r = attack(s, a, b).state;
  assert.ok(!onField(r, a) && !onField(r, b));
  assert.equal(r.players[0].caixa + r.players[1].caixa, 16000);
});

test('combate ATQ × DEF: defensor mais fraco morre, ninguém perde CAIXA', () => {
  const s = newGame();
  const caio = put(s, 0, 'BCB-002'); // 2.000
  const bruno = put(s, 1, 'BCB-001', 'DEF'); // DEF 900
  const r = attack(s, caio, bruno).state;
  assert.ok(!onField(r, bruno));
  assert.equal(r.players[1].caixa, 8000);
});

test('combate ATQ × DEF: defesa maior, atacante perde a diferença e ninguém morre', () => {
  const s = newGame();
  const cesar = put(s, 0, FILLER); // 1.000
  const siamesas = put(s, 1, 'BCB-011', 'DEF'); // DEF 2.500
  const r = attack(s, cesar, siamesas).state;
  assert.ok(onField(r, cesar) && onField(r, siamesas));
  assert.equal(r.players[0].caixa, 6500);
});

test('ataque direto só sem criaturas inimigas, e tira o ATQ inteiro', () => {
  let s = newGame();
  const caio = put(s, 0, 'BCB-002');
  const blocker = put(s, 1, FILLER, 'DEF');
  s = act(s, { type: 'enterBattle' });
  assert.ok(!legalActions(s).some((a) => a.type === 'attack' && a.target === null));
  s.players[1].creatures = s.players[1].creatures.map((c) => (c?.uid === blocker ? null : c));
  const r = act(s, { type: 'attack', uid: caio, target: null });
  assert.equal(r.players[1].caixa, 8000 - ATK('BCB-002'));
});

test('criatura em DEF não ataca; cada criatura ataca 1 vez', () => {
  let s = newGame();
  const def = put(s, 0, FILLER, 'DEF');
  const atk = put(s, 0, FILLER, 'ATK');
  s = act(s, { type: 'enterBattle' });
  const attacks = legalActions(s).filter((a) => a.type === 'attack');
  assert.ok(attacks.every((a) => a.type === 'attack' && a.uid === atk));
  s = act(s, { type: 'attack', uid: atk, target: null });
  assert.ok(!legalActions(s).some((a) => a.type === 'attack'));
  void def;
});

test('troca de modo: 1 vez por turno e não no turno em que entrou', () => {
  let s = newGame();
  const old = put(s, 0, FILLER);
  const fresh = hand(s, 0, 'BCB-009');
  s = act(s, { type: 'summon', uid: fresh, mode: 'ATK', sacrifices: [] });
  const modes = legalActions(s).filter((a) => a.type === 'changeMode');
  assert.deepEqual(modes.map((a) => a.type === 'changeMode' && a.uid), [old]);
  s = act(s, { type: 'changeMode', uid: old });
  assert.ok(!legalActions(s).some((a) => a.type === 'changeMode'));
});

test('CAIXA zerado encerra a partida', () => {
  const s = newGame();
  s.players[1].caixa = 500;
  const caio = put(s, 0, 'BCB-002');
  const r = attack(s, caio, null).state;
  assert.equal(r.winner, 0);
  assert.equal(r.endReason, 'caixa');
  assert.equal(r.phase, 'over');
  assert.deepEqual(legalActions(r), []);
});

test('limite de mão (10): compra espera, não pode passar o turno, descartar libera a compra', () => {
  let s = newGame();
  for (let i = 0; i < 10; i++) hand(s, 1, FILLER);
  s = act(s, { type: 'endTurn' }); // turno do jogador 1, com 10 na mão
  assert.equal(s.players[1].hand.length, 10);
  assert.equal(s.players[1].pendingDraw, true);
  assert.equal(handLimitStatus(s), 'play_cards');
  assert.ok(!legalActions(s).some((a) => a.type === 'endTurn' || a.type === 'enterBattle'));
  const card = s.players[1].hand[0].uid;
  s = act(s, { type: 'discard', uid: card });
  assert.equal(s.players[1].pendingDraw, false);
  assert.equal(s.players[1].hand.length, 10, 'descartou 1 e comprou 1');
  assert.ok(legalActions(s).some((a) => a.type === 'endTurn'));
});

test('limite de mão com mesa lotada pede para eliminar carta', () => {
  let s = newGame();
  for (let i = 0; i < 10; i++) hand(s, 1, FILLER);
  for (let i = 0; i < 5; i++) put(s, 1, FILLER);
  s.players[1].effects = s.players[1].effects.map((_, i) => ({
    uid: `fx${i}`, cardId: 'BCB-015', owner: 1, faceDown: true, turnsLeft: null, setTurn: 0,
  }));
  s = act(s, { type: 'endTurn' });
  assert.equal(handLimitStatus(s), 'must_discard');
});

test('limite de 60 turnos: vence quem tem mais CAIXA', () => {
  let s = newGame();
  s.turn = 60;
  s.players[0].caixa = 3000;
  s = act(s, { type: 'endTurn' });
  assert.equal(s.winner, 1);
  assert.equal(s.endReason, 'turn_limit');
});

test('a mesma semente gera a mesma partida (determinismo)', () => {
  const ids = ['BCB-001', 'BCB-002', 'BCB-004', 'BCB-009', 'BCB-013'];
  const deck = Array.from({ length: 40 }, (_, i) => ids[i % ids.length]);
  const a = createGame({ seed: 99, decks: [deck, deck], deckRules: null }).state;
  const b = createGame({ seed: 99, decks: [deck, deck], deckRules: null }).state;
  assert.deepEqual(a, b);
});

test('o estado original nunca é alterado por applyAction', () => {
  const s = newGame();
  const caio = put(s, 0, 'BCB-002');
  const before = structuredClone(s);
  attack(s, caio, null);
  assert.deepEqual(s, before);
});
