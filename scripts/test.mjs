import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 8799;
const api = spawn(process.execPath, ['services/api/server.mjs'], {
  cwd: root,
  env: { ...process.env, API_PORT: String(port), API_HOST: '127.0.0.1', OPS_TOKEN: '12345' },
  stdio: ['ignore', 'pipe', 'pipe']
});

function killApi() {
  api.kill('SIGTERM');
}

async function waitForHealth() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await sleep(100);
  }
  throw new Error('API did not become healthy.');
}

async function reset() {
  await fetch(`http://127.0.0.1:${port}/api/ops/reset-demo`, {
    method: 'POST',
    headers: { 'x-ops-token': '12345' }
  });
}

try {
  await waitForHealth();
  await reset();

  const storefront = await (await fetch(`http://127.0.0.1:${port}/api/storefront`)).json();
  const vehicleId = storefront.nearestVehicleId;
  const productId = 'tamal-red-chile';
  const before = storefront.inventory.find(i => i.vehicleId === vehicleId && i.productId === productId).quantity;

  const payload = {
    vehicleId,
    customerName: 'Test Eater',
    customerPhone: '7025550199',
    fulfillment: 'PICKUP',
    items: [{ productId, quantity: 1 }]
  };

  const results = await Promise.all(
    Array.from({ length: before + 5 }, (_, index) =>
      fetch(`http://127.0.0.1:${port}/api/orders`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': `test-${index}-${Date.now()}`
        },
        body: JSON.stringify(payload)
      }).then(async res => ({ status: res.status, body: await res.json() }))
    )
  );

  const accepted = results.filter(result => result.status === 201);
  const rejected = results.filter(result => result.status === 422);
  if (accepted.length !== before) {
    throw new Error(`Expected ${before} accepted sales, got ${accepted.length}`);
  }
  if (rejected.length < 5) {
    throw new Error('Expected oversell attempts to fail validation.');
  }

  const afterBoard = await (await fetch(`http://127.0.0.1:${port}/api/storefront`)).json();
  const left = afterBoard.inventory.find(i => i.vehicleId === vehicleId && i.productId === productId).quantity;
  if (left !== 0) throw new Error(`Expected zero stock after concurrent sell-out, got ${left}`);

  const orderId = accepted[0].body.order.id;
  const cancel = await fetch(`http://127.0.0.1:${port}/api/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone: '7025550199' })
  });
  if (!cancel.ok) throw new Error('Cancel/restock failed.');
  const restored = await (await fetch(`http://127.0.0.1:${port}/api/storefront`)).json();
  const restoredQty = restored.inventory.find(i => i.vehicleId === vehicleId && i.productId === productId).quantity;
  if (restoredQty !== 1) throw new Error(`Expected restock to 1 after cancel, got ${restoredQty}`);

  const openDump = await fetch(`http://127.0.0.1:${port}/api/orders`);
  if (openDump.status !== 400) throw new Error('Order list must require phone.');

  const opsDenied = await fetch(`http://127.0.0.1:${port}/api/ops/board`);
  if (opsDenied.status !== 401) throw new Error('Ops board must require token.');

  if (restored.vehicles.some(v => Object.hasOwn(v, 'latitude'))) {
    throw new Error('Public storefront must not expose exact latitude.');
  }

  const concept = await fetch(`http://127.0.0.1:${port}/api/concepts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      idea: 'Birria ramen mashup tamal with consomme drizzle',
      name: 'Lab Tester',
      contact: 'lab@example.com'
    })
  });
  if (concept.status !== 201) throw new Error('Concept submit failed.');

  await reset();
  console.log('PASS inventory concurrency, cancel restock, and concept submit.');
  killApi();
  process.exit(0);
} catch (error) {
  console.error('FAIL', error.message);
  killApi();
  process.exit(1);
}
