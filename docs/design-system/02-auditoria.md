# Sprint 2 · Auditoria de telas e de texto

> 24/11/2026. Medição automática (Playwright) do build de desenvolvimento em 1600 × 900, commit `687de48`. Conta só o texto HTML visível (`#ui`); textos desenhados em textura 3D (placas do lobby, faces das cartas) ficam de fora.

## Resultado por tela

| Tela | Caracteres | Palavras | Texto < 14 px | Texto < 18 px | Menor tamanho | Courier New | Apple Garamond |
|---|---:|---:|---:|---:|---:|---:|---:|
| Menu inicial | 187 | 31 | 67% | 67% | 9,5 px | 71% | 28% |
| Como jogar (manual) | 1.172 | 240 | 23% | 86% | 8,5 px | 87% | 12% |
| Contrato (nome da empresa) | 189 | 36 | 49% | 85% | 11,5 px | 85% | 14% |
| Lobby (sala) | 376 | 73 | 64% | 97% | 10 px | 64% | 35% |
| Lobby · Iniciar duelo | 622 | 132 | 45% | 94% | 10 px | 45% | 54% |
| Lobby · Decks e coleção | 814 | 190 | 72% | 96% | 10 px | 72% | 27% |
| Lobby · Loja | 314 | 56 | 58% | 89% | 11 px | 58% | 41% |
| Lobby · Metas | 362 | 76 | 45% | 80% | 11 px | 46% | 53% |
| Lobby · Conquistas | 1.013 | 212 | 59% | 68% | 11 px | 59% | 40% |
| Lobby · Perfil | 284 | 56 | 73% | 74% | 10 px | 74% | 25% |
| Lobby · Treino | 417 | 79 | 29% | 91% | 11 px | 29% | 70% |
| Lobby · Reciclar | 367 | 66 | 50% | 93% | 11 px | 50% | 49% |
| Lobby · Configurações | 654 | 115 | 57% | 96% | 10 px | 77% | 22% |
| Duelo (mesa, sem carta em foco) | 153 | 37 | 70% | 81% | 11 px | 81% | 18% |
| Duelo · ficha da carta em foco | 516 | 107 | 80% | 91% | 11 px | 85% | 14% |

**No total (7.440 caracteres):** 87% do texto está abaixo de 18 px e 53% abaixo de 14 px. A Courier New carrega 66% de todo o texto; a Apple Garamond, 33%.

## O que isso diz

1. **O texto é pequeno demais quase em todo lugar.** As Xbox Accessibility Guidelines pedem no mínimo 18 px a 1080p no PC (26 px no console). Hoje só 13% do texto chega lá. Botões e rótulos ficam entre 10 e 12,5 px, em caixa alta com espaçamento largo.
2. **Quatro telas concentram o excesso de texto:** o manual (1.172 caracteres), Conquistas (1.013), Decks e coleção (814) e Configurações (654). São as primeiras candidatas da Sprint 5 (iconografia e redução de texto).
3. **A ficha da carta em foco é a tela mais densa do duelo:** 516 caracteres, 80% abaixo de 14 px. É onde o jogador mais lê durante a partida.
4. **A Courier New é a voz dominante da interface.** Trocar só ela muda dois terços do texto do jogo sem tocar em títulos, números e cartas.
5. **O duelo em si já é enxuto** (153 caracteres na mesa). O problema do duelo é tamanho e hierarquia, não volume.

## Metas para as próximas sprints

| Meta | Hoje | Alvo |
|---|---|---|
| Texto a partir de 18 px (a 1600 × 900) | 13% | ≥ 80%, com exceção só para rótulos secundários ≥ 14 px |
| Menor tamanho de texto | 8,5 px | 14 px |
| Caracteres no manual | 1.172 | ≤ 500, trocando parágrafos por ícone + uma frase |
| Caracteres em Conquistas | 1.013 | ≤ 500 |
| Caracteres em Decks e coleção | 814 | ≤ 450 |

## Limites desta medição

- Viewport fixa de 1600 × 900; em telas menores os tamanhos em `clamp()` caem ainda mais.
- Texto de canvas e de textura 3D não entra na conta.
- O estado do duelo varia de partida para partida (a IA joga sozinha).
- Não houve teste com jogadores; "excesso de texto" aqui é volume medido, não compreensão.
