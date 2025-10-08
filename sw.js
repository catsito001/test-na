// sw.js - VERSIÓN FINAL Y MEJORADA

const CACHE_NAME = 'interactive-stories-cache-v7'; // <-- CAMBIA ESTE NÚMERO EN CADA ACTUALIZACIÓN (v2, v3...)

const urlsToCache = [
  '/',
  'index.html',
  'games.js',
  'banner.png',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'sounds/click.mp3',
  'sounds/congrats.flac',
  'sounds/ok.mp3',
  'sounds/select.wav',
  'sounds/wrong.wav'
];

// Evento 'install': Guarda los archivos en caché.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache abierto, guardando archivos de la app.');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'activate': Limpia los cachés antiguos cuando se activa el nuevo SW.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      ).then(() => {
        // Le dice al SW que tome control de la página inmediatamente.
        console.log('Service Worker: Reclamando clientes...');
        return self.clients.claim();
      });
    })
  );
});

// Evento 'fetch': Sirve los archivos desde el caché (estrategia Cache First).
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si la respuesta está en el caché, la devuelve. Si no, la busca en la red.
        return response || fetch(event.request);
      })
  );
});

// --- NUEVO Y CRUCIAL ---
// Este evento escucha los mensajes que vienen desde la app (index.html).
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    console.log('Service Worker: Recibido mensaje para saltar la espera. Activando ahora...');
    self.skipWaiting();
  }
});
