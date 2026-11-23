// Servidor estático mínimo para desenvolvimento: http://localhost:5178/dist/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.glb': 'model/gltf-binary' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') { res.writeHead(302, { Location: '/dist/' }); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  const fin = { '/final-buckshot': 'BusinessCardBattleCorp_BUCKSHOT.html', '/final-severance': 'BusinessCardBattleCorp_SEVERANCE.html' }[p];
  const file = fin ? path.join(root, '..', fin) : path.join(root, p);
  if ((!fin && !file.startsWith(root)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); // /final serve o HTML único já empacotado
  fs.createReadStream(file).pipe(res);
}).listen(5178, () => console.log('http://localhost:5178/dist/'));
