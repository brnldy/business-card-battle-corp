# Business Card Battle Corp. — remake visual

Remake em WebGL de um card game de escritório, em duas versões visuais sobre as mesmas regras:

| Arquivo | Estilo |
|---|---|
| `BusinessCardBattleCorp_BUCKSHOT.html` | Porão de escritório: escuro, sujo, luminária industrial balançando, TV de tubo antiga na cabeça do rival |
| `BusinessCardBattleCorp_SEVERANCE.html` | Andar corporativo: frio, simétrico, monitor cinza, brilho azul dos terminais |

## Como jogar

Baixe um dos dois arquivos `.html` e abra com dois cliques (Chrome ou Edge). Não precisa instalar nada nem de internet.

- Objetivo: zerar o CAIXA do rival antes que ele zere o seu.
- Cartas de contorno verde podem ser jogadas: clique ou arraste para a mesa.
- Passe o mouse em qualquer carta para ler o que ela faz.
- Atalhos: `B` batalha · `Espaço` encerrar turno · `L` relatório · `Esc` cancelar.

Mais detalhes em [`LEIA-ME_REMAKE.txt`](LEIA-ME_REMAKE.txt).

## Código-fonte

Em [`remake/`](remake/) (three.js + esbuild).

```
cd remake
npm install
node build.mjs          # gera os dois HTMLs na pasta acima
node build.mjs --dev    # build de desenvolvimento em remake/dist
node serve.mjs          # http://localhost:5178/dist/?theme=buckshot  (ou ?theme=severance)
```

O HUD é um design system próprio: componentes puros em `remake/src/hud/components.js` e estilos/tokens em `remake/src/hud/hud.css`. Para ver cada componente isolado, em todas as variantes e sobre quadros reais da partida, rode o build de desenvolvimento e abra `http://localhost:5178/dist/lab.html`.

Os modelos 3D de terceiros já estão convertidos em `remake/assets/models/`. Para refazer do zero:
`node tools/fetch-models.mjs` e depois `node tools/pack-models.mjs`.

## Créditos

- Regras, cartas, IA, arte das cartas e trilha "original": protótipo original do jogo.
- Mesa, salas, iluminação, shaders, partículas, efeitos sonoros, ambiente e trilha "gerada": feitos por código.
- Modelos 3D em domínio público (CC0): [Poly Haven](https://polyhaven.com) (Television 01, Television 02, Hanging Industrial Lamp, Mounted Fluorescent Lights, Drawer Cabinet, Wall Clock, Vintage Stapler, Binder Notebook, Potted Plant 02) e [Quaternius](https://quaternius.com) (Business Man).
