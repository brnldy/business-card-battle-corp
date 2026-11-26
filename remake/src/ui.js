// Interface em DOM por cima do canvas. O HUD do duelo é montado só com os componentes do design system
// (src/hud/components.js + hud.css); as telas (menu, janelas, fim de jogo) usam style.css.
import { CARDS } from './cards.js';
import { asset } from './assets.js';
import { settings, cleanName, MAX_NAME } from './settings.js';
import { save } from './save.js';
import { sfx, applyVolumes, unlockAudio } from './audio.js';
import * as C from './hud/components.js';

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const esc = C.esc;
const { ICON } = C;
const stamp = (ms) => { const d = new Date(ms), p = (n) => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} às ${p(d.getHours())}:${p(d.getMinutes())}`; };
/** Em que ponto da campanha um slot está, em uma linha. */
export const slotStage = (x) => (x.done ? 'Campanha concluída' : `Batalha ${Math.min(30, (x.stage ?? 0) + 1)} de 30`);
// jogadas que aparecem na faixa do topo (o resto fica só no relatório)
const TICKER = new Set(['summon', 'effectPlayed', 'trapSet', 'trapTriggered', 'attack', 'attackNegated', 'attackRedirected', 'destroy', 'sacrifice', 'toHand', 'toDeck', 'controlChange', 'modeChange', 'coin', 'effectExpired', 'discard', 'mill']);

export class UI {
  constructor(root) {
    this.root = root; this.scale = 1; this.h = {}; this.chipEls = new Map(); this.pointerOverUi = false; this.tutorQ = []; this.logLines = [];
    root.innerHTML = `
      <div id="boot" class="screen"><div class="boot-box"><div class="logo-sm">BUSINESS CARD <i>Battle</i> Corp.</div><div id="boot-line">Abrindo o caixa… 0%</div><div class="bar"><b id="boot-bar"></b></div></div></div>
      <div id="menu" class="screen hidden">
        <div class="credits">Modelos 3D: Poly Haven e Quaternius (CC0)</div>
        <div class="title-block">
          <h1>BUSINESS<br>CARD<span class="tag-word">Battle</span><small>Corp.</small></h1>
          <p class="tagline">O mundo acabou. Os investidores, não.</p>
          <nav>
            <button data-act="continue" class="primary" id="mm-continue">Continuar expediente <kbd>Enter</kbd></button>
            <button data-act="newgame" id="mm-new">Novo jogo</button>
            <button data-act="load" id="mm-load">Carregar</button>
            <button data-act="help">Como jogar</button>
            <button data-act="gallery">Arquivo de cartas</button>
            <button data-act="settings">Configurações</button>
          </nav>
          <div class="company" id="menu-company"></div>
        </div>
      </div>
      <div id="hud" class="h-hud hidden">
        <div class="h-edge" id="edge"></div>
        <div class="h-layer" id="chips"></div>
        <div class="h-layer" id="floats"></div>
        <div class="h-slot--opp" id="slot-opp">${C.folder({ who: 'opp' })}</div>
        <div class="h-slot--me" id="slot-me">${C.folder({ who: 'me' })}</div>
        <div class="h-slot--sheet hidden" id="slot-sheet"></div>
        <div class="h-slot--bar" id="slot-bar"></div>
        <div class="h-slot--turn" id="slot-turn"></div>
        <div class="h-slot--log hidden" id="slot-log">${C.logPanel()}</div>
        <div class="h-slot--center" id="slot-center"><div id="slot-prompt" class="hidden"></div><div id="slot-ticker" class="hidden"></div><div id="slot-limit" class="hidden"></div></div>
        <div class="h-slot--banner" id="slot-banner"></div>
        <div class="h-slot--toast hidden" id="slot-toast"></div>
        <div class="h-slot--coach hidden" id="slot-coach"></div>
        <div class="h-anchor hidden" id="amenu"></div>
        <div class="h-follow hidden" id="preview"></div>
        <div class="h-follow hidden" id="tip"></div>
      </div>
      <div id="over" class="screen hidden"><div class="over-box"><div class="memo" id="over-memo"></div><h2 id="over-title"></h2><p id="over-sub"></p><p class="stats" id="over-stats"></p><p class="reward" id="over-reward"></p><nav><button data-act="quit2">Voltar ao lobby</button><button data-act="again" class="primary">Nova partida</button></nav></div></div>
      <div id="modal" class="screen hidden"></div>
      <div id="unlock" class="hidden">clique para ligar o som</div>
      <div id="fade"></div>`;
    this.folders = { me: $('#slot-me .h-folder'), opp: $('#slot-opp .h-folder') };
    this.renderBar();
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act], [data-k]'); if (!b) return;
      unlockAudio();
      if (b.dataset.k) return this.h.menuPick?.(b.dataset.k);
      const a = b.dataset.act;
      if (a === 'mute') { settings.set({ muted: !settings.get().muted }); applyVolumes(); this.renderBar(); return; }
      if (a === 'settings') return this.settings();
      if (a === 'help') return this.help();
      if (a === 'gallery') return this.gallery();
      if (a === 'logtoggle') return this.toggleLog();
      if (a === 'tips-ok') return this.tutorNext();
      if (a === 'tips-off') { settings.set({ tipsOff: true }); this.tutorQ = []; this.show('slot-coach', false); return; }
      this.h[a]?.();
    });
    root.addEventListener('pointerover', (e) => { if (e.target.closest('button')) sfx('hover'); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) { this.closeModal(); e.stopPropagation(); } }, true);
    this.setScale(); window.addEventListener('resize', () => this.setScale());
  }
  on(handlers) { Object.assign(this.h, handlers); }
  show(id, on) { $(`#${id}`).classList.toggle('hidden', !on); }
  // escala a interface inteira pela tela (1600×960 = 100%), entre 80% e 125%, vezes o "Tamanho da interface" das Configurações.
  // Antes crescia até 190% em telas grandes e esmagava a mesa; o autor pediu tudo menor (23/11/2026).
  setScale() {
    const base = Math.max(0.8, Math.min(1.25, Math.min(window.innerHeight / 960, window.innerWidth / 1600)));
    this.scale = base * (Number(settings.get().uiSize) || 1); this.root.style.zoom = this.scale;
  }
  renderBar() { $('#slot-bar').innerHTML = C.topbar({ logOn: !$('#slot-log')?.classList.contains('hidden'), muted: settings.get().muted }); }

  // ───── telas ─────
  boot(p) { $('#boot-line').textContent = `Abrindo o caixa… ${Math.round(p * 100)}%`; $('#boot-bar').style.width = `${p * 100}%`; }
  bootDone() { this.show('boot', false); }
  mainMenu(on) {
    this.show('menu', on);
    // sem nenhum slot salvo, "Novo jogo" vira o botão principal e "Continuar"/"Carregar" somem
    const last = save.lastSlot(), info = last ? save.slots()[last - 1] : null, any = save.hasAny();
    $('#mm-continue').classList.toggle('hidden', !info);
    $('#mm-load').classList.toggle('hidden', !any);
    const nb = $('#mm-new'); nb.classList.toggle('primary', !info); nb.innerHTML = info ? 'Novo jogo' : 'Novo jogo <kbd>Enter</kbd>';
    $('#menu-company').innerHTML = info ? `Último expediente: <b>${esc(info.name)}</b> · ${esc(slotStage(info))}` : '';
  }
  /**
   * As 3 gavetas de progresso. mode: 'new' (Novo jogo), 'load' (Carregar, no menu) ou 'lobby' (Salvar/Carregar no lobby).
   * on: { pick(n) → começar empresa nova no slot n, load(n) → passar a jogar no slot n, saved(n) → depois de salvar }
   */
  slots(mode, on = {}) {
    const T = { new: ['Novo jogo · escolha uma gaveta', 'Onde abrir a empresa?'], load: ['Arquivo de empresas', 'Carregar expediente'], lobby: ['Arquivo de empresas · o slot em uso salva sozinho', 'Salvar ou carregar'] }[mode];
    const card = (x) => {
      const head = `<p class="memo">Gaveta ${x.n}${x.current ? ' · em uso' : ''}</p>`;
      if (x.empty) {
        const btn = mode === 'new' ? `<button class="primary" data-sl="pick" data-n="${x.n}">Abrir empresa aqui</button>` : mode === 'lobby' ? `<button data-sl="copy" data-n="${x.n}">Salvar aqui</button>` : '';
        return `<article class="sl-card is-empty">${head}<h3>Gaveta vazia</h3><p class="fine">Só poeira e um clipe enferrujado.</p><footer>${btn}</footer></article>`;
      }
      let btns = '';
      if (mode === 'new') btns = `<button data-sl="over" data-n="${x.n}">Sobrescrever</button>`;
      else if (mode === 'load') btns = `<button class="primary" data-sl="load" data-n="${x.n}">Carregar</button><button class="ghost" data-sl="del" data-n="${x.n}">Apagar</button>`;
      else if (x.current) btns = `<button class="primary" data-sl="save" data-n="${x.n}">Salvar agora</button>`;
      else btns = `<button class="primary" data-sl="load" data-n="${x.n}">Carregar</button><button data-sl="copy" data-n="${x.n}">Salvar aqui</button>`;
      return `<article class="sl-card ${x.current ? 'is-current' : ''}">${head}<h3>${esc(x.name)}</h3>
        <dl><div><dt>Campanha</dt><dd>${esc(slotStage(x))}</dd></div><div><dt>Patrimônio</dt><dd>$ ${Math.round(x.patrimonio).toLocaleString('pt-BR')}</dd></div><div><dt>Vitórias</dt><dd>${x.wins}</dd></div></dl>
        <p class="fine">Salvo em ${esc(stamp(x.savedAt))}</p><footer>${btns}</footer></article>`;
    };
    const render = () => {
      const box = this.modal(`<div class="memo">${esc(T[0])}</div><h2>${esc(T[1])}</h2><div class="sl-grid">${save.slots().map(card).join('')}</div><nav><button data-close>Voltar</button></nav>`, 'wide slots');
      box.onclick = (e) => {
        const b = e.target.closest('[data-sl]'); if (!b) return;
        const n = Number(b.dataset.n), x = save.slots()[n - 1], back = () => { this.slots(mode, on); };
        sfx('nav');
        switch (b.dataset.sl) {
          case 'pick': return on.pick?.(n);
          case 'over': return this.confirm(`Sobrescrever a gaveta ${n}?`, `${x.name} e todo o progresso dela vão para a trituradora. Não tem volta.`, 'SOBRESCREVER', () => on.pick?.(n), 'Voltar');
          case 'load': return on.load?.(n);
          case 'del': return this.confirm(`Apagar a gaveta ${n}?`, `${x.name} e todo o progresso dela serão apagados para sempre.`, 'APAGAR', () => { save.remove(n); this.mainMenu(!$('#menu').classList.contains('hidden')); back(); }, 'Voltar');
          case 'save': { const t = save.commit(); sfx('trapSet'); render(); on.saved?.(n, t); return undefined; }
          case 'copy': {
            const go = () => { const t = save.copyTo(n); sfx('trapSet'); back(); on.saved?.(n, t); };
            return x.empty ? go() : this.confirm(`Salvar por cima da gaveta ${n}?`, `${x.name} será substituída pelo progresso atual, e você passa a jogar nessa gaveta.`, 'SALVAR POR CIMA', go, 'Voltar');
          }
          default: return undefined;
        }
      };
    };
    render();
  }
  hud(on) {
    this.show('hud', on);
    if (!on) { this.show('slot-log', false); this.renderBar(); ['slot-ticker', 'slot-prompt', 'slot-limit', 'slot-coach', 'slot-toast'].forEach((id) => this.show(id, false)); this.chips([]); this.menu(null); this.detail(null); this.preview(null); this.tip(null); this.tutorQ = []; }
  }
  closeModal() { const m = $('#modal'); if (m.classList.contains('hidden')) return; m.classList.add('hidden'); m.innerHTML = ''; sfx('navBack'); const cb = this.onModalClose; this.onModalClose = null; cb?.(); }
  modal(html, cls = '') {
    const m = $('#modal'); m.innerHTML = `<div class="modal-box ${cls}">${html}</div>`; m.classList.remove('hidden');
    m.onclick = (e) => { if (e.target === m || e.target.closest('[data-close]')) this.closeModal(); };
    return m.firstElementChild;
  }
  confirm(title, body, yes, onYes, no = 'Cancelar') {
    const box = this.modal(`<h2>${esc(title)}</h2><p>${esc(body)}</p><nav><button data-close>${esc(no)}</button><button id="cf-yes" class="primary">${esc(yes)}</button></nav>`);
    $('#cf-yes', box).onclick = () => { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; onYes(); };
  }
  nameEntry(onDone, cur = '') {
    const box = this.modal(`
      <div class="memo">Formulário 01-A · registro de empresa</div>
      <h2>Como se chama a sua empresa?</h2>
      <p>É esse nome que vai na sua pasta de CAIXA e disputa os investidores.</p>
      <input id="name-in" maxlength="${MAX_NAME}" value="${esc(cur)}" placeholder="Nome da empresa" autocomplete="off" spellcheck="false">
      <p class="fine">Até ${MAX_NAME} caracteres · Enter confirma</p>
      <nav><button data-close>Voltar</button><button id="name-ok" class="primary">Assinar e entrar</button></nav>`, 'form');
    const inp = $('#name-in', box), ok = $('#name-ok', box);
    const sync = () => { ok.disabled = !cleanName(inp.value); };
    const go = () => { const n = cleanName(inp.value); if (!n) return; sfx('start'); this.onModalClose = null; $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; onDone(n); };
    inp.addEventListener('input', () => { sfx('type'); sync(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); e.stopPropagation(); });
    ok.onclick = go; sync(); setTimeout(() => { inp.focus(); inp.select(); }, 30);
  }
  help(onClose) {
    this.onModalClose = onClose ?? null;
    this.modal(`
      <div class="memo">Manual do colaborador</div><h2>Como jogar</h2>
      <div class="help-grid">
        <section><h3>1 · O objetivo</h3><p>Cada empresa começa com <b>$ 8.000 de CAIXA</b> — é a sua vida, na pasta com o seu nome. Zere o CAIXA do rival antes que ele zere o seu.</p></section>
        <section><h3>2 · O seu turno</h3><p>Você compra 1 carta. Depois <b>joga cartas</b> (as de contorno verde), <b>vai para a batalha</b> e <b>encerra o turno</b>. É <b>1 invocação por turno</b>.</p></section>
        <section><h3>3 · Criaturas</h3><p>Têm <span class="ic">${ICON.atk}</span> <b>ATQ</b> e <span class="ic">${ICON.def}</span> <b>DEF</b>. Em <b>ataque</b> (em pé) podem atacar; em <b>defesa</b> (deitadas) só protegem.</p></section>
        <section><h3>4 · Custo</h3><p>Cada <span class="pip">✕</span> no nome da carta é uma criatura sua que você <b>sacrifica</b> para invocá-la. Sem ✕, entra de graça.</p></section>
        <section><h3>5 · Combate</h3><p>O número maior vence e destrói a outra carta. Contra criatura em <b>ataque</b>, quem perde paga a diferença em CAIXA. Contra <b>defesa</b>, só você paga — se atacar com menos. Sem criaturas na frente, o ataque vai <b>direto no CAIXA</b>.</p></section>
        <section><h3>6 · Efeitos e armadilhas</h3><p><b>Efeitos</b> valem na hora. <b>Armadilhas</b> ficam viradas para baixo e disparam quando o rival ataca. O <b>Morto</b> é a pilha de descarte.</p></section>
      </div>
      <p class="fine">Atalhos: <kbd>B</kbd> batalha · <kbd>Espaço</kbd> encerrar turno · <kbd>L</kbd> relatório · <kbd>Esc</kbd> ou botão direito cancela. Passe o mouse em qualquer carta para ler o que ela faz.</p>
      <nav><button data-close class="primary">Entendido</button></nav>`, 'wide');
  }
  settings() {
    const s = settings.get();
    const box = this.modal(`
      <h2>Configurações</h2>
      <div class="rows">
        <label>Música e ambiente <input type="range" min="0" max="1" step="0.05" value="${s.music}" data-k2="music"></label>
        <label>Efeitos sonoros <input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-k2="sfx"></label>
        <label>Imagem <span class="seg" data-s="pixel"><button data-v="1">Nítida</button><button data-v="2">Retrô</button><button data-v="3">Pixelada</button></span></label>
        <label>Tamanho da interface <span class="seg" data-s="uiSize"><button data-v="0.85">Pequena</button><button data-v="1">Média</button><button data-v="1.15">Grande</button></span></label>
        <label>Velocidade das animações <span class="seg" data-s="speed"><button data-v="1">Normal</button><button data-v="1.6">Rápida</button><button data-v="2.5">Turbo</button></span></label>
        <label>Tremor e clarões <span class="seg" data-s="shake"><button data-v="true">Ligado</button><button data-v="false">Reduzido</button></span></label>
        <label>Dicas para iniciantes <span class="seg" data-s="tipsOff"><button data-v="false">Ligadas</button><button data-v="true">Desligadas</button></span></label>
        <label>Som <span class="seg" data-s="muted"><button data-v="false">Ligado</button><button data-v="true">Mudo</button></span></label>
      </div>
      <nav><button data-close class="primary">Voltar</button></nav>`);
    const syncSeg = () => box.querySelectorAll('.seg').forEach((sg) => sg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(settings.get()[sg.dataset.s]) === b.dataset.v)));
    syncSeg();
    box.addEventListener('input', (e) => { const k = e.target.dataset?.k2; if (!k) return; settings.set({ [k]: Number(e.target.value) }); applyVolumes(); if (k === 'sfx') sfx('nav'); });
    box.addEventListener('click', (e) => {
      const b = e.target.closest('.seg button'); if (!b) return;
      const k = b.parentElement.dataset.s, raw = b.dataset.v, v = raw === 'true' ? true : raw === 'false' ? false : isNaN(Number(raw)) ? raw : Number(raw);
      settings.set(k === 'tipsOff' && v === false ? { tipsOff: false, tips: {} } : { [k]: v }); applyVolumes(); if (k === 'uiSize') this.setScale(); this.renderBar(); syncSeg(); sfx('nav');
    });
  }
  gallery() {
    const box = this.modal(`
      <div class="memo">Arquivo · ${CARDS.length} fichas</div><h2>Arquivo de cartas</h2>
      <div class="gal">${CARDS.map((c) => `<figure data-id="${c.id}"><img loading="lazy" src="${asset(c.art)}" alt="${esc(c.name)}"><figcaption>${esc(c.name)}</figcaption></figure>`).join('')}</div>
      <div class="gal-zoom hidden" id="gal-zoom"><img alt=""><div class="gal-text"></div></div>
      <nav><button data-close class="primary">Fechar arquivo</button></nav>`, 'full');
    const z = $('#gal-zoom', box);
    box.addEventListener('click', (e) => {
      const f = e.target.closest('figure');
      if (f) { const d = CARDS.find((c) => c.id === f.dataset.id); z.firstElementChild.src = asset(d.art); z.lastElementChild.innerHTML = C.cardSheet({ cardId: d.id }); z.classList.remove('hidden'); sfx('card'); e.stopPropagation(); }
      else if (e.target.closest('#gal-zoom')) { z.classList.add('hidden'); e.stopPropagation(); }
    });
  }

  // ───── HUD do duelo ─────
  // pastas de CAIXA: { me: folderProps, opp: folderProps, mine, over }
  setFolders(f) {
    C.patchFolder(this.folders.me, f.me, { animate: f.animate !== false });
    C.patchFolder(this.folders.opp, f.opp, { animate: f.animate !== false });
    $('#edge').className = `h-edge ${f.over ? '' : f.mine ? 'is-me' : 'is-opp'}`;
  }
  setTurn(p) {
    const h = C.turnPanel(p), slot = $('#slot-turn');
    if (this._turn !== h) { slot.innerHTML = h; this._turn = h; }
    // quando a vez troca, o painel "vira" para chamar atenção
    if (this._mine !== undefined && this._mine !== p.mine) { slot.classList.remove('is-flip'); void slot.offsetWidth; slot.classList.add('is-flip'); }
    this._mine = p.mine;
    // dicas presas a uma vez (sua/rival) somem quando a vez muda
    const ctx = p.mine ? 'me' : 'foe';
    this.tutorQ = this.tutorQ.filter((t) => !t.ctx || t.ctx === ctx);
    if (this._tipCtx && this._tipCtx !== ctx && !$('#slot-coach').classList.contains('hidden')) this.tutorNext();
  }
  toggleLog() { const l = $('#slot-log'); l.classList.toggle('hidden'); this.renderBar(); if (!l.classList.contains('hidden')) $('.h-log__list', l).scrollTop = 1e6; sfx('nav'); }
  clearLog() { $('.h-log__list').innerHTML = ''; }
  log(text, type = '', who = 'sys') {
    const list = $('.h-log__list'), tmp = el('div', '', C.logLine({ text, type, who }));
    list.appendChild(tmp.firstElementChild);
    while (list.children.length > 160) list.firstChild.remove();
    list.scrollTop = list.scrollHeight;
    if (TICKER.has(type)) this.ticker(text, who, type);
  }
  ticker(text, who, type) {
    const t = $('#slot-ticker'); t.innerHTML = C.ticker({ text, who, tone: type === 'trapTriggered' || type === 'destroy' ? 'stop' : null });
    t.classList.remove('hidden', 'is-go'); void t.offsetWidth; t.classList.add('is-go');
    clearTimeout(this.tickT); this.tickT = setTimeout(() => t.classList.add('hidden'), 3800);
  }
  banner(title, sub, tone = 'me') {
    const b = $('#slot-banner'); b.innerHTML = C.banner({ title, sub, tone });
    const tEl = $('.h-banner__title', b);
    clearInterval(this.scrT); let n = 0; const total = 9;
    // o título "decodifica" a partir de dígitos, como nos terminais do andar
    const draw = () => { tEl.textContent = [...title].map((ch, i) => (ch === ' ' || i < (n / total) * title.length ? ch : String(Math.floor(Math.random() * 10)))).join(''); if (n++ >= total) clearInterval(this.scrT); };
    draw(); this.scrT = setInterval(draw, 34);
    b.classList.remove('is-go'); void b.offsetWidth; b.classList.add('is-go');
  }
  toast(text, tone = 'stop') {
    const t = $('#slot-toast'); t.innerHTML = C.toast({ text, tone });
    t.classList.remove('hidden', 'is-go'); void t.offsetWidth; t.classList.add('is-go');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.add('hidden'), 3400);
  }
  // dicas de primeira vez (fila; cada uma aparece só uma vez) — tip: { title, html, anchor }
  tutor(id, tip) {
    const s = settings.get();
    if (s.tipsOff || s.tips?.[id]) return;
    settings.set({ tips: { ...(s.tips ?? {}), [id]: true } });
    this.tutorQ.push(typeof tip === 'string' ? { html: tip } : tip);
    if ($('#slot-coach').classList.contains('hidden')) this.tutorNext();
  }
  tutorNext() {
    const next = this.tutorQ.shift(), slot = $('#slot-coach');
    this.show('slot-coach', !!next);
    if (!next) { this._tipCtx = null; return; }
    this._tipCtx = next.ctx;
    const seen = Object.keys(settings.get().tips ?? {}).length;
    slot.className = `h-slot--coach is-${next.anchor ?? 'top'}`;
    slot.innerHTML = C.coach({ ...next, step: Math.max(1, seen - this.tutorQ.length), of: 7 });
    sfx('turn');
  }
  // barra de instrução: { icon, text, count, action, cancel } | null
  prompt(p) {
    const s = $('#slot-prompt'); this.show('slot-prompt', !!p);
    $('#slot-center').classList.toggle('has-prompt', !!p);
    if (p) s.innerHTML = C.prompt(p);
  }
  limit(text) { this.show('slot-limit', !!text); if (text) $('#slot-limit').innerHTML = C.toast({ text, tone: 'stop' }); }
  // menu de ação: { title, note, options } | null
  menu(p) { const m = $('#amenu'); this.show('amenu', !!p); if (p) m.innerHTML = C.actionMenu(p); }
  menuPos(x, y) { const m = $('#amenu'), z = this.scale, W = window.innerWidth / z; m.style.left = `${Math.max(16 + 248 + 16 + 130, Math.min(W - 146, x / z))}px`; m.style.top = `${Math.max(220, y / z - 12)}px`; }
  // ficha da carta: props de C.cardSheet | null
  detail(d) {
    const slot = $('#slot-sheet'); this.show('slot-sheet', !!d); if (!d) { this._sheet = null; return; }
    const key = JSON.stringify(d); if (this._sheet === key) return; this._sheet = key;
    slot.innerHTML = C.cardSheet(d);
    C.fitSheet(slot.firstElementChild);
  }
  // prévia de combate: props de C.combatPreview | null
  preview(p) { this.show('preview', !!p); if (p) $('#preview').innerHTML = C.combatPreview(p); }
  previewPos(x, y) {
    const z = this.scale, W = window.innerWidth / z, H = window.innerHeight / z; x /= z; y /= z;
    $('#preview').style.transform = `translate(${x + 56 + 212 < W ? x + 56 : x - 56 - 212}px, ${Math.max(12, Math.min(H - 220, y - 110))}px)`;
    $('#tip').style.transform = `translate(${Math.min(W - 300, x + 18)}px, ${y + 24}px)`;
  }
  tip(text) { this.show('tip', !!text); if (text) $('#tip').innerHTML = `<div class="h-tip">${esc(text)}</div>`; }
  // etiquetas da mesa: [{ id, x, y, chip }]
  chips(list) {
    const box = $('#chips'), seen = new Set();
    for (const c of list) {
      seen.add(c.id);
      let e = this.chipEls.get(c.id);
      if (!e) { e = el('div', 'h-chipwrap'); box.appendChild(e); this.chipEls.set(c.id, e); }
      const h = C.chip(c.chip);
      if (e.dataset.h !== h) {
        // número mudou numa carta da mesa: pisca para o jogador perceber
        if (e.dataset.h && c.chip.kind === 'creature') { e.classList.remove('is-changed'); void e.offsetWidth; e.classList.add('is-changed'); }
        e.innerHTML = h; e.dataset.h = h;
      }
      e.style.transform = `translate(${Math.round(c.x / this.scale)}px, ${Math.round(c.y / this.scale)}px) translate(-50%, 0)`;
    }
    for (const [id, e] of this.chipEls) if (!seen.has(id)) { e.remove(); this.chipEls.delete(id); }
  }
  float(x, y, text, cls = '') {
    const f = el('div', `h-float is-${cls}`); f.textContent = text; f.style.left = `${x / this.scale}px`; f.style.top = `${y / this.scale}px`;
    $('#floats').appendChild(f); setTimeout(() => f.remove(), 1700);
  }
  clash(pos, a, b, mode) {
    const f = el('div', 'h-float is-clash', `<b>${a}</b><i>${ICON.atk}</i><span>×</span><i>${mode === 'DEF' ? ICON.def : ICON.atk}</i><b>${b}</b>`);
    f.style.left = `${pos.x / this.scale}px`; f.style.top = `${pos.y / this.scale - 44}px`;
    $('#floats').appendChild(f); setTimeout(() => f.remove(), 1500);
  }
  /** Fim da campanha. MARCAÇÃO: aqui entra a cutscene final que o autor vai mandar. */
  ending(onClose) {
    this.onModalClose = onClose ?? null;
    this.modal(`
      <div class="memo">Ata final · reservado ao Conselho</div><h2>O Conselho caiu.</h2>
      <p>[CUTSCENE FINAL · EM PRODUÇÃO]</p>
      <p class="fine">Espaço reservado para a cena de encerramento. Depois dela, a sala de reunião continua aberta para reuniões livres.</p>
      <nav><button data-close class="primary">Voltar ao expediente</button></nav>`, 'ending');
    sfx('win');
  }
  gameOver(o) {
    this.show('over', !!o); if (!o) return;
    $('#over').className = `screen ${o.win ? 'win' : o.draw ? 'draw' : 'lose'}`;
    $('#over-memo').textContent = o.win ? 'Comunicado aos acionistas · aprovado' : o.draw ? 'Ata de reunião · sem deliberação' : 'Aviso de falência · 2ª via';
    $('#over-title').textContent = o.title; $('#over-sub').textContent = o.sub; $('#over-stats').textContent = o.stats; $('#over-reward').textContent = o.reward ?? ''; $('#over-reward').className = `reward ${o.win ? 'good' : ''}`;
  }
}
export { ICON };
