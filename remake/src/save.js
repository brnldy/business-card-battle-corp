// Progresso do jogador salvo no navegador, em 3 slots. Cada slot é uma empresa inteira: nome, coleção, decks,
// PATRIMÔNIO, histórico, metas, conquistas, visual e em que batalha da campanha ela está.
// O slot em uso é salvo sozinho a cada mudança (partida, compra, deck); "Salvar agora" só confirma e carimba a hora.
// As regras ficam em src/meta/meta.ts (testadas em tests/meta.test.ts); aqui é só ler, gravar e avisar as telas.
import { migrate, rollMissions } from '../../src/meta/meta.ts';

export const SLOTS = 3;
const OLD_KEY = 'bcbc:save', SETTINGS_KEY = 'bcbc:settings', INDEX_KEY = 'bcbc:slots';
const slotKey = (n) => `bcbc:slot${n}`;
const listeners = new Set();
const pad = (n) => String(n).padStart(2, '0');
/** Dia local (as metas do dia viram à meia-noite do jogador). */
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const seed = () => Math.floor(Math.random() * 2 ** 31);
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; /* modo privado: vale só nesta sessão */ } };
const drop = (k) => { try { localStorage.removeItem(k); } catch { /* nada a apagar */ } };

// slot gravado: { name, save, createdAt, savedAt }
let current = null;   // número do slot em uso (1..3) ou null antes de escolher
let rec = null;       // o slot em uso, em memória

// Primeira vez com slots: o progresso antigo (uma empresa só) vira o slot 1, com o nome que estava nas configurações.
(function upgrade() {
  if (read(INDEX_KEY)) return;
  const old = read(OLD_KEY), name = read(SETTINGS_KEY)?.companyName ?? null;
  if (old || name) { const now = Date.now(); write(slotKey(1), { name, save: old, createdAt: now, savedAt: now }); write(INDEX_KEY, { last: 1 }); drop(OLD_KEY); }
  else write(INDEX_KEY, { last: null });
})();

const index = () => read(INDEX_KEY) ?? { last: null };
function load(n) {
  const raw = read(slotKey(n)); if (!raw) return null;
  return { name: raw.name ?? null, createdAt: raw.createdAt ?? Date.now(), savedAt: raw.savedAt ?? Date.now(), save: migrate(raw.save, seed()) };
}
function persist() { if (!current || !rec) return; rec.savedAt = Date.now(); write(slotKey(current), rec); write(INDEX_KEY, { ...index(), last: current }); }
const notify = () => listeners.forEach((fn) => fn(rec?.save));

export const save = {
  /** O save (meta) do slot em uso. Sem slot escolhido (atalhos de teste ?lobby / ?duel), usa o último ou abre o 1. */
  get() {
    if (!rec) { const n = this.lastSlot() ?? 1; if (!this.use(n)) this.create(n, null); }
    const rolled = rollMissions(rec.save, today());
    if (rolled !== rec.save) this.set(rolled);
    return rec.save;
  },
  /** Grava no slot em uso (salvamento automático). */
  set(next) { if (!rec) this.get(); rec.save = next; persist(); notify(); return rec.save; },
  onChange(fn) { listeners.add(fn); },

  // ───── slots ─────
  get slot() { return current; },
  /** Resumo dos 3 slots para as telas de Novo jogo / Carregar / Salvar. */
  slots() {
    return Array.from({ length: SLOTS }, (_, i) => {
      const n = i + 1, raw = n === current ? rec : read(slotKey(n));
      if (!raw) return { n, empty: true };
      const s = raw.save ?? {}, camp = s.campaign ?? null;
      return { n, empty: false, name: raw.name ?? 'SEM NOME', savedAt: raw.savedAt ?? 0, patrimonio: s.patrimonio ?? 0, wins: s.stats?.wins ?? 0, stage: camp?.stage ?? 0, done: !!camp?.cleared, current: n === current };
    });
  },
  /** Slot jogado por último (o "Continuar" do menu), se ainda existir. */
  lastSlot() { const l = index().last; return l && read(slotKey(l)) ? l : null; },
  hasAny() { return this.slots().some((x) => !x.empty); },
  /** Passa a jogar no slot n. Devolve false se ele estiver vazio. */
  use(n) { const r = load(n); if (!r) return false; current = n; rec = r; write(INDEX_KEY, { ...index(), last: n }); notify(); return true; },
  /** Empresa nova no slot n (apaga o que havia nele). */
  create(n, name) { const now = Date.now(); current = n; rec = { name, createdAt: now, savedAt: now, save: migrate(null, seed()) }; persist(); notify(); return rec.save; },
  /** "Salvar agora": grava o slot em uso e devolve a hora. */
  commit() { if (!rec) this.get(); persist(); return rec.savedAt; },
  /** "Salvar aqui": copia o progresso em uso para outro slot e passa a jogar nele. */
  copyTo(n) { if (!rec) this.get(); if (n === current) return this.commit(); rec = JSON.parse(JSON.stringify(rec)); current = n; persist(); notify(); return rec.savedAt; },
  remove(n) { drop(slotKey(n)); if (n === current) { current = null; rec = null; } if (index().last === n) write(INDEX_KEY, { ...index(), last: null }); },

  // ───── nome da empresa (mora no slot) ─────
  company() { if (!rec) this.get(); return rec.name; },
  /** data em que a empresa foi registrada (ms) e a gaveta em uso: só para mostrar no Perfil */
  founded() { if (!rec) this.get(); return rec.createdAt; },
  slotNo() { if (!rec) this.get(); return current; },
  rename(name) { if (!rec) this.get(); rec.name = name; persist(); notify(); },

  /** Apaga o progresso do slot em uso e mantém o nome (Perfil → Recomeçar do zero). */
  reset() { if (!rec) this.get(); rec.save = migrate(null, seed()); persist(); notify(); return rec.save; },
};
