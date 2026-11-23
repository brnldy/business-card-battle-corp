# Estado do projeto

> Atualizado em 23/11/2026. Lido no começo de cada sessão de trabalho.

## Repositório unificado (23/11/2026) — github.com/brnldy/business-card-battle-corp
O projeto passou a viver neste repositório, juntando as duas frentes:
- **Daqui:** motor de regras + IA + simulador + testes (`src/`, `tests/`, `scripts/`), dados (`data/`), documentação (`docs/`), PDFs (`reference/`) e todos os arquivos do autor em resolução cheia (`assets-originais/`).
- **De lá:** o remake visual em three.js (`remake/`), com o visual Buckshot e o HUD em design system. É a cara oficial do jogo.
- **Ponte:** o remake usa o motor oficial (`remake/src/engine.js` e `cards.js` reexportam `src/engine`). Antes da troca, os dois motores foram comparados em 300 partidas (51.890 jogadas) e 10.730 previsões de ataque: nenhuma diferença.
- A previsão de ataque criada lá virou `src/engine/preview.ts`, com testes. As constantes de regra estão em `src/engine/rules.ts`.
- **Áudio:** as trilhas do autor são o padrão. Os efeitos gravados pelo autor tocam onde existe arquivo e os gerados por código preenchem o resto (Configurações → Trilha / Efeitos).
- A versão Phaser e a 3D feita aqui (descritas abaixo) ficaram guardadas num ramo local, `historico-yugioro`, que não sobe para o GitHub. A estética oficial é a do remake.
- Regra de trabalho: tudo que fizermos sobe neste repositório.

### Lobby 3D (23/11/2026)
Entre o menu (a rua) e o duelo agora existe o **lobby**: a recepção da empresa por dentro, em 3D, no clima de escritório decadente, pós-apocalíptico e amaldiçoado. Cada área é um objeto clicável da sala (e também um atalho numérico na barra de baixo):

| Objeto | Área | O que faz |
|---|---|---|
| Porta dupla "Sala de reunião" | Duelo | Entra num duelo valendo, com o deck escolhido |
| Arquivos de aço | Decks e coleção | Montador de deck (até 6 decks), coleção com contador e ficha de cada carta |
| Máquina de benefícios | Loja | Pacotes (com abertura carta a carta), cartas avulsas, decks prontos e visual |
| Mural de cortiça | Metas do dia | 3 metas por dia que pagam mesmo na derrota |
| Prateleira de troféus | Conquistas | 17 conquistas, cada uma com bônus |
| Recepção (monitor de tubo) | Perfil | Nome da empresa, estatísticas, histórico de batalhas e visual (logo e verso das cartas) |
| Estagiário de caixa na cabeça | Treino | Partida contra uma IA que erra; não vale nada |
| Trituradora | Reciclar | Cópias além do limite viram PATRIMÔNIO |
| Quadro de luz | Configurações | A janela de configurações de sempre |

- **Regras e números:** `src/meta/meta.ts` (lógica pura, 16 testes em `tests/meta.test.ts`) e `data/meta.json` (preços, chances do pacote, kit do novato, decks prontos, metas, conquistas, itens de visual). A raridade de cada carta está em `data/cards.json`.
- **Telas:** `remake/src/lobby.js` (sala 3D), `remake/src/lobbyui.js` + `lobby.css` (janelas), `remake/src/cosmetics.js` (5 logos e 5 versos desenhados por código), `remake/src/save.js` (progresso no navegador, chave `bcbc:save`).
- **Economia:** começa com o kit do novato (40 cartas, 14 diferentes) e $3.000. Vitória paga o CAIXA que sobrou; derrota não paga; abandonar conta como derrota.
- **Rivais justos:** o deck do rival é sorteado **só entre as cartas que o jogador já tem**. Sem isso, o kit do novato vencia 11% das partidas contra rivais com as cartas raras; com isso, 59% (simulação de 300 partidas IA × IA).
- **Ficou de fora por decisão do autor:** o ranking em escada das 11 empresas (o rival segue sorteado).
- Para testar direto: `http://localhost:5178/dist/?lobby`.

### Cartas niveladas + carta 19 (23/11/2026)
- O autor reexportou as 18 cartas com valores mais baixos e quase todo custo zerado (só Chat GPT 2, Siamesas 1 e Thays 1). As cartas 13–16 trocaram de número: Paulo 13, Pão 14, Pilha 15, Café 16 (o ID segue o arquivo).
- Carta nova **BCB-019 Filipe, the Bear**: desvia o ataque para outra criatura de quem atacou (2 vezes na partida) e faz dupla com a Nath (+$100 ATQ/DEF para os dois). Detalhes em `docs/CARDS.md`.
- Os testes agora calculam a partir dos valores da carta (`ATK()`/`DEF()` em `tests/helpers.ts`), então rebalancear não quebra os testes. São 56 testes.
- Simulação #3 em `docs/BALANCE.md`: o problema do sacrifício acabou e as cartas ficaram niveladas, mas as partidas dobraram de duração (5% chegam ao limite de 60 turnos).

