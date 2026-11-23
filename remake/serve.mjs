// Servidor estático mínimo para desenvolvimento.
//   http://localhost:5178/dist/            jogo
//   http://localhost:5178/dist/lab.html    laboratório do design system do HUD
//   POST /__lab/<nome>.jpg                 salva um fundo de referência em lab/ (só em localhost, só .jpg)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.glb': 'model/gltf-binary' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST' && /^\/__lab\/[a-z0-9-]+\.jpg$/.test(p)) {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const b64 = Buffer.concat(chunks).toString().replace(/^data:image\/jpeg;base64,/, '');
      fs.mkdirSync(path.join(root, 'lab'), { recursive: true });
      fs.writeFileSync(path.join(root, 'lab', path.basename(p)), Buffer.from(b64, 'base64'));
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  if (p === '/') { res.writeHead(302, { Location: '/dist/' }); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  const fin = { '/final-buckshot': 'BusinessCardBattleCorp_BUCKSHOT.html' }[p];
  const file = fin ? path.join(root, '..', fin) : path.join(root, p);
  if ((!fin && !file.startsWith(root)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(5178, '127.0.0.1', () => console.log('http://localhost:5178/dist/'));
