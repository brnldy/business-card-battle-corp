# Implementações futuras

## HUD da partida em WebGL (curva real com texto nítido)

> Anotado em 26/11/2026 a pedido do autor. **Atualização do mesmo dia:** o autor decidiu fazer já, e um teste mostrou um caminho bem mais barato que o descrito abaixo (o HTML continua sendo a fonte e é fotografado para o WebGL). Ver [07-hud-webgl.md](07-hud-webgl.md). O texto abaixo fica como registro da alternativa de redesenhar tudo em canvas, que não foi a escolhida.

**Por que existe.** O autor quer as peças da partida com curvatura real de monitor de tubo. Com a interface em HTML, só há dois jeitos de curvar: inclinar a peça inteira (nítido, mas sem curva por dentro) ou empurrar os pixels com um filtro (curva real, mas com serrilhado, que só some desfocando o texto até ficar ilegível). Testamos os dois em 25 e 26/11. Ficamos com a inclinação (`remake/src/ds/glass.js`). Para ter curva e nitidez juntas, o HUD precisa ser desenhado dentro da cena 3D, onde o filtro de tela do jogo (`gfx.js`) já curva e suaviza tudo de uma vez.

**O que muda.** Hoje o HUD é HTML e CSS por cima do canvas (cerca de 1.500 linhas: `hud/components.js`, `hud/hud.css`, a parte de HUD de `ui.js` e `ds/ds-game.css`). Passaria a ser desenhado em texturas e exibido em planos dentro do three.js.

**Trabalho envolvido**

| Parte | O que é | Peso |
|---|---|---|
| Desenho das peças | Redesenhar em canvas pasta de CAIXA, painel de turno, ficha da carta, botões, relatório, avisos, menu, prévia e etiquetas, com as mesmas texturas e molduras do design system | grande |
| Texto | Quebra de linha, negrito no meio da frase, ícones e números alinhados, tudo feito à mão (o navegador deixa de fazer) | grande |
| Cliques e mouse | Descobrir em que botão o cursor está passando pelo inverso da lente; estados de foco, pressionado e desativado | médio |
| Rolagem e teclado | Rolagem do relatório, navegação por teclado, foco visível | médio |
| Animações | Refazer as transições que hoje são CSS (carimbo, entrada de painel, botão pulsando) | médio |
| Escala e nitidez | Texturas na resolução da tela, inclusive telas de alta densidade e a opção de tamanho da interface | médio |
| Acessibilidade | Leitores de tela deixam de enxergar o HUD; exige uma camada invisível paralela | médio |
| Lobby | As janelas do lobby continuam em HTML (ficam no centro da tela, onde a curva quase não aparece) | fora |

**Estimativa.** Entre 2.000 e 3.000 linhas novas, substituindo cerca de 1.500. É uma reescrita da interface do duelo, não um ajuste: algo como 4 a 6 sessões de trabalho do tamanho das que fizemos na Sprint 6, com risco alto de regressão na jogabilidade. É estimativa de ordem de grandeza, não medida.

**Custos permanentes depois de pronto**
- Cada peça nova do HUD passa a ser desenhada em código de canvas, não em HTML e CSS. Fica mais lento de criar e de ajustar.
- O design system teria duas implementações (CSS para o lobby, canvas para a partida) que precisam andar juntas.

**Alternativas mais baratas a reavaliar antes**
1. Manter a inclinação e aumentar a força da lente só nas peças dos cantos.
2. Curvar só a moldura da peça (o contorno), deixando o texto reto por dentro.
3. A API "HTML in Canvas" do Chrome, ainda experimental em 2026, permitiria usar o HTML atual como textura. Se ela estabilizar, o custo cai para uma fração.

**Como decidir.** Vale a pena se a curvatura for parte central da identidade e o HUD da partida já estiver com o desenho final aprovado. Não vale reescrever antes de o desenho estabilizar.
