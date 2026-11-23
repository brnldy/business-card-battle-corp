# Cartas: regras finais

> Versão 0.2 — 18/11/2026. Para cada carta: os dados e **a regra como o jogo vai executar**, já com as suas decisões. ✏️ marca carta cujo **texto impresso precisa mudar** para bater com a regra. 🎨 marca ajuste de **ícone**. Os dados para o código ficam em `data/cards.json`.
>
> **IDs:** o número do ID é o mesmo do seu arquivo PNG (`BW_0013.png` = `BCB-013`). No rodapé das cartas vários números se repetem (`#0000000002`) e alguns são "U"; vale usar o ID daqui.

Legenda: **Custo** = criaturas sacrificadas para invocar. **Dept.** = departamento (ícone de baixo).

---

### BCB-001 · BRUNO, O ESTRONDOSO
Criatura / Barulho · Dept. Criação · Custo 0 · ATQ $1.800 · DEF $900
- **Palma Oca (contínua).** Enquanto Bruno estiver na mesa, sempre que uma criatura do oponente declarar um ataque, joga-se uma moeda. Se der coroa, aquela criatura fica com **ATQ e DEF pela metade até o fim do turno**, já valendo para esse ataque.
- **Ouvido Absoluto.** Imune a Barulho.

### BCB-002 · CAIO BATERA
Criatura / Frio · Dept. Criação · Custo 1 · ATQ $2.000 · DEF $1.500
- **Pode Ligar O Ar? (frio acumulado).** Cada ataque do Caio adiciona **1 marcador de Frio** ao oponente. No **início de cada turno do oponente**, ele perde **$100 × marcadores de Frio**. Os marcadores somem quando o Caio sai da mesa.
  - Exemplo: o Caio atacou 3 vezes → no começo de cada turno o oponente perde $300.
- **Ao Vivo.** Imune a Barulho e Frio.
- ✏️ Sugestão de texto: "Cada ataque do Caio esfria a sala: no início de cada turno do inimigo, ele perde $100 para cada ataque já feito pelo Caio."

### BCB-003 · AR CONDICIONADO NO TALO
Efeito Instantâneo (com duração) / Frio · Dept. Criação · Dura 4 turnos do dono
- **Ar no 16.** Enquanto estiver na mesa, **todas as criaturas dos dois lados** que não forem imunes a Frio ficam com **-$350 ATQ e DEF**.
- **O controle tá com quem?** CAIO BATERA (de qualquer lado) ganha **+$350 ATQ e DEF** enquanto este efeito estiver ativo.
- **Caiu o disjuntor.** Depois de 4 turnos do dono, a carta vai para o Morto.
- 🎨 O ícone de cima mostra "Criatura"; precisa do ícone de Efeito.

### BCB-004 · NATH, A REDATORA
Criatura / Energia · Dept. Criação · Custo 1 · ATQ $2.200 · DEF $2.200
- **Cala a Boca Bruno! (contínua).** Enquanto houver um BRUNO, O ESTRONDOSO em qualquer lado da mesa, Nath tem **+$300 ATQ e DEF**, mesmo que o Bruno chegue depois dela.
- **Faz Outra Versão.** Nath pode atacar **2 vezes por turno**. O segundo ataque usa **metade do ATQ** dela.
- ✏️ O texto diz "se ao ser invocada… tiver a carta Bruno". Sugestão: "Enquanto Bruno, o Estrondoso estiver na mesa, Nath entra em modo de fúria e ganha +$300 de ataque e defesa."

### BCB-005 · CHAT GPT
Entidade / Tecnologia · Dept. TI · Custo 2 · ATQ $2.850 · DEF $3.000
- **Crie humano, crie! (contínua).** Todas as criaturas da **Criação**, **dos dois lados**, ficam com **+$300 ATQ e -$300 DEF**.
- **Estou na nuvem, otário.** Quando é **destruído** (em combate ou por efeito), volta para o **deck** do dono, que é embaralhado. Se for **sacrificado**, vai para o Morto normalmente.
- 🎨 O ícone de departamento está vazio no PNG; seria o de TI.

