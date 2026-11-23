// Texto de regras em linguagem direta (descreve exatamente o que o motor faz), para leitura em tela pequena.
export const DEPT = { Criacao: 'Criação', TI: 'TI', Externo: 'Externo', Financeiro: 'Financeiro', Atendimento: 'Atendimento' };
export const KIND = { creature: 'Criatura', entity: 'Entidade', effect_instant: 'Efeito', effect_trap: 'Armadilha' };

export const RULES_TEXT = {
  'BCB-001': [['Palma Oca', 'Sempre que uma criatura inimiga atacar, joga-se uma moeda. Se der COROA, a atacante fica com ATQ e DEF pela metade até o fim do turno.'], ['Ouvido Absoluto', 'Imune a efeitos de Barulho.']],
  'BCB-002': [['Pode ligar o ar?', 'Cada ataque dele põe 1 marcador de Frio no rival. No início de cada turno, o rival perde $100 por marcador. Os marcadores somem quando Caio sai da mesa.'], ['Casaco', 'Imune a Barulho e a Frio.']],
  'BCB-003': [['Ar no 16', 'Enquanto estiver na mesa, toda criatura que não é imune a Frio fica com −$350 de ATQ e DEF (as suas também!).'], ['O controle tá com quem?', 'CAIO BATERA ganha +$350 de ATQ e DEF.'], ['Caiu o disjuntor', 'Dura 4 turnos seus e depois vai para o Morto.']],
  'BCB-004': [['Cala a boca, Bruno!', '+$300 de ATQ e DEF enquanto BRUNO estiver na mesa (de qualquer lado).'], ['Louro José', '+$100 de ATQ e DEF enquanto FILIPE, THE BEAR estiver na sua mesa.'], ['Faz outra versão', 'Pode atacar 2 vezes por turno. O segundo ataque usa metade do ATQ.']],
  'BCB-005': [['Crie, humano, crie!', 'Todas as criaturas do depto. Criação ganham +$300 de ATQ e perdem $300 de DEF.'], ['Estou na nuvem, otário.', 'Se for destruído em combate, volta embaralhado para o deck do dono em vez de ir para o Morto.']],
  'BCB-006': [['Horário de pico', '+$500 de ATQ e DEF enquanto a carta 18HRS estiver na mesa (carta ainda não lançada nesta edição).']],
  'BCB-007': [['Pai de gêmeos', 'Quando vence um combate contra outra criatura, o dano no CAIXA do rival é em dobro. Não vale para ataque direto.'], ['Paciência de pai', 'Imune a Barulho.']],
  'BCB-008': [['Máquina de reels', '+$200 de ATQ enquanto CHAT GPT estiver na mesa.'], ['Trava', 'Ao entrar, você pode escolher uma criatura do depto. Criação (de qualquer lado): ela não ataca no próximo turno do dono.']],
  'BCB-009': [['Nath Galvani', 'Enquanto Roger estiver na mesa, NATH, A REDATORA fica com −$400 de ATQ e DEF.']],
  'BCB-010': [['COMER! COMER!', 'Ao entrar, as 3 cartas do topo do SEU deck vão direto para o Morto.']],
  'BCB-011': [['Saúde ou morte!', 'Todo dano que elas causam ao CAIXA do rival também é somado ao seu CAIXA.']],
  'BCB-012': [['Sem habilidade', 'Entra de graça. Boa para pagar o custo de cartas mais fortes.']],
  'BCB-013': [['Espírito de oração', 'Enquanto Paulo estiver em DEFESA, suas outras criaturas ganham +$300 de DEF.']],
  'BCB-014': [['Dezesseis reais?', 'Para usar, mande 2 criaturas suas da mesa para o Morto. Você ganha +$1.000 de CAIXA.']],
  'BCB-015': [['Onde tem pilha?', 'Fica virada para baixo na mesa. Quando uma criatura inimiga do depto. Criação atacar, o ataque é anulado e o turno do rival acaba.']],
  'BCB-016': [['Gosto de cigarro', 'Escolha qualquer criatura da mesa: ela ganha +$600 de ATQ e perde $1.000 de DEF enquanto ficar na mesa. (NATH não sofre a perda de DEF.)']],
  'BCB-017': [['Faltou um TCHAN!', 'Ao entrar, você pode devolver uma criatura do rival para a mão dele.']],
  'BCB-018': [['Quem olhar vai ter que fazer!', 'Ao entrar, escolha uma criatura do rival: ela não ataca pelos próximos 2 turnos dele.'], ['Por que a criação me odeia?', 'Criaturas do depto. Criação que a atacam têm −$250 de ATQ nesse combate.']],
  'BCB-019': [['Gente, eu vi isso num insta...', 'Quando é atacado, o ataque volta contra outra criatura de quem atacou (a que mais prejudica o atacante). Só funciona 2 vezes na partida. Se o atacante não tiver outra criatura, o ataque segue normalmente.'], ['Louro José', 'Com NATH, A REDATORA na sua mesa, os dois ganham +$100 de ATQ e DEF.']],
};
