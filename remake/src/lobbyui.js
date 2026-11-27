// Telas do lobby (por cima da sala 3D de src/lobby.js): etiquetas das áreas, barra de atalhos e as janelas
// de arquivo (decks e coleção), trituradora, sala de reunião, mural de metas, máquina de benefícios (loja e pacotes),
// troféus e recepção (perfil, histórico, visual). As regras vêm de src/meta/meta.ts; o progresso, de save.js.
import { CARDS, RIVALS } from './cards.js';
import { asset } from './assets.js';
import { settings, cleanName, MAX_NAME } from './settings.js';
import { sfx } from './audio.js';
import { save } from './save.js';
import { logoUrl, backUrl } from './cosmetics.js';
import * as C from './hud/components.js';
import * as Meta from '../../src/meta/meta.ts';
import { CAMPAIGN, tierOf } from '../../src/meta/campaign.ts';

const { META, DECK_RULES, RARITY_PT } = Meta;
const $ = (sel, root = document) => root.querySelector(sel);
const esc = C.esc, money = C.money;
const byId = new Map(CARDS.map((c) => [c.id, c]));
const isFx = (c) => c.kind === 'effect_instant' || c.kind === 'effect_trap';
const KIND = { creature: 'Criatura', entity: 'Entidade', effect_instant: 'Efeito', effect_trap: 'Armadilha' };
const AREAS = [
  ['duel', 'Duelo'], ['deck', 'Decks'], ['shop', 'Loja'], ['missions', 'Metas'], ['achievements', 'Conquistas'],
  ['profile', 'Perfil'], ['training', 'Treino'], ['recycle', 'Reciclar'], ['settings', 'Config.'],
];
const TITLES = {
  deck: ['Arquivo morto · gaveta 3', 'Decks e coleção'], recycle: ['Trituradora · uso por conta e risco', 'Reciclar repetidas'],
  duel: ['Sala de reunião · porta entreaberta', 'Campanha'], training: ['Mesa do estagiário', 'Treino sem valer'],
  missions: ['Mural de avisos · leitura obrigatória', 'Metas do dia'], shop: ['Máquina de benefícios · não devolve troco', 'Loja'],
  achievements: ['Prateleira de troféus · empoeirada', 'Conquistas'], profile: ['Recepção · ficha cadastral', 'Perfil da empresa'],
};
const sortCards = (ids) => [...ids].sort((a, b) => a.localeCompare(b));
const group = (ids) => { const m = new Map(); for (const id of ids) m.set(id, (m.get(id) ?? 0) + 1); return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])); };
const dateStr = (ms) => { const d = new Date(ms), p = (n) => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const rarityTag = (id) => `<i class="lb-rar lb-rar--${Meta.rarityOf(id)}" title="${RARITY_PT[Meta.rarityOf(id)]}"></i>`;

export class LobbyUI {
  constructor({ ui, lobby, canvas, actions }) {
    Object.assign(this, { ui, lobby, canvas, actions });
    this.on = false; this.panel = null; this.tab = {}; this.ed = null; this.pack = null; this.peekFor = null; this.snaps = new Map();
    this.cf = { q: '', type: 'all', sort: 'num', mine: false }; // busca, filtro e ordem da coleção (editor e aba Coleção)
    const root = document.createElement('div'); root.id = 'lobby'; root.className = 'hidden';
    root.innerHTML = `
      <div class="lb-badge" data-a="open" data-id="profile" title="Perfil da empresa"></div>
      <div class="lb-top"><button class="lb-exit" data-a="slots" title="Salvar ou carregar (S)">Salvar / Carregar</button><button class="lb-exit" data-a="exit">← Sair para a rua</button></div>
      <div class="lb-labels"></div>
      <nav class="lb-nav"></nav>
      <div class="lb-hint">Clique num objeto da sala ou use os números do teclado</div>
      <div class="lb-win hidden"></div>
      <div class="lb-pack hidden"></div>
      <div class="lb-peek hidden"></div>
      <div class="lb-toasts" role="status" aria-live="polite"></div>`;
    ui.root.appendChild(root);
    this.root = root; this.win = $('.lb-win', root); this.labels = $('.lb-labels', root); this.peekEl = $('.lb-peek', root);
    $('.lb-nav', root).innerHTML = AREAS.map(([id, name], i) => `<button data-a="open" data-id="${id}"><kbd>${i + 1}</kbd><span>${name}</span><b class="lb-dot hidden"></b></button>`).join('');
    this.labels.innerHTML = lobby.hot.map((h) => `<button class="lb-label" data-a="open" data-id="${h.id}"><b>${esc(h.label)}</b><span>${esc(h.sub)}</span><i class="lb-dot hidden"></i></button>`).join('');
    this.labelEls = new Map([...this.labels.children].map((el) => [el.dataset.id, el]));

    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('contextmenu', (e) => { const t = e.target.closest('[data-card]'); if (t && this.panel === 'deck' && this.ed) { e.preventDefault(); this.deckRemove(t.dataset.card); } });
    root.addEventListener('pointerover', (e) => {
      const b = e.target.closest('[data-a="open"]'); if (b && !this.panel) lobby.setHover(b.dataset.id);
      if (this.panel) this.peek(e.target.closest('[data-card]'));
    });
    root.addEventListener('pointerout', (e) => { if (e.target.closest('[data-a="open"]') && !this.panel) lobby.setHover(null); if (!e.relatedTarget?.closest?.('[data-card]')) this.peek(null); });
    // pelo teclado a ficha também abre (foco visível numa carta ou nos botões dela)
    root.addEventListener('focusin', (e) => { if (this.panel && e.target.matches?.(':focus-visible')) this.peek(e.target.closest('[data-card]')); });
    root.addEventListener('focusout', (e) => { if (!e.relatedTarget?.closest?.('[data-card]')) this.peek(null); });
    root.addEventListener('input', (e) => {
      const t = e.target;
      // o nome grava a cada tecla, sem redesenhar a tela (para não perder o cursor); só o botão de desfazer acompanha
      if (t.id === 'lb-deck-name' && this.edDeck) {
        sfx('type'); this.deckWrite(this.edDeck.cards, t.value, true);
        const d = this.edDeck, sn = this.ed.snap, u = $('[data-a="deck-undo"]', this.win);
        if (u) u.hidden = d.name === sn.name && sortCards(d.cards).join() === sn.cards.join();
      } else if (t.id === 'lb-q') { this.cf.q = t.value; this.render(); }
      else if (t.id === 'lb-sort') { this.cf.sort = t.value; sfx('nav'); this.render(); }
    });
    // ao sair do campo, o nome mostrado vira o nome gravado (espaços juntados, "Deck sem nome")
    root.addEventListener('change', (e) => { if (e.target.id === 'lb-deck-name' && this.edDeck) e.target.value = this.edDeck.name; });
    root.addEventListener('keydown', (e) => {
      const id = e.target.id;
      if (id === 'lb-q' && e.key === 'Escape') { if (e.target.value) { e.stopPropagation(); this.cf.q = ''; this.render(); } else e.target.blur(); }
      if (id === 'lb-deck-name' && (e.key === 'Enter' || e.key === 'Escape')) e.target.blur();
    });
    canvas.addEventListener('pointermove', (e) => { if (!this.on || this.panel) return; const id = lobby.pick(e.clientX / window.innerWidth, e.clientY / window.innerHeight); if (id !== lobby.hover) { lobby.setHover(id); if (id) sfx('hover'); } canvas.style.cursor = id ? 'pointer' : ''; });
    canvas.addEventListener('click', (e) => { if (!this.on || this.panel) return; const id = lobby.pick(e.clientX / window.innerWidth, e.clientY / window.innerHeight); if (id) this.open(id); });
    window.addEventListener('keydown', (e) => {
      if (!this.on || (e.target.tagName === 'INPUT' && e.key !== 'Escape') || !$('#modal').classList.contains('hidden')) return;
      if (e.key === 'Escape') { if (this.pack) { this.packSkip(); e.stopPropagation(); return; } if (this.panel === 'deck' && this.ed) { this.leaveEditor(); e.stopPropagation(); return; } if (this.panel) { this.close(); e.stopPropagation(); } return; }
      if (this.pack) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) this.packNext(); } return; }
      if (!this.panel && (e.key === 's' || e.key === 'S')) return this.openSlots();
      const n = Number(e.key); if (!this.panel && n >= 1 && n <= AREAS.length) this.open(AREAS[n - 1][0]);
      if (this.panel === 'duel' && e.key === 'Enter') this.startDuel(false);
    });
    save.onChange(() => { if (this.on) this.sync(); });
    settings.onChange(() => { if (this.on) this.sync(); });
  }

  // ───────── ciclo ─────────
  show(on) {
    this.on = on; this.root.classList.toggle('hidden', !on);
    if (!on) { this.panel = null; this.forgetDecks(); this.resetFilters(); this.peek(null); this.root.classList.remove('is-pack'); this.win.classList.add('hidden'); this.lobby.setHover(null); this.canvas.style.cursor = ''; return; }
    this.sync();
  }
  get s() { return save.get(); }
  company() { return save.company() ?? 'SUA EMPRESA'; }
  /** atualiza crachá, avisos de "tem coisa nova" e a tela aberta */
  sync() {
    const s = this.s;
    $('.lb-badge', this.root).innerHTML = `<img src="${logoUrl(s.cosmetics.logo)}" alt=""><div><b>${esc(this.company())}</b><span>Patrimônio <em>${money(s.patrimonio)}</em></span></div>`;
    this.lobby.setCompany({ name: this.company(), logo: s.cosmetics.logo, patrimonio: s.patrimonio });
    const dots = { missions: Meta.claimableMissions(s) > 0, recycle: Meta.totalExtras(s) > 0, deck: !Meta.activeDeckValid(s) };
    for (const [id] of AREAS) { const on = !!dots[id]; $(`.lb-nav [data-id="${id}"] .lb-dot`, this.root)?.classList.toggle('hidden', !on); this.labelEls.get(id)?.querySelector('.lb-dot').classList.toggle('hidden', !on); }
    if (this.panel && !this._quiet) this.render();
  }
  /** a cada quadro: cola as etiquetas nos objetos da sala */
  frame() {
    if (!this.on) return;
    const z = this.ui.scale, W = window.innerWidth / z, H = window.innerHeight / z, hov = this.lobby.hover;
    for (const a of this.lobby.anchors()) {
      const el = this.labelEls.get(a.id); if (!el) continue;
      el.style.transform = `translate(${Math.max(70, Math.min(W - 70, a.x * W))}px, ${Math.max(70, Math.min(H - 110, a.y * H))}px) translate(-50%, -100%)`;
      el.classList.toggle('is-hot', hov === a.id);
    }
    this.root.classList.toggle('is-open', !!this.panel);
    this.root.dataset.panel = this.panel ?? '';
    // com uma janela aberta, o que fica por trás sai da ordem do Tab (e o pacote tira a janela de trás também)
    const inert = !!this.panel, pk = !!this.pack;
    if (this._inert !== inert) { this._inert = inert; for (const el of this.root.querySelectorAll(':scope > .lb-top, :scope > .lb-labels, :scope > .lb-nav')) el.inert = inert; }
    if (this.win.inert !== pk) this.win.inert = pk;
  }
  toast(text, tone = '') {
    const el = document.createElement('div'); el.className = `lb-toast ${tone}`; el.innerHTML = text;
    // aviso com botão fica mais tempo (dá para alcançar o botão)
    const t = text.includes('<button') ? 7000 : 3600;
    $('.lb-toasts', this.root).appendChild(el); setTimeout(() => el.classList.add('out'), t); setTimeout(() => el.remove(), t + 600);
  }
  /** aplica o resultado de uma operação do meta-jogo: grava, avisa conquistas ou mostra o erro */
  commit(r, okText) {
    if (!r.ok) { sfx('deny'); this.toast(esc(r.error), 'bad'); return false; }
    save.set(r.save);
    if (okText) this.toast(okText, 'good');
    this.announce(r.unlocked);
    return true;
  }
  announce(list = []) { list.forEach((a, i) => setTimeout(() => { sfx('heal'); this.toast(`<b>Conquista: ${esc(a.name)}</b><span>${esc(a.text)} · bônus ${money(a.reward)}</span>`, 'gold'); }, 500 + i * 900)); }
  /** depois de um duelo: recompensa, metas cumpridas e conquistas */
  afterMatch(out) {
    if (!out) return;
    if (out.finished) setTimeout(() => this.ui.ending(), 600);
    out.missionsDone.forEach((m, i) => setTimeout(() => this.toast(`<b>Meta cumprida</b><span>${esc(m.text)} · resgate ${money(m.reward)} no mural</span>`, 'good'), 300 + i * 700));
    this.announce(out.unlocked);
  }

  // ───────── janelas ─────────
  open(id, opts = {}) {
    if (id === 'settings') { sfx('nav'); this.ui.settings(); return; }
    if (!TITLES[id]) return;
    sfx('nav'); this.panel = id; this.lobby.setHover(id); this.canvas.style.cursor = '';
    if (opts.tab) this.tab[id] = opts.tab;
    this.win.classList.remove('hidden'); this.render();
  }
  close() { if (!this.panel) return; if (this.panel === 'deck') { this.forgetDecks(); this.resetFilters(); } this.peek(null); this.panel = null; this.win.classList.add('hidden'); this.lobby.setHover(null); sfx('navBack'); }
  render() {
    const id = this.panel, [memo, title] = TITLES[id], s = this.s;
    const body = { deck: () => this.vDeck(s), recycle: () => this.vRecycle(s), duel: () => this.vDuel(s), training: () => this.vTraining(s), missions: () => this.vMissions(s), shop: () => this.vShop(s), achievements: () => this.vAchievements(s), profile: () => this.vProfile(s) }[id]();
    // guarda rolagem e foco (com a posição do cursor) para a tela não "pular" a cada clique
    const view = this.ed ? 'ed' : this.tab[id], same = this._view === `${id}:${view}`; this._view = `${id}:${view}`;
    const scroll = same ? $('.lb-scroll', this.win)?.scrollTop ?? 0 : 0, scroll2 = same ? $('.lb-decklist', this.win)?.scrollTop ?? 0 : 0;
    const act = document.activeElement, focus = act?.id, sel = focus && act.selectionStart != null ? [act.selectionStart, act.selectionEnd] : null;
    // botão focado (teclado): guarda a "assinatura" para devolver o foco ao botão equivalente depois de redesenhar
    const sig = !focus && act && this.win.contains(act) && act.dataset?.a ? { a: act.dataset.a, card: act.dataset.card, id: act.dataset.id, list: !!act.closest('.lb-decklist') } : null;
    this.win.innerHTML = `<section class="lb-box lb-box--${id}">
      <header><div><p class="memo">${esc(memo)}</p><h2>${esc(title)}</h2></div><div class="lb-pat">Patrimônio <b>${money(s.patrimonio)}</b></div><button class="lb-x" data-a="close" title="Fechar (Esc)">✕</button></header>
      ${body}</section>`;
    const sc = $('.lb-scroll', this.win); if (sc) sc.scrollTop = scroll; const dl = $('.lb-decklist', this.win); if (dl) dl.scrollTop = scroll2;
    if (focus && ['lb-deck-name', 'lb-q', 'lb-sort'].includes(focus)) { const i = $(`#${focus}`, this.win); i?.focus(); if (sel) i?.setSelectionRange?.(...sel); }
    else if (sig) {
      const q = `[data-a="${sig.a}"]${sig.card ? `[data-card="${sig.card}"]` : ''}${sig.id != null ? `[data-id="${sig.id}"]` : ''}`;
      const el = (sig.list ? $(`.lb-decklist ${q}`, this.win) : null) ?? $(`.lb-grid ${q}`, this.win) ?? $(q, this.win);
      // o botão sumiu ou ficou desligado (virou "Completa", "Em uso"...): foco na aba ativa, para o Tab não recomeçar do zero
      (el && !el.disabled ? el : $('.lb-tabs .on', this.win) ?? $('.lb-x', this.win))?.focus({ preventScroll: true });
    }
    if (this._scrollTo != null) { $(`[data-deck="${this._scrollTo}"]`, this.win)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); this._scrollTo = null; }
  }
  /** sai do editor de volta para as pastas */
  leaveEditor() { this.ed = null; this.resetFilters(); this.peek(null); sfx('navBack'); this.render(); }
  tabs(id, list) { const cur = this.tab[id] ?? list[0][0]; this.tab[id] = cur; return `<div class="lb-tabs" role="tablist">${list.map(([k, n]) => `<button data-a="tab" data-id="${k}" role="tab" aria-selected="${k === cur}" class="${k === cur ? 'on' : ''}">${n}</button>`).join('')}</div>`; }

  onClick(e) {
    if (e.target === this.win) return this.close();
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    const a = b.dataset.a, id = b.dataset.id;
    // compras e "usar": o 2º clique de um clique duplo (ou um clique logo em seguida) não compra de novo
    if (/^(buy-|equip|put-active)/.test(a)) { const now = performance.now(); if (e.detail > 1 || now - (this._buyAt ?? 0) < 400) return; this._buyAt = now; }
    switch (a) {
      case 'open': return this.open(id, { tab: b.dataset.tab });
      case 'close': return this.close();
      case 'exit': sfx('navBack'); return this.actions.exit();
      case 'slots': return this.openSlots();
      case 'tab': this.tab[this.panel] = id; if (this.panel === 'deck') this.resetFilters(); sfx('nav'); return this.render();
      // coleção: busca, filtro e ordem
      case 'cf-type': this.cf.type = id; sfx('nav'); return this.render();
      case 'cf-mine': this.cf.mine = !this.cf.mine; sfx('nav'); return this.render();
      case 'cf-clear': this.resetFilters(); sfx('nav'); return this.render();
      // decks
      case 'deck-edit': this.editDeck(Number(id)); sfx('nav'); return this.render();
      case 'deck-back': return this.leaveEditor();
      case 'deck-new': {
        const s = this.s, auto = id === 'auto', cards = auto ? Meta.autoFill(s) : [];
        if (auto) {
          // a coleção só monta um deck que já existe: avisa em vez de ocupar uma pasta com uma cópia igual
          const key = sortCards(cards).join(), twin = s.decks.find((x) => sortCards(x.cards).join() === key);
          if (twin) { sfx('deny'); this.toast(`<b>Sua coleção monta o mesmo deck de "${esc(twin.name)}"</b><span>compre cartas novas para variar, ou comece em branco</span>`); return undefined; }
        }
        const r = Meta.saveDeck(s, -1, { name: auto ? 'Montagem automática' : `Deck ${s.decks.length + 1}`, cards }, Date.now());
        if (!this.commit(r, auto ? (cards.length === DECK_RULES.size ? 'Deck montado. Ajuste o que quiser.' : `A coleção só deu ${cards.length} cartas. As que faltam têm botão Comprar na grade.`) : '')) return undefined;
        this.editDeck(r.index); sfx('summon'); return this.render();
      }
      case 'deck-add': return this.deckAdd(b.dataset.card);
      case 'deck-rem': return this.deckRemove(b.dataset.card);
      case 'deck-undo': { const sn = this.ed.snap; this.touch(); if (this.deckWrite(sn.cards, sn.name)) { sfx('cancel'); this.toast('O deck voltou a ser como estava quando você abriu.'); } return undefined; }
      case 'deck-fill': {
        const s = this.s, d = this.edDeck, before = d.cards, cards = Meta.autoFill(s, before);
        if (sortCards(cards).join() === sortCards(before).join()) { sfx('deny'); this.toast('Não sobrou carta livre na sua coleção para completar este deck. As que faltam têm botão Comprar na grade.', 'bad'); return undefined; }
        // o que entrou e o que saiu (cópias que você não tem), para marcar na lista e poder desfazer só isso
        const gain = new Map(group(cards)), lose = new Map(group(before));
        const added = [...gain].filter(([id, k]) => k > (lose.get(id) ?? 0)), removed = [...lose].reduce((n, [id, k]) => n + Math.max(0, k - (gain.get(id) ?? 0)), 0);
        const nAdded = added.reduce((n, [id, k]) => n + k - (lose.get(id) ?? 0), 0);
        if (!this.deckWrite(cards)) return undefined;
        this.ed.prev = [...before]; this.ed.fresh = new Set(added.map(([id]) => id));
        const errs = Meta.deckErrors(this.s, cards), left = DECK_RULES.size - cards.length;
        sfx('summon');
        this.toast(`<b>+ ${nAdded} carta${nAdded === 1 ? '' : 's'}${removed ? ` · − ${removed} que você não tem` : ''}</b><span>${errs.length ? (left > 0 ? `ainda faltam ${left}: as que faltam têm botão Comprar na grade` : esc(errs[0])) : 'deck completo · as novas estão marcadas na lista'}</span>`, errs.length ? 'bad' : 'good');
        return undefined;
      }
      case 'deck-unfill': { const prev = this.ed.prev; if (!prev) return undefined; this.touch(); if (this.deckWrite(prev)) { sfx('cancel'); this.toast('As cartas do automático saíram.'); } return undefined; }
      case 'deck-clear': return this.ui.confirm('Esvaziar o deck?', `Todas as cartas saem de "${this.edDeck.name}". Elas continuam na sua coleção, e "Desfazer alterações" traz de volta enquanto o arquivo estiver aberto.`, 'ESVAZIAR', () => { this.touch(); this.deckWrite([]); sfx('cancel'); });
      case 'deck-use': { const i = Number(id), name = this.s.decks[i]?.name ?? ''; if (this.commit(Meta.setActiveDeck(this.s, i), `<b>${esc(name)}</b><span>é o deck que vai para o duelo</span>`)) sfx('nav'); return undefined; }
      case 'deck-dup': { const r = Meta.duplicateDeck(this.s, Number(id), Date.now()); if (r.ok) this._scrollTo = r.index; if (this.commit(r, `<b>Cópia criada</b><span>${esc(r.ok ? r.save.decks[r.index].name : '')}</span>`)) sfx('draw'); return undefined; }
      case 'deck-del': { const i = Number(id), name = this.s.decks[i]?.name ?? ''; return this.ui.confirm('Apagar este deck?', `"${name}" sai do arquivo. As cartas continuam na sua coleção.`, 'APAGAR', () => { this.snaps.clear(); if (this.commit(Meta.deleteDeck(this.s, i))) sfx('sacrifice'); }); }
      // reciclar
      case 'recycle': { const r = Meta.recycle(this.s, id || null, Date.now()); if (this.commit(r)) { sfx('sacrifice'); this.toast(`<b>${r.count} carta${r.count > 1 ? 's' : ''} triturada${r.count > 1 ? 's' : ''}</b><span>+ ${money(r.gained)} de PATRIMÔNIO</span>`, 'good'); } return undefined; }
      // loja
      case 'buy-card': return this.buyCard(id);
      case 'buy-pack': { const r = Meta.buyBooster(this.s, Date.now()); if (this.commit(r)) this.openPack(r.cards); return undefined; }
      case 'buy-deck': {
        const d = META.readyDecks.find((x) => x.id === id), s = this.s, price = Meta.readyDeckPrice(s, id), miss = Meta.readyDeckMissing(s, id), copies = Object.values(miss).reduce((a, k) => a + k, 0);
        const buy = () => { const r = Meta.buyReadyDeck(this.s, id, Date.now()); if (this.commit(r, `<b>${esc(r.ok ? r.save.decks[r.index].name : d.name)}</b><span>${r.ok && r.price ? `chegaram ${copies} cópias · ` : ''}está no Arquivo e é o deck do duelo</span>`)) { sfx('summon'); this.forgetDecks(); } };
        if (!price) return buy();
        return this.ui.confirm(`Comprar ${d.name}?`, `Chegam ${copies} cópias que faltam na sua coleção e a lista vira o deck do duelo. Sai ${money(price)} · fica ${money(s.patrimonio - price)}.`, `COMPRAR · ${money(price)}`, buy, 'Voltar');
      }
      case 'deck-open': this.open('deck', { tab: 'decks' }); this.editDeck(Number(id)); return this.render();
      case 'buy-cos': {
        // comprar já veste: o item novo aparece na hora (o antigo continua seu, com "Usar")
        const c = META.cosmetics.find((x) => x.id === id), r = Meta.buyCosmetic(this.s, id, Date.now());
        if (!r.ok) return this.commit(r);
        const e2 = Meta.equipCosmetic(r.save, id, Date.now()), out = e2.ok ? { ...e2, unlocked: [...r.unlocked, ...e2.unlocked] } : r;
        if (this.commit(out, `<b>${esc(c.name)}</b><span>${e2.ok ? 'comprado e já em uso' : 'é seu: clique em Usar'}</span>`)) sfx('draw');
        return undefined;
      }
      case 'equip': if (this.commit(Meta.equipCosmetic(this.s, id, Date.now()))) sfx('nav'); return undefined;
      case 'pack-next': if (this.pack && e.detail > 1) return undefined; return this.packNext();
      case 'pack-flip': if (!this.pack || e.detail > 1 || performance.now() - this.pack.t0 < 650) return undefined; return this.packFlip(Number(id));
      case 'put-active': {
        // atalho do aviso de compra: põe 1 cópia no deck do duelo
        const s = this.s, i = s.activeDeck, d = s.decks[i], why = this.whyNot(s, d.cards, id);
        if (why) { sfx('deny'); this.toast(esc(why), 'bad'); return undefined; }
        if (this.commit(Meta.saveDeck(s, i, { name: d.name, cards: [...d.cards, id] }, Date.now()), `<b>${esc(byId.get(id).name)}</b><span>entrou em "${esc(d.name)}" (${d.cards.length + 1}/${DECK_RULES.size})</span>`)) { sfx('card'); b.closest('.lb-toast')?.remove(); }
        return undefined;
      }
      // metas
      case 'claim': { const r = Meta.claimMission(this.s, Number(id), Date.now()); if (this.commit(r)) { sfx('heal'); this.toast(`<b>Meta resgatada</b><span>+ ${money(r.reward)} de PATRIMÔNIO</span>`, 'good'); } return undefined; }
      // duelo
      case 'duel': return this.startDuel(false);
      case 'train': return this.startDuel(true);
      // perfil
      case 'rename': return this.ui.nameEntry((n) => { save.rename(n); this.toast('Razão social alterada.', 'good'); }, save.company() ?? '');
      case 'wipe': return this.ui.confirm('Recomeçar do zero?', 'Coleção, decks, PATRIMÔNIO, histórico, conquistas e a campanha desta gaveta serão apagados para sempre. As outras gavetas não mudam.', 'APAGAR TUDO', () => { this.forgetDecks(); this.resetFilters(); save.reset(); this.toast('Ficha cadastral apagada. Bem-vindo de novo.', 'bad'); });
      default: return undefined;
    }
  }
  /** Salvar / Carregar: as 3 gavetas. Carregar troca a empresa inteira sem sair do lobby. */
  openSlots() {
    sfx('nav');
    this.ui.slots('lobby', {
      load: (n) => { this.ui.closeModal(); this.forgetDecks(); this.resetFilters(); this.panel = null; this.win.classList.add('hidden'); save.use(n); sfx('summon'); this.toast(`<b>${esc(this.company())}</b><span>expediente carregado da gaveta ${n}</span>`, 'good'); },
      saved: (n) => this.toast(`<b>Progresso salvo</b><span>gaveta ${n} · ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>`, 'good'),
    });
  }
  startDuel(training) {
    if (!Meta.activeDeckValid(this.s)) { sfx('deny'); this.toast('O deck escolhido não está válido. Arrume no arquivo antes de entrar.', 'bad'); return; }
    this.panel = null; this.win.classList.add('hidden');
    this.actions.duel(training);
  }

  // ───────── arquivo: decks e coleção ─────────
  // Três telas: a gaveta (todos os decks lado a lado), o editor de um deck e a coleção.
  // O editor grava sozinho a cada mudança. "Desfazer alterações" volta ao deck como estava na primeira vez que foi
  // aberto nesta visita ao arquivo (o retrato fica em this.snaps até fechar a janela, mesmo saindo e voltando ao deck).
  editDeck(index) {
    const d = this.s.decks[index]; if (!d) return;
    if (!this.snaps.has(index)) this.snaps.set(index, { name: d.name, cards: sortCards(d.cards) });
    this.ed = { index, snap: this.snaps.get(index), prev: null, fresh: null };
    this.resetFilters(); this.peek(null);
  }
  get edDeck() { return this.ed && this.s.decks[this.ed.index]; }
  /** busca, tipo e "só as que tenho" voltam ao padrão; a ordem é preferência e fica */
  resetFilters() { Object.assign(this.cf, { q: '', type: 'all', mine: false }); }
  /** esquece os retratos de "desfazer" (ao fechar a janela, trocar de gaveta ou quando os índices dos decks mudam) */
  forgetDecks() { this.snaps.clear(); this.ed = null; }
  /** grava o deck em edição (sem toast) */
  deckWrite(cards, name = this.edDeck.name, quiet = false) {
    const r = Meta.saveDeck(this.s, this.ed.index, { name, cards: sortCards(cards) }, Date.now());
    if (!r.ok) return this.commit(r);
    this._quiet = quiet; try { this.commit(r); } finally { this._quiet = false; }
    return true;
  }
  /** por que não dá para pôr mais uma cópia (null = dá) */
  whyNot(s, cards, cardId) {
    const n = cards.filter((x) => x === cardId).length, own = Meta.owned(s, cardId), p = Meta.priceOf(cardId);
    const buy = s.patrimonio >= p ? `Compre no botão da carta (${money(p)}).` : `Ela custa ${money(p)}: faltam ${money(p - s.patrimonio)} de PATRIMÔNIO.`;
    if (!own) return `Você ainda não tem esta carta. ${buy}`;
    if (cards.length >= DECK_RULES.size) return `O deck já tem ${DECK_RULES.size} cartas. Tire uma antes.`;
    if (n >= DECK_RULES.maxCopies) return `Máximo de ${DECK_RULES.maxCopies} cópias por carta.`;
    if (n >= own) return `Você só tem ${own} cópia${own > 1 ? 's' : ''} desta carta. ${buy}`;
    return null;
  }
  /** mudanças à mão desfazem a marcação do "Completar automático" */
  touch() { if (this.ed) { this.ed.prev = null; this.ed.fresh = null; } }
  deckAdd(cardId) {
    const d = this.edDeck; if (!d) return;
    const why = this.whyNot(this.s, d.cards, cardId);
    if (why) { sfx('deny'); this.toast(esc(why), 'bad'); return; }
    this.touch(); if (this.deckWrite([...d.cards, cardId])) sfx('card');
  }
  deckRemove(cardId) {
    const d = this.edDeck; if (!d) return;
    const i = d.cards.indexOf(cardId); if (i < 0) return;
    const cards = [...d.cards]; cards.splice(i, 1);
    this.touch(); if (this.deckWrite(cards)) sfx('cancel');
  }
  /** compra avulsa; dentro do editor, a carta comprada já entra no deck quando cabe */
  buyCard(id) {
    const r = Meta.buySingle(this.s, id, Date.now()); if (!this.commit(r)) return;
    sfx('draw');
    const nm = esc(byId.get(id).name), left = `saldo ${money(this.s.patrimonio)}`, d = this.panel === 'deck' && this.edDeck;
    if (d) {
      const why = this.whyNot(this.s, d.cards, id);
      if (!why) { this.touch(); this.deckWrite([...d.cards, id]); this.toast(`<b>${nm}</b><span>comprada e posta no deck (${this.edDeck.cards.length}/${DECK_RULES.size}) · ${left}</span>`, 'good'); return; }
      this.toast(`<b>${nm}</b><span>comprada · ${esc(why)} · ${left}</span>`, 'good'); return;
    }
    // fora do editor (loja ou coleção): diz que a carta não entrou em deck nenhum e oferece pôr no deck do duelo
    const s = this.s, act = Meta.activeDeck(s), can = !this.whyNot(s, act.cards, id);
    this.toast(`<b>${nm}</b><span>agora ${Math.min(Meta.owned(s, id), DECK_RULES.maxCopies)}/${DECK_RULES.maxCopies} na coleção · fora do deck do duelo · ${left}</span>${can ? `<button data-a="put-active" data-id="${id}">Pôr em "${esc(act.name)}"</button>` : ''}`, 'good');
  }
  /** abre a ficha flutuante da carta ao lado do elemento (ou fecha, com null), sem tapar o painel do deck nem sair da janela */
  peek(el) {
    const p = this.peekEl, id = el?.dataset?.card;
    if (!id || !byId.has(id)) { p.classList.add('hidden'); this.peekFor = null; return; }
    if (this.peekFor !== id) { p.innerHTML = C.cardSheet({ cardId: id }); this.peekFor = id; }
    p.classList.remove('hidden');
    const z = this.ui.scale, r = el.getBoundingClientRect(), W = window.innerWidth / z, H = window.innerHeight / z;
    const box = $('.lb-box', this.win)?.getBoundingClientRect(), side = $('.lb-side', this.win);
    const right = side && !side.contains(el) ? side.getBoundingClientRect().left / z : W;
    const top = box ? box.top / z + 10 : 10, bottom = box ? box.bottom / z - 10 : H - 10;
    const pw = p.offsetWidth, ph = p.offsetHeight, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    let x = r.right / z + 12; if (x + pw > right - 8) x = r.left / z - pw - 12;
    p.style.transform = `translate(${clamp(x, 10, W - pw - 10)}px, ${clamp(r.top / z - 6, top, Math.max(top, bottom - ph))}px)`;
  }
  /** cartas da coleção depois de busca, filtro de tipo, "só as que tenho" e ordenação */
  cardList(s) {
    const f = this.cf, norm = (t) => String(t ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const q = norm(f.q).trim(), RANK = { common: 0, rare: 1, legendary: 2 };
    const TYPE = { creature: (c) => !isFx(c), effect: (c) => c.kind === 'effect_instant', trap: (c) => c.kind === 'effect_trap' };
    const list = CARDS.filter((c) => (f.type === 'all' || TYPE[f.type](c)) && (!f.mine || Meta.owned(s, c.id) > 0)
      && (!q || norm(`${c.name} ${c.element} ${c.department} ${KIND[c.kind]}`).includes(q)));
    const by = { num: () => 0, name: (a, b) => a.name.localeCompare(b.name), atk: (a, b) => (b.atk ?? -1) - (a.atk ?? -1), def: (a, b) => (b.def ?? -1) - (a.def ?? -1), rarity: (a, b) => RANK[Meta.rarityOf(b.id)] - RANK[Meta.rarityOf(a.id)] }[f.sort] ?? (() => 0);
    return list.sort((a, b) => by(a, b) || a.id.localeCompare(b.id));
  }
  filtered() { const f = this.cf; return !!(f.q || f.type !== 'all' || f.mine); }
  vTools(s, shown) {
    const f = this.cf, T = [['all', 'Todas'], ['creature', 'Criaturas'], ['effect', 'Efeitos'], ['trap', 'Armadilhas']];
    const S = [['num', 'Número'], ['name', 'Nome'], ['atk', 'Maior ATQ'], ['def', 'Maior DEF'], ['rarity', 'Raridade']];
    return `<div class="lb-tools">
      <input id="lb-q" class="lb-search" type="search" value="${esc(f.q)}" placeholder="Nome, elemento, depto." spellcheck="false" autocomplete="off" aria-label="Buscar carta por nome, elemento ou departamento">
      <div class="lb-chips" role="group" aria-label="Tipo de carta">${T.map(([k, n]) => `<button data-a="cf-type" data-id="${k}" class="${f.type === k ? 'on' : ''}" aria-pressed="${f.type === k}">${n}</button>`).join('')}</div>
      <button data-a="cf-mine" class="lb-toggle ${f.mine ? 'on' : ''}" aria-pressed="${f.mine}" title="Esconde as cartas que você ainda não tem">Só as que tenho</button>
      <label class="lb-sort"><span>Ordem</span><select id="lb-sort">${S.map(([k, n]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      ${this.filtered() ? `<span class="lb-shown">${shown} de ${CARDS.length} <button data-a="cf-clear" class="ghost">Limpar filtros</button></span>` : ''}
    </div>`;
  }
  /** botão de compra avulsa direto na carta, com o preço; sem PATRIMÔNIO, diz quanto falta */
  buyBtn(s, id) {
    const p = Meta.priceOf(id), short = p - s.patrimonio, nb = (t) => t.replace(' ', ' ');
    return short > 0
      ? `<button class="lb-card__buy is-short" data-a="buy-card" data-id="${id}" disabled title="Faltam ${money(short)} de PATRIMÔNIO">${nb(money(p))}<small>faltam ${nb(money(short))}</small></button>`
      : `<button class="lb-card__buy" data-a="buy-card" data-id="${id}" title="Compra 1 cópia por ${money(p)}">Comprar ${nb(money(p))}</button>`;
  }
  /** as 3 bolinhas de cópia: no deck · tenho e está livre · não tenho; vermelha = o deck usa uma cópia que você não tem */
  pips(s, id, inDeck) {
    const has = Meta.owned(s, id), own = Math.min(has, DECK_RULES.maxCopies);
    const cls = (k) => (k < inDeck ? (k < own ? 'on' : 'over') : k < own ? 'own' : '');
    return `<span class="lb-pips" title="Você tem ${has} · ${inDeck} no deck">${Array.from({ length: DECK_RULES.maxCopies }, (_, k) => `<i class="${cls(k)}"></i>`).join('')}</span>`;
  }
  deckStats(cards) {
    const cs = cards.map((id) => byId.get(id)), crit = cs.filter((c) => !isFx(c));
    return {
      creatures: crit.length, effects: cs.filter((c) => c.kind === 'effect_instant').length, traps: cs.filter((c) => c.kind === 'effect_trap').length,
      sac: crit.filter((c) => c.cost > 0).length, atk: crit.length ? Math.round(crit.reduce((n, c) => n + c.atk, 0) / crit.length) : 0,
    };
  }
  /** "33 criaturas · 4 efeitos · 3 armadilhas", com os quadradinhos de cor da barra do editor */
  mix(st) {
    const pl = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    return `<span><i class="c"></i>${pl(st.creatures, 'criatura', 'criaturas')}</span><span><i class="e"></i>${pl(st.effects, 'efeito', 'efeitos')}</span><span><i class="t"></i>${pl(st.traps, 'armadilha', 'armadilhas')}</span>`;
  }
  /** as cartas de capa de um deck: as mais raras, depois as com mais cópias */
  faces(cards) {
    const RANK = { common: 0, rare: 1, legendary: 2 };
    return group(cards).sort((a, b) => RANK[Meta.rarityOf(b[0])] - RANK[Meta.rarityOf(a[0])] || b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([id]) => id);
  }
  /** erros que pedem conserto (a falta de cartas é só "em construção" e aparece no contador) */
  hardErrors(errs) { return errs.filter((e) => !e.startsWith('Faltam ')); }
  vDeck(s) {
    if (this.ed && !s.decks[this.ed.index]) this.ed = null;
    if (this.ed) return this.vEditor(s);
    const tabs = this.tabs('deck', [['decks', `Meus decks · ${s.decks.length}/${META.maxDecks}`], ['collection', `Coleção · ${Meta.distinctOwned(s)}/${CARDS.length}`]]);
    return `${tabs}<div class="lb-pad lb-fill">${this.tab.deck === 'collection' ? this.vCollection(s) : this.vDecks(s)}</div>`;
  }
  vDecks(s) {
    const back = backUrl(s.cosmetics.back, s.cosmetics.logo, asset('cards/back.png'));
    const folders = s.decks.map((d, i) => {
      const errs = Meta.deckErrors(s, d.cards), ok = !errs.length, on = i === s.activeDeck, st = this.deckStats(d.cards), faces = this.faces(d.cards);
      const first = this.hardErrors(errs)[0] ?? errs[0];
      return `<article class="lb-folder ${on ? 'is-active' : ''} ${ok ? '' : 'is-bad'}" data-deck="${i}">
        <p class="lb-folder__tab">${on ? '★ No duelo' : `Pasta ${String(i + 1).padStart(2, '0')}`}</p>
        <button class="lb-folder__open" data-a="deck-edit" data-id="${i}" title="Abrir para editar">
          <div class="lb-fan">${faces.length ? faces.map((id) => `<img src="${asset(byId.get(id).art)}" alt="">`).join('') : `<img src="${back}" alt=""><img src="${back}" alt="">`}</div>
          <h3 title="${esc(d.name)}">${esc(d.name)}</h3>
          <p class="lb-folder__count"><b>${d.cards.length}</b>/${DECK_RULES.size}</p>
          <p class="lb-mix">${this.mix(st)}</p>
          <p class="lb-folder__st">${ok ? 'Pronto para duelar' : esc(first)}</p>
        </button>
        <footer>
          ${on ? '<span class="lb-folder__on">★ No duelo</span>' : `<button data-a="deck-use" data-id="${i}" class="primary" ${ok ? '' : `disabled title="${esc(first)}"`}>Usar no duelo</button>`}
          <button data-a="deck-edit" data-id="${i}">Editar</button>
          <button data-a="deck-dup" data-id="${i}" class="ghost" title="Duplicar" ${s.decks.length >= META.maxDecks ? 'disabled' : ''}>Duplicar</button>
          <button data-a="deck-del" data-id="${i}" class="ghost" title="Apagar" ${s.decks.length <= 1 ? 'disabled' : ''}>Apagar</button>
        </footer></article>`;
    }).join('');
    const fresh = s.decks.length < META.maxDecks ? `<article class="lb-folder lb-folder--new">
        <p class="lb-folder__tab">Pasta vazia</p>
        <div><h3>Novo deck</h3><p>Comece do zero, ou deixe o arquivo montar ${DECK_RULES.size} cartas com o melhor da sua coleção e ajuste depois.</p></div>
        <footer><button data-a="deck-new" data-id="auto" class="primary">Montar automático</button><button data-a="deck-new" data-id="blank">Em branco</button></footer></article>` : '';
    return `<div class="lb-scroll lb-folders">${folders}${fresh}</div>
      <p class="fine">O deck marcado com ★ é o que vai para a sala de reunião e para o treino. Cada deck tem ${DECK_RULES.size} cartas, até ${DECK_RULES.maxCopies} cópias de cada.</p>`;
  }
  vCollection(s) {
    const list = this.cardList(s), copies = CARDS.reduce((n, c) => n + Meta.owned(s, c.id), 0), miss = CARDS.reduce((n, c) => n + Math.max(0, DECK_RULES.maxCopies - Meta.owned(s, c.id)), 0);
    const grid = list.map((c) => {
      const own = Meta.owned(s, c.id);
      return `<figure class="lb-card ${own ? '' : 'is-missing'}" data-card="${c.id}" tabindex="0" aria-label="${esc(c.name)}">
        <img loading="lazy" src="${asset(c.art)}" alt="${esc(c.name)}">
        <figcaption>${rarityTag(c.id)}${this.pips(s, c.id, 0)}<b class="${own ? '' : 'no'}">${own ? `×${own}` : 'falta'}</b></figcaption>
        ${own < DECK_RULES.maxCopies ? this.buyBtn(s, c.id) : ''}</figure>`;
    }).join('');
    return `${this.vTools(s, list.length)}
      <p class="fine">${Meta.distinctOwned(s)} de ${CARDS.length} cartas diferentes · ${copies} cópias no arquivo · ${miss ? `faltam ${miss} para ter ${DECK_RULES.maxCopies} de cada` : 'coleção completa'}</p>
      <div class="lb-scroll lb-grid lb-grid--big">${grid || '<p class="lb-empty">Nenhuma carta com esse filtro. <button data-a="cf-clear">Limpar filtros</button></p>'}</div>`;
  }
  vEditor(s) {
    const d = s.decks[this.ed.index], snap = this.ed.snap, counts = new Map(group(d.cards)), errs = Meta.deckErrors(s, d.cards), ok = !errs.length, hard = this.hardErrors(errs);
    const on = this.ed.index === s.activeDeck, st = this.deckStats(d.cards), n = d.cards.length, fresh = this.ed.fresh;
    const changed = d.name !== snap.name || sortCards(d.cards).join() !== snap.cards.join();
    const list = this.cardList(s);
    const grid = list.map((c) => {
      const own = Meta.owned(s, c.id), inDeck = counts.get(c.id) ?? 0, why = this.whyNot(s, d.cards, c.id), nm = esc(c.name);
      const needBuy = own < DECK_RULES.maxCopies && (own === 0 || inDeck >= own);
      return `<figure class="lb-card ${own ? '' : 'is-missing'} ${own && !inDeck && why ? 'is-used' : ''} ${inDeck ? 'is-in' : ''}" data-a="deck-add" data-card="${c.id}">
        <img loading="lazy" src="${asset(c.art)}" alt="${nm}">
        ${own ? `<div class="lb-card__ctl"><button data-a="deck-rem" data-card="${c.id}" class="${inDeck ? '' : 'is-off'}" aria-disabled="${!inDeck}" aria-label="Tirar uma ${nm}" title="Tirar uma (botão direito)">−</button><button data-a="deck-add" data-card="${c.id}" class="${why ? 'is-off' : ''}" aria-disabled="${!!why}" aria-label="Pôr uma ${nm}" title="${why ? esc(why) : 'Pôr uma (clique)'}">+</button></div>` : ''}
        ${needBuy ? this.buyBtn(s, c.id) : ''}
        <figcaption>${rarityTag(c.id)}${this.pips(s, c.id, inDeck)}<b class="${own ? '' : 'no'}">${own ? (inDeck ? `${inDeck} no deck` : '') : 'falta'}</b></figcaption></figure>`;
    }).join('');
    const GROUPS = [['Criaturas', (c) => !isFx(c)], ['Efeitos', (c) => c.kind === 'effect_instant'], ['Armadilhas', (c) => c.kind === 'effect_trap']];
    const rows = GROUPS.map(([title, test]) => {
      const g = [...counts.entries()].filter(([id]) => test(byId.get(id))); if (!g.length) return '';
      return `<li class="lb-group"><span>${title}</span><em>${g.reduce((a, [, k]) => a + k, 0)}</em></li>${g.map(([id, k]) => {
        const c = byId.get(id), why = this.whyNot(s, d.cards, id), has = Meta.owned(s, id), short = k > Math.min(has, DECK_RULES.maxCopies), nm = esc(c.name);
        return `<li class="lb-drow ${short ? 'is-short' : ''} ${fresh?.has(id) ? 'is-new' : ''}" data-card="${id}"><span class="lb-drow__art" style="background-image:url(${asset(c.art)})"></span><i>${k}×</i><span class="lb-drow__name" title="${nm}${short ? ` · você só tem ${has}` : ''}">${nm}</span>
          <em>${isFx(c) ? '' : `${c.cost ? `<b class="lb-sac" title="Pede ${c.cost} sacrifício${c.cost > 1 ? 's' : ''}">${'<i>✕</i>'.repeat(c.cost)}</b>` : ''}${c.atk}/${c.def}`}</em>
          <span class="lb-drow__ctl"><button data-a="deck-rem" data-card="${id}" aria-label="Tirar uma ${nm}" title="Tirar uma">−</button><button data-a="deck-add" data-card="${id}" class="${why ? 'is-off' : ''}" aria-disabled="${!!why}" aria-label="Pôr mais uma ${nm}" title="${why ? esc(why) : 'Pôr mais uma'}">+</button></span></li>`;
      }).join('')}`;
    }).join('');
    const seg = (k, cls) => (k ? `<i class="${cls}" style="flex:${k}"></i>` : '');
    const fixable = n < DECK_RULES.size || hard.length > 0;
    const state = ok ? 'ok' : hard.length ? 'is-bad' : 'is-short';
    return `<div class="lb-edbar">
        <button data-a="deck-back" class="ghost" title="Voltar para todos os decks (Esc)">← Todos os decks</button>
        <input id="lb-deck-name" maxlength="24" value="${esc(d.name)}" spellcheck="false" autocomplete="off" aria-label="Nome do deck" title="Nome do deck">
        <span class="lb-saved">Salvo sozinho</span>
        <button data-a="deck-undo" title="Volta o deck como estava quando você abriu" ${changed ? '' : 'hidden'}>Desfazer alterações</button>
        ${on ? '<span class="lb-folder__on">★ No duelo</span>' : `<button data-a="deck-use" data-id="${this.ed.index}" class="primary" ${ok ? '' : `disabled title="${esc(hard[0] ?? errs[0])}"`}>Usar no duelo</button>`}
      </div>
      <div class="lb-deck">
        <div class="lb-col">${this.vTools(s, list.length)}
          <div class="lb-scroll lb-grid">${grid || '<p class="lb-empty">Nenhuma carta com esse filtro. <button data-a="cf-clear">Limpar filtros</button></p>'}</div>
          <p class="fine lb-hintline">Clique numa carta para pôr · botão direito para tirar · passe o mouse para ler a ficha</p>
        </div>
        <aside class="lb-side">
          <div class="lb-count ${state}"><b>${n}</b>/${DECK_RULES.size}<span>${ok ? 'pronto para duelar' : hard.length ? 'arrume o aviso abaixo' : `faltam ${DECK_RULES.size - n}`}</span></div>
          <div class="lb-meter">${seg(st.creatures, 'c')}${seg(st.effects, 'e')}${seg(st.traps, 't')}${seg(Math.max(0, DECK_RULES.size - n), 'gap')}</div>
          <p class="lb-mix">${this.mix(st)}</p>
          <p class="lb-mix lb-mix--sub">ATQ médio ${st.atk ? money(st.atk) : '—'} · ${st.sac} pede${st.sac === 1 ? '' : 'm'} sacrifício</p>
          <ul class="lb-decklist">${rows || `<li class="lb-empty">Deck vazio.<br>Clique nas cartas ao lado ou use “Completar automático”.</li>`}</ul>
          ${hard.length ? `<ul class="lb-errs">${hard.slice(0, 3).map((e) => `<li>${esc(e)}</li>`).join('')}${hard.length > 3 ? `<li>e mais ${hard.length - 3}…</li>` : ''}</ul>` : ''}
          <div class="lb-actions">
            ${this.ed.prev ? `<button data-a="deck-unfill" title="Tira as cartas que o automático acabou de pôr">Desfazer o automático</button>` : `<button data-a="deck-fill" class="${fixable ? 'primary' : ''}" ${fixable ? '' : 'disabled'} title="Tira as cópias que você não tem e completa até ${DECK_RULES.size} com as melhores cartas livres da sua coleção (cerca de 1 efeito a cada 5 cartas, no máximo 6 que pedem sacrifício)">Completar automático</button>`}
            <button data-a="deck-clear" class="ghost" ${n ? '' : 'disabled'}>Esvaziar</button>
          </div>
        </aside></div>`;
  }
  vRecycle(s) {
    const list = CARDS.filter((c) => Meta.extrasOf(s, c.id) > 0), total = list.reduce((n, c) => n + Meta.extrasOf(s, c.id) * Meta.recycleValue(c.id), 0);
    return `<div class="lb-pad">
      <p class="lb-lead">Cada deck aceita até <b>${DECK_RULES.maxCopies} cópias</b> da mesma carta. O que passar disso não serve para nada: a trituradora devolve <b>${Math.round(META.recycleRate * 100)}%</b> do preço da carta em PATRIMÔNIO. Não tem volta.</p>
      ${list.length ? `<div class="lb-scroll lb-rows">${list.map((c) => { const n = Meta.extrasOf(s, c.id); return `<div class="lb-row"><img src="${asset(c.art)}" alt=""><div><b>${esc(c.name)}</b><span>${rarityTag(c.id)} ${RARITY_PT[Meta.rarityOf(c.id)]} · ${n} sobrando</span></div><em>+ ${money(n * Meta.recycleValue(c.id))}</em><button data-a="recycle" data-id="${c.id}">Triturar</button></div>`; }).join('')}</div>
      <div class="lb-actions"><button data-a="recycle" data-id="" class="primary">Triturar tudo · + ${money(total)}</button></div>`
    : '<p class="lb-empty big">A trituradora está com fome, mas você não tem nenhuma cópia sobrando.<br>Cópias extras aparecem nos pacotes quando a coleção está quase completa.</p>'}</div>`;
  }

  // ───────── sala de reunião e treino ─────────
  deckLine(s) { const d = Meta.activeDeck(s), ok = Meta.activeDeckValid(s); return `<div class="lb-deckline ${ok ? '' : 'bad'}"><span class="memo">Deck escolhido</span><b>${esc(d.name)}</b><span>${ok ? `${d.cards.length} cartas · pronto` : esc(Meta.deckErrors(s, d.cards)[0] ?? 'Deck inválido')}</span><button data-a="open" data-id="deck">Trocar no arquivo</button></div>`; }
  vDuel(s) {
    const c = s.campaign, N = CAMPAIGN.length, cleared = c.cleared, st = Math.min(c.stage, N - 1), tier = tierOf(st), boss = !cleared && tier === 3;
    const tierName = boss ? 'Chefe final' : CAMPAIGN.tiers[tier]?.name ?? '';
    const rec = (r) => s.stats.rivals[r] ?? { w: 0, l: 0 };
    // a escada: vencidas com nome, a da vez destacada, as próximas escondidas (o Conselho sempre aparece no topo)
    const rows = c.order.map((r, i) => {
      const done = i < c.stage, cur = !cleared && i === c.stage, last = i === N - 1;
      const head = CAMPAIGN.tiers.find((t) => t.from === i + 1);
      const label = done || cur || last ? esc(r) : '— — —';
      return `${head ? `<li class="lb-tier"><span>${esc(head.name)}</span><em>${head.from}–${head.to}</em></li>` : ''}${last ? '<li class="lb-tier"><span>Chefe final</span><em>30</em></li>' : ''}<li class="${done ? 'won' : ''} ${cur ? 'cur' : ''} ${last ? 'boss' : ''}"><span><i>${String(i + 1).padStart(2, '0')}</i> ${label}</span><em>${done ? 'vencida' : cur ? `${rec(r).l ? `${rec(r).l} derrota${rec(r).l > 1 ? 's' : ''}` : 'a seguir'}` : ''}</em></li>`;
    }).join('');
    const lead = cleared
      ? '<p class="lb-lead"><b>Campanha concluída.</b> O Conselho caiu e o mercado é seu. A porta continua aberta para <b>reuniões livres</b> contra qualquer uma das 30 empresas, no nível mais alto. Não avançam nada, mas pagam.</p>'
      : `<p class="lb-lead">São <b>${N} reuniões</b>, uma de cada vez. A dificuldade sobe de 10 em 10, e a última é contra <b>${esc(CAMPAIGN.boss.name)}</b>. Vença e o <b>CAIXA que restar</b> vira PATRIMÔNIO (multiplicado pela faixa). Perca e você tenta de novo a mesma reunião.</p>
        <div class="lb-next ${boss ? 'is-boss' : ''}"><p class="memo">Batalha ${st + 1} de ${N} · ${esc(tierName)}</p><h3>${esc(c.order[st])}</h3><p class="fine">${boss ? 'O deck mais forte do mercado e a IA mais afiada. Paga ×' + CAMPAIGN.boss.reward + '.' : tier === 0 ? 'Jogam com as mesmas cartas que você tem, e erram bastante. Paga ×1.' : tier === 1 ? 'Decks sorteados com todas as cartas do mercado. Paga ×1,5.' : 'Decks montados com estratégia e IA afiada. Paga ×2.'}</p></div>`;
    return `<div class="lb-pad lb-two">
      <div>
        ${lead}
        ${this.deckLine(s)}
        <div class="lb-actions"><button data-a="duel" class="primary big" ${Meta.activeDeckValid(s) ? '' : 'disabled'}>${cleared ? 'Reunião livre' : boss ? 'Enfrentar o Conselho' : 'Entrar na reunião'} <kbd>Enter</kbd></button><button data-a="open" data-id="training">Treinar antes</button></div>
        <p class="fine">Vitórias seguidas: ${s.stats.streak} · melhor sequência: ${s.stats.bestStreak}</p>
      </div>
      <div><p class="memo">Campanha · ${Math.min(c.stage, N)} de ${N} vencidas</p><ul class="lb-rivals lb-ladder lb-scroll">${rows}</ul></div></div>`;
  }
  vTraining(s) {
    return `<div class="lb-pad">
      <p class="lb-lead">O estagiário topa qualquer coisa. Ele joga com um deck sorteado das suas cartas e <b>erra de propósito</b> (ou não é de propósito). A partida <b>não paga PATRIMÔNIO</b>, não entra no histórico e não conta para metas nem conquistas. Serve para testar um deck novo sem risco.</p>
      ${this.deckLine(s)}
      <div class="lb-actions"><button data-a="train" class="primary big" ${Meta.activeDeckValid(s) ? '' : 'disabled'}>Treinar com o estagiário</button><button data-a="open" data-id="duel">Ir para o duelo valendo</button></div></div>`;
  }

  // ───────── mural: metas do dia ─────────
  vMissions(s) {
    const items = s.missions.list.map((m, i) => {
      const d = Meta.missionDef(m.id); if (!d) return '';
      const done = m.progress >= d.goal, pct = Math.round((Math.min(m.progress, d.goal) / d.goal) * 100), val = d.kind === 'damage' ? `${money(m.progress)} / ${money(d.goal)}` : `${m.progress} / ${d.goal}`;
      return `<article class="lb-memo ${m.claimed ? 'is-claimed' : done ? 'is-done' : ''}"><i class="lb-pin"></i><p class="memo">Memorando ${String(i + 1).padStart(2, '0')}</p><h3>${esc(d.text)}</h3>
        <div class="lb-prog"><b style="width:${pct}%"></b></div><p class="lb-progtxt">${val}</p>
        <footer><span>Paga ${money(d.reward)}</span>${m.claimed ? '<em>Resgatada</em>' : `<button data-a="claim" data-id="${i}" class="${done ? 'primary' : ''}" ${done ? '' : 'disabled'}>${done ? 'Resgatar' : 'Em andamento'}</button>`}</footer></article>`;
    }).join('');
    return `<div class="lb-pad"><p class="lb-lead">Três metas novas a cada dia, trocadas à meia-noite. Valem em duelos de verdade (treino não conta) e pagam <b>mesmo se você perder</b>.</p><div class="lb-memos">${items}</div></div>`;
  }

  // ───────── máquina de benefícios: loja ─────────
  /** atributos de um botão de compra da loja: desligado com "faltam $X" no title quando o PATRIMÔNIO não dá */
  priceAttrs(s, p, what = '') { return s.patrimonio >= p ? `title="${what ? `${esc(what)} por ` : 'Compra por '}${money(p)}"` : `disabled title="Faltam ${money(p - s.patrimonio)} de PATRIMÔNIO"`; }
  /** linha visível de "faltam $X" embaixo das compras grandes */
  shortLine(s, p) { return s.patrimonio < p ? `<p class="lb-short">Faltam ${money(p - s.patrimonio)} de PATRIMÔNIO</p>` : ''; }
  vShop(s) {
    const tabs = this.tabs('shop', [['packs', 'Pacotes'], ['cards', 'Cartas avulsas'], ['decks', 'Decks prontos'], ['look', 'Visual']]), t = this.tab.shop;
    const back = backUrl(s.cosmetics.back, s.cosmetics.logo, asset('cards/back.png')), max = DECK_RULES.maxCopies;
    // o que ainda dá para comprar nesta aba, para avisar quando o dinheiro não alcança nada
    const cheapest = {
      packs: META.booster.price,
      cards: Math.min(...CARDS.filter((c) => Meta.owned(s, c.id) < max).map((c) => Meta.priceOf(c.id))),
      decks: Math.min(...META.readyDecks.filter((d) => Meta.readyDeckOwnedIndex(s, d.id) < 0 || Object.keys(Meta.readyDeckMissing(s, d.id)).length).map((d) => Meta.readyDeckPrice(s, d.id))),
      look: Math.min(...META.cosmetics.filter((c) => !s.cosmetics.owned.includes(c.id)).map((c) => c.price)),
    }[t];
    const broke = Number.isFinite(cheapest) && s.patrimonio < cheapest ? `<div class="lb-broke"><span><b>Sem verba para esta prateleira.</b> Vença uma reunião (o CAIXA que sobra vira PATRIMÔNIO), resgate metas no mural ou triture cópias sobrando.</span><button data-a="open" data-id="duel">Sala de reunião</button><button data-a="open" data-id="missions">Mural</button></div>` : '';
    let body = '';
    if (t === 'packs') {
      const b = META.booster, o = b.odds, tot = o.common + o.rare + o.legendary, miss = CARDS.reduce((n, c) => n + Math.max(0, max - Meta.owned(s, c.id)), 0);
      body = `<div class="lb-packshop"><div class="lb-packart"><img src="${back}" alt=""><img src="${back}" alt=""><img src="${back}" alt=""></div>
        <div><h3>Envelope pardo lacrado</h3><p class="lb-lead">${b.size} cartas sorteadas. Enquanto faltar carta no seu arquivo, o envelope <b>nunca entrega cópia sobrando</b>.</p>
        <ul class="lb-odds"><li>${rarityTag('BCB-001')} Comum <b>${Math.round((o.common / tot) * 100)}%</b></li><li><i class="lb-rar lb-rar--rare"></i> Rara <b>${Math.round((o.rare / tot) * 100)}%</b></li><li><i class="lb-rar lb-rar--legendary"></i> Lendária <b>${Math.round((o.legendary / tot) * 100)}%</b></li></ul>
        <div class="lb-actions"><button data-a="buy-pack" class="primary big" ${this.priceAttrs(s, b.price, 'Compra e abre o envelope')}>Comprar e abrir · ${money(b.price)}</button></div>
        ${this.shortLine(s, b.price)}
        ${miss ? `<button data-a="tab" data-id="cards" class="lb-linkish">Faltam <b>${miss}</b> cópias para completar o arquivo · ver cartas avulsas →</button>` : '<p class="fine">Arquivo completo: daqui em diante os envelopes só trazem cópias para a trituradora (25% do preço de volta).</p>'}</div></div>`;
    } else if (t === 'cards') {
      // ordem fixa (a numeração), as 19 cabem em 2 fileiras; a que você não tem fica marcada como "nova", sem trocar de lugar
      body = `<div class="lb-scroll lb-grid lb-grid--shop">${CARDS.map((c) => {
        const own = Meta.owned(s, c.id), full = own >= max, extra = Meta.extrasOf(s, c.id), state = own ? (full ? 'full' : 'part') : 'new';
        const count = own ? `${Math.min(own, max)}/${max}${extra ? ` <em>+${extra}</em>` : ''}` : 'nova';
        const btn = !full ? this.buyBtn(s, c.id)
          : extra ? `<button data-a="open" data-id="recycle" class="lb-card__buy lb-card__extra" title="${extra} cópia${extra > 1 ? 's' : ''} sobrando valem ${money(extra * Meta.recycleValue(c.id))} na trituradora">Triturar ${extra}<small>+ ${money(extra * Meta.recycleValue(c.id)).replace(' ', ' ')}</small></button>`
            : `<button disabled title="Você já tem as ${max} que cabem num deck">Completa</button>`;
        return `<figure class="lb-card is-${state}" data-card="${c.id}"><img loading="lazy" src="${asset(c.art)}" alt="${esc(c.name)}"><figcaption>${rarityTag(c.id)}<span>${RARITY_PT[Meta.rarityOf(c.id)]}</span><b class="${state}">${count}</b></figcaption>${btn}</figure>`;
      }).join('')}</div>`;
    } else if (t === 'decks') {
      const RANK = { common: 0, rare: 1, legendary: 2 }, full = s.decks.length >= META.maxDecks;
      body = `<div class="lb-scroll lb-rows">${META.readyDecks.map((d) => {
        const miss = Meta.readyDeckMissing(s, d.id), ids = Object.keys(miss), copies = Object.values(miss).reduce((a, b) => a + b, 0), twin = Meta.readyDeckOwnedIndex(s, d.id), price = Meta.readyDeckPrice(s, d.id);
        // o leque mostra o que vai chegar (as mais raras na frente); sem nada a chegar, as cartas do deck esmaecidas
        const show = (ids.length ? ids : Object.keys(d.cards)).sort((a, b) => RANK[Meta.rarityOf(b)] - RANK[Meta.rarityOf(a)] || a.localeCompare(b)).slice(0, 5);
        const fan = show.map((id) => `<span class="lb-fanc ${ids.length ? '' : 'is-used'}" data-card="${id}"><img src="${asset(byId.get(id).art)}" alt="${esc(byId.get(id).name)}">${ids.length ? `<b>×${miss[id]}</b>` : ''}</span>`).join('');
        const leg = ids.filter((id) => Meta.rarityOf(id) === 'legendary').length, rare = ids.filter((id) => Meta.rarityOf(id) === 'rare').length;
        const gain = ids.length
          ? `Chegam <b>${copies} cópia${copies > 1 ? 's' : ''}</b> de ${ids.length} carta${ids.length > 1 ? 's' : ''}${leg || rare ? ` (${[leg && `${leg} lendária${leg > 1 ? 's' : ''}`, rare && `${rare} rara${rare > 1 ? 's' : ''}`].filter(Boolean).join(', ')})` : ''} · avulsas, sairiam por <b>${money(Meta.readyDeckValue(s, d.id))}</b>`
          : 'Você já tem todas as cartas: guardar a lista sai de graça';
        let btn;
        if (twin >= 0 && !ids.length) btn = `<button data-a="deck-open" data-id="${twin}" title="Abre &quot;${esc(s.decks[twin].name)}&quot; no Arquivo">No arquivo · abrir</button>`;
        else if (full && twin < 0) btn = `<button disabled title="Arquivo cheio (${META.maxDecks}/${META.maxDecks}): apague um deck no Arquivo para comprar">Arquivo cheio</button>`;
        else btn = `<button data-a="buy-deck" data-id="${d.id}" class="${price ? 'primary' : ''}" aria-label="${price ? `Comprar o deck ${esc(d.name)} por ${money(price)}` : `Guardar a lista de ${esc(d.name)} de graça`}" ${this.priceAttrs(s, price, `Comprar ${d.name}`)}>${price ? `Comprar · ${money(price)}` : 'Guardar lista · grátis'}</button>`;
        return `<div class="lb-row lb-row--deck"><div class="lb-fan">${fan}</div><div><b>${esc(d.name)}</b><span>${esc(d.text)}</span><span class="lb-deckgain">${gain}</span><span class="fine">A lista vai para o Arquivo e vira o deck do duelo.</span></div><div class="lb-row__buy">${btn}${price ? this.shortLine(s, price) : ''}</div></div>`;
      }).join('')}</div>`;
    } else {
      const item = (c) => { const own = s.cosmetics.owned.includes(c.id), on = s.cosmetics[c.kind] === c.id, img = c.kind === 'logo' ? logoUrl(c.id) : backUrl(c.id, s.cosmetics.logo, asset('cards/back.png')); return `<figure class="lb-cos lb-cos--${c.kind} ${on ? 'on' : ''}"><img src="${img}" alt="${esc(c.name)}"><figcaption>${esc(c.name)}</figcaption>${own ? `<button data-a="equip" data-id="${c.id}" ${on ? 'disabled' : ''}>${on ? 'Em uso' : 'Usar'}</button>` : `<button data-a="buy-cos" data-id="${c.id}" class="primary" ${this.priceAttrs(s, c.price, `Comprar e usar ${c.name}`)}>Comprar · ${money(c.price)}</button>`}</figure>`; };
      body = `<div class="lb-scroll"><p class="memo">Logo da empresa</p><div class="lb-cosgrid">${META.cosmetics.filter((c) => c.kind === 'logo').map(item).join('')}</div><p class="memo">Verso das cartas (o logo vai no meio)</p><div class="lb-cosgrid">${META.cosmetics.filter((c) => c.kind === 'back').map(item).join('')}</div></div>`;
    }
    return `${tabs}<div class="lb-pad lb-fill" role="tabpanel">${broke}${body}</div>`;
  }
  // ───────── abertura de pacote ─────────
  // Cada carta vira com um clique nela ou com Enter/botão (a próxima fechada). Carta virada não fecha nada: só o botão
  // guarda. Esc vira todas de uma vez e, com todas viradas, guarda. Enter segurado e clique duplo não pulam a revelação.
  openPack(cards) {
    this.pack = { cards, open: new Set(), t0: performance.now(), lock: 0 };
    const s = this.s, back = backUrl(s.cosmetics.back, s.cosmetics.logo, asset('cards/back.png'));
    const el = $('.lb-pack', this.root); el.classList.remove('hidden'); this.root.classList.add('is-pack');
    el.innerHTML = `<p class="memo">Envelope pardo · conteúdo não conferido</p><div class="lb-packrow">${cards.map((c, i) => `<div class="lb-flip lb-flip--${c.rarity}" data-i="${i}" data-a="pack-flip" data-id="${i}"><div class="lb-flip__in"><img class="lb-flip__back" src="${back}" alt="Carta fechada"><div class="lb-flip__front"><img src="${asset(byId.get(c.cardId).art)}" alt=""><span aria-live="polite"></span></div></div></div>`).join('')}</div>
      <p class="lb-packsum" aria-live="polite"></p>
      <div class="lb-actions"><button data-a="pack-next" class="primary big" id="lb-pack-btn">Virar carta <kbd>Enter</kbd></button><span class="fine">Esc vira todas</span></div>`;
    $('#lb-pack-btn', el).focus({ preventScroll: true });
    sfx('start');
  }
  /** vira a carta i (se ainda estiver fechada) */
  packFlip(i) {
    const p = this.pack; if (!p || p.open.has(i) || !p.cards[i]) return;
    p.open.add(i); p.lock = performance.now() + 300;
    const c = p.cards[i], d = byId.get(c.cardId), el = $('.lb-pack', this.root), f = $(`.lb-flip[data-i="${i}"]`, el);
    f.classList.add('on'); f.dataset.card = c.cardId; f.removeAttribute('data-a');
    $('.lb-flip__front img', f).alt = d.name;
    const tag = c.extra ? `<i>sobra · + ${money(Meta.recycleValue(c.cardId))} na trituradora</i>` : c.isNew ? '<b>NOVA</b>' : c.count >= DECK_RULES.maxCopies ? '<b class="done">3/3 completa</b>' : '';
    $('.lb-flip__front span', f).innerHTML = `${tag}<em>${esc(d.name)}</em>${RARITY_PT[c.rarity]}${c.extra || c.isNew || c.count >= DECK_RULES.maxCopies ? '' : ` · ${c.count}/${DECK_RULES.maxCopies}`}`;
    sfx(c.rarity === 'legendary' ? 'effect' : c.rarity === 'rare' ? 'summon' : 'draw');
    if (p.open.size === p.cards.length) this.packDone();
  }
  /** todas viradas: resumo e o botão vira "Guardar no arquivo" */
  packDone() {
    const p = this.pack, el = $('.lb-pack', this.root), n = p.cards.filter((c) => c.isNew).length, done = p.cards.filter((c) => !c.extra && c.count >= DECK_RULES.maxCopies).length, extra = p.cards.filter((c) => c.extra).length;
    const parts = [n && `${n} nova${n > 1 ? 's' : ''}`, done && `${done} ${done > 1 ? 'completaram' : 'completou'} 3/3`, extra && `${extra} sobra${extra > 1 ? 's' : ''} para a trituradora`].filter(Boolean);
    p.summary = parts.join(' · ') || 'cópias para os seus decks';
    $('.lb-packsum', el).textContent = p.summary;
    $('#lb-pack-btn', el).innerHTML = 'Guardar no arquivo <kbd>Enter</kbd>';
    $('.lb-pack .fine', this.root).textContent = 'Passe o mouse numa carta para ler a ficha';
  }
  /** botão/Enter: vira a próxima fechada; com todas viradas, guarda e fecha */
  packNext() {
    const p = this.pack; if (!p || performance.now() < p.lock) return;
    const next = p.cards.findIndex((_, i) => !p.open.has(i));
    if (next >= 0) return this.packFlip(next);
    return this.packClose();
  }
  packClose() {
    const p = this.pack; if (!p) return;
    const el = $('.lb-pack', this.root); this.pack = null; this.peek(null);
    el.classList.add('hidden'); el.innerHTML = ''; this.root.classList.remove('is-pack'); sfx('navBack');
    this.toast(`<b>${p.cards.length} cartas no arquivo</b><span>${esc(p.summary ?? '')}</span><button data-a="open" data-id="deck" data-tab="collection">Ver na coleção</button>`, 'gold');
    $('[data-a="buy-pack"]', this.win)?.focus({ preventScroll: true });
  }
  /** Esc: vira todas; se já estão viradas, guarda */
  packSkip() {
    const p = this.pack; if (!p) return;
    if (p.open.size < p.cards.length) { p.cards.forEach((_, i) => this.packFlip(i)); p.lock = performance.now() + 300; return; }
    this.packClose();
  }

  // ───────── troféus e recepção ─────────
  vAchievements(s) {
    const got = META.achievements.filter((a) => s.achievements[a.id] !== undefined).length;
    return `<div class="lb-pad"><p class="lb-lead"><b>${got} de ${META.achievements.length}</b> troféus na prateleira. Cada um paga um bônus de PATRIMÔNIO na hora em que é conquistado.</p>
      <div class="lb-scroll lb-trophies">${META.achievements.map((a) => { const on = s.achievements[a.id] !== undefined; return `<article class="${on ? 'on' : ''}"><i>${on ? '★' : '?'}</i><div><b>${esc(a.name)}</b><span>${esc(a.text)}</span></div><em>${on ? 'pago' : money(a.reward)}</em></article>`; }).join('')}</div></div>`;
  }
  vProfile(s) {
    const tabs = this.tabs('profile', [['card', 'Ficha'], ['history', 'Histórico'], ['look', 'Visual']]), t = this.tab.profile, st = s.stats;
    let body = '';
    if (t === 'card') {
      const fav = Meta.favoriteCard(s);
      body = `<div class="lb-id"><div class="lb-idcard"><img src="${logoUrl(s.cosmetics.logo)}" alt=""><p class="memo">Razão social</p><h3>${esc(this.company())}</h3><button data-a="rename">Mudar o nome</button></div>
        <dl class="lb-stats"><div><dt>Partidas</dt><dd>${st.games}</dd></div><div><dt>Vitórias</dt><dd>${st.wins}</dd></div><div><dt>Derrotas</dt><dd>${st.losses}</dd></div><div><dt>Aproveitamento</dt><dd>${Meta.winRate(s)}%</dd></div>
          <div><dt>Melhor sequência</dt><dd>${st.bestStreak}</dd></div><div><dt>Maior golpe</dt><dd>${money(st.biggestHit)}</dd></div><div><dt>Já faturou</dt><dd>${money(st.earned)}</dd></div><div><dt>Pacotes abertos</dt><dd>${st.packs}</dd></div>
          <div class="wide"><dt>Carta mais usada</dt><dd>${fav ? `${esc(byId.get(fav)?.name ?? fav)} · ${st.plays[fav]}×` : 'nenhuma ainda'}</dd></div><div class="wide"><dt>Coleção</dt><dd>${Meta.distinctOwned(s)} de ${CARDS.length} cartas</dd></div></dl></div>
        <p class="fine lb-wipe"><button data-a="wipe" class="ghost">Recomeçar do zero</button></p>`;
    } else if (t === 'history') {
      body = s.history.length ? `<div class="lb-scroll"><table class="lb-hist"><thead><tr><th>Quando</th><th>Rival</th><th>Resultado</th><th>Turnos</th><th>CAIXA final</th><th>Recebido</th></tr></thead><tbody>${s.history.map((h) => `<tr class="${h.result}"><td>${dateStr(h.at)}</td><td>${esc(h.rival)}</td><td><b>${h.result === 'win' ? 'Vitória' : h.result === 'loss' ? 'Derrota' : 'Empate'}</b></td><td>${h.turns}</td><td>${money(h.caixa[0])} × ${money(h.caixa[1])}</td><td>${h.reward ? `+ ${money(h.reward)}` : '—'}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="lb-empty big">Nenhuma reunião registrada. A porta do fundo está entreaberta.</p>';
    } else {
      const item = (c) => { const own = s.cosmetics.owned.includes(c.id), on = s.cosmetics[c.kind] === c.id, img = c.kind === 'logo' ? logoUrl(c.id) : backUrl(c.id, s.cosmetics.logo, asset('cards/back.png')); return `<figure class="lb-cos lb-cos--${c.kind} ${on ? 'on' : ''} ${own ? '' : 'is-locked'}"><img src="${img}" alt=""><figcaption>${esc(c.name)}</figcaption>${own ? `<button data-a="equip" data-id="${c.id}" ${on ? 'disabled' : ''}>${on ? 'Em uso' : 'Usar'}</button>` : `<button data-a="open" data-id="shop" data-tab="look">${money(c.price)} na loja</button>`}</figure>`; };
      body = `<div class="lb-scroll"><p class="memo">Logo da empresa · aparece no crachá, no monitor da recepção e no verso das cartas</p><div class="lb-cosgrid">${META.cosmetics.filter((c) => c.kind === 'logo').map(item).join('')}</div><p class="memo">Verso das suas cartas no duelo</p><div class="lb-cosgrid">${META.cosmetics.filter((c) => c.kind === 'back').map(item).join('')}</div></div>`;
    }
    return `${tabs}<div class="lb-pad lb-fill">${body}</div>`;
  }
}
export { MAX_NAME, cleanName };