### BCB-006 · 2104
Entidade / Mundana · Dept. Externo · Custo 0 · ATQ $1.500 · DEF $1.700
- **Horário de pico (contínua).** Enquanto a carta **18HRS** estiver na mesa (qualquer lado), +$500 ATQ e DEF.
- ⏳ Depende da carta 18HRS, que ainda não existe.

### BCB-007 · RALPH, O PAI
Criatura / Energia · Dept. Criação · Custo 2 · ATQ $2.400 · DEF $2.400
- **Pai de gêmeos.** Quando **o próprio Ralph vence um combate**, a **diferença** que o oponente perde do CAIXA é **dobrada**. Ataques diretos e efeitos não são dobrados.
  - Exemplo: Ralph ($2.400) vence uma criatura em ATQ de $1.800 → o oponente perde $1.200 em vez de $600.
- **Mente blindada.** Imune a Barulho e à carta FÉRIAS.
- ✏️ Sugestão de texto: "Quando Ralph vence um combate, a diferença descontada do inimigo é dobrada. Não vale para ataque direto."
- ⏳ FÉRIAS ainda não existe.

### BCB-008 · LUCAS, O SOCIAL MEDIA
Criatura / Energia · Dept. Criação · Custo 0 · ATQ $950 · DEF $1.350
- **Máquina de reels.**
  - (contínua) Enquanto CHAT GPT estiver na mesa (qualquer lado), Lucas tem +$200 ATQ.
  - (ao ser invocado, opcional) Escolha uma criatura da **Criação** na mesa (qualquer lado): ela **não pode atacar** durante o próximo turno do dono dela.

### BCB-009 · ROGER
Criatura / Barulho · Dept. Criação · Custo 0 · ATQ $1.300 · DEF $1.100
- **Nath Galvani (contínua).** Enquanto Roger estiver na mesa, NATH, A REDATORA (qualquer lado) tem **-$400 ATQ e DEF**.

### BCB-010 · TÊNIA DO LUCAS
Entidade / Monstro · Dept. Externo · Custo 0 · ATQ $1.450 · DEF $500
- **COMER! COMER! (ao ser invocada, obrigatória).** As **3 cartas do topo do SEU deck** vão para o Morto. É o preço de uma criatura de custo 0 com ATQ $1.450.
- 💡 Fica ótima no futuro com cartas que se beneficiam do Morto (ex.: "ganha +$100 por criatura no seu Morto").
- ✏️ Sugestão de texto: "Ao entrar na mesa, o verme come as 3 cartas do topo do seu baralho."
- 🎨 O ícone de baixo hoje é de monstro; no padrão novo seria o de Externo.

### BCB-011 · SIAMESAS BOREAL
Criatura / Monstro · Dept. Externo · Custo 1 · ATQ $1.700 · DEF $2.500
- **Saúde ou morte! (contínua).** Todo dano que as Siamesas causarem ao CAIXA do oponente **também soma no CAIXA do dono delas**.
- 🎨 O ícone de baixo hoje é de monstro; no padrão novo seria o de Externo.

### BCB-012 · CÉSAR MALANDRO
Criatura / Aleatória · Dept. Financeiro · Custo 0 · ATQ $1.000 · DEF $350
- **Sem habilidade.** Carta simples, só com números.
- 🎨 O ícone de calculadora combina com o departamento Financeiro. Se ele for de outro departamento, me avise.

### BCB-013 · PÃO COM REQUEIJÃO
Efeito Instantâneo / Energia · Dept. Criação
- **Dezesseis reais?** Para usar, mande **2 criaturas suas da MESA** para o Morto. Você ganha **+$1.000 de CAIXA**.
- 🎨 Precisa do ícone de Efeito.

