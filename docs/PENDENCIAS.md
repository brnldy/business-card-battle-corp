# Pendências do autor — checklist

> Atualizado em 19/11/2026. ⚠️ **Coloque os arquivos sempre em `public/assets/`**, nunca em `dist/`: a pasta `dist/` é apagada e recriada toda vez que o jogo é empacotado. Marque `[x]` quando entregar. Nada aqui **trava** a etapa 3: enquanto um arquivo não existir, o jogo usa um placeholder. A ordem abaixo é a de maior ajuda para a próxima etapa.
> Detalhes técnicos de cada arquivo (tamanho, formato) em `docs/ASSETS.md`.

## A. Respostas rápidas (só me dizer no chat)
- [x] **A1. Departamento da Duda Kiryu (BCB-018).** ✅ 19/11: **Atendimento**. O ícone de "carta com brilho" dela vira o ícone oficial do Atendimento.
- [x] **A2. Nome das fontes.** ✅ 19/11: Apple Garamond (títulos e valores), Roboto (textos) e Helvena (destaque).
- [ ] **A3. Raridade de cada carta** (Comum / Rara / Lendária). Pode ser uma lista simples "Bruno = Rara…". Pode esperar até a loja (etapa 5).

## B. Para a etapa 3 (mesa jogável)
- [x] **B1. `cards/mini/mini-template.png`.** ✅ 19/11: mini-carta em branco.
- [x] **B2. Print com as áreas marcadas.** ✅ 19/11 (`mini-template-marks.png`).
- [x] **B3. Arquivos das fontes.** ✅ 19/11. ⚠️ Ver o aviso de licença em `docs/ASSETS.md` §3.
- [x] **B4. Verso da carta (`cards/full/back.png`).** ✅ 19/11.
- [ ] **B5. `cards/mini/mini-template-effect.png`.** 🔁 Quase lá: o arquivo veio com as palavras "NOME" e "IMAGEM" escritas. Reexporte **só a moldura**, sem esses textos, como no `mini-template.png`.

## C. Ajustes nas cartas que você já mandou
Reexporte com **o mesmo nome de arquivo** (ex.: `BW_0002.png`) e substitua na pasta `public/assets/cards/full/`. O jogo já segue a regra nova, então não tem pressa.

**Textos a reimprimir (sugestões; pode reescrever no seu tom):**
- [ ] **C1. Caio Batera (BW_0002):** "Cada ataque do Caio esfria a sala: no início de cada turno do inimigo, ele perde $100 para cada ataque já feito pelo Caio."
- [ ] **C2. Nath, a Redatora (BW_0004):** "Enquanto Bruno, o Estrondoso estiver na mesa, Nath entra em modo de fúria e ganha +$300 de ataque e defesa."
- [ ] **C3. Ralph, o Pai (BW_0007):** "Quando Ralph vence um combate, a diferença descontada do inimigo é dobrada. Não vale para ataque direto."
- [ ] **C4. Tênia do Lucas (BW_0010):** "Ao entrar na mesa, o verme come as 3 cartas do topo do seu baralho."
- [ ] **C5. Paulo, o Crente (BW_0016):** "Quando esta carta está em modo de defesa, as outras cartas do seu campo ganham +$300 de defesa."
- [ ] **C6. Thays Kiryu (BW_0017):** "Quando essa carta é invocada, você pode fazer uma carta da mesa inimiga voltar para a mão dele."

**Ícones a corrigir:**
- [ ] **C7.** Ícone de **Efeito** no lugar do de Criatura: Ar Condicionado (BW_0003), Pão com Requeijão (BW_0013), Café (BW_0015).
- [ ] **C8.** Ícone de **Armadilha**: Onde tem Pilha? (BW_0014).
- [ ] **C9.** Ícone de departamento **TI** (hoje vazio): Chat GPT (BW_0005).
- [ ] **C10.** Ícone de departamento **Externo** (hoje é o de monstro): Tênia (BW_0010), Siamesas (BW_0011).
- [x] **C11.** Ícone de departamento da **Duda** (BW_0018): ✅ já é o do Atendimento, nada a mudar.
- [ ] **C12.** Desenhar os ícones que ainda não existem: Efeito, Armadilha, TI, Externo e os outros departamentos (Atendimento, Mídia, Planejamento, Financeiro). Se puder, mande também em SVG em `ui/icons/`; o jogo usa nos filtros e na tela de zoom.

