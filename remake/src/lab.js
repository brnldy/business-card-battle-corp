// Laboratório do design system do HUD: cada componente isolado, em todas as variantes,
// sobre recortes reais do jogo — e a composição completa em 1366×768.
import * as C from './hud/components.js';

const BOARD = '../lab/board.jpg', RIVAL = '../lab/rival.jpg';
const app = document.getElementById('app');
const sections = [];
// frame: recorte do jogo na posição real do componente (x,y = canto do recorte na tela 1366×768)
const frame = (label, html, { w = 300, h = 200, x = 0, y = 0, bg = BOARD, pad = 16, align = 'start' } = {}) =>
  `<figure class="lab-frame"><div class="lab-stage" style="width:${w}px;height:${h}px;background-image:url(${bg});background-position:${-x}px ${-y}px;padding:${pad}px;place-items:${align}">${html}</div><figcaption>${label}</figcaption></figure>`;
const section = (id, title, why, frames) => sections.push(`<section class="lab-sec" id="${id}"><header><h2>${title}</h2><p>${why}</p></header><div class="lab-grid">${frames.join('')}</div></section>`);

// ── fundamentos
const sw = (n, v, ink) => `<div class="lab-sw"><i style="background:var(${v})${ink ? ';outline:1px solid #0002' : ''}"></i><b>${n}</b><code>${v}</code></div>`;
sections.push(`<section class="lab-sec" id="base"><header><h2>Fundamentos</h2><p>Papelaria (pasta, ficha) é o que é seu; terminal (painéis escuros com linha ciano) é o sistema falando com você. Ciano = vez/sistema, verde = jogável/ganho, vermelho = dano/bloqueio, amarelo = atenção.</p></header>
<div class="lab-row">${[['Terminal', '--h-term'], ['Papel', '--h-paper', 1], ['Sálvia', '--h-sage'], ['Creme', '--h-cream', 1], ['Sistema', '--h-mdr'], ['Jogável', '--h-go'], ['Atenção', '--h-warn'], ['Dano', '--h-stop']].map(([n, v, i]) => sw(n, v, i)).join('')}</div>
<div class="lab-type"><span class="h-cap">Legenda 11.5 / caixa alta</span><span style="font-size:13px">Apoio 13 / Helvena</span><span style="font-size:14.5px">Texto 14.5 / Helvena</span><span style="font-size:17px">Ênfase 17 / Helvena</span><span style="font:24px var(--h-num)">Título 24 / Garamond</span><span style="font:44px var(--h-num)">$ 8.000</span></div>
<div class="lab-row lab-dark">${[
  C.button({ label: 'Encerrar turno', keycap: 'Espaço', tone: 'primary', size: 'lg' }),
  C.button({ label: 'Encerrar turno', keycap: 'Espaço', tone: 'primary', size: 'lg', ready: true }),
  C.button({ label: 'Ir para a batalha', keycap: 'B', tone: 'secondary' }),
  C.button({ label: 'Atacar o CAIXA', tone: 'danger', size: 'sm' }),
  C.button({ label: 'Cancelar', keycap: 'Esc', tone: 'ghost', size: 'sm' }),
  C.button({ label: 'Vez do rival', tone: 'primary', size: 'lg', disabled: true }),
  C.iconButton({ icon: 'log', label: 'Relatório', act: 'x' }),
  C.iconButton({ icon: 'log', label: 'Relatório', act: 'x', on: true }),
  C.iconButton({ icon: 'gear', act: 'x', title: 'Config' }),
].join('')}</div></section>`);

// ── pasta de CAIXA
const folders = [
  ['Rival / aguardando', { who: 'opp', name: 'MOCA-COLA', caixa: 8000, meta: [{ icon: 'hand', text: '5 cartas na mão' }] }],
  ['Você / sua vez', { who: 'me', name: 'ORO CORP', caixa: 6200, active: true }],
  ['CAIXA baixo + Frio', { who: 'me', name: 'ORO CORP', caixa: 1400, active: true, meta: [{ icon: 'cold', tone: 'cold', html: 'Frio ×2: perde <b>$ 200</b> por turno' }] }],
  ['Nome longo / acima do inicial', { who: 'opp', name: 'POLE STARTION INTERNACIONAL', caixa: 9500, max: 8000, meta: [{ icon: 'hand', text: '10 cartas na mão' }] }],
];
section('folder', 'Pasta de CAIXA', 'A vida de cada empresa. Lê-se de longe: número grande, barra de quanto resta, luz acesa na vez de quem joga. Dano sai de trás como etiqueta carimbada.',
  folders.map(([l, p], i) => frame(l, `<div data-folder="${i}">${C.folder(p)}</div>`, { w: 272, h: 172, x: 0, y: i % 2 ? 596 : 0 })));

