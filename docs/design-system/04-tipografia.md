# Sprint 4 · Tipografia

> 24/11/2026. Aprovada pelo autor.

## Decisão

| Papel | Fonte | Token |
|---|---|---|
| Interface (botões, rótulos, texto corrido, placas do lobby) | **Basis Grotesque Pro** (Colophon Foundry), com Helvena como reserva | `--f-ui` |
| Títulos, números, faces das cartas | Apple Garamond (sem mudança) | `--f-display` |
| Logo "BUSINESS CARD Battle Corp." | Sem mudança (intocável) | `--f-logo`, `--f-logo-tag` e `LOGO` no canvas |

A Courier New saiu de toda a interface. Ela só continua na etiqueta "Battle" do logo, que é intocável.

## Licença da Basis Grotesque

- É uma fonte comercial da Colophon Foundry. Os arquivos que temos trazem a marcação "wf-rip" nos metadados, que costuma indicar fonte extraída de um site.
- Por isso os arquivos ficam **fora do Git** (`.gitignore`: `remake/assets/fonts/BasisGrotesquePro-*`). Quem builda precisa colocar em `remake/assets/fonts/` os arquivos `BasisGrotesquePro-400-normal.otf`, `-500-normal.otf`, `-700-normal.otf` e `-400-italic.otf`.
- Sem os arquivos, o build avisa ("fonte ausente") e a interface usa a Helvena.
- **Antes de lançar o jogo:** comprar a licença da Colophon que cubra jogo ou app.

## Piso de legibilidade

Os tamanhos literais pequenos das folhas de estilo passaram a usar a escala de `tokens.css`:

| Era | Agora | Token |
|---|---|---|
| 9 a 11,5 px | 13 px | `--t-cap` |
| 12 a 12,5 px | 14 px | `--t-sm` |
| 13 a 13,5 px | 15 px | `--t-md` |

O painel de turno do duelo foi de 224 px para 268 px de largura, porque o texto maior cortava "disponível" e "a partir do turno 2". Uma varredura automática de todas as telas não acusou outro texto saindo da caixa (a etiqueta do deck em Decks corta com reticências por desenho).

## Medição depois da troca (mesmo método da Sprint 2)

| | Antes | Depois |
|---|---|---|
| Texto abaixo de 14 px | 53% | 32% |
| Texto abaixo de 18 px | 87% | 86% |
| Fonte do texto | Courier New 66%, Apple Garamond 33% | Basis Grotesque 65%, Apple Garamond 34% |

O texto abaixo de 18 px quase não mudou: a meta de 18 px depende de reorganizar as telas para caber texto maior, o que entra nas Sprints 5 (menos texto) e 9 (acessibilidade).
