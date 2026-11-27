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
| Treino (mesa do estagiário: mata-borrão com crachá e bilhete + ordem de treino) | Refeito do zero em 27/11 para a pasta única; o autor ainda não viu. |
| Metas do dia (quadro de cortiça) | Aprovado. |
| Cabeçalho das janelas (abas + topo de formulário com a cédula) | Refeito em 27/11 depois da escolha do autor; ele ainda não viu a cédula. |
| Campanha (agenda de reuniões + convocação) | Refeita do zero em 27/11 para a pasta única; o autor ainda não viu. |
| Loja → entrada com envelope e abertura do pacote | Entregue; envelope ajustado em 27/11 (só a aba). |
| Loja → Cartas avulsas (grade + ficha sempre à direita) | Refeita em 27/11 a pedido do autor; ele ainda não viu. |
| Loja → Decks prontos e Visual | Feitos em 27/11; o autor ainda não viu. |
| Troféus (era Conquistas), em aba com Metas | Feito em 27/11; o autor ainda não viu. |
| Arquivo, Perfil, Reciclar, Salvar/Carregar | Não feitos (desenho escuro antigo). |

Recusados, para não repetir: a Loja como máquina de vendas (duas tentativas; o autor não entendeu o fluxo e mandou apagar) e um guia de estilo que copiava o Dispatch.

## Estado em 27/11/2026 (fim da sessão)

Decisões do autor nesta rodada: o custo de sacrifício **fica** na carta reduzida; Metas e Troféus viram um par de abas; economia não se mexe agora.

Feito e conferido em captura (1280×720, 1440×900, 1920×1080):

0000. **Campanha e Treino refeitas do zero** (liberdade criativa dada pelo autor). As duas seguem o padrão da Loja: objeto à esquerda, ficha de ação à direita na mesma coluna de 388 px, com o botão principal sempre no mesmo lugar. Campanha: agenda de reuniões presa por espiral (`.ds-agenda`), com duas linhas por faixa e a faixa e o pagamento na margem; fechada = nome a caneta azul riscado com X, próxima = circulada a caneta vermelha, Conselho em vermelho no dia 30; nomes futuros ficam em branco. Ficha: convocação (`.ds-invite`) com faixa, empresa, quanto paga, derrotas contra ela, o deck (`.ds-deckline`, com cartas reduzidas) e o botão. Treino: mata-borrão (`.ds-deskpad`) com o crachá do estagiário (`.ds-badge`) e o bilhete; ficha = ordem de treino com o que não vale. Saíram "Treinar antes" e "Duelo valendo" (repetiam as abas), o resumo de deck antigo (`deckCard`, com arte cheia, contra a R4) e o CSS antigo das duas telas. Enter também inicia o treino (não dispara com foco num botão). Conferido: os estados meio da campanha, chefe e campanha concluída (simulados com `window.__SAVE__`), Enter nas duas telas e Trocar.
000. **Tamanho único das janelas** (pedido do autor: as abas não podem pular ao trocar). As oito janelas novas usam a mesma pasta, até 1180×770 (no máximo 96% × 90% da tela), definida no fim de `ds-screens.css`. Conferido: mesma posição e tamanho da pasta em todas, em 1280×720 e 1920×1080. Campanha e Treino centram as folhas na pasta; o Treino passou a ter a mesma estrutura da Campanha (folha de ação à esquerda na proporção 1,3 : 1, bilhete à direita); Metas estica a cortiça; Pacotes estica palco e prateleiras. **Tela nova com abas tem de usar essa mesma pasta.**
00. **Zoom das janelas** (passo 6 do plano): Campanha, Treino e Metas passaram a usar `--lb-fix` como as outras. Medido nas oito janelas novas em 1280×720, 1440×900 e 1920×1080: menor texto 12 px (13,5 em 1920), menor alvo 34 px (as abas), nada rola nem é cortado. Para caber o Treino em 1280×720: a lista "Esta partida não vale" foi para o lado da foto, e os botões do rodapé (Treino e Campanha) foram de 52 para 44 px.
0. **Cabeçalho das janelas** (decisão do autor: fica dentro da pasta, nada sai para fora; o patrimônio tem de lembrar dinheiro; fechar é ✕). Topo de formulário (`.ds-formhead`, `.ds-formlabel`) com três casas: lugar pequeno + título, patrimônio na cédula (`.ds-cash`, redesenhada em 27/11 porque o autor a achou espichada: nota na proporção de cédula de verdade, cerca de 2,3 : 1, com o **logo da empresa** gravado em verde num medalhão oval, "Patrimônio" impresso na nota como o nome do banco e o valor grande no canto; o rótulo de fora saiu; a nota cresce com o valor e o logo acompanha o Visual) e o ✕. Recusada: o título na aba e o patrimônio num visor preso na borda de cima da pasta. Feito em `head()` do `lobbyui.js`, só nas janelas de `NEW_HEAD`.
1. **Abas no topo da janela** (`.ds-tabs` + `.lb-htabs`, lista em `HTABS` no `lobbyui.js`): Loja (Pacotes, Cartas, Decks, Visual), Campanha e Treino, Metas do dia e Troféus.
2. **Padrão "vitrine com ficha"**, usado em Cartas, Decks, Visual e Troféus: grade à esquerda e uma ficha sempre à direita. Mouse ou foco troca a ficha (`showFile`); clique fixa o item. Cada vista diz o que fica na ficha em `viewer()`.
3. **Cartas avulsas**: cópias na vitrine (`.ds-copies`) e etiqueta de preço que compra (`.ds-price`).
4. **Decks prontos**: três caixas-arquivo no topo (`.ds-boxfile`), as cartas do deck por tipo com a fita `.ds-qty` (×3) e o selo "Nova" nas que o jogador nunca teve. A ficha padrão é a guia de remessa (`.ds-manifest`): composição, o que chega, o valor avulso (uma vez) e a única ação (comprar, guardar grátis, abrir no Arquivo, arquivo cheio ou faltam $).
5. **Visual**: logos (impressos em tinta escura com `logoUrl(id, { ink })`) e versos em grade; a ficha é a prova de gráfica (`.ds-proof`, com marcas de corte e tira de cor) com Usar / Comprar e usar / Em uso.
6. **Troféus** (era Conquistas): placas de mérito (`.ds-plaque`: madeira e latão quando conquistada, contorno tracejado quando não), ficha com o que pede, quanto paga e a data.
7. **Envelope** só com a aba.

