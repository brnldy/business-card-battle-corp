// Consultas ao estado e cálculo de ATQ/DEF efetivos.
// Os bônus contínuos (auras) não ficam gravados nas cartas: são recalculados a partir da mesa,
// então entram e saem sozinhos quando a carta que os causa entra ou sai.
import { CARDS_BY_ID, type CardAbility, type CardDef } from './cards.ts';
import type { FieldCreature, FieldEffect, GameState, PlayerId } from './types.ts';

export function cardDef(cardId: string): CardDef {
  const def = CARDS_BY_ID.get(cardId);
  if (!def) throw new Error(`Carta desconhecida: ${cardId}`);
  return def;
}

export function other(p: PlayerId): PlayerId {
  return p === 0 ? 1 : 0;
}

export interface CreatureLoc {
  c: FieldCreature;
  side: PlayerId;
  zone: number;
}

export function creaturesOf(s: GameState, side: PlayerId): CreatureLoc[] {
  const out: CreatureLoc[] = [];
  s.players[side].creatures.forEach((c, zone) => {
    if (c) out.push({ c, side, zone });
  });
  return out;
}

export function allCreatures(s: GameState): CreatureLoc[] {
  return [...creaturesOf(s, s.active), ...creaturesOf(s, other(s.active))];
}

export function findCreature(s: GameState, uid: string): CreatureLoc | null {
  for (const side of [0, 1] as const) {
    const zone = s.players[side].creatures.findIndex((c) => c?.uid === uid);
    if (zone >= 0) return { c: s.players[side].creatures[zone]!, side, zone };
  }
  return null;
}

export function faceUpEffects(s: GameState): { e: FieldEffect; side: PlayerId }[] {
  const out: { e: FieldEffect; side: PlayerId }[] = [];
  for (const side of [0, 1] as const) {
    for (const e of s.players[side].effects) if (e && !e.faceDown) out.push({ e, side });
  }
  return out;
}

/** A carta está na mesa (criatura ou efeito virado para cima), em qualquer lado? */
export function cardOnField(s: GameState, cardId: string): boolean {
  return (
    allCreatures(s).some(({ c }) => c.cardId === cardId) || faceUpEffects(s).some(({ e }) => e.cardId === cardId)
  );
}

export function abilities(cardId: string): CardAbility[] {
  return cardDef(cardId).abilities;
}

export function findAbility(cardId: string, pred: (a: CardAbility) => boolean): CardAbility | undefined {
  return abilities(cardId).find(pred);
}

/**
 * Imunidade (GDD §10): protege contra efeitos PREJUDICIAIS de cartas do elemento citado
 * (ou de uma carta específica, "card:ID"). Bônus continuam valendo. Combate não é afetado.
 */
export function isImmune(target: CardDef, source: CardDef): boolean {
  const imm = target.immunities ?? [];
  return imm.includes(source.element) || imm.includes(`card:${source.id}`);
}

interface Aura {
  scope: 'self' | 'all_creatures' | 'card_named' | 'own_creatures';
  department?: string;
  cardId?: string;
  exceptImmuneTo?: string;
  excludeSelf?: boolean;
  atk?: number;
  def?: number;
}

interface Condition {
  cardOnField?: string;
  selfMode?: 'ATK' | 'DEF';
}

function conditionMet(s: GameState, cond: Condition | undefined, source: FieldCreature | null): boolean {
  if (!cond) return true;
  if (cond.cardOnField && !cardOnField(s, cond.cardOnField)) return false;
  if (cond.selfMode && source?.mode !== cond.selfMode) return false;
  return true;
}

function auraHits(aura: Aura, sourceUid: string, sourceSide: PlayerId, target: CreatureLoc): boolean {
  const tDef = cardDef(target.c.cardId);
  switch (aura.scope) {
    case 'self':
      return target.c.uid === sourceUid;
    case 'card_named':
      return target.c.cardId === aura.cardId;
    case 'own_creatures':
      return target.side === sourceSide && !(aura.excludeSelf && target.c.uid === sourceUid);
    case 'all_creatures':
      if (aura.department && tDef.department !== aura.department) return false;
      if (aura.exceptImmuneTo && (tDef.immunities ?? []).includes(aura.exceptImmuneTo)) return false;
      return true;
  }
}

/** Contexto de combate: alguns ajustes só valem durante um ataque específico. */
export interface CombatCtx {
  attackerUid: string;
  defenderUid: string | null;
  secondAttack: boolean;
}

export interface Stats {
  atk: number;
  def: number;
}

export function stats(s: GameState, uid: string, ctx?: CombatCtx): Stats {
  const loc = findCreature(s, uid);
  if (!loc) throw new Error(`Criatura não está na mesa: ${uid}`);
  const tDef = cardDef(loc.c.cardId);
  let atk = tDef.atk ?? 0;
  let def = tDef.def ?? 0;

  const applyAura = (aura: Aura, sourceDef: CardDef) => {
    const immune = isImmune(tDef, sourceDef);
    const a = aura.atk ?? 0;
    const d = aura.def ?? 0;
    if (!(immune && a < 0)) atk += a;
    if (!(immune && d < 0)) def += d;
  };

  // Auras de criaturas na mesa.
  for (const src of allCreatures(s)) {
    const sDef = cardDef(src.c.cardId);
    for (const ab of sDef.abilities) {
      if (ab.trigger !== 'continuous' || !ab.aura) continue;
      const aura = ab.aura as Aura;
      if (!conditionMet(s, ab.condition as Condition | undefined, src.c)) continue;
      if (auraHits(aura, src.c.uid, src.side, loc)) applyAura(aura, sDef);
    }
  }
  // Auras de efeitos virados para cima (ex.: Ar Condicionado).
  for (const { e, side } of faceUpEffects(s)) {
    const sDef = cardDef(e.cardId);
    for (const ab of sDef.abilities) {
      if (ab.trigger !== 'continuous' || !ab.aura) continue;
      const aura = ab.aura as Aura;
      if (!conditionMet(s, ab.condition as Condition | undefined, null)) continue;
      if (auraHits(aura, e.uid, side, loc)) applyAura(aura, sDef);
    }
  }

  // Modificadores presos na criatura.
  let mulAtk = 1;
  let mulDef = 1;
  for (const m of loc.c.mods) {
    atk += m.atk;
    def += m.def;
    mulAtk *= m.mulAtk ?? 1;
    mulDef *= m.mulDef ?? 1;
  }

  // Ajustes que só valem dentro de um combate.
  if (ctx && ctx.attackerUid === uid) {
    if (ctx.defenderUid) {
      const defender = findCreature(s, ctx.defenderUid);
      if (defender) {
        const dDef = cardDef(defender.c.cardId);
        for (const ab of dDef.abilities) {
          // Duda: "toda carta da Criação que a atacar perde -$250 de ATQ".
          if (ab.trigger !== 'on_attacked') continue;
          const cond = ab.condition as { attackerDepartment?: string } | undefined;
          if (cond?.attackerDepartment && cond.attackerDepartment !== tDef.department) continue;
          const eff = ab.effect as { attackerAtk?: number };
          if (eff.attackerAtk && !(isImmune(tDef, dDef) && eff.attackerAtk < 0)) atk += eff.attackerAtk;
        }
      }
    }
    if (ctx.secondAttack) {
      const extra = findAbility(loc.c.cardId, (a) => typeof a.extraAttackAtkMultiplier === 'number');
      if (extra) mulAtk *= extra.extraAttackAtkMultiplier as number;
    }
  }

  return {
    atk: Math.max(0, Math.round(atk * mulAtk)),
    def: Math.max(0, Math.round(def * mulDef)),
  };
}

/** Quantos ataques por turno a criatura tem (Nath: 2). */
export function attacksAllowed(cardId: string): number {
  const extra = findAbility(cardId, (a) => typeof a.extraAttacks === 'number');
  return 1 + ((extra?.extraAttacks as number | undefined) ?? 0);
}

export function canAttackNow(s: GameState, loc: CreatureLoc): boolean {
  return (
    loc.c.mode === 'ATK' &&
    loc.c.attacksThisTurn < attacksAllowed(loc.c.cardId) &&
    s.players[loc.side].turnsStarted > loc.c.lockedUntilOwnerTurn
  );
}
