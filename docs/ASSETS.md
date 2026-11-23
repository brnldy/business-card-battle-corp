# Assets — o que você entrega e onde colocar

> Atualizado em 19/11/2026. Coloque os arquivos nas pastas abaixo, dentro de **`public/assets/`** (nunca em `dist/`, que é apagada a cada empacotamento). Se um arquivo ainda não existir, o jogo usa um placeholder automático. Por isso a ordem de entrega é livre.

## 1. Cartas — ✅ 18 entregues em 18/11
**Pasta:** `public/assets/cards/full/`

| Regra | Valor |
|---|---|
| Formato | PNG (fundo transparente nos cantos arredondados) |
| Tamanho | **1576 × 2200 px**, todas iguais (o tamanho que você já usa). |
| Nome do arquivo | `BW_0001.png`, `BW_0002.png`… o número é o mesmo do ID `BCB-001`, `BCB-002`… (lista em `docs/CARDS.md`). Próximas cartas: `BW_0019.png` em diante. |
| Arte | Sempre **na mesma posição e tamanho** em todas as cartas. O jogo recorta a arte daí para montar a mini-carta. |
| Valores | Exporte com os valores atuais (ATQ/DEF). Se o balanceamento mudar um número, eu sobreponho na tela; você só reexporta quando quiser. |

Status:
| ID | Carta | PNG |
|---|---|---|
| BCB-001 | Bruno, o Estrondoso | ✅ |
| BCB-002 | Caio Batera | ✅ |
| BCB-003 | Ar Condicionado no Talo | ✅ |
| BCB-004 | Nath, a Redatora | ✅ |
| BCB-005 | Chat GPT | ✅ |
| BCB-006 | 2104 | ✅ |
| BCB-007 | Ralph, o Pai | ✅ |
| BCB-008 | Lucas, o Social Media | ✅ |
| BCB-009 | Roger | ✅ |
| BCB-010 | Tênia do Lucas | ✅ |
| BCB-011 | Siamesas Boreal | ✅ |
| BCB-012 | César Malandro | ✅ |
| BCB-013 | Pão com Requeijão | ✅ |
| BCB-014 | Onde tem Pilha? | ✅ |
| BCB-015 | Café com 8 Colheres de Pó | ✅ |
| BCB-016 | Paulo, o Crente | ✅ |
| BCB-017 | Thays Kiryu | ✅ |
| BCB-018 | Duda Kiryu | ✅ |
| — | 18HRS, Férias, Tiago Matte, Gustavo (o Arte-final) | a criar |

**Mais cartas:** com no máximo 2 cópias por deck, um deck de 40 precisa de **pelo menos 20 cartas diferentes**. Para os decks temáticos das empresas-paródia, o ideal é chegar a 40–60.

### Ajustes nas cartas já entregues (detalhes em `docs/CARDS.md` → "Pendências para o artista")
- **Textos a reimprimir:** Caio, Nath, Ralph, Tênia, Paulo, Thays (o jogo já segue a regra nova).
- **Ícones:** Efeito (Ar Condicionado, Pão, Café), Armadilha (Pilha), TI (Chat GPT), Externo (Tênia, Siamesas).
- **Raridade:** quando decidir Comum / Rara / Lendária de cada carta, um detalhe na moldura indicando isso.

## 2. Mini-carta e verso — ✅ entregues em 19/11 (falta a versão limpa do template de efeito)
**Pasta:** `public/assets/cards/mini/`
| Arquivo | O quê |
|---|---|
| `mini-template.png` ✅ | Mini-carta **em branco** (moldura sem arte e sem texto), como as do protótipo do tabuleiro. Mande também um print marcando onde ficam a arte, o nome, o ATQ e a DEF. |
| `mini-template-marks.png` ✅ | Print com as áreas marcadas (medidas em `src/core/Constants.ts` → `MINI`). |
| `mini-template-effect.png` 🔁 | Reexportar sem as palavras "NOME" e "IMAGEM". (opcional) Variação para Efeito/Armadilha, sem ATQ/DEF. |
| `back.png` ✅ (fica em `cards/full/`) | Verso da carta ("BUSINESS CARD"), mesmo tamanho da carta completa. |

## 3. Fontes — ✅ entregues em 19/11
No jogo: **Apple Garamond** (títulos e valores), **Roboto** (textos menores), **Helvena** (destaque).

⚠️ **Licenças (resolver antes de virar produto):**
- **Apple Garamond:** fonte da Apple/Bitstream de 1991, sem licença para distribuir. Serve para o uso interno; para publicar, troque por uma Garamond livre parecida (ex.: **EB Garamond** ou **Cormorant Garamond**, ambas do Google Fonts).
- **Helvena:** © 2025 Zippie Letras. Confira se a licença que você tem cobre uso em jogo/web (às vezes é só "uso pessoal").
- **Roboto:** livre (licença OFL). ✅

