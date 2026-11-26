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
  duel: ['Sala de reunião · porta entreaberta', 'Iniciar duelo'], training: ['Mesa do estagiário', 'Treino sem valer'],
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
    this.on = false; this.panel = null; this.tab = {}; this.ed = null; this.pack = null; this.hoverCard = null; this.filter = 'all';
    const root = document.createElement('div'); root.id = 'lobby'; root.className = 'hidden';
    root.innerHTML = `
      <div class="lb-badge" data-a="open" data-id="profile" title="Perfil da empresa"></div>
      <div class="lb-top"><button class="lb-exit" data-a="exit">← Sair para a rua</button></div>
      <div class="lb-labels"></div>
      <nav class="lb-nav"></nav>
      <div class="lb-hint">Clique num objeto da sala</div>
      <div class="lb-win hidden"></div>
      <div class="lb-pack hidden"></div>
      <div class="lb-toasts"></div>`;
    ui.root.appendChild(root);
    this.root = root; this.win = $('.lb-win', root); this.labels = $('.lb-labels', root);
    $('.lb-nav', root).innerHTML = AREAS.map(([id, name], i) => `<button data-a="open" data-id="${id}"><kbd>${i + 1}</kbd><span>${name}</span><b class="lb-dot hidden"></b></button>`).join('');
    this.labels.innerHTML = lobby.hot.map((h) => `<button class="lb-label" data-a="open" data-id="${h.id}"><b>${esc(h.label)}</b><span>${esc(h.sub)}</span><i class="lb-dot hidden"></i></button>`).join('');
    this.labelEls = new Map([...this.labels.children].map((el) => [el.dataset.id, el]));

    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('contextmenu', (e) => { const t = e.target.closest('[data-card]'); if (t && this.panel === 'deck') { e.preventDefault(); this.deckRemove(t.dataset.card); } });
    root.addEventListener('pointerover', (e) => {
      const b = e.target.closest('[data-a="open"]'); if (b && !this.panel) lobby.setHover(b.dataset.id);
      const c = e.target.closest('[data-card]'); if (c && c.dataset.card !== this.hoverCard) { this.hoverCard = c.dataset.card; this.renderPreview(); }
    });
    root.addEventListener('pointerout', (e) => { if (e.target.closest('[data-a="open"]') && !this.panel) lobby.setHover(null); });
    root.addEventListener('input', (e) => { if (e.target.id === 'lb-deck-name' && this.ed) { this.ed.name = e.target.value; this.ed.dirty = true; sfx('type'); this.syncDeckButtons(); } });
    canvas.addEventListener('pointermove', (e) => { if (!this.on || this.panel) return; const id = lobby.pick(e.clientX / window.innerWidth, e.clientY / window.innerHeight); if (id !== lobby.hover) { lobby.setHover(id); if (id) sfx('hover'); } canvas.style.cursor = id ? 'pointer' : ''; });
    canvas.addEventListener('click', (e) => { if (!this.on || this.panel) return; const id = lobby.pick(e.clientX / window.innerWidth, e.clientY / window.innerHeight); if (id) this.open(id); });
    window.addEventListener('keydown', (e) => {
      if (!this.on || e.target.tagName === 'INPUT' || !$('#modal').classList.contains('hidden')) return;
      if (e.key === 'Escape') { if (this.pack) return; if (this.panel) { this.close(); e.stopPropagation(); } return; }
      if (this.pack) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.packNext(); } return; }
      const n = Number(e.key); if (!this.panel && n >= 1 && n <= AREAS.length) this.open(AREAS[n - 1][0]);
      if (this.panel === 'duel' && e.key === 'Enter') this.startDuel(false);
    });
    save.onChange(() => { if (this.on) this.sync(); });
    settings.onChange(() => { if (this.on) this.sync(); });
  }

  // ───────── ciclo ─────────
  show(on) {
    this.on = on; this.root.classList.toggle('hidden', !on);
    if (!on) { this.panel = null; this.win.classList.add('hidden'); this.lobby.setHover(null); this.canvas.style.cursor = ''; return; }
    this.sync();
  }
  get s() { return save.get(); }
  company() { return settings.get().companyName ?? 'SUA EMPRESA'; }
  /** atualiza crachá, avisos de "tem coisa nova" e a tela aberta */
  sync() {
    const s = this.s;
    $('.lb-badge', this.root).innerHTML = `<img src="${logoUrl(s.cosmetics.logo)}" alt=""><div><b>${esc(this.company())}</b><span>Patrimônio <em>${money(s.patrimonio)}</em></span></div>`;
    this.lobby.setCompany({ name: this.company(), logo: s.cosmetics.logo, patrimonio: s.patrimonio });
    const dots = { missions: Meta.claimableMissions(s) > 0, recycle: Meta.totalExtras(s) > 0, deck: !Meta.activeDeckValid(s) };
    for (const [id] of AREAS) { const on = !!dots[id]; $(`.lb-nav [data-id="${id}"] .lb-dot`, this.root)?.classList.toggle('hidden', !on); this.labelEls.get(id)?.querySelector('.lb-dot').classList.toggle('hidden', !on); }
    if (this.panel) this.render();
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
  }
  toast(text, tone = '') {
    const el = document.createElement('div'); el.className = `lb-toast ${tone}`; el.innerHTML = text;
    $('.lb-toasts', this.root).appendChild(el); setTimeout(() => el.classList.add('out'), 3600); setTimeout(() => el.remove(), 4200);
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
    out.missionsDone.forEach((m, i) => setTimeout(() => this.toast(`<b>Meta cumprida</b><span>${esc(m.text)} · resgate ${money(m.reward)} no mural</span>`, 'good'), 300 + i * 700));
    this.announce(out.unlocked);
  }

  // ───────── janelas ─────────
  open(id, opts = {}) {
    if (id === 'settings') { sfx('select'); this.ui.settings(); return; }
    if (!TITLES[id]) return;
    sfx('select'); this.panel = id; this.lobby.setHover(id); this.canvas.style.cursor = '';
    if (opts.tab) this.tab[id] = opts.tab;
    if (id === 'deck') { const s = this.s; this.loadDeck(this.ed?.index ?? s.activeDeck); }
    this.win.classList.remove('hidden'); this.render();
  }
  close() { if (!this.panel) return; if (this.panel === 'deck' && this.ed?.dirty && !this._leaving) { this._leaving = true; this.toast('Deck não salvo. Feche de novo para descartar.', 'bad'); sfx('deny'); return; } this._leaving = false; this.panel = null; this.win.classList.add('hidden'); this.lobby.setHover(null); sfx('cancel'); }
  render() {
    const id = this.panel, [memo, title] = TITLES[id], s = this.s;
    const body = { deck: () => this.vDeck(s), recycle: () => this.vRecycle(s), duel: () => this.vDuel(s), training: () => this.vTraining(s), missions: () => this.vMissions(s), shop: () => this.vShop(s), achievements: () => this.vAchievements(s), profile: () => this.vProfile(s) }[id]();
    const scroll = $('.lb-scroll', this.win)?.scrollTop ?? 0, scroll2 = $('.lb-decklist', this.win)?.scrollTop ?? 0, focus = document.activeElement?.id;
    this.win.innerHTML = `<section class="lb-box lb-box--${id}">
      <header><div><p class="memo">${esc(memo)}</p><h2>${esc(title)}</h2></div><div class="lb-pat">Patrimônio <b>${money(s.patrimonio)}</b></div><button class="lb-x" data-a="close" title="Fechar (Esc)">✕</button></header>
      ${body}</section>`;
    const sc = $('.lb-scroll', this.win); if (sc) sc.scrollTop = scroll; const dl = $('.lb-decklist', this.win); if (dl) dl.scrollTop = scroll2;
    if (focus === 'lb-deck-name') { const i = $('#lb-deck-name', this.win); i?.focus(); i?.setSelectionRange(i.value.length, i.value.length); }
    if (id === 'deck') this.renderPreview();
  }
  tabs(id, list) { const cur = this.tab[id] ?? list[0][0]; this.tab[id] = cur; return `<div class="lb-tabs">${list.map(([k, n]) => `<button data-a="tab" data-id="${k}" class="${k === cur ? 'on' : ''}">${n}</button>`).join('')}</div>`; }

  onClick(e) {
    if (e.target === this.win) return this.close();
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    const a = b.dataset.a, id = b.dataset.id;
    switch (a) {
      case 'open': return this.open(id, { tab: b.dataset.tab });
      case 'close': return this.close();
      case 'exit': sfx('cancel'); return this.actions.exit();
      case 'tab': this.tab[this.panel] = id; sfx('select'); return this.render();
      case 'filter': this.filter = id; sfx('select'); return this.render();
      // decks
      case 'deck-pick': if (this.ed?.dirty) { this.toast('Salve ou descarte antes de trocar.', 'bad'); return sfx('deny'); } this.loadDeck(Number(id)); sfx('select'); return this.render();
      case 'deck-new': if (this.ed?.dirty) { this.toast('Salve ou descarte antes de criar outro.', 'bad'); return sfx('deny'); } this.ed = { index: -1, name: `Deck ${this.s.decks.length + 1}`, cards: [], dirty: true }; sfx('select'); return this.render();
      case 'deck-add': return this.deckAdd(b.dataset.card);
      case 'deck-rem': return this.deckRemove(b.dataset.card);
      case 'deck-save': return this.deckSave();
      case 'deck-undo': this.loadDeck(this.ed.index < 0 ? this.s.activeDeck : this.ed.index); sfx('cancel'); return this.render();
      case 'deck-use': if (this.commit(Meta.setActiveDeck(this.s, this.ed.index), 'Deck escolhido para o duelo.')) sfx('select'); return undefined;
      case 'deck-del': return this.ui.confirm('Apagar este deck?', `"${this.ed.name}" sai do arquivo. As cartas continuam na sua coleção.`, 'APAGAR', () => { const i = this.ed.index; this.ed = null; if (this.commit(Meta.deleteDeck(this.s, i))) { this.loadDeck(this.s.activeDeck); this.render(); } });
      // reciclar
      case 'recycle': { const r = Meta.recycle(this.s, id || null, Date.now()); if (this.commit(r)) { sfx('sacrifice'); this.toast(`<b>${r.count} carta${r.count > 1 ? 's' : ''} triturada${r.count > 1 ? 's' : ''}</b><span>+ ${money(r.gained)} de PATRIMÔNIO</span>`, 'good'); } return undefined; }
      // loja
      case 'buy-card': if (this.commit(Meta.buySingle(this.s, id, Date.now()), `<b>${esc(byId.get(id).name)}</b><span>foi para o seu arquivo</span>`)) sfx('draw'); return undefined;
      case 'buy-pack': { const r = Meta.buyBooster(this.s, Date.now()); if (this.commit(r)) this.openPack(r.cards); return undefined; }
      case 'buy-deck': { const d = META.readyDecks.find((x) => x.id === id), r = Meta.buyReadyDeck(this.s, id, Date.now()); if (this.commit(r, `<b>${esc(d.name)}</b><span>já está no arquivo e escolhido para o duelo</span>`)) { sfx('summon'); this.ed = null; } return undefined; }
      case 'buy-cos': if (this.commit(Meta.buyCosmetic(this.s, id, Date.now()), 'Comprado. Use na recepção, aba Visual.')) sfx('draw'); return undefined;
      case 'equip': if (this.commit(Meta.equipCosmetic(this.s, id, Date.now()))) sfx('select'); return undefined;
      case 'pack-next': return this.packNext();
      // metas
      case 'claim': { const r = Meta.claimMission(this.s, Number(id), Date.now()); if (this.commit(r)) { sfx('heal'); this.toast(`<b>Meta resgatada</b><span>+ ${money(r.reward)} de PATRIMÔNIO</span>`, 'good'); } return undefined; }
      // duelo
      case 'duel': return this.startDuel(false);
      case 'train': return this.startDuel(true);
      // perfil
      case 'rename': return this.ui.nameEntry(() => { this.sync(); this.toast('Razão social alterada.', 'good'); });
      case 'wipe': return this.ui.confirm('Recomeçar do zero?', 'Coleção, decks, PATRIMÔNIO, histórico e conquistas serão apagados para sempre.', 'APAGAR TUDO', () => { this.ed = null; save.reset(); this.toast('Ficha cadastral apagada. Bem-vindo de novo.', 'bad'); });
      default: return undefined;
    }
  }
  startDuel(training) {
    if (!Meta.activeDeckValid(this.s)) { sfx('deny'); this.toast('Deck inválido. Arrume no arquivo.', 'bad'); return; }
    this.panel = null; this.win.classList.add('hidden');
    this.actions.duel(training);
  }

  // ───────── arquivo: decks e coleção ─────────
  loadDeck(index) { const s = this.s, d = s.decks[index] ?? s.decks[0]; this.ed = { index: s.decks[index] ? index : 0, name: d.name, cards: sortCards(d.cards), dirty: false }; }
  deckAdd(cardId) {
    const ed = this.ed, s = this.s, n = ed.cards.filter((x) => x === cardId).length;
    const why = ed.cards.length >= DECK_RULES.size ? `O deck já tem ${DECK_RULES.size} cartas.` : n >= DECK_RULES.maxCopies ? `Máximo de ${DECK_RULES.maxCopies} cópias por carta.` : n >= Meta.owned(s, cardId) ? (Meta.owned(s, cardId) ? 'Sem mais cópias desta carta.' : 'Você não tem esta carta. Procure na loja.') : null;
    if (why) { sfx('deny'); this.toast(why, 'bad'); return; }
    ed.cards = sortCards([...ed.cards, cardId]); ed.dirty = true; sfx('card'); this.render();
  }
  deckRemove(cardId) { const ed = this.ed, i = ed.cards.indexOf(cardId); if (i < 0) return; ed.cards.splice(i, 1); ed.dirty = true; sfx('cancel'); this.render(); }
  deckSave() {
    const ed = this.ed, r = Meta.saveDeck(this.s, ed.index, { name: ed.name, cards: ed.cards }, Date.now());
    if (!r.ok) return this.commit(r);
    ed.index = r.index; ed.dirty = false;
    const errs = Meta.deckErrors(r.save, ed.cards);
    this.commit(r, errs.length ? 'Salvo como rascunho (ainda não duela).' : 'Deck salvo.'); sfx('select');
    return undefined;
  }
  syncDeckButtons() { const b = $('[data-a="deck-save"]', this.win); if (b) b.disabled = !this.ed.dirty; }
  renderPreview() {
    const el = $('.lb-preview', this.win); if (!el) return;
    const id = this.hoverCard; if (!id || !byId.has(id)) { el.innerHTML = '<p class="lb-empty">Mouse na carta: ficha.</p>'; return; }
    el.innerHTML = `<img src="${asset(byId.get(id).art)}" alt="">${C.cardSheet({ cardId: id })}`;
  }
  vDeck(s) {
    const ed = this.ed, counts = new Map(group(ed.cards)), errs = Meta.deckErrors(s, ed.cards), full = ed.cards.length === DECK_RULES.size;
    const F = [['all', 'Todas'], ['creature', 'Criaturas'], ['fx', 'Efeitos'], ['missing', 'Não tenho']];
    const list = CARDS.filter((c) => (this.filter === 'creature' ? !isFx(c) : this.filter === 'fx' ? isFx(c) : this.filter === 'missing' ? Meta.owned(s, c.id) === 0 : true));
    const grid = list.map((c) => {
      const own = Meta.owned(s, c.id), inDeck = counts.get(c.id) ?? 0, usable = Math.min(own, DECK_RULES.maxCopies);
      return `<figure class="lb-card ${own ? '' : 'is-missing'} ${inDeck >= usable && own ? 'is-used' : ''}" data-a="deck-add" data-card="${c.id}" title="${own ? 'Clique: põe no deck' : 'Você não tem esta carta'}">
        <img loading="lazy" src="${asset(c.art)}" alt="${esc(c.name)}">
        <figcaption>${rarityTag(c.id)}<span>${own ? `×${own}` : 'falta'}</span><b>${inDeck ? `${inDeck} no deck` : ''}</b></figcaption></figure>`;
    }).join('');
    const rows = [...counts.entries()].map(([id, n]) => { const c = byId.get(id); return `<li data-a="deck-rem" data-card="${id}" title="Clique: tira uma cópia"><i>${n}×</i><span>${esc(c.name)}</span><em>${isFx(c) ? KIND[c.kind] : `${c.atk}/${c.def}`}</em></li>`; }).join('');
    const cr = ed.cards.filter((id) => !isFx(byId.get(id))).length;
    return `<div class="lb-deck">
      <aside class="lb-preview"></aside>
      <div class="lb-col">
        <div class="lb-bar"><div class="lb-chips">${F.map(([k, n]) => `<button data-a="filter" data-id="${k}" class="${this.filter === k ? 'on' : ''}">${n}</button>`).join('')}</div><span class="fine">${Meta.distinctOwned(s)}/${CARDS.length} cartas · máx. ${DECK_RULES.maxCopies} cópias</span></div>
        <div class="lb-scroll lb-grid">${grid || '<p class="lb-empty">Nada aqui. Arquivo completo.</p>'}</div>
      </div>
      <aside class="lb-side">
        <div class="lb-slots">${s.decks.map((d, i) => `<button data-a="deck-pick" data-id="${i}" class="${i === ed.index ? 'on' : ''}" title="${esc(d.name)}">${i === s.activeDeck ? '★ ' : ''}${esc(d.name)}</button>`).join('')}${s.decks.length < META.maxDecks ? '<button data-a="deck-new" title="Novo deck">+ novo</button>' : ''}</div>
        <input id="lb-deck-name" maxlength="24" value="${esc(ed.name)}" spellcheck="false" autocomplete="off">
        <div class="lb-count ${full && !errs.length ? 'ok' : ''}"><b>${ed.cards.length}</b>/${DECK_RULES.size}<span>${cr} criaturas · ${ed.cards.length - cr} efeitos</span></div>
        <ul class="lb-decklist">${rows || '<li class="lb-empty">Clique nas cartas para montar.</li>'}</ul>
        ${errs.length ? `<p class="lb-err">${esc(errs[0])}${errs.length > 1 ? ` (+${errs.length - 1})` : ''}</p>` : `<p class="lb-okline">✓ Válido${ed.index === s.activeDeck && !ed.dirty ? ' · vai para o duelo' : ''}</p>`}
        <div class="lb-actions">
          <button data-a="deck-save" class="primary" ${ed.dirty ? '' : 'disabled'}>Salvar</button>
          ${ed.dirty ? '<button data-a="deck-undo">Descartar</button>' : `<button data-a="deck-use" ${ed.index === s.activeDeck || errs.length ? 'disabled' : ''}>Usar no duelo</button>`}
          <button data-a="deck-del" class="ghost" ${ed.index < 0 || s.decks.length <= 1 || ed.dirty ? 'disabled' : ''}>Apagar</button>
        </div>
      </aside></div>`;
  }
  vRecycle(s) {
    const list = CARDS.filter((c) => Meta.extrasOf(s, c.id) > 0), total = list.reduce((n, c) => n + Meta.extrasOf(s, c.id) * Meta.recycleValue(c.id), 0);
    return `<div class="lb-pad">
      <p class="lb-lead">Acima de <b>${DECK_RULES.maxCopies} cópias</b>, a carta sobra. Triturar devolve <b>${Math.round(META.recycleRate * 100)}%</b> do preço. Não tem volta.</p>
      ${list.length ? `<div class="lb-scroll lb-rows">${list.map((c) => { const n = Meta.extrasOf(s, c.id); return `<div class="lb-row"><img src="${asset(c.art)}" alt=""><div><b>${esc(c.name)}</b><span>${rarityTag(c.id)} ${RARITY_PT[Meta.rarityOf(c.id)]} · ${n} sobrando</span></div><em>+ ${money(n * Meta.recycleValue(c.id))}</em><button data-a="recycle" data-id="${c.id}">Triturar</button></div>`; }).join('')}</div>
      <div class="lb-actions"><button data-a="recycle" data-id="" class="primary">Triturar tudo · + ${money(total)}</button></div>`
    : '<p class="lb-empty big">Nenhuma cópia sobrando.<br>Elas vêm nos pacotes quando o arquivo está quase completo.</p>'}</div>`;
  }

  // ───────── sala de reunião e treino ─────────
  deckLine(s) { const d = Meta.activeDeck(s), ok = Meta.activeDeckValid(s); return `<div class="lb-deckline ${ok ? '' : 'bad'}"><span class="memo">Deck escolhido</span><b>${esc(d.name)}</b><span>${ok ? `${d.cards.length} cartas · pronto` : esc(Meta.deckErrors(s, d.cards)[0] ?? 'Deck inválido')}</span><button data-a="open" data-id="deck">Trocar no arquivo</button></div>`; }
  /** maço do deck escolhido: três cartas de verdade em leque, presas por uma cinta de papel com nome e contagem */
  deckCard(s) {
    const d = Meta.activeDeck(s), ok = Meta.activeDeckValid(s), order = { legendary: 0, rare: 1, common: 2 };
    const top = [...new Set(d.cards)].sort((x, y) => order[Meta.rarityOf(x)] - order[Meta.rarityOf(y)]).slice(0, 3);
    const cr = d.cards.filter((id) => !isFx(byId.get(id))).length, fx = d.cards.length - cr, pct = d.cards.length ? Math.round((cr / d.cards.length) * 100) : 0;
    return `<div class="dk ${ok ? '' : 'is-bad'}">
      <div class="dk-fan">${top.map((id) => `<img src="${asset(byId.get(id).art)}" alt="">`).join('')}</div>
      <div class="dk-band">
        <span class="ds-label">Deck escolhido</span>
        <b>${esc(d.name)}</b>
        ${ok ? `<div class="dk-split"><i style="width:${pct}%"></i></div><p><span><b>${cr}</b> criaturas</span><span><b>${fx}</b> efeitos</span></p>` : `<p class="dk-err">${esc(Meta.deckErrors(s, d.cards)[0] ?? 'Deck inválido')}</p>`}
      </div>
      <div class="dk-side"><i class="ds-stamp ${ok ? 'ds-stamp--ok' : 'ds-stamp--no'}">${ok ? 'Pronto' : 'Inválido'}</i><button data-a="open" data-id="deck" class="ds-btn dk-swap">Trocar</button></div>
    </div>`;
  }
  vDuel(s) {
    const won = RIVALS.filter((r) => (s.stats.rivals[r]?.w ?? 0) > 0).length;
    const rv = RIVALS.map((r) => { const x = s.stats.rivals[r] ?? { w: 0, l: 0 }; return `<li class="${x.w ? 'is-on' : x.l ? '' : 'is-off'}"><span>${esc(r)}</span><em><b>${x.w}</b>V<b>${x.l}</b>D</em></li>`; }).join('');
    const d = Meta.activeDeck(s), ok = Meta.activeDeckValid(s), back = backUrl(s.cosmetics.back, s.cosmetics.logo, asset('cards/back.png'));
    return `<div class="ds-duel">
      <section class="ds-sheet">
        <div class="ds-bar"><span>Pauta</span><span>Sequência <b>${s.stats.streak}</b> · Recorde <b>${s.stats.bestStreak}</b></span></div>
        <div class="ds-body">
          <dl class="ds-rows ds-rows--form">
            <div><dt>Vitória</dt><dd>CAIXA que sobrar → PATRIMÔNIO</dd></div>
            <div><dt>Derrota</dt><dd style="color:var(--ds-red)">${money(0)}</dd></div>
          </dl>
          ${this.deckCard(s)}
          <footer class="dk-foot"><button data-a="duel" class="ds-btn ds-btn--primary" ${ok ? '' : 'disabled'}>Entrar na reunião <span class="ds-key">Enter</span></button><button data-a="open" data-id="training" class="ds-btn">Treinar antes</button></footer>
        </div>
      </section>
      <section class="ds-sheet">
        <div class="ds-bar"><span>Concorrência · rival sorteado</span><b>${won}/${RIVALS.length}</b></div>
        <ul class="ds-rows ds-body">${rv}</ul>
      </section></div>`;
  }
  vTraining(s) {
    const d = Meta.activeDeck(s), ok = Meta.activeDeckValid(s), back = backUrl(s.cosmetics.back, s.cosmetics.logo, asset('cards/back.png'));
    const no = (t) => `<li><i class="tr-box"></i><span>${t}</span></li>`;
    return `<div class="tr">
      <section class="ds-sheet tr-term">
        <i class="ds-staple"></i>
        <div class="ds-bar"><span>Termo de estágio</span><b>não remunerado</b></div>
        <div class="ds-body">
          <div class="tr-id">
            <div class="tr-photo"><img src="${this.lobby.internPortrait(this.lobby.renderer) ?? ''}" alt="Estagiário"><i class="ds-clip"></i></div>
            <div><span class="ds-label">Funcionário</span><h3 class="ds-title">Estagiário</h3><p class="ds-text">Ele <span class="ds-hl">erra de propósito</span>. Bom para testar um deck.</p></div>
          </div>
          <div><span class="ds-label">Esta partida não vale</span><ul class="tr-no">${no('Patrimônio')}${no('Metas')}${no('Conquistas')}${no('Histórico')}</ul></div>
          ${this.deckCard(s)}
          <footer class="dk-foot"><button data-a="train" class="ds-btn ds-btn--primary" ${ok ? '' : 'disabled'}>Treinar com ele</button><button data-a="open" data-id="duel" class="ds-btn">Duelo valendo</button></footer>
        </div>
      </section>
      <div class="ds-postit tr-note"><i class="ds-tape ds-tape--top"></i><b>Chefe,</b>posso jogar com vc? prometo perder.<em>— o estagiário</em></div>
    </div>`;
  }

  // ───────── mural: metas do dia ─────────
  vMissions(s) {
    const left = s.missions.list.filter((m) => { const d = Meta.missionDef(m.id); return d && !m.claimed; }).length;
    const items = s.missions.list.map((m, i) => {
      const d = Meta.missionDef(m.id); if (!d) return '';
      const done = m.progress >= d.goal, n = Math.min(m.progress, d.goal), money$ = d.kind === 'damage';
      // contagem em risquinhos a caneta quando a meta é pequena; régua quando é em dinheiro ou grande
      const tally = !money$ && d.goal <= 10 ? `<div class="ms-tally">${Array.from({ length: d.goal }, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}</div>` : `<div class="ds-meter"><i style="width:${Math.round((n / d.goal) * 100)}%"></i></div>`;
      return `<article class="ms-memo ${m.claimed ? 'is-claimed' : done ? 'is-done' : ''}">
        <i class="ds-pin"></i>
        <header><span class="ds-label">Memorando ${String(i + 1).padStart(2, '0')}</span><span class="ms-pay">${money(d.reward)}</span></header>
        <h3 class="ds-title ds-title--sm">${esc(d.text)}</h3>
        ${tally}
        <p class="ms-count"><b>${money$ ? money(n) : n}</b> de ${money$ ? money(d.goal) : d.goal}</p>
        <footer>${m.claimed ? '<i class="ds-stamp">Pago</i>' : done ? `<button data-a="claim" data-id="${i}" class="ds-btn ds-btn--primary">Resgatar</button>` : '<span class="ds-chip ds-chip--now">Em andamento</span>'}</footer>
      </article>`;
    }).join('');
    return `<div class="ms">
      <div class="ms-board">${items}</div>
      <div class="ms-rules"><span class="ds-dymo">Regras do mural</span><span>3 metas por dia</span><span>trocam à meia-noite</span><span>treino não conta</span><span><span class="ds-hl">pagam mesmo na derrota</span></span><b>${left} em aberto</b></div>
    </div>`;
  }

  // ───────── máquina de benefícios: loja ─────────
  vShop(s) {
    const tabs = this.tabs('shop', [['packs', 'Pacotes'], ['cards', 'Cartas avulsas'], ['decks', 'Decks prontos'], ['look', 'Visual']]), t = this.tab.shop, can = (p) => s.patrimonio >= p;
    let body = '';
    if (t === 'packs') {
      const b = META.booster, o = b.odds, tot = o.common + o.rare + o.legendary, miss = CARDS.reduce((n, c) => n + Math.max(0, DECK_RULES.maxCopies - Meta.owned(s, c.id)), 0);
      body = `<div class="lb-packshop"><div class="lb-packart"><img src="${backUrl(s.cosmetics.back, s.cosmetics.logo, asset('cards/back.png'))}" alt=""><img src="${backUrl(s.cosmetics.back, s.cosmetics.logo, asset('cards/back.png'))}" alt=""><img src="${backUrl(s.cosmetics.back, s.cosmetics.logo, asset('cards/back.png'))}" alt=""></div>
        <div><h3>Envelope pardo lacrado</h3><p class="lb-lead">${b.size} cartas. Enquanto faltar carta no arquivo, <b>não vem sobra</b>.</p>
        <ul class="lb-odds"><li>${rarityTag('BCB-001')} Comum <b>${Math.round((o.common / tot) * 100)}%</b></li><li><i class="lb-rar lb-rar--rare"></i> Rara <b>${Math.round((o.rare / tot) * 100)}%</b></li><li><i class="lb-rar lb-rar--legendary"></i> Lendária <b>${Math.round((o.legendary / tot) * 100)}%</b></li></ul>
        <div class="lb-actions"><button data-a="buy-pack" class="primary big" ${can(b.price) ? '' : 'disabled'}>Comprar e abrir · ${money(b.price)}</button></div>
        <p class="fine">${miss ? `Faltam ${miss} cópias para completar.` : 'Arquivo completo: agora só vem sobra.'}</p></div></div>`;
    } else if (t === 'cards') {
      body = `<div class="lb-scroll lb-grid lb-grid--shop">${CARDS.map((c) => { const own = Meta.owned(s, c.id), full = own >= DECK_RULES.maxCopies, p = Meta.priceOf(c.id); return `<figure class="lb-card ${full ? 'is-used' : ''}" data-card="${c.id}"><img loading="lazy" src="${asset(c.art)}" alt="${esc(c.name)}"><figcaption>${rarityTag(c.id)}<span>${RARITY_PT[Meta.rarityOf(c.id)]}</span><b>${own}/${DECK_RULES.maxCopies}</b></figcaption><button data-a="buy-card" data-id="${c.id}" ${full || !can(p) ? 'disabled' : ''}>${full ? 'Completa' : money(p)}</button></figure>`; }).join('')}</div>`;
    } else if (t === 'decks') {
      body = `<div class="lb-scroll lb-rows">${META.readyDecks.map((d) => { const miss = Meta.readyDeckMissing(s, d.id), n = Object.values(miss).reduce((a, b) => a + b, 0), faces = Object.keys(d.cards).filter((id) => Meta.rarityOf(id) !== 'common').slice(0, 5); return `<div class="lb-row lb-row--deck"><div class="lb-fan">${faces.map((id) => `<img src="${asset(byId.get(id).art)}" alt="" data-card="${id}">`).join('')}</div><div><b>${esc(d.name)}</b><span>${esc(d.text)}</span><span class="fine">${n ? `Entrega as ${n} cartas que faltam.` : 'Você já tem todas: só guarda a lista.'}</span></div><button data-a="buy-deck" data-id="${d.id}" class="primary" ${can(d.price) ? '' : 'disabled'}>${money(d.price)}</button></div>`; }).join('')}</div>`;
    } else {
      const item = (c) => { const own = s.cosmetics.owned.includes(c.id), on = s.cosmetics[c.kind] === c.id, img = c.kind === 'logo' ? logoUrl(c.id) : backUrl(c.id, s.cosmetics.logo, asset('cards/back.png')); return `<figure class="lb-cos lb-cos--${c.kind} ${on ? 'on' : ''}"><img src="${img}" alt=""><figcaption>${esc(c.name)}</figcaption>${own ? `<button data-a="equip" data-id="${c.id}" ${on ? 'disabled' : ''}>${on ? 'Em uso' : 'Usar'}</button>` : `<button data-a="buy-cos" data-id="${c.id}" class="primary" ${can(c.price) ? '' : 'disabled'}>${money(c.price)}</button>`}</figure>`; };
      body = `<div class="lb-scroll"><p class="memo">Logo da empresa</p><div class="lb-cosgrid">${META.cosmetics.filter((c) => c.kind === 'logo').map(item).join('')}</div><p class="memo">Verso das cartas</p><div class="lb-cosgrid">${META.cosmetics.filter((c) => c.kind === 'back').map(item).join('')}</div></div>`;
    }
    return `${tabs}<div class="lb-pad lb-fill">${body}</div>`;
  }
  openPack(cards) {
    this.pack = { cards, i: -1 };
    const s = this.s, back = backUrl(s.cosmetics.back, s.cosmetics.logo, asset('cards/back.png'));
    const el = $('.lb-pack', this.root); el.classList.remove('hidden');
    el.innerHTML = `<p class="memo">Envelope pardo · conteúdo não conferido</p><div class="lb-packrow">${cards.map((c, i) => `<div class="lb-flip lb-flip--${c.rarity}" data-i="${i}" data-a="pack-next"><div class="lb-flip__in"><img class="lb-flip__back" src="${back}" alt=""><div class="lb-flip__front"><img src="${asset(byId.get(c.cardId).art)}" alt=""><span>${c.isNew ? '<b>NOVA</b>' : c.extra ? '<i>sobra</i>' : ''}${RARITY_PT[c.rarity]}</span></div></div></div>`).join('')}</div><button data-a="pack-next" class="primary big" id="lb-pack-btn">Virar carta <kbd>Enter</kbd></button>`;
    sfx('start');
  }
  packNext() {
    const p = this.pack; if (!p) return;
    const el = $('.lb-pack', this.root);
    if (p.i >= p.cards.length - 1) { this.pack = null; el.classList.add('hidden'); el.innerHTML = ''; sfx('select'); return; }
    p.i++;
    const c = p.cards[p.i]; $(`.lb-flip[data-i="${p.i}"]`, el).classList.add('on');
    sfx(c.rarity === 'legendary' ? 'effect' : c.rarity === 'rare' ? 'summon' : 'draw');
    if (p.i >= p.cards.length - 1) $('#lb-pack-btn', el).innerHTML = 'Guardar no arquivo <kbd>Enter</kbd>';
  }

  // ───────── troféus e recepção ─────────
  vAchievements(s) {
    const got = META.achievements.filter((a) => s.achievements[a.id] !== undefined).length;
    return `<div class="lb-pad"><p class="lb-lead"><b>${got}/${META.achievements.length}</b> troféus · cada um paga na hora.</p>
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
        : '<p class="lb-empty big">Nenhuma reunião ainda.</p>';
    } else {
      const item = (c) => { const own = s.cosmetics.owned.includes(c.id), on = s.cosmetics[c.kind] === c.id, img = c.kind === 'logo' ? logoUrl(c.id) : backUrl(c.id, s.cosmetics.logo, asset('cards/back.png')); return `<figure class="lb-cos lb-cos--${c.kind} ${on ? 'on' : ''} ${own ? '' : 'is-locked'}"><img src="${img}" alt=""><figcaption>${esc(c.name)}</figcaption>${own ? `<button data-a="equip" data-id="${c.id}" ${on ? 'disabled' : ''}>${on ? 'Em uso' : 'Usar'}</button>` : `<button data-a="open" data-id="shop" data-tab="look">${money(c.price)} na loja</button>`}</figure>`; };
      body = `<div class="lb-scroll"><p class="memo">Logo da empresa</p><div class="lb-cosgrid">${META.cosmetics.filter((c) => c.kind === 'logo').map(item).join('')}</div><p class="memo">Verso das suas cartas no duelo</p><div class="lb-cosgrid">${META.cosmetics.filter((c) => c.kind === 'back').map(item).join('')}</div></div>`;
    }
    return `${tabs}<div class="lb-pad lb-fill">${body}</div>`;
  }
}
export { MAX_NAME, cleanName };
