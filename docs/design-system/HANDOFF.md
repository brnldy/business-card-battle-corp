# Passagem de bastão: design system e telas do lobby

> Escrito em 27/11/2026 para quem continuar o trabalho em outra sessão. O Git guarda o código e os documentos; este arquivo guarda o que só estava na conversa: as regras do autor, o que foi aprovado, o que foi recusado e o que está pedido e ainda não foi feito.

## Onde está cada coisa

- Branch de trabalho: `design-system/sprints` (já contém a `main` e a `claude/wonderful-dijkstra-s09959`, de onde veio a lógica de campanha, gavetas, Arquivo e Loja).
- Plano em execução: [`docs/UI_LOBBY.md`](../UI_LOBBY.md). É a especificação das telas do lobby (regras R1 a R10 e ordem dos passos).
- Design system: `remake/src/ds/` (`ds.css` peças, `ds-game.css` HUD e janelas, `ds-screens.css` telas, `glass.js` interface curva, `catalog.html` catálogo). Documentos das sprints nesta pasta, índice no [README](README.md).
- Telas do lobby: `remake/src/lobbyui.js`. Regras do jogo: `src/meta/meta.ts` (com testes; não mudar para resolver problema de tela).

## Como rodar e conferir

- `npm test` e `npm run typecheck` na raiz (85 testes).
- `cd remake && node build.mjs --dev` e `node serve.mjs` → `http://localhost:5178/dist/?lobby`. As janelas abrem pelas teclas 1 a 9 (3 = Loja, 1 = Sala de reunião, 4 = Metas, 7 = Treino).
- `cd remake && node build.mjs` gera o arquivo único `BusinessCardBattleCorp_BUCKSHOT.html` na raiz. Conferir nele também: já houve defeito que só aparecia no arquivo único.
- Capturas: Playwright com Chromium e `--use-gl=swiftshader --enable-unsafe-swiftshader`. Conferir em 1280×720, 1440×900 e 1920×1080.
- A fonte Basis Grotesque fica fora do Git (licença a confirmar, ver `04-tipografia.md`). Sem os arquivos em `remake/assets/fonts/`, a interface usa a Helvena. Um build feito com a fonte embutida não deve ser distribuído.

## Regras do autor (valem sempre)

1. Responder em português do Brasil. Verdade e precisão acima de ser útil: dizer o que foi conferido e o que não foi.
2. Entregar em partes e esperar aprovação, tela a tela, sempre com imagem.
3. Defeito visto é defeito corrigido antes de mostrar. O autor quer acabamento perfeito.
4. O logo "BUSINESS CARD Battle Corp." não muda nunca; o original do Figma é intocável.
5. Identidade: papelaria de escritório, tátil e analógica (papel, pasta kraft, tinta, âmbar), desenho chapado, sem exagerar no realismo. Papers, Please e Dispatch servem de referência de acabamento; **não copiar** a interface deles.
6. Títulos em caixa alta em VT323; texto de interface em Basis Grotesque.
7. Usar as peças que existem quando servem; quando não servem, **criar peça nova** e pô-la no sistema. O autor pediu explicitamente mais peças novas e menos reaproveitamento ("saia da zona de conforto").
8. Cada tela é tratada como especial, em sub-etapas.
9. Interface curva (WebGL) é opção nas Configurações, ligada por padrão só em telas 4K.

## Mudança de diretriz (27/11/2026, depois dos pedidos abaixo)

O autor achou o resultado das regras antigas grande demais e sem respiro. Acessibilidade e leitura continuam importantes, mas têm de conviver com margem, espaço vazio e bom visual. O que mudou:

- **Respiro virou regra** (R11 nova) e os pisos baixaram: corpo de 14 a 16 px (era ≥ 16), rótulo ≥ 12 px (era ≥ 13), botão primário de 40 px e secundário de 32 px (era ≥ 44). Ver a tabela de [`UI_LOBBY.md`](../UI_LOBBY.md) e as regras 8 e 9 do [README](README.md).
- **Carta reduzida no produto inteiro**, duelo e site incluídos: foto, título, categorias e ATQ/DEF. O texto completo (habilidades, características, ações adicionais) só aparece no destaque por hover ou clique (R4 e R6).
- Os números novos são ponto de partida escolhido nesta sessão, **sem conferência em tela**. Validar com captura nas três resoluções antes de tratar como definitivos.
- Trabalho que isso gera e ainda não foi feito: desenhar as categorias na carta reduzida (`cardFaceCanvas`), rever as telas já feitas com as regras novas (as medições do passo 0, abaixo, foram feitas contra os pisos antigos) e perguntar ao autor se o custo de sacrifício continua na carta reduzida.

## Estado das telas