### Ajustes de 23/11/2026 (depois do primeiro teste no repositório novo)
- **HUD menor:** a interface crescia até 190% em telas grandes. Agora escala entre 80% e 125% conforme a tela, e os painéis, a ficha da carta, o menu de ação, a prévia de combate e as dicas ficaram mais compactos. Em Configurações → Tamanho da interface: Pequena / Média / Grande.
- **Ataques:** conferido no motor e na tela que cada criatura em ATQ ataca 1 vez por turno (a Nath, 2), como no GDD. Nada mudou.
- **Menu em 3D** (`remake/src/street.js`): a sede da Business Card Battle Corp. numa rua em ruínas, com letreiro no telhado, céu com redemoinho e números girando, janelas e postes que piscam, carros abandonados e uma fila de candidatos de terno (modelo Business Man com as animações Walk/Idle). A cada ~4,6 s o primeiro entra pela porta, a fila anda uma vaga e um candidato novo, com outras cores de terno, pele e cabelo, entra no fim, fora do quadro.


## Etapa 1 — Fundação ✅
- [x] Entrevista e plano aprovado
- [x] Repositório git, pastas de assets e referências em `reference/`
- [x] `docs/GDD.md` v0.1 (regras com itens **[CONFIRMAR]**)
- [x] `docs/CARDS.md` v0.1 + `data/cards.json` (18 cartas, habilidades em rascunho)
- [x] `docs/ASSETS.md` (o que entregar e onde)
- [x] Node.js v26.13.1 LTS instalado em `~/.local/node` (não está no PATH do terminal; ver nota abaixo)
- [x] Base Phaser 4 + Vite + TypeScript (estrutura do template `phaser-2d`) com cena de Galeria e testes (`npm test`)
- [x] 18 cartas em PNG em `public/assets/cards/full/BW_00NN.png` (ID BCB-0NN = número do arquivo)
- [x] 12 skills do game-creator em `.claude/skills/` (sem pixel art, 3D, Play.fun e vídeo)
- [x] Revisão do GDD e do CARDS.md com o usuário (GDD v0.2, CARDS v0.2), o que libera a etapa 2

## Etapa 2 — Motor de regras + IA ✅ (18/11/2026)
- [x] Motor puro e determinístico em `src/engine/` (types, rng, setup, stats, engine)
- [x] As 18 cartas implementadas a partir de `data/cards.json`
- [x] IA gulosa em `src/ai/ai.ts` (enxerga moedas e armadilhas ao simular: corrigir junto com os níveis de dificuldade)
- [x] 47 testes (`npm test`): regras gerais, cada carta, IA × IA
- [x] Simulador `npm run simulate -- 4000` → relatório em `docs/BALANCE.md`
- [x] Balanceamento #1: quem começa passa a comprar no 1º turno (51% de vitória). Status das cartas mantidos; sugestões de custo × força ficam em aberto no BALANCE.md
- Pendências que não bloqueiam: cartas 18HRS / Férias / Tiago Matte / Gustavo (o motor já tem os gatilhos), 2+ cartas para fechar 20 diferentes

## Etapa 3 — Duelo jogável com placeholders 🟡 primeira versão jogável (21/11/2026)
- [x] Mini-cartas montadas do template do autor (`src/game/cards/MiniCards.ts`): arte recortada da carta completa, nome, ATQ/DEF atuais (verde = bônus, vermelho = penalidade)
- [x] Mesa `DuelScene`: 5+5 casas por lado, deck, Morto, CAIXA, mão do oponente virada, zoom da carta e detalhes no painel da direita, registro da partida
- [x] Jogar com cliques: invocar em ATQ/DEF, escolher sacrifícios, efeitos com alvo, armadilhas viradas, trocar modo, batalha com escolha de alvo / ataque direto, encerrar turno (Esc ou botão direito cancela)
- [x] Mão com setinha (6 visíveis desde 22/11, revela ao passar o mouse) e os avisos de limite de mão do GDD §7.1
- [x] IA joga o turno dela com pausas; tela de vitória/falência com "Nova partida"
- [x] Fontes do autor (Apple Garamond, Roboto, Helvena) e verso da carta
- [x] Testes: partida completa no navegador sem erros; fluxos de sacrifício, alvo, ataque e Thays conferidos
- [ ] Decks ainda são sorteados (até 3 cópias): montador de deck é etapa 5
- [ ] Animações reais (comprar, invocar, combate, moeda) e estética Buckshot: etapa 4
- QA: `?autoplay=N` faz a IA jogar pelo seu lado nas primeiras N jogadas; `window.__DUEL__` expõe estado e jogadas legais

