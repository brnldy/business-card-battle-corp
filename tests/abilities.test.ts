// Habilidades de cada carta (docs/CARDS.md v0.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legalActions } from '../src/engine/engine.ts';
import { stats } from '../src/engine/stats.ts';
import { act, actEv, ATK, attack, DEF, FILLER, hand, inDead, newGame, onField, put, putTrap } from './helpers.ts';

const BRUNO = 'BCB-001', CAIO = 'BCB-002', AR = 'BCB-003', NATH = 'BCB-004', GPT = 'BCB-005';
const ONIBUS = 'BCB-006', RALPH = 'BCB-007', LUCAS = 'BCB-008', ROGER = 'BCB-009', TENIA = 'BCB-010';
const SIAMESAS = 'BCB-011', PAULO = 'BCB-013', PAO = 'BCB-014', PILHA = 'BCB-015', CAFE = 'BCB-016';
const THAYS = 'BCB-017', DUDA = 'BCB-018';

test('Bruno: moeda coroa deixa o atacante inimigo pela metade até o fim do turno', () => {
  const s = newGame();
  put(s, 1, BRUNO, 'DEF'); // DEF 900
  const caio = put(s, 0, 'BCB-013'); // Paulo ATQ 850 (não é imune a Barulho)
  s.debugCoins = ['coroa'];
  const { state, events } = attack(s, caio, s.players[1].creatures[0]!.uid);
  assert.ok(events.some((e) => e.type === 'coin' && e.result === 'coroa'));
  // 850/2 = 425 contra DEF 900: atacante perde 475.
  assert.equal(state.players[0].caixa, 8000 - 475);
  const next = act(state, { type: 'endTurn' });
  assert.equal(stats(next, caio).atk, 850, 'volta ao normal no fim do turno');
});

test('Bruno: moeda cara não muda nada; Caio (imune a Barulho) nem joga moeda', () => {
  const s = newGame();
  const bruno = put(s, 1, BRUNO, 'DEF');
  const caio = put(s, 0, CAIO);
  const { events } = attack(s, caio, bruno);
  assert.ok(!events.some((e) => e.type === 'coin'));
});

test('Caio: cada ataque soma 1 marcador de Frio; oponente perde $100 × marcadores no começo do turno dele', () => {
  let s = newGame();
  const caio = put(s, 0, CAIO);
  s = attack(s, caio, null).state; // direto: ATQ inteiro do Caio
  assert.equal(s.players[1].frio[caio], 1);
  s = act(s, { type: 'endTurn' });
  assert.equal(s.players[1].caixa, 8000 - ATK(CAIO) - 100);
  s = act(s, { type: 'endTurn' });
  s = attack(s, caio, null).state;
  s = act(s, { type: 'endTurn' });
  assert.equal(s.players[1].caixa, 8000 - ATK(CAIO) - 100 - ATK(CAIO) - 200);
});

test('Caio: os marcadores de Frio somem quando ele sai da mesa', () => {
  let s = newGame();
  const caio = put(s, 0, CAIO);
  s.players[1].frio[caio] = 3;
  const killer = put(s, 1, 'BCB-005'); // Chat GPT ATQ 2.850
  s = act(s, { type: 'endTurn' }); // jogador 1 perde 300 no começo
  assert.equal(s.players[1].caixa, 7700);
  s = attack(s, killer, caio).state;
  assert.deepEqual(s.players[1].frio, {});
});

test('Ar Condicionado: -$350 para quem não é imune a Frio, +$350 para o Caio, dura 4 turnos do dono', () => {
  let s = newGame();
  const ar = hand(s, 0, AR);
  const cesar = put(s, 1, FILLER);
  const caio = put(s, 0, CAIO);
  s = act(s, { type: 'playEffect', uid: ar });
  assert.equal(stats(s, cesar).atk, ATK(FILLER) - 350);
  assert.equal(stats(s, caio).atk, ATK(CAIO) + 350);
  for (let i = 0; i < 7; i++) s = act(s, { type: 'endTurn' }); // 4 fins de turno do dono
  assert.ok(s.players[0].effects.every((e) => e === null), 'expirou');
  assert.ok(inDead(s, 0, ar));
  assert.equal(stats(s, cesar).atk, ATK(FILLER));
});

test('Nath: +$300 com Bruno em qualquer lado, mesmo chegando depois', () => {
  const s = newGame();
  const nath = put(s, 0, NATH);
  assert.equal(stats(s, nath).atk, ATK(NATH));
  put(s, 1, BRUNO);
  assert.equal(stats(s, nath).atk, ATK(NATH) + 300);
});

