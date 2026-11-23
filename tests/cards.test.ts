import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CARDS } from '../src/engine/cards.ts';

test('todas as cartas têm ID único', () => {
  const ids = CARDS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('toda criatura/entidade tem custo, ATQ e DEF', () => {
  for (const c of CARDS.filter((c) => c.kind === 'creature' || c.kind === 'entity')) {
    assert.ok(typeof c.cost === 'number' && c.cost >= 0 && c.cost <= 3, `${c.id} custo`);
    assert.ok(typeof c.atk === 'number' && c.atk >= 0, `${c.id} ATQ`);
    assert.ok(typeof c.def === 'number' && c.def >= 0, `${c.id} DEF`);
  }
});

test('o PNG de toda carta existe nos originais e no remake', () => {
  for (const c of CARDS) {
    assert.ok(existsSync(new URL(`../assets-originais/${c.art}`, import.meta.url)), `${c.id}: falta o original ${c.art}`);
    const remakeArt = c.art.replace('cards/full/', 'cards/');
    assert.ok(existsSync(new URL(`../remake/assets/${remakeArt}`, import.meta.url)), `${c.id}: falta a cópia do remake ${remakeArt}`);
  }
});
