// Data source detection + client. Tries the live API (GET /api/db); on any
// failure falls back to the bundled snapshot + localStorage (demo/offline mode,
// fully functional with no backend — same idea as the facilities app).
import { SEED } from './seed-snapshot.js'

const LS_KEY = 'evro.db.v1'
const TIMEOUT = 6000
const clone = (o) => JSON.parse(JSON.stringify(o))

// Backfill any top-level collections added since a cached db was written, from
// the bundled snapshot. Additive-only: a returning demo user keeps their edits
// but still gains new entities (e.g. Phase 5B org/knowledge/scenario tables)
// without a destructive localStorage version bump.
function withSchemaBackfill(db) {
  if (!db || typeof db !== 'object') return clone(SEED)
  for (const k of Object.keys(SEED)) {
    if (db[k] === undefined) db[k] = clone(SEED[k])
  }
  return db
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return withSchemaBackfill(JSON.parse(raw))
  } catch { /* ignore */ }
  return clone(SEED)
}
export function saveLocal(db) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch { /* non-fatal */ }
}
export function resetLocal() {
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}

// Returns { db, source } where source is 'postgres' | 'local'.
export async function loadDB() {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    const res = await fetch('/api/db', { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) throw new Error('bad status')
    const db = await res.json()
    return { db, source: 'postgres' }
  } catch {
    clearTimeout(t)
    return { db: loadLocal(), source: 'local' }
  }
}

// Post a mutation action to the server (postgres mode). Returns the updated db.
export async function postAction(action, payload) {
  const res = await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  })
  if (!res.ok) throw new Error(`action failed: ${res.status}`)
  return res.json()
}
