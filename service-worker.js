// mobile/service-worker.js
// Cache-first app shell for the fully-offline Bach flower advisor PWA.
//
// IMPORTANT: bump VERSION on every release that changes any shell file
// (index.html, style.css, mobile.css, any .js file, the manifest, or an
// icon). Old caches are deleted on activate, and browsers only pick up a
// new service worker (and therefore a fresh cache) once VERSION changes -
// otherwise users may keep seeing a stale cached shell after an update.
const VERSION = "20260921232311";
const CACHE_NAME = `bach-advisor-shell-${VERSION}`;

// Every file the app shell needs to run fully offline. Paths are relative
// so this works whether the site is served from "/" or from a GitHub Pages
// subpath like "/<repo>/".
const SHELL_FILES = [
  "./",
  "index.html",
  "style.css",
  "mobile.css",
  "bach-flowers.js",
  "advisor-engine.js",
  "local-store.js",
  "local-api.js",
  "backup.js",
  "app.js",
  "manifest.webmanifest",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  // Navigation requests: cache-first, falling back to the cached shell
  // page (index.html) when offline so deep links / reloads still work.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => caches.match("index.html"));
      })
    );
    return;
  }

  // Everything else: cache-first, fall back to network, and fill the cache
  // as new same-origin resources are fetched.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok && request.url.startsWith(self.location.origin)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
