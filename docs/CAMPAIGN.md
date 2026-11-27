# Campanha: calibragem

> Gerado por `node scripts/campaign-sim.ts 40 300` em 2026-11-26. O "jogador" é a IA padrão sem erros.

## Faixas
| Batalhas | Faixa | IA da rival | Deck da rival | Recompensa |
|---|---|---|---|---|
| 1–10 | Varejo de bairro | padrão, erra 22% das jogadas | sorteado entre as cartas que você tem | ×1 |
| 11–20 | Multinacionais | padrão | sorteado entre todas as cartas | ×1.5 |
| 21–29 | Conglomerados | afiada (pesos de SHARP_WEIGHTS) | um dos decks temáticos | ×2 |
| 30 | O CONSELHO (chefe) | afiada | o deck mais forte achado pela busca | ×4 |

## Chance de vitória do jogador (300 partidas por célula)
| Deck do jogador | 1–10 | 11–20 | 21–29 | Chefe |
|---|---|---|---|---|
| kit do novato | 86% | 7% | 2% | 3% |
| deck temático (Criação em fúria) | 92% | 58% | 42% | 29% |

## Deck do chefe
Busca de 40 passos a partir de "Hora Extra". Força contra o painel (decks temáticos + aleatórios, IA padrão): **74%** (o melhor temático faz 66%).

```json
{"BCB-001":3,"BCB-002":3,"BCB-003":3,"BCB-004":2,"BCB-005":2,"BCB-007":3,"BCB-010":3,"BCB-012":2,"BCB-013":2,"BCB-014":2,"BCB-015":3,"BCB-016":3,"BCB-017":3,"BCB-018":3,"BCB-019":3}
```
