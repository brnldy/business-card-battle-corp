# Business Card Battle Corp — Documento de Design (GDD)

> Versão 0.2 — 18/11/2026. Fonte da verdade das regras. Todas as regras abaixo foram decididas com o autor. Itens marcados **[TÉCNICO]** são salvaguardas internas que quase nunca aparecem no jogo.

---

## 1. A ideia em uma frase
Um card game de duelo em que **empresas** se enfrentam numa mesa de escritório pós-apocalíptica para provar que merecem o dinheiro de **investidores monstros**, usando funcionários, entidades e gambiarras corporativas como cartas.

## 2. Lore
Fim do mundo. Não existem mais investidores-anjo. Restaram os **investidores monstros**, que vieram de outro lugar para investir nas nossas empresas. Para receber o dinheiro, as empresas precisam duelar entre si.

- **Você é uma empresa.** O nome que você cria no início é o seu "personagem".
- **Seus rivais são empresas-paródia** (Moca-Cola, Mentendo, Badflix…).
- **Os investidores nunca jogam.** São uma presença: vultos, olhos e respiração no escuro em volta da mesa. Eles observam, reagem às jogadas fortes e, no fim, "avaliam" a partida.

## 3. Glossário
| Termo | Significado |
|---|---|
| **CAIXA** | Os pontos de vida da partida. Começa em **$8.000**. |
| **PATRIMÔNIO** | Dinheiro acumulado entre partidas. Compra cartas e decks. |
| **Morto** | O cemitério: cartas destruídas, sacrificadas ou usadas. |
| **Deck** | Baralho de compra (40 cartas). |
| **Budget** | O custo da carta: os slots `$` dela. Pago com **sacrifício**. |
| **Elemento** | Barulho, Frio, Energia, Tecnologia, Monstro, Mundana, Aleatória. Serve para imunidades e sinergias. |
| **Departamento** | A "família" da carta (ex.: **Criação**). Serve para sinergias e efeitos que miram um departamento. |
| **Turno** | A vez de **um** jogador. |
| **Rodada** | Um turno de cada jogador. |

## 4. Tipos de carta
| Tipo | O que é | Onde fica |
|---|---|---|
| **Criatura** | Pessoas (funcionários). Têm ATQ, DEF e Budget. | Fileira de criaturas |
| **Entidade** | Coisas não-humanas (IA, ônibus, monstros). **Mesma regra da Criatura.** Efeitos podem citar "Entidade" especificamente. | Fileira de criaturas |
| **Efeito — Instantâneo** | Usado no seu turno. Resolve na hora e vai para o Morto. Se tiver duração, fica na fileira de efeitos até acabar. | Fileira de efeitos (se durar) |
| **Efeito — Armadilha** | Armada no seu turno. Dispara sozinha no turno do oponente quando a condição dela acontece. | Fileira de efeitos |

No texto deste documento, "criatura" quer dizer Criatura **ou** Entidade, a não ser que esteja escrito o contrário.

## 5. A mesa
Para cada jogador:
```
[ Deck ]  [ C1 ][ C2 ][ C3 ][ C4 ][ C5 ]   ← fileira de criaturas (frente)
[ Morto ] [ E1 ][ E2 ][ E3 ][ E4 ][ E5 ]   ← fileira de efeitos (trás)
          CAIXA: $8.000
```
- As duas mesas ficam frente a frente, com as fileiras de criaturas no meio.
- **Tudo fica visível** (criaturas, modos, valores), com uma exceção: as **armadilhas** ficam **viradas para baixo** até dispararem. O oponente vê que existe uma armadilha, mas não qual.

## 6. Preparação da partida
1. Cada jogador embaralha o deck de **40 cartas** (máximo de **2 cópias** de cada carta).
2. Cada um compra **5 cartas**.
3. Uma moeda decide quem começa.
4. Quem começa **compra normalmente, mas não ataca** no primeiro turno (compensa a vantagem de começar). *Decidido no balanceamento #1: sem a compra, quem começava vencia só 44%; com ela, 51%.*

## 7. Estrutura do turno
1. **Compra.** Compre 1 carta. Com o deck vazio, apenas não compra (perder só acontece pelo CAIXA). Se a mão estiver no limite de 10, veja §7.1.
2. **Preparação.** Em qualquer ordem e quantas vezes quiser, exceto onde houver limite:
   - Invocar **1 criatura** por turno (ver §8).
   - Usar efeitos instantâneos e armar armadilhas (sem limite, se houver casa livre).
   - Trocar o modo de cada criatura (ATQ ↔ DEF), **1 vez por criatura por turno**, e não no turno em que ela entrou.
   - Ativar habilidades de criaturas que digam "ative".
3. **Batalha.** Cada criatura sua em modo ATQ pode atacar **1 vez** (exceto habilidades como a da Nath).
4. **Encerramento.** Efeitos com duração do jogador da vez contam -1. Passa a vez.

