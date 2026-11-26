# Sprint 7 · HUD curvo em WebGL

> 26/11/2026. Primeira etapa feita; em avaliação pelo autor. Código: `remake/src/ds/glass.js`.

## Como funciona

O HUD continua em HTML e CSS: é a fonte única do desenho, dos textos e dos cliques. O design system não foi duplicado.

Para cada peça presa às margens da tela (pastas de CAIXA, ficha da carta, painel de turno, botões do topo):

1. **O HTML fica invisível, no lugar.** Ele recebe os cliques. Uma transformação leva seus quatro cantos aonde a lente manda, para a área clicável acompanhar o desenho.
2. **A peça é fotografada** sempre que muda: o HTML vira uma imagem (SVG com `foreignObject`) e depois uma textura. Cada foto leva cerca de 8 ms na medição de 26/11.
3. **O WebGL desenha a textura numa malha curvada** pela lente da tela inteira (barril), numa camada própria por cima da cena. A placa de vídeo filtra a imagem: a curva é real, sem serrilhado e sem desfoque.

Dois números controlam a lente em `glass.js`: `K` (força; hoje −0,12) e `R0` (raio que fica parado).

## O que este caminho custa

| Ponto | Situação |
|---|---|
| Animações CSS dentro da peça | **Não aparecem.** A foto é estática. Afeta: carimbo de dano da pasta, os três pontinhos de "rival jogando", o botão pulsando. Precisam ser refeitas mudando o HTML a cada quadro (o que gera uma foto por quadro) ou desenhadas direto no WebGL. |
| Passar o mouse e clicar | `:hover` e `:active` não existem numa foto. Viram as classes `.is-hover` e `.is-active`, aplicadas por `glass.js`. Regra nova: estilos de hover precisam ser escritos de um jeito que essa troca alcance. |
| Clique nas bordas | A área clicável é a peça inclinada; o desenho é a peça curvada. A diferença é de poucos pixels dentro da peça. |
| Filtros da cena | Grão, linhas e aberração do filtro do jogo (`gfx.js`) não passam pelo HUD, que está numa camada separada. Para o HUD ganhar o mesmo tratamento, a camada precisa entrar no mesmo pipeline. |
| Desempenho | Um segundo contexto WebGL e uma foto por mudança. Não medido em máquina real: os testes rodam em renderização por software. Números que mudam a cada quadro (contagem do CAIXA) geram uma foto por quadro enquanto durarem. |
| Navegadores | Testado só no Chromium. Safari tem histórico de falhas com `foreignObject` em imagem; precisa de teste. |
| Recursos externos | Uma foto não pode buscar nada de fora: fontes e imagens são embutidas na hora (`inline()` em `glass.js`), com cache. |
| Texturas com filtro SVG | Não desenham dentro da foto. O salpico do papel virou uma imagem gerada uma vez na carga. |

## O que falta

1. Refazer as três animações que sumiram.
2. Levar o HUD para dentro do pipeline de pós-processamento da cena (grão e linhas iguais aos do jogo).
3. Medir desempenho em máquina real e em Safari.
4. Decidir se as peças do centro (avisos, menu da carta, relatório) também entram na lente.
