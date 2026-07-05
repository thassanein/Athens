// Local usage telemetry (5B.6 item 10) — page views and action counts, stored
// ONLY in this browser's localStorage. No data leaves the device; the Usage
// panel on the Integrations screen says so. This is the seam a real telemetry
// pipeline would replace.
const KEY = 'evro.telemetry'

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { pages: {}, actions: {} } } catch { return { pages: {}, actions: {} } } }
const save = (t) => { try { localStorage.setItem(KEY, JSON.stringify(t)) } catch { /* ignore */ } }

export function track(kind, name) {
  if (!name) return
  const t = load()
  const bucket = kind === 'page' ? 'pages' : kind === 'error' ? 'errors' : 'actions'
  t[bucket] = t[bucket] || {}
  t[bucket][name] = (t[bucket][name] || 0) + 1
  save(t)
}

export function usage() {
  const t = load()
  const top = (o) => Object.entries(o || {}).sort((a, b) => b[1] - a[1])
  return { pages: top(t.pages), actions: top(t.actions), errors: top(t.errors), totalViews: Object.values(t.pages || {}).reduce((a, b) => a + b, 0) }
}

export function resetUsage() { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }
