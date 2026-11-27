// Texto do relatório da partida (portado do original).
import { cardDef } from './engine.js';
import { money } from './textures.js';

const who = (ctx, p) => (p === ctx.human ? 'Você' : ctx.names[p]);
const nm = (ctx, x) => { if (!x) return '?'; try { return cardDef(ctx.cardOf(x) ?? x).name; } catch { return '?'; } };
const md = (m) => (m === 'ATK' ? 'ataque' : 'defesa');

export function describeEvent(e, ctx) {
  switch (e.type) {
    case 'gameStart': return `${who(ctx, e.firstPlayer)} começa a partida.`;
    case 'turnStart': return `── Turno ${e.turn} / ${e.player === ctx.human ? 'sua vez' : `vez de ${ctx.names[e.player]}`} ──`;
    case 'draw': return e.player === ctx.human ? `Você comprou ${nm(ctx, e.cardId)}.` : `${ctx.names[e.player]} comprou uma carta.`;
    case 'drawSkipped': return e.reason === 'hand_limit' ? `${who(ctx, e.player)}: mão cheia, a compra espera.` : `${who(ctx, e.player)}: deck vazio, sem compra.`;
    case 'summon': return `${who(ctx, e.player)} invocou ${nm(ctx, e.cardId)} em ${md(e.mode)}.`;
    case 'sacrifice': return `${nm(ctx, e.cardId)} foi sacrificado.`;
    case 'modeChange': return `${nm(ctx, e.uid)} passou para ${md(e.mode)}.`;
    case 'effectPlayed': return `${who(ctx, e.player)} usou ${nm(ctx, e.cardId)}${e.target ? ` em ${nm(ctx, e.target)}` : ''}.`;
    case 'trapSet': return `${who(ctx, e.player)} armou uma armadilha.`;
    case 'trapTriggered': return `ARMADILHA! ${nm(ctx, e.cardId)} disparou contra ${nm(ctx, e.against)}.`;
    case 'effectExpired': return `${nm(ctx, e.cardId)} acabou.`;
    case 'phase': return e.phase === 'battle' ? 'Fase de batalha.' : null;
    case 'attack': return `${nm(ctx, e.attacker)} ${e.second ? 'atacou de novo' : 'atacou'} ${e.target ? nm(ctx, e.target) : 'direto o CAIXA'}.`;
    case 'attackRedirected': return `FAKE NEWS! ${nm(ctx, e.by)} desviou o ataque de ${nm(ctx, e.attacker)} para ${nm(ctx, e.to)}.`;
    case 'attackNegated': return `O ataque de ${nm(ctx, e.attacker)} foi anulado por ${nm(ctx, e.by)}.`;
    case 'coin': return `Moeda de ${nm(ctx, e.source)}: ${e.result.toUpperCase()}.`;
    case 'statMod': {
      const t = [];
      if (e.mul !== undefined && e.mul !== 1) t.push(e.mul < 1 ? 'pela metade' : `×${e.mul}`);
      if (e.atk) t.push(`ATQ ${e.atk > 0 ? '+' : ''}${money(e.atk)}`);
      if (e.def) t.push(`DEF ${e.def > 0 ? '+' : ''}${money(e.def)}`);
      return t.length ? `${nm(ctx, e.uid)}: ${t.join(', ')}.` : null;
    }
    case 'combat': return e.defender === null ? null : `${money(e.atk)} contra ${money(e.against)}${e.defenderMode === 'DEF' ? ' de defesa' : ''}.`;
    case 'destroy': return `${nm(ctx, e.cardId)} foi destruído.`;
    case 'toDeck': return `${nm(ctx, e.cardId)} voltou para o deck.`;
    case 'toHand': return `${nm(ctx, e.cardId)} voltou para a mão.`;
    case 'mill': return `${nm(ctx, e.cardId)} saiu do deck direto para o Morto.`;
    case 'discard': return `${who(ctx, e.player)} descartou ${nm(ctx, e.cardId)}.`;
    case 'lock': return `${nm(ctx, e.uid)} não pode atacar por um tempo.`;
    case 'controlChange': return `${nm(ctx, e.uid)} mudou de lado.`;
    case 'frio': return `Frio: ${who(ctx, e.player)} tem ${e.counters} marcador(es).`;
    case 'damage': return `${who(ctx, e.player)} perdeu ${money(e.amount)} (CAIXA ${money(e.caixa)}).`;
    case 'heal': return `${who(ctx, e.player)} ganhou ${money(e.amount)} (CAIXA ${money(e.caixa)}).`;
    case 'gameOver': return e.winner === 'draw' ? 'Fim de jogo: empate.' : `Fim de jogo: ${e.winner === ctx.human ? 'você venceu!' : `${ctx.names[e.winner]} venceu.`}`;
  }
  return null;
}
