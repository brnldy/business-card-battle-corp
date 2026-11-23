// Previsão de um ataque (para a mira da interface): quem vence e quanto cada lado perde de CAIXA,
// sem moeda nem armadilha (o resultado real pode mudar se o Bruno estiver na mesa ou houver armadilha).
// Criada no remake visual (remake/src/engine.js) e trazida para o motor oficial com testes.
import { cardDef, findCreature, stats } from './stats.ts';
import type { GameState, Mode } from './types.ts';

export type PreviewResult = 'direct' | 'win' | 'lose' | 'bounce' | 'trade' | 'nothing';

export interface AttackPreview {
  atk: number;
  against: number;
  mode: Mode | null;
  result: PreviewResult;
  dmgFoe: number;
  dmgMe: number;
}

function differenceMultiplier(cardId: string): number {
  const ab = cardDef(cardId).abilities.find((x) => x.trigger === 'on_combat_won' && typeof x.combatDifferenceMultiplier === 'number');
  return ab ? (ab.combatDifferenceMultiplier as number) : 1;
}

export function previewAttack(s: GameState, uid: string, target: string | null): AttackPreview | null {
  const a = findCreature(s, uid);
  if (!a) return null;
  const ctx = { attackerUid: uid, defenderUid: target, secondAttack: a.c.attacksThisTurn >= 1 };
  const atk = stats(s, uid, ctx).atk;
  if (target === null) return { atk, against: 0, mode: null, result: 'direct', dmgFoe: atk, dmgMe: 0 };
  const d = findCreature(s, target);
  if (!d) return null;
  const mode = d.c.mode;
  const ds = stats(s, target, ctx);
  const against = mode === 'ATK' ? ds.atk : ds.def;
  let result: PreviewResult;
  let dmgFoe = 0;
  let dmgMe = 0;
  if (atk > against) {
    result = 'win';
    if (mode === 'ATK') dmgFoe = (atk - against) * differenceMultiplier(a.c.cardId);
  } else if (atk < against) {
    result = mode === 'ATK' ? 'lose' : 'bounce';
    dmgMe = (against - atk) * differenceMultiplier(d.c.cardId);
  } else result = mode === 'ATK' ? 'trade' : 'nothing';
  return { atk, against, mode, result, dmgFoe, dmgMe };
}
