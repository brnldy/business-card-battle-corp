// Gerador de números aleatórios com semente (mulberry32).
// O estado do gerador fica dentro do GameState: mesma semente + mesmas ações = mesma partida.
import type { Coin, GameState } from './types.ts';

export function random(s: { rng: number }): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function shuffle<T>(s: { rng: number }, arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function flipCoin(s: GameState): Coin {
  if (s.debugCoins && s.debugCoins.length > 0) return s.debugCoins.shift()!;
  return random(s) < 0.5 ? 'cara' : 'coroa';
}
