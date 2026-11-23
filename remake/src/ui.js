// Interface em DOM por cima do canvas. Linguagem visual das próprias cartas: papel claro, verde sálvia,
// Garamond para números e títulos, sans para rótulos. Tudo dimensionado para ler em tela de notebook.
import { CARDS } from './cards.js';
import { asset } from './assets.js';
import { settings, cleanName, MAX_NAME } from './settings.js';
import { sfx, applyVolumes, unlockAudio } from './audio.js';
import { money, cardFaceCanvas } from './textures.js';
import { isEffect } from './engine.js';
import { RULES_TEXT, DEPT, KIND } from './cardtext.js';

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const defOf = (id) => CARDS.find((c) => c.id === id);
const faceUrls = new Map();
function faceUrl(id) { if (!faceUrls.has(id)) faceUrls.set(id, cardFaceCanvas(id).toDataURL('image/jpeg', 0.9)); return faceUrls.get(id); }
const ICON = {
  atk: '<svg viewBox="0 0 16 16"><path d="M13.5 1.5 6.2 8.8M13.5 1.5l-3 .4-5.6 5.6 2.6 2.6 5.6-5.6zM4.2 8.2l3.6 3.6M5.4 10.6l-3 3M2 12.6l1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  def: '<svg viewBox="0 0 16 16"><path d="M8 1.6c1.6 1 3.3 1.5 5 1.5v4.6c0 3-2 5.3-5 6.7-3-1.4-5-3.700-5-6.700V3.100c1.700 0 3.400-.5 5-1.500z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
};
function stampSvg(w = 150, h = 58, d = 3) {
  const nx = 22, ny = 8, sx = w / nx, sy = h / ny, p = [];
  for (let i = 0; i < nx; i++) p.push([(i + 0.5) * sx, i % 2 ? d : 0], [(i + 1) * sx, d / 2]);
  for (let i = 0; i < ny; i++) p.push([w - (i % 2 ? d : 0), (i + 0.5) * sy], [w - d / 2, (i + 1) * sy]);
  for (let i = 0; i < nx; i++) p.push([w - (i + 0.5) * sx, h - (i % 2 ? d : 0)], [w - (i + 1) * sx, h - d / 2]);
  for (let i = 0; i < ny; i++) p.push([i % 2 ? d : 0, h - (i + 0.5) * sy], [d / 2, h - (i + 1) * sy]);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polygon points="${p.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ')}"/></svg>`;
}
function glossHtml(id) {
  const txt = (RULES_TEXT[id] ?? []).map((r) => r[1]).join(' ');
  const hits = GLOSS.filter(([re]) => re.test(txt)).slice(0, 2);
  return hits.length ? `<div class="d-gloss">${hits.map(([, t, d]) => `<div><b>${t}:</b> ${d}</div>`).join('')}</div>` : '';
}
export function rulesHtml(id) {
  return (RULES_TEXT[id] ?? []).map(([t, d]) => `<p><b>${esc(t)}</b> — ${esc(d)}</p>`).join('');
}
const TICKER = new Set(['summon', 'effectPlayed', 'trapSet', 'trapTriggered', 'attack', 'attackNegated', 'destroy', 'sacrifice', 'toHand', 'toDeck', 'controlChange', 'modeChange', 'coin', 'effectExpired', 'discard']);
// termos que um iniciante pode não conhecer: aparecem explicados na ficha quando a carta os usa
const GLOSS = [
  [/Frio/, 'Frio', 'marcadores que tiram $100 do CAIXA de quem os tem, a cada turno.'],
  [/Morto/, 'Morto', 'a pilha de descarte.'],
  [/[Ii]mune/, 'Imune', 'esse tipo de efeito não a afeta.'],
  [/depto\./, 'Depto.', 'o departamento da carta, escrito logo abaixo do nome.'],
  [/moeda/, 'Moeda', 'cara ou coroa, 50% de chance.'],
  [/virada para baixo/, 'Virada para baixo', 'o rival não vê qual carta é.'],
];
const plateHtml = (who) => `
  <div class="tag" id="tag-${who}">${stampSvg()}<span></span></div>
  <div class="folder"><div class="f-tab"><i class="dot"></i><span class="f-name"></span></div><div class="f-body"><span class="f-caixa"></span></div></div>
  <div class="f-stats"></div>`;

export class UI {
  constructor(root) {
    this.root = root; this.scale = 1; this.h = {}; this.chipEls = new Map(); this.pointerOverUi = false; this.tutorQ = [];
    root.innerHTML = `
      <div id="boot" class="screen"><div class="boot-box"><div class="logo-sm">BUSINESS CARD <i>Battle</i> Corp.</div><div id="boot-line">Abrindo o caixa… 0%</div><div class="bar"><b id="boot-bar"></b></div></div></div>
      <div id="menu" class="screen hidden">
        <div class="credits">Modelos 3D: Poly Haven e Quaternius (CC0)</div>
        <div class="title-block">
          <h1>BUSINESS<br>CARD<span class="tag-word">Battle</span><small>Corp.</small></h1>
          <p class="tagline">O mundo acabou. Os investidores, não.</p>
          <nav>
            <button data-act="start" class="primary">Iniciar expediente <kbd>Enter</kbd></button>
            <button data-act="help">Como jogar</button>
            <button data-act="gallery">Arquivo de cartas</button>
            <button data-act="settings">Configurações</button>
          </nav>
          <div class="company" id="menu-company"></div>
        </div>
      </div>
      <div id="hud" class="hidden">
        <div class="plate opp" id="plate-opp">${plateHtml('opp')}</div>
        <div class="plate me" id="plate-me">${plateHtml('me')}</div>
        <div class="topbar"><button data-act="logtoggle" id="btn-log" title="Relatório da partida (L)">Relatório</button><button data-act="help" title="Como jogar">?</button><button data-act="mute" id="btn-mute" title="Som">♪</button><button data-act="settings" title="Configurações">⚙</button><button data-act="quit" title="Voltar ao menu">Menu</button></div>
        <div class="log hidden" id="log"><header><span>Relatório da partida</span><button id="log-toggle" title="Fechar">×</button></header><div id="log-lines"></div></div>
        <div class="ticker hidden" id="ticker"></div>
        <div class="edge" id="edge"></div>
        <div class="turnbox">
          <div id="turn-label"></div>
          <div class="steps"><span id="ph-main">Jogar</span><i></i><span id="ph-battle">Batalha</span><i></i><span id="ph-end">Encerrar</span></div>
          <div id="coach"></div>
          <div class="pills" id="pills"></div>
          <button id="btn-battle" data-act="battle"><span>Ir para a batalha</span><kbd>B</kbd></button>
          <button id="btn-end" data-act="end"><span>Encerrar turno</span><kbd>Espaço</kbd></button>
        </div>
        <div class="detail hidden" id="detail"></div>
        <div class="hint hidden" id="hint"><span id="hint-text"></span><button id="hint-action" class="hidden danger"></button><button id="hint-cancel">Cancelar <kbd>Esc</kbd></button></div>
        <div class="limit hidden" id="limit"></div>
        <div class="amenu hidden" id="amenu"></div>
        <div class="preview hidden" id="preview"></div>
        <div class="tip hidden" id="tip"></div>
        <div id="chips"></div><div id="floats"></div>
        <div class="banner" id="banner"><div class="b-sub" id="banner-sub"></div><div class="b-title" id="banner-title"></div></div>
        <div class="toast hidden" id="toast"></div>
        <div class="tutor hidden" id="tutor"><div class="t-label">Dica</div><div id="tutor-text"></div><div class="t-actions"><button id="tutor-skip" class="ghost">Não mostrar dicas</button><button id="tutor-ok" class="primary">Entendi</button></div></div>
      </div>
      <div id="over" class="screen hidden"><div class="over-box"><div class="memo" id="over-memo"></div><h2 id="over-title"></h2><p id="over-sub"></p><p class="stats" id="over-stats"></p><nav><button data-act="quit2">Menu</button><button data-act="again" class="primary">Nova partida</button></nav></div></div>
      <div id="modal" class="screen hidden"></div>
      <div id="unlock" class="hidden">clique para ligar o som</div>`;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      unlockAudio();
      const a = b.dataset.act;
      if (a === 'mute') { settings.set({ muted: !settings.get().muted }); applyVolumes(); this.syncMute(); return; }
      if (a === 'settings') return this.settings();
      if (a === 'help') return this.help();
      if (a === 'gallery') return this.gallery();
      if (a === 'logtoggle') return this.toggleLog();
      this.h[a]?.();
    });
    root.addEventListener('pointerover', (e) => { if (e.target.closest('button')) sfx('hover'); });
    $('#hint-cancel').onclick = () => this.h.cancel?.();
    $('#hint-action').onclick = () => this.h.direct?.();
    $('#log-toggle').onclick = () => this.toggleLog();
    $('#tutor-ok').onclick = () => this.tutorNext();
    $('#tutor-skip').onclick = () => { settings.set({ tipsOff: true }); this.tutorQ = []; this.show('tutor', false); };
    $('#amenu').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) this.h.menuPick?.(b.dataset.k); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) { this.closeModal(); e.stopPropagation(); } }, true);
    this.syncMute(); this.setScale(); window.addEventListener('resize', () => this.setScale());
  }
  on(handlers) { Object.assign(this.h, handlers); }
  syncMute() { $('#btn-mute').classList.toggle('off', settings.get().muted); }
  show(id, on) { $(`#${id}`).classList.toggle('hidden', !on); }
  // escala a interface inteira: nunca abaixo de 100% (notebook 1366×768) e cresce em telas maiores
  setScale() { this.scale = Math.max(1, Math.min(1.9, Math.min(window.innerHeight / 760, window.innerWidth / 1300))); this.root.style.zoom = this.scale; }

  // ───── telas ─────
  boot(p) { $('#boot-line').textContent = `Abrindo o caixa… ${Math.round(p * 100)}%`; $('#boot-bar').style.width = `${p * 100}%`; }
  bootDone() { this.show('boot', false); }
  mainMenu(on) {
    this.show('menu', on);
    const n = settings.get().companyName;
    $('#menu-company').innerHTML = n ? `Empresa registrada: <b>${esc(n)}</b>` : '';
  }
  hud(on) { this.show('hud', on); if (!on) { $('#log').classList.add('hidden'); $('#btn-log').classList.remove('on'); this.show('ticker', false); this.chips([]); this.menu(null); this.hint(null); this.detail(null); this.preview(null); this.tip(null); this.tutorQ = []; this.show('tutor', false); } }
  closeModal() { const m = $('#modal'); if (m.classList.contains('hidden')) return; m.classList.add('hidden'); m.innerHTML = ''; sfx('cancel'); const cb = this.onModalClose; this.onModalClose = null; cb?.(); }
  modal(html, cls = '') {
    const m = $('#modal'); m.innerHTML = `<div class="modal-box ${cls}">${html}</div>`; m.classList.remove('hidden');
    m.onclick = (e) => { if (e.target === m || e.target.closest('[data-close]')) this.closeModal(); };
    return m.firstElementChild;
  }
  confirm(title, body, yes, onYes) {
    const box = this.modal(`<h2>${esc(title)}</h2><p>${esc(body)}</p><nav><button data-close>Continuar jogando</button><button id="cf-yes" class="primary">${esc(yes)}</button></nav>`);
    $('#cf-yes', box).onclick = () => { $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; onYes(); };
  }
  nameEntry(onDone) {
    const cur = settings.get().companyName ?? '';
    const box = this.modal(`
      <div class="memo">Formulário 01-A · registro de empresa</div>
      <h2>Como se chama a sua empresa?</h2>
      <p>É esse nome que vai na sua pasta de CAIXA e disputa os investidores.</p>
      <input id="name-in" maxlength="${MAX_NAME}" value="${esc(cur)}" placeholder="Nome da empresa" autocomplete="off" spellcheck="false">
      <p class="fine">Até ${MAX_NAME} caracteres · Enter confirma</p>
      <nav><button data-close>Voltar</button><button id="name-ok" class="primary">Assinar e entrar</button></nav>`, 'form');
    const inp = $('#name-in', box), ok = $('#name-ok', box);
    const sync = () => { ok.disabled = !cleanName(inp.value); };
    const go = () => { const n = cleanName(inp.value); if (!n) return; settings.set({ companyName: n }); sfx('start'); this.onModalClose = null; $('#modal').classList.add('hidden'); $('#modal').innerHTML = ''; onDone(n); };
    inp.addEventListener('input', () => { sfx('type'); sync(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); e.stopPropagation(); });
    ok.onclick = go; sync(); setTimeout(() => { inp.focus(); inp.select(); }, 30);
  }
  help(onClose) {
    this.onModalClose = onClose ?? null;
    this.modal(`
      <div class="memo">Manual do colaborador</div><h2>Como jogar</h2>
      <div class="help-grid">
        <section><h3>1 · O objetivo</h3><p>Cada empresa começa com <b>$ 8.000 de CAIXA</b> — é a sua vida, mostrada na pasta com o seu nome. Zere o CAIXA do rival antes que ele zere o seu.</p></section>
        <section><h3>2 · O seu turno</h3><p>Você compra 1 carta e pode: <b>jogar cartas</b> da mão (as de contorno verde), depois <b>ir para a batalha</b> e atacar, e por fim <b>encerrar o turno</b>. Só dá para invocar <b>1 criatura por turno</b>.</p></section>
        <section><h3>3 · Criaturas</h3><p>Têm dois números: <span class="ic">${ICON.atk}</span> <b>ATQ</b> (ataque) e <span class="ic">${ICON.def}</span> <b>DEF</b> (defesa). Entram em <b>ataque</b> (em pé, podem atacar) ou em <b>defesa</b> (deitadas, só protegem).</p></section>
        <section><h3>4 · Custo</h3><p>Cada <span class="pip">✕</span> no nome da carta é uma criatura sua que precisa ser <b>sacrificada</b> para invocá-la. Cartas sem ✕ entram de graça.</p></section>
        <section><h3>5 · Combate</h3><p>O número maior vence e destrói a outra carta. Contra criatura em <b>ataque</b>, quem perde também perde a diferença em CAIXA. Contra criatura em <b>defesa</b>, ninguém perde CAIXA — a não ser você, se atacar com menos. Sem criaturas na frente? O ataque vai <b>direto no CAIXA</b>.</p></section>
        <section><h3>6 · Efeitos e armadilhas</h3><p><b>Efeitos</b> acontecem na hora. <b>Armadilhas</b> ficam viradas para baixo e disparam sozinhas quando o rival ataca. O <b>Morto</b> é a pilha de descarte.</p></section>
      </div>
      <p class="fine">Atalhos: <kbd>B</kbd> batalha · <kbd>Espaço</kbd> encerrar turno · <kbd>Esc</kbd> ou botão direito cancela · passe o mouse em qualquer carta para ler o que ela faz.</p>
      <nav><button data-close class="primary">Entendido</button></nav>`, 'wide');
  }
  settings() {
    const s = settings.get();
    const box = this.modal(`
      <h2>Configurações</h2>
      <div class="rows">
        <label>Música e ambiente <input type="range" min="0" max="1" step="0.05" value="${s.music}" data-k="music"></label>
        <label>Efeitos sonoros <input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-k="sfx"></label>
        <label>Trilha <span class="seg" data-k="soundtrack"><button data-v="procedural">Gerada</button><button data-v="original">Original</button></span></label>
        <label>Imagem <span class="seg" data-k="pixel"><button data-v="1">Nítida</button><button data-v="2">Retrô</button><button data-v="3">Pixelada</button></span></label>
        <label>Velocidade das animações <span class="seg" data-k="speed"><button data-v="1">Normal</button><button data-v="1.6">Rápida</button><button data-v="2.5">Turbo</button></span></label>
        <label>Tremor e clarões <span class="seg" data-k="shake"><button data-v="true">Ligado</button><button data-v="false">Reduzido</button></span></label>
        <label>Dicas para iniciantes <span class="seg" data-k="tipsOff"><button data-v="false">Ligadas</button><button data-v="true">Desligadas</button></span></label>
        <label>Som <span class="seg" data-k="muted"><button data-v="false">Ligado</button><button data-v="true">Mudo</button></span></label>
      </div>
      <nav><button data-close class="primary">Voltar</button></nav>`);
    const syncSeg = () => box.querySelectorAll('.seg').forEach((sg) => sg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(settings.get()[sg.dataset.k]) === b.dataset.v)));
    syncSeg();
    box.addEventListener('input', (e) => { const k = e.target.dataset?.k; if (!k) return; settings.set({ [k]: Number(e.target.value) }); applyVolumes(); if (k === 'sfx') sfx('select'); });
    box.addEventListener('click', (e) => {
      const b = e.target.closest('.seg button'); if (!b) return;
      const k = b.parentElement.dataset.k, raw = b.dataset.v, v = raw === 'true' ? true : raw === 'false' ? false : isNaN(Number(raw)) ? raw : Number(raw);
      settings.set(k === 'tipsOff' && v === false ? { tipsOff: false, tips: {} } : { [k]: v }); applyVolumes(); this.syncMute(); syncSeg(); sfx('select');
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
      if (f) { const d = defOf(f.dataset.id); z.firstElementChild.src = asset(d.art); z.lastElementChild.innerHTML = this.cardBody(d, {}); z.classList.remove('hidden'); sfx('card'); e.stopPropagation(); }
      else if (e.target.closest('#gal-zoom')) { z.classList.add('hidden'); e.stopPropagation(); }
    });
  }

  // ───── HUD do duelo ─────
  setInfo(i) {
    const fill = (id, p, mine) => {
      const r = $(id), el = $('.f-caixa', r), from = Number(el.dataset.v ?? p.caixa), to = Math.round(p.caixa);
      $('.f-name', r).textContent = p.name.toLowerCase();
      // o valor "roda" até o novo número e a pasta treme quando perde CAIXA
      if (from !== to) {
        cancelAnimationFrame(el._raf); const t0 = performance.now(), dur = Math.min(900, 250 + Math.abs(to - from) * 0.25);
        const step = (now) => { const k = Math.min(1, (now - t0) / dur), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); el.textContent = `$ ${v.toLocaleString('pt-BR')}`; if (k < 1) el._raf = requestAnimationFrame(step); };
        el._raf = requestAnimationFrame(step);
        r.classList.remove('hit', 'gain'); void r.offsetWidth; r.classList.add(to < from ? 'hit' : 'gain');
      } else if (!el.textContent) el.textContent = `$ ${to.toLocaleString('pt-BR')}`;
      el.dataset.v = to;
      r.classList.toggle('low', p.caixa <= 2000);
      r.classList.toggle('active', mine ? i.mine : !i.mine && i.phase !== 'over');
      $('.f-stats', r).innerHTML = (mine ? '' : `<span title="Cartas na mão do rival">mão <b>${p.hand}</b></span>`) + (p.frio ? `<span class="frio" title="Frio: perde $100 por marcador no início de cada turno">frio <b>${p.frio}</b> · −$${p.frio * 100}/turno</span>` : '') + (p.caixa <= 2000 ? '<span class="warn">CAIXA baixo</span>' : '');
    };
    fill('#plate-opp', i.opp, false); fill('#plate-me', i.me, true);
    $('#turn-label').innerHTML = i.phase === 'over' ? 'Fim de expediente' : `<small>Turno ${i.turn}</small>${i.mine ? 'Sua vez' : `Vez de ${esc(i.opp.name)}`}`;
    $('#ph-main').className = i.mine && i.phase === 'main' ? 'on' : i.mine && i.phase === 'battle' ? 'done' : '';
    $('#ph-battle').className = i.mine && i.phase === 'battle' ? 'on' : '';
    $('.turnbox').classList.toggle('foe', !i.mine);
    $('#edge').className = `edge ${i.phase === 'over' ? '' : i.mine ? 'me' : 'foe'}`;
  }
  // etiqueta carimbada saindo de trás da pasta (igual à referência 2D)
  caixaTag(mine, amount, heal) {
    const t = $(mine ? '#tag-me' : '#tag-opp');
    t.lastElementChild.textContent = `${heal ? '+' : '-'} $ ${Math.round(amount).toLocaleString('pt-BR')}`;
    t.className = `tag ${heal ? 'heal' : 'dmg'}`; void t.offsetWidth; t.classList.add('go');
  }
  setButtons(b) {
    const bb = $('#btn-battle'), be = $('#btn-end');
    bb.disabled = !b.battle.enabled; bb.firstElementChild.textContent = b.battle.label; bb.title = b.battle.hint || '';
    bb.classList.toggle('hidden', !!b.battle.hidden);
    be.disabled = !b.end.enabled;
    // um botão principal por vez: o próximo passo recomendado
    bb.classList.toggle('main', b.primary === 'battle'); be.classList.toggle('main', b.primary === 'end'); be.classList.toggle('pulse', b.primary === 'end' && !!b.end.pulse);
    $('#pills').innerHTML = (b.pills ?? []).map((p) => `<span class="${p.on ? 'on' : ''}" title="${p.tip}">${p.text}</span>`).join('');
  }
  toggleLog() { const l = $('#log'); l.classList.toggle('hidden'); $('#btn-log').classList.toggle('on', !l.classList.contains('hidden')); if (!l.classList.contains('hidden')) $('#log-lines').scrollTop = 1e6; sfx('select'); }
  // faixa no topo com a última jogada (substitui o relatório sempre aberto)
  ticker(text, type) {
    const t = $('#ticker'); t.textContent = text; t.className = `ticker ${type}`; void t.offsetWidth; t.classList.add('go');
    clearTimeout(this.tickT); this.tickT = setTimeout(() => t.classList.add('hidden'), 3600);
  }
  coach(text) { const c = $('#coach'); if (c.textContent !== text) c.textContent = text; }
  clearLog() { $('#log-lines').innerHTML = ''; }
  log(line, type = '') {
    const box = $('#log-lines'), d = el('div', `l ${type}`); d.textContent = line; box.appendChild(d);
    while (box.children.length > 120) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
    if (TICKER.has(type)) this.ticker(line, type);
  }
  banner(title, sub, kind = 'me') {
    const b = $('#banner'), tEl = $('#banner-title'); $('#banner-sub').textContent = sub ?? '';
    clearInterval(this.scrT); let n = 0; const total = 9;
    const draw = () => { tEl.textContent = [...title].map((ch, i) => (ch === ' ' || i < (n / total) * title.length ? ch : String(Math.floor(Math.random() * 10)))).join(''); if (n++ >= total) clearInterval(this.scrT); };
    draw(); this.scrT = setInterval(draw, 34);
    b.className = `banner ${kind}`; void b.offsetWidth; b.classList.add('go');
  }
  toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); t.classList.remove('go'); void t.offsetWidth; t.classList.add('go');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.add('hidden'), 3200);
  }
  // dicas de primeira vez (fila; cada uma aparece só uma vez)
  tutor(id, html) {
    const s = settings.get();
    if (s.tipsOff || s.tips?.[id]) return;
    settings.set({ tips: { ...(s.tips ?? {}), [id]: true } });
    this.tutorQ.push(html);
    if ($('#tutor').classList.contains('hidden')) this.tutorNext();
  }
  tutorNext() {
    const next = this.tutorQ.shift();
    this.show('tutor', !!next);
    if (next) { $('#tutor-text').innerHTML = next; sfx('turn'); }
  }
  hint(text, o = {}) {
    this.show('hint', !!text); if (!text) return;
    $('#hint-text').textContent = text;
    $('#hint-cancel').classList.toggle('hidden', o.cancel === false);
    const a = $('#hint-action'); a.classList.toggle('hidden', !o.action); if (o.action) a.textContent = o.action;
  }
  limit(text) { this.show('limit', !!text); if (text) $('#limit').textContent = text; }
  menu(options) {
    const m = $('#amenu'); this.show('amenu', !!options); if (!options) return;
    m.innerHTML = options.map((o) => `<button data-k="${o.key}" class="${o.cls}"><b>${o.label}${o.key2 ? `<kbd>${o.key2}</kbd>` : ''}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</button>`).join('') + '<button data-act="cancel" class="ghost">Cancelar</button>';
  }
  menuPos(x, y) { const m = $('#amenu'), z = this.scale, W = window.innerWidth / z; m.style.left = `${Math.max(170, Math.min(W - 170, x / z))}px`; m.style.top = `${Math.max(250, y / z - 12)}px`; }
  cardBody(d, o) {
    const fx = isEffect(d), cur = o.cur;
    const cls = (v, b) => (v > b ? 'up' : v < b ? 'down' : '');
    const stats = fx ? '' : `<div class="d-stats">
        <span class="${cur ? cls(cur.atk, d.atk) : ''}"><i class="ic">${ICON.atk}</i><small>ATQ</small>${money(cur ? cur.atk : d.atk)}</span>
        <span class="${cur ? cls(cur.def, d.def) : ''}"><i class="ic">${ICON.def}</i><small>DEF</small>${money(cur ? cur.def : d.def)}</span>
        <span class="cost">${d.cost ? `<small>custo</small>${'<i class="pip">✕</i>'.repeat(d.cost)}` : '<small>custo</small>grátis'}</span></div>`;
    return `<div class="d-name">${esc(d.name)}</div>
      <div class="d-type">${KIND[d.kind]} · ${esc(d.element)} · depto. ${DEPT[d.department] ?? d.department}</div>
      ${stats}<div class="d-rules">${rulesHtml(d.id)}</div>${glossHtml(d.id)}`;
  }
  detail(d) {
    const box = $('#detail'); this.show('detail', !!d); if (!d) return;
    const key = JSON.stringify(d); if (box.dataset.k === key) return; box.dataset.k = key;
    const notes = (d.lines ?? []).map((l) => `<div>${esc(l)}</div>`).join('');
    if (d.faceDown || !d.cardId) { box.innerHTML = `<img class="d-back" src="${asset('cards/back.png')}" alt=""><div class="d-body"><div class="d-notes">${notes}</div></div>`; return; }
    const def = defOf(d.cardId);
    box.innerHTML = `<img src="${faceUrl(d.cardId)}" alt=""><div class="d-body">${this.cardBody(def, d)}${notes ? `<div class="d-notes">${notes}</div>` : ''}</div>`;
    box.classList.remove('compact', 'noimg');
    if (box.scrollHeight > box.clientHeight + 2) { box.classList.add('compact'); if (box.scrollHeight > box.clientHeight + 2) box.classList.add('noimg'); }
  }
  preview(html) { this.show('preview', !!html); if (html) $('#preview').innerHTML = html; }
  previewPos(x, y) { const p = $('#preview'), t = $('#tip'), z = this.scale, W = window.innerWidth / z; x /= z; y /= z; p.style.transform = `translate(${Math.min(W - 270, x + 24)}px, ${Math.max(10, y - 110)}px)`; t.style.transform = `translate(${Math.min(W - 320, x + 18)}px, ${y + 24}px)`; }
  tip(text) { this.show('tip', !!text); if (text) $('#tip').textContent = text; }
  chips(list) {
    const box = $('#chips'), seen = new Set();
    for (const c of list) {
      seen.add(c.id);
      let e = this.chipEls.get(c.id);
      if (!e) { e = el('div', 'chip'); box.appendChild(e); this.chipEls.set(c.id, e); }
      if (e.dataset.h !== c.html) { e.innerHTML = c.html; e.dataset.h = c.html; }
      e.style.transform = `translate(${Math.round(c.x / this.scale)}px, ${Math.round(c.y / this.scale)}px) translate(-50%, 0)`;
    }
    for (const [id, e] of this.chipEls) if (!seen.has(id)) { e.remove(); this.chipEls.delete(id); }
  }
  float(x, y, text, cls = '') {
    const f = el('div', `float ${cls}`); f.textContent = text; f.style.left = `${x / this.scale}px`; f.style.top = `${y / this.scale}px`;
    $('#floats').appendChild(f); setTimeout(() => f.remove(), 1700);
  }
  clash(pos, a, b, mode) {
    const f = el('div', 'float clash', `<b>${a}</b><i>${ICON.atk}</i><i>${mode === 'DEF' ? ICON.def : ICON.atk}</i><b>${b}</b>`); f.style.left = `${pos.x / this.scale}px`; f.style.top = `${pos.y / this.scale - 44}px`;
    $('#floats').appendChild(f); setTimeout(() => f.remove(), 1500);
  }
  gameOver(o) {
    this.show('over', !!o); if (!o) return;
    $('#over').className = `screen ${o.win ? 'win' : o.draw ? 'draw' : 'lose'}`;
    $('#over-memo').textContent = o.win ? 'Comunicado aos acionistas · aprovado' : o.draw ? 'Ata de reunião · sem deliberação' : 'Aviso de falência · 2ª via';
    $('#over-title').textContent = o.title; $('#over-sub').textContent = o.sub; $('#over-stats').textContent = o.stats;
  }
}
export { ICON };
