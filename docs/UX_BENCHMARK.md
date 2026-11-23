# Benchmark de UX — card games mais jogados da Steam

> Pesquisa de 23/11/2026, para validar a UX do Business Card Battle Corp. Fonte do ranking: média de jogadores simultâneos em outubro/2026 no SteamCharts (a Steam não publica downloads; SteamDB bloqueou acesso automatizado). Jogos com app próprio (Master Duel, MTG Arena, Marvel Snap, Shadowverse) aparecem subestimados na Steam.

## Os 12 jogos
| # | Jogo | Média out/2026 | Tipo |
|---|---|---|---|
| 1 | Slay the Spire 2 (Acesso Antecipado) | 57.044 | Roguelike de construção de deck |
| 2 | Yu-Gi-Oh! Master Duel | 14.013 | Card game colecionável |
| 3 | Magic: The Gathering Arena | 9.362 | Card game colecionável |
| 4 | Balatro | 7.146 | Roguelike (pôquer) |
| 5 | Slay the Spire | 6.553 | Roguelike de construção de deck |
| 6 | Shadowverse: Worlds Beyond | 5.177 | Card game colecionável |
| 7 | The Bazaar | 3.688 | Auto-batalha PvP |
| 8 | Marvel Snap | 2.460 | Card game colecionável |
| 9 | Yu-Gi-Oh! Duel Links | 2.226 | Card game colecionável |
| 10 | Inscryption | 1.164 | Card battler / roguelike |
| 11 | 9 Kings | 955 | Roguelite com cartas |
| 12 | Monster Train 2 | 861 | Roguelike de construção de deck |

Fora de propósito: Tabletop Simulator e TCG Card Shop Simulator (não são duelos de cartas). Hearthstone, Legends of Runeterra e Pokémon TCG Live não estão na Steam.

## Referências mais próximas do nosso jogo
- **Master Duel:** clicar na carta abre botões de ação (Invocar, Baixar, Ativar). No sacrifício (tribute), os monstros possíveis brilham, um aviso diz quantos escolher e há confirmação. Painel lateral fixo com o texto completo da carta. Animações puláveis.
- **Inscryption:** sacrifício direto clicando nas próprias criaturas, com marca visual em cada uma. A vida é uma **balança física** (dano tangível, não só um número). O turno do oponente aparece numa fila visível. Ensina as regras jogando (narrador).
- **Slay the Spire:** mão em leque, carta sobe ao passar o mouse, seta curva até o alvo, cartas sem custo pagável ficam apagadas, botão grande de encerrar turno, "intenção" do inimigo com o número exato do dano.
- **Balatro:** a referência de "juice": contagem sequencial, tom subindo, tremida; controle de velocidade, opção de desligar tremida e efeito CRT.
- **MTG Arena:** atalhos de teclado (Espaço passa), ampliar com botão direito, setas de ataque e bloqueio.

