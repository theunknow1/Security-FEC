const CACHE_NAME = 'sentinel-cache-v1';

// Guardamos TODO lo necesario para que funcione sin internet
const assets = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  
  // Modelos de Detección (SSD Mobilenet)
  './models/ssd_mobilenetv1_model-weights_manifest.json',
  './models/ssd_mobilenetv1_model-shard1',
  './models/ssd_mobilenetv1_model-shard2',
  
  // Modelos de Puntos Faciales
  './models/face_landmark_68_model-weights_manifest.json',
  './models/face_landmark_68_model-shard1',
  
  // Modelos de Reconocimiento (¡Los pesados!)
  './models/face_recognition_model-weights_manifest.json',
  './models/face_recognition_model-shard1',
  './models/face_recognition_model-shard2'
];

// Instalar el Service Worker y guardar todo en caché
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Guardando archivos y modelos en caché...');
      return cache.addAll(assets);
    })
  );
});

// Limpiar cachés antiguos cuando actualices la App
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Borrando caché antiguo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Responder peticiones de forma offline (Estrategia Cache-First)
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      // Si está en caché, lo devuelve. Si no, lo busca en internet.
      return response || fetch(e.request);
    })
  );
});
