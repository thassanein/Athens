import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// PWA: register the service worker for home-screen install + offline cache.
// Use BASE_URL so it works under a subpath (e.g. GitHub Pages '/Athens/').
if ('serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      /* offline cache is best-effort */
    })
  })
}
