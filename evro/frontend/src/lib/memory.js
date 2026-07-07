// Executive Memory v1 (6D Wave 4) — a TRANSPARENT preference and behaviour
// layer. Client-side (localStorage), explainable, editable, and respectful:
// it remembers only how you use EVRO — which views you open, your explanation
// depth, your preferred focus mode, widgets you've hidden, your narrative
// audience — never anything personal, never any portfolio value. Every
// remembered fact carries a plain "remembered because…" and can be cleared
// one item at a time or wiped entirely. Nothing here gates value math.
const KEY = 'evro.memory.v1'

const EMPTY = { views: {}, prefs: {}, dismissed: [], updatedAt: null }

function read() {
  if (typeof localStorage === 'undefined') return { ...EMPTY }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!raw || typeof raw !== 'object') return { ...EMPTY }
    return { ...EMPTY, ...raw, views: raw.views || {}, prefs: raw.prefs || {}, dismissed: raw.dismissed || [] }
  } catch { return { ...EMPTY } }
}
function write(m) {
  if (typeof localStorage === 'undefined') return
  // NOTE: `stamp` is passed in (never Date.now here) so the store stays
  // deterministic under test; callers that care pass db.meta.now.
  try { localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* private mode */ }
}

// record a view visit. stamp is an ISO date the caller supplies (db.meta.now).
export function recordView(pageKey, stamp = null) {
  if (!pageKey) return
  const m = read()
  m.views[pageKey] = (m.views[pageKey] || 0) + 1
  if (stamp) m.updatedAt = stamp
  write(m)
}

export function setPref(k, v, stamp = null) { const m = read(); m.prefs[k] = v; if (stamp) m.updatedAt = stamp; write(m); return m }
export function getPref(k) { return read().prefs[k] }
export function dismissWidget(id, stamp = null) { const m = read(); if (!m.dismissed.includes(id)) m.dismissed.push(id); if (stamp) m.updatedAt = stamp; write(m); return m }
export function isDismissed(id) { return read().dismissed.includes(id) }

export function topViews(n = 4) {
  const m = read()
  return Object.entries(m.views).sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }))
}

export function memorySnapshot() { return read() }

// Clear one remembered thing (by entry id) or everything.
export function clearMemory(entryId) {
  const m = read()
  if (entryId === 'views') m.views = {}
  else if (entryId === 'dismissed') m.dismissed = []
  else if (entryId && entryId.startsWith('pref:')) delete m.prefs[entryId.slice(5)]
  write(m)
  return m
}
export function resetMemory() { write({ ...EMPTY, views: {}, prefs: {}, dismissed: [] }); return read() }

// The display model — every remembered fact with its plain-language "because".
// `labelFor` maps page keys to their nav labels (passed in to avoid a nav
// import cycle). Returns [] when nothing is remembered yet (the empty state).
export function memoryEntries(labelFor = (k) => k) {
  const m = read()
  const out = []
  const top = topViews(4)
  if (top.length) {
    out.push({
      id: 'views', label: 'Frequently opened views',
      value: top.map((v) => `${labelFor(v.key)} (${v.count})`).join(' · '),
      because: 'You have opened these views most often this session — EVRO surfaces them first.',
    })
  }
  if (m.prefs.depth) out.push({ id: 'pref:depth', label: 'Explanation depth', value: String(m.prefs.depth), because: 'You set this depth on the Knowledge Layer; EVRO keeps it across screens.' })
  if (m.prefs.focus) out.push({ id: 'pref:focus', label: 'Preferred focus mode', value: String(m.prefs.focus), because: 'You last read the enterprise in this focus mode.' })
  if (m.prefs.narrative) out.push({ id: 'pref:narrative', label: 'Narrative audience', value: String(m.prefs.narrative), because: 'You last read the executive narrative in this mode.' })
  if (m.dismissed.length) out.push({ id: 'dismissed', label: 'Hidden widgets', value: `${m.dismissed.length} hidden`, because: 'You dismissed these — EVRO keeps them out of the way until you restore them.' })
  return out
}
