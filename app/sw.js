var cacheName = 'depict-it';

var filesToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/index.js',
    '/js/ably.min-1.js',
    '/js/vue.min.js',
    '/assets/bg.webp',
    '/assets/rules.webp',
    '/assets/logo.svg',
    '/assets/loading.gif',
    '/manifest.json',
    '/assets/icons-192.png',
    '/assets/icons/favicon.ico',
];

self.addEventListener('install', function (e) {
    console.log('[ServiceWorker] Install');

    e.waitUntil(
        caches.open(cacheName).then(function (cache) {
            console.log('[ServiceWorker] Caching app shell');
            return cache.addAll(filesToCache);
        })
    );

});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    if (navigator.onLine) {
        return fetch(event.request);
    }

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(response => {
            return response || fetch(event.request);
        })
    );
});