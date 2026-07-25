import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.WEB_PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let requested = decodeURIComponent(url.pathname);
    if (requested === '/') requested = '/index.html';
    let filePath = path.resolve(root, `.${requested}`);
    if (!filePath.startsWith(root)) throw new Error('Invalid path');
    try {
      const info = await stat(filePath);
      if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
    } catch {
      filePath = path.join(root, 'index.html');
    }
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': mime[path.extname(filePath)] || 'application/octet-stream',
      'cache-control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(body);
  } catch (error) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Website running at http://localhost:${port}`);
});
