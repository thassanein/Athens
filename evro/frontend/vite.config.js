import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// EVRO web app. In dev, /api proxies to the Express backend so the SPA can read
// the live Postgres-backed portfolio without CORS juggling. With no backend the
// app falls back to the bundled snapshot (demo mode).
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: process.env.API_URL || 'http://localhost:4100', changeOrigin: true },
    },
  },
})
