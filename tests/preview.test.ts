// Previsão de ataque usada pela mira da interface (src/engine/preview.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAction } from '../src/engine/engine.ts';
import { previewAttack } from '../src/engine/preview.ts';
import { act, FILLER, newGame, put } from './helpers.ts';

test('prévia: ataque direto tira o ATQ inteiro', () => {
  const s = newGame();
  const caio = put(s, 0, 'BCB-002');
  assert.deepEqual(previewAttack(s, caio, null), { atk: 2000, against: 0, mode: null, result: 'direct', dmgFoe: 2000, dmgMe: 0 });
});

test('prévia: vence ATQ × ATQ e o rival perde a diferença', () => {
  const s = newGame();
  const caio = put(s, 0, 'BCB-002');
  const cesar = put(s, 1, FILLER);
  const p = previewAttack(s, caio, cesar)!;
  assert.equal(p.result, 'win');
  assert.equal(p.dmgFoe, 1000);
});

test('prévia: perde contra DEF maior e quem ataca perde a diferença', () => {
  const s = newGame();
  const cesar = put(s, 0, FILLER);
  const siamesas = put(s, 1, 'BCB-011', 'DEF');
  const p = previewAttack(s, cesar, siamesas)!;
  assert.equal(p.result, 'bounce');
  assert.equal(p.dmgMe, 1500);
});

test('prévia: empate ATQ × ATQ', () => {
  const s = newGame();
  const a = put(s, 0, FILLER);
  const b = put(s, 1, FILLER);
  assert.equal(previewAttack(s, a, b)!.result, 'trade');
});

test('prévia: Ralph dobra o dano quando vence (igual ao combate real)', () => {
  const s = newGame();
  const ralph = put(s, 0, 'BCB-007');
  const cesar = put(s, 1, FILLER);
  const p = previewAttack(s, ralph, cesar)!;
  const real = applyAction(act(s, { type: 'enterBattle' }), { type: 'attack', uid: ralph, target: cesar }).state;
  assert.equal(p.dmgFoe, 8000 - real.players[1].caixa);
});
