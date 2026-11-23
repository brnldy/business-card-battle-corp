# Validação de UX — rodada 1 (versão 3D)

> 23/11/2026. Checklist de `docs/UX_BENCHMARK.md` (12 card games mais jogados da Steam) aplicado à reformulação em 3D. Método: inspeção heurística + testes automatizados com cliques reais de mouse no navegador (invocar, sacrificar, mirar, atacar, passar o turno, partidas inteiras contra a IA). **Os itens marcados "medir com pessoas" só se fecham com testes de jogadores reais** (sugestão: 5 pessoas, como no benchmark).

## Resultado
| # | Heurística | Situação | O que o jogo faz |
|---|---|---|---|
| 1 MH | Um jeito só de jogar carta | ✅ | Clique na carta → menu de ações (como o Master Duel). Arrastar ainda não existe (desejável no futuro). |
| 2 MH | Sacrifício: brilho, contador, confirmar/cancelar | ✅ (corrigido nesta rodada) | Criaturas possíveis com contorno dourado, marcadas em vermelho, contador "1/2", **CONFIRMAR (Enter)** e CANCELAR (Esc). Antes o último clique já sacrificava. |
| 3 MH | Carta injogável apagada, com motivo | ✅ | Cartas jogáveis com contorno verde; as outras apagadas. Ao passar o mouse, o painel diz o motivo ("custo 2: precisa de 2 criaturas…"). |
| 4 MH | Painel fixo de detalhe | ✅ | Painel à esquerda com a carta completa + estado atual (ATQ/DEF com bônus, travas, efeitos). Vale para mão, mesa, Morto e armadilha virada (o dono vê; o rival vê o verso). |
| 5 MH | Indicador de fase + próxima ação clara | ✅ | Barra no topo: TURNO · DE QUEM · PRINCIPAL → BATALHA → FIM; botões BATALHA e ENCERRAR TURNO. *Medir com pessoas* ("em que fase você está?"). |
| 6 MH | Seta de mira, alvos válidos destacados | ✅ | Seta pontilhada vermelha do atacante ao alvo, seguindo o mouse; alvos válidos em dourado. A IA também mostra a seta antes de atacar. |
| 7 MH | Modo ATQ/DEF sem depender de cor | ✅ | Carta deitada de lado em DEF **e** etiqueta de texto "ATQ $1.985" / "DEF $1.500" sob cada criatura. |
| 8 MH | CAIXA animado | ✅ | Pasta conta até o valor novo (com tique), etiqueta de dano/cura sai de trás da pasta, terminal atualiza as caixas, tela treme proporcional ao dano. |
| 9 MH | Turno da IA com ritmo e registro | ✅ | Pausas, seta antes de cada ataque, cada evento animado e escrito no terminal. *Medir com pessoas* (recontar o turno). |
| 10 MH | Acelerar o turno da IA | ✅ | VELOCIDADE 1× / 2× / 4× (botão no duelo e nas Configurações, fica salvo). Pular animações por completo ainda não existe. |
| 11 MH | Pergunta de resposta de armadilha | — Não se aplica | Pelas regras do GDD as armadilhas disparam sozinhas pela condição. A armadilha é anunciada com "ARMADILHA!" e o nome da carta. |
| 12 MH | Confirmar/desfazer ações irreversíveis | ✅ parcial | Sacrifício agora pede confirmação. Encerrar o turno não pede (como em todas as referências). |
| 13 MH | Primeiro duelo guiado | 🟡 parcial | Dicas contextuais no 1º duelo (jogar carta → custo/sacrifício → batalha → encerrar), uma regra por vez; dá para rever nas Configurações. Falta um tutorial roteirizado com deck fixo. *Medir com pessoas*. |
| 14 MH | Glossário de palavras-chave | 🟡 parcial | A carta completa (legível) mostra nome e texto da habilidade. Falta dica curta por palavra-chave (precisa do texto das regras por carta em `cards.json`). |
| 15 NH | Prévia do resultado | ✅ | Ao mirar: "Nath é destruída · Maçã Inc. perde $400". Se houver armadilha ou moeda, mostra "resultado incerto" (não entrega a armadilha). |
| 16 NH | "Juice" em camadas | ✅ | Arco ao jogar carta, poeira ao bater na mesa, avanço do ataque + impacto + faíscas + tremida + "soco" de câmera, cartas queimando (sacrifício em vermelho, destruição em laranja), moeda 3D, textos que sobem, "FALTOU UM TCHAN!" na Thays, alarme vermelho com CAIXA baixo. |
| 17 NH | Acessibilidade | 🟡 parcial | Tremida da tela pode ser desligada (novo), volumes separados, modo sem depender de cor (etiquetas de texto). Faltam tamanho de texto e alto contraste. |
| 18 NH | Registro da partida | 🟡 parcial | No terminal CRT (últimas linhas). Falta rolar o histórico inteiro. |
| 19 NH | Mão: comprime sem esconder custo, aviso de limite | ✅ | Leque comprime até 10 cartas; selo de CUSTO visível; "MÃO 9/10" no topo e os avisos de limite do GDD. |
| 20 NH | Atalhos de teclado | ✅ | B = batalha, Espaço = encerrar turno, Enter = confirmar, Esc/botão direito = cancelar. |

## Problemas encontrados e corrigidos nesta rodada
1. **Sacrifício sem volta:** o último clique já sacrificava → agora marca/desmarca e pede CONFIRMAR.
2. **Carta da mão "fugindo" do mouse:** ao subir no destaque, a carta saía de baixo do ponteiro e piscava → área de clique fixa por carta.
3. **Mão roubando o clique das criaturas do meio da mesa:** a área de clique da mão cobria a sua fileira de criaturas → em repouso, só a parte visível da carta é clicável.
4. **Cliques logo depois de abrir um menu se perdiam** (botões novos ainda sem posição calculada) → posições recalculadas a cada clique.
5. **Raio do mouse começando atrás da interface** (algumas camadas ficavam inclicáveis) → câmera da interface reposicionada.
6. **Cartas da mesa ilegíveis** (baixa resolução + pouca luz no lado do rival) → resolução do mundo maior, cartas com leve brilho próprio e etiquetas nítidas de ATQ/DEF.

## Próxima rodada (sugestões)
- Teste com 5 pessoas novas: tempo até a 1ª invocação, taxa de sucesso do sacrifício de custo 2, "em que fase você está?", recontar o turno da IA.
- Tutorial roteirizado (deck fixo, IA previsível) para o duelo 1.
- Texto das habilidades em `cards.json` → dicas por palavra-chave.
- Histórico rolável, tamanho de texto, alto contraste, arrastar carta como alternativa.