### 7.1 Limite de mão: 10 cartas
- Não há descarte obrigatório no fim do turno. A mão só tem um **teto de 10 cartas**.
- **Na tela:** a mão mostra até umas 7 cartas em leque. Com mais, aparece uma **setinha discreta** na ponta; passar o mouse por ela desliza o leque, revelando as cartas à direita e escondendo as da esquerda.
- **Ao chegar a 10:** antes de comprar, o jogo avisa **"VOCÊ ATINGIU O LIMITE DE CARTAS NA MÃO. PRECISA COLOCAR NA MESA."** e você joga cartas até abrir espaço.
- **Se a mesa também estiver lotada:** o aviso vira **"VOCÊ ATINGIU O LIMITE DE CARTAS NA MÃO E NA MESA. PRECISA ELIMINAR AO MENOS UMA CARTA DA MÃO."** Você escolhe uma carta da mão, que vai para o Morto.
- A compra só acontece depois que a mão fica com 9 ou menos.

## 8. Invocação e sacrifício (Budget)
- O número de `$` preenchidos na carta é o custo dela: **0, 1, 2 ou 3**.
- Para pagar, mande **essa quantidade de criaturas suas que estejam na mesa** para o Morto.
  - Custo 0: entra de graça.
  - Custo 2: sacrifique 2 criaturas suas.
- A criatura entra no modo que você escolher: **ATQ** (em pé) ou **DEF** (deitada).
- Limite: **1 invocação por turno**. Habilidades "ao ser invocada" disparam na hora.
- Se a fileira de criaturas estiver cheia (5), você precisa sacrificar ou esperar.
- Efeitos não têm Budget e não exigem sacrifício (a não ser que o texto da carta peça).

## 9. Combate
Você escolhe uma criatura sua em ATQ e um alvo: uma criatura inimiga, ou o **CAIXA** direto se o oponente **não tiver nenhuma criatura** na mesa.

| Atacante (ATQ) contra… | Resultado |
|---|---|
| **Criatura em ATQ**, ATQ maior | O defensor morre. O dono dele perde a **diferença** do CAIXA. |
| **Criatura em ATQ**, ATQ menor | O **atacante** morre. O dono do atacante perde a diferença. |
| **Criatura em ATQ**, empate | As duas morrem. Ninguém perde CAIXA. |
| **Criatura em DEF**, ATQ > DEF | O defensor morre. **Ninguém** perde CAIXA. |
| **Criatura em DEF**, ATQ < DEF | Ninguém morre. O dono do **atacante** perde a diferença. |
| **Criatura em DEF**, empate | Nada acontece. |
| **Ataque direto** (sem criaturas inimigas) | O oponente perde o ATQ inteiro do atacante. |

Exemplo: Caio ($2.000 ATQ) ataca Bruno em ATQ ($1.800). Bruno morre e o dono dele perde **$200**. Se Bruno estivesse em DEF ($900), morreria e ninguém perderia nada.

"Vencer um combate" (Ralph) e "causar dano" (Siamesas) valem tanto atacando quanto defendendo: se a Siamesas está em DEF e o atacante perde a diferença, foi ela que causou esse dano.

## 10. Habilidades e efeitos
Toda habilidade de carta se encaixa num destes gatilhos (é assim que o jogo entende o texto):

| Gatilho | Exemplo |
|---|---|
| **Ao ser invocada** | Duda: escolhe uma criatura inimiga que fica sem atacar. |
| **Contínua** (enquanto estiver na mesa) | Roger: Nath perde $400. |
| **Ao atacar / ao ser atacada** | Caio: a cada ataque, o oponente perde $100. |
| **Ao ir para o Morto** | Chat GPT: volta para o deck. |
| **Condição de armadilha** | Onde tem pilha?: quando uma criatura da Criação ataca. |

Regras gerais:
- **Modificadores** (+$300, -$350…) se somam. ATQ e DEF **nunca ficam abaixo de $0**.
- **Imunidade a um elemento** (ex.: "imune a Barulho"): **efeitos e habilidades prejudiciais** de cartas desse elemento não afetam a carta imune. **Bônus continuam valendo**: o Caio é imune a Frio, mas ganha o +$350 do Ar Condicionado. **Combate normal continua valendo** (o Roger, de Barulho, pode atacar o Bruno). Uma carta imune também não pode ser escolhida como alvo de efeitos desse elemento.
- **Duração em turnos** conta só os turnos **do dono da carta**, incluindo o turno em que ela foi jogada. "4 turnos" = 4 turnos seus (o atual e mais 3). Efeitos que travam uma criatura do oponente (Lucas, Duda) contam os turnos **do dono da criatura travada**.
- Quando vários efeitos disparam juntos, resolve primeiro o do jogador da vez, na ordem em que as cartas entraram na mesa.
- Sorteios (moeda) usam um gerador com semente, para a partida poder ser reproduzida e, no futuro, jogada online sem trapaça.