## D. Cartas novas
Próximos arquivos: `BW_0019.png`, `BW_0020.png`… Para cada carta nova, se o texto puder ter mais de uma leitura, eu te pergunto antes de programar.
- [ ] **D1. 18HRS:** o 2104 ganha +$500 quando ela está na mesa.
- [ ] **D2. FÉRIAS:** citada pelo Ralph.
- [ ] **D3. TIAGO MATTE:** citado pela Thays.
- [ ] **D4. GUSTAVO, O ARTE-FINAL:** citado pelo Café.
- [ ] **D5. Mais cartas para chegar a 20 diferentes:** com as 4 acima, já são 22. É o mínimo para um deck oficial de 40 com até 2 cópias. Para os decks das empresas-paródia, o ideal é chegar a 40–60.

## E. Para a etapa 4 (estética)
- [ ] **E1.** `table/felt.png`: feltro da mesa, repetível, 1024 × 1024.
- [ ] **E2.** `table/desk.png`: madeira/fórmica em volta do feltro, repetível, 1024 × 1024.
- [ ] **E3.** `ui/caixa-folder.png`: a pasta de arquivo do CAIXA, sem o número.
- [ ] **E4.** `ui/damage-tag.png`: a etiqueta vermelha de dano, sem o número.
- [ ] **E5.** `ui/button.png`: botão padrão sem texto (opcional: hover e pressionado).
- [ ] **E6.** `ui/coin-heads.png` e `ui/coin-tails.png`: os dois lados da moeda do Bruno, 256 × 256. *(Pedido de novo em 21/11: ver I3.)*

## I. Animações e peças da mesa (pedidas em 21/11, depois de jogar)
**Formato das animações:** de preferência uma **sequência de PNGs** com fundo transparente (`frame_000.png`, `frame_001.png`…), a 24 quadros por segundo, numa pasta para cada animação em `public/assets/fx/`. Também aceito **GIF**, mas ele tem só 256 cores e transparência de "liga/desliga", então as bordas ficam serrilhadas; se vier em GIF, eu converto. Faça a animação começar e terminar vazia (transparente), para ela "nascer" e "sumir" sozinha.
- [ ] **I1. Ataque** → `fx/attack/`: impacto que aparece **sobre a carta atacada** (ou sobre o CAIXA, no ataque direto). ~600 × 600, 0,5 a 0,8 s.
- [ ] **I2. Dano no CAIXA** → `fx/caixa-damage/`: o que acontece na pasta do CAIXA quando você perde dinheiro (o número "-$950" eu escrevo por cima). ~600 × 400, ~1 s.
- [ ] **I3. Moeda do Bruno** → `ui/coin-heads.png` e `ui/coin-tails.png`: os dois lados (CARA e COROA), 512 × 512, fundo transparente. Eu faço o giro; se quiser desenhar o giro, mande também a sequência em `fx/coin-flip/`.
- [ ] **I4. Tipo escrito na carta:** na linha de tipo da carta completa (onde hoje está "Criatura / Barulho"), escrever **ARMADILHA** ou **MÁGICA**, para quem joga saber o que é sem decorar ícone. Vale para Ar Condicionado (BW_0003), Pão (BW_0013), Pilha (BW_0014) e Café (BW_0015). Combina com os ícones dos itens C7 e C8.
- [ ] **I5. "FALTOU UM TCHAN" (Thays)** → `fx/thays/`: animação que aparece sobre a carta que a Thays manda de volta para a mão do oponente, para ficar claro o que aconteceu. ~600 × 700, ~1 s.
- [ ] **I6. Sacrifício** → `fx/sacrifice/`: sobreposição em cima da carta sacrificada, na proporção da mini-carta (**1079 × 1257**, ou metade: 540 × 628). ~0,8 a 1 s.
- [ ] **I7. Ponta da linha de ataque** → `ui/attack-arrow-tip.png`: a "ponta" que marca onde o ataque acontece. ~128 × 128, fundo transparente, **apontando para a direita** (eu giro na direção do alvo). Se quiser, mande também `ui/attack-arrow-line.png`, um pedaço da linha que eu repito (ex.: 64 × 24).

