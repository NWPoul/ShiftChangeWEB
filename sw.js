/* ShiftChange shell SW — generated; do not edit */
const CACHE_NAME = "sc-shell-20.11.2026, 14:56 UTC+2";
const PRECACHE = [
  "/ShiftChangeWEB/index.html",
  "/ShiftChangeWEB/manifest.webmanifest",
  "/ShiftChangeWEB/icons/fs-icon-192.png",
  "/ShiftChangeWEB/icons/fs-icon-512.png",
  "/ShiftChangeWEB/icons/fs-shift-icon-512.png",
  "/ShiftChangeWEB/chunk-chetbd2r.js"
];
const STATIC_EXT = /\.(?:js|css|png|svg|webmanifest|ico|woff2?)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Per-URL add so one bad asset does not abort non-shell assets.
      const failed = [];
      await Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => {
            failed.push(url);
            console.warn('SW precache skip', url, err);
          })
        )
      );
      if (failed.length) {
        console.error('SW precache incomplete', failed);
      }
      // Shell must be complete offline — abort if any html/js/css URL failed (icons soft-fail).
      const criticalMissing = failed.some(
        (url) => typeof url === 'string' && /\.(?:html|js|css)(?:\?|$)/i.test(url)
      );
      if (criticalMissing) {
        throw new Error('SW precache missing critical asset');
      }
      await self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  // Clean old caches only — do not claim clients (avoids taking over mid first-paint).
  // Control starts on the next navigation (restart / reload after install).
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first; fall back to cached shell on throw or non-OK HTTP.
  if (req.mode === 'navigate') {
    const shellFromCache = async () => {
      const cache = await caches.open(CACHE_NAME);
      return (
        (await cache.match(req)) ||
        (await cache.match(new URL('index.html', self.registration.scope))) ||
        (await cache.match(self.registration.scope)) ||
        null
      );
    };
    event.respondWith(
      fetch(req)
        .then(async (res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            return res;
          }
          return (await shellFromCache()) || res;
        })
        .catch(async () => (await shellFromCache()) || Response.error())
    );
    return;
  }

  // Same-origin static assets only — leave other GETs to the network.
  if (!STATIC_EXT.test(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) void cache.put(req, res.clone());
        return res;
      } catch {
        return Response.error();
      }
    })
  );
});