## Checklist de validação (MH = obrigatório, NH = desejável)
| # | Heurística | Referências | Como testar |
|---|---|---|---|
| 1 MH | Um jeito só de jogar uma carta (clique → comando; arrastar como alternativa) | Master Duel; StS, Snap | 5 jogadores novos: contar erros e hesitações nas 3 primeiras invocações |
| 2 MH | Sacrifício: criaturas possíveis brilham, contador "1/2", confirmar e cancelar | Master Duel, Inscryption | Tarefa "invoque uma carta de custo 2": taxa de sucesso, tempo, conseguir cancelar no meio |
| 3 MH | Carta que não dá para jogar aparece desativada, com o motivo ao passar o mouse | StS, Inscryption, MTGA | O motivo aparece em menos de 1 s? |
| 4 MH | Qualquer carta (mão, mesa, inimigo) mostra versão ampliada + texto num painel fixo | Master Duel, MTGA, StS | Conferir todas as áreas, inclusive viradas (dono vê; oponente só o verso) |
| 5 MH | Indicador claro de fase (Principal → Batalha → Fim) e um botão óbvio para a próxima ação | Master Duel, MTGA, StS | Perguntar no meio do turno "em que fase você está?"; meta ≥ 90% |
| 6 MH | Seta do atacante ao alvo; alvos válidos destacados, inválidos apagados | StS, SVWB, MTGA | O alvo válido aparece em todos os quadros? |
| 7 MH | Modo ATQ/DEF visível na hora (rotação + ícone/rótulo, não só cor) | Master Duel, Duel Links | Teste em escala de cinza |
| 8 MH | CAIXA animado: conta subindo/descendo, delta flutuante, cor de dano/cura | Master Duel, StS, Inscryption | Vídeo: o delta é legível em 1×? |
| 9 MH | Turno da IA com ritmo: destacar cada ação, pausa de 0,5–1 s, registrar no log | Master Duel, Snap, Inscryption | Depois do turno da IA, o jogador consegue recontar o que aconteceu? |
| 10 MH | Acelerar/pular o turno da IA e animações (1×/2×/instantâneo) | Master Duel, Balatro, Monster Train 2 | Cronometrar; nada ilegível em 2× |
| 11 MH | Pergunta de resposta de armadilha (Sim/Não com tempo) + opção de pular sempre | Master Duel, MTGA | Contar perguntas por partida (< 1 por turno em média) |
| 12 MH | Confirmar/desfazer ações irreversíveis (sacrifício, sair da batalha) | Master Duel, Snap | Errar de propósito: dá para voltar? |
| 13 MH | Primeiro duelo guiado, uma regra por vez (invocar → sacrificar → batalhar → armadilha) | Snap, Inscryption, Duel Links | Jogador novo termina o duelo 1 sem ajuda? |
| 14 MH | Glossário de palavras-chave ao passar o mouse | StS, MTGA, Snap | Toda palavra-chave tem dica |
| 15 NH | Prévia do resultado ("esse ataque destrói sua carta", dano previsto) | StS, Monster Train 2 | Ao mirar, o resultado aparece? |
| 16 NH | "Juice" em camadas: pausa no impacto, tremida ajustável, tom subindo, partículas | Balatro, StS, SVWB | A/B de diversão percebida (1–5) |
| 17 NH | Acessibilidade: tremida/movimento, tamanho de texto, sinais além da cor, alto contraste | Balatro, StS2 | Simulador de daltonismo + texto 200% + sem movimento |
| 18 NH | Registro da partida rolável | Master Duel, MTGA | Depois de um turno confuso, o jogador acha a causa no log? |
| 19 NH | Mão: ordenar, leque que comprime sem esconder o custo, aviso de mão cheia | Balatro, StS | Com 10 cartas, todos os custos visíveis? |
| 20 NH | Atalhos de teclado (Espaço = próxima fase, Esc = cancelar) | MTGA, StS2 | Dá para jogar um turno inteiro pelo teclado? |

*Inferências da pesquisa:* a tela de tributo do Master Duel foi descrita de memória (sem fonte passo a passo); os números de ritmo (0,5–1 s, < 1 pergunta por turno) são metas recomendadas, não publicadas pelos jogos.

## Fontes
steamcharts.com (apps 2868840, 1449850, 2141910, 2379780, 646570, 2584990, 1617400, 1997040, 601510, 1092790, 2784470, 2742830, 1284410); wasdland.com/games/card-game; pcgamer.com (StS2 early access); gamesradar.com (StS2 modo teclado); us-support.konami.com (Master Duel); ygorganization.com (Master Duel, atualização de maio); draftsim.com/mtg-arena-settings; feedback.wizards.com (MTGA, controle total); familygamingdatabase.com (acessibilidade do Balatro); steamcommunity.com (discussão do Balatro); game8.co e mobalytics.gg (Shadowverse WB); gamespot.com e progameguides.com (Inscryption).
