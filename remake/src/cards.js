// Dados das cartas: a fonte única é data/cards.json (lido por src/engine/cards.ts).
// Aqui só ajusta o caminho da arte para as cópias usadas no remake (remake/assets/cards).
import { CARDS as BASE } from '../../src/engine/cards.ts';
import companies from '../../data/companies.json' with { type: 'json' };

export const CARDS = BASE.map((c) => ({ ...c, art: c.art.replace('cards/full/', 'cards/') }));
export const RIVALS = companies.rivals;
