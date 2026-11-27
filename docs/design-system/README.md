# Design system da interface

Objetivo: todas as telas do Business Card Battle Corp. falarem a mesma língua visual, com menos texto e mais leitura por objeto, cor e posição.

## Regras que não mudam

1. **O logo é intocável.** A assinatura "BUSINESS CARD Battle Corp." segue a versão original do Figma. Nenhum token, tema ou troca de fonte da interface pode alterá-la. No código, o logo usa os tokens `--f-logo` e `--f-logo-tag`, separados dos tokens da interface (ver `remake/src/tokens.css`).
2. **Apple Garamond fica** para títulos, números e faces das cartas (decisão do autor, 24/11/2026).
3. **Courier New sai da interface.** O texto de interface passa a usar uma sem-serifa: Basis Grotesque Pro (escolha do autor). A licença da Colophon Foundry ainda precisa ser confirmada; até lá os arquivos da fonte ficam fora do Git.

4. **O sistema nunca limita a tela** (decisão do autor, 26/11/2026). Ao criar uma tela ou funcionalidade nova, usamos as peças que existem quando elas servem. Quando não servem, **criamos a peça que falta** (elemento, botão, material) e ela entra no sistema e no catálogo. Nunca se força uma necessidade nova dentro de um componente antigo.
5. **Legibilidade vem antes do efeito.** No modo padrão das telas comuns, nada passa por cima do texto do HUD (filtro, 3D, reamostragem). A **interface curva** em WebGL é uma opção nas Configurações, ligada por padrão só em telas 4K, onde o texto curvado fica nítido ([07-hud-webgl.md](07-hud-webgl.md)).
6. **Títulos em caixa alta, em VT323.** Texto de interface em Basis Grotesque. O logo fica em Apple Garamond.
7. **Materiais de escritório com função**: prender (clipe, grampo, fita, alfinete, prendedor), anotar (post-it, caneta, marca-texto), registrar (formulário contínuo, recibo, cartão de ponto, ficha) e decidir (carimbo). Desenho chapado, sem realismo.
8. **Carta reduzida em todo o produto** (decisão do autor, 27/11/2026). No jogo inteiro e no site, duelo incluído, a carta aparece só na versão reduzida: foto, título, categorias e ATQ/DEF. O texto completo (habilidades, características e ações adicionais) aparece **somente** quando a carta é destacada por hover ou clique. Nenhuma tela imprime o texto de regras embaixo da carta. Detalhes na R4 e na R6 de [`UI_LOBBY.md`](../UI_LOBBY.md).
9. **Equilíbrio entre respiro, leitura e visual** (decisão do autor, 27/11/2026). Acessibilidade e leitura continuam obrigatórias, mas não se resolvem aumentando tudo: a tela precisa de margem, de espaço vazio entre os grupos e de bom desenho. Os pisos de tamanho são pisos, não alvos. Quando não cabe, a tela rola ou pagina; não se espreme nem se encosta nada na borda. Números na R3, R8 e R11 de [`UI_LOBBY.md`](../UI_LOBBY.md).

## Sprints

| Sprint | Tema | Documento |
|---|---|---|
| 1 | Estruturação das referências | [01-referencias.md](01-referencias.md) |
| 2 | Auditoria de telas e de texto | [02-auditoria.md](02-auditoria.md) · script: `scripts/design-system/audit-texto.cjs` |
| 3 | Fundamentos e tokens | [03-tokens.md](03-tokens.md) |
| 4 | Tipografia | [04-tipografia.md](04-tipografia.md) · aprovada |
| 5 | Redução de texto | [05-texto.md](05-texto.md) · aprovada |
| 6 | Componentes, acabamento e materiais de escritório | [06-acabamento.md](06-acabamento.md) · em andamento, por sub-sprints |
| 7 | HUD curvo em WebGL | [07-hud-webgl.md](07-hud-webgl.md) · opção nas Configurações (padrão: ligada em 4K) |
| 8 | Motion e som | a fazer |
| 9 | Acessibilidade e validação com jogadores | a fazer |

Relatório de pesquisa que originou as sprints: benchmarking de interfaces de jogos (fora do repositório, entregue na conversa de 24/11/2026).

Implementações futuras anotadas: [FUTURO.md](FUTURO.md).