Armadilhas desta rodada (não repetir):

- **Nome de classe repetido.** `.ds-tag`, `.dk` (Sala de reunião) e `.tr` (Treino) já existiam; usar o mesmo nome misturou estilos. Antes de criar classe, procurar o nome exato em todos os `.css`. As telas novas usam `sc-`, `rd-` (decks prontos), `lk-` (visual), `tf-` (troféus) e `sv-h` (título de seção da vitrine).
- **Método repetido.** `LobbyUI.show(on)` liga e desliga o lobby inteiro; um método novo com o mesmo nome escondeu o lobby sem erro no console.

Ficou por fazer ou em aberto:

- **Fora das janelas, ainda abaixo de 12 px:** crachá do perfil (`.lb-badge span`, 11 px), "Sair" (`.lb-exit`, 11 px) e etiquetas da sala 3D (`.lb-label span`, 10 px), sem contar o zoom.
- Em 1280×720 as grades rolam (uma fileira e meia de cartas visível).
- A confirmação de compra do deck ainda usa o diálogo antigo (`ui.confirm`).
- Não conferido: placa conquistada com dados reais (vi só marcando a classe à mão) e compra de deck até o fim.
- Arquivo, Perfil, Reciclar e Salvar/Carregar seguem no desenho antigo.

## Medições do passo 0 (três telas já feitas)

> Superado em 27/11: as três telas foram medidas de novo com as regras revisadas e passam (ver "Zoom das janelas" acima). O texto abaixo fica como registro.

Sala de reunião, Treino e Metas passam em R1, mas falham em R3 (texto abaixo de 13 px) por causa do zoom da interface: 74% em 1280×720, 83% em 1440×900, 103% em 1920×1080. Também têm de 53 a 69 palavras fora de botões (R2) e os botões "Trocar" e ✕ abaixo de 44 px (R8). O ajuste dessas telas é o passo 6 do plano.

## Armadilhas técnicas já encontradas

- **Zoom:** `ui.js` aplica zoom na raiz da interface (80% a 125%). As telas novas usam a variável `--lb-fix` para não encolher abaixo de 100%. Em elemento com `zoom`, largura e altura em porcentagem já são compensadas pelo navegador: não dividir de novo pelo zoom.
- **Especificidade:** `#lobby button:not([class*="ds-"])` em `lobby.css` estiliza todo botão sem classe `ds-`. Botão novo precisa de classe `ds-…` ou de seletor `#lobby button.classe`. Com `all: unset` num seletor genérico, as regras seguintes precisam ter especificidade maior, senão `display` e `position` somem.
- **Ficha flutuante antiga:** qualquer elemento com `data-card` dentro de uma janela dispara a ficha antiga no hover (`peek`). Nas telas novas ela é desligada por seletor dentro de `peek()`.
- **Constantes de fonte:** `textures.js` exporta `SERIF`, `UI` e `LOGO`. `MONO` e `SANS` não existem mais.
- **Servidor de desenvolvimento:** cai quando o ambiente reinicia; conferir antes de capturar, para não ler captura velha.