**Pasta:** `public/assets/fonts/`. Os arquivos `.woff2` ou `.ttf` das fontes das cartas e do protótipo: a serifada dos títulos e valores e a sem-serifa dos textos menores. ⚠️ A licença precisa permitir uso em web/jogo. Se forem do Google Fonts, basta me dizer o nome.

## 4. Mesa e interface (etapas 3–4)
**Pastas:** `public/assets/table/` e `public/assets/ui/`
| Arquivo | O quê | Tamanho sugerido |
|---|---|---|
| `table/felt.png` | Textura do feltro da mesa, repetível (tileable) | 1024 × 1024 |
| `table/desk.png` | Madeira/fórmica da mesa em volta do feltro, repetível | 1024 × 1024 |
| `ui/caixa-folder.png` | Pasta de arquivo onde aparece o CAIXA (como no protótipo), sem o número | ~600 × 400 |
| `ui/damage-tag.png` | Etiqueta vermelha de preço do dano, sem o número | ~400 × 220 |
| `ui/button.png` | Botão padrão (ex.: "Encerrar turno"), sem texto. Opcional: versões hover/pressionado | ~480 × 140 |
| `ui/icons/*.svg` | Ícones de tipo (Criatura, Entidade, Efeito, Armadilha), de departamento e de elemento | SVG |
| `ui/coin-heads.png` / `ui/coin-tails.png` | Os dois lados da moeda (Bruno) | 256 × 256 |

## 5. Mundo (etapa 5)
| Pasta / arquivo | O quê |
|---|---|
| `companies/<nome>.png` | Logo de cada empresa-paródia (Moca-Cola, Mentendo…), fundo transparente, ~512 × 512 |
| `table/investor-*.png` | Silhuetas dos investidores-monstro para o fundo escuro (2–4 variações), fundo transparente |

## 6. Áudio (etapa 6) — 🟡 primeiros arquivos em 21/11
**Já no jogo:** `music/BASE_SOUNDTRACK.mp3` (loop do duelo), `sfx/ATTACK_BASIC.mp3` (ataque), `sfx/CARD.mp3` (compra e carta voltando para a mão/deck), `sfx/SUMMON_CARD.mp3` (invocação), `sfx/EFFECT.mp3` (efeito), `sfx/TRAP.mp3` (armadilha preparada ou disparada), `sfx/SACRIFICE.mp3` (sacrifício e descarte), `sfx/CHOSING_CARD.mp3` (clique ao escolher uma carta da mão ou uma criatura sua, antes do menu; desde 22/11), `sfx/YOU_WIN.wav` / `sfx/YOU_LOSE.wav` (vinhetas do fim da partida: a trilha do duelo para e a vinheta toca sozinha; o jogo usa cópias comprimidas `.m4a`). MP3 funciona bem; não precisa converter para .ogg. O volume de cada arquivo é equilibrado no jogo (`AUDIO` em `src/core/Constants.ts`), então não tem problema se vierem com níveis diferentes.

**Pastas:** `public/assets/audio/music/` e `public/assets/audio/sfx/`. Formato **.ogg** (ou .mp3), 44,1 kHz. Música em loop deve emendar sem clique.

| Arquivo | Quando toca |
|---|---|
| `music/menu.ogg` | Menu principal (loop) |
| `music/duel.ogg` | Durante a partida (loop, tenso e baixo) |
| `music/duel-danger.ogg` | Quando o seu CAIXA fica abaixo de $2.000 (loop) |
| `music/victory.ogg` / `music/defeat.ogg` | Tela de resultado (curto) |
| `sfx/card-draw.ogg` | Comprar carta |
| `sfx/card-hover.ogg` | Passar o mouse numa carta (bem sutil) |
| `sfx/card-place.ogg` | Carta batendo na mesa |
| `sfx/sacrifice.ogg` | Sacrifício (papel rasgando?) |
| `sfx/mode-change.ogg` | Virar carta para ATQ/DEF |
| `sfx/attack.ogg` | Investida de ataque |
| `sfx/hit.ogg` | Impacto do combate |
| `sfx/destroy.ogg` | Carta destruída |
| `sfx/cash-loss.ogg` | Perder CAIXA (caixa registradora ao contrário?) |
| `sfx/cash-gain.ogg` | Ganhar CAIXA |
| `sfx/effect-play.ogg` | Usar efeito |
| `sfx/trap.ogg` | Armadilha disparando |
| `sfx/coin-flip.ogg` | Moeda girando e caindo |
| `sfx/turn-start.ogg` | Começo do seu turno |
| `sfx/button.ogg` | Clique de botão |
| `sfx/investor-murmur-*.ogg` | Murmúrios/respiração dos investidores no fundo (2–4 variações) |
