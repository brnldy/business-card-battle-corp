// Interface em DOM por cima do canvas. O HUD do duelo é montado só com os componentes do design system
// (src/hud/components.js + hud.css); as telas (menu, janelas, fim de jogo) usam style.css.
import * as glass from './ds/glass.js';
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
          <nav class="mn-card">
            <i class="ds-clip"></i>
            <div class="ds-bar"><span>Cartão de ponto</span><b id="mn-clock">--:--</b></div>
            <button data-act="continue" class="mn-punch" id="mm-continue"><span class="ds-key">Enter</span><span>Continuar expediente</span><i>Entrada</i></button>
            <button data-act="newgame" class="mn-punch" id="mm-punch-new"><span class="ds-key">Enter</span><span>Iniciar expediente</span><i>Entrada</i></button>
            <button data-act="newgame" class="mn-row" id="mm-new"><b></b><span>Novo jogo</span><i>outra gaveta</i></button>
            <button data-act="load" class="mn-row" id="mm-load"><b></b><span>Carregar</span><i>gavetas</i></button>
            <button data-act="help" class="mn-row"><b></b><span>Como jogar</span><i>manual</i></button>
            <button data-act="gallery" class="mn-row"><b></b><span>Arquivo de cartas</span><i>fichas</i></button>
            <button data-act="settings" class="mn-row"><b></b><span>Configurações</span><i>quadro de luz</i></button>
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
    // interface curva (src/ds/glass.js): estas camadas podem ser desenhadas em WebGL, com a curva do tubo
    for (const id of ['chips', 'floats', 'slot-opp', 'slot-me', 'slot-turn', 'slot-bar', 'slot-sheet', 'slot-log', 'slot-center', 'slot-banner', 'slot-toast', 'slot-coach', 'over']) glass.attach(root.querySelector('#' + id));
    glass.setEnabled(glass.curveOn()); settings.onChange(() => glass.setEnabled(glass.curveOn()));
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
    // piso de tamanho do lobby (docs/UI_LOBBY.md, R3): as telas novas não encolhem abaixo de 100%; se não couber, rolam
    document.documentElement.style.setProperty('--lb-fix', String(Math.max(1, 1 / this.scale)));
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
    // sem gaveta salva, o botão de ponto vira "Iniciar expediente" (novo jogo) e a linha "Novo jogo" some
    $('#mm-punch-new').classList.toggle('hidden', !!info); $('#mm-new').classList.toggle('hidden', !info);
    $('#menu-company').innerHTML = info ? `<span class="ds-dymo">${esc(info.name)}</span><i>${esc(slotStage(info))}</i>` : '';
    const d = new Date(), ck = $('#mn-clock'); if (ck) ck.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
          case 'over': return this.confirm(`Sobrescrever a gaveta ${n}?`, `${x.name} e todo o progresso dela vão para a trituradora.`, 'Sobrescrever', () => on.pick?.(n), 'Voltar', { tone: 'danger', kind: 'Gaveta ' + n });
          case 'load': return on.load?.(n);
          case 'del': return this.confirm(`Apagar a gaveta ${n}?`, `${x.name} e todo o progresso dela serão apagados para sempre.`, 'APAGAR', () => { save.remove(n); this.mainMenu(!$('#menu').classList.contains('hidden')); back(); }, 'Voltar', { tone: 'danger', kind: 'Gaveta ' + n });
          case 'save': { const t = save.commit(); sfx('trapSet'); render(); on.saved?.(n, t); return undefined; }
          case 'copy': {
            const go = () => { const t = save.copyTo(n); sfx('trapSet'); back(); on.saved?.(n, t); };
            return x.empty ? go() : this.confirm(`Salvar por cima da gaveta ${n}?`, `${x.name} será substituída pelo progresso atual, e você passa a jogar nessa gaveta.`, 'Salvar por cima', go, 'Voltar', { tone: 'danger', kind: 'Gaveta ' + n });
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
  /** pedido de autorização (peça .ds-confirm): uma pergunta, uma frase, a assinatura e dois botões. O botão de autorizar
   *  só liga depois de assinar (qualquer rabisco serve; pelo teclado, Enter ou Espaço na linha faz uma rubrica).
   *  tone: 'danger' (sem volta: carimbo e botão vermelhos, foco começa em "Voltar"), 'money' (mostra a conta) ou nada.
   *  kind: o que vai na faixa de cima; sum: linhas da conta [[rótulo, valor], …] */
  confirm(title, body, yes, onYes, no = 'Cancelar', { tone = '', kind = '', sum = null } = {}) {
    const m = $('#modal'), danger = tone === 'danger';
    m.innerHTML = `<div class="ds-confirm ${tone ? `is-${tone}` : ''}" role="alertdialog" aria-modal="true" aria-labelledby="cf-t" aria-describedby="cf-b">
      <i class="ds-staple" aria-hidden="true"></i>
      <header class="ds-confirm__head"><span>Pedido de autorização</span><b>${esc(kind || (danger ? 'Exclusão' : tone === 'money' ? 'Compra' : 'Confirmação'))}</b></header>
      <div class="ds-confirm__body">
        <h2 id="cf-t">${esc(title)}</h2><p id="cf-b">${esc(body)}</p>
        ${sum ? `<dl class="ds-confirm__sum">${sum.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
        ${danger ? '<i class="ds-stamp ds-stamp--no ds-confirm__stamp" aria-hidden="true">Sem volta</i>' : ''}
        <div class="ds-sign">
          <div class="ds-sign__top"><span class="ds-formlabel" id="cf-sl">Assinatura</span><button class="ds-sign__clear" type="button" hidden>Limpar</button></div>
          <div class="ds-sign__pad"><canvas tabindex="0" role="img" aria-labelledby="cf-sl" aria-describedby="cf-sh"></canvas><span class="ds-sign__x" aria-hidden="true">✕</span><span class="ds-sign__hint" id="cf-sh">Assine aqui com o mouse · ou Enter para rubricar</span></div>
        </div>
      </div>
      <footer class="ds-confirm__foot"><button class="ds-btn" data-close>${esc(no)}</button><button id="cf-yes" class="ds-btn ${danger ? 'ds-btn--danger' : 'ds-btn--primary'}" disabled title="Assine para autorizar">${esc(yes)}</button></footer>
    </div>`;
    m.classList.remove('hidden');
    m.onclick = (e) => { if (e.target === m || e.target.closest('[data-close]')) this.closeModal(); };
    const yesBtn = $('#cf-yes', m);
    yesBtn.onclick = () => { if (yesBtn.disabled) return; m.classList.add('hidden'); m.innerHTML = ''; onYes(); };
    this.signPad($('.ds-sign', m), (ok) => { yesBtn.disabled = !ok; yesBtn.title = ok ? '' : 'Assine para autorizar'; });
    // o foco começa na linha de assinatura; no "sem volta", em "Voltar", para um Enter distraído não assinar nada
    setTimeout(() => $(danger ? '[data-close]' : '.ds-sign canvas', m)?.focus({ preventScroll: true }), 30);
  }
  /** linha de assinatura (peça .ds-sign): desenho livre a caneta azul. onChange(true) quando já tem traço suficiente */
  signPad(root, onChange) {
    const cv = $('canvas', root), clear = $('.ds-sign__clear', root), g = cv.getContext('2d');
    const fit = () => { const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; cv.width = Math.max(1, Math.round(r.width * d)); cv.height = Math.max(1, Math.round(r.height * d)); };
    let ink = 0, last = null, signed = false;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height), cx: e.clientX, cy: e.clientY }; };
    const pen = () => { const d = cv.width / Math.max(1, cv.getBoundingClientRect().width); g.strokeStyle = '#1f3fa8'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 2.6 * d; };
    const set = (v) => { if (v === signed) return; signed = v; root.classList.toggle('is-signed', v); clear.hidden = !v; if (v) sfx('trapSet'); onChange(v); };
    cv.addEventListener('pointerdown', (e) => { if (!cv.width || cv.width < 4) fit(); cv.setPointerCapture(e.pointerId); last = pt(e); pen(); sfx('type'); e.preventDefault(); });
    cv.addEventListener('pointermove', (e) => {
      if (!last) return; const p = pt(e);
      g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke();
      ink += Math.hypot(p.cx - last.cx, p.cy - last.cy); last = p;
      if (ink > 60) set(true);
    });
    const up = () => { last = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    // teclado: uma rubrica automática (laçada e traço), diferente a cada vez
    cv.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); e.stopPropagation(); fit(); pen();
      g.clearRect(0, 0, cv.width, cv.height);
      const W = cv.width, H = cv.height, base = H * 0.66, x0 = W * 0.14, len = W * (0.42 + Math.random() * 0.2), loops = 4 + Math.floor(Math.random() * 3), amp = H * (0.2 + Math.random() * 0.08);
      // laçadas cursivas (ciclóide alongada) que diminuem para a direita, e um traço por baixo
      const T = Math.PI * 2 * loops, step = len / T, back = step * 1.7;
      g.beginPath();
      for (let th = 0; th <= T; th += 0.05) { const k = 1 - (th / T) * 0.5, x = x0 + step * th - back * Math.sin(th) * k, y = base - amp * 0.5 * (1 - Math.cos(th)) * k; if (th === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke();
      g.beginPath(); g.moveTo(x0 - W * 0.02, base + H * 0.07); g.quadraticCurveTo(x0 + len * 0.55, base + H * 0.13, x0 + len * 1.1, base - H * 0.08); g.stroke();
      ink = 999; set(true);
    });
    clear.addEventListener('click', () => { g.clearRect(0, 0, cv.width, cv.height); ink = 0; set(false); cv.focus(); });
    requestAnimationFrame(fit);
  }
  nameEntry(onDone, cur = '') {
    const box = this.modal(`
      <div class="memo">Formulário 01-A · registro de empresa</div>
      <h2>Como se chama a sua empresa?</h2>
      <input id="name-in" maxlength="${MAX_NAME}" value="${esc(cur)}" placeholder="Nome da empresa" autocomplete="off" spellcheck="false">
      <p class="fine">Máx. ${MAX_NAME} · Enter confirma</p>
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
      <div class="help-grid help-grid--ico">
        <section><span class="hg-ico">${ICON.coin}</span><h3>Zere o CAIXA do rival</h3><p>Cada empresa começa com <b>$ 8.000</b>.</p></section>
        <section><span class="hg-ico">${ICON.card}</span><h3>Seu turno</h3><p class="hg-steps"><b>Compra</b><i>›</i><b>Joga</b><i>›</i><b>Batalha</b><i>›</i><b>Encerra</b></p><p>1 invocação por turno.</p></section>
        <section><span class="hg-ico">${ICON.atk}</span><h3>Em pé ataca, deitada defende</h3><p><span class="ic">${ICON.atk}</span> <b>ATQ</b> · <span class="ic">${ICON.def}</span> <b>DEF</b></p></section>
        <section><span class="hg-ico"><span class="pip">✕</span></span><h3>Cada ✕ = 1 sacrifício</h3><p>Sem ✕, entra de graça.</p></section>
        <section><span class="hg-ico">${ICON.swap}</span><h3>O maior número vence</h3><ul class="hg-rows"><li><span class="ic">${ICON.atk}</span> vs em pé: quem perde paga a diferença</li><li><span class="ic">${ICON.def}</span> vs deitada: só o atacante paga, se perder</li><li><span class="ic">${ICON.coin}</span> mesa vazia: direto no CAIXA</li></ul></section>
        <section><span class="hg-ico">${ICON.trap}</span><h3>Efeitos e armadilhas</h3><ul class="hg-rows"><li><span class="ic">${ICON.fx}</span> efeito: vale na hora</li><li><span class="ic">${ICON.trap}</span> armadilha: dispara no ataque do rival</li><li><span class="ic">${ICON.dead}</span> Morto: o descarte</li></ul></section>
      </div>
      <p class="fine hg-keys"><kbd>B</kbd> batalha <kbd>Espaço</kbd> encerrar <kbd>L</kbd> relatório <kbd>Esc</kbd> cancelar <span class="ic">${ICON.card}</span> mouse na carta: ficha</p>
      <nav><button data-close class="primary">Entendido</button></nav>`, 'full');
  }
  settings() {
    const s = settings.get();
    const box = this.modal(`
      <h2>Configurações</h2>
      <div class="rows">
        <label>Música e ambiente <input type="range" min="0" max="1" step="0.05" value="${s.music}" data-k2="music"></label>
        <label>Efeitos sonoros <input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-k2="sfx"></label>
        <label>Imagem <span class="seg" data-s="pixel"><button data-v="1">Nítida</button><button data-v="2">Retrô</button><button data-v="3">Pixelada</button></span></label>
        <label>Tamanho <span class="seg" data-s="uiSize"><button data-v="0.85">Pequena</button><button data-v="1">Média</button><button data-v="1.15">Grande</button></span></label>
        <label>Animações <span class="seg" data-s="speed"><button data-v="1">Normal</button><button data-v="1.6">Rápida</button><button data-v="2.5">Turbo</button></span></label>
        <label><span>Interface curva <small class="fine">${glass.isUhd() ? '· tela 4K: ligada por padrão' : '· ligada por padrão só em 4K'}</small></span> <span class="seg" data-s="hudCurve"><button data-v="true">Ligada</button><button data-v="false">Desligada</button></span></label>
        <label>Tremor e clarões <span class="seg" data-s="shake"><button data-v="true">Ligado</button><button data-v="false">Reduzido</button></span></label>
        <label>Dicas <span class="seg" data-s="tipsOff"><button data-v="false">Ligadas</button><button data-v="true">Desligadas</button></span></label>
        <label>Som <span class="seg" data-s="muted"><button data-v="false">Ligado</button><button data-v="true">Mudo</button></span></label>
      </div>
      <nav><button data-close class="primary">Voltar</button></nav>`);
    const syncSeg = () => box.querySelectorAll('.seg').forEach((sg) => sg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(sg.dataset.s === 'hudCurve' ? glass.curveOn() : settings.get()[sg.dataset.s]) === b.dataset.v)));
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