// ── painel do turno
const T = (o) => C.turnPanel({ turn: 5, who: 'MOCA-COLA', phase: 'main', ...o });
const res = (inv, atk) => [{ icon: 'summon', label: 'Invocação', value: inv ? 'disponível' : 'já usada', on: inv }, { icon: 'atk', label: 'Ataques', value: atk ? `${atk} pronto${atk > 1 ? 's' : ''}` : 'nenhum', on: atk > 0 }];
const END = { act: 'end', label: 'Encerrar turno', keycap: 'Espaço' }, BAT = { act: 'battle', label: 'Ir para a batalha', keycap: 'B' };
const turns = [
  ['Jogando cartas', T({ mine: true, coach: 'Jogue uma carta de contorno verde.', res: res(1, 2), primary: BAT, secondary: END })],
  ['Nada a jogar, pode atacar', T({ mine: true, coach: 'Suas criaturas podem atacar.', res: res(0, 2), primary: { ...BAT, ready: true }, secondary: END })],
  ['Batalha', T({ mine: true, phase: 'battle', coach: 'Escolha uma criatura sua para atacar.', res: res(0, 1), primary: END })],
  ['Tudo feito', T({ mine: true, phase: 'battle', coach: 'Nada mais a fazer. Encerre o turno.', res: res(0, 0), primary: { ...END, ready: true } })],
  ['1º turno', T({ mine: true, turn: 1, coach: 'No 1º turno ninguém ataca.', res: [{ icon: 'summon', label: 'Invocação', value: 'disponível', on: true }, { icon: 'atk', label: 'Ataques', value: 'a partir do turno 2', on: false }], primary: END })],
  ['Vez do rival', T({ mine: false, coach: 'MOCA-COLA está jogando.', primary: { act: 'end', label: 'Aguarde a sua vez', disabled: true } })],
];
section('turn', 'Painel do turno', 'Um único botão principal (embaixo, grande) sempre mostra o próximo passo. Ele não muda de lugar entre os estados; na vez do rival vira um aviso desligado.',
  turns.map(([l, h]) => frame(l, h, { w: 296, h: 410, x: 1070, y: 104 })));

// ── ficha da carta
const sheets = [
  ['Na mão / jogável', { cardId: 'BCB-008', where: 'hand', owner: 'me', status: { tone: 'go', text: 'Clique ou arraste para a mesa.' } }],
  ['Na mão / bloqueada', { cardId: 'BCB-007', where: 'hand', owner: 'me', status: { tone: 'stop', text: 'Custa 2 sacrifícios: você precisa de 2 criaturas na mesa.' } }],
  ['Na mesa / alterada', { cardId: 'BCB-004', where: 'table', owner: 'me', cur: { atk: 2500, def: 1200 }, notes: ['Em ataque (em pé).', 'Café com 8 colheres de pó: ATQ +600, DEF −1.000'] }],
  ['Rival / efeito longo', { cardId: 'BCB-003', where: 'show', owner: 'opp' }],
  ['Armadilha do rival', { faceDown: true, notes: ['Carta virada para baixo do rival.', 'Pode disparar quando você atacar.'] }],
];
section('sheet', 'Ficha da carta', 'Abre ao passar o mouse em qualquer carta. A ilustração identifica; o texto explica em linguagem direta. O rodapé diz se dá para jogar agora — e, se não, por quê.',
  sheets.map(([l, p]) => frame(l, `<div class="lab-sheetbox">${C.cardSheet(p)}</div>`, { w: 328, h: 452, x: 0, y: 158 })));

