import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path. Defaults to '/' (local dev, root hosting). For GitHub Pages the
// deploy workflow passes VITE_BASE (e.g. '/Athens/') so all asset URLs are
// prefixed correctly under the project subpath. Always normalized to end in '/'.
const raw = process.env.VITE_BASE
const base = raw ? (raw.endsWith('/') ? raw : raw + '/') : '/'

// Mobile web app. The dev server proxies /api to the Express backend so the
// app can talk to PostgreSQL in development without CORS juggling.
export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
