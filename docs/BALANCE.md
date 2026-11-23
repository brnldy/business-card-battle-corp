# Relatório de balanceamento #2

> 18/11/2026 · 4.000 partidas IA × IA · decks aleatórios de 40 cartas (até 3 cópias, exceção de teste) · regras do GDD v0.2 com a **nova regra do 1º turno**.
> Para repetir: `npm run simulate -- 4000`

## Decisões tomadas
| # | Decisão | Origem |
|---|---|---|
| 1 | Quem começa **compra normalmente**, só não ataca no 1º turno | Relatório #1, sugestão 1 |
| — | Status das cartas **não mudou** (Thays, Bruno, Duda, Ralph, Chat GPT e Pão continuam como estão) | Decisão do autor |
| — | CAIXA continua em $8.000 | Relatório #1, sugestão 4 |

## Como ler
- **Cópias a mais no vencedor:** em média, quantas cópias a mais daquela carta o deck vencedor tinha em relação ao perdedor. **Positivo = a carta ajuda a vencer.** O "±" é a margem de erro: se o número é maior que a margem, o efeito é real.
- **Vitória quando jogada:** % das partidas que o jogador venceu depois de usar a carta. ⚠️ Cartas caras aparecem infladas aqui, porque quem tem criaturas para sacrificar geralmente já está ganhando. Use a primeira coluna para julgar força.
- A IA ainda é simples (gulosa) e enxerga a moeda e as armadilhas ao simular. Parte dos números reflete como ela joga, não só a força da carta.

