const CACHE_PREFIX = 'referto-fin-pallanuoto-v2-';
const CACHE_NAME = `${CACHE_PREFIX}13`;
const CORE_ASSETS = [
  './', './index.html', './app.js', './verbale-fin.js', './regolamento-fin.js', './db.js', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/icon.svg',
  './lib/pdf-lib.min.js', './lib/fontkit.umd.min.js', './lib/NotoSans-Bold.ttf',
  './modello_verbale_fin_2021.pdf'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const chiavi = await caches.keys();
    await Promise.all(chiavi.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const richiesta = event.request;
  if (richiesta.method !== 'GET' || !richiesta.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const salvata = await cache.match(richiesta, { ignoreSearch: true });
    if (salvata) return salvata;
    try {
      return await fetch(richiesta);
    } catch (errore) {
      if (richiesta.mode === 'navigate') {
        const app = await cache.match('./index.html');
        if (app) return app;
      }
      throw errore;
    }
  })());
});
