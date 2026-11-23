// IA "gulosa": testa cada ação válida numa cópia do estado e escolhe a que mais melhora a avaliação.
// Simples de propósito (dificuldade "fácil/média"). Dá para criar níveis depois mudando os pesos.
//
// Limitação conhecida: ao simular uma jogada com moeda (Bruno), a cópia usa o mesmo gerador aleatório,
// então a IA "enxerga" o resultado da moeda. Isso será corrigido quando houver níveis de dificuldade.
import { applyAction, legalActions } from '../engine/engine.ts';
import { creaturesOf, other, stats } from '../engine/stats.ts';
import type { Action, GameState, PlayerId } from '../engine/types.ts';

export interface AIWeights {
  creatureValue: number; // peso de (ATQ+DEF)/2 de cada criatura
  creatureBase: number; // valor fixo de ter uma criatura na mesa
  handCard: number;
  trap: number;
  frioCounter: number;
  threat: number; // o quanto teme criaturas inimigas mais fortes
  minGain: number; // ganho mínimo para fazer uma jogada em vez de passar
}

export const DEFAULT_WEIGHTS: AIWeights = {
  creatureValue: 0.5,
  creatureBase: 300,
  handCard: 150,
  trap: 400,
  frioCounter: 250,
  threat: 0.6,
  minGain: 1,
};

function sideValue(s: GameState, side: PlayerId, w: AIWeights): number {
  const p = s.players[side];
  let v = p.caixa;
  const mine = creaturesOf(s, side);
  const enemy = creaturesOf(s, other(side));
  const enemyAtk = enemy.filter((e) => e.c.mode === 'ATK').map((e) => stats(s, e.c.uid).atk);
  const enemyMax = enemyAtk.length ? Math.max(...enemyAtk) : 0;

  for (const { c } of mine) {
    const st = stats(s, c.uid);
    const value = w.creatureBase + w.creatureValue * (st.atk + st.def);
    v += value;
    // Ameaça: criatura que perderia para a melhor atacante inimiga.
    if (c.mode === 'ATK' && enemyMax > st.atk) v -= w.threat * (enemyMax - st.atk + value);
    if (c.mode === 'DEF' && enemyMax > st.def) v -= w.threat * 0.5 * value;
  }
  if (mine.length === 0) v -= w.threat * enemyAtk.reduce((a, b) => a + b, 0);

  v += w.handCard * p.hand.length;
  v += w.trap * p.effects.filter((e) => e?.faceDown).length;
  v -= w.frioCounter * Object.values(p.frio).reduce((a, b) => a + b, 0);
  return v;
}

export function evaluate(s: GameState, me: PlayerId, w: AIWeights = DEFAULT_WEIGHTS): number {
  if (s.winner === me) return 1e9;
  if (s.winner !== null) return s.winner === 'draw' ? 0 : -1e9;
  return sideValue(s, me, w) - sideValue(s, other(me), w);
}

export function chooseAction(s: GameState, w: AIWeights = DEFAULT_WEIGHTS): Action {
  const me = s.active;
  const actions = legalActions(s);
  if (actions.length === 1) return actions[0];

  const base = evaluate(s, me, w);
  let best: Action | null = null;
  let bestScore = -Infinity;
  for (const a of actions) {
    if (a.type === 'endTurn' || a.type === 'enterBattle') continue;
    const score = evaluate(applyAction(s, a).state, me, w);
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }

  // Mão no limite: é obrigado a jogar ou descartar algo.
  const mustAct = !actions.some((a) => a.type === 'endTurn');
  if (best && (mustAct || bestScore > base + w.minGain)) return best;

  const enterBattle = actions.find((a) => a.type === 'enterBattle');
  if (enterBattle) {
    // Só entra em batalha se existir algum ataque que valha a pena.
    const inBattle = applyAction(s, enterBattle).state;
    const battleBase = evaluate(inBattle, me, w);
    const goodAttack = legalActions(inBattle).some(
      (a) => a.type === 'attack' && evaluate(applyAction(inBattle, a).state, me, w) > battleBase + w.minGain,
    );
    if (goodAttack) return enterBattle;
  }
  return actions.find((a) => a.type === 'endTurn') ?? actions[0];
}

/** Joga uma partida inteira IA × IA. Devolve o estado final e quantas ações foram feitas. */
export function playOut(
  s: GameState,
  weights: [AIWeights, AIWeights] = [DEFAULT_WEIGHTS, DEFAULT_WEIGHTS],
  maxActions = 5000,
  onAction?: (state: GameState, action: Action, next: GameState) => void,
): { state: GameState; actions: number } {
  let state = s;
  let n = 0;
  while (state.phase !== 'over' && n < maxActions) {
    const action = chooseAction(state, weights[state.active]);
    const next = applyAction(state, action).state;
    onAction?.(state, action, next);
    state = next;
    n++;
  }
  return { state, actions: n };
}
