# Sprint 6 · Acabamento (como as peças são construídas)

> 24/11/2026, em revisão com o autor. A identidade é a nossa: papelaria de escritório (pasta parda, folha creme, tinta marrom-preta, âmbar). Do Dispatch veio só o **método de acabamento**: construir cada peça em camadas finas. Nada de moldura de monitor, faixas verdes ou layout deles.
> Código: `remake/src/ds/ds.css` (tokens `--ds-tex-*` e `--ds-frame`), `remake/src/ds/glass.js` (vidro curvo), `remake/src/ds/ds-game.css` (ligação com o jogo). Catálogo: `dist/ds.html`.

## 1. O papel nunca é uma cor chapada

Toda superfície de papel é uma pilha de cinco camadas (`--ds-tex-paper`):

1. degradê vertical: mais claro em cima, um tom mais quente embaixo;
2. cunha diagonal mais escura saindo do canto de cima (ângulo de 118°, 14%);
3. canto de baixo à direita levemente escurecido;
4. salpico branco de 1 px, espalhado;
5. linhas horizontais finas (1 px a cada 3 px, 5%).

A folha (`.ds-sheet`) ganha ainda uma retícula quadriculada de 8 px no canto de baixo, que some em direção ao centro.
Variações com a mesma receita: cartão (`--ds-tex-card`, mais claro, sem cunha), papelão (`--ds-tex-kraft`) e tinta (`--ds-tex-ink`, para as faixas escuras).

## 2. A moldura é em camadas, não uma borda

De dentro para fora (`--ds-frame`): traço de 2 px, faixa de 4 px num tom de papelão claro, fio de 1 px, **espessura** de 5 px mais escura só embaixo, e sombra dura deslocada. A peça parece um cartão grosso apoiado na mesa.
Folha dentro de pasta usa `--ds-frame-in` (mesma moldura, sem a sombra longa).

## 3. Detalhes que repetem

- **Faixa de título**: tinta com degradê horizontal e linhas finas, traço embaixo. Âmbar = dinheiro e destaque; vermelha = perda.
- **Tecla**: cápsula âmbar com anel claro e contorno escuro.
- **Medidor**: trilho quase preto, preenchimento âmbar, contorno duplo.
- **Caixa rebaixada** (`.ds-inset`): um tom abaixo do papel, sem borda.
- **Botão principal**: tinta, anel claro, e a espessura embaixo em âmbar.
- Traço e texto são marrom quase preto (`--ds-ink`), nunca preto puro. Sem sombra desfocada.

## 4. Vidro curvo nas margens

As peças presas às bordas da tela (pastas de CAIXA, ficha da carta, painel do turno, botões do topo) passam por **uma única lente de barril da tela inteira** (`glass.js`): cada peça recebe o pedaço da lente correspondente à sua posição, então o canto curva mais e o centro quase nada. Os canais de cor são deslocados com forças ligeiramente diferentes, o que dá a franja vermelha/ciano perto das bordas.
Dois números controlam tudo: `STRENGTH` (curvatura, hoje 2,8% da largura) e `FRINGE` (franja, hoje 2,8%).

Limites conhecidos: perto das bordas o desenho fica alguns pixels deslocado em relação à área clicável, e o custo do filtro no jogo ainda não foi medido.

## 5. Para criar uma tela nova

Monte com `.ds-folder` (janela), `.ds-sheet` + `.ds-bar` (seções), `.ds-rows`, `.ds-deckcard`, `.ds-btn`, `.ds-key`, `.ds-chip`, `.ds-meter`, `.ds-inset`. As texturas e a moldura já vêm junto. Se a peça encostar na margem da tela, chame `glass.attach(elemento)`.