// ── menu de ação
const menus = [
  ['Invocar', { title: 'LUCAS, O SOCIAL MEDIA', note: 'custo: grátis', options: [{ key: 'a', icon: 'atk', tone: 'atk', label: 'Invocar em ataque', sub: 'Pode atacar. Se perder, a diferença sai do seu CAIXA.', keycap: 'A' }, { key: 'd', icon: 'def', tone: 'def', label: 'Invocar em defesa', sub: 'Não ataca. Se for destruída, o CAIXA não sofre.', keycap: 'D' }] }],
  ['Criatura na mesa', { title: 'RALPH, O PAI', options: [{ key: 'g', icon: 'atk', tone: 'atk', label: 'Atacar', sub: 'Começa a batalha. Depois, nada de jogar cartas.', keycap: 'A' }, { key: 'm', icon: 'swap', label: 'Passar para defesa', sub: 'Protege o seu CAIXA. 1 vez por turno.', keycap: 'D' }] }],
  ['Armadilha / descarte', { title: 'ONDE TEM PILHA?', options: [{ key: 't', icon: 'trap', label: 'Armar armadilha', sub: 'Fica virada para baixo e dispara quando o rival atacar.', keycap: 'Enter' }, { key: 'x', icon: 'bin', tone: 'stop', label: 'Descartar', sub: 'Manda a carta para o Morto.' }] }],
];
section('menu', 'Menu de ação', 'Aparece sobre a carta clicada. Cada opção diz a consequência em uma linha e tem atalho de teclado.',
  menus.map(([l, p]) => frame(l, C.actionMenu(p), { w: 344, h: 270, x: 520, y: 330 })));

// ── instrução
section('prompt', 'Barra de instrução', 'Durante uma escolha, ocupa o topo: o que fazer, quanto falta, e como sair.', [
  frame('Atacar: escolher alvo', C.prompt({ icon: 'atk', text: 'Escolha quem atacar', action: { act: 'direct', label: 'Atacar o CAIXA', tone: 'danger', icon: 'atk' } }), { w: 620, h: 64, x: 373, y: 0, align: 'center' }),
  frame('Efeito de entrada (opcional)', C.prompt({ icon: 'arrow', text: 'Efeito de entrada: escolha um alvo', action: { act: 'direct', label: 'Pular efeito' } }), { w: 620, h: 64, x: 373, y: 0, align: 'center' }),
  frame('Sacrifícios com contagem', C.prompt({ icon: 'summon', text: 'Sacrifique 2 criaturas suas', count: { n: 1, of: 2 } }), { w: 620, h: 64, x: 373, y: 0, align: 'center' }),
  frame('Arrastando', C.prompt({ icon: 'hand', text: 'Solte na mesa para jogar', cancel: false }), { w: 620, h: 64, x: 373, y: 0, align: 'center' }),
]);

// ── prévia
const pv = (o) => C.combatPreview({ atk: 2400, against: 1500, mode: 'ATK', dmgFoe: 0, dmgMe: 0, ...o });
section('preview', 'Prévia de combate', 'Segue o cursor ao mirar. O título responde “o que acontece?”; os números mostram por quê; as linhas de baixo, o efeito em cada CAIXA.', [
  ['Vitória', pv({ result: 'win', dmgFoe: 900 })], ['Derrota', pv({ result: 'lose', atk: 1300, against: 2400, dmgMe: 1100 })], ['Contra defesa', pv({ result: 'win', mode: 'DEF', against: 900 })],
  ['Não passa', pv({ result: 'bounce', mode: 'DEF', atk: 1300, against: 2900, dmgMe: 1600 })], ['Troca', pv({ result: 'trade', atk: 2000, against: 2000 })], ['Direto + armadilha', pv({ result: 'direct', mode: null, against: 0, dmgFoe: 2400, trap: true })],
].map(([l, h]) => frame(l, h, { w: 268, h: 210, x: 560, y: 300 })));

// ── etiquetas
const chipF = (l, h, o = {}) => frame(l, h, { w: 220, h: 60, x: 420, y: 440, align: 'center', ...o });
section('chip', 'Etiquetas da mesa', 'Ficam sob cada carta da mesa. O segmento claro é a posição atual (ataque ou defesa); verde/vermelho com seta = alterado por efeitos.', [
  chipF('Em ataque', C.chip({ kind: 'creature', atk: 1985, def: 1500, mode: 'ATK' })),
  chipF('Em defesa', C.chip({ kind: 'creature', atk: 850, def: 2900, mode: 'DEF' })),
  chipF('Alterada', C.chip({ kind: 'creature', atk: 2585, def: 500, mode: 'ATK', atkTone: 'up', defTone: 'down' })),
  chipF('Travada + 2 ataques', C.chip({ kind: 'creature', atk: 2200, def: 2200, mode: 'ATK', locked: true, multi: true }), { w: 280 }),
  chipF('Armadilha / duração', `<div style="display:flex;gap:8px">${C.chip({ kind: 'trap', mine: true })}${C.chip({ kind: 'trap' })}${C.chip({ kind: 'duration', turns: 3 })}</div>`, { w: 380, y: 520 }),
  chipF('Pilhas', `<div style="display:flex;gap:8px">${C.chip({ kind: 'pile', icon: 'deck', label: 'deck', n: 33 })}${C.chip({ kind: 'pile', icon: 'dead', label: 'morto', n: 4 })}</div>`, { w: 260, x: 1000, y: 560 }),
]);

