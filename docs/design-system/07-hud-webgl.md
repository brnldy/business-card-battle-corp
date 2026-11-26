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

---

## Etapa 2 · HUD nativo (decisão do autor em 26/11/2026)

O autor pediu o caminho completo, não o atalho. A etapa 1 (fotografar o HTML) fica como **ponte**: mantém o jogo funcionando enquanto cada peça é refeita de forma nativa. Ela não é o destino, porque a foto é reamostrada ao curvar e o texto pequeno amolece.

### Arquitetura alvo

| Parte | Como fica |
|---|---|
| Onde desenha | Num passe final do **mesmo renderizador do jogo** (`gfx.js`), depois das cartas, em coordenadas de tela. Sem segunda camada. |
| Lente | Aplicada nos **vértices** (no fim do shader de vértice, em espaço de tela). Nada é reamostrado: a geometria já nasce curva. |
| Texto | Por **campo de distância (MSDF)**, com atlas das fontes gerado no build. Fica nítido em qualquer tamanho, escala e curvatura. |
| Painéis | Molduras e texturas do design system desenhadas por shader ou em texturas geradas uma vez (moldura em 9 fatias). |
| Layout | Um módulo pequeno de caixas e linhas, que lê os mesmos tokens (`tokens.css`, `ds.css`). |
| Cliques | Pelo inverso da lente: o ponto do cursor é "desentortado" e testado contra as caixas. |
| Animação | Por quadro, no próprio passe (carimbo, pulsar, contagem), sem custo de foto. |
| Filtros | Grão, linhas e franja de cor no mesmo shader do passe, iguais aos da cena. |
| Acessibilidade | Camada HTML invisível com os mesmos botões, para teclado e leitor de tela. |

### O que já foi verificado (26/11/2026)

- **Passe final com lente nos vértices: funciona.** Um plano desenhado no renderizador do jogo, por cima da cena, saiu curvado e nítido.
- **Texto por campo de distância com a biblioteca `troika-three-text`: travou o navegador** no ambiente de teste, que não tem placa de vídeo (renderização por software). Não sei se trava em máquina real. Por isso o plano é gerar o atlas MSDF no build, sem depender de geração em tempo de execução. A biblioteca foi removida do projeto.

### Ordem de entrega (uma peça por vez, com a ponte como reserva)

1. Infraestrutura: passe final, lente, atlas MSDF das duas fontes, desenho de texto, teste de clique.
2. Pasta de CAIXA (a peça mais simples; inclui a contagem e o carimbo de dano animados).
3. Painel de turno (botões, estados, tecla).
4. Ficha da carta (texto longo com quebra de linha e negrito).
5. Botões do topo.
6. Avisos, tira da jogada, anúncio de turno, etiquetas da mesa.
7. Menu da carta, prévia de ataque, relatório (rolagem), fim de partida.
8. Remover a ponte e a camada extra.

**Tamanho estimado:** continua sendo o de `FUTURO.md` (2.000 a 3.000 linhas, 4 a 6 sessões). É ordem de grandeza, não medida.

**Risco principal:** o design system passa a ter duas implementações (CSS para o lobby, nativa para a partida). Para não divergirem, os valores vêm sempre dos mesmos tokens e cada peça nativa é comparada com a versão CSS no catálogo.
