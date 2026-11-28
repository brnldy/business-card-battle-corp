# Plano: telas do lobby mais simples, com respiro e uma ação clara

> **Revisão de 27/11/2026 (decisão do autor).** A primeira versão deste plano deixou as telas grandes demais e sem respiro. Mudaram a R3, a R4, a R5, a R6 e a R8, e entrou a R11 (respiro). A R4 e a R6 passaram a valer para o **produto inteiro** (duelo e site incluídos), não só para o lobby. Os números novos da R3, R4, R5, R8 e R11 são valores de partida: ainda **não foram conferidos em tela** e precisam de captura antes de virarem definitivos.

## Contexto

As telas do lobby (`remake/src/lobbyui.js` + `lobby.css`) acumularam texto, contadores e botões pequenos. O autor olha e não sabe o que fazer. A tela de decks ficou aceitável; a Loja não: pacotes com layout torto alinhado à esquerda, cartas avulsas minúsculas (o texto impresso na carta vira ruído e não se sabe onde clicar para comprar) e decks prontos que não mostram as cartas. As duas rodadas de análise anteriores pioraram isso: resolveram 52 achados **acrescentando** informação (rótulos, linhas de aviso, contagens), sem tirar nada.

Este documento é a especificação para o autor levar a **outra sessão** e executar na branch de HUD/UI nova; nada dele é executado aqui. Nada aqui muda regra de jogo: a lógica em `src/meta/meta.ts` (com testes) já está pronta e é reaproveitada como está.

Primeiro passo da execução: salvar este plano no repositório como `docs/UI_LOBBY.md`, para ele viajar junto com a branch.

## 1. Regras gerais (valem para todas as telas)

Estas regras substituem o critério "mostrar tudo". Cada tela deve passar no teste: **em 3 segundos dá para dizer o que é a tela e qual é o botão principal.**

| # | Regra | Número concreto |
|---|---|---|
| R1 | **Uma ação principal por tela.** Um único botão cheio (primário). O resto é secundário ou fica escondido até ser pedido. | 1 primário visível por vista |
| R2 | **Texto mínimo.** Nada de parágrafo explicativo na tela. Explicação vai para um "?" que abre sob demanda. | Máx. 1 frase curta de apoio por vista (≤ 60 caracteres) |
| R3 | **Letra legível sem exagero**, medida já com o zoom da interface aplicado. O piso é o limite de baixo, não o tamanho a usar em tudo: a hierarquia vem de peso, cor e espaço, não de aumentar a letra. | Corpo entre 14 e 16 px reais; rótulo ≥ 12 px reais; nada abaixo disso. Contraste de texto ≥ 4,5:1 (WCAG AA) |
| R4 | **Carta reduzida no produto inteiro.** No jogo e no site, duelo incluído, a carta aparece só na versão reduzida: foto, título, categorias e ATQ/DEF, **sem** o texto de habilidades, características e ações adicionais. Nenhuma tela mostra esse texto embaixo ou ao lado da carta em repouso; ele só aparece no destaque (R6). | Uma única carta reduzida para duelo, Loja, Arquivo, pacote, decks prontos e site. Largura: a menor em que título e ATQ/DEF se leem sem hover (partida: 120 a 150 px reais, a conferir em captura) |
| R5 | **Poucos itens por vez, com espaço entre eles.** Grade com rolagem ou páginas, em vez de tudo espremido. A quantidade por fileira sai da largura da carta (R4) mais o espaço da R11, não de esticar a carta até encher a tela. | Partida: 4 a 6 cartas por fileira, 2 fileiras visíveis; a grade não encosta nas bordas da janela |
| R6 | **Texto completo só no destaque.** Hover ou clique na carta reduzida mostra a carta em destaque com o texto inteiro (habilidades, características, ações adicionais). É o único lugar do produto onde esse texto aparece. O clique e o foco de teclado fazem o mesmo que o hover, para teclado e toque. | Vista de destaque única, reutilizada no duelo, Loja, Arquivo, pacote e site. Texto do destaque no piso de corpo da R3 |
| R7 | **Estado por forma e posição, não por legenda.** Trocar "3/3 +2 · COMUM · COMPLETA" por um selo só. | Máx. 1 selo + 1 número por carta |
| R8 | **Alvos de clique confortáveis, sem botão gigante.** O botão primário se destaca por cor e posição, não por tamanho. | Primário: 40 px de altura real; secundário: 32 px; área clicável nunca abaixo de 32 px (o mínimo da WCAG 2.2 AA é 24 px). Em toque, área clicável ≥ 44 px |
| R9 | **Caixa alta só em rótulos curtos** (≤ 3 palavras). Frases em caixa normal. | — |
| R10 | **Avisos (toasts) com uma linha.** Sem botão dentro, exceto "Desfazer". | — |
| R11 | **Respiro.** Toda janela tem margem interna, os grupos são separados por espaço vazio (não por linha ou caixa) e nada encosta na borda. Espaço vazio é parte do desenho: não se preenche com texto nem se elimina aumentando as peças. | Só a escala de espaço do sistema (`--ds-1` a `--ds-5`: 4, 8, 12, 18, 26 px). Partida: margem interna da janela ≥ 26 px (um degrau maior, perto de 40 px, a criar se a captura pedir); entre grupos ≥ 26 px; entre cartas da grade ≥ 12 px |