### BCB-014 · ONDE TEM PILHA?
Efeito **Armadilha** / Energia · Dept. Criação
- **Onde tem pilha?** Fica virada para baixo. Dispara quando uma criatura da **Criação** do oponente declara ataque: o ataque é **anulado** e o turno do oponente **acaba** na hora. Depois a carta vai para o Morto.
- 🎨 Precisa do ícone de Armadilha.

### BCB-015 · CAFÉ COM 8 COLHERES DE PÓ
Efeito Instantâneo / Energia · Dept. Criação
- **Gosto de cigarro.** Escolha **1 criatura** (sua ou do oponente): **+$600 ATQ e -$1.000 DEF enquanto ela estiver na mesa**.
- **Tá fraco!** Se o alvo for NATH, A REDATORA ou GUSTAVO, O ARTE-FINAL, recebe só o +$600 (sem perder DEF).
- 🎨 Precisa do ícone de Efeito.
- ⏳ GUSTAVO, O ARTE-FINAL ainda não existe.

### BCB-016 · PAULO, O CRENTE
Criatura / Barulho · Dept. Criação · Custo 0 · ATQ $850 · DEF $2.900
- **Espírito de oração (contínua).** Enquanto Paulo estiver em **modo DEF**, **as suas outras criaturas** ganham **+$300 DEF**. O Paulo não ganha o bônus.
- ✏️ Sugestão de texto: "Quando esta carta está em modo de defesa, as outras cartas do seu campo ganham +$300 de defesa."

### BCB-017 · THAYS KIRYU
Criatura / Energia · Dept. Criação · Custo 0 · ATQ $1.985 · DEF $1.500
- **Faltou um TCHAN! (ao ser invocada, opcional).** Escolha **1 criatura** da mesa do oponente: ela volta para a **mão** dele.
- **Carona.** Se o oponente invocar TIAGO MATTE, a Thays **troca de lado** na hora e passa a ser dele. Não acontece se TIAGO MATTE já estava na mesa quando a Thays entrou.
- ✏️ Sugestão de texto: "Quando essa carta é invocada, você pode fazer uma carta da mesa inimiga voltar para a mão dele."
- ⏳ TIAGO MATTE ainda não existe.

### BCB-018 · DUDA KIRYU
Criatura / Energia · Dept. Atendimento · Custo 1 · ATQ $2.000 · DEF $2.000
- **Quem olhar vai ter que fazer! (ao ser invocada).** Escolha uma criatura do oponente: ela **não pode atacar** durante os próximos **2 turnos dele**.
- **Porque a criação me odeia? (contínua).** Toda criatura da **Criação** que atacar a Duda tem **-$250 ATQ só durante esse combate**.
- ✅ Departamento: **Atendimento** (confirmado em 19/11). O ícone dela (carta com brilho) passa a ser o ícone oficial do Atendimento.

---

## Cartas citadas que ainda faltam
**18HRS** (2104), **FÉRIAS** (Ralph), **TIAGO MATTE** (Thays), **GUSTAVO, O ARTE-FINAL** (Café).

## Pendências para o artista
1. **Textos a reimprimir (✏️):** Caio, Nath, Ralph, Tênia, Paulo, Thays. O jogo já segue a regra nova, então dá para reexportar quando for conveniente.
2. **Ícones (🎨):** ícone de Efeito (Ar Condicionado, Pão, Café), de Armadilha (Pilha), departamento de TI (Chat GPT) e Externo (Tênia, Siamesas).
3. **Mais cartas:** com no máximo 2 cópias, um deck de 40 precisa de **pelo menos 20 cartas diferentes** (hoje são 18). Até lá, os decks de teste usam uma exceção.

## Notas de balanceamento (para medir na etapa 2)
- Quase tudo custa 0. Num jogo de sacrifício, cartas de custo 0 são o "combustível" e as de custo 1–2 são o "prêmio". Vou simular partidas IA contra IA e mostrar quais cartas vencem demais.
- Cartas a observar: Bruno (custo 0 com $1.800), Caio (o frio acumulado cresce sem limite) e Siamesas (cura).
