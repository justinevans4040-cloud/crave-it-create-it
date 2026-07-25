import http from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const statePath = path.resolve(here, '../../data/runtime.json');
const seedPath = path.resolve(here, '../../data/seed.json');
const port = Number(process.env.API_PORT || 8788);
const host = process.env.API_HOST || '127.0.0.1';
const OPS_TOKEN = process.env.OPS_TOKEN || 'crave-local-ops';
const ALLOWED_ORIGINS = new Set(
  String(process.env.CORS_ORIGINS || 'http://localhost:4173,http://127.0.0.1:4173')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
);
let mutationQueue = Promise.resolve();
const rateBuckets = new Map();

const ORDER_FLOW = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'EN_ROUTE', 'COMPLETED'];

async function loadState() {
  try {
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    return normalizeState(state);
  } catch {
    return normalizeState(JSON.parse(await readFile(seedPath, 'utf8')));
  }
}

function normalizeState(state) {
  return {
    brand: state.brand,
    vehicles: state.vehicles || [],
    products: state.products || [],
    inventory: state.inventory || [],
    orders: state.orders || [],
    concepts: state.concepts || [],
    movements: state.movements || [],
    settings: state.settings || {
      taxRateBps: 825,
      serviceFeeCents: 75,
      quotes: state.brand?.quotes || []
    }
  };
}