**Como as regras se equilibram.** Leitura (R3), alvo de clique (R8) e respiro (R11) valem juntos. Se os três não cabem na mesma vista, a ordem para resolver é: tirar informação (R2, R7), depois rolar ou paginar (R5). Nunca reduzir abaixo dos pisos, nunca tirar a margem e nunca aumentar as peças para ocupar o espaço que sobrou.

Consequência para o zoom (`remake/src/ui.js`, `setScale`): hoje a interface encolhe até 80% em telas menores, o que leva rótulos de 10 px a 8 px. Na UI nova, os tamanhos da R3 são o piso; se não couber, a tela rola ou pagina, não encolhe. O inverso também vale: a compensação do zoom (`--lb-fix`) serve para não cair abaixo do piso, não para ampliar a tela além do que a R3 pede.

## 2. Loja (prioridade 1: refazer inteira)

Estrutura: a Loja vende quatro coisas (pacotes, cartas avulsas, decks prontos e visual). Essas categorias **podem** existir, mas **não precisam ser abas** nem ter o mesmo peso. Proposta: a Loja abre direto no **pacote** (o produto principal, em palco). As outras três entram como "prateleiras": três entradas grandes e ilustradas abaixo ou ao lado do palco, cada uma abrindo a sua vista em tela cheia com um "← Loja" para voltar. Assim a primeira tela da Loja tem um foco só, e ninguém precisa ler quatro rótulos de aba para começar. (Na execução, vale testar a alternativa de uma tela única rolável com as quatro seções; o critério de escolha é o teste dos 3 segundos.)

### 2.1 Pacotes: a compra é a experiência
- **Palco centralizado.** Um envelope grande no meio da tela (não um bloco de texto à esquerda). Embaixo dele, o preço e **um** botão: "Abrir · $ 3.000".
- Tirar da tela: o parágrafo de regras, a linha de porcentagens, o link "faltam N cópias". As chances vão para um "?" pequeno ao lado do envelope.
- Sem dinheiro: o botão vira "Faltam $ X" (desligado) e aparece **uma** ação secundária "Ganhar mais" que leva à sala de reunião. Sai a faixa "Sem verba" com dois botões.
- **Abertura** (o fluxo atual `openPack`/`packFlip`/`packDone` serve de base): envelope rasga → 3 cartas fechadas grandes → cada clique vira uma, com destaque de raridade (brilho azul/âmbar, som próprio já existe) → carta nova ganha o selo "NOVA". Etiqueta embaixo só com o **nome**. Fim: um botão "Guardar". Sai o resumo em texto e o aviso com botão.

### 2.2 Cartas avulsas: vitrine, não planilha
- **Grade de cartas reduzidas** (R4, a mesma carta da mesa do duelo): 4–5 por fileira, com rolagem. Sem o texto de regras impresso, a carta deixa de ser ruído.
- Em cada carta, **só**: a carta reduzida e, embaixo, um botão largo com o preço ("$ 1.500"). Selo "NOVA" no canto de quem o jogador não tem. Carta completa (3/3) fica esmaecida com o selo "Completa" e **sem botão**.
- Sai: nome da raridade por extenso, contagem "2/3", "+2", botão "Triturar", legenda embaixo. A raridade fica só na cor da borda/selo.
- **Filtro único no topo**: "Faltam para mim" (ligado por padrão) / "Todas". Com o padrão ligado, a loja mostra só o que dá para comprar.
- **Hover ou clique na carta** → vista de destaque (R6): carta em destaque à esquerda, texto inteiro legível à direita, "Você tem 1 de 3" e o botão "Comprar · $ 1.500". É aqui que mora a informação que saiu da grade.

