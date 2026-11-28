// Baixa os modelos 3D de terceiros (todos CC0 / domínio público) para remake/models_src/.
//   Poly Haven  — https://polyhaven.com  (CC0)
//   Quaternius  — via https://poly.pizza (CC0)
// Depois rode: node tools/pack-models.mjs  (gera os .glb otimizados em assets/models/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'models_src');
const UA = { 'User-Agent': 'asset-fetch-script' };
const POLYHAVEN = ['Television_01', 'hanging_industrial_lamp', 'modern_arm_chair_01', 'vintage_stapler', 'wall_clock',
  'mounted_fluorescent_lights', 'drawer_cabinet', 'binder_notebook', 'metal_office_desk'];
const DIRECT = { 'business_man.glb': 'https://static.poly.pizza/e599abbe-7d73-488c-9d7e-3ead281e705c.glb' };

async function save(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return 0;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return buf.length;
}
let total = 0;
for (const id of POLYHAVEN) {
  const info = await (await fetch(`https://api.polyhaven.com/files/${id}`, { headers: UA })).json();
  const g = info.gltf['1k'].gltf, dir = path.join(root, id);
  let n = await save(g.url, path.join(dir, `${id}.gltf`));
  for (const [rel, inc] of Object.entries(g.include ?? {})) n += await save(inc.url, path.join(dir, rel));
  total += n; console.log(id, (n / 1048576).toFixed(1) + 'MB');
}
for (const [name, url] of Object.entries(DIRECT)) { const n = await save(url, path.join(root, name)); total += n; console.log(name, (n / 1048576).toFixed(1) + 'MB'); }
console.log('total baixado', (total / 1048576).toFixed(1) + 'MB');