async function persist(state) {
  const temp = `${statePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(state, null, 2));
  await rename(temp, statePath);
}

function corsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return null;
  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function send(res, status, body, req = null) {
  const payload = JSON.stringify(body);
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'access-control-allow-headers': 'content-type, idempotency-key, x-ops-token',
    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS'
  };
  const origin = req ? corsOrigin(req) : null;
  if (origin) headers['access-control-allow-origin'] = origin;
  res.writeHead(status, headers);
  res.end(payload);
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function phoneMatches(stored, provided) {
  const a = digits(stored);
  const b = digits(provided);
  if (b.length < 7 || a.length < 7) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
}

function redactOrder(order, state, { includePii = false } = {}) {
  const base = publicOrder(order, state);
  if (includePii) return base;
  return {
    id: base.id,
    vehicleId: base.vehicleId,
    vehicleName: base.vehicleName,
    vehicleZone: base.vehicleZone,
    fulfillment: base.fulfillment,
    status: base.status,
    items: base.items,
    subtotalCents: base.subtotalCents,
    taxCents: base.taxCents,
    serviceFeeCents: base.serviceFeeCents,
    totalCents: base.totalCents,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
    customerName: base.customerName ? `${String(base.customerName).slice(0, 1)}.` : undefined,
    customerPhone: digits(base.customerPhone).slice(-4) ? `***${digits(base.customerPhone).slice(-4)}` : undefined
  };
}

function fuzzCoord(value) {
  return Math.round(Number(value) * 100) / 100;
}

function isLocalSocket(req) {
  const ip = req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function requireOps(req, res) {
  const token = req.headers['x-ops-token'];
  if (token && token === OPS_TOKEN) return true;
  send(res, 401, { error: 'OPS_UNAUTHORIZED', message: 'Provide x-ops-token for operator routes.' }, req);
  return false;
}

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const current = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > current.resetAt) {
    current.count = 0;
    current.resetAt = now + windowMs;
  }
  current.count += 1;
  rateBuckets.set(key, current);
  return current.count <= limit;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error('Request body is too large.'));
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error('Invalid JSON request body.')); }
    });
    req.on('error', reject);
  });
}

function haversineMiles(aLat, aLng, bLat, bLng) {
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

function publicVehicle(vehicle, inventory, products, origin, { exact = false } = {}) {
  const stock = inventory
    .filter(item => item.vehicleId === vehicle.id)
    .map(item => ({
      ...item,
      productName: products.find(product => product.id === item.productId)?.name || item.productId
    }));
  const totalLeft = stock.reduce((sum, item) => sum + item.quantity, 0);
  const distanceMiles = origin
    ? Number(haversineMiles(origin.lat, origin.lng, vehicle.latitude, vehicle.longitude).toFixed(1))
    : null;
  const publicFields = {
    id: vehicle.id,
    name: vehicle.name,
    status: vehicle.status,
    zone: vehicle.zone,
    locationLabel: vehicle.locationLabel,
    lastUpdated: vehicle.lastUpdated,
    etaMinutes: vehicle.etaMinutes,
    deliveryRadiusMiles: vehicle.deliveryRadiusMiles,
    totalLeft,
    stock,
    distanceMiles,
    mapLatitude: fuzzCoord(vehicle.latitude),
    mapLongitude: fuzzCoord(vehicle.longitude),
    locationFreshnessMinutes: Math.max(
      0,
      Math.round((Date.now() - new Date(vehicle.lastUpdated).getTime()) / 60000)
    )
  };
  if (exact) {
    publicFields.latitude = vehicle.latitude;
    publicFields.longitude = vehicle.longitude;
  }
  return publicFields;
}

function publicState(state, origin) {
  const vehicles = state.vehicles
    .map(vehicle => publicVehicle(vehicle, state.inventory, state.products, origin))
    .sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
      if (a.distanceMiles != null && b.distanceMiles != null) return a.distanceMiles - b.distanceMiles;
      return a.etaMinutes - b.etaMinutes;
    });
  return {
    brand: state.brand,
    settings: state.settings,
    vehicles,
    products: state.products,
    inventory: state.inventory,
    nearestVehicleId: vehicles.find(vehicle => vehicle.status === 'ACTIVE')?.id || null,
    availableCount: state.inventory.reduce((sum, item) => sum + item.quantity, 0),
    activeCount: state.vehicles.filter(vehicle => vehicle.status === 'ACTIVE').length
  };
}

function publicOrder(order, state) {
  const vehicle = state.vehicles.find(item => item.id === order.vehicleId);
  return {
    ...order,
    vehicleName: vehicle?.name,
    vehicleZone: vehicle?.zone,
    items: order.items.map(item => ({
      ...item,
      name: state.products.find(product => product.id === item.productId)?.name || item.productId,
      lineTotalCents:
        (state.products.find(product => product.id === item.productId)?.priceCents || 0) * item.quantity
    }))
  };
}

function validateOrder(input, state) {
  const errors = [];
  const vehicle = state.vehicles.find(item => item.id === input.vehicleId);
  if (!vehicle || vehicle.status !== 'ACTIVE') errors.push('Select an active vehicle.');
  if (!String(input.customerName || '').trim()) errors.push('Customer name is required.');
  if (!/^[-+()\d\s]{7,}$/.test(String(input.customerPhone || ''))) errors.push('A valid phone number is required.');
  if (!['PICKUP', 'DROP_OFF'].includes(input.fulfillment)) errors.push('Choose pickup or drop-off.');
  if (input.fulfillment === 'DROP_OFF' && !String(input.deliveryAddress || '').trim()) {
    errors.push('Delivery address is required for nearby drop-off.');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) errors.push('Add at least one item.');

  const merged = new Map();
  for (const item of input.items || []) {
    const qty = Number(item.quantity);
    const product = state.products.find(product => product.id === item.productId);
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 24) {
      errors.push('Order contains an invalid item or quantity.');
      continue;
    }
    merged.set(item.productId, (merged.get(item.productId) || 0) + qty);
  }

  for (const [productId, qty] of merged) {
    const product = state.products.find(product => product.id === productId);
    const stock = state.inventory.find(
      stock => stock.vehicleId === input.vehicleId && stock.productId === productId
    );
    if (!stock || stock.quantity < qty) {
      errors.push(`${product.name} does not have enough stock on this vehicle.`);
    }
  }

  return { errors, merged };
}

function recordMovement(state, movement) {
  state.movements.unshift({
    id: `mov_${randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    ...movement
  });
}

function mutate(work) {
  const run = mutationQueue.then(work, work);
  mutationQueue = run.then(() => undefined, () => undefined);
  return run;
}

const server = http.createServer(async (req, res) => {
  await handleRequest(req, res);
});