## K. Menus (22/11)
- [x] **K1.** Tela de definir o nome: `ui/PLAYER_NAME_MENU_BG.png` ✅ no jogo (o nome fica salvo no navegador).
- [x] **K2.** Arte do menu de iniciar: `ui/START_MENU.png` ✅ no jogo. O letreiro da arte é o título; os botões ficam em fileira na rua, embaixo.
- [x] **K3.** Música dos menus `audio/music/MENU_BG.wav` ✅ (o jogo usa uma cópia comprimida, `MENU_BG.m4a`, de 2 MB em vez de 15,5 MB).
- [x] **K4.** Sons `START_BUTTON` (iniciar e confirmar nome), `BATTLE_BUTTON` e `END_TURN_BUTTON` ✅, com volume equilibrado.

## J0. ⚠️ Reformulação 3D (23/11)
A mesa agora é **3D de verdade** (Three.js), gerada por código. Por isso a `table/TABLE.png` e o `TABLE-MARK.png` **não são mais usados** (ficam como referência). Continuam no jogo: cartas, verso, mini-template, fontes, pastas do CAIXA, etiquetas de dano/cura, arte do menu e do contrato, todos os sons.
Novas oportunidades de arte (opcionais): texturas da escrivaninha/mata-borrão, cartazes corporativos, modelo do rival e dos investidores.

## J. Mesa "3D pré-renderizado" — ✅ primeira versão no jogo (22/11)
**Entregue:** `table/TABLE.png` (3840 × 2160) + `TABLE-MARK.png`, e em `ui/` as pastas `HEALTH_PLAYER/ENEMY.png` e as etiquetas `DAMAGE_HEALTH.png` / `HEAL_HEALTH.png` (+ os MARK de referência). Já no jogo:
- as cartas deitam em perspectiva dentro das casas desenhadas na mesa (as posições foram medidas na própria imagem: `src/game/duel/layout.ts`);
- as pastas do CAIXA (com nome e valor) deitam em perspectiva **exatamente dentro do contorno de pasta desenhado na mesa**, e a etiqueta de dano/cura sai de trás dela na mesma perspectiva (22/11);
- detalhe da carta grande no papel da esquerda (passe o mouse no papel para ampliar); relatório no bloco da direita;
- mão do jogador maior (6 visíveis) e mão do inimigo em leque (22/11).

**Ajustes para a próxima versão da arte:**
- [x] **J12.** Imagens de `ui/` com fundo transparente: ✅ reexportadas em 22/11.
- [ ] **J13.** Se a mesa mudar (posição das casas), me avise: as medidas ficam em `layout.ts` e eu meço de novo.
- [ ] **J14. (opcional)** Lugar para os botões BATALHA / ENCERRAR TURNO: hoje ficam à direita, acima da xícara. Se quiser, desenhe um lugar para eles na mesa (ex.: um carimbo, uma campainha de balcão).

*(Os itens abaixo eram o pedido original de referências; ficam como guia para as próximas versões.)*
Câmera **fixa**, como no Buckshot Roulette: a mesa é uma imagem renderizada (ou pintada), e o jogo coloca as cartas deitadas por cima, na mesma perspectiva.

