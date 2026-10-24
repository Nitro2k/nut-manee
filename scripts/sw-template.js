/* NoMoney service worker. Generated into out/sw.js by scripts/gen-sw.mjs; don't edit out/sw.js. */
/* global self, caches, URL, Request */

const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
const CACHE = `nomoney-${VERSION}`;

// Install: cache every file of the build. Bypass the HTTP cache so we never store stale files.
// The new worker then waits; the app asks before switching (see sw-register.tsx).
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })))),
  );
});

// Activate: delete caches from older versions, then control open pages right away.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith("nomoney-") && k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// Static export: query strings never change the file, and RSC requests add Vary headers.
const MATCH = { ignoreSearch: true, ignoreVary: true };

async function fromCache(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, MATCH);
  if (hit) return hit;
  if (request.mode === "navigate") {
    // Pages are cached as "/path/". Try that, then fall back to the home page.
    const { pathname } = new URL(request.url);
    const withSlash = pathname.endsWith("/") ? pathname : `${pathname}/`;
    return (await cache.match(withSlash, MATCH)) ?? (await cache.match("/", MATCH));
  }
  return undefined;
}

// Cache-first for same-origin GET; the network only for anything not in the build.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(fromCache(request).then((hit) => hit ?? fetch(request)));
});