## Etapa 4 — Estética e animação 🟡 começou (22/11/2026)
- [x] Mesa pré-renderizada do autor como fundo (`TABLE.png`), seguindo o `TABLE-MARK.png`
- [x] Cartas do campo deitadas em perspectiva (Mesh2D + homografia por casa, `src/game/duel/CardMesh.ts`)
- [x] Pastas do CAIXA e etiquetas de dano/cura do autor (fundo branco recortado no jogo)
- [x] Trilha e 6 efeitos sonoros do autor, com volume equilibrado (`AUDIO` em Constants)
- [ ] Animações (compra, invocação, ataque, sacrifício, Thays, moeda): aguardando os GIFs/sequências do autor (PENDENCIAS §I)
- [ ] Filtro de tela (granulado/pontilhado), luz da luminária piscando, investidores ao fundo

## Reformulação 3D (23/11/2026) — Three.js
Decisão do autor: "3D de verdade" e tudo de uma vez. Referências: Buckshot Roulette × Severance (`docs/ART_DIRECTION.md`); UX validada contra os 12 card games mais jogados da Steam (`docs/UX_BENCHMARK.md`, `docs/UX_VALIDATION.md`).
- [x] Motor 3D próprio em `src/three/` (o Phaser saiu): palco com mundo em baixa resolução + filtro de tela (pontilhado PS1, cores reduzidas, granulado, vinheta, aberração, linhas) e camada nítida para a interface
- [x] Escritório gerado por código: escrivaninha de nogueira suja, mata-borrão com as casas impressas, luminária (luz e sombra reais), fluorescente falhando, parede com cartazes ("O CONSELHO ESTÁ SATISFEITO"), terminal CRT estilo MDR (registro + CAIXA), rival em silhueta com placa da empresa, investidores na escuridão, poeira no ar
- [x] Texturas procedurais (madeira, mata-borrão, papel, parede, carpete, metal, placas, moeda) e sons procedurais (zumbido fluorescente, tom de sala, papel, batida, carimbo, clique, moeda, impacto) somados aos arquivos do autor
- [x] Duelo: cartas 3D com arco, poeira, ataque com impacto, queima (sacrifício/destruição), moeda do Bruno em 3D, "FALTOU UM TCHAN!", etiquetas de dano/cura, alarme vermelho com CAIXA ≤ $2.000, câmera que respira e olha para o mouse
- [x] Menu (arte START_MENU), contrato de adesão (tela do nome, arte PLAYER_NAME_MENU_BG), galeria de cartas, configurações (volumes, velocidade, tremida, dicas)
- [x] Validação de UX rodada 1 (6 problemas corrigidos)
- Para testar: `?duel` vai direto à mesa; `?autoplay=N` faz a IA jogar por você; `window.__DUEL__` e `render_game_to_text()` para automação
- A mesa pintada `TABLE.png` e as marcações deixaram de ser usadas (a mesa agora é 3D); continuam no projeto como referência

## Próximas etapas
2. Motor de regras + IA, sem gráficos
3. Duelo jogável com placeholders
4. Estética e animação
5. Meta (empresa, ranking, loja, deck, save)
6. Áudio, acabamento, publicação
7. Online

## Decisões registradas
- ~~Phaser + Vite~~ → three.js + esbuild (remake, 23/11/2026). Motor em TypeScript.
- Motor de regras puro e determinístico em `src/engine/`, sem dependência do Phaser.
- Sem Strudel (licença AGPL). Áudio: arquivos do autor por padrão, sons gerados por código onde não há arquivo.
- As minis são montadas pelo jogo (template em branco + recorte da arte da carta completa).

## Como rodar
- Pelo Claude: servidor `remake-dev` em `.claude/launch.json` → http://localhost:5178/dist/ (rodar `npm run build` antes de mandar a alguém)
- No terminal: `export PATH="$HOME/.local/node/bin:$PATH"` e depois `npm test` / `npm run typecheck` / `npm run dev`
- Versão para mandar a alguém testar: `npm run build` → `BusinessCardBattleCorp_BUCKSHOT.html` na raiz (um HTML só, com tudo dentro; abre com dois cliques, sem instalar nada e sem internet)