**Passo 1. Referências (mande o que tiver):**
- [ ] **J1. Ângulo de câmera:** 1–2 imagens com a inclinação que você quer (quanto mais deitada, mais dramática, mas as cartas ficam mais difíceis de ler).
- [ ] **J2. A mesa em si:** é mesa de reunião, escrivaninha de escritório, mesa de pôquer? Material (madeira, fórmica, feltro, vidro), desgaste.
- [ ] **J3. Luz:** de onde vem (luminária pendurada, abajur, luz fria de escritório), cor e contraste.
- [ ] **J4. O entorno:** o que aparece em volta e ao fundo (escuridão, investidores, objetos de escritório: grampeador, carimbo, xícara, cinzeiro, papelada).
- [ ] **J5. Cor e acabamento:** a mesa é colorida ou P&B como as cartas? Quer o filtro "PS1" do Buckshot (baixa resolução, pontilhado, granulado)?
- [ ] **J6. Onde ficam as coisas:** se quiser, rabisque por cima do `reference/prototipo-tabuleiro.pdf` ou de um print o que mantém e o que muda (CAIXA, deck, Morto, mão).

**Passo 2. Maquete:** monto a mesa em perspectiva com blocos cinza e as cartas já deitadas, para você aprovar o ângulo jogando.

**Passo 3. Arte final (depois da maquete aprovada), PNG em 3840 × 2160 (mínimo 1920 × 1080), exatamente no enquadramento da maquete:**
- [ ] **J7.** `table/bg-room.png`: fundo (sala, escuridão, investidores).
- [ ] **J8.** `table/table.png`: a mesa com as casas das cartas desenhadas, fundo transparente fora dela.
- [ ] **J9.** `table/table-mask.png`: mesmo enquadramento, fundo preto e cada casa pintada de uma cor chapada (eu mando a lista de cores). É com ela que eu encaixo as cartas no lugar exato.
- [ ] **J10. (opcional)** `table/foreground.png`: objetos que ficam na frente das cartas, nas bordas.
- [ ] **J11. (opcional)** `table/light.png`: só a luz, para eu fazer ela tremer/piscar.

## F. Para a etapa 5 (mundo e loja)
- [ ] **F1.** `companies/<nome>.png`: logo de cada empresa-paródia (Moca-Cola, Bord, Maçã Inc., Globe, Sam&Sung, Florp, Mike, Abidas S.A., Pole Startion, Mentendo, Badflix), fundo transparente, ~512 × 512.
- [ ] **F2.** `table/investor-*.png`: 2 a 4 silhuetas dos investidores-monstro, fundo transparente.

## G. Para a etapa 6 (áudio)
- [ ] **G1. 🟡 Começou em 21/11:** chegaram a trilha base e 6 efeitos (ATTACK_BASIC, CARD, SUMMON_CARD, EFFECT, TRAP, SACRIFICE), já tocando no duelo. A trilha e o ataque estavam ~17 dB mais altos que o resto e foram equilibrados no jogo (`AUDIO` em `src/core/Constants.ts`); os MP3 originais não foram alterados. O CARD está bem mais baixo que os outros (-43 dB): se não for de propósito, dá para subir. Faltam os outros sons. Lista geral: 5 músicas e 16 efeitos sonoros. A lista completa, com o momento em que cada um toca, está em `docs/ASSETS.md` §6.

## H. Decisões de balanceamento em aberto (sem pressa)
- [ ] **H2. 🔴 Sacrifício travando a partida (relatado em 21/11, depois de jogar).** Por várias rodadas não deu para invocar porque não havia criatura na mesa para sacrificar. Ideia do autor: **o custo passa a ser definido por uma faixa de ATQ/DEF**, e as cartas são rebalanceadas por essa régua. Detalhes e proposta em `docs/BALANCE.md` → "Régua de custo".
- [ ] **H1.** Deixar mais fortes as cartas de custo 1–2 (Duda, Ralph, Chat GPT) e o Pão com Requeijão, ou enfraquecer Thays e Bruno. Melhor decidir depois que chegarem as cartas novas. Ver `docs/BALANCE.md`.
