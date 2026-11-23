// Progresso do jogador (coleção, decks, PATRIMÔNIO, histórico, metas, conquistas, visual) salvo no navegador.
// As regras ficam em src/meta/meta.ts (testadas em tests/meta.test.ts); aqui é só ler, gravar e avisar as telas.
import { migrate, rollMissions } from '../../src/meta/meta.ts';

const KEY = 'bcbc:save';
let cache = null;
const listeners = new Set();
const pad = (n) => String(n).padStart(2, '0');
/** Dia local (as metas do dia viram à meia-noite do jogador). */
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export const save = {
  get() {
    if (!cache) {
      let raw = null;
      try { raw = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { raw = null; }
      cache = migrate(raw, Math.floor(Math.random() * 2 ** 31));
    }
    const rolled = rollMissions(cache, today());
    if (rolled !== cache) this.set(rolled);
    return cache;
  },
  set(next) {
    cache = next;
    try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* modo privado: vale só nesta sessão */ }
    listeners.forEach((fn) => fn(cache));
    return cache;
  },
  onChange(fn) { listeners.add(fn); },
  /** Apaga todo o progresso (Perfil → Recomeçar do zero). */
  reset() { cache = null; try { localStorage.removeItem(KEY); } catch { /* nada a apagar */ } return this.set(this.get()); },
};