## 11. Vitória
- **Vence quem zerar o CAIXA do oponente.**
- **[TÉCNICO]** Limite de segurança contra partida infinita: no turno 60, vence quem tiver mais CAIXA. Só existe para não travar a IA; na prática quase nunca deve acontecer.

## 12. Departamentos
Haverá vários departamentos, cada um com um estilo de jogo (como as cores do Magic). Lista inicial (edite à vontade; nomes e estilos ainda podem mudar):

| Departamento | Ícone | Estilo de jogo sugerido |
|---|---|---|
| **Criação** | mouse | Ataque alto e defesa frágil; caos, sinergias entre colegas |
| **Atendimento** | telefone/balão | Controle: trava ataques, devolve cartas para a mão |
| **Mídia** | megafone | Dano direto ao CAIXA, pressão |
| **Planejamento** | prancheta | Comprar cartas, olhar o deck, preparar armadilhas |
| **Financeiro** | calculadora | Manipular CAIXA: ganhar, roubar, juros |
| **TI / Tecnologia** | chip | Entidades, cópia e retorno de cartas |
| **Externo / Mundo** | globo | Coisas de fora da empresa (ônibus, clima, monstros) |

**Padrão dos ícones (decidido):** **ícone de cima = tipo** (Criatura / Entidade / Efeito / Armadilha), **ícone de baixo = departamento**. O **elemento fica só no texto** ("Criatura / Barulho"). Monstros, ônibus e coisas de fora da empresa são do departamento **Externo**. Nas cartas atuais alguns ícones ainda não seguem isso (ver `docs/CARDS.md`).

## 13. Meta-jogo (fora da partida)
- **Sua empresa:** você escolhe nome (e futuramente logo/cor) no primeiro acesso.
- **Ranking do mercado:** uma escada de empresas-paródia, da startup de garagem à megacorporação. Vencer a próxima do ranking libera a seguinte. Cada uma tem deck temático e IA com dificuldade crescente. Dá para revanchear qualquer empresa já vencida.
- **PATRIMÔNIO:**
  - Vitória: soma o **CAIXA que sobrou**.
  - Derrota: **não ganha nada**.
  - Rivais mais altos no ranking pagam um multiplicador (ex.: ×1,5).
- **Loja:**
  - **Boosters** com cartas sorteadas.
  - **Decks prontos** temáticos.
  - **Cartas avulsas** a preço fixo.
  - **Raridade: Comum / Rara / Lendária.** Define só a chance de sair no booster e o preço avulso. O limite de 2 cópias vale igual para todas. A carta pode mostrar a raridade com um detalhe na moldura.
- **Coleção e montador de deck:** deck de 40, até 2 cópias.
- **Save:** salvo no navegador (sem login) até existir o modo online.

### Empresas-paródia (primeira lista, para você editar)
| # | Empresa | Tema do deck |
|---|---|---|
| 1 | Pole Startion | Iniciante: só cartas básicas de custo 0 |
| 2 | Florp | Barulho |
| 3 | Mike | Ataque rápido |
| 4 | Abidas S.A. | Defesa |
| 5 | Bord | Mundana / Externo |
| 6 | Moca-Cola | Energia |
| 7 | Badflix | Controle (trava ataques) |
| 8 | Globe | Mídia / dano direto |
| 9 | Mentendo | Monstros |
| 10 | Sam&Sung | Tecnologia |
| 11 | Maçã Inc. | Chefão final: Entidades e Tecnologia |

## 14. Estética (direção)
- **Referência:** Buckshot Roulette, com luz baixa e quente vinda de uma luminária sobre a mesa, escuridão em volta, granulado, cores dessaturadas e pontos de luz verde (displays) e vermelho (dano).
- **Mesa:** vista de cima com perspectiva leve, feltro verde gasto (como no protótipo) sobre uma mesa de escritório. Seus elementos gráficos ficam como objetos físicos: pastas de arquivo para o CAIXA e etiquetas de preço vermelhas para o dano.
- **Cartas:** suas cartas P&B com granulado combinam com isso. O shader da tela soma granulado, vinheta e um leve tremor/dithering.
- **Investidores:** silhuetas ao fundo que se mexem quando algo grande acontece.
- **Movimento:** cartas com peso. Ataque com investida e impacto, destruição com rasgo/queima e tremida de tela; números de dinheiro rolando como num caixa registradora.

## 15. Áudio
Você produz ou compra todo o áudio. O jogo toca arquivos a partir de eventos. A lista exata está em `docs/ASSETS.md`.

## 16. Perguntas em aberto
- Lista final de departamentos e seus ícones (§12).
- Preços da loja, conteúdo dos boosters e raridade de cada carta (etapa 5).
- O risco de quem não tem cartas suficientes ficar travado sem PATRIMÔNIO (já que a derrota não paga nada) será avaliado nos testes da etapa 5. Se acontecer, uma saída é um deck inicial que nunca se perde.
