import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'apps/web/index.html',
  'apps/web/app.js',
  'apps/web/styles.css',
  'apps/web/ops.html',
  'apps/web/manifest.webmanifest',
  'services/api/server.mjs',
  'data/seed.json',
  'docs/PRODUCT_BRIEF.md',
  'docs/V1_GAP_ANALYSIS.md',
  'CURSOR_START_HERE.md'
];

for (const file of required) {
  await readFile(path.join(root, file));
}

const seed = JSON.parse(await readFile(path.join(root, 'data/seed.json'), 'utf8'));
if (!seed.vehicles?.length || !seed.products?.length || !seed.inventory?.length) {
  throw new Error('Seed data is incomplete.');
}

console.log('Structure check passed.');
console.log('Run `npm run test` for inventory concurrency + order flow.');