export async function handleRequest(req, res) {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {}, req);
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const clientKey = req.socket.remoteAddress || 'unknown';

    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, {
        ok: true,
        service: 'crave-fleet-api',
        timestamp: new Date().toISOString(),
        bound: `${host}:${port}`
      }, req);
    }

    if (req.method === 'GET' && url.pathname === '/api/storefront') {
      const state = await loadState();
      const lat = Number(url.searchParams.get('lat'));
      const lng = Number(url.searchParams.get('lng'));
      const origin = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
      return send(res, 200, publicState(state, origin), req);
    }

    if (req.method === 'GET' && url.pathname === '/api/orders') {
      const phone = url.searchParams.get('phone');
      if (digits(phone).length < 7) {
        return send(res, 400, { error: 'PHONE_REQUIRED', message: 'Provide phone to look up your orders.' }, req);
      }
      const state = await loadState();
      const orders = state.orders
        .filter(order => phoneMatches(order.customerPhone, phone))
        .slice(0, 25)
        .map(order => redactOrder(order, state));
      return send(res, 200, { orders }, req);
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/orders/')) {
      const id = url.pathname.split('/').pop();
      const phone = url.searchParams.get('phone');
      if (digits(phone).length < 7) {
        return send(res, 400, { error: 'PHONE_REQUIRED', message: 'Order lookup requires the phone used at checkout.' }, req);
      }
      const state = await loadState();
      const order = state.orders.find(item => item.id === id);
      if (!order || !phoneMatches(order.customerPhone, phone)) {
        return send(res, 404, { error: 'ORDER_NOT_FOUND' }, req);
      }
      return send(res, 200, { order: redactOrder(order, state) }, req);
    }

    if (req.method === 'POST' && url.pathname === '/api/orders') {
      if (!rateLimit(`order:${clientKey}`, 30, 60_000)) {
        return send(res, 429, { error: 'RATE_LIMITED' }, req);
      }
      const input = await readJson(req);
      const idempotencyKey = req.headers['idempotency-key'];
      const result = await mutate(async () => {
        const latest = await loadState();
        if (idempotencyKey) {
          const existing = latest.orders.find(order => order.idempotencyKey === idempotencyKey);
          if (existing) {
            return {
              status: 200,
              body: {
                order: redactOrder(existing, latest),
                inventory: latest.inventory.filter(item => item.vehicleId === existing.vehicleId),
                replayed: true
              }
            };
          }
        }

        const { errors, merged } = validateOrder(input, latest);
        if (errors.length) return { status: 422, body: { error: 'ORDER_VALIDATION_FAILED', details: errors } };

        const items = [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
        const subtotalCents = items.reduce((sum, item) => {
          const product = latest.products.find(product => product.id === item.productId);
          return sum + product.priceCents * item.quantity;
        }, 0);
        const taxCents = Math.round((subtotalCents * latest.settings.taxRateBps) / 10000);
        const serviceFeeCents = latest.settings.serviceFeeCents;
        const totalCents = subtotalCents + taxCents + serviceFeeCents;

        for (const item of items) {
          const stock = latest.inventory.find(
            stock => stock.vehicleId === input.vehicleId && stock.productId === item.productId
          );
          stock.quantity -= item.quantity;
          recordMovement(latest, {
            type: 'SALE',
            vehicleId: input.vehicleId,
            productId: item.productId,
            quantity: -item.quantity,
            reason: 'customer_order'
          });
        }

        const order = {
          id: `ord_${randomUUID().slice(0, 8)}`,
          idempotencyKey: idempotencyKey || undefined,
          vehicleId: input.vehicleId,
          customerName: String(input.customerName).trim(),
          customerPhone: String(input.customerPhone).trim(),
          fulfillment: input.fulfillment,
          deliveryAddress: input.fulfillment === 'DROP_OFF' ? String(input.deliveryAddress).trim() : undefined,
          notes: String(input.notes || '').trim(),
          items,
          subtotalCents,
          taxCents,
          serviceFeeCents,
          totalCents,
          paymentState: 'DEMO_AUTHORIZED',
          status: 'ACCEPTED',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        latest.orders.unshift(order);
        await persist(latest);
        return {
          status: 201,
          body: {
            order: redactOrder(order, latest),
            inventory: latest.inventory.filter(item => item.vehicleId === input.vehicleId)
          }
        };
      });
      return send(res, result.status, result.body, req);
    }

    if (req.method === 'POST' && url.pathname.match(/^\/api\/orders\/[^/]+\/cancel$/)) {
      const id = url.pathname.split('/')[3];
      const input = await readJson(req).catch(() => ({}));
      const phone = input.phone || url.searchParams.get('phone');
      const opsOk = req.headers['x-ops-token'] === OPS_TOKEN;
      if (!opsOk && digits(phone).length < 7) {
        return send(res, 400, { error: 'PHONE_OR_OPS_REQUIRED' }, req);
      }
      const result = await mutate(async () => {
        const latest = await loadState();
        const order = latest.orders.find(item => item.id === id);
        if (!order) return { status: 404, body: { error: 'ORDER_NOT_FOUND' } };
        if (!opsOk && !phoneMatches(order.customerPhone, phone)) {
          return { status: 404, body: { error: 'ORDER_NOT_FOUND' } };
        }
        if (['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
          return { status: 409, body: { error: 'ORDER_NOT_CANCELLABLE', status: order.status } };
        }
        for (const item of order.items) {
          let stock = latest.inventory.find(
            row => row.vehicleId === order.vehicleId && row.productId === item.productId
          );
          if (!stock) {
            stock = { vehicleId: order.vehicleId, productId: item.productId, quantity: 0 };
            latest.inventory.push(stock);
          }
          stock.quantity += item.quantity;
          recordMovement(latest, {
            type: 'RETURN',
            vehicleId: order.vehicleId,
            productId: item.productId,
            quantity: item.quantity,
            reason: 'order_cancelled',
            orderId: order.id
          });
        }
        order.status = 'CANCELLED';
        order.updatedAt = new Date().toISOString();
        await persist(latest);
        return { status: 200, body: { order: redactOrder(order, latest, { includePii: opsOk }) } };
      });
      return send(res, result.status, result.body, req);
    }

    if (req.method === 'POST' && url.pathname === '/api/concepts') {
      if (!rateLimit(`concept:${clientKey}`, 10, 60_000)) {
        return send(res, 429, { error: 'RATE_LIMITED' }, req);
      }
      const input = await readJson(req);
      const idea = String(input.idea || '').trim();
      const name = String(input.name || '').trim();
      const contact = String(input.contact || '').trim();
      if (idea.length < 8 || !name || !contact) {
        return send(res, 422, { error: 'CONCEPT_VALIDATION_FAILED', details: ['Idea, name, and contact are required.'] }, req);
      }
      const result = await mutate(async () => {
        const latest = await loadState();
        const concept = {
          id: `idea_${randomUUID().slice(0, 8)}`,
          idea,
          name,
          contact,
          status: 'RECEIVED',
          createdAt: new Date().toISOString()
        };
        latest.concepts.unshift(concept);
        await persist(latest);
        return { status: 201, body: { concept: { id: concept.id, status: concept.status, createdAt: concept.createdAt } } };
      });
      return send(res, result.status, result.body, req);
    }

    if (url.pathname.startsWith('/api/ops/')) {
      if (!requireOps(req, res)) return;
      if (!isLocalSocket(req) && process.env.OPS_ALLOW_REMOTE !== '1') {
        return send(res, 403, { error: 'OPS_LOCAL_ONLY' }, req);
      }
    }

    if (req.method === 'GET' && url.pathname === '/api/ops/board') {
      const state = await loadState();
      return send(res, 200, {
        vehicles: state.vehicles.map(vehicle => publicVehicle(vehicle, state.inventory, state.products, null, { exact: true })),
        orders: state.orders.slice(0, 40).map(order => redactOrder(order, state, { includePii: true })),
        concepts: state.concepts.slice(0, 20),
        products: state.products,
        inventory: state.inventory,
        movements: state.movements.slice(0, 40),
        lowStock: state.inventory.filter(item => item.quantity > 0 && item.quantity <= 5)
      }, req);
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/ops/vehicles/')) {
      const id = url.pathname.split('/').pop();
      const input = await readJson(req);
      const result = await mutate(async () => {
        const latest = await loadState();
        const vehicle = latest.vehicles.find(item => item.id === id);
        if (!vehicle) return { status: 404, body: { error: 'VEHICLE_NOT_FOUND' } };
        if (input.status && ['ACTIVE', 'RESTOCKING', 'OFFLINE'].includes(input.status)) vehicle.status = input.status;
        if (typeof input.locationLabel === 'string') vehicle.locationLabel = input.locationLabel;
        if (Number.isFinite(Number(input.latitude)) && Number.isFinite(Number(input.longitude))) {
          vehicle.latitude = Number(input.latitude);
          vehicle.longitude = Number(input.longitude);
        }
        if (Number.isFinite(Number(input.etaMinutes))) vehicle.etaMinutes = Number(input.etaMinutes);
        vehicle.lastUpdated = new Date().toISOString();
        await persist(latest);
        return { status: 200, body: { vehicle: publicVehicle(vehicle, latest.inventory, latest.products, null, { exact: true }) } };
      });
      return send(res, result.status, result.body, req);
    }

    if (req.method === 'POST' && url.pathname === '/api/ops/inventory/adjust') {
      const input = await readJson(req);
      const quantity = Number(input.quantity);
      const type = String(input.type || 'CORRECTION');
      if (!['ASSIGN', 'TRANSFER', 'SPOILAGE', 'CORRECTION', 'SOLD_OUT'].includes(type)) {
        return send(res, 422, { error: 'INVALID_MOVEMENT_TYPE' }, req);
      }
      const result = await mutate(async () => {
        const latest = await loadState();
        let stock = latest.inventory.find(item => item.vehicleId === input.vehicleId && item.productId === input.productId);
        if (!stock) {
          stock = { vehicleId: input.vehicleId, productId: input.productId, quantity: 0 };
          latest.inventory.push(stock);
        }
        if (type === 'SOLD_OUT') {
          recordMovement(latest, { type: 'SPOILAGE', vehicleId: input.vehicleId, productId: input.productId, quantity: -stock.quantity, reason: 'marked_sold_out' });
          stock.quantity = 0;
        } else if (type === 'TRANSFER') {
          if (!Number.isInteger(quantity) || quantity < 1) return { status: 422, body: { error: 'INVALID_QUANTITY' } };
          if (stock.quantity < quantity) return { status: 422, body: { error: 'INSUFFICIENT_STOCK' } };
          stock.quantity -= quantity;
          let dest = latest.inventory.find(item => item.vehicleId === input.toVehicleId && item.productId === input.productId);
          if (!dest) {
            dest = { vehicleId: input.toVehicleId, productId: input.productId, quantity: 0 };
            latest.inventory.push(dest);
          }
          dest.quantity += quantity;
          recordMovement(latest, { type: 'TRANSFER', vehicleId: input.vehicleId, toVehicleId: input.toVehicleId, productId: input.productId, quantity: -quantity, reason: input.reason || 'transfer' });
        } else {
          if (!Number.isInteger(quantity)) return { status: 422, body: { error: 'INVALID_QUANTITY' } };
          const next = stock.quantity + quantity;
          if (next < 0) return { status: 422, body: { error: 'INSUFFICIENT_STOCK' } };
          stock.quantity = next;
          recordMovement(latest, { type, vehicleId: input.vehicleId, productId: input.productId, quantity, reason: input.reason || type.toLowerCase() });
        }
        await persist(latest);
        return { status: 200, body: { inventory: latest.inventory } };
      });
      return send(res, result.status, result.body, req);
    }

    if (req.method === 'PATCH' && url.pathname.match(/^\/api\/ops\/orders\/[^/]+$/)) {
      const id = url.pathname.split('/').pop();
      const input = await readJson(req);
      const result = await mutate(async () => {
        const latest = await loadState();
        const order = latest.orders.find(item => item.id === id);
        if (!order) return { status: 404, body: { error: 'ORDER_NOT_FOUND' } };
        if (!ORDER_FLOW.includes(input.status) && input.status !== 'CANCELLED') {
          return { status: 422, body: { error: 'INVALID_STATUS' } };
        }
        if (input.status === 'CANCELLED') return { status: 400, body: { error: 'USE_CANCEL_ENDPOINT' } };
        const currentIdx = ORDER_FLOW.indexOf(order.status);
        const nextIdx = ORDER_FLOW.indexOf(input.status);
        if (nextIdx < currentIdx) return { status: 409, body: { error: 'INVALID_TRANSITION', from: order.status, to: input.status } };
        order.status = input.status;
        order.updatedAt = new Date().toISOString();
        await persist(latest);
        return { status: 200, body: { order: redactOrder(order, latest, { includePii: true }) } };
      });
      return send(res, result.status, result.body, req);
    }

    if (req.method === 'POST' && url.pathname === '/api/ops/reset-demo') {
      const seed = normalizeState(JSON.parse(await readFile(seedPath, 'utf8')));
      await persist(seed);
      return send(res, 200, { ok: true, message: 'Demo state reset from seed.' }, req);
    }

    return send(res, 404, { error: 'NOT_FOUND' }, req);
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'INTERNAL_ERROR', message: error.message }, req);
  }
}

const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isMain) {
  server.listen(port, host, () => {
    console.log(`Fleet API running at http://${host}:${port}`);
  });
}