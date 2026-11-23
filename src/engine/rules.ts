// Regras base do jogo (detalhes em docs/GDD.md). Fonte única para o motor, a IA, os testes e a interface.
export const RULES = {
  STARTING_CAIXA: 8000,
  DECK_SIZE: 40,
  MAX_COPIES: 2,
  STARTING_HAND: 5,
  DRAW_PER_TURN: 1,
  HAND_LIMIT: 10, // teto da mão (sem descarte no fim do turno; ver GDD §7.1)
  MAX_TURNS: 60, // salvaguarda técnica contra partida infinita
  FIRST_PLAYER_SKIPS_DRAW: false, // quem começa compra normalmente, só não ataca no turno 1 (GDD §6, BALANCE #1)
  CREATURE_ZONES: 5,
  EFFECT_ZONES: 5,
  SUMMONS_PER_TURN: 1,
} as const;
