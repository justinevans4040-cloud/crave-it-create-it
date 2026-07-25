const CACHE = 'crave-shell-v4';
const ASSETS = [
  './',
  './index.html',
  './driver.html',
  './ops.html',
  './styles.css',
  './driver.css',
  './app.js',
  './driver.js',
  './manifest.webmanifest',
  './assets/logo-mark.svg',
  './assets/apple-touch-icon.png',
  './data/seed.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return;
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => cached))
  );
});