| Tela | Estado |
|---|---|
| Menu inicial (cartão de ponto) | Aprovado. Depois da junção ganhou Continuar, Novo jogo e Carregar; essa versão o autor ainda não viu. |
| Lobby 3D (etiquetas discretas, sem barra embaixo) | Feito depois da recusa da primeira versão; sem resposta do autor. |
| Treino (termo de estágio, foto do modelo real) | Aceito depois dos ajustes ("continua com outras telas"). |
| Metas do dia (quadro de cortiça) | Aprovado. |
| Cabeçalho das janelas (abas de pasta + patrimônio em livro-caixa) | Abas feitas em 27/11; o autor ainda não viu. |
| Sala de reunião | Refeita sobre a campanha de 30 batalhas; o autor ainda não comentou. |
| Loja → entrada com envelope e abertura do pacote | Entregue; envelope ajustado em 27/11 (só a aba). |
| Loja → Cartas avulsas (grade + ficha sempre à direita) | Refeita em 27/11 a pedido do autor; ele ainda não viu. |
| Loja → Decks prontos e Visual | Não feitos (desenho escuro antigo). |
| Arquivo, Conquistas, Perfil, Reciclar, Salvar/Carregar | Não feitos (desenho escuro antigo). |

Recusados, para não repetir: a Loja como máquina de vendas (duas tentativas; o autor não entendeu o fluxo e mandou apagar) e um guia de estilo que copiava o Dispatch.

## Pedidos de 27/11/2026: o que foi feito e o que ficou

Feito e conferido em captura (1280×720, 1440×900 e 1920×1080; a tela de cartas também no arquivo único):

1. **Abas no topo da janela** (`.ds-tabs` com a variante `.lb-htabs`) no lugar da etiqueta com o nome do lugar. Loja: Pacotes, Cartas, Decks, Visual. Sala de reunião e Treino: Campanha e Treino (uma leva à outra). Metas: uma aba só. A lista fica em `HTABS`, em `lobbyui.js`.
2. **Cartas avulsas dividida em duas**: grade à esquerda e, à direita, sempre a ficha de uma carta. Passar o mouse ou focar troca a ficha (`scShow`); clicar fixa a carta (`scSel`), para teclado e toque. A faixa antiga ("‹ Loja", etiqueta, filtro) saiu: a navegação foi para as abas e o filtro virou a caixa "Só as que faltam".
3. **Cópias na vitrine**: três casas embaixo de cada carta (`.ds-copies`), cheias conforme o que o jogador tem.
4. **Envelope só com a aba** (sem círculos nem barbante), no palco, na abertura e no catálogo.
5. **Peças novas** em `ds.css` e no catálogo: `.ds-copies` (cópias), `.ds-tag` (etiqueta de preço, é o botão de comprar da vitrine), `.ds-photo` (foto presa por clipe) e `.ds-file` (ficha da carta).

Ficou por fazer ou em aberto:

- **Decks prontos e Visual** continuam no desenho escuro antigo, com a própria faixa "← Loja" e sem as abas novas. Quem clica nas abas Decks ou Visual cai nessa tela antiga.
- Em 1280×720 a grade mostra uma fileira inteira e parte da segunda (rola), e a ficha rola quando a carta tem texto longo.
- O aviso de compra (toast) aparece por cima do canto de baixo da ficha por alguns segundos.
- Nas janelas de aba única (Metas) a aba repete o título. O autor não disse o que entra nas abas das telas que não têm seções; Campanha/Treino foi escolha desta sessão.
- A vista de detalhe em tela cheia (`detail`) segue em uso só na abertura do pacote.
- Economia: o autor não quer mexer agora (item 7 do plano segue em aberto).

## Medições do passo 0 (três telas já feitas)

Sala de reunião, Treino e Metas passam em R1, mas falham em R3 (texto abaixo de 13 px) por causa do zoom da interface: 74% em 1280×720, 83% em 1440×900, 103% em 1920×1080. Também têm de 53 a 69 palavras fora de botões (R2) e os botões "Trocar" e ✕ abaixo de 44 px (R8). O ajuste dessas telas é o passo 6 do plano.

## Armadilhas técnicas já encontradas

- **Zoom:** `ui.js` aplica zoom na raiz da interface (80% a 125%). As telas novas usam a variável `--lb-fix` para não encolher abaixo de 100%. Em elemento com `zoom`, largura e altura em porcentagem já são compensadas pelo navegador: não dividir de novo pelo zoom.
- **Especificidade:** `#lobby button:not([class*="ds-"])` em `lobby.css` estiliza todo botão sem classe `ds-`. Botão novo precisa de classe `ds-…` ou de seletor `#lobby button.classe`. Com `all: unset` num seletor genérico, as regras seguintes precisam ter especificidade maior, senão `display` e `position` somem.
- **Ficha flutuante antiga:** qualquer elemento com `data-card` dentro de uma janela dispara a ficha antiga no hover (`peek`). Nas telas novas ela é desligada por seletor dentro de `peek()`.
- **Constantes de fonte:** `textures.js` exporta `SERIF`, `UI` e `LOGO`. `MONO` e `SANS` não existem mais.
- **Servidor de desenvolvimento:** cai quando o ambiente reinicia; conferir antes de capturar, para não ler captura velha.
