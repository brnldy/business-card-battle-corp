# Relatório de balanceamento #3

> 23/11/2026 · 4.000 partidas IA × IA · decks aleatórios de 40 cartas (até 3 cópias, exceção de teste) · **valores nivelados pelo autor** + carta nova **Filipe, the Bear**.
> Para repetir: `npm run simulate -- 4000` (dados brutos em `output/balance.json`).

## O que mudou nas cartas
Quase todo custo de sacrifício virou 0: só Chat GPT (2), Siamesas (1) e Thays (1) ainda pedem sacrifício. ATQ/DEF baixaram em Bruno, Caio, Nath, Chat GPT (DEF), Ralph, Paulo (DEF) e Duda; o 2104 ganhou DEF. Detalhes em `docs/CARDS.md`.

## Resultado geral
| Medida | #2 (18/11) | #3 (agora) | Leitura |
|---|---|---|---|
| Quem começa vence | 51% | **51%** ✅ | Continua equilibrado |
| Duração | média 13,3 turnos (mediana 11) | **média 23,7 (mediana 19)** | Partidas quase 2× mais longas: os ataques ficaram mais fracos que as defesas |
| Partidas no limite de 60 turnos | 0% | **5%** ⚠️ | Algumas partidas travam: ninguém consegue furar a defesa do outro |

## Por carta
| Carta | Cópias a mais no vencedor | Jogada em | Vitória quando jogada |
|---|---|---|---|
| BCB-016 Café com 8 Colheres | **+0,100** ± 0,034 | 5117 | 57% |
| BCB-007 Ralph, o Pai | **+0,098** ± 0,034 | 4706 | 54% |
| BCB-019 Filipe, the Bear | **+0,054** ± 0,034 | 4594 | 55% |
| BCB-002 Caio Batera | +0,038 ± 0,033 | 4724 | 51% |
| BCB-018 Duda Kiryu | +0,027 ± 0,034 | 4723 | 54% |
| BCB-005 Chat GPT | +0,018 ± 0,034 | 2704 | 60% |
| BCB-004 Nath, a Redatora | +0,011 ± 0,034 | 4879 | 53% |
| BCB-003 Ar Condicionado no Talo | +0,009 ± 0,034 | 3436 | 33% |
| BCB-015 Onde tem Pilha? | +0,005 ± 0,034 | 4832 | 51% |
| BCB-008 Lucas, o Social Media | −0,009 ± 0,034 | 3375 | 41% |
| BCB-001 Bruno, o Estrondoso | −0,013 ± 0,034 | 3809 | 47% |
| BCB-006 2104 | −0,019 ± 0,034 | 4665 | 48% |
| BCB-013 Paulo, o Crente | −0,025 ± 0,034 | 4489 | 49% |
| BCB-017 Thays Kiryu | −0,025 ± 0,034 | 4735 | 54% |
| BCB-009 Roger | −0,028 ± 0,034 | 3898 | 41% |
| BCB-012 César Malandro | −0,045 ± 0,034 | 1878 | 33% |
| BCB-014 Pão com Requeijão | −0,049 ± 0,034 | 69 | 61% |
| BCB-010 Tênia do Lucas | **−0,052** ± 0,034 | 2779 | 38% |
| BCB-011 Siamesas Boreal | **−0,095** ± 0,034 | 2677 | 57% |

## O que os números dizem
1. **O problema do sacrifício acabou.** Ralph, Chat GPT e Duda, que quase não eram jogados (263, 824 e 1.408 vezes), agora entram em quase toda partida (4.706, 2.704 e 4.723).
2. **O jogo ficou muito mais nivelado.** Antes a Thays dominava (+0,135); agora quase todas as cartas ficam dentro de ±0,05, ou seja, nenhuma decide a partida sozinha.
3. **As mais fortes agora:** Café (+$600 de ATQ ajuda a furar as defesas, que ficaram relativamente altas) e Ralph (custo 0 e dano dobrado).
4. **Filipe estreou bem** (+0,054): a fake news pune quem ataca com a mesa cheia.
5. **As mais fracas:** Siamesas (a única criatura comum que ainda pede sacrifício), Tênia (come o próprio deck) e Pão com Requeijão (69 usos: continua quase morto).
6. **Partidas mais longas:** com ATQs mais baixos, as defesas seguram mais. 5% das partidas chegam ao limite de 60 turnos.

## Sugestões (nada foi alterado sem você decidir)
- **Siamesas:** custo 1 → 0, como as outras criaturas comuns.
- **Pão com Requeijão:** pedir 1 criatura em vez de 2, ou dar $1.500.
- **Partidas longas:** se nos testes de vocês o jogo parecer arrastado, uma saída é baixar algumas DEFs (Paulo, 2104, Nath) ou subir um pouco os ATQs.

---

# Relatório de balanceamento #2 (histórico)

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