## Resultado geral
| Medida | Antes (#1) | Agora (#2) | Leitura |
|---|---|---|---|
| Quem começa vence | 44% | **51%** ✅ | Equilibrado |
| Duração | média 13,1 turnos | média 13,3 turnos (mediana 11) | Partidas rápidas e agressivas |
| Partidas no limite de 60 turnos | 0% | 0% | A salvaguarda nunca foi usada |

## Por carta
| Carta | Cópias a mais no vencedor | Jogada em | Vitória quando jogada |
|---|---|---|---|
| BCB-017 Thays Kiryu | **+0,135** ± 0,033 | 4236 | 67% |
| BCB-014 Onde tem Pilha? | **+0,074** ± 0,034 | 4041 | 55% |
| BCB-001 Bruno, o Estrondoso | **+0,059** ± 0,033 | 3478 | 56% |
| BCB-016 Paulo, o Crente | **+0,050** ± 0,032 | 3538 | 55% |
| BCB-015 Café com 8 Colheres | +0,027 ± 0,033 | 4045 | 56% |
| BCB-006 2104 | +0,019 ± 0,033 | 3641 | 53% |
| BCB-002 Caio Batera | +0,016 ± 0,033 | 1568 | 73% |
| BCB-005 Chat GPT | −0,004 ± 0,033 | 824 | 77% |
| BCB-009 Roger | −0,011 ± 0,034 | 3445 | 48% |
| BCB-007 Ralph, o Pai | −0,016 ± 0,033 | 263 | 59% |
| BCB-008 Lucas, o Social Media | −0,016 ± 0,033 | 3205 | 47% |
| BCB-004 Nath, a Redatora | −0,022 ± 0,033 | 2190 | 63% |
| BCB-010 Tênia do Lucas | −0,029 ± 0,033 | 3015 | 48% |
| BCB-012 César Malandro | −0,047 ± 0,034 | 2378 | 41% |
| BCB-003 Ar Condicionado no Talo | −0,050 ± 0,033 | 2301 | 22% |
| BCB-011 Siamesas Boreal | −0,053 ± 0,033 | 1284 | 61% |
| BCB-018 Duda Kiryu | **−0,065** ± 0,034 | 1408 | 64% |
| BCB-013 Pão com Requeijão | **−0,067** ± 0,033 | 7 | — |

## O que os números dizem
1. **O 1º turno ficou equilibrado:** 51% para quem começa, sem deixar as partidas mais longas.
2. **Thays continua a carta mais forte**, ainda mais que antes. Custa 0, tem ATQ $1.985 e tira a melhor criatura do oponente ao entrar.
3. **"Onde tem Pilha?" subiu para 2º lugar.** Com uma carta a mais na mão no início, sobra espaço para baixar armadilhas cedo.
4. **Pagar sacrifício continua não compensando.** Duda é a criatura mais fraca, e Ralph e Chat GPT seguem quase sem uso (263 e 824 vezes em 4.000 partidas).
5. **Pão com Requeijão continua uma carta morta:** 7 usos em 4.000 partidas.
6. **Ar Condicionado ainda atrapalha quem joga:** só compensa num deck com Caio ou com cartas imunes a Frio.

## Pontos em aberto (para quando houver mais cartas)
As sugestões 2 e 3 do relatório #1 continuam valendo e ficam para uma próxima rodada, porque mudar números exige reexportar o PNG da carta:
- **Custo × força:** subir ATQ/DEF de quem custa 1–2 (ex.: Duda para $2.400/$2.400, Ralph e Chat GPT para ~$3.000), ou baixar o ATQ de Thays e Bruno.
- **Pão com Requeijão:** custar só 1 criatura, ou dar $1.500.

Quando chegarem novas cartas, vale rodar a simulação de novo antes de mexer nesses números, porque o equilíbrio pode mudar sozinho.

## Régua de custo (proposta, 21/11) — para decidir
**O problema, jogando:** você fica com cartas de custo 1–2 presas na mão porque a mesa vive vazia. Isso tem três causas que se somam:
1. **Só 1 invocação por turno.** Para invocar uma carta de custo 1, uma criatura sua precisa **sobreviver a um turno inteiro do oponente**. As partidas são agressivas (média de 13 turnos), então isso raramente acontece.
2. **O custo hoje não acompanha a força.** Thays (custo 0, $1.985/$1.500) é quase igual ao Caio (custo 1, $2.000/$1.500), e Paulo (custo 0) tem DEF $2.900, mais que o Ralph (custo 2). Quem paga custo recebe pouco a mais.
3. **Pouca carta de custo 0.** São 8 das 18 cartas, e o deck sorteado mistura tudo.

**Como as cartas ficam numa régua pelo maior valor (ATQ ou DEF):**
| Faixa (maior entre ATQ e DEF) | Custo | Cartas hoje nessa faixa | Custo atual |
|---|---|---|---|
| até $1.600 | 0 | César, Roger, Lucas, Tênia | 0 ✅ |
| $1.601 a $2.400 | 1 | Bruno ($1.800), 2104 ($1.700), Thays ($1.985), Caio, Nath, Duda, **Ralph ($2.400)** | Bruno, 2104 e Thays são 0; Ralph é 2 |
| acima de $2.400 | 2 | Chat GPT ($3.000), Siamesas (DEF $2.500), **Paulo (DEF $2.900)** | Siamesas é 1, Paulo é 0 |

Ou seja: para seguir a régua, ou **sobe o custo** de Bruno, 2104, Thays, Siamesas e Paulo, ou **baixa os números** deles para caber na faixa de custo atual. E o Ralph (custo 2) precisa de mais força para valer 2 sacrifícios (ex.: $2.800).

**Duas ajudas de regra que podem vir junto** (sozinhas ou combinadas):
- **A. Mínimo de custo 0 no deck:** o montador exige, por exemplo, pelo menos 14 criaturas de custo 0 em 40 cartas (como "terrenos" no Magic).
- **B. Invocar custo 0 não gasta a invocação do turno:** dá para baixar uma criatura de custo 0 e, no mesmo turno, sacrificá-la para invocar uma de custo 1. Torna o sacrifício bem mais usado.

**Próximo passo sugerido:** o autor escolhe a régua (as faixas acima ou outras) e uma das ajudas. Eu aplico no motor, rodo 4.000 partidas e mostro quantas vezes um jogador fica com carta presa na mão antes e depois. Os números novos só vão para o PNG das cartas depois que a simulação aprovar.

## Histórico
| Relatório | Variação testada | Quem começa vence | Duração média |
|---|---|---|---|
| #1 | Quem começa não compra nem ataca | 44% | 13,1 turnos |
| #1 | Quem começa compra, mas não ataca | 51,3% | 13,3 turnos |
| #1 | CAIXA inicial $10.000 | 44% | 14,4 turnos |
| **#2** | **Regra oficial: quem começa compra, mas não ataca** | **51,3%** | **13,3 turnos** |
