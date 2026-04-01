const CACHE_NAME = "communite-cache-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.svg", "/icons/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // Never cache API calls or Next.js data endpoints.
  if (requestUrl.pathname.startsWith("/api/") || requestUrl.pathname.startsWith("/_next/data/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => {
          const offline = await caches.match(OFFLINE_URL);
          return offline || Response.error();
        })
    );
    return;
  }

  // Cache-first only for static assets.
  const destination = request.destination;
  const isStaticAsset =
    destination === "script" ||
    destination === "style" ||
    destination === "image" ||
    destination === "font" ||
    requestUrl.pathname === "/manifest.webmanifest" ||
    requestUrl.pathname.startsWith("/icons/") ||
    requestUrl.pathname.startsWith("/_next/static/");

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone)).catch(() => {});
          return response;
        })
        .catch(() => cached || Response.error());
    })
  );
});
