const CACHE_NAME = 'flappyfish-cache-v1';
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'main.js',
  'manifest.json',
  'bg.jpg',
  'fish.png',
  'fish-dead.png',
  'sounds/bg-music.mp3',
  'sounds/jump.wav',
  'sounds/gameover.wav'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
}); 