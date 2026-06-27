// Minimal service worker — app-shell cache for home-screen install + offline.
// Network-first for /api (so live PostgreSQL data wins), cache-first for the
// static shell. The app already falls back to a bundled snapshot when /api is
// unreachable, so this only needs to keep the shell available offline.
const CACHE = 'athens-compliance-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // API: network-first, never cache (data freshness + the app has its own fallback).
  if (url.pathname.startsWith('/api')) return

  // Static: cache-first, fall back to network and populate the cache.
  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request)
          .then((res) => {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
            return res
          })
          .catch(() => caches.match('/index.html'))
    )
  )
})
