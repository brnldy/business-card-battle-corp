// Auditoria de texto da interface (Sprint 2 do design system).
// Uso: cd remake && node build.mjs --dev && node serve.mjs; depois, noutro terminal: node scripts/design-system/audit-texto.cjs > auditoria.json
// Mede o texto HTML visível de cada tela (caracteres, palavras, tamanhos e famílias de fonte).
const { chromium } = require('playwright');
const measure = () => {
  const out = { chars: 0, words: 0, nodes: 0, sizes: {}, fams: {}, small: [] };
  const w = document.createTreeWalker(document.getElementById('ui') || document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.replace(/\s+/g, ' ').trim(); if (!t) continue;
    const el = n.parentElement; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    let p = el, hidden = false; while (p) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) { hidden = true; break; } p = p.parentElement; } if (hidden) continue;
    const fs = Math.round(parseFloat(cs.fontSize) * 2) / 2; const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    out.chars += t.length; out.words += t.split(' ').length; out.nodes++;
    out.sizes[fs] = (out.sizes[fs] || 0) + t.length; out.fams[fam] = (out.fams[fam] || 0) + t.length;
    if (fs < 14 && out.small.length < 6) out.small.push(fs + 'px: ' + t.slice(0, 40));
  }
  return out;
};
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const res = {};
  const click = async (re) => { for (const x of await p.$$('button')) { if (await x.isVisible() && re.test(await x.innerText())) { await x.click(); return true; } } return false; };
  const grab = async (k) => { res[k] = await p.evaluate(measure); console.error(k, res[k].chars); };
  await p.goto('http://localhost:5178/dist/'); await p.waitForTimeout(9000); await grab('menu');
  await click(/COMO JOGAR/i); await p.waitForTimeout(1200); await grab('manual'); await click(/ENTENDIDO/i); await p.waitForTimeout(600);
  await click(/INICIAR/i); await p.waitForTimeout(2500); await grab('contrato');
  const inp = await p.$('#name-in'); if (inp) { await inp.fill('ORO S.A.'); await p.keyboard.press('Enter'); }
  await p.waitForTimeout(9000); await grab('lobby');
  const areas = ['duelo', 'decks', 'loja', 'metas', 'conquistas', 'perfil', 'treino', 'reciclar', 'config'];
  for (let i = 0; i < 9; i++) { await p.keyboard.press(String(i + 1)); await p.waitForTimeout(2200); await grab('lobby_' + areas[i]); await p.keyboard.press('Escape'); await p.waitForTimeout(900); }
  await p.goto('http://localhost:5178/dist/?duel'); await p.waitForTimeout(25000); await grab('duelo'); 
  const card = await p.$('.hand .card, [class*="hand"] [class*="card"]'); if (card) { await card.hover(); await p.waitForTimeout(1500); await grab('duelo_carta_hover'); }
  console.log(JSON.stringify(res));
  await b.close();
})();
