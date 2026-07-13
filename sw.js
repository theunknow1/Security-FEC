const CACHE_NAME = 'sentinel-cache-v1';
const assets = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// Instalar el Service Worker
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Activar y responder peticiones (permite que funcione offline)
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});