### 2.3 Decks prontos: mostrar as cartas
- Um deck por vez em destaque (3 decks → 3 "capas" grandes lado a lado, ou carrossel). Cada capa: nome, 1 frase de estilo e as 3–5 cartas-chave em tamanho legível.
- **Clique na capa** → vista do deck: **todas as 40 cartas** agrupadas (criaturas / efeitos / armadilhas) em cartas reduzidas (R4) com "×3"; as que o jogador vai ganhar marcadas "NOVA". Botão único: "Comprar · $ 9.000" (ou "Guardar lista · grátis" / "Já está no arquivo", estados que `readyDeckPrice` e `readyDeckOwnedIndex` já calculam).
- Sai da lista: a frase "Chegam 12 cópias de 4 cartas (…) · avulsas, sairiam por $ X" e a linha "a lista vai para o Arquivo…". O valor comparado pode aparecer **uma vez**, pequeno, na vista do deck.

### 2.4 Visual
- Mesma grade grande (R5). Item em uso com selo "Em uso"; item à venda com botão de preço. Comprar já veste (comportamento atual). Sem texto de apoio.

## 3. Arquivo (decks e coleção): simplificar o que já funciona

- **Meus decks**: manter as pastas. Em cada pasta, **só**: capa, nome, "40/40" e um selo de estado (Pronto / Incompleto / ★ No duelo). Um botão visível: "Usar no duelo" (ou nada, se já é o ativo). Clicar na pasta abre o editor. "Duplicar" e "Apagar" vão para um menu "⋯". Sai a contagem por tipo e a frase de rodapé.
- **Editor**:
  - Grade com cartas maiores (R4/R5). Clique = põe no deck; clique na linha do deck = tira. Botões −/+ deixam de ser necessários na grade.
  - Em cada carta, só as 3 bolinhas de cópia. Sai "N no deck".
  - Painel do deck: contador grande "37/40", lista de nomes com "×3", e o botão "Completar". Saem: barra de composição, ATQ médio, "pedem sacrifício", ATQ/DEF por linha (vão para um "Detalhes" recolhido).
  - Ferramentas: busca + 1 filtro de tipo. "Ordem" e "Só as que tenho" vão para um menu.
  - Barra do topo: nome do deck e "← Decks". Sai "Salvo sozinho"; "Desfazer" aparece só depois de uma mudança (como hoje).
- **Coleção**: funde com a aba Cartas da Loja? **Não**: fica como álbum (ver cartas grandes, sem preço). Comprar é na Loja; a carta que falta leva até lá com um toque.

## 4. Demais telas

### 4.1 Sala de reunião, Treino e Metas do dia: partir do que a outra sprint já fez

Essas três telas já foram retrabalhadas na sprint de HUD/UI. O resultado dessa sprint **não está neste repositório** (aqui só existem `main` e esta branch), então este plano não propõe layout novo para elas. Na sessão de execução, o primeiro passo é abrir as três telas como estão lá e passar cada uma pelas regras da seção 1. Só entra mudança onde uma regra falhar. Roteiro da revisão:

| Pergunta | Regra | Se falhar |
|---|---|---|
| Em 3 segundos dá para apontar o botão principal (Entrar / Treinar / Resgatar)? | R1 | Rebaixar ou esconder os outros botões |
| Sobrou parágrafo de explicação na tela? | R2 | Cortar para 1 frase; o resto vai para um "?" |
| Menor texto ≥ 13 px e menor botão ≥ 44 px, já com o zoom? | R3, R8 | Subir o tamanho; se não couber, rolar ou paginar |
| A escada da campanha mostra as 30 linhas de uma vez? | R5 | Mostrar só o trecho em volta da batalha atual |
| As metas mostram o botão "Resgatar" quando ainda não dá para resgatar? | R1, R7 | Mostrar só a barra de progresso até ficar disponível |
| Alguma carta aparece em tamanho cheio com o texto impresso? | R4 | Trocar pela carta reduzida |

O que essa sprint acertou (padrões de espaçamento, tamanho de letra, peso de botão) vira a **referência** para as telas das seções 2, 3 e 4.2, para o lobby inteiro ficar coerente.

### 4.2 Telas ainda não retrabalhadas

| Tela | Hoje | Proposta |
|---|---|---|
| **Conquistas** | Lista densa de 17 linhas | Grade de troféus grandes; nome embaixo; descrição ao clicar. |
| **Perfil** | 10 caixas de estatística + histórico em tabela | Ficha com nome, logo e **3 números** (vitórias, aproveitamento, coleção). O resto em "Ver tudo". Histórico: últimas 5 partidas, "ver mais". |
| **Reciclar** | Parágrafo + lista + botão | 1 frase + botão "Triturar tudo · + $ X". Lista só se o jogador abrir. |
| **Salvar / Carregar** | 3 gavetas | Mesma estrutura, letra e botões no piso da R3/R8. |
| **Barra do lobby** | 9 botões com número e nome | Manter; aumentar para o piso da R3. |

## 5. O que reaproveitar (não reescrever)

