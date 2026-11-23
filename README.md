# Business Card Battle Corp.

Card game de escritório num fim de mundo corporativo: empresas duelam com cartas de funcionários para não falir diante dos investidores. Roda no navegador, contra a IA, no estilo `BusinessCardBattleCorp_BUCKSHOT.html`: porão de escritório escuro e sujo, luminária industrial balançando, TV de tubo antiga na cabeça do rival.

## Como jogar

Baixe o arquivo `.html` e abra com dois cliques (Chrome ou Edge). Não precisa instalar nada nem de internet.

- Objetivo: zerar o CAIXA do rival antes que ele zere o seu.
- Cartas de contorno verde podem ser jogadas: clique ou arraste para a mesa.
- Passe o mouse em qualquer carta para ler o que ela faz.
- Atalhos: `B` batalha · `Espaço` encerrar turno · `L` relatório · `Esc` cancelar.

Mais detalhes em [`LEIA-ME_REMAKE.txt`](LEIA-ME_REMAKE.txt). Regras completas em [`docs/GDD.md`](docs/GDD.md).

## O lobby

"Iniciar expediente" leva para dentro do prédio: a recepção da empresa, em 3D. Cada objeto da sala é uma área (clique nele ou use os números do teclado):

- **Sala de reunião** (porta dupla): iniciar um duelo valendo.
- **Arquivos:** montar decks e ver a coleção.
- **Máquina de benefícios:** loja de pacotes, cartas avulsas, decks prontos e visual.
- **Mural:** metas do dia. **Troféus:** conquistas.
- **Recepção:** perfil da empresa, com nome, estatísticas, histórico de batalhas, logo e verso das cartas.
- **Estagiário:** treino que não vale nada. **Trituradora:** reciclar cópias repetidas. **Quadro de luz:** configurações.

O progresso fica salvo no navegador. Quem vence leva o CAIXA que sobrou como PATRIMÔNIO, que compra cartas e visual.

## Como o projeto está organizado

```
src/engine/        motor de regras (TypeScript puro, determinístico): a ÚNICA fonte das regras
src/ai/            IA do rival
src/sim/           simulador de partidas IA × IA (balanceamento)
src/meta/          regras do lobby: coleção, decks, loja, pacotes, metas, conquistas, histórico
data/cards.json    as cartas (números, habilidades e raridade); data/companies.json: empresas rivais
data/meta.json     economia do lobby: preços, pacotes, kit inicial, decks prontos, metas, conquistas
tests/             testes do motor, de cada carta e da IA
remake/            o jogo visual: three.js + HUD próprio + áudio, empacotado com esbuild
assets-originais/  arquivos do autor em resolução cheia (cartas, trilhas, efeitos sonoros, UI, fontes)
reference/         PDFs de referência (cartas, protótipo do tabuleiro)
docs/              GDD, cartas, balanceamento, direção de arte, UX, estado do projeto
```

O remake usa o motor oficial através de uma ponte (`remake/src/engine.js` e `remake/src/cards.js`): qualquer regra nova entra em `src/engine/`, ganha teste em `tests/` e aparece no jogo no próximo build.

## Comandos

Precisa de Node.js 22.18 ou mais novo (roda TypeScript direto).

```
npm install                 # na raiz (TypeScript para o typecheck)
cd remake && npm install    # three.js e esbuild
npm test                    # testes do motor
npm run typecheck
npm run simulate -- 4000    # 4.000 partidas IA × IA → relatório em docs/BALANCE.md
npm run build               # gera o HTML na raiz
npm run dev                 # build de desenvolvimento + servidor em http://localhost:5178/dist/
```

Com o servidor de desenvolvimento rodando:
- `?lobby` vai direto ao lobby; `?duel` vai direto à mesa.
- `http://localhost:5178/dist/lab.html` mostra cada componente do HUD isolado, em todas as variantes. O HUD é um design system próprio: componentes em `remake/src/hud/components.js` e estilos e tokens em `remake/src/hud/hud.css`.

Os modelos 3D de terceiros já estão convertidos em `remake/assets/models/`. Para refazer do zero, rode `node tools/fetch-models.mjs` e depois `node tools/pack-models.mjs` (dentro de `remake/`).

## Áudio

- **Trilhas:** por padrão tocam as do autor (`BASE_SOUNDTRACK` no duelo, `MENU_BG` nos menus). Em Configurações → Trilha dá para trocar pela trilha gerada por código.
- **Efeitos:** por padrão tocam os efeitos gravados pelo autor (ataque, invocar, efeito, armadilha, sacrifício, comprar, selecionar, botões, digitação, vitória e derrota). Os momentos sem arquivo usam sons gerados por código. Em Configurações → Efeitos dá para usar só os gerados.
- O volume de cada arquivo é ajustado em `FILE_SFX`, em `remake/src/audio.js`.

## Créditos

- Regras, cartas, motor, IA, arte das cartas, trilhas e efeitos gravados: projeto original do autor.
- Mesa, salas, iluminação, shaders, partículas, HUD, sons de ambiente e a trilha "gerada": feitos por código.
- Modelos 3D em domínio público (CC0):
  - [Poly Haven](https://polyhaven.com): Television 01, Hanging Industrial Lamp, Mounted Fluorescent Lights, Drawer Cabinet, Wall Clock, Vintage Stapler, e Binder Notebook.
  - [Quaternius](https://quaternius.com): Business Man.
