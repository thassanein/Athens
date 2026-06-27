import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Mobile web app. The dev server proxies /api to the Express backend so the
// app can talk to PostgreSQL in development without CORS juggling.
export default defineConfig({
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
