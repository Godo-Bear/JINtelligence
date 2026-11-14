/* JINtelligence service worker — lets the site be installed to a home screen and used offline.
   Bump CACHE_NAME whenever the core shell list below changes, so old caches get cleaned up. */
const CACHE_NAME = "jin-shell-20261114";
const CORE_ASSETS = ["./", "index.html", "manifest.webmanifest", "assets/icon-192.png", "assets/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never intercept writes — Supabase, AI calls, etc. go straight to network
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // only handle our own files; fonts/CDN/Supabase go straight to network

  if (req.mode === "navigate") {
    // The app shell: always try the network first so updates (new cache-busted CSS/JS links) show up
    // straight away, falling back to the last cached version when offline.
    event.respondWith(
      fetch(req)
        .then((res) => { caches.open(CACHE_NAME).then((c) => c.put("index.html", res.clone())); return res; })
        .catch(() => caches.match("index.html")),
    );
    return;
  }

  // Static assets (css/js/images): serve from cache first for speed, and refresh the cache in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => { if (res.ok) caches.open(CACHE_NAME).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );
});
