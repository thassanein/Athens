// PWA install helpers.
//
// Chrome/Android fires `beforeinstallprompt` (often once, early). We capture and
// stash it so an in-app "Add to Home Screen" button can trigger the native
// install prompt later. iOS Safari has no such API — the user must use
// Share → Add to Home Screen — so we detect iOS and show instructions instead.
//
// This module registers its listeners on import; import it once from main.jsx so
// the event is never missed before a screen mounts.

let deferred = null

export function isStandalone() {
  return (
    (typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true)) ||
    false
  )
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  // iPhone/iPad/iPod, plus iPadOS which reports as Macintosh but is touch.
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)
}

export function canPrompt() {
  return !!deferred
}

// Trigger the native install prompt. Returns 'accepted' | 'dismissed' | 'unavailable'.
export async function promptInstall() {
  if (!deferred) return 'unavailable'
  deferred.prompt()
  let outcome = 'dismissed'
  try {
    ;({ outcome } = await deferred.userChoice)
  } catch {
    /* ignore */
  }
  deferred = null
  window.dispatchEvent(new Event('pwa-changed'))
  return outcome
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // keep the prompt for our own button
    deferred = e
    window.dispatchEvent(new Event('pwa-changed'))
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    window.dispatchEvent(new Event('pwa-changed'))
  })
}
