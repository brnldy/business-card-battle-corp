// Tipos e carregamento dos dados das cartas (data/cards.json).
// Sem dependência do Phaser: o motor de regras e os testes usam o mesmo arquivo.
import cardsData from '../../data/cards.json' with { type: 'json' };

export type CardKind = 'creature' | 'entity' | 'effect_instant' | 'effect_trap';

export interface CardAbility {
  name: string;
  trigger: string;
  [key: string]: unknown;
}

export interface CardDef {
  id: string;
  name: string;
  kind: CardKind;
  element: string;
  department: string;
  cost?: number;
  atk?: number;
  def?: number;
  durationTurns?: number;
  immunities?: string[];
  rarity?: 'common' | 'rare' | 'legendary' | null;
  abilities: CardAbility[];
  art: string;
}

export const CARDS: readonly CardDef[] = (cardsData as { cards: CardDef[] }).cards;

export const CARDS_BY_ID: ReadonlyMap<string, CardDef> = new Map(CARDS.map((c) => [c.id, c]));

export function isCreature(card: CardDef): boolean {
  return card.kind === 'creature' || card.kind === 'entity';
}
