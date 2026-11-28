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


---

## Etapa 3 · HUD inteiro nativo em WebGL (feito em 26/11/2026)

O autor pediu para redesenhar todo o HUD em WebGL. Foi feito assim, em `remake/src/ds/glass.js`:

- **O HTML continua sendo o esqueleto, invisível.** Ele dá posição, cliques, teclado e leitor de tela, e as regras visuais continuam em CSS (`tokens.css`, `ds.css`, `ds-game.css`). O design system segue único: uma peça nova é escrita em HTML e CSS e aparece desenhada em WebGL sem código extra.
- **Tudo o que aparece é desenhado pela placa de vídeo**, num passe final do renderizador do jogo (`gfx.js` → `glass.render`), por cima da cena:
  - caixas, bordas, degradês, contornos e molduras em camadas viram geometria;
  - papel ganha grão, linhas finas e salpico no próprio shader;
  - **texto grande (acima de 18 px na tela) por campo de distância (SDF)**, gerado no processador a partir das fontes do jogo (algoritmo do TinySDF), curvado junto com a geometria;
  - **texto pequeno (até 18 px) em bitmap no tamanho exato da tela**, rasterizado pelo próprio navegador e colocado em pixel inteiro. O campo de distância perde traços finos nesse tamanho (letras com pedaços faltando, testado em 26/11); o bitmap não. A lente move cada letra (na horizontal, letra a letra; na vertical, palavra a palavra), então as linhas acompanham a curva sem a letra ser deformada nem reamostrada;
  - imagens das cartas e ícones vão para um atlas;
  - círculos (pinos, luzes, selos) são desenhados no shader.
- **A lente (barril) é aplicada nos vértices.** A geometria nasce curva; nada é reamostrado.
- **Cliques:** uma transformação projetiva no HTML invisível mantém a área clicável junto do desenho. Teste de 26/11: 5 de 5 pontos em cada botão do HUD.
- **Camadas desenhadas:** pastas de CAIXA, ficha da carta, painel de turno, botões do topo, relatório (com rolagem e recorte), anúncio de turno, pedido de escolha, tira da jogada, avisos, dicas, etiquetas da mesa, números flutuantes e a tela de fim de partida.

### O que o desenho nativo ainda não faz (e o que acontece no lugar)

| Recurso de CSS | No lugar |
|---|---|
| Padrões em `radial-gradient` (furos do formulário contínuo, retícula do papel) | não aparecem |
| `clip-path` (dobra do post-it, ponta da etiqueta, serrilha do recibo) | a forma sai retangular |
| Cantos arredondados que não são círculo | saem retos (o design system quase não usa) |
| `text-shadow` | ignorado |
| Texto em `content` de pseudo-elemento | não aparece |
| Bordas tracejadas ou pontilhadas | saem contínuas e mais claras |
| Rotação | aproximada: cada peça gira em torno do próprio centro (serve para os ângulos pequenos que usamos) |

Quando uma peça nova precisar de um desses recursos, ele é implementado em `glass.js` (regra do autor: o sistema não limita a tela).

### Desempenho

O HUD só é redesenhado quando algo muda (texto, classe, rolagem, mouse, animação CSS em curso). Cada redesenho levou de 10 a 14 ms (13,6 ms na última medição) no ambiente de teste, que não tem placa de vídeo e roda tudo no processador. Em máquina real deve ser menor, mas **não foi medido**. Se pesar, o próximo passo é redesenhar só a peça que mudou, em vez de todas.

### Riscos

- Testado só no Chromium.
- O atlas de glifos e o de imagens têm 2048 × 2048. Muitas fontes ou tamanhos novos podem enchê-lo; hoje ele reinicia quando as fontes terminam de carregar.


---

## Decisão final (27/11/2026): abandonado

O autor pediu uma resposta definitiva: resolver a legibilidade de vez junto com a curvatura, ou desistir e voltar à renderização normal. **Desistimos da curvatura no HUD.**

**Por quê.** Texto pequeno legível depende do que o navegador faz e um desenho próprio não reproduz com segurança: encaixe das letras na grade de pixels (hinting), adaptação à escala da tela (100%, 125%, 150%, zoom) e às fontes do sistema. Nas quatro tentativas (filtro de pixels, foto do HTML em textura, desenho nativo com campo de distância e desenho nativo com bitmap) cada correção abriu outro defeito, e o ambiente de desenvolvimento não tem placa de vídeo nem a tela do autor para conferir. Não havia como garantir o resultado.

**O que ficou.**
- O HUD é renderizado pelo navegador, **sem transformação e sem filtro sobre nenhuma peça com texto**. Verificado em 27/11 no arquivo final, em escala 100% e 125%: zero peças do HUD com filtro ou transformação 3D, e 5 de 5 pontos de clique certos em cada botão.
- As peças continuam a 40 px das bordas, com todo o acabamento do design system (papel, molduras, materiais de escritório).
- O efeito de tubo (grão, linhas, curvatura, aberração) continua **na cena 3D** (`gfx.js`), que não tem texto para ler.
- `remake/src/ds/glass.js` foi removido.

**Regra que fica.** Nenhum efeito visual pode passar por cima de texto do HUD (filtro, transformação 3D, reamostragem). Se um dia a curvatura voltar, ela entra só em formas sem texto (contorno do papel, sombra) ou numa tecnologia em que o navegador continue desenhando o texto.


---

## Retomado como opção (27/11/2026)

O autor abriu a versão curva (commit `cdab543`) num monitor 4K e o resultado foi perfeito: com 4 vezes mais pixels, o texto curvado fica nítido. Nas telas comuns a legibilidade continua sendo o problema descrito acima. Decisão: **a curva vira uma opção**.

- **Configurações → Interface curva**, com "Ligada" e "Desligada". Fica salva no navegador (`hudCurve` em `settings.js`).
- **Padrão automático:** ligada em telas 4K, desligada nas demais. "4K" é medido como `maior lado da tela × devicePixelRatio ≥ 3600` (`isUhd()` em `glass.js`); cobre 4K a 100%, 150% e 200% de escala. O zoom do navegador também conta: 1080p com zoom de 200% é tratado como 4K.
- **Desligada:** o navegador desenha o HUD normalmente, sem transformação nem filtro sobre o texto (a regra da seção anterior continua valendo para esse modo).
- **Ligada:** o HUD é desenhado em WebGL por `glass.js`, como na etapa 3.
- A troca vale na hora, sem recarregar.

Verificado em 27/11 no arquivo final: em 1600 × 900 (escala 1) começa desligada e em 1920 × 1080 com escala 2 (3840 px) começa ligada; o interruptor troca nos dois sentidos, e os cliques acertam todos os botões do HUD nos dois modos.
