// API client + data-source detection.
//
// On load the app probes /auth/me (with a timeout + cold-start retry), then
// GET /api/sites. Success → live PostgreSQL mode. Failure → bundled snapshot +
// localStorage (demo/offline).
// The active mode is surfaced in Profile → "Data source".
import { SNAPSHOT } from './sitedata.js'

const TIMEOUT_MS = 6000 // generous: server presence is already gated by fetchMe()
const LS_KEY = 'athens.portfolio.v1'
const BASE = import.meta.env.BASE_URL // '/' on the single-host deploy, '/Athens/' on Pages

/**
 * Determine the auth situation by calling the server's /auth/me:
 *   - 'authed' → signed in (or server is in open/dev mode); returns the user.
 *   - 'login'  → server requires Microsoft sign-in (HTTP 401).
 *   - 'demo'   → no server reachable (e.g. GitHub Pages) → snapshot + demo logins.
 */
export async function fetchMe(timeoutMs = 8000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}auth/me`, { credentials: 'include', signal: ctrl.signal })
    clearTimeout(t)
    if (res.status === 401) {
      let mode = 'sso'
      try {
        mode = (await res.json()).mode || 'sso'
      } catch {
        /* default */
      }
      return { state: 'login', mode }
    }
    if (!res.ok) return { state: 'demo' } // got a response but no API here (e.g. Pages 404)
    const user = await res.json()
    // Open/public server → show the Auditor/Viewer chooser (role is picked on
    // the client); live data still loads from the open API.
    if (user.mode === 'open') return { state: 'demo' }
    return { state: 'authed', user }
  } catch (e) {
    clearTimeout(t)
    // timedOut means the request was aborted — the server is unreachable/cold,
    // which is worth retrying (a sleeping free-tier service waking up). Other
    // failures (fast network error / no server) are treated as plain demo.
    return { state: 'demo', timedOut: e.name === 'AbortError' }
  }
}

// Passcode login (passcode mode). Returns true on success.
export async function submitPasscode(passcode) {
  try {
    const res = await fetch(`${BASE}auth/passcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ passcode }),
    })
    return res.ok
  } catch {
    return false
  }
}

export const authLoginUrl = `${BASE}auth/login`
export const authLogoutUrl = `${BASE}auth/logout`

function withTimeout(promise, ms) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  return { signal: ctrl.signal, done: () => clearTimeout(t) }
}

async function fetchJSON(url, opts = {}, ms = 8000) {
  const { signal, done } = withTimeout(fetch, ms)
  try {
    const res = await fetch(url, { ...opts, signal })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return await res.json()
  } finally {
    done()
  }
}

// Deep clone so screens can hold local edits without mutating the snapshot.
const clone = (o) => JSON.parse(JSON.stringify(o))

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return clone(SNAPSHOT)
}

export function saveLocal(data) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch {
    /* storage full / unavailable — non-fatal in demo mode */
  }
}

/**
 * Loads the whole portfolio. Returns { data, source } where source is
 * 'postgres' | 'local'.
 */
export async function loadPortfolio() {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('/api/sites', { signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) throw new Error('bad status ' + res.status)
    const data = await res.json()
    return { data, source: 'postgres' }
  } catch {
    clearTimeout(t)
    return { data: loadLocal(), source: 'local' }
  }
}

// ---- Writes ----------------------------------------------------------------
// In postgres mode they hit the API; in local mode the caller persists to
// localStorage. Each returns the server row (postgres) or null (local).

export async function patchChecklist(id, patch, source) {
  if (source !== 'postgres') return null
  return fetchJSON(`/api/checklist/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export async function postFinding(finding, source) {
  if (source !== 'postgres') return null
  return fetchJSON('/api/findings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(finding),
  })
}

export async function patchPermit(id, status, source) {
  if (source !== 'postgres') return null
  return fetchJSON(`/api/permits/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

// ---- Audits (server-persisted; AuditRunner falls back to localStorage) -----
export function listAudits(params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
  return fetchJSON(`/api/audits${q ? `?${q}` : ''}`)
}

export function getAudit(id) {
  return fetchJSON(`/api/audits/${encodeURIComponent(id)}`)
}

export function createAudit(site, template) {
  return fetchJSON('/api/audits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site, template }),
  })
}

export function saveAudit(id, body) {
  return fetchJSON(`/api/audits/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function deleteAudit(id) {
  return fetchJSON(`/api/audits/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