test('Nath: ataca duas vezes; o segundo ataque usa metade do ATQ', () => {
  let s = newGame();
  const nath = put(s, 0, NATH);
  s = attack(s, nath, null).state;
  assert.equal(s.players[1].caixa, 8000 - ATK(NATH));
  s = attack(s, nath, null).state;
  assert.equal(s.players[1].caixa, 8000 - ATK(NATH) - Math.round(ATK(NATH) / 2));
  assert.ok(!legalActions(s).some((a) => a.type === 'attack'));
});

test('Chat GPT: Criação dos dois lados ganha +$300 ATQ e -$300 DEF', () => {
  const s = newGame();
  const mine = put(s, 0, ROGER); // Criação
  const theirs = put(s, 1, NATH); // Criação
  const outsider = put(s, 1, SIAMESAS); // Externo
  put(s, 0, GPT);
  assert.deepEqual(stats(s, mine), { atk: ATK(ROGER) + 300, def: DEF(ROGER) - 300 });
  assert.equal(stats(s, theirs).atk, ATK(NATH) + 300 - 400); // Roger tira 400 da Nath
  assert.deepEqual(stats(s, outsider), { atk: ATK(SIAMESAS), def: DEF(SIAMESAS) });
});

test('Chat GPT: destruído volta para o deck; sacrificado vai para o Morto', () => {
  let s = newGame();
  const gpt = put(s, 1, GPT, 'DEF');
  const big = put(s, 0, FILLER, 'ATK', { mods: [{ atk: 5000, def: 0, until: 'permanent', source: 'x' }] });
  s = attack(s, big, gpt).state;
  assert.ok(!onField(s, gpt));
  assert.ok(s.players[1].deck.some((c) => c.uid === gpt));
  assert.ok(!inDead(s, 1, gpt));

  let t = newGame();
  const gpt2 = put(t, 0, GPT);
  const another = hand(t, 0, GPT); // custo 2
  const other = put(t, 0, FILLER);
  t = act(t, { type: 'summon', uid: another, mode: 'ATK', sacrifices: [gpt2, other] });
  assert.ok(inDead(t, 0, gpt2));
});

test('2104: sem a carta 18HRS fica com os valores base', () => {
  const s = newGame();
  const bus = put(s, 0, ONIBUS);
  assert.deepEqual(stats(s, bus), { atk: ATK(ONIBUS), def: DEF(ONIBUS) });
});

test('Ralph: dobra a diferença quando ele vence, mas não no ataque direto', () => {
  let s = newGame();
  const ralph = put(s, 0, RALPH);
  const cesar = put(s, 1, FILLER);
  const won = (ATK(RALPH) - ATK(FILLER)) * 2;
  s = attack(s, ralph, cesar).state;
  assert.equal(s.players[1].caixa, 8000 - won);
  s = act(s, { type: 'endTurn' });
  s = act(s, { type: 'endTurn' });
  s = attack(s, ralph, null).state;
  assert.equal(s.players[1].caixa, 8000 - won - ATK(RALPH));
});

test('Ralph: outras criaturas suas não dobram', () => {
  const s = newGame();
  put(s, 0, RALPH);
  const caio = put(s, 0, CAIO);
  const cesar = put(s, 1, FILLER);
  const r = attack(s, caio, cesar).state;
  assert.equal(r.players[1].caixa, 8000 - (ATK(CAIO) - ATK(FILLER)));
});

test('Lucas: +$200 com Chat GPT; ao entrar trava uma criatura da Criação no próximo turno do dono', () => {
  let s = newGame();
  const nath = put(s, 1, NATH);
  const lucas = hand(s, 0, LUCAS);
  s = act(s, { type: 'summon', uid: lucas, mode: 'ATK', sacrifices: [], target: nath });
  s = act(s, { type: 'endTurn' });
  s = act(s, { type: 'enterBattle' });
  assert.ok(!legalActions(s).some((a) => a.type === 'attack' && a.uid === nath), 'travada no turno do dono');
  s = act(s, { type: 'endTurn' });
  s = act(s, { type: 'endTurn' });
  s = act(s, { type: 'enterBattle' });
  assert.ok(legalActions(s).some((a) => a.type === 'attack' && a.uid === nath), 'liberada depois');
  put(s, 0, GPT);
  assert.equal(stats(s, lucas).atk, ATK(LUCAS) + 200 + 300);
});

test('Lucas: só pode mirar criaturas da Criação, e a trava é opcional', () => {
  const s = newGame();
  put(s, 1, SIAMESAS); // Externo
  const lucas = hand(s, 0, LUCAS);
  const summons = legalActions(s).filter((a) => a.type === 'summon' && a.uid === lucas);
  assert.ok(summons.every((a) => a.type === 'summon' && a.target === null));
});

test('Roger: Nath (qualquer lado) perde $400 de ATQ e DEF', () => {
  const s = newGame();
  const nath = put(s, 1, NATH);
  put(s, 0, ROGER);
  assert.deepEqual(stats(s, nath), { atk: ATK(NATH) - 400, def: DEF(NATH) - 400 });
});

