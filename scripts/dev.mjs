import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['services/api/server.mjs'], { stdio: 'inherit' }),
  spawn(process.execPath, ['apps/web/server.mjs'], { stdio: 'inherit' })
];

function shutdown(signal) {
  for (const child of children) child.kill(signal);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const exitCodes = await Promise.all(children.map(child => new Promise(resolve => child.on('exit', resolve))));
process.exit(exitCodes.find(code => code && code !== 0) ?? 0);
