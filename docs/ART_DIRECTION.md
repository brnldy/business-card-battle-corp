# Direção de arte — "sujo como Buckshot Roulette, corporativo como Severance"

> 23/11/2026. Resumo da pesquisa e das decisões da reformulação em 3D (Three.js). Fontes no fim.

## O que vem de cada referência
**Buckshot Roulette (Mike Klubnika, Godot)**
- 3D em tempo real, texturas pequenas e "fotográficas", **granulado forte**, pretos esmagados, quase nenhuma luz ambiente.
- **Uma lâmpada dura** sobre a mesa; fora do círculo de luz, escuridão.
- Paleta: cinzas e marrons quentes dessaturados; **cor saturada só no que importa para jogar**.
- **Interface diegética** (dentro da cena): a vida é uma máquina de desfibrilador, os itens saem de uma caixa, textos aparecem em visores LCD/terminal.
- O oponente (o "dealer") é quase só silhueta na borda da luz; as **mãos** entram na luz para agir.
- Câmera em primeira pessoa, sentado, com leve respiração; transições lentas.
- Ritual antes do jogo: **assinar um termo de responsabilidade**.

**Severance (direção de arte de Jeremy Hindle)**
- Corporativo retrô dos anos 60–70 (Saarinen, Bell Labs, Kubrick): paredes off-white, carpete verde, **"azul Lumon"**, fluorescentes no teto.
- Terminal **MDR**: dígitos ciano-claro sobre quase-preto, números que flutuam e "assustam", 5 caixas numeradas (01–05) com % de preenchimento.
- Tipografia: sem-serifa geométrica larga em caixa alta nas placas; monoespaçada no terminal.
- Som: **nada de bipes**, só teclados; tom de sala feito de "respiração"; foley seco; zumbido fluorescente.
- Vermelho "alarme" quando algo dá errado (a luz passa a vir de baixo).

## Decisões para o jogo
| Elemento | Decisão |
|---|---|
| Cenário | Escrivaninha de escritório mid-century (nogueira + mata-borrão verde), **suja**: manchas de café, arranhões, queimado de cigarro. Casas das cartas impressas no mata-borrão. |
| Luz | Luminária de mesa = luz principal dura e quente. Um painel fluorescente **falhando** ao fundo, frio. Escuridão a partir de ~2 m (névoa quase preta). |
| Interface | Diegética quando possível: **terminal CRT** na mesa com o registro da partida e o CAIXA em "caixas" estilo MDR; pastas do CAIXA (arte do autor) na mesa; placas de identificação das empresas. A mão, a carta ampliada e os botões ficam numa camada nítida por cima (legibilidade, ver UX_BENCHMARK). |
| Oponente | Silhueta de executivo do outro lado da mesa, rosto quase invisível; a placa com o nome da empresa rival. |
| Investidores | Vultos parados na escuridão, com alfinetes de gravata/olhos que brilham; respiram. |
| Filtro de tela | Mundo em baixa resolução (720 × 405), **pontilhado ordenado 4 × 4**, ~32 níveis de cor, granulado animado, vinheta, leve aberração cromática, tom âmbar. Câmera com respiração e "olhar em volta" com o mouse. |
| Alarme | CAIXA ≤ $2.000: luz vermelha de emergência vindo de baixo, terminal com números "assustados". |
| Texturas | **Geradas por código** (ruído/FBM): madeira, mata-borrão, papel, carpete, metal, sujeira, em baixa resolução com filtro "duro" (PS1). |
| Sons | Arquivos do autor + **gerados por código**: zumbido fluorescente (120 Hz + harmônicos), tom de sala, papel deslizando, carta batendo, carimbo, clique de tecla, moeda, impacto. |
| Ritual | A tela do nome vira **assinar o contrato** da empresa. |

## Fontes
80.lv (entrevista Buckshot Roulette); godotengine.org (showcase Buckshot Roulette); Wikipedia (Buckshot Roulette); godotshaders.com (shader de pós-processo com grão, CC0); psx-spx.consoledev.net (pontilhado do PS1); avclub.com e filmindependent.org (cenografia de Severance); slashfilm.com (computadores de Severance); blissmontage.substack.com (cores de Severance); fontsinuse.com (tipografia de Severance); mixonline.com (som de Severance); github.com/stegu/webgl-noise (MIT); docs.libretro.com (shaders CRT; evitar crt-geom, GPL).
