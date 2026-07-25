const CACHE = 'crave-shell-v5';
const PRECACHE = [
  './',
  './index.html',
  './driver.html',
  './ops.html',
  './manifest.webmanifest',
  './assets/logo-mark.svg',
  './assets/apple-touch-icon.png',
  './data/seed.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
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
  if (url.pathname.includes('/api/') || url.pathname.endsWith('/health')) return;

  // Always prefer network for app shell scripts/styles so cart fixes ship immediately
  const isShell = /\.(js|css|html|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith('/');
  if (isShell) {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => cached))
  );
});
