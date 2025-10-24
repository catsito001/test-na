// sw.js - VERSIÓN MEJORADA

// IMPORTANTE: Cambia este número de versión CADA VEZ que hagas una actualización.
// Por ejemplo: 'interactive-stories-cache-v2', 'v3', etc.
const CACHE_NAME = 'interactive-stories-cache-v25';

// Archivos y recursos que queremos cachear. Ya tenías esta lista.
const urlsToCache = [
  '/',
  'index.html',
  'games.js',
  'banner.png',
  'manifest.json', // Añadido para asegurar que el manifest también se cachea
  'icons/icon-192.png',
  'icons/icon-512.png',
  'sounds/click.mp3',
  'sounds/congrats.flac',
  'sounds/ok.mp3',
  'sounds/select.wav',
  'sounds/wrong.wav',
  'act1.png',
  'act2.png',
  'act3.png',
  'act4.png',
  'act5.png',
  'act6.png',
  'act7.png',
];

// Evento 'install': Se dispara cuando el Service Worker se instala.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache abierto, guardando archivos de la app.');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // --- NUEVO Y CRUCIAL ---
        // Esta línea fuerza al nuevo Service Worker a activarse en cuanto termina
        // la instalación, sin quedarse en estado de "espera".
        return self.skipWaiting();
      })
  );
});

// --- EVENTO 'ACTIVATE' COMPLETAMENTE NUEVO ---
// Evento 'activate': Se dispara cuando el nuevo Service Worker se activa.
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si el nombre del caché no es el actual, lo eliminamos.
          // Esto es VITAL para limpiar las versiones antiguas de tu app.
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        // --- NUEVO Y CRUCIAL ---
        // Le dice al SW que tome control de la página inmediatamente.
        return self.clients.claim();
    })
  );
});

// Evento 'fetch': Tu lógica existente aquí es correcta y la mantenemos.
// Evento 'fetch': Modificado para ignorar las peticiones de anuncios.
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // --- NUEVA LÓGICA PARA ANUNCIOS ---
  // Si la petición es para el dominio de anuncios,
  // sáltate el caché y ve directamente a la red.
 const adDomains = [
    'www.highperformanceformat.com',
    'highperformanceformat.com',
    'effectivegatecpm.com',
    'pl27908919.effectivegatecpm.com' // Subdominio específico del script
  ];

  // Si la petición es para CUALQUIER dominio en la lista,
  // sáltate el caché y ve directamente a la red.
  if (adDomains.includes(requestUrl.hostname)) {
    event.respondWith(fetch(event.request));
    return; // Importante: sal de la función aquí.
  }
  // --- FIN DE LA NUEVA LÓGICA ---

  // Lógica de caché original para todos los demás recursos de tu app
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Si está en caché, sírvelo desde el caché
          return response;
        }
        // Si no está en caché, búscalo en la red
        return fetch(event.request);
      }
    )
  );
});