// ── avisos
section('notice', 'Avisos', 'Faixa de turno (centro), erro (abaixo do topo), última jogada (topo) e dica de primeira vez.', [
  frame('Faixa / sua vez', C.banner({ title: 'Sua vez', sub: 'turno 5', tone: 'me' }), { w: 520, h: 130, x: 423, y: 230, align: 'center' }),
  frame('Faixa / rival', C.banner({ title: 'Vez de MOCA-COLA', sub: 'turno 6', tone: 'foe' }), { w: 640, h: 130, x: 363, y: 230, bg: RIVAL, align: 'center' }),
  frame('Faixa / batalha', C.banner({ title: 'Batalha', sub: 'escolha quem ataca', tone: 'battle' }), { w: 520, h: 130, x: 423, y: 230, align: 'center' }),
  frame('Erro', C.toast({ text: 'É 1 invocação por turno — e você já fez a sua.' }), { w: 560, h: 70, x: 403, y: 60, align: 'center' }),
  frame('Última jogada / rival', C.ticker({ text: 'MOCA-COLA invocou ROGER em ataque.', who: 'opp' }), { w: 560, h: 60, x: 403, y: 0, bg: RIVAL, align: 'center' }),
  frame('Última jogada / você', C.ticker({ text: 'Você armou uma armadilha.', who: 'me' }), { w: 560, h: 60, x: 403, y: 0, align: 'center' }),
  frame('Dica', C.coach({ step: 1, of: 6, title: 'Objetivo', html: 'Zere o <b>CAIXA</b> do rival (pasta de cima) antes que ele zere o seu (pasta de baixo).' }), { w: 420, h: 210, x: 473, y: 84, align: 'center' }),
]);

// ── barra superior e relatório
const logDemo = [
  { type: 'turnStart', text: '── Turno 4 / vez de MOCA-COLA ──' }, { text: 'MOCA-COLA comprou uma carta.', who: 'opp' }, { text: 'MOCA-COLA invocou ROGER em ataque.', who: 'opp' },
  { type: 'turnStart', text: '── Turno 5 / sua vez ──' }, { text: 'Você comprou SIAMESAS BOREAL.', who: 'me' }, { text: 'NATH, A REDATORA atacou ROGER.', who: 'me' },
  { text: '$2.200 contra $1.300.', who: 'sys' }, { text: 'MOCA-COLA perdeu $900 (CAIXA $7.100).', who: 'opp', type: 'damage' },
];
section('chrome', 'Barra superior e relatório', 'Ações de sistema ficam juntas no canto. O relatório abre como gaveta, sem cobrir a mesa.', [
  frame('Barra superior', C.topbar({ logOn: false, muted: false }), { w: 380, h: 64, x: 986, y: 0, align: 'center' }),
  frame('Relatório aberto', C.logPanel(logDemo), { w: 360, h: 340, x: 760, y: 60 }),
]);

