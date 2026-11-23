// Converte models_src/ em .glb enxutos (texturas 512px em WebP, malha simplificada) dentro de assets/models/.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'models_src'), out = path.join(root, 'assets', 'models');
fs.mkdirSync(out, { recursive: true });
const cli = path.join(root, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
const SIZE = { Television_01: 1024 }; // a cabeça do rival fica em close: textura maior
for (const name of fs.readdirSync(src)) {
  const p = path.join(src, name), isDir = fs.statSync(p).isDirectory();
  const input = isDir ? path.join(p, `${name}.gltf`) : p, id = isDir ? name : path.basename(name, '.glb');
  const output = path.join(out, `${id}.glb`);
  const args = [cli, 'optimize', input, output, '--compress', 'false', '--texture-compress', 'webp', '--texture-size', String(SIZE[id] ?? 512), '--simplify-error', '0.002'];
  try { execFileSync(process.execPath, args, { stdio: 'pipe' }); console.log(id, (fs.statSync(output).size / 1024).toFixed(0) + 'KB'); }
  catch (e) { console.error('FALHOU', id, String(e.stderr ?? e.message).slice(0, 400)); }
}
