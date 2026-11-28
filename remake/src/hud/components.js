// Design system do HUD — componentes puros (props → HTML). Usados pelo jogo (ui.js) e pelo laboratório (lab.js).
// Regra de linguagem: o que é do jogador é papelaria (pasta de CAIXA, ficha da carta);
// o que é do sistema é terminal (painel do turno, menus, avisos, prévia de combate).
import { CARDS } from '../cards.js';
import { RULES_TEXT, DEPT, KIND } from '../cardtext.js';
import { asset } from '../assets.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const fmt = (n) => Math.round(n).toLocaleString('pt-BR');
export const money = (n) => `$ ${fmt(n)}`;
const defOf = (id) => CARDS.find((c) => c.id === id);
const isFx = (d) => d.kind === 'effect_instant' || d.kind === 'effect_trap';
const cx = (...a) => a.filter(Boolean).join(' ');

// ───────── ícones (16×16, traço de 1.5) ─────────
const svg = (d, extra = '') => `<svg class="h-ico" viewBox="0 0 16 16" aria-hidden="true"${extra}>${d}</svg>`;
const P = (d) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
export const ICON = {
  atk: svg(P('M13.5 1.5 6.2 8.8M13.5 1.5l-3 .4-5.6 5.6 2.6 2.6 5.6-5.6zM4.2 8.2l3.6 3.6M5.4 10.6l-3 3M2 12.6l1.4 1.4')),
  def: svg(P('M8 1.6c1.6 1 3.3 1.5 5 1.5v4.6c0 3-2 5.3-5 6.7-3-1.4-5-3.7-5-6.7V3.1c1.7 0 3.4-.5 5-1.5z')),
  fx: svg(P('M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3M3.4 3.4l2.1 2.1M10.5 10.5l2.1 2.1M3.4 12.6l2.1-2.1M10.5 5.5l2.1-2.1')),
  trap: svg(P('M2 13.5h12M3.5 13.5 8 3l4.5 10.5M8 8.5v2')),
  lock: svg(P('M4 7.5h8v6H4zM5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5')),
  clock: svg(P('M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM8 4.8V8l2.2 1.4')),
  swap: svg(P('M3 5h9l-2.5-2.5M13 11H4l2.5 2.5')),
  bin: svg(P('M3 4.5h10M6 4.5V3h4v1.5M4.5 4.5l.7 9h5.6l.7-9')),
  summon: svg(P('M8 13.5V4M4.5 7.5 8 4l3.5 3.5M3 14h10')),
  card: svg(P('M4 1.8h8a1 1 0 0 1 1 1v10.4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.8a1 1 0 0 1 1-1z')),
  hand: svg(P('M2.5 6.5 6 2.5l3.2 2.8M5 11.5l6.5-6 2 2.2-6.5 6zM2.5 6.5l2.5 5')),
  deck: svg(P('M5 2.5h8v10H5zM3 4.5v10h8')),
  dead: svg(P('M4 2.5h8v11H4zM6 6l4 4M10 6l-4 4')),
  log: svg(P('M3 3.5h10M3 6.5h10M3 9.5h7M3 12.5h5')),
  help: svg(P('M6 6a2 2 0 1 1 2.8 1.8c-.5.2-.8.7-.8 1.2v.5M8 11.8v.2')),
  sound: svg(P('M2.5 6v4h2.5L9 13V3L5 6zM11.5 5.5a3.5 3.5 0 0 1 0 5')),
  mute: svg(P('M2.5 6v4h2.5L9 13V3L5 6zM11 6l3.5 4M14.5 6 11 10')),
  gear: svg(P('M6.9 1.8h2.2l.4 1.8 1.3.6 1.6-1 1.5 1.5-1 1.6.6 1.3 1.8.4v2.2l-1.8.4-.6 1.3 1 1.6-1.5 1.5-1.6-1-1.3.6-.4 1.8H6.9l-.4-1.8-1.3-.6-1.6 1-1.5-1.5 1-1.6-.6-1.3-1.8-.4V6.9l1.8-.4.6-1.3-1-1.6 1.5-1.5 1.6 1 1.3-.6zM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z')),
  menu: svg(P('M2.5 4h11M2.5 8h11M2.5 12h11')),
  close: svg(P('M4 4l8 8M12 4l-8 8')),
  check: svg(P('M3 8.5 6.5 12 13 4.5')),
  arrow: svg(P('M3 8h10M9 4l4 4-4 4')),
  coin: svg(P('M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM8 5v6M6.2 6.4C6.6 5.6 9.4 5.4 9.6 7c.2 1.6-3.6 1.2-3.4 2.8.2 1.4 3 1.3 3.6.4')),
  cold: svg(P('M8 1.5v13M2.4 4.7l11.2 6.6M2.4 11.3l11.2-6.6M6 2.8 8 4.5l2-1.7M6 13.2l2-1.7 2 1.7')),
  warn: svg(P('M8 2 14.5 13.5h-13zM8 6.5v3.2M8 11.6v.2')),
  info: svg(P('M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM8 7.2v4M8 4.8v.2')),
};
const key = (k) => (k ? `<kbd class="h-key">${esc(k)}</kbd>` : '');

