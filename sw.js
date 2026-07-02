const CACHE = 'task-mgr-v2-20260702-2';
const STATIC_ASSETS = ['./','./index.html','./manifest.json','./version.json','./icons/icon-192.png','./icons/icon-512.png','./quick-add.html','./v2.css','./ai-memory.js','./v2.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(ks.filter(k => k.startsWith('task-mgr-v2-') && k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const u = e.request.url;
  if (e.request.method !== 'GET' || !u.startsWith(self.location.origin) || u.includes('/api/') || u.includes('.netlify/')) return;

  const url = new URL(u);

  // Network First for index.html — always fetch fresh when online
  if (url.pathname.endsWith('/v2/') || url.pathname.endsWith('/v2/index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const c2 = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, c2));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache First for everything else (icons, manifest, quick-add)
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const c2 = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, c2));
      }
      return res;
    }))
  );
});