Regras puras, todas com teste em `tests/meta.test.ts`: `saveDeck`, `duplicateDeck`, `autoFill`, `deckErrors`, `buySingle`, `buyBooster` (`PackCard.count`, `isNew`, `extra`), `buyReadyDeck`, `readyDeckMissing`, `readyDeckPrice`, `readyDeckValue`, `readyDeckOwnedIndex`, `buyCosmetic`, `equipCosmetic`, `recycle`.

Comportamentos de `remake/src/lobbyui.js` a portar para a UI nova (são lógica, não visual): gravação automática do deck + retrato para "Desfazer" (`editDeck`, `snaps`, `deckWrite`); `whyNot` (motivo de não poder pôr a carta); `buyCard` (comprar no editor já põe no deck); trava de clique duplo em compras; fluxo do pacote (`packFlip`/`packNext`/`packSkip`); foco de teclado devolvido após redesenhar; `inert` no que fica atrás da janela.

Carta reduzida (R4): `cardFaceCanvas(cardId)` em `remake/src/textures.js` já desenha a versão da mesa (moldura `img/mini-template.png` / `mini-template-effect.png`, sem o texto de regras) e devolve um canvas. O duelo já usa só essa versão (`cardFaceTexture` em `duel.js`). **Falta nela:** as categorias (`element` e `department` de `data/cards.json`), que hoje não são desenhadas. **Em aberto:** ela desenha os carimbos de custo (sacrifício), que o autor não citou na lista da R4; ficam como estão até ele decidir. Para usar no HTML do lobby, converter uma vez por carta (`toDataURL`) e guardar em cache, como `cardFaceTexture` faz para o 3D. Hoje o lobby usa a arte cheia (`asset(c.art)`) em todo lugar; a troca é nesse ponto.

Componente da ficha: `cardSheet` em `remake/src/hud/components.js` — é a base da vista de detalhe (R6), junto com a arte cheia da carta.

## 6. Ordem de execução sugerida

0. **Revisão das 3 telas já feitas** (Sala de reunião, Treino, Metas) pelo roteiro da seção 4.1, anotando os padrões que viram referência.
1. **Fundação**: tokens de tamanho (R3, R8), componente **carta reduzida** em HTML (R4, a partir de `cardFaceCanvas`) e a **vista de detalhe da carta** (R6). Tudo depende disso.
2. **Loja → entrada** (pacote em palco + prateleiras, sem abas) **e Pacotes** (abertura).
3. **Loja → Cartas avulsas** (maior dor; valida a grade de cartas reduzidas e o detalhe).
4. **Loja → Decks prontos** (capas + vista com as 40 cartas).
5. **Arquivo** (pastas enxutas, editor com cartas reduzidas e painel menor).
6. **Ajustes nas 3 telas já feitas**, só onde a revisão do passo 0 apontou falha.
7. **Conquistas, Perfil, Reciclar, Salvar/Carregar.**
8. Limpeza: remover do `lobby.css`/`lobbyui.js` o que ficou sem uso.

## 7. Decisão pendente (economia, não é UI)

Deck pronto custa $ 9.000 fixos, mas "Hora Extra" entrega a um novato cartas que sairiam por $ 75.000 avulsas. Opções: (a) reduzir o conteúdo dos decks prontos em `data/meta.json`; (b) cobrar pelo que o deck entrega. Decidir antes do passo 4, porque muda o que a vista do deck mostra.

## 8. Como verificar

- `npm test` e `npm run typecheck` na raiz (a lógica não deve mudar; os 85 testes seguem passando).
- `npm run dev` e abrir `http://localhost:5178/dist/?lobby`. Conferir cada tela em 1280×720, 1440×900 e 1920×1080.
- Para cada tela, o teste das regras:
  - **3 segundos**: alguém que nunca viu a tela aponta o botão principal?
  - **R3/R8**: medir no navegador (inspecionar) o menor texto e o menor botão, já com o zoom.
  - **R4**: dá para ler o título e o ATQ/DEF na carta da grade sem passar o mouse? Alguma carta em repouso mostra texto de habilidade? (não pode)
  - **R11**: medir a margem interna da janela e o espaço entre grupos; conferir que nada encosta na borda nas três resoluções.
  - **Contagem de palavras**: nenhuma vista com mais de ~25 palavras fora de botões e nomes de carta.
- Fluxos de ponta a ponta: comprar e abrir um pacote; comprar uma carta que falta e vê-la no Arquivo; ver as 40 cartas de um deck pronto e comprá-lo; criar um deck automático e usá-lo no duelo.
- Capturas de antes/depois de cada tela (o roteiro Playwright usado nesta sessão pode ser recriado: abrir `?lobby`, tecla do número da área, `page.screenshot`).
