// Service worker — NETWORK-FIRST.
//
// The app always shows the latest deploy when online; the cache is only a
// last-resort offline fallback. (The previous cache-first strategy trapped
// users on a stale app shell after each deploy.) Bumping CACHE wipes old
// caches on activate.
const CACHE = 'athens-compliance-v2'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Never touch the API or cross-origin requests (fonts, etc.).
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) return

  // Network-first: serve fresh content, fall back to cache only when offline.
  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match('./index.html')))
  )
})
