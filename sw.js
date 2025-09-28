// Nombre de la caché para nuestra aplicación
const CACHE_NAME = 'interactive-stories-cache-v1';

// Archivos y recursos que queremos cachear
const urlsToCache = [
  '/',
  'index.html',
  'games.js',
  'banner.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'sounds/click.mp3',
  'sounds/congrats.flac',
  'sounds/ok.mp3',
  'sounds/select.wav',
  'sounds/wrong.wav'
];

// Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
self.addEventListener('install', event => {
  // Esperamos hasta que la promesa dentro de waitUntil se resuelva.
  event.waitUntil(
    // Abrimos la caché con el nombre que definimos.
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta');
        // Agregamos todos los archivos de nuestro array a la caché.
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'fetch': Se dispara cada vez que la aplicación realiza una petición de red (ej. una imagen, un script).
self.addEventListener('fetch', event => {
  event.respondWith(
    // Buscamos si la petición ya existe en nuestra caché.
    caches.match(event.request)
      .then(response => {
        // Si encontramos una respuesta en la caché, la devolvemos.
        if (response) {
          return response;
        }
        // Si no está en la caché, la pedimos a la red.
        return fetch(event.request);
      }
    )
  );
});