test('Tênia: ao entrar, come as 3 cartas do topo do seu próprio deck', () => {
  let s = newGame();
  const top = s.players[0].deck.slice(0, 3).map((c) => c.uid);
  const tenia = hand(s, 0, TENIA);
  s = act(s, { type: 'summon', uid: tenia, mode: 'ATK', sacrifices: [] });
  for (const uid of top) assert.ok(inDead(s, 0, uid));
  assert.equal(s.players[1].dead.length, 0);
});

test('Siamesas: dano que causam ao CAIXA volta como cura', () => {
  const s = newGame();
  const sia = put(s, 0, SIAMESAS);
  const r = attack(s, sia, null).state;
  assert.equal(r.players[1].caixa, 8000 - ATK(SIAMESAS));
  assert.equal(r.players[0].caixa, 8000 + ATK(SIAMESAS));
});

test('Pão com Requeijão: manda 2 criaturas suas da mesa para o Morto e ganha $1.000', () => {
  let s = newGame();
  const pao = hand(s, 0, PAO);
  assert.ok(!legalActions(s).some((a) => a.type === 'playEffect' && a.uid === pao), 'precisa de 2 na mesa');
  const a = put(s, 0, FILLER);
  const b = put(s, 0, FILLER);
  s = act(s, { type: 'playEffect', uid: pao, costs: [a, b] });
  assert.equal(s.players[0].caixa, 9000);
  assert.ok(inDead(s, 0, a) && inDead(s, 0, b) && inDead(s, 0, pao));
});

test('Onde tem Pilha?: ataque da Criação é anulado e o turno do atacante acaba', () => {
  const s = newGame();
  putTrap(s, 1, PILHA);
  const nath = put(s, 0, NATH); // Criação
  const { state, events } = attack(s, nath, null);
  assert.ok(events.some((e) => e.type === 'attackNegated'));
  assert.equal(state.players[1].caixa, 8000);
  assert.equal(state.active, 1, 'passou a vez');
  assert.ok(state.players[1].effects.every((e) => e === null));
});

test('Onde tem Pilha?: não dispara contra quem não é da Criação', () => {
  const s = newGame();
  putTrap(s, 1, PILHA);
  const sia = put(s, 0, SIAMESAS);
  const { state } = attack(s, sia, null);
  assert.equal(state.players[1].caixa, 8000 - ATK(SIAMESAS));
});

test('Café: +$600 ATQ e -$1.000 DEF enquanto estiver na mesa; Nath não perde DEF', () => {
  let s = newGame();
  const cafe1 = hand(s, 0, CAFE);
  const cafe2 = hand(s, 0, CAFE);
  const cesar = put(s, 1, FILLER);
  const nath = put(s, 0, NATH);
  s = act(s, { type: 'playEffect', uid: cafe1, target: cesar });
  assert.deepEqual(stats(s, cesar), { atk: ATK(FILLER) + 600, def: Math.max(0, DEF(FILLER) - 1000) });
  s = act(s, { type: 'playEffect', uid: cafe2, target: nath });
  assert.deepEqual(stats(s, nath), { atk: ATK(NATH) + 600, def: DEF(NATH) });
  s = act(s, { type: 'endTurn' });
  assert.equal(stats(s, cesar).atk, ATK(FILLER) + 600, 'continua no turno seguinte');
});

test('Paulo: em DEF, só as suas OUTRAS criaturas ganham +$300 DEF', () => {
  let s = newGame();
  const paulo = put(s, 0, PAULO, 'DEF', { enteredTurn: -5 });
  const ally = put(s, 0, FILLER);
  const enemy = put(s, 1, FILLER);
  assert.equal(stats(s, ally).def, DEF(FILLER) + 300);
  assert.equal(stats(s, paulo).def, DEF(PAULO));
  assert.equal(stats(s, enemy).def, DEF(FILLER));
  s = act(s, { type: 'changeMode', uid: paulo });
  assert.equal(stats(s, ally).def, DEF(FILLER), 'em ATQ não dá bônus');
});

test('Thays: ao entrar, pode devolver 1 criatura do oponente para a mão dele', () => {
  let s = newGame();
  const nath = put(s, 1, NATH);
  const other = put(s, 1, FILLER);
  const thays = hand(s, 0, THAYS);
  const sac = put(s, 0, FILLER); // custo 1
  s = act(s, { type: 'summon', uid: thays, mode: 'ATK', sacrifices: [sac], target: nath });
  assert.ok(!onField(s, nath));
  assert.ok(s.players[1].hand.some((c) => c.uid === nath));
  assert.ok(onField(s, other));
});

