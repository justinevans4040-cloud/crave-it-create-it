const API_URL = globalThis.CRAVE_API_URL || (
  ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://127.0.0.1:8788' : ''
);
const TOKEN_KEY = 'crave.opsToken';
const VEHICLE_KEY = 'crave.driverVehicle';

const state = {
  token: localStorage.getItem(TOKEN_KEY) || 'crave-local-ops',
  vehicleId: localStorage.getItem(VEHICLE_KEY) || '',
  board: null,
  map: null,
  marker: null
};

const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2600);
}

function headers(json = true) {
  const h = { 'x-ops-token': state.token };
  if (json) h['content-type'] = 'application/json';
  return h;
}

function currentVehicle() {
  return state.board?.vehicles?.find(vehicle => vehicle.id === state.vehicleId) || null;
}

async function loadBoard() {
  const response = await fetch(`${API_URL}/api/ops/board`, { headers: headers(false) });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Staff code rejected or API offline.');
  }
  state.board = await response.json();
}

function fillVehicleSelect() {
  const select = document.querySelector('#vehicle-select');
  select.innerHTML = (state.board?.vehicles || []).map(vehicle => `
    <option value="${vehicle.id}" ${vehicle.id === state.vehicleId ? 'selected' : ''}>
      ${vehicle.name} · ${vehicle.zone} · ${vehicle.status}
    </option>
  `).join('');
  if (!state.vehicleId && state.board?.vehicles?.[0]) {
    state.vehicleId = state.board.vehicles[0].id;
    select.value = state.vehicleId;
  }
}

function initMap() {
  if (state.map || typeof L === 'undefined') return;
  state.map = L.map('driver-map').setView([36.1147, -115.1728], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);
}

function renderMap() {
  initMap();
  const vehicle = currentVehicle();
  if (!vehicle || !state.map) return;
  const lat = Number(vehicle.latitude ?? vehicle.mapLatitude);
  const lng = Number(vehicle.longitude ?? vehicle.mapLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const icon = L.divIcon({
    className: '',
    html: `<div class="truck-marker">${vehicle.name.replace(/^Truck\s+/i, 'T').slice(0, 4)}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21]
  });
  if (!state.marker) {
    state.marker = L.marker([lat, lng], { icon }).addTo(state.map);
  } else {
    state.marker.setLatLng([lat, lng]);
    state.marker.setIcon(icon);
  }
  state.map.setView([lat, lng], 14);
  setTimeout(() => state.map.invalidateSize(), 60);
}

function renderOrders() {
  const vehicle = currentVehicle();
  const list = document.querySelector('#order-list');
  const orders = (state.board?.orders || []).filter(order => order.vehicleId === state.vehicleId
    && !['CANCELLED', 'COMPLETED', 'DELIVERED'].includes(order.status));
  if (!orders.length) {
    list.innerHTML = '<p class="empty-note">No open orders on this truck.</p>';
    return;
  }
  list.innerHTML = orders.map(order => `
    <article class="order-card">
      <header>
        <div>
          <h3>${order.id}</h3>
          <p class="meta">${order.customerName || 'Guest'} · ${order.fulfillment?.replace('_', ' ') || ''}</p>
        </div>
        <span class="status">${order.status}</span>
      </header>
      <p class="meta">${(order.items || []).map(item => `${item.quantity}× ${item.name || item.productId}`).join(', ')}</p>
      <strong>${money(order.totalCents || 0)}</strong>
      ${order.deliveryAddress ? `<p class="meta">Drop-off: ${order.deliveryAddress}</p>` : ''}
      <div class="order-actions">
        <button class="btn btn-chile" data-advance="${order.id}" data-to="PREPARING" type="button">Preparing</button>
        <button class="btn btn-gold" data-advance="${order.id}" data-to="READY" type="button">Ready</button>
        <button class="ghost-btn" data-advance="${order.id}" data-to="COMPLETED" type="button">Done</button>
      </div>
    </article>
  `).join('');
}

function renderStock() {
  const list = document.querySelector('#stock-list');
  const vehicle = currentVehicle();
  const rows = [...(vehicle?.stock || [])].sort((a, b) => b.quantity - a.quantity);
  list.innerHTML = rows.length
    ? rows.map(item => `<div class="stock-row">
        <div>
          <strong>${item.productName || item.productId}</strong>
          <div class="meta">${item.productId}</div>
        </div>
        <strong>${item.quantity} left</strong>
      </div>`).join('')
    : '<p class="empty-note">No stock rows yet.</p>';
}

function renderBoard() {
  const vehicle = currentVehicle();
  if (!vehicle) return;
  document.querySelector('#driver-zone').textContent = vehicle.zone;
  document.querySelector('#driver-truck-name').textContent = vehicle.name;
  document.querySelector('#driver-status-line').textContent =
    `${vehicle.status.replace('_', ' ')} · ${vehicle.locationLabel || 'No label'} · ETA ${vehicle.etaMinutes || '—'} min`;
  document.querySelector('#location-label').value = vehicle.locationLabel || '';
  renderMap();
  renderOrders();
  renderStock();
}

async function enterDriver() {
  const status = document.querySelector('#gate-status');
  status.className = 'form-status';
  status.textContent = 'Checking staff access…';
  state.token = document.querySelector('#ops-token').value.trim() || 'crave-local-ops';
  state.vehicleId = document.querySelector('#vehicle-select').value;
  localStorage.setItem(TOKEN_KEY, state.token);
  localStorage.setItem(VEHICLE_KEY, state.vehicleId);
  try {
    await loadBoard();
    fillVehicleSelect();
    document.querySelector('#driver-gate').hidden = true;
    document.querySelector('#driver-board').hidden = false;
    renderBoard();
    status.textContent = '';
    showToast(`Driving ${currentVehicle()?.name || 'truck'}`);
  } catch (error) {
    status.className = 'form-status error';
    status.textContent = error.message;
  }
}

async function pingGps() {
  if (!navigator.geolocation) {
    showToast('GPS not available on this device.');
    return;
  }
  showToast('Reading GPS…');
  navigator.geolocation.getCurrentPosition(async position => {
    try {
      const response = await fetch(`${API_URL}/api/ops/vehicles/${state.vehicleId}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationLabel: document.querySelector('#location-label').value || undefined
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Ping failed.');
      await loadBoard();
      renderBoard();
      showToast('GPS updated — customers see the new spot.');
    } catch (error) {
      showToast(error.message);
    }
  }, () => showToast('Could not read GPS.'), { enableHighAccuracy: true, timeout: 12000 });
}

