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
import { cardFaceCanvas } from './textures.js';
import { createShredder } from './shredder.js';
import { RULES_TEXT, DEPT } from './cardtext.js';
import * as Meta from '../../src/meta/meta.ts';
import { CAMPAIGN, tierOf } from '../../src/meta/campaign.ts';

const { META, DECK_RULES, RARITY_PT } = Meta;
const $ = (sel, root = document) => root.querySelector(sel);
const esc = C.esc, money = C.money;
const byId = new Map(CARDS.map((c) => [c.id, c]));
// carta reduzida (a mesma da mesa do duelo: nome, arte, ATQ/DEF e custo, sem o texto de regras), desenhada uma vez por carta
const miniCache = new Map();
const miniUrl = (id) => { if (!miniCache.has(id)) miniCache.set(id, cardFaceCanvas(id).toDataURL('image/webp', 0.92)); return miniCache.get(id); };
const mini = (id, cls = '') => `<img class="ds-mini ${cls}" src="${miniUrl(id)}" alt="${esc(byId.get(id).name)}" draggable="false">`;
/** envelope pardo de escritório: aba em V com sombra, dobras do fundo e etiqueta de papel (sem fecho) */
const envelope = (label = '') => `<div class="ds-env"><svg viewBox="0 0 340 230" aria-hidden="true">
  <path class="ds-env__fold" d="M0 230 L170 118 L340 230"/>
  <path class="ds-env__shade" d="M0 0 L340 0 L170 140 Z"/>
  <path class="ds-env__flap" d="M0 0 L340 0 L170 128 Z"/>
  <path class="ds-env__edge" d="M3 3 L170 122 L337 3"/>
</svg>${label ? `<span class="ds-env__label">${label}</span>` : ''}</div>`;
// foto da carta (só a ilustração, recortada da carta reduzida), para a ficha
const photoCache = new Map();
const photoUrl = (id) => {
  if (!photoCache.has(id)) { const src = cardFaceCanvas(id), k = src.width / 1079, c = document.createElement('canvas'); c.width = Math.round(1006 * k); c.height = Math.round(794 * k); c.getContext('2d').drawImage(src, 36 * k, 205 * k, 1006 * k, 794 * k, 0, 0, c.width, c.height); photoCache.set(id, c.toDataURL('image/webp', 0.9)); }
  return photoCache.get(id);
};
/** cópias no arquivo: uma casa por cópia que cabe num deck, cheia quando o jogador tem */
const copies = (own, max = DECK_RULES.maxCopies) => `<span class="ds-copies" role="img" aria-label="Você tem ${own} de ${max}" title="Você tem ${own} de ${max}">${Array.from({ length: max }, (_, k) => `<i class="${k < own ? 'is-on' : ''}"></i>`).join('')}</span>`;
// abas do topo da janela (peça .ds-tabs): seções da mesma tela ('tab') ou telas vizinhas ('open')
const HTABS = {
  shop: ['tab', [['packs', 'Pacotes'], ['cards', 'Cartas'], ['decks', 'Decks'], ['look', 'Visual']]],
  duel: ['open', [['duel', 'Campanha'], ['training', 'Treino']]], training: ['open', [['duel', 'Campanha'], ['training', 'Treino']]],
  deck: ['tab', [['decks', 'Meus decks'], ['collection', 'Coleção']]],
  profile: ['tab', [['card', 'Ficha'], ['history', 'Extrato']]],
  missions: ['open', [['missions', 'Metas do dia'], ['achievements', 'Troféus']]], achievements: ['open', [['missions', 'Metas do dia'], ['achievements', 'Troféus']]],
};
/** lápis de editar (peça .ds-pencil): botão redondo com um lápis amarelo de escritório */
const PENCIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(45 12 12)"><rect x="9" y="1.5" width="6" height="4" rx="1" fill="#e98a8a" stroke="#1b140d" stroke-width="1.5"/><rect x="9" y="5.5" width="6" height="2.5" fill="#b9b6ae" stroke="#1b140d" stroke-width="1.5"/><rect x="9" y="8" width="6" height="9" fill="#f2b94c" stroke="#1b140d" stroke-width="1.5"/><path d="M9 17 L12 22.5 L15 17 Z" fill="#e8c99a" stroke="#1b140d" stroke-width="1.5" stroke-linejoin="round"/><path d="M11 20.6 L12 22.5 L13 20.6 Z" fill="#1b140d"/></g></svg>';
const inkLogo = (id) => logoUrl(id, { ink: '#1b140d', accent: '#c98a16', bg: '#f6efdc' });
const KINDS = [['Criaturas', (c) => !isFxKind(c.kind)], ['Efeitos', (c) => c.kind === 'effect_instant'], ['Armadilhas', (c) => c.kind === 'effect_trap']];
function isFxKind(k) { return k === 'effect_instant' || k === 'effect_trap'; }
const RANK_DESC = { legendary: 0, rare: 1, common: 2 };
const isFx = (c) => c.kind === 'effect_instant' || c.kind === 'effect_trap';
const KIND = { creature: 'Criatura', entity: 'Entidade', effect_instant: 'Efeito', effect_trap: 'Armadilha' };
const AREAS = [
  ['duel', 'Duelo'], ['deck', 'Decks'], ['shop', 'Loja'], ['missions', 'Metas'], ['achievements', 'Conquistas'],
  ['profile', 'Perfil'], ['training', 'Treino'], ['recycle', 'Reciclar'], ['settings', 'Config.'],
];
const TITLES = {
  deck: ['Arquivo morto', 'Decks'], recycle: ['Trituradora', 'Reciclar'],
  duel: ['Sala de reunião', 'Campanha'], training: ['Mesa do estagiário', 'Treino sem valer'],
  missions: ['Mural de avisos', 'Metas do dia'], shop: ['Máquina de benefícios', 'Loja'],
  achievements: ['Prateleira de troféus', 'Troféus'], profile: ['Recepção', 'Perfil'], slots: ['Caixa de disquetes', 'Salvar e carregar'],
};
// trituradora do Reciclar: duas propostas em teste. A (padrão): a câmera vai até a trituradora 3D da sala e a interface
// vira um painel à esquerda. B (?triturador=b): a máquina em 2D dentro da ficha, com física de papel.
const SHRED_KIND = new URLSearchParams(location.search).get('triturador') === 'b' ? '2d' : 'sala';
const ROOM = SHRED_KIND === 'sala';
// janelas que já usam o cabeçalho novo (papel timbrado com o recibo do patrimônio)
const NEW_HEAD = new Set(['duel', 'training', 'missions', 'achievements', 'shop', 'deck', 'profile', 'recycle', 'slots']);
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
      <div class="lb-hint">Clique num objeto da sala</div>
      <div class="lb-win hidden"></div>
      <div class="lb-pack hidden"></div>
      <div class="lb-peek hidden"></div>
      <div class="lb-detail hidden"></div>
      <div class="lb-toasts" role="status" aria-live="polite"></div>`;
    ui.root.appendChild(root);
    this.root = root; this.win = $('.lb-win', root); this.labels = $('.lb-labels', root); this.peekEl = $('.lb-peek', root);
    $('.lb-nav', root).innerHTML = AREAS.map(([id, name], i) => `<button data-a="open" data-id="${id}"><kbd>${i + 1}</kbd><span>${name}</span><b class="lb-dot hidden"></b></button>`).join('');
    this.labels.innerHTML = lobby.hot.map((h) => `<button class="lb-label" data-a="open" data-id="${h.id}"><b>${esc(h.label)}</b><span>${esc(h.sub)}</span><i class="lb-dot hidden"></i></button>`).join('');
    this.labelEls = new Map([...this.labels.children].map((el) => [el.dataset.id, el]));

    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('contextmenu', (e) => { const t = e.target.closest('[data-card]'); if (t && this.panel === 'deck' && this.ed) { e.preventDefault(); this.deckRemove(t.dataset.card); } });
    // trituradora: arrastar uma carta da grade até a máquina
    root.addEventListener('pointerdown', (e) => {
      const c = e.target.closest?.('.rc-card'); if (!c || this.panel !== 'recycle' || this.rcBusy || e.button !== 0) return;
      this.rcDrag = { id: c.dataset.id, el: c, x: e.clientX, y: e.clientY, on: false };
    });
    window.addEventListener('pointermove', (e) => this.rcDragMove(e));
    window.addEventListener('pointerup', (e) => this.rcDragEnd(e));
    window.addEventListener('resize', () => { if (this.panel === 'recycle' && this.shredder) { this.shredder.resize(); this.shredder.draw(); } if (this.panel === 'recycle' && ROOM) this.roomFree(); });
    root.addEventListener('pointerover', (e) => {
      const b = e.target.closest('[data-a="open"]'); if (b && !this.panel) lobby.setHover(b.dataset.id);
      if (this.panel) this.peek(e.target.closest('[data-card]'));
      const it = e.target.closest('[data-show]'); if (it) this.showFile(it.dataset.show);
    });
    root.addEventListener('pointerout', (e) => { if (e.target.closest('[data-a="open"]') && !this.panel) lobby.setHover(null); if (!e.relatedTarget?.closest?.('[data-card]')) this.peek(null); if (e.target.closest('[data-show]') && !e.relatedTarget?.closest?.('[data-show]')) this.showFile(null); });
    // pelo teclado a ficha também abre (foco visível numa carta ou nos botões dela)
    root.addEventListener('focusin', (e) => { if (this.panel && e.target.matches?.(':focus-visible')) { this.peek(e.target.closest('[data-card]')); const it = e.target.closest('[data-show]'); if (it) this.showFile(it.dataset.show); } });
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
      if (e.key === 'Escape') { if (this.detailId) { this.closeDetail(); e.stopPropagation(); return; } if (this.pack) { this.packSkip(); e.stopPropagation(); return; } if (this.panel === 'deck' && this.ed) { this.leaveEditor(); e.stopPropagation(); return; } if (this.panel) { this.close(); e.stopPropagation(); } return; }
      if (this.detailId) return;
      if (this.pack) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) this.packNext(); } return; }
      if (!this.panel && (e.key === 's' || e.key === 'S')) return this.openSlots();
      const n = Number(e.key); if (!this.panel && n >= 1 && n <= AREAS.length) this.open(AREAS[n - 1][0]);
      if (e.key === 'Enter' && !e.target.closest?.('button') && (this.panel === 'duel' || this.panel === 'training')) this.startDuel(this.panel === 'training');
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
  /** aviso impresso (peça .ds-feed): tira de formulário contínuo que sai da impressora matricial.
   *  tone: 'good' (confirmado), 'bad' (recusado, fita vermelha), 'gold' (crédito) ou nada (nota).
   *  amount: valor que entrou (+) ou saiu (−) do PATRIMÔNIO, na ponta direita da última faixa, como no relatório.
   *  Sempre três faixas ou mais: cabeçalho miúdo, título, detalhe. */
  toast(text, tone = '', { amount = null } = {}) {
    const n = (this._feedNo = (this._feedNo ?? 41) + 1), d = new Date(), hh = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const label = tone === 'bad' ? 'Recusado' : amount != null ? (amount >= 0 ? 'Crédito' : 'Débito') : tone === 'good' ? 'Confirmado' : tone === 'gold' ? 'Crédito' : 'Nota';
    // título e detalhe saem em faixas separadas; texto corrido ocupa a faixa do título e quebra para a de baixo
    const title = text.match(/<b>([\s\S]*?)<\/b>/)?.[1], detail = text.match(/<span>([\s\S]*?)<\/span>/)?.[1] ?? '';
    const ok = tone === 'good' ? '<i class="ds-feed__ok" aria-hidden="true">OK</i>' : '';
    const amt = amount != null ? `<b class="ds-feed__amt ${amount >= 0 ? 'pos' : 'neg'}">${amount >= 0 ? '+' : '−'} ${money(Math.abs(amount))}</b>` : '';
    const el = document.createElement('div'); el.className = `ds-feed is-${tone || 'note'}`; el.setAttribute('role', 'status');
    el.innerHTML = `<p class="ds-feed__head"><span>BCBC / ${label}</span><span>${hh} / Nº ${String(n).padStart(4, '0')}</span></p>
      <p class="ds-feed__line">${ok}<span class="${title != null ? 'ds-feed__title' : ''}">${title ?? text}</span></p>
      <p class="ds-feed__line"><span>${title != null ? detail : ''}</span>${amt}</p>`;
    // aviso com botão fica mais tempo (dá para alcançar o botão)
    const t = text.includes('<button') ? 7000 : 4200;
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
  announce(list = []) { list.forEach((a, i) => setTimeout(() => { sfx('heal'); this.toast(`<b>Troféu: ${esc(a.name)}</b><span>${esc(a.text)}</span>`, 'gold', { amount: a.reward }); }, 500 + i * 900)); }
  /** depois de um duelo: recompensa, metas cumpridas e conquistas */
  afterMatch(out) {
    if (!out) return;
    if (out.finished) setTimeout(() => this.ui.ending(), 600);
    out.missionsDone.forEach((m, i) => setTimeout(() => this.toast(`<b>Meta cumprida</b><span>${esc(m.text)}. Resgate ${money(m.reward)} no mural</span>`, 'good'), 300 + i * 700));
    this.announce(out.unlocked);
  }

  // ───────── janelas ─────────
  open(id, opts = {}) {
    if (id === 'settings') { sfx('nav'); this.ui.settings(); return; }
    if (!TITLES[id]) return;
    sfx('nav'); this.panel = id; this.lobby.setHover(id); this.canvas.style.cursor = '';
    if (opts.tab) this.tab[id] = opts.tab;
    this.lobby.focus?.(ROOM && id === 'recycle' ? 'recycle' : null); this.root.classList.toggle('is-shredroom', ROOM && id === 'recycle');
    this.win.classList.remove('hidden'); this.render();
  }
  /** sala: diz à câmera onde termina o painel, para a trituradora ficar no meio do espaço livre à direita */
  roomFree() {
    const b = $('.lb-box', this.win); if (!b) return;
    // a máquina vai para o meio do espaço livre; em tela muito larga (21:9) fica mais perto do painel, para o estagiário sair de quadro
    const W = innerWidth, H = innerHeight, r = b.getBoundingClientRect().right, x = r + Math.min((W - r) / 2, 0.55 * H), pc = (v) => `${((v / W) * 100).toFixed(1)}%`;
    this.lobby.focusFree?.((x / W) * 2 - 1);
    // a sombra do painel vai até perto da máquina, apagando o resto da sala (a mesa do estagiário); os avisos saem em cima da máquina, longe do recibo
    const st = this.root.style; st.setProperty('--rc-free', pc(r)); st.setProperty('--rc-clear', pc(Math.max(r + 40, x - 0.22 * H))); st.setProperty('--rc-toast', pc(x));
  }
  close() { if (!this.panel) return; this.lobby.focus?.(null); this.root.classList.remove('is-shredroom'); if (this.panel === 'deck') { this.forgetDecks(); this.resetFilters(); } this.peek(null); this.panel = null; this.win.classList.add('hidden'); this.lobby.setHover(null); sfx('navBack'); }
  render() {
    const id = this.panel, [memo, title] = TITLES[id], s = this.s;
    const body = { deck: () => this.vDeck(s), recycle: () => this.vRecycle(s), duel: () => this.vDuel(s), training: () => this.vTraining(s), missions: () => this.vMissions(s), shop: () => this.vShop(s), achievements: () => this.vAchievements(s), profile: () => this.vProfile(s), slots: () => this.vSlots() }[id]();
    // guarda rolagem e foco (com a posição do cursor) para a tela não "pular" a cada clique
    const view = this.ed ? 'ed' : this.tab[id], same = this._view === `${id}:${view}`; this._view = `${id}:${view}`;
    const scroll = same ? $('.lb-scroll', this.win)?.scrollTop ?? 0 : 0, scroll2 = same ? $('.ed-list', this.win)?.scrollTop ?? 0 : 0;
    const act = document.activeElement, focus = act?.id, sel = focus && act.selectionStart != null ? [act.selectionStart, act.selectionEnd] : null;
    // botão focado (teclado): guarda a "assinatura" para devolver o foco ao botão equivalente depois de redesenhar
    const sig = !focus && act && this.win.contains(act) && act.dataset?.a ? { a: act.dataset.a, card: act.dataset.card, id: act.dataset.id, list: !!act.closest('.ed-list') } : null;
    const ht = HTABS[id], here = ht?.[0] === 'tab' ? this.tab[id] : id;
    const htabs = ht ? `<nav class="ds-tabs lb-htabs" role="tablist" aria-label="${esc(memo)}">${ht[1].map(([k, n]) => `<button class="ds-tab ${k === here ? 'is-on' : ''}" role="tab" aria-selected="${k === here}" data-a="${ht[0]}" data-id="${k}">${n}</button>`).join('')}</nav>` : '';
    this.win.innerHTML = `<section class="lb-box lb-box--${id} ${id === 'shop' ? `lb-box--shop-${this.tab.shop}` : ''} ${ROOM && id === 'recycle' ? 'is-room' : ''}">
      ${NEW_HEAD.has(id) ? this.head(title, memo, htabs, s) : `<header><div>${htabs || `<p class="memo"><span>${esc(memo)}</span></p>`}<h2>${esc(title)}</h2></div><div class="lb-pat"><span>Patrimônio</span><b>${money(s.patrimonio)}</b></div><button class="lb-x" data-a="close" title="Fechar (Esc)">✕</button></header>`}
      ${body}</section>`;
    if (id === 'recycle' && !ROOM) this.mountShredder();
    if (id === 'recycle' && ROOM) this.roomFree();
    const sc = $('.lb-scroll', this.win); if (sc) sc.scrollTop = scroll; const dl = $('.ed-list', this.win); if (dl) dl.scrollTop = scroll2;
    if (focus && ['lb-deck-name', 'lb-q', 'lb-sort'].includes(focus)) { const i = $(`#${focus}`, this.win); i?.focus(); if (sel) i?.setSelectionRange?.(...sel); }
    else if (sig) {
      const q = `[data-a="${sig.a}"]${sig.card ? `[data-card="${sig.card}"]` : ''}${sig.id != null ? `[data-id="${sig.id}"]` : ''}`;
      const el = (sig.list ? $(`.ed-list ${q}`, this.win) : null) ?? $(`.ed-grid ${q}`, this.win) ?? $(q, this.win);
      // o botão sumiu ou ficou desligado (virou "Completa", "Em uso"...): foco na aba ativa, para o Tab não recomeçar do zero
      (el && !el.disabled ? el : $('.lb-tabs .on', this.win) ?? $('.lb-htabs .is-on', this.win) ?? $('.lb-x', this.win))?.focus({ preventScroll: true });
    }
    if (this._scrollTo != null) { $(`[data-deck="${this._scrollTo}"]`, this.win)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); this._scrollTo = null; }
  }
  /** sai do editor de volta para as pastas */
  /** cabeçalho das janelas novas: título direto na pasta sobre linha dupla de papel timbrado; patrimônio no recibo de caixa */
  head(title, memo, htabs, s) {
    const place = esc(memo), pat = money(s.patrimonio), x = '<button class="lb-x" data-a="close" title="Fechar (Esc)" aria-label="Fechar">✕</button>';
    return `<header class="lb-head lb-head--slip">${htabs}<div class="ds-letterhead">
      <div class="ds-letterhead__title"><span class="ds-formlabel">${place}</span><h2>${esc(title)}</h2></div>
      <div class="ds-till" role="img" aria-label="Patrimônio: ${pat}"><i class="ds-clip"></i><div class="ds-till__paper"><span class="ds-till__head">Caixa / saldo</span><span class="ds-till__label">Patrimônio</span><b class="ds-till__total"><span>${pat}</span></b></div></div>${x}</div></header>`;
  }
  leaveEditor() { if (this.ed) this.fdSel = String(this.ed.index); this.ed = null; this.resetFilters(); this.peek(null); sfx('navBack'); this.render(); }
  tabs(id, list) { const cur = this.tab[id] ?? list[0][0]; this.tab[id] = cur; return `<div class="lb-tabs" role="tablist">${list.map(([k, n]) => `<button data-a="tab" data-id="${k}" role="tab" aria-selected="${k === cur}" class="${k === cur ? 'on' : ''}">${n}</button>`).join('')}</div>`; }

  onClick(e) {
    if (this._rcDragged) { this._rcDragged = false; return; } // o clique que encerra um arraste não seleciona nada
    if (e.target === this.win) return this.root.classList.contains('is-shredroom') ? undefined : this.close(); // na sala, o vazio é a trituradora
    const sl = e.target.closest('[data-sl]'); if (sl && this.panel === 'slots') return this.ui.slotAct('lobby', sl, this.slotOn(), () => this.render());
    const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    const a = b.dataset.a, id = b.dataset.id;
    // compras e "usar": o 2º clique de um clique duplo (ou um clique logo em seguida) não compra de novo
    if (/^(buy-|equip|put-active)/.test(a)) { const now = performance.now(); if (e.detail > 1 || now - (this._buyAt ?? 0) < 400) return; this._buyAt = now; }
    if (a === 'buy-card' && b.closest('.sc-grid')) { this.scSel = id; this.scView = null; }
    if (a === 'buy-cos' && b.closest('.lk-grid')) { this.lkSel = id; this.lkView = null; }
    if (this.cfMenu && a !== 'cf-menu' && !b.closest('.ds-menu')) this.cfMenu = false;
    switch (a) {
      case 'open': this.closeDetail(); return this.open(id, { tab: b.dataset.tab });
      case 'detail': return this.detail(b.dataset.card, b.dataset.buy === '1');
      case 'sh-filter': this.shF = this.shF === 'all' ? 'miss' : 'all'; sfx('nav'); return this.render();
      case 'dk-pick': this.dkSel = id; this.dkView = null; sfx('nav'); return this.render();
      case 'lk-pick': this.lkSel = id; this.lkView = null; sfx('card'); return this.render();
      case 'tr-pick': this.trSel = id; this.trView = null; sfx('card'); return this.render();
      case 'sc-pick': this.scSel = b.dataset.card; this.scView = null; sfx('card'); return this.render();
      case 'detail-close': return this.closeDetail();
      case 'sh-odds': this.shOdds = !this.shOdds; sfx('nav'); return this.render();
      case 'close': return this.close();
      case 'exit': sfx('navBack'); return this.actions.exit();
      case 'slots': return this.openSlots();
      case 'tab': this.tab[this.panel] = id; if (this.panel === 'deck') { this.resetFilters(); if (this.ed) this.fdSel = String(this.ed.index); this.ed = null; } sfx('nav'); return this.render();
      // coleção: busca, filtro e ordem
      case 'cf-type': this.cf.type = id; sfx('nav'); return this.render();
      case 'cf-mine': this.cf.mine = !this.cf.mine; sfx('nav'); return this.render();
      case 'cf-clear': this.resetFilters(); sfx('nav'); return this.render();
      case 'cf-menu': this.cfMenu = !this.cfMenu; sfx('nav'); return this.render();
      case 'cf-sort': this.cf.sort = id; sfx('nav'); return this.render();
      // gaveta: um clique escolhe a pasta; clicar de novo na pasta já escolhida (ou Enter nela) abre o editor
      case 'fd-pick':
        if (id === this.fdSel && id !== 'new') { this.editDeck(Number(id)); sfx('nav'); return this.render(); }
        this.fdSel = id; this.fdView = null; sfx('nav'); return this.render();
      case 'al-pick': this.alSel = id; this.alView = null; sfx('card'); return this.render();
      case 'to-shop': this.scSel = id; this.scView = null; return this.open('shop', { tab: 'cards' });
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
        this.render(); // a gravação já redesenhou antes de existir a marcação das novas e o "Desfazer o automático"
        const errs = Meta.deckErrors(this.s, cards), left = DECK_RULES.size - cards.length;
        sfx('summon');
        this.toast(`<b>+ ${nAdded} carta${nAdded === 1 ? '' : 's'}${removed ? `, − ${removed} que você não tem` : ''}</b><span>${errs.length ? (left > 0 ? `ainda faltam ${left}: as que faltam têm botão Comprar na grade` : esc(errs[0])) : 'deck completo, as novas estão marcadas na lista'}</span>`, errs.length ? 'bad' : 'good');
        return undefined;
      }
      case 'deck-unfill': { const prev = this.ed.prev; if (!prev) return undefined; this.touch(); if (this.deckWrite(prev)) { sfx('cancel'); this.toast('As cartas do automático saíram.'); } return undefined; }
      case 'deck-clear': return this.ui.confirm('Esvaziar o deck?', `Todas as cartas saem de "${this.edDeck.name}". Elas continuam na sua coleção. "Desfazer alterações" traz de volta.`, 'Esvaziar', () => { this.touch(); this.deckWrite([]); sfx('cancel'); }, 'Voltar', { kind: 'Deck' });
      case 'deck-use': { const i = Number(id), name = this.s.decks[i]?.name ?? ''; if (this.commit(Meta.setActiveDeck(this.s, i), `<b>${esc(name)}</b><span>é o deck que vai para o duelo</span>`)) sfx('nav'); return undefined; }
      case 'deck-dup': { const r = Meta.duplicateDeck(this.s, Number(id), Date.now()); if (r.ok) { this._scrollTo = r.index; this.fdSel = String(r.index); } if (this.commit(r, `<b>Cópia criada</b><span>${esc(r.ok ? r.save.decks[r.index].name : '')}</span>`)) sfx('draw'); return undefined; }
      case 'deck-del': { const i = Number(id), name = this.s.decks[i]?.name ?? ''; return this.ui.confirm('Apagar este deck?', `"${name}" sai do arquivo. As cartas continuam na sua coleção.`, 'Apagar', () => { this.snaps.clear(); if (this.commit(Meta.deleteDeck(this.s, i))) sfx('sacrifice'); }, 'Voltar', { tone: 'danger', kind: 'Deck' }); }
      // reciclar
      case 'rc-pick': if (this.rcBusy) return undefined; this.rcSel = this.rcSel === id ? null : id; sfx('card'); return this.render();
      case 'rc-all': {
        const s = this.s, list = CARDS.filter((c) => Meta.extrasOf(s, c.id) > 0), n = Meta.totalExtras(s), val = list.reduce((a, c) => a + Meta.extrasOf(s, c.id) * Meta.recycleValue(c.id), 0);
        if (!n || this.rcBusy) return undefined;
        return this.ui.confirm('Triturar tudo?', `${n} ${n === 1 ? 'cópia sobrando vira' : 'cópias sobrando viram'} dinheiro. As ${DECK_RULES.maxCopies} de cada carta continuam no arquivo.`, `Triturar e receber ${money(val)}`,
          () => this.shred(list.map((c) => c.id)), 'Voltar', { tone: 'danger', kind: 'Trituração', sum: [['Cópias', String(n)], ['Cartas', String(list.length)], ['Entra', `+ ${money(val)}`]] });
      }
      case 'recycle': if (id && !this.rcBusy) this.shred([id]); return undefined;
      // loja
      case 'buy-card': return this.buyCard(id);
      case 'buy-pack': { const r = Meta.buyBooster(this.s, Date.now()); if (this.commit(r)) this.openPack(r.cards); return undefined; }
      case 'buy-deck': {
        const d = META.readyDecks.find((x) => x.id === id), s = this.s, price = Meta.readyDeckPrice(s, id), miss = Meta.readyDeckMissing(s, id), copies = Object.values(miss).reduce((a, k) => a + k, 0);
        const buy = () => { const r = Meta.buyReadyDeck(this.s, id, Date.now()); if (this.commit(r, `<b>${esc(r.ok ? r.save.decks[r.index].name : d.name)}</b><span>${r.ok && r.price ? `chegaram ${copies} cópias, ` : ''}está no Arquivo e é o deck do duelo</span>`)) { sfx('summon'); this.forgetDecks(); } };
        if (!price) return buy();
        return this.ui.confirm(`Comprar ${d.name}?`, `Chegam ${copies} cópias que faltam na sua coleção, e a lista vira o deck do duelo.`, `Comprar por ${money(price)}`, buy, 'Voltar', { tone: 'money', kind: 'Deck pronto', sum: [['Patrimônio', money(s.patrimonio)], ['Sai', `− ${money(price)}`], ['Fica', money(s.patrimonio - price)]] });
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
      case 'claim': { const r = Meta.claimMission(this.s, Number(id), Date.now()); if (this.commit(r)) { sfx('heal'); this.toast('<b>Meta resgatada</b>', 'gold', { amount: r.reward }); } return undefined; }
      // duelo
      case 'duel': return this.startDuel(false);
      case 'train': return this.startDuel(true);
      // perfil
      case 'rename': return this.ui.nameEntry((n) => { save.rename(n); this.toast('Razão social alterada.', 'good'); }, save.company() ?? '');
      case 'wipe': return this.ui.confirm('Recomeçar do zero?', 'Coleção, decks, PATRIMÔNIO, histórico, conquistas e a campanha deste disquete serão apagados para sempre. As outras gavetas não mudam.', 'Apagar tudo', () => { this.forgetDecks(); this.resetFilters(); save.reset(); this.toast('Ficha cadastral apagada. Bem-vindo de novo.', 'bad'); }, 'Voltar', { tone: 'danger', kind: 'Empresa' });
      default: return undefined;
    }
  }
  /** Salvar e carregar: os 3 disquetes numa janela do lobby. Carregar troca a empresa inteira sem sair do lobby. */
  openSlots() { this.open('slots'); }
  vSlots() {
    return `<section class="sc-shelf dq-shelf"><div class="sc-tools"><b>3 disquetes</b><span class="fd-tip">O disquete em uso grava sozinho depois de cada partida, compra ou mudança de deck.</span></div>
      <div class="lb-scroll dq-grid">${this.ui.slotCards('lobby')}</div></section>`;
  }
  slotOn() {
    return {
      load: (n) => { this.forgetDecks(); this.resetFilters(); this.close(); save.use(n); sfx('summon'); this.toast(`<b>${esc(this.company())}</b><span>expediente carregado do disquete ${n}</span>`, 'good'); },
      saved: (n) => this.toast(`<b>Cópia gravada no disquete ${n}</b><span>você está jogando nela agora</span>`, 'good'),
    };
  }
  startDuel(training) {
    if (!Meta.activeDeckValid(this.s)) { sfx('deny'); this.toast('Deck inválido. Arrume no arquivo.', 'bad'); return; }
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
    const nm = esc(byId.get(id).name), d = this.panel === 'deck' && this.edDeck, paid = { amount: -Meta.priceOf(id) };
    if (d) {
      const why = this.whyNot(this.s, d.cards, id);
      if (!why) { this.touch(); this.deckWrite([...d.cards, id]); this.toast(`<b>${nm}</b><span>comprada e posta no deck (${this.edDeck.cards.length}/${DECK_RULES.size})</span>`, 'good', paid); return; }
      this.toast(`<b>${nm}</b><span>comprada. ${esc(why)}</span>`, 'good', paid); return;
    }
    // fora do editor (loja ou coleção): diz que a carta não entrou em deck nenhum e oferece pôr no deck do duelo
    this.toast(`<b>${nm}</b><span>${Math.min(Meta.owned(this.s, id), DECK_RULES.maxCopies)} de ${DECK_RULES.maxCopies} no arquivo</span>`, 'good', paid);
    if (this.detailId) this.detail(this.detailId);
  }
  /** vista de detalhe (uma só para Loja, Arquivo e pacote): a carta completa à esquerda e a ficha legível à direita */
  detail(id, buy = this.detailBuy) {
    if (!byId.has(id)) return;
    this.detailBuy = !!buy;
    const price = Meta.priceOf(id), lack = price - this.s.patrimonio, full = Meta.owned(this.s, id) >= DECK_RULES.maxCopies;
    const action = !buy ? '' : full ? '<i class="ds-stamp ds-stamp--ok cd-full">Completa</i>' : lack > 0 ? `<button class="ds-btn ds-btn--primary" disabled>Faltam ${money(lack)}</button>` : `<button class="ds-btn ds-btn--primary" data-a="buy-card" data-id="${id}">Comprar por ${money(price)}</button>`;
    const c = byId.get(id), s = this.s, fx = isFx(c), own = Math.min(Meta.owned(s, id), DECK_RULES.maxCopies), el = $('.lb-detail', this.root);
    const kind = [KIND[c.kind], c.element, c.department ? `depto. ${DEPT[c.department] ?? c.department}` : ''].filter(Boolean).join(' / ');
    const stats = fx ? `<p class="cd-fx">${c.kind === 'effect_trap' ? 'Fica virada na mesa até disparar.' : c.durationTurns ? `Fica na mesa por ${c.durationTurns} turnos seus.` : 'Vale na hora e vai para o Morto.'}</p>`
      : `<dl class="cd-stats"><div><dt>Ataque</dt><dd>${money(c.atk)}</dd></div><div><dt>Defesa</dt><dd>${money(c.def)}</dd></div><div><dt>Custo</dt><dd>${c.cost ? `${c.cost} <small>sacrifício${c.cost > 1 ? 's' : ''}</small>` : '<small>grátis</small>'}</dd></div></dl>`;
    this.detailId = id; this.peek(null);
    el.innerHTML = `<div class="cd" role="dialog" aria-label="${esc(c.name)}">
      <img class="cd-art" src="${asset(c.art)}" alt="${esc(c.name)}">
      <section class="ds-sheet cd-sheet">
        <div class="ds-bar"><span>Ficha da carta</span><b>${RARITY_PT[Meta.rarityOf(id)]}</b></div>
        <div class="ds-body">
          <div><h3 class="ds-title">${esc(c.name)}</h3><p class="cd-kind">${esc(kind)}</p></div>
          ${stats}
          <ul class="cd-rules">${(RULES_TEXT[id] ?? []).map(([n, t]) => `<li><b>${esc(n)}</b>${esc(t)}</li>`).join('') || '<li>Sem habilidade.</li>'}</ul>
          <p class="cd-own"><span class="cd-pips">${Array.from({ length: DECK_RULES.maxCopies }, (_, k) => `<i class="${k < own ? 'on' : ''}"></i>`).join('')}</span>Você tem <b>${own} de ${DECK_RULES.maxCopies}</b></p><footer class="cd-foot"><button data-a="detail-close" class="ds-btn">Fechar <span class="ds-key">Esc</span></button>${action}</footer>
        </div>
      </section></div>`;
    const was = !el.classList.contains('hidden'); el.classList.remove('hidden'); if (!was) sfx('nav'); ($('[data-a="buy-card"]', el) ?? $('[data-a="detail-close"]', el)).focus({ preventScroll: true });
  }
  closeDetail() { if (!this.detailId) return; this.detailId = null; this.detailBuy = false; const el = $('.lb-detail', this.root); el.classList.add('hidden'); el.innerHTML = ''; sfx('navBack'); }
  /** destaque da carta no editor (R6): ficha compacta colada na carta apontada (ou na linha da lista), sem tapar a grade */
  peek(el) {
    this.peekEl.classList.add('hidden');
    const box = $('.ed-peek', this.win), id = el?.dataset?.card; if (!box) return;
    if (!id || !byId.has(id) || !el.closest('.ed-grid, .ed-list')) { box.classList.remove('is-on'); box.dataset.for = ''; return; }
    const inDeck = this.edDeck ? this.edDeck.cards.filter((x) => x === id).length : 0;
    const key = `${id}:${inDeck}:${Meta.owned(this.s, id)}`;
    if (box.dataset.for !== key) { box.innerHTML = this.scFile(id, false, { compact: true, inDeck }); box.dataset.for = key; }
    box.classList.add('is-on');
    const shelf = box.parentElement, z = shelf.currentCSSZoom || 1, sh = shelf.getBoundingClientRect(), r = el.getBoundingClientRect();
    const W = shelf.clientWidth, H = shelf.clientHeight, w = box.offsetWidth, h = box.offsetHeight, gap = 10;
    const top = (r.top - sh.top) / z, inList = !!el.closest('.ed-list');
    let x = inList ? W - w - 12 : (r.right - sh.left) / z + gap;
    if (!inList && (r.left + r.width / 2 - sh.left) / z > W / 2) x = (r.left - sh.left) / z - w - gap;
    box.style.left = `${Math.max(10, Math.min(W - w - 10, x))}px`;
    box.style.top = `${Math.max(10, Math.min(H - h - 10, top))}px`;
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
  /** ferramentas da grade (editor e álbum): busca, tipo e um "⋯" com ordem e "só as que tenho" */
  vTools(s, shown, { back = false, count = '' } = {}) {
    const f = this.cf, T = [['all', 'Todas'], ['creature', 'Criaturas'], ['effect', 'Efeitos'], ['trap', 'Armadilhas']];
    const S = [['num', 'Número'], ['name', 'Nome'], ['atk', 'Maior ATQ'], ['def', 'Maior DEF'], ['rarity', 'Raridade']];
    const extra = f.mine || f.sort !== 'num';
    const menu = this.cfMenu ? `<div class="ds-menu" role="menu" aria-label="Ordem e filtros"><span class="ds-formlabel">Ordem</span>
      ${S.map(([k, n]) => `<button class="ds-menu__item ${f.sort === k ? 'is-on' : ''}" role="menuitemradio" aria-checked="${f.sort === k}" data-a="cf-sort" data-id="${k}">${n}</button>`).join('')}
      <hr><button class="ds-menu__item ds-menu__check ${f.mine ? 'is-on' : ''}" role="menuitemcheckbox" aria-checked="${f.mine}" data-a="cf-mine">Só as que tenho</button>
      ${this.filtered() ? `<hr><button class="ds-menu__item" data-a="cf-clear">Limpar filtros (${shown} de ${CARDS.length})</button>` : ''}</div>` : '';
    return `<div class="ed-tools">
      ${back ? '<button class="ed-back" data-a="deck-back" title="Voltar para as pastas (Esc)">‹ Pastas</button><i class="ed-sep" aria-hidden="true"></i>' : ''}
      <input id="lb-q" class="ds-search" type="search" value="${esc(f.q)}" placeholder="Buscar" spellcheck="false" autocomplete="off" aria-label="Buscar carta por nome, elemento ou departamento">
      <span class="ds-seg ed-seg" role="group" aria-label="Tipo de carta">${T.map(([k, n]) => `<button class="ds-seg__btn ${f.type === k ? 'is-on' : ''}" data-a="cf-type" data-id="${k}" aria-pressed="${f.type === k}">${n}</button>`).join('')}</span>
      <span class="ds-more"><button class="ds-btn ds-btn--sq ds-more__btn ${extra ? 'has-dot' : ''} ${this.cfMenu ? 'is-on' : ''}" data-a="cf-menu" aria-expanded="${!!this.cfMenu}" aria-label="Ordem e filtros" title="Ordem e filtros">⋯</button>${menu}</span>
      ${count}
    </div>`;
  }
  /** − e + de uma carta no deck. O + vira compra (com o preço) quando a próxima cópia ainda não é sua; slim = sem preço (lista) */
  stepper(s, cards, id, inDeck, slim = false) {
    const max = DECK_RULES.maxCopies, own = Meta.owned(s, id), p = Meta.priceOf(id), nm = esc(byId.get(id).name);
    const full = cards.length >= DECK_RULES.size, buy = inDeck >= Math.min(own, max) && own < max && inDeck < max;
    const why = inDeck >= max ? `Máximo de ${max} cópias por carta` : full ? `O deck já tem ${DECK_RULES.size} cartas` : null;
    if (!own && !inDeck) return p > s.patrimonio ? `<button class="ds-price" disabled title="Faltam ${money(p - s.patrimonio)}">${money(p)}</button>`
      : `<button class="ds-price" data-a="buy-card" data-id="${id}" title="Comprar e pôr no deck">${money(p)}</button>`;
    const minus = `<button class="ds-stepper__btn" data-a="deck-rem" data-card="${id}" ${inDeck ? '' : 'disabled'} aria-label="Tirar uma ${nm}" title="Tirar uma">−</button>`;
    let plus;
    if (why) plus = `<button class="ds-stepper__btn" disabled aria-label="Pôr mais uma ${nm}" title="${why}">+</button>`;
    else if (buy && slim) plus = `<button class="ds-stepper__btn" disabled aria-label="Pôr mais uma ${nm}" title="Você só tem ${own}. Compre mais na grade.">+</button>`;
    else if (buy) plus = p > s.patrimonio ? `<button class="ds-stepper__btn is-buy" disabled title="Faltam ${money(p - s.patrimonio)}">+${money(p).replace(/\s/g, '')}</button>`
      : `<button class="ds-stepper__btn is-buy" data-a="buy-card" data-id="${id}" aria-label="Comprar uma ${nm} por ${money(p)} e pôr no deck" title="Comprar por ${money(p)} e pôr no deck">+${money(p).replace(/\s/g, '')}</button>`;
    else plus = `<button class="ds-stepper__btn" data-a="deck-add" data-card="${id}" aria-label="Pôr uma ${nm}" title="Pôr uma">+</button>`;
    return `<span class="ds-stepper">${minus}${plus}</span>`;
  }
  /** três casas por carta: cheia = no deck; contorno = você tem e está livre; tracejada = não tem; vermelha = o deck usa uma que você não tem */
  copiesIn(s, id, inDeck) {
    const max = DECK_RULES.maxCopies, has = Meta.owned(s, id), own = Math.min(has, max);
    const cls = (k) => (k < inDeck ? (k < own ? 'is-on' : 'is-lack') : k < own ? 'is-own' : '');
    return `<span class="ds-copies" role="img" aria-label="${inDeck} no deck, você tem ${has}" title="${inDeck} no deck, você tem ${has}">${Array.from({ length: max }, (_, k) => `<i class="${cls(k)}"></i>`).join('')}</span>`;
  }
  deckStats(cards) {
    const cs = cards.map((id) => byId.get(id));
    return { creatures: cs.filter((c) => !isFx(c)).length, effects: cs.filter((c) => c.kind === 'effect_instant').length, traps: cs.filter((c) => c.kind === 'effect_trap').length };
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
    this.tab.deck ??= 'decks';
    if (this.ed) return this.vEditor(s);
    return this.tab.deck === 'collection' ? this.vCollection(s) : this.vDecks(s);
  }

  // ───────── gaveta: as pastas suspensas (um deck por pasta) e a ficha da pasta escolhida ─────────
  vDecks(s) {
    const max = META.maxDecks, can = s.decks.length < max, k = this.fdSel;
    if (k == null || (k === 'new' ? !can : !s.decks[Number(k)])) this.fdSel = String(s.activeDeck);
    this.fdView = null;
    const back = backUrl(s.cosmetics.back, s.cosmetics.logo, asset('cards/back.png'));
    const item = (d, i) => {
      const errs = Meta.deckErrors(s, d.cards), ok = !errs.length, on = i === s.activeDeck, faces = this.faces(d.cards), sel = String(i) === this.fdSel;
      return `<article class="fd-item ${sel ? 'is-sel' : ''}" data-show="${i}" data-deck="${i}">
        <button class="ds-hangfile ${on ? 'is-on' : ''} ${ok ? '' : 'is-bad'}" data-a="fd-pick" data-id="${i}" aria-pressed="${sel}" aria-label="${esc(d.name)}, ${d.cards.length} de ${DECK_RULES.size} cartas${on ? ', no duelo' : ''}">
          <span class="ds-hangfile__tab">${on ? '★ No duelo' : `Pasta ${String(i + 1).padStart(2, '0')}`}</span>
          <span class="ds-hangfile__cards" aria-hidden="true">${faces.length ? faces.map((id) => mini(id)).join('') : `<img class="ds-mini" src="${back}" alt=""><img class="ds-mini" src="${back}" alt="">`}</span>
          <span class="ds-hangfile__front"><b>${esc(d.name)}</b><small><span>${d.cards.length}/${DECK_RULES.size}</span><span>${ok ? 'pronto' : this.hardErrors(errs).length ? 'com erro' : 'incompleto'}</span></small></span>
        </button></article>`;
    };
    const fresh = can ? `<article class="fd-item ${this.fdSel === 'new' ? 'is-sel' : ''}" data-show="new">
        <button class="ds-hangfile is-empty" data-a="fd-pick" data-id="new" aria-pressed="${this.fdSel === 'new'}"><span class="ds-hangfile__tab">Pasta vazia</span><span class="ds-hangfile__cards"></span><span class="ds-hangfile__front"><b>+ Novo deck</b><small>montar ou começar do zero</small></span></button></article>` : '';
    return `<div class="sc fd">
      <section class="sc-shelf"><div class="sc-tools"><b>${s.decks.length} de ${max} pastas</b><span class="fd-tip">Clique de novo para abrir a pasta</span></div>
        <div class="lb-scroll fd-grid">${s.decks.map(item).join('')}${fresh}</div></section>
      <aside class="sc-view" aria-live="polite">${this.fdFile(this.fdSel)}</aside>
    </div>`;
  }
  /** ficha da pasta: nome, estado, composição, cartas-chave e uma ação principal que muda com o caso */
  fdFile(k) {
    const s = this.s, max = META.maxDecks;
    if (k === 'new') return `<section class="ds-sheet ds-file fd-file">
      <div class="ds-bar"><span>Pasta vazia</span><b>${s.decks.length + 1} de ${max}</b></div>
      <div class="ds-body"><div><span class="ds-formlabel">Novo deck</span><h3 class="ds-title">Pasta vazia</h3><p class="ds-manifest__line">O arquivo monta ${DECK_RULES.size} cartas com o melhor da sua coleção. Depois você ajusta.</p></div>
        <span></span><span></span>
        <footer class="ds-file__foot fd-foot"><div class="fd-main"><button class="ds-btn" data-a="deck-new" data-id="blank">Em branco</button><button class="ds-btn ds-btn--primary" data-a="deck-new" data-id="auto">Montar automático</button></div></footer></div></section>`;
    const i = Number(k), d = s.decks[i]; if (!d) return '';
    const errs = Meta.deckErrors(s, d.cards), ok = !errs.length, hard = this.hardErrors(errs), on = i === s.activeDeck, st = this.deckStats(d.cards), n = d.cards.length;
    const tag = ok ? 'Pronto' : hard.length ? 'Com erro' : 'Incompleto';
    const line = ok ? `${n} de ${DECK_RULES.size} cartas, pronto para a mesa.` : hard.length ? esc(hard[0]) : `Faltam ${DECK_RULES.size - n} cartas para fechar ${DECK_RULES.size}.`;
    const edit = (primary) => `<button class="ds-btn ${primary ? 'ds-btn--primary' : ''}" data-a="deck-edit" data-id="${i}">${ok ? 'Editar' : 'Abrir e completar'}</button>`;
    const main = on ? `<i class="ds-stamp ds-stamp--ok">No duelo</i>${edit(true)}` : ok ? `${edit(false)}<button class="ds-btn ds-btn--primary" data-a="deck-use" data-id="${i}">Usar no duelo</button>` : edit(true);
    const faces = this.faces(d.cards);
    return `<section class="ds-sheet ds-file fd-file ${ok ? '' : 'is-bad'}">
      <div class="ds-bar"><span>Pasta ${String(i + 1).padStart(2, '0')}</span><b>${tag}</b></div>
      <div class="ds-body">
        <div><span class="ds-formlabel">Deck</span><h3 class="ds-title">${esc(d.name)}</h3><p class="ds-manifest__line ${ok ? '' : 'fd-warn'}">${line}</p></div>
        <dl class="ds-file__stats"><div><dt>Criaturas</dt><dd>${st.creatures}</dd></div><div><dt>Efeitos</dt><dd>${st.effects}</dd></div><div><dt>Armadilhas</dt><dd>${st.traps}</dd></div></dl>
        <div class="fd-faces" aria-hidden="true">${faces.map((id) => mini(id)).join('')}</div>
        <footer class="ds-file__foot fd-foot">
          <div class="fd-minor"><button class="ds-btn ds-btn--link" data-a="deck-dup" data-id="${i}" ${s.decks.length >= max ? 'disabled title="Gaveta cheia"' : ''}>Duplicar</button><button class="ds-btn ds-btn--link" data-a="deck-del" data-id="${i}" ${s.decks.length <= 1 ? 'disabled title="Precisa sobrar um deck"' : ''}>Apagar</button></div>
          <div class="fd-main">${main}</div></footer>
      </div></section>`;
  }

  // ───────── álbum: a coleção como álbum de figurinhas (falta = espaço vazio com o número) ─────────
  vCollection(s) {
    const list = this.cardList(s), max = DECK_RULES.maxCopies;
    if (!list.some((c) => c.id === this.alSel)) this.alSel = list[0]?.id ?? null;
    this.alView = null;
    const item = (c) => {
      const own = Math.min(Meta.owned(s, c.id), max), sel = c.id === this.alSel, nm = esc(c.name);
      return `<article class="al-item sc-item--${Meta.rarityOf(c.id)} ${sel ? 'is-sel' : ''} ${own ? '' : 'is-missing'}" data-show="${c.id}">
        <button class="ds-slot ${own ? 'is-filled' : ''}" data-a="al-pick" data-id="${c.id}" aria-pressed="${sel}" aria-label="${nm}: você tem ${own} de ${max}">${own ? `${mini(c.id)}<i class="ds-slot__corners" aria-hidden="true"></i>` : `<span class="ds-slot__no">Nº ${c.id.slice(4)}</span><span class="ds-slot__name">${nm}</span>`}</button>
        <div class="sc-meta al-meta">${copies(own)}${own ? '' : '<em class="al-miss">Falta</em>'}</div></article>`;
    };
    return `<div class="sc al">
      <section class="sc-shelf">${this.vTools(s, list.length, { count: `<b class="al-count">${Meta.distinctOwned(s)} de ${CARDS.length}</b>` })}
        <div class="lb-scroll sc-grid al-grid">${list.map(item).join('') || '<p class="sc-none">Nenhuma carta com esse filtro.</p>'}</div></section>
      <aside class="sc-view" aria-live="polite">${this.alSel ? this.scFile(this.alSel, 'shop') : ''}</aside>
    </div>`;
  }

  // ───────── editor: a grade de cartas à esquerda e o deck em montagem à direita ─────────
  vEditor(s) {
    const d = s.decks[this.ed.index], snap = this.ed.snap, counts = new Map(group(d.cards)), errs = Meta.deckErrors(s, d.cards), ok = !errs.length, hard = this.hardErrors(errs);
    const on = this.ed.index === s.activeDeck, n = d.cards.length, fresh = this.ed.fresh, max = DECK_RULES.maxCopies;
    const changed = d.name !== snap.name || sortCards(d.cards).join() !== snap.cards.join();
    const item = (c) => {
      const own = Meta.owned(s, c.id), inDeck = counts.get(c.id) ?? 0, nm = esc(c.name), p = Meta.priceOf(c.id), poor = p > s.patrimonio;
      return `<article class="ed-item sc-item--${Meta.rarityOf(c.id)} ${inDeck ? 'is-in' : ''} ${own ? '' : 'is-missing'}" data-card="${c.id}">
        <button class="ed-card" data-a="deck-add" data-card="${c.id}" aria-label="${nm}: pôr uma no deck (${inDeck} no deck, você tem ${own})">${mini(c.id)}</button>
        <div class="sc-meta">${this.copiesIn(s, c.id, inDeck)}${this.stepper(s, d.cards, c.id, inDeck)}</div></article>`;
    };
    const list = this.cardList(s);
    const GROUPS = [['Criaturas', (c) => !isFx(c)], ['Efeitos', (c) => c.kind === 'effect_instant'], ['Armadilhas', (c) => c.kind === 'effect_trap']];
    const rows = GROUPS.map(([title, test]) => {
      const g = [...counts.entries()].filter(([id]) => test(byId.get(id))); if (!g.length) return '';
      return `<li class="ed-group"><span>${title}</span><em>${g.reduce((a, [, k]) => a + k, 0)}</em></li>${g.map(([id, k]) => {
        const has = Meta.owned(s, id), short = k > Math.min(has, max), nm = esc(byId.get(id).name), isNew = fresh?.has(id);
        return `<li class="ed-row ${short ? 'is-short' : ''}" data-card="${id}"><b>${k}×</b><span class="ed-row__name" title="${nm}">${nm}</span>${isNew ? '<i class="ed-new">nova</i>' : ''}${short ? `<i class="ed-warn">tem ${has}</i>` : ''}${this.stepper(s, d.cards, id, k, true)}</li>`;
      }).join('')}`;
    }).join('');
    const state = ok ? 'pronto' : hard.length ? 'com erro' : `faltam ${DECK_RULES.size - n}`;
    const primary = !ok ? `<button class="ds-btn ds-btn--primary" data-a="deck-fill">Completar automático</button>` : on ? '<i class="ds-stamp ds-stamp--ok">No duelo</i>' : `<button class="ds-btn ds-btn--primary" data-a="deck-use" data-id="${this.ed.index}">Usar no duelo</button>`;
    const minor = `${this.ed.prev ? '<button class="ds-btn ds-btn--link" data-a="deck-unfill">Desfazer o automático</button>' : `<button class="ds-btn ds-btn--link" data-a="deck-undo" ${changed ? '' : 'hidden'}>Desfazer alterações</button>`}<button class="ds-btn ds-btn--link" data-a="deck-clear" ${n ? '' : 'disabled'}>Esvaziar</button>`;
    return `<div class="sc ed">
      <section class="sc-shelf ed-shelf">${this.vTools(s, list.length, { back: true })}
        <div class="lb-scroll ed-grid">${list.map(item).join('') || '<p class="sc-none">Nenhuma carta com esse filtro.</p>'}</div>
        <p class="ed-hint"><span>+ põe no deck</span><span>− tira</span><span>Passe o mouse para ler a carta</span></p>
        <div class="ed-peek" aria-hidden="true"></div>
      </section>
      <section class="ds-sheet ds-file ed-side">
        <div class="ds-bar"><span>Deck em montagem</span><b>Pasta ${String(this.ed.index + 1).padStart(2, '0')}</b></div>
        <div class="ds-body">
          <div class="ed-top"><input id="lb-deck-name" class="ed-name" maxlength="24" value="${esc(d.name)}" spellcheck="false" autocomplete="off" aria-label="Nome do deck" title="Nome do deck (clique para mudar)">
            <div class="ed-count is-${ok ? 'ok' : hard.length ? 'bad' : 'short'}"><b>${n}</b><span>/${DECK_RULES.size}</span><small>${state}</small></div>
            ${hard.length ? `<p class="ed-err">${esc(hard[0])}${hard.length > 1 ? ` (e mais ${hard.length - 1})` : ''}</p>` : ''}</div>
          <ul class="ed-list">${rows || '<li class="ed-empty">Deck vazio. Clique nas cartas ao lado ou use "Completar automático".</li>'}</ul>
          <footer class="ds-file__foot ed-foot"><div class="fd-minor">${minor}</div>${primary}</footer>
        </div></section>
    </div>`;
  }
  // ───────── trituradora: reciclar cópias sobrando ─────────
  /** Reciclar: as cartas com cópia sobrando à esquerda; à direita, a trituradora (arraste uma carta até ela) e a ordem */
  vRecycle(s) {
    const list = CARDS.filter((c) => Meta.extrasOf(s, c.id) > 0), n = Meta.totalExtras(s);
    if (!list.some((c) => c.id === this.rcSel)) this.rcSel = null;
    const item = (c) => {
      const k = Meta.extrasOf(s, c.id), v = k * Meta.recycleValue(c.id), sel = c.id === this.rcSel;
      return `<article class="rc-item sc-item--${Meta.rarityOf(c.id)} ${sel ? 'is-sel' : ''}">
        <button class="rc-card" data-a="rc-pick" data-id="${c.id}" aria-pressed="${sel}" aria-label="${esc(c.name)}: ${k} sobrando, valem ${money(v)}" title="Arraste até a trituradora">${mini(c.id)}<b class="ds-qty rc-qty">+${k}</b></button>
        <p class="rc-val">+ ${money(v)}</p></article>`;
    };
    if (ROOM) {
      const val = list.reduce((a, c) => a + Meta.extrasOf(s, c.id) * Meta.recycleValue(c.id), 0), sel = this.rcSel, sk = sel ? Meta.extrasOf(s, sel) : 0, sv = sk * (sel ? Meta.recycleValue(sel) : 0);
      const foot = !n ? '<button class="ds-btn ds-btn--primary" disabled>Nada para triturar</button>'
        : sel ? `<button class="ds-btn ds-btn--primary" data-a="recycle" data-id="${sel}">Triturar ${esc(byId.get(sel).name)} (+ ${money(sv)})</button><button class="ds-btn ds-btn--link" data-a="rc-all">Triturar tudo</button>`
          : `<button class="ds-btn ds-btn--primary" data-a="rc-all">Triturar tudo e receber ${money(val)}</button>`;
      return `<section class="sc-shelf rc-room">
        <div class="sc-tools"><b>${n} ${n === 1 ? 'cópia sobrando' : 'cópias sobrando'}</b><span class="fd-tip">${n ? 'Arraste até a trituradora' : ''}</span></div>
        ${list.length ? `<div class="lb-scroll sc-grid rc-grid">${list.map(item).join('')}</div>` : `<div class="rc-empty"><b>Nada sobrando</b><p>Quando você tiver mais de ${DECK_RULES.maxCopies} cópias de uma carta, as extras aparecem aqui e viram dinheiro.</p></div>`}
        <footer class="rc-room__foot">${n ? `<p class="rc-total"><span>${sel ? 'Esta carta rende' : 'Entra no patrimônio'}</span><b>+ ${money(sel ? sv : val)}</b></p>` : ''}<div class="rc-foot">${foot}</div></footer>
      </section>`;
    }
    return `<div class="sc rc">
      <section class="sc-shelf"><div class="sc-tools"><b>${n} ${n === 1 ? 'cópia sobrando' : 'cópias sobrando'}</b><span class="fd-tip">Acima de ${DECK_RULES.maxCopies} cópias, a carta sobra e vale ${Math.round(META.recycleRate * 100)}% do preço.</span></div>
        ${list.length ? `<div class="lb-scroll sc-grid rc-grid">${list.map(item).join('')}</div>` : `<div class="rc-empty"><b>Nada sobrando</b><p>Quando você tiver mais de ${DECK_RULES.maxCopies} cópias de uma carta, as extras aparecem aqui e viram dinheiro.</p></div>`}</section>
      <aside class="sc-view">${this.rcOrder()}</aside>
    </div>`;
  }
  /** a trituradora (peça .ds-shredder, desenhada por src/shredder.js), o total e a ação */
  rcOrder() {
    const s = this.s, list = CARDS.filter((c) => Meta.extrasOf(s, c.id) > 0), n = Meta.totalExtras(s), sel = this.rcSel;
    const val = list.reduce((a, c) => a + Meta.extrasOf(s, c.id) * Meta.recycleValue(c.id), 0);
    const sk = sel ? Meta.extrasOf(s, sel) : 0, sv = sk * (sel ? Meta.recycleValue(sel) : 0);
    const foot = !n ? '<button class="ds-btn ds-btn--primary" disabled>Nada para triturar</button>'
      : sel ? `<button class="ds-btn ds-btn--primary" data-a="recycle" data-id="${sel}">Triturar ${esc(byId.get(sel).name)} (+ ${money(sv)})</button><button class="ds-btn ds-btn--link" data-a="rc-all">Triturar tudo</button>`
        : `<button class="ds-btn ds-btn--primary" data-a="rc-all">Triturar tudo e receber ${money(val)}</button>`;
    return `<section class="ds-sheet ds-file rc-file">
      <div class="ds-bar"><span>Trituradora</span><b>${n} ${n === 1 ? 'cópia' : 'cópias'} na fila</b></div>
      <div class="ds-body">
        <div class="ds-shredder ${n ? '' : 'is-idle'}"><span class="ds-shredder__hint">${n ? 'Arraste uma carta até aqui' : 'Sem nada para triturar'}</span></div>
        ${n ? `<p class="rc-total"><span>${sel ? 'Esta carta rende' : 'Entra no patrimônio'}</span><b>+ ${money(sel ? sv : val)}</b></p>` : '<span></span>'}
        <footer class="ds-file__foot rc-foot">${foot}</footer>
      </div></section>`;
  }
  /** a máquina é uma só (a pilha de tiras fica enquanto o jogo está aberto); a cada redesenho o canvas volta para o lugar */
  mountShredder() {
    const box = $('.ds-shredder', this.win); if (!box) return;
    this.shredder ??= createShredder();
    this.shredder.mount(box); this.shredder.setIdle(box.classList.contains('is-idle'));
  }
  rcDragMove(e) {
    const d = this.rcDrag; if (!d) return;
    if (!d.on) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 7) return;
      const r = d.el.getBoundingClientRect(), g = document.createElement('img');
      g.className = 'rc-ghost'; g.src = miniUrl(d.id); g.alt = ''; Object.assign(g.style, { width: `${r.width}px`, left: `${r.left}px`, top: `${r.top}px` });
      document.body.appendChild(g); d.on = true; d.g = g; d.r = r; d.el.classList.add('is-lifted'); document.body.classList.add('rc-dragging'); sfx('card');
    }
    d.g.style.transform = `translate(${e.clientX - d.x}px, ${e.clientY - d.y}px) rotate(${Math.max(-8, Math.min(8, (e.clientX - d.x) / 40))}deg)`;
    let hot;
    if (ROOM) {
      const q = this.lobby.shredderScreen(), aim = (this.rcAim ??= Object.assign(document.createElement('div'), { className: 'rc-aim', innerHTML: '<i></i><span>Solte para triturar</span>' }));
      if (!aim.isConnected) document.body.appendChild(aim);
      aim.style.left = `${q.x}px`; aim.style.top = `${q.y}px`; aim.classList.add('is-on');
      hot = Math.hypot(e.clientX - q.x, e.clientY - q.y) < 130;
      if (hot !== d.hot) { aim.classList.toggle('is-hot', hot); this.lobby.setShredHot(hot); }
    } else {
      const sh = $('.ds-shredder', this.win), q = sh?.getBoundingClientRect();
      hot = !!q && e.clientX > q.left - 20 && e.clientX < q.right + 20 && e.clientY > q.top - 30 && e.clientY < q.bottom;
      if (hot !== d.hot) { sh?.classList.toggle('is-hot', hot); this.shredder?.setHot(hot); }
    }
    if (hot !== d.hot) { d.hot = hot; if (hot) sfx('hover'); }
  }
  rcDragEnd() {
    const d = this.rcDrag; this.rcDrag = null; if (!d || !d.on) return;
    this._rcDragged = true; setTimeout(() => { this._rcDragged = false; }, 0);
    document.body.classList.remove('rc-dragging'); $('.ds-shredder', this.win)?.classList.remove('is-hot'); this.shredder?.setHot(false);
    this.rcAim?.classList.remove('is-on', 'is-hot'); this.lobby.setShredHot?.(false);
    const g = d.g;
    if (d.hot) {
      // a carta voa até onde a máquina a recebe e a trituração começa
      const q = ROOM && this.lobby.shredderScreen(), gr = g.getBoundingClientRect();
      // na sala, a carta encolhe até o tamanho e o lugar da carta 3D em cima da fenda, e só então troca
      const m = ROOM ? { left: q.x - q.w / 2, top: q.y - q.h, width: q.w } : this.shredder?.cardStart();
      if (m) g.animate([{ transform: g.style.transform }, { transform: `translate(${m.left - d.r.left}px, ${m.top - d.r.top}px) scale(${m.width / gr.width})` }], { duration: 170, easing: 'ease-in', fill: 'forwards' }).onfinish = () => g.remove();
      else g.remove();
      setTimeout(() => this.shred([d.id]), 150);
    } else {
      g.animate([{ transform: g.style.transform }, { transform: 'translate(0, 0) rotate(0)' }], { duration: 220, easing: 'ease-out', fill: 'forwards' }).onfinish = () => { g.remove(); d.el.classList.remove('is-lifted'); };
      sfx('cancel');
    }
  }
  /** a máquina tritura as cartas uma a uma (src/shredder.js); no fim, grava e imprime o aviso */
  async shred(ids) {
    if (this.rcBusy || !ids.length) return;
    const eng = ROOM ? { shred: (u, o) => this.lobby.shredIn(u, o) } : this.shredder, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => {
      const one = ids.length === 1 ? ids[0] : null, r = Meta.recycle(this.s, one, Date.now());
      this.rcBusy = false; this.rcSel = null;
      if (this.commit(r)) this.toast(`<b>${r.count} ${r.count === 1 ? 'carta triturada' : 'cartas trituradas'}</b>${one ? `<span>${esc(byId.get(one).name)}</span>` : ''}`, 'gold', { amount: r.gained });
    };
    if (!eng || reduce) { finish(); return; }
    this.rcBusy = true; this.win.querySelectorAll('.rc-file button, .rc-card').forEach((b) => { b.disabled = true; });
    $('.ds-shredder', this.win)?.classList.add('is-busy');
    const feed = ids.length > 6 ? 520 : ids.length > 2 ? 750 : 1100;
    for (const id of ids) { sfx('sacrifice'); await eng.shred(miniUrl(id), { feed }); }
    await new Promise((ok) => setTimeout(ok, 700));
    $('.ds-shredder', this.win)?.classList.remove('is-busy');
    finish();
  }




  // ───────── sala de reunião e treino ─────────
  deckLine(s) { const d = Meta.activeDeck(s), ok = Meta.activeDeckValid(s); return `<div class="lb-deckline ${ok ? '' : 'bad'}"><span class="memo">Deck escolhido</span><b>${esc(d.name)}</b><span>${ok ? `pronto, ${d.cards.length} cartas` : esc(Meta.deckErrors(s, d.cards)[0] ?? 'Deck inválido')}</span><button data-a="open" data-id="deck">Trocar no arquivo</button></div>`; }
  /** maço do deck escolhido: três cartas de verdade em leque, presas por uma cinta de papel com nome e contagem */
  /** o deck que vai para a mesa (peça .ds-deckline): três cartas reduzidas em leque, nome, estado e "Trocar" */
  deckLine(s) {
    const d = Meta.activeDeck(s), ok = Meta.activeDeckValid(s), order = { legendary: 0, rare: 1, common: 2 };
    const top = [...new Set(d.cards)].sort((x, y) => order[Meta.rarityOf(x)] - order[Meta.rarityOf(y)] || x.localeCompare(y)).slice(0, 3);
    return `<div class="ds-deckline ${ok ? '' : 'is-bad'}">
      <span class="ds-deckline__fan" aria-hidden="true">${top.map((id) => mini(id)).join('')}</span>
      <span class="ds-deckline__txt"><span class="ds-deckline__top"><span class="ds-formlabel">Seu deck</span><button class="ds-btn cg-swap" data-a="open" data-id="deck">Trocar</button></span><b title="${esc(d.name)}">${esc(d.name)}</b><small>${ok ? `pronto, ${d.cards.length} cartas` : esc(Meta.deckErrors(s, d.cards)[0] ?? 'Deck inválido')}</small></span></div>`;
  }
  /** convocação (peça .ds-invite): a ficha da direita de Campanha e Treino, com o botão principal sempre no mesmo lugar */
  invite({ bar, tag, label, name, line = '', mid, act, ok, boss = false }) {
    return `<section class="ds-sheet ds-file ds-invite ${boss ? 'is-boss' : ''}">
      <div class="ds-bar"><span>${bar}</span><b>${tag}</b></div>
      <div class="ds-body">
        <div><span class="ds-formlabel">${label}</span><h3 class="ds-title">${esc(name)}</h3>${line ? `<p class="ds-manifest__line">${line}</p>` : ''}</div>
        ${mid}
        ${this.deckLine(this.s)}
        <footer class="ds-file__foot ds-invite__foot"><button data-a="${act[0]}" class="ds-btn ds-btn--primary" ${ok ? '' : 'disabled'}><span class="ds-key">Enter</span>${act[1]}</button></footer>
      </div></section>`;
  }

  // ───────── sala de reunião: campanha ─────────
  /** Campanha: a agenda das 30 reuniões (duas linhas por faixa) e, ao lado, a convocação da próxima */
  vDuel(s) {
    const c = s.campaign, N = CAMPAIGN.length, cleared = c.cleared, st = Math.min(c.stage, N - 1), tier = tierOf(st), boss = !cleared && tier === 3;
    const name = c.order[st], losses = cleared ? 0 : s.stats.rivals[name]?.l ?? 0;
    const day = (i) => {
      const r = c.order[i], done = i < c.stage, cur = !cleared && i === c.stage, last = i === N - 1, shown = done || cur || last;
      const tip = done ? `${r}: reunião fechada` : cur ? `${r}: próxima reunião` : last ? `${r}: chefe final` : 'Ainda em sigilo';
      return `<li class="ds-agenda__day ${done ? 'is-done' : cur ? 'is-cur' : ''} ${last ? 'is-boss' : ''}" title="${esc(tip)}"><i>${String(i + 1).padStart(2, '0')}</i>${shown ? `<b>${esc(r)}</b>` : ''}${done ? '<s aria-hidden="true"></s>' : ''}</li>`;
    };
    const days = (from, to) => Array.from({ length: to - from + 1 }, (_, k) => day(from + k)).join('');
    const label = (t, ti) => `<li class="ds-agenda__tier ${!cleared && (tier === ti || (boss && ti === 2)) ? 'is-on' : ''}" style="grid-row: ${ti * 2 + 1} / span 2"><span>${esc(t.name)}</span><b>×${String(t.reward).replace('.', ',')}</b></li>`;
    const agenda = `<section class="ds-agenda ${cleared ? 'is-cleared' : ''}">
      <span class="ds-agenda__rings" aria-hidden="true">${'<i></i>'.repeat(16)}</span>
      <header class="ds-agenda__head"><b>Agenda de reuniões</b><span>Sequência <b>${s.stats.streak}</b> / Recorde <b>${s.stats.bestStreak}</b></span></header>
      <ol class="ds-agenda__grid">${CAMPAIGN.tiers.map((t, ti) => label(t, ti) + days(t.from - 1, ti === 2 ? N - 1 : t.to - 1)).join('')}</ol>
      ${cleared ? '<i class="ds-stamp ds-stamp--ok ds-agenda__stamp">Campanha concluída</i>' : ''}
    </section>`;
    const pay = cleared ? '×1' : boss ? `×${CAMPAIGN.boss.reward}` : `×${String(CAMPAIGN.tiers[tier].reward).replace('.', ',')}`;
    const card = this.invite({
      bar: 'Convocação', tag: cleared ? 'Reunião livre' : `Reunião ${st + 1} de ${N}`, boss, ok: Meta.activeDeckValid(s),
      label: cleared ? 'Campanha concluída' : boss ? 'Chefe final' : esc(CAMPAIGN.tiers[tier].name), name: cleared ? 'Qualquer empresa' : name,
      line: cleared ? 'Paga, mas não avança na agenda.' : '',
      mid: `<dl class="ds-file__stats ds-file__stats--2"><div><dt>Vitória paga</dt><dd>${pay} <small>do caixa</small></dd></div>${cleared ? `<div><dt>Reuniões fechadas</dt><dd>${N} <small>de ${N}</small></dd></div>` : `<div><dt>Derrotas aqui</dt><dd>${losses}</dd></div>`}</dl>`,
      act: ['duel', cleared ? 'Reunião livre' : boss ? 'Enfrentar o Conselho' : 'Entrar na reunião'],
    });
    return `<div class="cg">${agenda}${card}</div>`;
  }
  /** Treino: a mesa do estagiário (mata-borrão com o crachá dele e o bilhete) e, ao lado, a ordem de treino */
  vTraining(s) {
    const photo = this.lobby.internPortrait(this.lobby.renderer) ?? '';
    const no = (t) => `<li><i class="tw-x"></i><span>${t}</span></li>`;
    const desk = `<section class="ds-deskpad tw-desk">
      <figure class="ds-badge tw-badge">
        <i class="ds-badge__strap" aria-hidden="true"></i><i class="ds-badge__clip" aria-hidden="true"></i>
        <div class="ds-badge__card"><span class="ds-badge__band">BCBC / Estágio</span><img src="${photo}" alt="Retrato do estagiário"><b>Estagiário</b><small>Não remunerado</small><i class="ds-badge__code" aria-hidden="true"></i></div>
      </figure>
      <div class="ds-postit tw-note"><i class="ds-tape ds-tape--top"></i><b>Chefe,</b>posso jogar com vc? prometo perder.<em>— o estagiário</em></div>
    </section>`;
    const card = this.invite({
      bar: 'Ordem de treino', tag: 'Sem valer', ok: Meta.activeDeckValid(s), label: 'Treino com', name: 'Estagiário',
      line: 'Ele <span class="ds-hl">erra de propósito</span>. Bom para testar um deck.',
      mid: `<div class="tw-no"><span class="ds-formlabel">Esta partida não vale</span><ul>${no('Patrimônio')}${no('Metas')}${no('Troféus')}${no('Histórico')}</ul></div>`,
      act: ['train', 'Treinar com ele'],
    });
    return `<div class="cg">${desk}${card}</div>`;
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
  /** atributos de um botão de compra da loja: desligado com "faltam $X" no title quando o PATRIMÔNIO não dá */
  priceAttrs(s, p, what = '') { return s.patrimonio >= p ? `title="${what ? `${esc(what)} por ` : 'Compra por '}${money(p)}"` : `disabled title="Faltam ${money(p - s.patrimonio)} de PATRIMÔNIO"`; }
  /** linha visível de "faltam $X" embaixo das compras grandes */
  shortLine(s, p) { return s.patrimonio < p ? `<p class="lb-short">Faltam ${money(p - s.patrimonio)} de PATRIMÔNIO</p>` : ''; }
  /** cartas avulsas: a vitrine em grade à esquerda e, à direita, sempre a ficha de uma carta (a apontada; sem apontar, a escolhida) */
  vShopCards(s) {
    const max = DECK_RULES.maxCopies, f = (this.shF ??= 'miss');
    const list = CARDS.filter((c) => f === 'all' || Meta.owned(s, c.id) < max);
    if (!list.some((c) => c.id === this.scSel)) this.scSel = list[0]?.id ?? null;
    this.scView = null;
    const item = (c) => {
      const own = Math.min(Meta.owned(s, c.id), max), full = own >= max, p = Meta.priceOf(c.id), poor = p > s.patrimonio;
      return `<article class="sc-item sc-item--${Meta.rarityOf(c.id)} ${full ? 'is-full' : ''} ${c.id === this.scSel ? 'is-sel' : ''}" data-show="${c.id}">
        <button class="sc-card" data-a="sc-pick" data-card="${c.id}" aria-pressed="${c.id === this.scSel}" aria-label="${esc(c.name)}: você tem ${own} de ${max}">${mini(c.id)}</button>
        <div class="sc-meta">${copies(own)}${full ? '<em class="sc-done">Completa</em>' : `<button class="ds-price sc-buy ${poor ? 'is-poor' : ''}" data-a="buy-card" data-id="${c.id}" ${poor ? `disabled title="Faltam ${money(p - s.patrimonio)}"` : `title="Comprar ${esc(c.name)}"`}>${money(p)}</button>`}</div></article>`;
    };
    return `<div class="sc">
      <section class="sc-shelf">
        <div class="sc-tools"><b>${list.length} carta${list.length === 1 ? '' : 's'}</b><button class="ds-check ${f === 'miss' ? 'is-on' : ''}" role="switch" aria-checked="${f === 'miss'}" data-a="sh-filter">Só as que faltam</button></div>
        <div class="lb-scroll sc-grid">${list.map(item).join('') || '<p class="sc-none">Arquivo completo. Não falta nenhuma carta.</p>'}</div>
      </section>
      <aside class="sc-view" aria-live="polite">${this.scSel ? this.scFile(this.scSel) : ''}</aside>
    </div>`;
  }
  /** ficha da carta (peça .ds-file): foto presa por clipe, título, categorias, atributos, texto completo, cópias e a compra */
  /** ficha da carta (peça .ds-cardfile): o único lugar com o texto completo (R6). Topo calmo (foto pequena, nome e uma
   *  linha de categorias), atributos numa faixa, regras e, no pé, as cópias junto da ação. compact = destaque do editor */
  scFile(id, mode = true, { compact = false, inDeck = null } = {}) {
    const c = byId.get(id), s = this.s, fx = isFx(c), max = DECK_RULES.maxCopies, own = Math.min(Meta.owned(s, id), max), price = Meta.priceOf(id), lack = price - s.patrimonio;
    const kinds = [KIND[c.kind], c.element, c.department ? `Depto. ${DEPT[c.department] ?? c.department}` : ''].filter(Boolean), kind = kinds.join(' / ');
    const stats = fx ? `<p class="${compact ? 'ds-cardfile__fx' : 'ds-file__fx'}">${c.kind === 'effect_trap' ? 'Fica virada na mesa até disparar.' : c.durationTurns ? `Fica na mesa por ${c.durationTurns} turnos seus.` : 'Vale na hora e vai para o Morto.'}</p>`
      : `<dl class="${compact ? 'ds-cardfile__stats' : 'ds-file__stats'}"><div><dt>Ataque</dt><dd>${money(c.atk)}</dd></div><div><dt>Defesa</dt><dd>${money(c.def)}</dd></div><div><dt>Custo</dt><dd>${c.cost ? `${c.cost} <small>sacrif.</small>` : '<small>grátis</small>'}</dd></div></dl>`;
    const action = mode === 'shop' ? (own >= max ? '<i class="ds-stamp ds-stamp--ok">Completa</i>' : `<button class="ds-btn ds-btn--primary" data-a="to-shop" data-id="${id}">${own ? 'Comprar mais' : 'Comprar na Loja'}</button>`)
      : own >= max ? '<i class="ds-stamp ds-stamp--ok">Completa</i>' : lack > 0 ? `<button class="ds-btn ds-btn--primary" disabled>Faltam ${money(lack)}</button>` : `<button class="ds-btn ds-btn--primary" data-a="buy-card" data-id="${id}">Comprar por ${money(price)}</button>`;
    const own$ = inDeck != null ? `<b>${inDeck}</b> no deck, tem <b>${own}</b>` : `Você tem <b>${own} de ${max}</b>`;
    return `<section class="ds-sheet ds-file ds-cardfile ${compact ? 'is-compact' : ''}">
      <div class="ds-bar"><span>${compact ? esc(RARITY_PT[Meta.rarityOf(id)]) : 'Ficha da carta'}</span><b>${compact ? '' : RARITY_PT[Meta.rarityOf(id)]}</b></div>
      <div class="ds-body">
        ${compact ? `<header class="ds-cardfile__head"><div><h3 class="ds-title">${esc(c.name)}</h3><p class="ds-cardfile__kind">${esc(kind)}</p></div></header>`
          : `<div class="ds-file__top"><figure class="ds-photo"><i class="ds-clip"></i><img src="${photoUrl(id)}" alt=""></figure><div><h3 class="ds-title">${esc(c.name)}</h3><p class="ds-file__kind">${kinds.map((k) => `<span>${esc(k)}</span>`).join('')}</p></div></div>`}
        ${stats}
        <ul class="ds-file__rules">${(RULES_TEXT[id] ?? []).map(([n, t]) => `<li><b>${esc(n)}</b>${esc(t)}</li>`).join('') || '<li>Sem habilidade.</li>'}</ul>
        <footer class="ds-cardfile__foot"><span class="ds-cardfile__own">${copies(own)}<span>${own$}</span></span>${mode ? action : ''}</footer>
      </div></section>`;
  }
  /** vitrine com ficha ao lado (Cartas, Decks, Visual, Troféus): o que fica na ficha sem nada apontado e como desenhar cada item */
  viewer() {
    const t = this.panel === 'shop' ? this.tab.shop : this.panel === 'deck' ? (this.ed ? null : this.tab.deck === 'collection' ? 'collection' : 'folders') : this.panel;
    return {
      folders: { def: this.fdSel, key: 'fdView', file: (k) => this.fdFile(k) },
      collection: { def: this.alSel, key: 'alView', file: (id) => this.scFile(id, 'shop') },
      cards: { def: this.scSel, key: 'scView', file: (id) => this.scFile(id) },
      decks: { def: null, key: 'dkView', file: (id) => (id ? this.scFile(id, false) : this.dkFile()) },
      look: { def: this.lkSel, key: 'lkView', file: (id) => this.lkFile(id) },
      achievements: { def: this.trSel, key: 'trView', file: (id) => this.trFile(id) },
    }[t];
  }
  /** troca a ficha da direita sem redesenhar a tela (hover e foco); null volta para o que estava escolhido */
  showFile(id) {
    const el = $('.sc-view', this.win), v = this.viewer(); if (!el || !v) return;
    id ??= v.def; if (id === (this[v.key] ?? v.def)) return;
    this[v.key] = id; el.innerHTML = v.file(id);
    for (const it of this.win.querySelectorAll('[data-show]')) it.classList.toggle('is-view', it.dataset.show === id && id !== v.def);
  }

  // ───────── loja → decks prontos ─────────
  /** caixas-arquivo no topo (um deck por vez), as cartas do deck agrupadas por tipo e, ao lado, a guia de remessa do deck */
  vShopDecks(s) {
    const decks = META.readyDecks; if (!decks.some((d) => d.id === this.dkSel)) this.dkSel = decks[0].id;
    const d = decks.find((x) => x.id === this.dkSel), miss = Meta.readyDeckMissing(s, d.id); this.dkView = null;
    const box = (x) => {
      const m = Meta.readyDeckMissing(s, x.id), n = Object.values(m).reduce((a, k) => a + k, 0), twin = Meta.readyDeckOwnedIndex(s, x.id);
      const note = n ? `${n} cópia${n > 1 ? 's' : ''} nova${n > 1 ? 's' : ''}` : twin >= 0 ? 'No arquivo' : 'Você tem todas';
      return `<button class="ds-boxfile ${x.id === d.id ? 'is-on' : ''}" data-a="dk-pick" data-id="${x.id}" aria-pressed="${x.id === d.id}"><span class="ds-boxfile__label"><b>${esc(x.name)}</b><small>${note}</small></span><i class="ds-boxfile__hole"></i></button>`;
    };
    const ids = Object.keys(d.cards).sort((a, b) => RANK_DESC[Meta.rarityOf(a)] - RANK_DESC[Meta.rarityOf(b)] || a.localeCompare(b));
    const item = (id) => `<article class="rd-item sc-item--${Meta.rarityOf(id)}" data-show="${id}" tabindex="0" aria-label="${esc(byId.get(id).name)}, ${d.cards[id]} cópias"><span class="rd-card">${mini(id)}<b class="ds-qty">×${d.cards[id]}</b>${miss[id] && !Meta.owned(s, id) ? '<i class="ds-stamp ds-stamp--ok rd-new">Nova</i>' : ''}</span></article>`;
    const groups = KINDS.map(([name, f]) => { const g = ids.filter((id) => f(byId.get(id))); return g.length ? `<h4 class="sv-h"><span>${name}</span><em>${g.reduce((a, id) => a + d.cards[id], 0)}</em></h4><div class="rd-grid">${g.map(item).join('')}</div>` : ''; }).join('');
    return `<div class="sc rd">
      <section class="sc-shelf rd-shelf"><nav class="rd-boxes" aria-label="Decks prontos">${decks.map(box).join('')}</nav><div class="lb-scroll rd-list">${groups}</div></section>
      <aside class="sc-view" aria-live="polite">${this.dkFile()}</aside>
    </div>`;
  }
  /** guia de remessa (peça .ds-manifest): o que o deck traz, o que chega para você e a única ação */
  dkFile() {
    const s = this.s, d = META.readyDecks.find((x) => x.id === this.dkSel), miss = Meta.readyDeckMissing(s, d.id), ids = Object.keys(miss);
    const n = Object.values(miss).reduce((a, k) => a + k, 0), twin = Meta.readyDeckOwnedIndex(s, d.id), price = Meta.readyDeckPrice(s, d.id), full = s.decks.length >= META.maxDecks;
    const per = KINDS.map(([name, f]) => [name, Object.entries(d.cards).filter(([id]) => f(byId.get(id))).reduce((a, [, k]) => a + k, 0)]);
    let action;
    if (twin >= 0 && !ids.length) action = `<i class="ds-stamp ds-stamp--ok">No arquivo</i><button class="ds-btn" data-a="deck-open" data-id="${twin}">Abrir no Arquivo</button>`;
    else if (full && twin < 0) action = `<button class="ds-btn ds-btn--primary" disabled title="Apague um deck no Arquivo para comprar">Arquivo cheio (${META.maxDecks}/${META.maxDecks})</button>`;
    else if (!price) action = `<button class="ds-btn ds-btn--primary" data-a="buy-deck" data-id="${d.id}">Guardar lista de graça</button>`;
    else if (price > s.patrimonio) action = `<button class="ds-btn ds-btn--primary" disabled>Faltam ${money(price - s.patrimonio)}</button>`;
    else action = `<button class="ds-btn ds-btn--primary" data-a="buy-deck" data-id="${d.id}">Comprar por ${money(price)}</button>`;
    return `<section class="ds-sheet ds-file ds-manifest">
      <div class="ds-bar"><span>Guia de remessa</span><b>${Object.values(d.cards).reduce((a, k) => a + k, 0)} cartas</b></div>
      <div class="ds-body">
        <div><h3 class="ds-title">${esc(d.name)}</h3><p class="ds-manifest__line">${esc(d.text)}</p></div>
        <dl class="ds-file__stats">${per.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        <div class="ds-manifest__gain">${ids.length ? `<p>Chegam <b>${n} cópia${n > 1 ? 's' : ''}</b> de ${ids.length} carta${ids.length > 1 ? 's' : ''} que faltam na sua coleção.</p><small>Avulsas, sairiam por ${money(Meta.readyDeckValue(s, d.id))}.</small>` : '<p>Você já tem todas as cartas deste deck.</p>'}</div>
        <footer class="ds-file__foot ds-manifest__foot">${action}</footer>
      </div></section>`;
  }

  // ───────── loja → visual ─────────
  /** logos e versos em grade; ao lado, a prova de gráfica do item apontado ou escolhido */
  vShopLook(s) {
    if (!META.cosmetics.some((c) => c.id === this.lkSel)) this.lkSel = s.cosmetics.back; this.lkView = null;
    const item = (c) => {
      const own = s.cosmetics.owned.includes(c.id), on = s.cosmetics[c.kind] === c.id, poor = c.price > s.patrimonio;
      const pic = c.kind === 'logo' ? `<span class="lk-logo"><img src="${inkLogo(c.id)}" alt=""></span>` : `<img class="lk-back" src="${backUrl(c.id, s.cosmetics.logo, asset('cards/back.png'))}" alt="">`;
      const meta = on ? '<em class="lk-on">Em uso</em>' : own ? '<em class="lk-own">Seu</em>' : `<button class="ds-price" data-a="buy-cos" data-id="${c.id}" ${poor ? `disabled title="Faltam ${money(c.price - s.patrimonio)}"` : `title="Comprar e usar ${esc(c.name)}"`}>${money(c.price)}</button>`;
      return `<article class="lk-item lk-item--${c.kind} ${on ? 'is-on' : ''} ${c.id === this.lkSel ? 'is-sel' : ''}" data-show="${c.id}"><button class="lk-pick" data-a="lk-pick" data-id="${c.id}" aria-pressed="${c.id === this.lkSel}" aria-label="${esc(c.name)}">${pic}</button><div class="sc-meta">${meta}</div></article>`;
    };
    const sec = (kind, name) => { const l = META.cosmetics.filter((c) => c.kind === kind); return `<h4 class="sv-h"><span>${name}</span><em>${l.filter((c) => s.cosmetics.owned.includes(c.id)).length} de ${l.length}</em></h4><div class="lk-grid lk-grid--${kind}">${l.map(item).join('')}</div>`; };
    return `<div class="sc lk">
      <section class="sc-shelf lk-shelf"><div class="lb-scroll lk-list">${sec('logo', 'Logo da empresa')}${sec('back', 'Verso das cartas')}</div></section>
      <aside class="sc-view" aria-live="polite">${this.lkFile(this.lkSel)}</aside>
    </div>`;
  }
  /** prova de gráfica (peça .ds-proof): o item impresso grande, com marcas de corte e tira de cor, e a única ação */
  lkFile(id) {
    const s = this.s, c = META.cosmetics.find((x) => x.id === id), own = s.cosmetics.owned.includes(id), on = s.cosmetics[c.kind] === id;
    const art = c.kind === 'logo' ? `<img class="ds-proof__logo" src="${inkLogo(id)}" alt="">` : `<img class="ds-proof__back" src="${backUrl(id, s.cosmetics.logo, asset('cards/back.png'))}" alt="">`;
    const action = on ? '<i class="ds-stamp ds-stamp--ok">Em uso</i>' : own ? `<button class="ds-btn ds-btn--primary" data-a="equip" data-id="${id}">Usar</button>`
      : c.price > s.patrimonio ? `<button class="ds-btn ds-btn--primary" disabled>Faltam ${money(c.price - s.patrimonio)}</button>` : `<button class="ds-btn ds-btn--primary" data-a="buy-cos" data-id="${id}">Comprar e usar por ${money(c.price)}</button>`;
    return `<section class="ds-sheet ds-file ds-proof">
      <div class="ds-bar"><span>Prova de gráfica</span><b>${c.kind === 'logo' ? 'Logo' : 'Verso'}</b></div>
      <div class="ds-body">
        <figure class="ds-proof__sheet ds-proof__sheet--${c.kind}">${art}<i class="ds-proof__reg"></i><i class="ds-proof__reg"></i><span class="ds-proof__bar"><i></i><i></i><i></i><i></i></span></figure>
        <div><h3 class="ds-title">${esc(c.name)}</h3><p class="ds-manifest__line">${c.kind === 'logo' ? 'Vai no meio do verso das suas cartas.' : 'Verso das suas cartas no duelo.'}</p></div>
        <footer class="ds-file__foot ds-manifest__foot">${action}</footer>
      </div></section>`;
  }
  /** entrada da Loja: o envelope em palco (uma ação: abrir) e as três prateleiras ao lado */
  vShopHome(s) {
    const b = META.booster, o = b.odds, tot = o.common + o.rare + o.legendary, pct = (v) => Math.round((v / tot) * 100), short = b.price - s.patrimonio;
    const RANK = { legendary: 0, rare: 1, common: 2 }, top = [...CARDS].sort((x, y) => RANK[Meta.rarityOf(x.id)] - RANK[Meta.rarityOf(y.id)]).slice(0, 3).map((c) => c.id);
    const d0 = META.readyDecks[0], dk = d0 ? Object.keys(d0.cards).sort((x, y) => RANK[Meta.rarityOf(x)] - RANK[Meta.rarityOf(y)]).slice(0, 3) : top;
    const lk = META.cosmetics.find((c) => c.kind === 'logo' && c.id !== s.cosmetics.logo) ?? META.cosmetics.find((c) => c.kind === 'logo');
    const shelf = (id, name, pic) => `<button class="sh-shelf sh-shelf--${id}" data-a="tab" data-id="${id}"><span class="sh-pic">${pic}</span><b class="ds-dymo">${name}</b><i>›</i></button>`;
    return `<div class="sh">
      <section class="sh-stage">
        <button class="ds-btn ds-btn--sq sh-q ${this.shOdds ? 'on' : ''}" data-a="sh-odds" aria-expanded="${!!this.shOdds}" title="Chances do envelope">?</button>
        ${this.shOdds ? `<div class="ds-postit sh-odds"><b>Chances por carta</b><p><span>Comum</span><em>${pct(o.common)}%</em></p><p><span>Rara</span><em>${pct(o.rare)}%</em></p><p><span>Lendária</span><em>${pct(o.legendary)}%</em></p><small>Enquanto faltar carta, não vem repetida sobrando.</small></div>` : ''}
        <div class="sh-env"><i></i><i></i>${envelope(`${b.size} cartas sorteadas`)}</div>
        <div class="sh-buy">${short > 0
          ? `<button class="ds-btn ds-btn--primary ds-btn--lg" disabled>Faltam ${money(short)}</button><button class="ds-btn ds-btn--lg" data-a="open" data-id="duel">Ganhar mais</button>`
          : `<button class="ds-btn ds-btn--primary ds-btn--lg" data-a="buy-pack">Abrir por ${money(b.price)}</button>`}</div>
      </section>
      <nav class="sh-shelves">
        ${shelf('cards', 'Cartas avulsas', `<span class="sh-fan">${top.map((id) => mini(id)).join('')}</span>`)}
        ${shelf('decks', 'Decks prontos', `<span class="sh-box">${dk.map((id) => mini(id)).join('')}<u>Deck</u></span>`)}
        ${shelf('look', 'Visual', `<span class="sh-look"><img src="${logoUrl(lk.id)}" alt=""><img src="${backUrl(s.cosmetics.back, s.cosmetics.logo, asset('cards/back.png'))}" alt=""></span>`)}
      </nav>
    </div>`;
  }
  vShop(s) {
    const t = (this.tab.shop ??= 'packs');
    return { packs: () => this.vShopHome(s), cards: () => this.vShopCards(s), decks: () => this.vShopDecks(s), look: () => this.vShopLook(s) }[t]();
  }
  // ───────── abertura de pacote ─────────
  // Cada carta vira com um clique nela ou com Enter/botão (a próxima fechada). Carta virada não fecha nada: só o botão
  // guarda. Esc vira todas de uma vez e, com todas viradas, guarda. Enter segurado e clique duplo não pulam a revelação.
  openPack(cards) {
    this.pack = { cards, open: new Set(), t0: performance.now(), lock: 0 };
    const s = this.s, back = backUrl(s.cosmetics.back, s.cosmetics.logo, asset('cards/back.png'));
    const el = $('.lb-pack', this.root); el.classList.remove('hidden'); this.root.classList.add('is-pack');
    el.innerHTML = `<div class="pk">
      <div class="pk-env">${envelope()}</div>
      <div class="pk-row">${cards.map((c, i) => `<button class="pk-card pk-card--${c.rarity}" data-i="${i}" data-a="pack-flip" data-id="${i}" aria-label="Carta fechada"><span class="pk-in"><img class="pk-back" src="${back}" alt=""><span class="pk-front">${mini(c.cardId)}</span></span><span class="pk-tag"></span><em class="pk-name" aria-live="polite"></em></button>`).join('')}</div>
      <button data-a="pack-next" class="ds-btn ds-btn--primary ds-btn--lg" id="lb-pack-btn">Virar carta <span class="ds-key">Enter</span></button></div>`;
    $('#lb-pack-btn', el).focus({ preventScroll: true });
    sfx('start');
  }
  /** vira a carta i (se ainda estiver fechada); virada, o clique nela abre a ficha */
  packFlip(i) {
    const p = this.pack; if (!p || p.open.has(i) || !p.cards[i]) return;
    p.open.add(i); p.lock = performance.now() + 300;
    const c = p.cards[i], d = byId.get(c.cardId), el = $('.lb-pack', this.root), f = $(`.pk-card[data-i="${i}"]`, el);
    f.classList.add('on'); f.dataset.card = c.cardId; f.dataset.a = 'detail'; f.setAttribute('aria-label', d.name);
    $('.pk-tag', f).innerHTML = c.isNew ? '<i class="ds-stamp ds-stamp--ok">Nova</i>' : c.extra ? '<i class="ds-stamp ds-stamp--no">Sobra</i>' : '';
    $('.pk-name', f).textContent = d.name;
    sfx(c.rarity === 'legendary' ? 'effect' : c.rarity === 'rare' ? 'summon' : 'draw');
    if (p.open.size === p.cards.length) this.packDone();
  }
  /** todas viradas: o botão vira "Guardar" */
  packDone() {
    const p = this.pack, el = $('.lb-pack', this.root), n = p.cards.filter((c) => c.isNew).length;
    p.summary = n ? `${n} nova${n > 1 ? 's' : ''}` : '';
    $('#lb-pack-btn', el).innerHTML = 'Guardar <span class="ds-key">Enter</span>';
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
    const el = $('.lb-pack', this.root); this.pack = null; this.peek(null); this.closeDetail();
    el.classList.add('hidden'); el.innerHTML = ''; this.root.classList.remove('is-pack'); sfx('navBack');
    this.toast(`<b>${p.cards.length} cartas no arquivo</b>${p.summary ? `<span>${esc(p.summary)}</span>` : ''}`, 'gold');
    $('[data-a="buy-pack"]', this.win)?.focus({ preventScroll: true });
  }
  /** Esc: vira todas; se já estão viradas, guarda */
  packSkip() {
    const p = this.pack; if (!p) return;
    if (p.open.size < p.cards.length) { p.cards.forEach((_, i) => this.packFlip(i)); p.lock = performance.now() + 300; return; }
    this.packClose();
  }

  // ───────── troféus e recepção ─────────
  /** troféus: placas de mérito na parede e, ao lado, a ficha da placa (o que pede, quanto paga, quando saiu) */
  vAchievements(s) {
    const L = META.achievements, got = L.filter((a) => s.achievements[a.id] !== undefined).length;
    if (!L.some((a) => a.id === this.trSel)) this.trSel = L[0].id; this.trView = null;
    const item = (a) => { const on = s.achievements[a.id] !== undefined; return `<article class="tf-item ${a.id === this.trSel ? 'is-sel' : ''}" data-show="${a.id}"><button class="ds-plaque ${on ? 'is-on' : ''}" data-a="tr-pick" data-id="${a.id}" aria-pressed="${a.id === this.trSel}"><span>${esc(a.name)}</span></button></article>`; };
    return `<div class="sc tf">
      <section class="sc-shelf"><div class="sc-tools"><b>${got} de ${L.length} na parede</b></div><div class="lb-scroll tf-grid">${L.map(item).join('')}</div></section>
      <aside class="sc-view" aria-live="polite">${this.trFile(this.trSel)}</aside>
    </div>`;
  }
  trFile(id) {
    const a = META.achievements.find((x) => x.id === id), at = this.s.achievements[id], on = at !== undefined;
    return `<section class="ds-sheet ds-file ds-trfile">
      <div class="ds-bar"><span>Placa de mérito</span><b>${on ? 'Na parede' : 'A conquistar'}</b></div>
      <div class="ds-body">
        <div class="ds-trfile__plaque"><span class="ds-plaque ${on ? 'is-on' : ''} ds-plaque--lg"><span>${esc(a.name)}</span></span></div>
        <div><h3 class="ds-title">${esc(a.text)}</h3></div>
        <dl class="ds-file__stats ds-file__stats--2"><div><dt>Paga</dt><dd>${money(a.reward)}</dd></div><div><dt>${on ? 'Ganha em' : 'Situação'}</dt><dd class="${on ? '' : 'is-small'}">${on ? (at ? dateStr(at).split(' ')[0] : '—') : 'em aberto'}</dd></div></dl>
        <footer class="ds-file__foot ds-manifest__foot">${on ? '<i class="ds-stamp ds-stamp--ok">Pago</i>' : '<p class="ds-manifest__line">Paga sozinha quando você cumprir.</p>'}</footer>
      </div></section>`;
  }
  // ───────── recepção: perfil da empresa ─────────
  vProfile(s) {
    const t = (this.tab.profile = ['card', 'history'].includes(this.tab.profile) ? this.tab.profile : 'card');
    return t === 'history' ? this.vLedger(s) : this.vCharter(s);
  }
  /** Ficha: o contrato social (peça .ds-charter) e, ao lado, os indicadores */
  vCharter(s) {
    const st = s.stats, c = s.campaign, fav = Meta.favoriteCard(s), d = new Date(save.founded() ?? Date.now()), n = save.slotNo() ?? 1, p2 = (x) => String(x).padStart(2, '0');
    const stage = c.cleared ? 'campanha concluída' : `reunião ${Math.min(c.stage + 1, CAMPAIGN.length)} de ${CAMPAIGN.length}`;
    const charter = `<section class="ds-charter">
      <header class="ds-charter__head"><span>Registro Nº ${String(n).padStart(4, '0')}</span><b>Contrato social</b><span>Disquete ${n}</span></header>
      <div class="ds-charter__id"><span class="ds-seal"><img src="${inkLogo(s.cosmetics.logo)}" alt=""><button class="ds-pencil ds-seal__edit" data-a="open" data-id="shop" data-tab="look" aria-label="Trocar o logo" title="Trocar o logo">${PENCIL}</button></span>
        <div><span class="ds-formlabel">Razão social</span><h3 class="ds-charter__name">${esc(this.company())}<button class="ds-pencil ds-charter__pen" data-a="rename" aria-label="Mudar o nome" title="Mudar o nome">${PENCIL}</button></h3>
          <p class="ds-charter__meta">Fundada em ${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} / ${stage}</p></div></div>
      <dl class="ds-charter__nums"><div><dt>Vitórias</dt><dd>${st.wins}</dd></div><div><dt>Aproveitamento</dt><dd>${Meta.winRate(s)}<small>%</small></dd></div><div><dt>Coleção</dt><dd>${Meta.distinctOwned(s)}<small> de ${CARDS.length}</small></dd></div></dl>
      <footer class="ds-charter__foot"><div class="ds-charter__sign"><svg class="ds-charter__sig" viewBox="0 0 220 60" aria-hidden="true"><path d="M8 44 C 18 10, 30 10, 26 40 C 24 52, 40 30, 48 22 C 56 12, 60 44, 70 36 C 78 28, 82 18, 90 30 C 96 40, 104 26, 112 24 C 122 22, 118 46, 132 38 C 146 30, 150 20, 160 30 C 168 38, 176 34, 186 28 M 20 50 C 70 46, 140 48, 210 40" /></svg><span>Diretoria</span></div><i class="ds-stamp ds-stamp--ok">Registrada</i></footer>
    </section>`;
    const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    const file = `<section class="ds-sheet ds-file pf-file">
      <div class="ds-bar"><span>Indicadores</span><b>${st.games} reuni${st.games === 1 ? 'ão' : 'ões'}</b></div>
      <div class="ds-body">
        <dl class="pf-list">${row('Derrotas', st.losses)}${row('Empates', st.draws)}${row('Sequência atual', st.streak)}${row('Melhor sequência', st.bestStreak)}${row('Maior golpe', money(st.biggestHit))}${row('Já faturou', money(st.earned))}${row('Pacotes abertos', st.packs)}</dl>
        <div class="pf-fav">${fav ? `${mini(fav)}<span><span class="ds-formlabel">Carta mais usada</span><b>${esc(byId.get(fav)?.name ?? fav)}</b><small>jogada ${st.plays[fav]} ${st.plays[fav] === 1 ? 'vez' : 'vezes'}</small></span>` : '<span><span class="ds-formlabel">Carta mais usada</span><small>Nenhuma ainda.</small></span>'}</div>
        <footer class="ds-file__foot pf-foot"><div class="fd-minor"><button class="ds-btn ds-btn--link pf-wipe" data-a="wipe">Recomeçar do zero</button></div></footer>
      </div></section>`;
    return `<div class="sc pf">${charter}${file}</div>`;
  }
  /** Extrato: o histórico impresso no formulário contínuo e, ao lado, o placar por empresa */
  vLedger(s) {
    const H = s.history, p2 = (x) => String(x).padStart(2, '0'), RES = { win: 'Venceu', loss: 'Perdeu', draw: 'Empate' };
    const when = (ms) => { const d = new Date(ms); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`; };
    const num = (v) => money(v).replace(/^\$\s*/, '');
    const rows = H.map((h) => `<p class="pf-row is-${h.result}" title="${esc(dateStr(h.at))}"><span>${when(h.at)}</span><span>${esc(h.rival)}</span><span>${RES[h.result]}</span><span>${h.turns}</span><span>${num(h.caixa[0])} x ${num(h.caixa[1])}</span><span class="${h.reward > 0 ? 'pos' : ''}">${h.reward > 0 ? `+ ${money(h.reward)}` : '-'}</span></p>`).join('');
    const total = H.reduce((a, h) => a + (h.reward || 0), 0), wins = H.filter((h) => h.result === 'win').length;
    const paper = `<div class="pf-paper"><div class="ds-printout pf-ledger">
      <p class="pf-feed" aria-hidden="true"></p><p class="pf-top"><span>BCBC / Extrato de reuniões</span><span>FL 01</span></p>
      <p class="pf-row pf-cols"><span>Data</span><span>Empresa</span><span>Resultado</span><span>Turnos</span><span>Caixa</span><span>Recebido</span></p>
      ${rows || '<p class="pf-none">Nenhuma reunião registrada.</p><p class="pf-none">O extrato começa na primeira partida.</p>'}
      ${H.length ? `<p class="pf-total"><span>Total: ${H.length} reuni${H.length === 1 ? 'ão' : 'ões'} / ${wins} ${wins === 1 ? 'vitória' : 'vitórias'}</span><span class="pos">+ ${money(total)}</span></p>` : ''}
    </div></div>`;
    const R = Object.entries(s.stats.rivals ?? {}).map(([name, r]) => ({ name, w: r.w ?? 0, l: r.l ?? 0 })).filter((r) => r.w + r.l > 0).sort((a, b) => b.w + b.l - (a.w + a.l) || b.w - a.w || a.name.localeCompare(b.name));
    const file = `<section class="ds-sheet ds-file pf-file">
      <div class="ds-bar"><span>Placar por empresa</span><b>${R.length} de ${CAMPAIGN.length}</b></div>
      <div class="ds-body">
        ${R.length ? `<p class="pf-score pf-score--h"><span>Empresa</span><span>V</span><span>D</span></p><div class="pf-scores">${R.map((r) => `<p class="pf-score ${r.w > r.l ? 'is-ahead' : r.l > r.w ? 'is-behind' : ''}"><span>${esc(r.name)}</span><b>${r.w}</b><b>${r.l}</b></p>`).join('')}</div>` : '<p class="ds-manifest__line">Nenhuma empresa enfrentada ainda.</p>'}
      </div></section>`;
    return `<div class="sc pf">${paper}${file}</div>`;
  }

}
export { MAX_NAME, cleanName };
