const API_URL = globalThis.CRAVE_API_URL || (
  ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://127.0.0.1:8788' : ''
);
const CART_KEY = 'crave.cart.v2';
const INSTALL_DISMISS_KEY = 'crave.install.dismissed';

const state = {
  brand: null,
  settings: null,
  vehicles: [],
  products: [],
  inventory: [],
  nearestVehicleId: null,
  availableCount: 0,
  activeCount: 0,
  origin: null,
  menuFilter: 'ALL',
  cart: loadCart(),
  lastOrderId: null
};

const mapState = {
  map: null,
  markers: new Map(),
  userMarker: null,
  ready: false
};

let deferredInstallPrompt = null;

const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || { vehicleId: null, lines: [] };
  } catch {
    return { vehicleId: null, lines: [] };
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
}

function productById(id) {
  return state.products.find(product => product.id === id);
}

function vehicleById(id) {
  return state.vehicles.find(vehicle => vehicle.id === id);
}

function stockFor(vehicleId, productId) {
  return state.inventory.find(item => item.vehicleId === vehicleId && item.productId === productId)?.quantity ?? 0;
}

function cartCount() {
  return state.cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}

function cartSubtotal() {
  return state.cart.lines.reduce((sum, line) => {
    const product = productById(line.productId);
    return sum + (product?.priceCents || 0) * line.quantity;
  }, 0);
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

function setCartOpen(open) {
  const drawer = document.querySelector('#cart-drawer');
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.querySelector('#cart-toggle')?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function truckTotal(vehicleId) {
  return state.inventory.filter(item => item.vehicleId === vehicleId).reduce((sum, item) => sum + item.quantity, 0);
}

function initMap() {
  if (mapState.ready || typeof L === 'undefined') return;
  const el = document.querySelector('#fleet-map');
  if (!el) return;
  mapState.map = L.map(el, { zoomControl: true, attributionControl: true }).setView([36.1147, -115.1728], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(mapState.map);
  mapState.ready = true;
  setTimeout(() => mapState.map.invalidateSize(), 80);
}

function markerHtml(vehicle) {
  const active = vehicle.status === 'ACTIVE';
  const label = vehicle.name.replace(/^Truck\s+/i, 'T').slice(0, 4);
  return `<div class="truck-marker ${active ? '' : 'off'}" title="${vehicle.name}">${label}</div>`;
}

function renderMap() {
  initMap();
  if (!mapState.map) return;

  const legend = document.querySelector('#map-legend');
  const bounds = [];

  for (const vehicle of state.vehicles) {
    const lat = Number(vehicle.mapLatitude ?? vehicle.latitude);
    const lng = Number(vehicle.mapLongitude ?? vehicle.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    bounds.push([lat, lng]);

    const html = markerHtml(vehicle);
    const icon = L.divIcon({ className: '', html, iconSize: [42, 42], iconAnchor: [21, 21] });
    let marker = mapState.markers.get(vehicle.id);
    if (!marker) {
      marker = L.marker([lat, lng], { icon }).addTo(mapState.map);
      marker.on('click', () => {
        if (vehicle.status === 'ACTIVE') {
          if (!ensureVehicle(vehicle.id)) return;
          setCartOpen(true);
          renderCart();
        } else {
          showToast(`${vehicle.name} is restocking.`);
        }
      });
      mapState.markers.set(vehicle.id, marker);
    } else {
      marker.setLatLng([lat, lng]);
      marker.setIcon(icon);
    }
    const total = truckTotal(vehicle.id);
    marker.bindPopup(`
      <strong>${vehicle.name}</strong><br />
      ${vehicle.zone} · ${vehicle.status.replace('_', ' ')}<br />
      ${total} items · ${vehicle.etaMinutes || '—'} min<br />
      <button type="button" class="btn btn-chile" style="margin-top:8px;padding:8px 12px;font-size:0.8rem"
        onclick="window.__craveOrderTruck('${vehicle.id}')">Order this truck</button>
    `);
  }

  for (const [id, marker] of mapState.markers) {
    if (!state.vehicles.some(vehicle => vehicle.id === id)) {
      mapState.map.removeLayer(marker);
      mapState.markers.delete(id);
    }
  }

  if (legend) {
    legend.innerHTML = state.vehicles.map(vehicle => {
      const total = truckTotal(vehicle.id);
      return `<div class="map-pill"><strong>${vehicle.name}</strong><br /><em>${vehicle.status === 'ACTIVE' ? `${total} left` : 'restocking'}</em> · ${vehicle.zone}</div>`;
    }).join('');
  }

  if (state.origin && Number.isFinite(state.origin.lat)) {
    const userIcon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#2b6cb0;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    if (!mapState.userMarker) {
      mapState.userMarker = L.marker([state.origin.lat, state.origin.lng], { icon: userIcon }).addTo(mapState.map);
    } else {
      mapState.userMarker.setLatLng([state.origin.lat, state.origin.lng]);
    }
    bounds.push([state.origin.lat, state.origin.lng]);
  }

  if (bounds.length && !mapState.fittedOnce) {
    mapState.map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
    mapState.fittedOnce = true;
  }
}

window.__craveOrderTruck = vehicleId => {
  const vehicle = vehicleById(vehicleId);
  if (!vehicle || vehicle.status !== 'ACTIVE') {
    showToast('That truck is not taking orders.');
    return;
  }
  if (!ensureVehicle(vehicleId)) return;
  setCartOpen(true);
  renderCart();
};

async function loadStorefront() {
  const params = new URLSearchParams();
  if (state.origin) {
    params.set('lat', String(state.origin.lat));
    params.set('lng', String(state.origin.lng));
  }
  try {
    const response = await fetch(`${API_URL}/api/storefront?${params}`);
    if (!response.ok) throw new Error('Storefront API did not respond.');
    Object.assign(state, await response.json());
  } catch {
    const response = await fetch('data/seed.json').catch(() => null);
    if (response?.ok) {
      const seed = await response.json();
      Object.assign(state, {
        brand: seed.brand,
        settings: seed.settings,
        vehicles: seed.vehicles.map(vehicle => ({
          ...vehicle,
          mapLatitude: vehicle.latitude,
          mapLongitude: vehicle.longitude
        })),
        products: seed.products,
        inventory: seed.inventory,
        nearestVehicleId: seed.vehicles.find(v => v.status === 'ACTIVE')?.id || null,
        availableCount: seed.inventory.reduce((s, i) => s + i.quantity, 0),
        activeCount: seed.vehicles.filter(v => v.status === 'ACTIVE').length
      });
      showToast('API offline — showing local seed inventory.');
    } else {
      showToast('Start the app with START-WINDOWS.bat or npm run dev.');
    }
  }
  render();
}

function render() {
  renderHero();
  renderMap();
  renderVehicles();
  renderProducts();
  renderConcepts();
  renderStory();
  renderCart();
}

function renderHero() {
  const live = document.querySelector('#hero-live-text');
  if (!live) return;
  const nearest = vehicleById(state.nearestVehicleId);
  live.textContent = nearest
    ? `${state.activeCount} live · ${state.availableCount} left · near ${nearest.name}`
    : `${state.activeCount} live · ${state.availableCount} left`;
}

function renderVehicles() {
  const grid = document.querySelector('#vehicle-grid');
  if (!grid) return;
  grid.innerHTML = state.vehicles.map(vehicle => {
    const rows = state.inventory
      .filter(item => item.vehicleId === vehicle.id && item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 4);
    const active = vehicle.status === 'ACTIVE';
    const distance = vehicle.distanceMiles != null ? ` · ${vehicle.distanceMiles} mi` : '';
    return `<article class="vehicle-card ${active ? '' : 'inactive'}">
      <div class="vehicle-top">
        <div>
          <p class="eyebrow">${vehicle.zone}</p>
          <h3>${vehicle.name}</h3>
        </div>
        <span class="status ${vehicle.status.toLowerCase()}">${vehicle.status.replace('_', ' ')}</span>
      </div>
      <div class="meta">
        <strong>⌖ ${vehicle.locationLabel}</strong>
        ${active ? `${vehicle.etaMinutes} min · ${vehicle.deliveryRadiusMiles} mi drop-off${distance}` : 'Route paused while restocking'}
      </div>
      <div class="inventory-list">
        ${rows.length ? rows.map(item => {
          const product = productById(item.productId);
          return `<div class="inventory-row"><span>${product?.name || item.productId}</span><strong>${item.quantity} left</strong><div class="stock-bar"><i style="width:${Math.min(100, (item.quantity / 30) * 100)}%"></i></div></div>`;
        }).join('') : '<div class="inventory-row"><span>Restocking</span><strong>0 ready</strong></div>'}
      </div>
      <div class="vehicle-actions">
        <button class="btn btn-chile" data-select-vehicle="${vehicle.id}" ${active ? '' : 'disabled'}>${active ? 'Order this truck' : 'Restocking'}</button>
        <button class="route-btn" data-focus-map="${vehicle.id}" ${active || vehicle.mapLatitude ? '' : 'disabled'}>Map</button>
      </div>
    </article>`;
  }).join('');
}

function renderProducts() {
  const products = state.products.filter(product => {
    if (state.menuFilter === 'ALL') return true;
    return product.category === state.menuFilter;
  });
  document.querySelector('#product-grid').innerHTML = products.map(product => {
    const available = state.vehicles.reduce((sum, vehicle) => sum + stockFor(vehicle.id, product.id), 0);
    return `<article class="product-card">
      <div class="product-art"><img src="${product.image}" alt="" /></div>
      <div class="product-body">
        <header><h3>${product.name}</h3><strong>${money(product.priceCents)}</strong></header>
        <p>${product.description}</p>
        <div class="product-meta">
          <span>${available} rolling now</span>
          <button class="mini-add" data-add-product="${product.id}" aria-label="Add ${product.name}">+</button>
        </div>
      </div>
    </article>`;
  }).join('') || '<p class="meta">Nothing in this category right now.</p>';
}

function renderConcepts() {
  const concepts = state.products.filter(product => product.category === 'CONCEPT_LAB');
  document.querySelector('#concept-stack').innerHTML = concepts.map(product => `
    <article class="concept-card">
      <img src="${product.image}" alt="" />
      <div><h3>${product.name}</h3><p>${product.description}</p></div>
      <strong>${money(product.priceCents)}</strong>
    </article>`).join('');
}

function renderStory() {
  if (state.brand?.story) document.querySelector('#story-text').textContent = state.brand.story;
  const quote = state.settings?.quotes?.[0] || state.brand?.quotes?.[0];
  if (quote) document.querySelector('#story-quote').textContent = `“${quote}”`;
  const email = state.settings?.cateringEmail;
  if (email) document.querySelector('#catering-link').href = `mailto:${email}`;
}

function renderCart() {
  const count = cartCount();
  document.querySelector('#cart-count').textContent = String(count);
  document.querySelector('#dock-cart-count').textContent = String(count);
  const vehicle = vehicleById(state.cart.vehicleId);
  document.querySelector('#cart-vehicle-label').textContent = vehicle ? vehicle.name : 'Pick a truck';
  document.querySelector('#cart-lock-note').textContent = vehicle
    ? `Locked to ${vehicle.name} · ${vehicle.zone}`
    : 'One truck per order — keeps stock honest.';

  const linesEl = document.querySelector('#cart-lines');
  const emptyEl = document.querySelector('#cart-empty');
  const form = document.querySelector('#checkout-form');
  if (!state.cart.lines.length) {
    linesEl.innerHTML = '';
    emptyEl.hidden = false;
    form.hidden = true;
    return;
  }
  emptyEl.hidden = true;
  form.hidden = false;
  linesEl.innerHTML = state.cart.lines.map(line => {
    const product = productById(line.productId);
    const left = stockFor(state.cart.vehicleId, line.productId);
    return `<div class="cart-line">
      <div>
        <strong>${product?.name || line.productId}</strong>
        <div class="meta">${money(product?.priceCents || 0)} · ${left} left</div>
      </div>
      <div class="qty-row">
        <button type="button" data-qty="${line.productId}" data-delta="-1">−</button>
        <span>${line.quantity}</span>
        <button type="button" data-qty="${line.productId}" data-delta="1">+</button>
      </div>
    </div>`;
  }).join('');

  const subtotal = cartSubtotal();
  const tax = Math.round((subtotal * (state.settings?.taxRateBps || 825)) / 10000);
  const fee = state.settings?.serviceFeeCents || 75;
  document.querySelector('#cart-totals').innerHTML = `
    <div>Subtotal <span style="float:right">${money(subtotal)}</span></div>
    <div>Tax <span style="float:right">${money(tax)}</span></div>
    <div>Service fee <span style="float:right">${money(fee)}</span></div>
    <strong>Total <span style="float:right">${money(subtotal + tax + fee)}</span></strong>`;
}

function ensureVehicle(vehicleId) {
  if (state.cart.vehicleId && state.cart.vehicleId !== vehicleId && state.cart.lines.length) {
    const ok = confirm('Cart is locked to another truck. Switch and clear?');
    if (!ok) return false;
    state.cart = { vehicleId, lines: [] };
  } else {
    state.cart.vehicleId = vehicleId;
  }
  saveCart();
  return true;
}

function addProduct(productId, preferredVehicleId) {
  let vehicleId = preferredVehicleId || state.cart.vehicleId;
  if (!vehicleId) {
    vehicleId = state.vehicles.find(vehicle => vehicle.status === 'ACTIVE' && stockFor(vehicle.id, productId) > 0)?.id
      || state.nearestVehicleId;
  }
  const vehicle = vehicleById(vehicleId);
  if (!vehicle || vehicle.status !== 'ACTIVE') {
    showToast('No active truck has that item right now.');
    return;
  }
  if (!ensureVehicle(vehicleId)) return;
  const left = stockFor(vehicleId, productId);
  const existing = state.cart.lines.find(line => line.productId === productId);
  const nextQty = (existing?.quantity || 0) + 1;
  if (nextQty > left) {
    showToast(`Only ${left} left on ${vehicle.name}.`);
    return;
  }
  if (existing) existing.quantity = nextQty;
  else state.cart.lines.push({ productId, quantity: 1 });
  saveCart();
  renderCart();
  setCartOpen(true);
  showToast(`Added to ${vehicle.name}`);
}

function changeQty(productId, delta) {
  const line = state.cart.lines.find(item => item.productId === productId);
  if (!line) return;
  const left = stockFor(state.cart.vehicleId, productId);
  const next = line.quantity + delta;
  if (next <= 0) state.cart.lines = state.cart.lines.filter(item => item.productId !== productId);
  else if (next > left) {
    showToast(`Only ${left} left on this truck.`);
    return;
  } else line.quantity = next;
  saveCart();
  renderCart();
}

async function checkout(event) {
  event.preventDefault();
  const status = document.querySelector('#checkout-status');
  status.className = 'form-status';
  status.textContent = 'Reserving stock…';
  const fulfillment = document.querySelector('#fulfillment').value;
  const payload = {
    vehicleId: state.cart.vehicleId,
    customerName: document.querySelector('#customer-name').value,
    customerPhone: document.querySelector('#customer-phone').value,
    fulfillment,
    deliveryAddress: document.querySelector('#delivery-address').value,
    notes: document.querySelector('#order-notes').value,
    items: state.cart.lines.map(line => ({ productId: line.productId, quantity: line.quantity }))
  };
  const idempotencyKey = `web_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  try {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.details?.join(' ') || result.message || 'Order failed.');
    state.inventory = state.inventory.map(item => {
      const updated = result.inventory.find(row => row.vehicleId === item.vehicleId && row.productId === item.productId);
      return updated || item;
    });
    state.cart = { vehicleId: null, lines: [] };
    saveCart();
    state.lastOrderId = result.order.id;
    status.textContent = '';
    render();
    setCartOpen(false);
    document.querySelector('#confirm-title').textContent = `Order ${result.order.id}`;
    document.querySelector('#confirm-body').innerHTML = `
      <p><strong>${money(result.order.totalCents)}</strong> · ${result.order.fulfillment.replace('_', ' ')} · ${result.order.vehicleName}</p>
      <p class="meta">Status: ${result.order.status}. Save this ID to track.</p>`;
    document.querySelector('#confirm-dialog').showModal();
    showToast('You’re on the board.');
  } catch (error) {
    status.className = 'form-status error';
    status.textContent = error.message;
  }
}

async function submitConcept(event) {
  event.preventDefault();
  const status = document.querySelector('#concept-status');
  status.className = 'form-status';
  status.textContent = 'Sending…';
  try {
    const response = await fetch(`${API_URL}/api/concepts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        idea: document.querySelector('#concept-idea').value,
        name: document.querySelector('#concept-name').value,
        contact: document.querySelector('#concept-contact').value
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.details?.join(' ') || 'Could not save idea.');
    status.className = 'form-status success';
    status.textContent = `Saved as ${result.concept.id}`;
    setTimeout(() => document.querySelector('#concept-dialog').close(), 700);
    showToast('Concept received.');
    event.target.reset();
  } catch (error) {
    status.className = 'form-status error';
    status.textContent = error.message;
  }
}

async function trackOrder(event) {
  event.preventDefault();
  const id = document.querySelector('#track-id').value.trim();
  const phone = document.querySelector('#track-phone').value.trim();
  const box = document.querySelector('#track-result');
  box.hidden = false;
  box.textContent = 'Looking up…';
  try {
    const response = await fetch(`${API_URL}/api/orders/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Order not found.');
    const order = result.order;
    box.innerHTML = `
      <strong>${order.id}</strong> · ${order.status}<br />
      ${order.vehicleName} (${order.vehicleZone}) · ${order.fulfillment}<br />
      ${order.items.map(item => `${item.quantity}× ${item.name}`).join(', ')}<br />
      Total ${money(order.totalCents)}`;
  } catch (error) {
    box.textContent = error.message;
  }
}

function focusVehicleOnMap(vehicleId) {
  const vehicle = vehicleById(vehicleId);
  if (!vehicle || !mapState.map) return;
  const lat = Number(vehicle.mapLatitude ?? vehicle.latitude);
  const lng = Number(vehicle.mapLongitude ?? vehicle.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  mapState.map.setView([lat, lng], 14, { animate: true });
  mapState.markers.get(vehicleId)?.openPopup();
  document.querySelector('#map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function centerOnMe() {
  if (!navigator.geolocation) {
    showToast('Location not available on this device.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    position => {
      state.origin = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (mapState.map) {
        mapState.map.setView([state.origin.lat, state.origin.lng], 13, { animate: true });
      }
      showToast('Centered on you · sorting trucks');
      loadStorefront();
    },
    () => showToast('Could not read location.'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function setupInstallBanner() {
  const banner = document.querySelector('#install-banner');
  if (!banner) return;
  if (localStorage.getItem(INSTALL_DISMISS_KEY) === '1') return;
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (standalone) return;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    banner.hidden = false;
  });

  // iOS / browsers without beforeinstallprompt still see soft tip once
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos && !standalone) {
    banner.querySelector('p').textContent = 'iPhone: Safari → Share → Add to Home Screen';
    document.querySelector('#install-btn').textContent = 'How';
    banner.hidden = false;
  }

  document.querySelector('#install-btn')?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      banner.hidden = true;
      return;
    }
    document.querySelector('#get-app')?.scrollIntoView({ behavior: 'smooth' });
  });
  document.querySelector('#install-dismiss')?.addEventListener('click', () => {
    localStorage.setItem(INSTALL_DISMISS_KEY, '1');
    banner.hidden = true;
  });
}

document.addEventListener('click', event => {
  const close = event.target.closest('[data-close-dialog]');
  if (close) close.closest('dialog')?.close();

  const selectVehicle = event.target.closest('[data-select-vehicle]');
  if (selectVehicle) {
    if (!ensureVehicle(selectVehicle.dataset.selectVehicle)) return;
    setCartOpen(true);
    renderCart();
  }

  const addProductBtn = event.target.closest('[data-add-product]');
  if (addProductBtn) addProduct(addProductBtn.dataset.addProduct);

  const qtyBtn = event.target.closest('[data-qty]');
  if (qtyBtn) changeQty(qtyBtn.dataset.qty, Number(qtyBtn.dataset.delta));

  const focusMap = event.target.closest('[data-focus-map]');
  if (focusMap) focusVehicleOnMap(focusMap.dataset.focusMap);

  const chip = event.target.closest('.menu-filters [data-filter]');
  if (chip) {
    state.menuFilter = chip.dataset.filter;
    document.querySelectorAll('.menu-filters [data-filter]').forEach(node => {
      node.classList.toggle('active', node === chip);
    });
    renderProducts();
  }
});

document.querySelector('#cart-toggle')?.addEventListener('click', () => setCartOpen(true));
document.querySelector('#dock-cart')?.addEventListener('click', () => setCartOpen(true));
document.querySelector('#cart-close')?.addEventListener('click', () => setCartOpen(false));
document.querySelector('#cart-drawer')?.addEventListener('click', event => {
  if (event.target.id === 'cart-drawer') setCartOpen(false);
});
document.querySelector('#locate-btn')?.addEventListener('click', centerOnMe);
document.querySelector('#role-btn')?.addEventListener('click', () => document.querySelector('#role-dialog')?.showModal());
document.querySelector('#hero-order')?.addEventListener('click', () => {
  const id = state.nearestVehicleId || state.vehicles.find(v => v.status === 'ACTIVE')?.id;
  if (!id) return showToast('No active trucks yet.');
  if (!ensureVehicle(id)) return;
  const top = state.inventory
    .filter(item => item.vehicleId === id && item.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity)[0];
  if (top && !state.cart.lines.length) addProduct(top.productId, id);
  else {
    setCartOpen(true);
    renderCart();
  }
});
document.querySelector('#fulfillment')?.addEventListener('change', event => {
  const drop = event.target.value === 'DROP_OFF';
  document.querySelector('#address-field').hidden = !drop;
  document.querySelector('#delivery-address').required = drop;
});
document.querySelector('#checkout-form')?.addEventListener('submit', checkout);
document.querySelector('#open-concept')?.addEventListener('click', () => document.querySelector('#concept-dialog').showModal());
document.querySelector('#concept-form')?.addEventListener('submit', submitConcept);
document.querySelector('#track-form')?.addEventListener('submit', trackOrder);
document.querySelector('#confirm-track')?.addEventListener('click', () => {
  document.querySelector('#confirm-dialog').close();
  if (state.lastOrderId) {
    document.querySelector('#track-id').value = state.lastOrderId;
    const phone = document.querySelector('#customer-phone')?.value;
    if (phone) document.querySelector('#track-phone').value = phone;
    document.querySelector('#track').scrollIntoView({ behavior: 'smooth' });
  }
});

setupInstallBanner();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});

loadStorefront();
setInterval(loadStorefront, 15000);
window.addEventListener('resize', () => mapState.map?.invalidateSize());
