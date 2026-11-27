import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN, newCampaign, tierOf, rivalPlan, advanceCampaign, fixCampaign, bossDeck } from '../src/meta/campaign.ts';
import { newSave, applyMatch, migrate } from '../src/meta/meta.ts';
import { validateDeck, TEST_DECK_RULES } from '../src/engine/setup.ts';

const counters = { biggestHit: 0, damage: 0, plays: {}, summon: 0, destroy: 0, effect: 0, trap: 0, sacrifice: 0, direct: 0, redirects: 0, louro: false };

test('campanha: 30 rivais, 29 empresas sorteadas e o chefe sempre por último', () => {
  assert.equal(CAMPAIGN.companies.length, 29);
  const c = newCampaign(5);
  assert.equal(c.order.length, 30);
  assert.equal(c.order[29], CAMPAIGN.boss.name);
  assert.equal(new Set(c.order).size, 30);
  assert.notDeepEqual(newCampaign(5).order, newCampaign(6).order);
});

test('campanha: dificuldade sobe de 10 em 10 e a 30ª é o chefe', () => {
  assert.deepEqual([0, 9, 10, 19, 20, 28, 29].map(tierOf), [0, 0, 1, 1, 2, 2, 3]);
});

test('campanha: todo deck de rival é válido (40 cartas, até 3 cópias)', () => {
  assert.deepEqual(validateDeck(bossDeck(), TEST_DECK_RULES), []);
  for (const stage of [0, 12, 25, 29]) {
    const plan = rivalPlan({ ...newCampaign(1), stage }, ['BCB-001', 'BCB-002'], 77);
    assert.equal(plan.deck.length, 40, `batalha ${stage + 1}`);
    assert.equal(plan.boss, stage === 29);
  }
  for (const d of CAMPAIGN.themeDecks) assert.equal(Object.values(d.cards).reduce((a, b) => a + b, 0), 40, d.name);
});

test('campanha: vitória avança, derrota fica, a 30ª vitória conclui', () => {
  let c = newCampaign(1);
  assert.equal(advanceCampaign(c, 1, 'loss').campaign.stage, 0);
  assert.equal(advanceCampaign(c, 2, 'win').advanced, false, 'batalha errada não conta');
  c = advanceCampaign(c, 1, 'win').campaign; assert.equal(c.stage, 1);
  c = { ...c, stage: 29 };
  const end = advanceCampaign(c, 30, 'win');
  assert.equal(end.finished, true); assert.equal(end.campaign.cleared, true);
  assert.equal(rivalPlan(end.campaign, [], 3).free, true);
});

test('campanha: applyMatch paga com o multiplicador da faixa e avança o save', () => {
  const s = newSave(1);
  const out = applyMatch(s, { rival: s.campaign.order[0], result: 'win', turns: 10, caixa: [4000, 0], counters, campaignStage: 1, rewardMul: 1.5 }, 1, '2026-11-26');
  assert.equal(out.reward, 6000); assert.equal(out.advanced, true); assert.equal(out.save.campaign.stage, 1);
});

test('campanha: saves antigos ganham uma campanha do zero', () => {
  const s = migrate({ v: 1, patrimonio: 10 }, 3);
  assert.equal(s.campaign.stage, 0); assert.equal(s.campaign.order.length, 30);
  assert.equal(fixCampaign({ order: ['NADA'], stage: 99 }).stage, 30);
});