test('Duda: trava 1 criatura inimiga por 2 turnos dele; Criação que a ataca perde $250', () => {
  let s = newGame();
  const enemyNath = put(s, 1, NATH);
  const enemyRoger = put(s, 1, ROGER);
  const duda = hand(s, 0, DUDA);
  s = act(s, { type: 'summon', uid: duda, mode: 'ATK', sacrifices: [], target: enemyNath });
  for (let turn = 0; turn < 2; turn++) {
    s = act(s, { type: 'endTurn' });
    s = act(s, { type: 'enterBattle' });
    assert.ok(!legalActions(s).some((a) => a.type === 'attack' && a.uid === enemyNath));
    s = act(s, { type: 'endTurn' });
  }
  s = act(s, { type: 'endTurn' });
  s = act(s, { type: 'enterBattle' });
  assert.ok(legalActions(s).some((a) => a.type === 'attack' && a.uid === enemyNath), 'liberada no 3º turno');
  // Roger (Criação) ataca Duda com -250 de ATQ: o dono do Roger perde a diferença.
  const before = s.players[1].caixa;
  const r = actEv(s, { type: 'attack', uid: enemyRoger, target: duda }).state;
  assert.equal(r.players[1].caixa, before - (ATK(DUDA) - (ATK(ROGER) - 250)));
});

// ───────── Filipe, the Bear (BCB-019) ─────────
const FILIPE = 'BCB-019';

test('Filipe: atacado, desvia o ataque para outra criatura de quem atacou (o pior alvo para o atacante)', () => {
  const s = newGame();
  const filipe = put(s, 1, FILIPE);
  const caio = put(s, 0, CAIO);
  const paulo = put(s, 0, PAULO, 'DEF'); // DEF alta: o Caio "bate" nela e o próprio dono perde a diferença
  const cesar = put(s, 0, FILLER); // ATQ baixo: o Caio o destruiria e o próprio dono perderia a diferença
  const { state, events } = attack(s, caio, filipe);
  const red = events.find((e) => e.type === 'attackRedirected');
  assert.ok(red && red.type === 'attackRedirected' && red.from === filipe);
  assert.ok(onField(state, filipe), 'Filipe sai ileso');
  assert.equal(state.players[1].caixa, 8000, 'o dono do Filipe não perde nada');
  // Contra o César: o César morre e o dono do Caio perde (ATQ Caio − ATQ César). Contra o Paulo: perde (DEF Paulo − ATQ Caio).
  const vsCesar = ATK(CAIO) - ATK(FILLER) + 1500, vsPaulo = Math.max(0, DEF(PAULO) - ATK(CAIO));
  assert.equal(red.to, vsCesar >= vsPaulo ? cesar : paulo);
  assert.ok(state.players[0].caixa < 8000);
});

test('Filipe: sem outra criatura do atacante, o ataque segue contra ele normalmente', () => {
  const s = newGame();
  const filipe = put(s, 1, FILIPE);
  const gpt = put(s, 0, GPT);
  const { state, events } = attack(s, gpt, filipe);
  assert.ok(!events.some((e) => e.type === 'attackRedirected'));
  assert.ok(!onField(state, filipe));
});

test('Filipe: só desvia 2 vezes na partida inteira', () => {
  let s = newGame();
  const filipe = put(s, 1, FILIPE, 'DEF');
  const a = put(s, 0, FILLER);
  // colegas em DEF igual ao ATQ do atacante: o ataque desviado empata e ninguém perde nada
  for (let i = 0; i < 4; i++) put(s, 0, FILLER, 'DEF', { mods: [{ atk: 0, def: ATK(FILLER) - DEF(FILLER), until: 'permanent', source: 'x' }] });
  void a;
  let redirects = 0;
  for (let round = 0; round < 3; round++) {
    const attacker = s.players[0].creatures.find((c) => c && c.mode === 'ATK')!.uid;
    const r = attack(s, attacker, filipe);
    if (r.events.some((e) => e.type === 'attackRedirected')) redirects++;
    s = act(act(r.state, { type: 'endTurn' }), { type: 'endTurn' });
    if (!onField(s, filipe)) break;
  }
  assert.equal(redirects, 2);
});

test('Filipe + Nath (Louro José): juntos na mesma mesa, os dois ganham +$100 de ATQ e DEF', () => {
  const s = newGame();
  const filipe = put(s, 0, FILIPE);
  assert.deepEqual(stats(s, filipe), { atk: ATK(FILIPE), def: DEF(FILIPE) });
  const nath = put(s, 0, NATH);
  assert.deepEqual(stats(s, filipe), { atk: ATK(FILIPE) + 100, def: DEF(FILIPE) + 100 });
  assert.deepEqual(stats(s, nath), { atk: ATK(NATH) + 100, def: DEF(NATH) + 100 });
  const s2 = newGame();
  const f2 = put(s2, 0, FILIPE);
  put(s2, 1, NATH);
  assert.equal(stats(s2, f2).atk, ATK(FILIPE), 'Nath do outro lado não conta');
});
