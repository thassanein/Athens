import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { pool } from './db.js'
import { migrate } from '../db/migrate.js'
import { loadDb, persistMutable } from './store.js'
import { MUTATIONS } from './mutations.js'
import { enterpriseRollup } from './engine.js'
import { portfolioDiagnostics, renderLlmsTxt, renderOverviewHTML } from './diagnostics.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT) || 4100
const PROD = process.env.NODE_ENV === 'production'

app.set('trust proxy', 1)

// Open/public mode (PoC): any origin may read & write the API and read the
// machine-readable surfaces, so other apps and AI tools can consume EVRO.
app.use(['/api', '/overview', '/llms.txt'], (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})
if (process.env.CORS_ORIGIN) app.use(cors({ origin: process.env.CORS_ORIGIN.split(',') }))
app.use(express.json({ limit: '8mb' }))

// ---- health ----------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, db: true, model: 'return-maximization' }) }
  catch (err) { res.status(503).json({ ok: true, db: false, error: err.message }) }
})

// ---- whole portfolio (the SPA consumes this) -------------------------------
app.get('/api/db', async (_req, res, next) => {
  try { res.json(await loadDb()) } catch (err) { next(err) }
})

// ---- engine-computed surfaces (single source of truth) ---------------------
app.get('/api/exec', async (_req, res, next) => {
  try { res.json(enterpriseRollup(await loadDb())) } catch (err) { next(err) }
})
app.get('/api/portfolio', async (_req, res, next) => {
  try { res.json(portfolioDiagnostics(await loadDb())) } catch (err) { next(err) }
})

// ---- audited write: apply a mutation reducer, persist, return new db --------
app.post('/api/action', async (req, res, next) => {
  const { action, payload } = req.body || {}
  const fn = MUTATIONS[action]
  if (!fn) return res.status(400).json({ error: `Unknown action '${action}'.` })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const db = await loadDb(client)
    const result = fn(db, ...(Array.isArray(payload) ? payload : []))
    if (result.error) { await client.query('ROLLBACK'); return res.status(400).json({ error: result.error }) }
    await persistMutable(client, result.db)
    await client.query('COMMIT')
    res.json({ db: result.db, id: result.id ?? null })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    next(err)
  } finally {
    client.release()
  }
})

// ---- API discovery index ---------------------------------------------------
app.get('/api', (_req, res) => {
  res.json({
    app: 'Athens EVRO',
    description: 'Enterprise Value Realization Office — cost-management PoC. Return-maximization model (no target).',
    endpoints: { health: '/api/health', db: '/api/db', exec: '/api/exec', portfolio: '/api/portfolio', action: 'POST /api/action', overview: '/overview', llms: '/llms.txt' },
  })
})

// ---- server-rendered surfaces ----------------------------------------------
app.get('/overview', async (_req, res, next) => {
  try { res.type('html').send(renderOverviewHTML(await loadDb())) } catch (err) { next(err) }
})
app.get('/llms.txt', async (req, res, next) => {
  try { res.type('text/plain').send(renderLlmsTxt(await loadDb(), { baseUrl: `${req.protocol}://${req.get('host')}` })) } catch (err) { next(err) }
})

// ---- serve the built SPA (single-host) -------------------------------------
if (PROD) {
  const dist = path.resolve(__dirname, '../../frontend/dist')
  app.use(express.static(dist))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Internal server error', detail: err.message }) })

migrate()
  .catch((err) => console.error('[migrate] error (continuing):', err.message))
  .finally(() => app.listen(PORT, () => console.log(`Athens EVRO API on http://localhost:${PORT}`)))
