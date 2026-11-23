// Tipos do motor de regras. Tudo aqui é dado puro (serializável em JSON),
// para que o mesmo estado possa ser salvo, reproduzido e enviado pela rede no modo online.

export type PlayerId = 0 | 1;
export type Mode = 'ATK' | 'DEF';
export type Phase = 'main' | 'battle' | 'over';
export type Coin = 'cara' | 'coroa';

/** Uma cópia física de uma carta durante a partida. `uid` é único na partida. */
export interface CardRef {
  uid: string;
  cardId: string;
  owner: PlayerId;
}

/** Modificador de ATQ/DEF preso a uma criatura (ex.: Café, metade do Bruno). */
export interface StatMod {
  atk: number;
  def: number;
  mulAtk?: number;
  mulDef?: number;
  until: 'end_of_turn' | 'permanent';
  source: string; // cardId que gerou
}

export interface FieldCreature extends CardRef {
  mode: Mode;
  enteredTurn: number;
  modeChangedTurn: number;
  attacksThisTurn: number;
  /** Não pode atacar enquanto turnsStarted do lado dela for <= este número. */
  lockedUntilOwnerTurn: number;
  mods: StatMod[];
  flags: Record<string, boolean>;
}

export interface FieldEffect extends CardRef {
  faceDown: boolean;
  /** Turnos restantes do dono; null = sem duração (armadilha armada). */
  turnsLeft: number | null;
  setTurn: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  caixa: number;
  deck: CardRef[]; // índice 0 = topo
  hand: CardRef[];
  dead: CardRef[]; // o Morto
  creatures: (FieldCreature | null)[];
  effects: (FieldEffect | null)[];
  /** Marcadores de Frio recebidos, por uid da carta que causou (Caio). */
  frio: Record<string, number>;
  turnsStarted: number;
  summonsThisTurn: number;
  /** Mão no limite: a compra do turno espera até abrir espaço (GDD §7.1). */
  pendingDraw: boolean;
}

export interface GameState {
  version: 1;
  rng: number;
  turn: number; // turno global, começa em 1
  active: PlayerId;
  firstPlayer: PlayerId;
  phase: Phase;
  players: [PlayerState, PlayerState];
  winner: PlayerId | 'draw' | null;
  endReason: 'caixa' | 'turn_limit' | null;
  nextUid: number;
  /** Usos de habilidades limitadas por partida, por uid da cópia (Filipe: 2 desvios). */
  uses?: Record<string, number>;
  /** Só para testes: força o resultado das próximas moedas. */
  debugCoins?: Coin[];
}

export type Action =
  | { type: 'summon'; uid: string; mode: Mode; sacrifices: string[]; target?: string | null }
  | { type: 'playEffect'; uid: string; target?: string | null; costs?: string[] }
  | { type: 'setTrap'; uid: string }
  | { type: 'changeMode'; uid: string }
  | { type: 'enterBattle' }
  | { type: 'attack'; uid: string; target: string | null }
  | { type: 'discard'; uid: string }
  | { type: 'endTurn' };

/** Eventos emitidos pelo motor; a tela anima cada um deles, na ordem. */
export type GameEvent =
  | { type: 'gameStart'; firstPlayer: PlayerId }
  | { type: 'turnStart'; player: PlayerId; turn: number }
  | { type: 'draw'; player: PlayerId; uid: string; cardId: string }
  | { type: 'drawSkipped'; player: PlayerId; reason: 'first_turn' | 'deck_empty' | 'hand_limit' }
  | { type: 'summon'; player: PlayerId; uid: string; cardId: string; mode: Mode; zone: number }
  | { type: 'sacrifice'; player: PlayerId; uid: string; cardId: string }
  | { type: 'modeChange'; uid: string; mode: Mode }
  | { type: 'effectPlayed'; player: PlayerId; uid: string; cardId: string; target?: string | null }
  | { type: 'trapSet'; player: PlayerId; uid: string; zone: number }
  | { type: 'trapTriggered'; player: PlayerId; uid: string; cardId: string; against: string }
  | { type: 'effectExpired'; uid: string; cardId: string }
  | { type: 'phase'; phase: Phase }
  | { type: 'attack'; attacker: string; target: string | null; second: boolean }
  | { type: 'attackNegated'; attacker: string; by: string }
  | { type: 'attackRedirected'; attacker: string; from: string; to: string; by: string }
  | { type: 'coin'; source: string; result: Coin; target: string }
  | { type: 'statMod'; uid: string; source: string; atk: number; def: number; mul?: number }
  | { type: 'combat'; attacker: string; defender: string | null; atk: number; against: number; defenderMode: Mode | null }
  | { type: 'destroy'; uid: string; cardId: string }
  | { type: 'toDeck'; uid: string; cardId: string }
  | { type: 'toHand'; uid: string; cardId: string }
  | { type: 'mill'; player: PlayerId; uid: string; cardId: string }
  | { type: 'discard'; player: PlayerId; uid: string; cardId: string }
  | { type: 'lock'; uid: string; untilOwnerTurn: number; source: string }
  | { type: 'controlChange'; uid: string; to: PlayerId }
  | { type: 'frio'; player: PlayerId; counters: number }
  | { type: 'damage'; player: PlayerId; amount: number; source: string | null; caixa: number }
  | { type: 'heal'; player: PlayerId; amount: number; source: string; caixa: number }
  | { type: 'gameOver'; winner: PlayerId | 'draw'; reason: 'caixa' | 'turn_limit' };

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}
