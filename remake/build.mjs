// Build: empacota src/ com esbuild.
//   node build.mjs --dev   → dist/index.html + dist/bundle.js (assets por URL; rode `node serve.mjs` e abra /dist/?theme=buckshot ou ?theme=severance)
//   node build.mjs         → ../BusinessCardBattleCorp_BUCKSHOT.html e ../BusinessCardBattleCorp_SEVERANCE.html
//                            (arquivos únicos: abrem com dois cliques, offline)
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes('--dev');
const MIME = { '.png': 'image/png', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.glb': 'model/gltf-binary' };
const dataUri = (f) => `data:${MIME[path.extname(f)]};base64,${fs.readFileSync(f).toString('base64')}`;
// modelos usados por tema (manter igual a MODEL_LIST em src/assets.js)
const MODELS = {
  buckshot: ['business_man', 'Television_01', 'hanging_industrial_lamp', 'mounted_fluorescent_lights', 'drawer_cabinet', 'wall_clock', 'vintage_stapler', 'binder_notebook'],
  severance: ['business_man', 'television_02', 'wall_clock', 'potted_plant_02', 'binder_notebook'],
};

const result = await build({ entryPoints: [path.join(root, 'src/main.js')], bundle: true, format: 'iife', minify: !dev, write: false, target: 'es2022', legalComments: 'none' });
const js = result.outputFiles[0].text;
const css = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/hud/hud.css'), 'utf8');

const fonts = [
  ['Apple Garamond', 400, 'normal', 'AppleGaramond-400-normal.ttf'], ['Apple Garamond', 700, 'normal', 'AppleGaramond-700-normal.ttf'],
  ['Apple Garamond', 400, 'italic', 'AppleGaramond-400-italic.ttf'], ['Apple Garamond', 700, 'italic', 'AppleGaramond-700-italic.ttf'],
  ['Helvena', 400, 'normal', 'Helvena-400-normal.ttf'],
];
const fontCss = fonts.map(([fam, w, st, file]) => {
  const src = dev ? `../assets/fonts/${file}` : dataUri(path.join(root, 'assets/fonts', file));
  return `@font-face{font-family:'${fam}';src:url('${src}') format('truetype');font-weight:${w};font-style:${st};font-display:block}`;
}).join('\n');

const html = (head, script) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<link rel="icon" href="data:,">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Business Card Battle Corp.</title>
<style>
${fontCss}
${css}
</style>
</head>
<body>
<canvas id="gl"></canvas>
<div id="ui"></div>
${head}
${script}
</body>
</html>
`;
if (dev) {
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist/bundle.js'), js);
  fs.writeFileSync(path.join(root, 'dist/index.html'), html('<script>window.__ASSET_BASE__="../"</script>', '<script src="bundle.js"></script>'));
  // laboratório do design system do HUD (só no build de desenvolvimento)
  const lab = await build({ entryPoints: [path.join(root, 'src/lab.js')], bundle: true, format: 'iife', write: false, target: 'es2022' });
  fs.writeFileSync(path.join(root, 'dist/lab.js'), lab.outputFiles[0].text);
  fs.writeFileSync(path.join(root, 'dist/lab.html'), `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>HUD · design system</title><style>${fontCss}
${fs.readFileSync(path.join(root, 'src/hud/hud.css'), 'utf8')}
${fs.readFileSync(path.join(root, 'src/lab.css'), 'utf8')}</style></head><body class="theme-severance"><div id="app"></div><script>window.__ASSET_BASE__="../"</script><script src="lab.js"></script></body></html>`);
  console.log('dev build ok', (js.length / 1024).toFixed(0) + 'KB', '+ lab');
} else {
  const shared = {};
  for (const dir of ['cards', 'img', 'music']) for (const f of fs.readdirSync(path.join(root, 'assets', dir))) shared[`${dir}/${f}`] = dataUri(path.join(root, 'assets', dir, f));
  const inline = `<script>${js.replace(/<\/script/g, '<\\/script')}</script>`;
  for (const theme of ['buckshot', 'severance']) {
    const map = { ...shared };
    for (const m of MODELS[theme]) map[`models/${m}.glb`] = dataUri(path.join(root, 'assets/models', `${m}.glb`));
    const out = path.join(root, '..', `BusinessCardBattleCorp_${theme.toUpperCase()}.html`);
    fs.writeFileSync(out, html(`<script>window.__THEME__=${JSON.stringify(theme)};window.__ASSETS__=${JSON.stringify(map)}</script>`, inline));
    console.log('ok →', path.basename(out), (fs.statSync(out).size / 1048576).toFixed(1) + 'MB');
  }
}