// ── composição completa
const comp = `<div class="lab-comp" style="background-image:url(${BOARD})"><div class="h-hud">
  <div class="h-slot--opp" data-folder="c0">${C.folder({ who: 'opp' })}</div>
  <div class="h-slot--me" data-folder="c1">${C.folder({ who: 'me' })}</div>
  <div class="h-slot--sheet">${C.cardSheet({ cardId: 'BCB-011', where: 'hand', owner: 'me', status: { tone: 'go', text: 'Clique ou arraste para a mesa.' } })}</div>
  <div class="h-slot--bar">${C.topbar({})}</div>
  <div class="h-slot--turn">${turns[0][1]}</div>
  <div class="h-slot--center">${C.ticker({ text: 'MOCA-COLA invocou ROGER em ataque.', who: 'opp' })}</div>
</div></div>`;
const comp2 = `<div class="lab-comp" style="background-image:url(${BOARD})"><div class="h-hud">
  <div class="h-slot--opp" data-folder="c2">${C.folder({ who: 'opp' })}</div>
  <div class="h-slot--me" data-folder="c3">${C.folder({ who: 'me' })}</div>
  <div class="h-slot--sheet">${C.cardSheet({ cardId: 'BCB-009', where: 'table', owner: 'opp', cur: { atk: 1300, def: 1100 }, notes: ['Em defesa (deitada).'] })}</div>
  <div class="h-slot--bar">${C.topbar({})}</div>
  <div class="h-slot--turn">${T({ mine: true, phase: 'battle', coach: 'Conclua a escolha indicada no topo — ou cancele com Esc.', res: [{ icon: 'summon', label: 'Invocação', value: 'só antes da batalha', on: false }, { icon: 'atk', label: 'Ataques', value: '1 pronto', on: true }], primary: END })}</div>
  <div class="h-slot--center">${C.prompt({ icon: 'atk', text: 'Escolha quem atacar', action: { act: 'direct', label: 'Atacar o CAIXA', tone: 'danger', icon: 'atk' } })}</div>
  <div class="h-follow" style="transform:translate(560px,250px)">${pv({ result: 'win', mode: 'DEF', atk: 1985, against: 1100 })}</div>
</div></div>`;
const comp3 = `<div class="lab-comp" style="background-image:url(${RIVAL})"><div class="h-hud">
  <div class="h-slot--opp" data-folder="c4">${C.folder({ who: 'opp' })}</div>
  <div class="h-slot--me" data-folder="c5">${C.folder({ who: 'me' })}</div>
  <div class="h-slot--sheet">${C.cardSheet({ cardId: 'BCB-014', where: 'show', owner: 'opp', notes: ['MOCA-COLA usou este efeito.'] })}</div>
  <div class="h-slot--bar">${C.topbar({})}</div>
  <div class="h-slot--turn">${turns[5][1]}</div>
  <div class="h-slot--center">${C.ticker({ text: 'MOCA-COLA usou PÃO COM REQUEIJÃO.', who: 'opp' })}</div>
  <div class="h-slot--coach is-top">${C.coach({ step: 2, of: 7, title: 'Vez do rival', html: 'A carta que ele joga aparece ampliada à esquerda; cada jogada passa no topo. O histórico completo fica em <b>Relatório</b>.' })}</div>
</div></div>`;
sections.unshift(`<section class="lab-sec" id="comp"><header><h2>Composição / 1366×768</h2><p>Os componentes juntos na tela de notebook de referência, sobre quadros reais da partida: jogando cartas, mirando um ataque, e a vez do rival.</p></header>${comp}<div style="height:20px"></div>${comp2}<div style="height:20px"></div>${comp3}</section>`);

app.innerHTML = `<nav class="lab-nav">${['comp', 'base', 'folder', 'turn', 'sheet', 'menu', 'prompt', 'preview', 'chip', 'notice', 'chrome'].map((id) => `<a href="#${id}">${id}</a>`).join('')}</nav>${sections.join('')}`;
// pastas são vivas no jogo: montam vazias e recebem "patch"
document.fonts.ready.then(() => document.querySelectorAll('.lab-sheetbox .h-sheet, .h-slot--sheet .h-sheet').forEach((s) => C.fitSheet(s)));
folders.forEach(([, p], i) => C.patchFolder(document.querySelector(`[data-folder="${i}"] .h-folder`), p, { animate: false }));
C.patchFolder(document.querySelector('[data-folder="c0"] .h-folder'), folders[0][1], { animate: false });
C.patchFolder(document.querySelector('[data-folder="c1"] .h-folder'), folders[1][1], { animate: false });
C.patchFolder(document.querySelector('[data-folder="c2"] .h-folder'), { ...folders[0][1], caixa: 7100 }, { animate: false });
C.patchFolder(document.querySelector('[data-folder="c3"] .h-folder'), { ...folders[1][1], caixa: 5400 }, { animate: false });
C.patchFolder(document.querySelector('[data-folder="c4"] .h-folder'), { ...folders[0][1], active: true, caixa: 7100 }, { animate: false });
C.patchFolder(document.querySelector('[data-folder="c5"] .h-folder'), { ...folders[1][1], active: false, caixa: 1650 }, { animate: false });
window.__stamp = (i = 1) => C.stamp(document.querySelector(`[data-folder="${i}"] .h-folder`), 950, false);
// inspeção: ?sec=turn&z=2 mostra uma seção ampliada (para revisar detalhes)
const q = new URLSearchParams(location.search);
if (q.get('sec')) { document.body.style.zoom = q.get('z') ?? 2; document.getElementById(q.get('sec'))?.scrollIntoView(); document.querySelector('.lab-nav').style.display = 'none'; }
