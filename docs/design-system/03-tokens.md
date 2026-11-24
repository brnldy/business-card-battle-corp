# Sprint 3 · Fundamentos e tokens

> 24/11/2026. Objetivo: uma fonte única de verdade para a tipografia, com o logo isolado do resto, sem mudar o visual do jogo.

## O que mudou

- **`remake/src/tokens.css`** é o novo arquivo de tokens, carregado antes de todo o resto (`build.mjs`, no jogo e no laboratório). Ele define:
  - `--f-display`: títulos, números e faces das cartas (Apple Garamond).
  - `--f-ui`: todo o texto de interface.
  - `--f-logo` e `--f-logo-tag`: o logo, fixos e separados dos dois acima.
  - Escala tipográfica `--t-cap`, `--t-sm`, `--t-md`, `--t-lg`, `--t-xl`, `--t-num`.
- **As variáveis antigas viraram apelidos:** `--serif` → `--f-display`, `--sans` → `--f-ui`, `--h-ui` → `--f-ui`, `--h-num` → `--f-display`, `--h-fs-*` → `--t-*`. Os dois overrides do tema Buckshot que forçavam Courier New (`style.css` e `hud.css`) saíram: a fonte da interface agora só se troca em `tokens.css`.
- **Canvas também lê os tokens.** `textures.js` lê `--f-display` e `--f-ui` do CSS em tempo de execução e exporta `SERIF` e `UI` (os antigos `MONO` e `SANS` deixaram de existir). Placas do lobby, crachá do rival, aba das pastas e faces das cartas seguem a mesma fonte da interface HTML.
- **Logo protegido em três lugares:**
  - HTML do menu e da tela de carregamento: `.title-block h1`, `.tag-word`, `.logo-sm` usam `--f-logo` / `--f-logo-tag`.
  - Letreiro 3D do prédio (`street.js`): usa a constante `LOGO`, fixa em `textures.js` e independente dos tokens.
  - Regra escrita no próprio `tokens.css`.

## Diferença visual

Nenhuma, com uma exceção pequena: o crachá "RIVAL" na mesa e a aba das pastas de CAIXA usavam Helvena e passaram a usar a fonte de interface (Courier New nesta sprint, Basis Grotesque na Sprint 4).

## Cores: o que ficou para depois

As cores continuam em dois sistemas paralelos, com valores repetidos no tema Buckshot:

| `style.css` (telas e lobby) | `hud.css` (HUD do duelo) | Valor no tema Buckshot |
|---|---|---|
| `--cream` | `--h-cream`, `--h-mdr` | `#f2b94c` |
| `--paper` | `--h-paper` | `#e4dcc0` |
| `--folder` | `--h-sage` | `#4a442c` |
| `--folder-hi` | `--h-sage-hi` | `#5d5535` |
| `--green` | `--h-go` | `#86d98f` |
| `--red` | `--h-stop` | `#ee3a30` |
| `--panel` | `--h-term` | quase iguais (`0.93` vs `0.94` de opacidade) |

O lobby (`lobby.css`) usa só as variáveis de `style.css` (87 usos, nenhum `--h-*`). A unificação das cores entra na Sprint 6 (componentes), quando cada componente for redesenhado; fazer agora só trocaria nomes sem mudar nada visível.