// ───────── botão ─────────
// tone: primary | secondary | danger | ghost ; state: idle | ready (pulsa) | disabled
export function button({ act, label, keycap, tone = 'secondary', icon, disabled, ready, title, size = 'md', wide }) {
  return `<button class="${cx('h-btn', `h-btn--${tone}`, `h-btn--${size}`, ready && 'is-ready', wide && 'h-btn--wide')}" ${act ? `data-act="${act}"` : ''} ${disabled ? 'disabled' : ''} ${title ? `title="${esc(title)}"` : ''}>${icon ? ICON[icon] : ''}<span class="h-btn__label">${esc(label)}</span>${key(keycap)}</button>`;
}
export function iconButton({ act, icon, label, on, title, id }) {
  return `<button class="${cx('h-ibtn', on && 'is-on', label && 'h-ibtn--label')}" ${id ? `id="${id}"` : ''} data-act="${act}" title="${esc(title ?? label)}" aria-label="${esc(title ?? label)}">${ICON[icon]}${label ? `<span>${esc(label)}</span>` : ''}</button>`;
}

// ───────── pasta de CAIXA ─────────
// props: { who: 'me'|'opp', name, caixa, max, active, meta: [{ icon, text, tone }] }
export function folder(p) {
  return `<div class="${cx('h-folder', `h-folder--${p.who}`)}" data-who="${p.who}">
    <div class="h-folder__stamp"><svg viewBox="0 0 150 58" preserveAspectRatio="none" aria-hidden="true"><polygon points="${stampPoints()}"/></svg><span></span></div>
    <div class="h-folder__shape">
      <div class="h-folder__tab"><i class="h-folder__light"></i><span class="h-folder__name"></span></div>
      <div class="h-folder__body">
        <div class="h-folder__value"><span class="h-folder__cur">$</span><span class="h-folder__num"></span></div>
        <div class="h-folder__bar"><i></i></div>
      </div>
    </div>
    <div class="h-folder__meta"></div>
  </div>`;
}
let _stamp;
function stampPoints(w = 150, h = 58, d = 3) {
  if (_stamp) return _stamp;
  const nx = 22, ny = 8, sx = w / nx, sy = h / ny, p = [];
  for (let i = 0; i < nx; i++) p.push([(i + 0.5) * sx, i % 2 ? d : 0], [(i + 1) * sx, d / 2]);
  for (let i = 0; i < ny; i++) p.push([w - (i % 2 ? d : 0), (i + 0.5) * sy], [w - d / 2, (i + 1) * sy]);
  for (let i = 0; i < nx; i++) p.push([w - (i + 0.5) * sx, h - (i % 2 ? d : 0)], [w - (i + 1) * sx, h - d / 2]);
  for (let i = 0; i < ny; i++) p.push([i % 2 ? d : 0, h - (i + 0.5) * sy], [d / 2, h - (i + 1) * sy]);
  return (_stamp = p.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' '));
}
// atualiza uma pasta já montada (o número "roda" e a pasta reage ao dano)
export function patchFolder(root, p, { animate = true } = {}) {
  const num = root.querySelector('.h-folder__num'), from = Number(num.dataset.v ?? p.caixa), to = Math.round(p.caixa), max = p.max ?? 8000;
  root.querySelector('.h-folder__name').textContent = p.name;
  root.classList.toggle('is-active', !!p.active);
  const low = to > 0 && to <= max * 0.25;
  root.classList.toggle('is-low', low);
  root.classList.toggle('is-out', to <= 0);
  root.querySelector('.h-folder__bar i').style.transform = `scaleX(${Math.max(0, Math.min(1, to / max))})`;
  const meta = [...(p.meta ?? []), ...(low ? [{ icon: 'warn', tone: 'stop', text: 'CAIXA baixo' }] : [])].map((m) => `<span class="${cx('h-meta', m.tone && `h-meta--${m.tone}`)}" ${m.title ? `title="${esc(m.title)}"` : ''}>${m.icon ? ICON[m.icon] : ''}${m.html ?? esc(m.text)}</span>`).join('');
  const metaEl = root.querySelector('.h-folder__meta'); if (metaEl.dataset.h !== meta) { metaEl.innerHTML = meta; metaEl.dataset.h = meta; }
  if (from !== to && animate) {
    cancelAnimationFrame(num._raf); const t0 = performance.now(), dur = Math.min(1100, 300 + Math.abs(to - from) * 0.3);
    const step = (now) => { const k = Math.min(1, (now - t0) / dur); num.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) num._raf = requestAnimationFrame(step); };
    num._raf = requestAnimationFrame(step);
    root.classList.remove('is-hit', 'is-gain'); void root.offsetWidth; root.classList.add(to < from ? 'is-hit' : 'is-gain');
    stamp(root, Math.abs(to - from), to > from);
  } else num.textContent = fmt(to);
  num.dataset.v = to;
}
export function stamp(root, amount, gain) {
  const t = root.querySelector('.h-folder__stamp');
  t.lastElementChild.textContent = `${gain ? '+' : '−'} $ ${fmt(amount)}`;
  t.classList.remove('is-go', 'is-gain'); void t.offsetWidth; t.classList.add('is-go'); t.classList.toggle('is-gain', !!gain);
}

