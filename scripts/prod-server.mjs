import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleRequest } from '../services/api/server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '../apps/web');
const port = Number(process.env.PORT || process.env.WEB_PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let requested = decodeURIComponent(url.pathname);
  if (requested === '/') requested = '/index.html';
  let filePath = path.resolve(webRoot, `.${requested}`);
  if (!filePath.startsWith(webRoot)) {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Bad path');
    return;
  }
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    filePath = path.join(webRoot, 'index.html');
  }
  const body = await readFile(filePath);
  const ext = path.extname(filePath);
  res.writeHead(200, {
    'content-type': mime[ext] || 'application/octet-stream',
    'cache-control': filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=3600'
  });
  res.end(body);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health' || url.pathname.startsWith('/api/')) {
    return handleRequest(req, res);
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type, idempotency-key, x-ops-token',
      'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS'
    });
    res.end();
    return;
  }
  try {
    await serveStatic(req, res);
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Server error');
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Crave It live at http://0.0.0.0:${port}`);
});
