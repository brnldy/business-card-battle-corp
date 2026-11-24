# Design system da interface

Objetivo: todas as telas do Business Card Battle Corp. falarem a mesma língua visual, com menos texto e mais leitura por objeto, cor e posição.

## Regras que não mudam

1. **O logo é intocável.** A assinatura "BUSINESS CARD Battle Corp." segue a versão original do Figma. Nenhum token, tema ou troca de fonte da interface pode alterá-la. No código, o logo usa os tokens `--f-logo` e `--f-logo-tag`, separados dos tokens da interface (ver `remake/src/tokens.css`).
2. **Apple Garamond fica** para títulos, números e faces das cartas (decisão do autor, 24/11/2026).
3. **Courier New sai da interface.** O texto de interface passa a usar uma sem-serifa: Basis Grotesque Pro (escolha do autor). A licença da Colophon Foundry ainda precisa ser confirmada; até lá os arquivos da fonte ficam fora do Git.

## Sprints

| Sprint | Tema | Documento |
|---|---|---|
| 1 | Estruturação das referências | [01-referencias.md](01-referencias.md) |
| 2 | Auditoria de telas e de texto | [02-auditoria.md](02-auditoria.md) · script: `scripts/design-system/audit-texto.cjs` |
| 3 | Fundamentos e tokens | [03-tokens.md](03-tokens.md) |
| 4 | Tipografia | [04-tipografia.md](04-tipografia.md) |
| 5 | Iconografia e redução de texto | a fazer |
| 6 | Componentes e estados | a fazer |
| 7 | HUD do duelo e diegese | a fazer |
| 8 | Motion e som | a fazer |
| 9 | Acessibilidade e validação com jogadores | a fazer |

Relatório de pesquisa que originou as sprints: benchmarking de interfaces de jogos (fora do repositório, entregue na conversa de 24/11/2026).