// ───────── painel do turno ─────────
// props: { mine, over, turn, who, phase: 'main'|'battle', coach, res: [{ icon, label, value, on }],
//          primary: { act, label, keycap, ready, disabled }, secondary: { act, label, keycap, disabled } | null, waiting }
export function turnPanel(p) {
  const step = (id, n, label) => {
    const on = p.mine && p.phase === id, done = p.mine && id === 'main' && p.phase === 'battle';
    return `<li class="${cx('h-steps__item', on && 'is-on', done && 'is-done')}"><i class="h-steps__bar"></i><span>${done ? ICON.check : `<b>${n}</b>`}${label}</span></li>`;
  };
  const head = p.over ? '<h2 class="h-turn__who">Fim de expediente</h2>'
    : `<span class="h-cap">Turno ${p.turn}</span><h2 class="h-turn__who">${p.mine ? 'Sua vez' : `Vez de ${esc(p.who)}`}</h2>`;
  return `<section class="${cx('h-turn', p.mine ? 'is-mine' : 'is-foe', p.over && 'is-over')}">
    <header class="h-turn__head">${head}${!p.mine && !p.over ? '<span class="h-dots" aria-label="pensando"><i></i><i></i><i></i></span>' : ''}</header>
    ${p.over ? '' : `<ol class="h-steps">${step('main', 1, 'Jogar cartas')}${step('battle', 2, 'Batalha')}</ol>`}
    ${p.coach ? `<p class="h-turn__coach">${esc(p.coach)}</p>` : ''}
    ${p.res?.length ? `<dl class="h-res">${p.res.map((r) => `<div class="${cx('h-res__row', r.on ? 'is-on' : 'is-off')}" ${r.title ? `title="${esc(r.title)}"` : ''}><dt>${ICON[r.icon] ?? ''}${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('')}</dl>` : ''}
    <div class="h-turn__actions">
      ${p.secondary ? button({ ...p.secondary, tone: 'secondary', wide: true }) : ''}
      ${p.primary ? button({ ...p.primary, tone: p.primary.tone ?? 'primary', size: 'lg', wide: true }) : ''}
    </div>
  </section>`;
}

// ───────── ficha da carta ─────────
// props: { cardId, faceDown, owner: 'me'|'opp', where: 'hand'|'table'|'dead'|'show', cur: { atk, def },
//          status: { tone: 'go'|'stop'|'info', text }, notes: [string] }
export function cardSheet(p) {
  if (p.faceDown || !p.cardId) {
    return `<article class="h-sheet h-sheet--back">
      <div class="h-sheet__art h-sheet__art--back" style="background-image:url(${asset('cards/back.png')})"></div>
      <div class="h-sheet__body">${(p.notes ?? []).map((n, i) => `<p class="${i ? 'h-sheet__note' : 'h-sheet__lead'}">${esc(n)}</p>`).join('')}</div>
    </article>`;
  }
  const d = defOf(p.cardId), fx = isFx(d), cur = p.cur;
  const tone = (v, b) => (v > b ? 'up' : v < b ? 'down' : '');
  const stat = (icon, label, v, base) => {
    const t = cur ? tone(v, base) : '';
    return `<div class="${cx('h-stat', t && `is-${t}`)}"><span class="h-stat__label">${ICON[icon]}${label}</span><span class="h-stat__value">${fmt(v)}</span>${t ? `<span class="h-stat__base">base ${fmt(base)}</span>` : ''}</div>`;
  };
  const cost = d.cost ? `<div class="h-stat h-stat--cost"><span class="h-stat__label">${ICON.summon}Custo</span><span class="h-stat__value">${'<i class="h-pip">✕</i>'.repeat(d.cost)}</span><span class="h-stat__base">${d.cost} sacrifício${d.cost > 1 ? 's' : ''}</span></div>`
    : `<div class="h-stat h-stat--cost"><span class="h-stat__label">${ICON.summon}Custo</span><span class="h-stat__value h-stat__value--free">grátis</span></div>`;
  const kindLine = [KIND[d.kind], d.element, `depto. ${DEPT[d.department] ?? d.department}`].join(' / ');
  const extra = fx ? (d.kind === 'effect_trap' ? 'Virada até disparar.' : d.durationTurns ? `Dura ${d.durationTurns} turnos seus.` : 'Vale na hora e vai para o Morto.') : '';
  const where = { hand: 'Na sua mão', table: p.owner === 'opp' ? 'Na mesa do rival' : 'Na sua mesa', dead: 'No Morto', show: p.owner === 'opp' ? 'Jogada do rival' : 'Sua jogada' }[p.where] ?? '';
  return `<article class="${cx('h-sheet', p.owner === 'opp' && 'h-sheet--opp')}">
    <div class="h-sheet__art" style="background-image:url(${asset(d.art)})">${where ? `<span class="h-sheet__where">${where}</span>` : ''}</div>
    <div class="h-sheet__body">
      <h3 class="h-sheet__name">${esc(d.name)}</h3>
      <p class="h-sheet__kind">${esc(kindLine)}</p>
      ${fx ? `<p class="h-sheet__fx">${ICON[d.kind === 'effect_trap' ? 'trap' : 'fx']}${extra}</p>` : `<div class="h-sheet__stats">${stat('atk', 'ATQ', cur ? cur.atk : d.atk, d.atk)}${stat('def', 'DEF', cur ? cur.def : d.def, d.def)}${cost}</div>`}
      <div class="h-sheet__rules">${(RULES_TEXT[d.id] ?? []).map(([t, txt]) => `<p><b>${esc(t)}</b> ${esc(txt)}</p>`).join('')}</div>
      ${gloss(d.id)}
      ${(p.notes ?? []).length ? `<div class="h-sheet__notes">${p.notes.map((n) => `<p>${esc(n)}</p>`).join('')}</div>` : ''}
    </div>
    ${p.status ? `<footer class="${cx('h-sheet__status', `is-${p.status.tone}`)}">${ICON[p.status.tone === 'go' ? 'check' : p.status.tone === 'stop' ? 'lock' : 'info']}<span>${esc(p.status.text)}</span></footer>` : ''}
  </article>`;
}
// a ilustração encolhe sozinha (flex); se ainda faltar espaço: sem ilustração → texto compacto
export function fitSheet(el) {
  if (!el) return;
  el.classList.remove('is-compact', 'is-noart', 'is-tight');
  const body = el.querySelector('.h-sheet__body'), over = () => el.scrollHeight > el.clientHeight + 1 || (body && body.scrollHeight > body.clientHeight + 1);
  for (const c of ['is-noart', 'is-tight']) { if (!over()) break; el.classList.add(c); }
}
const GLOSS = [
  [/Frio/, 'Frio', '−$100 do CAIXA por marcador, a cada turno.'],
  [/Morto/, 'Morto', 'a pilha de descarte.'],
  [/[Ii]mune/, 'Imune', 'o efeito não pega nela.'],
  [/depto\./, 'Depto.', 'departamento, abaixo do nome.'],
  [/moeda/, 'Moeda', 'cara ou coroa, 50%.'],
  [/virada para baixo/, 'Virada para baixo', 'o rival não vê a carta.'],
];
function gloss(id) {
  const txt = (RULES_TEXT[id] ?? []).map((r) => r[1]).join(' ');
  const hits = GLOSS.filter(([re]) => re.test(txt)).slice(0, 2);
  return hits.length ? `<dl class="h-gloss">${hits.map(([, t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('')}</dl>` : '';
}

// ───────── menu de ação ─────────
// props: { title, note, options: [{ key, icon, label, sub, keycap, tone }] }
export function actionMenu(p) {
  return `<div class="h-menu" role="menu">
    ${p.title ? `<header class="h-menu__head"><span class="h-menu__title">${esc(p.title)}</span>${p.note ? `<span class="h-menu__note">${esc(p.note)}</span>` : ''}</header>` : ''}
    ${p.options.map((o) => `<button class="${cx('h-menu__opt', o.tone && `is-${o.tone}`)}" data-k="${o.key}" role="menuitem">
      <span class="h-menu__icon">${ICON[o.icon] ?? ''}</span>
      <span class="h-menu__text"><b>${esc(o.label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span>${key(o.keycap)}</button>`).join('')}
    <button class="h-menu__cancel" data-act="cancel"><span>Cancelar</span>${key('Esc')}</button>
  </div>`;
}

// ───────── barra de instrução (seleção em andamento) ─────────
// props: { icon, text, count: { n, of }, action: { act, label }, cancel }
export function prompt(p) {
  return `<div class="h-prompt">
    <span class="h-prompt__icon">${ICON[p.icon ?? 'arrow']}</span>
    <span class="h-prompt__text">${esc(p.text)}</span>
    ${p.count ? `<span class="h-prompt__count">${p.count.n}<i>/</i>${p.count.of}</span>` : ''}
    ${p.action ? button({ act: p.action.act, label: p.action.label, icon: p.action.icon, tone: p.action.tone ?? 'secondary', size: 'sm' }) : ''}
    ${p.cancel === false ? '' : button({ act: 'cancel', label: 'Cancelar', keycap: 'Esc', tone: 'ghost', size: 'sm' })}
  </div>`;
}

// ───────── prévia de combate ─────────
// props: { result: 'win'|'lose'|'trade'|'bounce'|'nothing'|'direct'|'redirect', atk, against, mode, dmgFoe, dmgMe, trap }
const RESULT = {
  win: ['Você destrói a carta', 'go'], direct: ['Direto no CAIXA', 'go'], lose: ['Você perde a sua carta', 'stop'],
  bounce: ['Não passa da defesa', 'stop'], trade: ['As duas são destruídas', 'warn'], nothing: ['Empate: nada acontece', 'warn'],
  redirect: ['Fake news! O ataque será desviado', 'stop'],
};
export function combatPreview(p) {
  const [title, tone] = RESULT[p.result];
  const them = p.mode === null ? ['CAIXA', null] : [p.mode === 'DEF' ? 'DEF' : 'ATQ', p.against];
  const out = [];
  if (p.dmgFoe) out.push(['go', `Rival perde ${money(p.dmgFoe)}`]);
  if (p.dmgMe) out.push(['stop', `Você perde ${money(p.dmgMe)}`]);
  if (p.result === 'win' && p.mode === 'DEF') out.push(['info', 'Estava em defesa: o CAIXA dele não sofre']);
  if (p.result === 'redirect') out.push(['stop', 'O Filipe joga o ataque contra outra carta SUA']);
  if (p.trap) out.push(['warn', 'Há armadilha armada do outro lado']);
  return `<div class="${cx('h-preview', `is-${tone}`)}">
    <header class="h-preview__title">${esc(title)}</header>
    <div class="h-vs">
      <div class="h-vs__side"><small>${ICON.atk}Seu ATQ</small><b>${fmt(p.atk)}</b></div>
      <span class="h-vs__x">vs</span>
      <div class="h-vs__side"><small>${ICON[them[0] === 'DEF' ? 'def' : them[0] === 'ATQ' ? 'atk' : 'card']}${them[0] === 'CAIXA' ? 'Alvo' : `${them[0]} dele`}</small><b>${them[1] === null ? 'CAIXA' : fmt(them[1])}</b></div>
    </div>
    ${them[1] === null ? '' : `<div class="h-duel"><i style="flex:${Math.max(1, p.atk)}"></i><i style="flex:${Math.max(1, them[1])}"></i></div>`}
    ${out.length ? `<ul class="h-preview__out">${out.map(([t, x]) => `<li class="is-${t}">${ICON[t === 'warn' ? 'warn' : t === 'info' ? 'info' : t === 'go' ? 'arrow' : 'arrow']}${esc(x)}</li>`).join('')}</ul>` : ''}
  </div>`;
}

// ───────── etiquetas sobre a mesa ─────────
// creature: { kind: 'creature', atk, def, mode, atkTone, defTone, locked, multi }
// trap: { kind: 'trap', mine } · duration: { kind: 'duration', turns } · pile: { kind: 'pile', icon, n, label }
export function chip(c) {
  if (c.kind === 'creature') {
    const seg = (icon, v, on, t) => `<span class="${cx('h-chip__seg', on && 'is-on', t && `is-${t}`)}">${ICON[icon]}${fmt(v)}${t === 'up' ? '<i>▲</i>' : t === 'down' ? '<i>▼</i>' : ''}</span>`;
    return `<div class="h-chip">${seg('atk', c.atk, c.mode === 'ATK', c.atkTone)}${seg('def', c.def, c.mode === 'DEF', c.defTone)}${c.locked ? `<span class="h-chip__flag">${ICON.lock}travada</span>` : ''}${c.multi ? `<span class="h-chip__flag" title="Pode atacar 2 vezes por turno">ataca 2×</span>` : ''}</div>`;
  }
  if (c.kind === 'trap') return `<div class="h-chip h-chip--trap"><span class="h-chip__seg">${ICON.trap}${c.mine ? 'sua armadilha' : 'armadilha'}</span></div>`;
  if (c.kind === 'duration') return `<div class="h-chip h-chip--note"><span class="h-chip__seg">${ICON.clock}${c.turns} turno${c.turns > 1 ? 's' : ''}</span></div>`;
  return `<div class="h-chip h-chip--pile"><span class="h-chip__seg">${ICON[c.icon]}${esc(c.label)} <b>${c.n}</b></span></div>`;
}

// ───────── avisos ─────────
export function banner({ title, sub, tone = 'me' }) {
  return `<div class="${cx('h-banner', `is-${tone}`)}"><span class="h-banner__sub">${esc(sub ?? '')}</span><span class="h-banner__title">${esc(title)}</span></div>`;
}
export function toast({ text, tone = 'stop' }) {
  return `<div class="${cx('h-toast', `is-${tone}`)}">${ICON[tone === 'stop' ? 'lock' : 'info']}<span>${esc(text)}</span></div>`;
}
export function ticker({ text, who = 'me', tone }) {
  return `<div class="${cx('h-ticker', `is-${who}`, tone && `is-${tone}`)}"><i class="h-ticker__dot"></i><span>${esc(text)}</span></div>`;
}
// dica de primeira vez — props: { title, html, step, of, anchor }
export function coach(p) {
  return `<div class="${cx('h-coach', p.anchor && `h-coach--${p.anchor}`)}" role="dialog">
    <header class="h-coach__head"><span class="h-cap">${p.of ? `Dica ${p.step} de ${p.of}` : 'Dica'}</span>${p.title ? `<h4>${esc(p.title)}</h4>` : ''}</header>
    <div class="h-coach__body">${p.html}</div>
    <footer class="h-coach__foot">${button({ act: 'tips-off', label: 'Desligar dicas', tone: 'ghost', size: 'sm' })}${button({ act: 'tips-ok', label: 'Entendi', tone: 'primary', size: 'sm' })}</footer>
  </div>`;
}
export function topbar({ logOn, muted }) {
  return `<nav class="h-topbar">${iconButton({ act: 'logtoggle', id: 'btn-log', icon: 'log', label: 'Relatório', on: logOn, title: 'Relatório da partida (L)' })}${iconButton({ act: 'help', icon: 'help', title: 'Como jogar' })}${iconButton({ act: 'mute', id: 'btn-mute', icon: muted ? 'mute' : 'sound', title: muted ? 'Ligar o som' : 'Desligar o som', on: false })}${iconButton({ act: 'settings', icon: 'gear', title: 'Configurações' })}${iconButton({ act: 'quit', icon: 'menu', label: 'Menu', title: 'Voltar ao menu' })}</nav>`;
}
// relatório — lines: [{ text, type, who }]
export function logPanel(lines = []) {
  return `<aside class="h-log"><header class="h-log__head"><span>Relatório da partida</span>${iconButton({ act: 'logtoggle', icon: 'close', title: 'Fechar (L)' })}</header><ol class="h-log__list">${lines.map(logLine).join('')}</ol></aside>`;
}
export function logLine(l) {
  if (l.type === 'turnStart') return `<li class="h-log__turn">${esc(l.text.replace(/─/g, '').trim())}</li>`;
  return `<li class="${cx('h-log__line', `is-${l.who ?? 'sys'}`, l.type && `t-${l.type}`)}"><i></i>${esc(l.text)}</li>`;
}
