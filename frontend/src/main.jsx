import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './lib/pwa.js' // capture the install prompt early (home-screen install)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// PWA: register the service worker for home-screen install + offline cache.
// Use BASE_URL so it works under a subpath (e.g. GitHub Pages '/Athens/').
if ('serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL
  // When a new service worker takes control, reload once so the user lands on
  // the latest deploy automatically. Only armed when a controller already
  // exists (an update) — first-time visitors don't get a surprise reload.
  if (navigator.serviceWorker.controller) {
    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    })
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      /* offline cache is best-effort */
    })
  })
}