async function setStatus(status) {
  const response = await fetch(`${API_URL}/api/ops/vehicles/${state.vehicleId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    showToast('Could not update status.');
    return;
  }
  await loadBoard();
  renderBoard();
  showToast(`Truck marked ${status.replace('_', ' ')}`);
}

async function saveLabel() {
  const locationLabel = document.querySelector('#location-label').value.trim();
  const response = await fetch(`${API_URL}/api/ops/vehicles/${state.vehicleId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ locationLabel })
  });
  if (!response.ok) {
    showToast('Could not save label.');
    return;
  }
  await loadBoard();
  renderBoard();
  showToast('Location label saved.');
}

async function advanceOrder(orderId, status) {
  const response = await fetch(`${API_URL}/api/ops/orders/${orderId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    showToast(body.message || 'Could not advance order.');
    return;
  }
  await loadBoard();
  renderBoard();
  showToast(`Order → ${status}`);
}

document.querySelector('#ops-token').value = state.token;

document.querySelector('#enter-driver').addEventListener('click', enterDriver);
document.querySelector('#ping-gps').addEventListener('click', pingGps);
document.querySelector('#save-label').addEventListener('click', saveLabel);
document.querySelector('#switch-truck').addEventListener('click', () => {
  document.querySelector('#driver-board').hidden = true;
  document.querySelector('#driver-gate').hidden = false;
  fillVehicleSelect();
});

document.querySelector('.driver-tabs').addEventListener('click', event => {
  const tab = event.target.closest('[data-tab]');
  if (!tab) return;
  document.querySelectorAll('.driver-tabs [data-tab]').forEach(node => node.classList.toggle('active', node === tab));
  document.querySelectorAll('.driver-panel').forEach(panel => {
    panel.hidden = panel.dataset.panel !== tab.dataset.tab;
  });
  if (tab.dataset.tab !== 'stock') setTimeout(() => state.map?.invalidateSize(), 40);
});

document.querySelector('#driver-board').addEventListener('click', event => {
  const statusBtn = event.target.closest('[data-set-status]');
  if (statusBtn) setStatus(statusBtn.dataset.setStatus);

  const advance = event.target.closest('[data-advance]');
  if (advance) advanceOrder(advance.dataset.advance, advance.dataset.to);
});

(async () => {
  try {
    await loadBoard();
    fillVehicleSelect();
    if (state.vehicleId && state.board.vehicles.some(v => v.id === state.vehicleId)) {
      document.querySelector('#driver-gate').hidden = true;
      document.querySelector('#driver-board').hidden = false;
      renderBoard();
    }
  } catch {
    fillVehicleSelect();
  }
})();

setInterval(async () => {
  if (document.querySelector('#driver-board')?.hidden) return;
  try {
    await loadBoard();
    renderBoard();
  } catch {
    /* keep last board */
  }
}, 12000);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
