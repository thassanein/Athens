// Executive Focus Modes + Mission Lifecycle (6D Wave 5).
//
// Focus modes REORDER and RE-EMPHASISE the same mission queue for each
// executive seat — they never fork the product or hide the work. The CFO sees
// exposure first, the COO sees what's moving, the Program leader sees the
// critical path — same missions, different lead. The chosen mode is
// remembered by Executive Memory.
//
// Mission lifecycle maps each mission onto the create→retrospect track using
// the linked initiative's real stage and the deterministic mission profile —
// nothing invented. View-layer only.
import { missionProfile } from './mission-engine.js'

export const FOCUS_MODES = [
  { key: 'ceo', label: 'CEO', gloss: 'Value & decisions', changes: 'Decisions on you lead, then the biggest value at stake.' },
  { key: 'cfo', label: 'CFO', gloss: 'Risk & value', changes: 'Value at risk and blocked value lead; opportunity follows.' },
  { key: 'coo', label: 'COO', gloss: 'Execution', changes: "What's in motion and what's stuck lead, by strategic weight." },
  { key: 'chro', label: 'CHRO', gloss: 'Ownership', changes: 'Owner-attributed missions lead — who carries what.' },
  { key: 'regional', label: 'Regional', gloss: 'Geography', changes: 'Grouped and led by region.' },
  { key: 'bu', label: 'BU leader', gloss: 'Business unit', changes: 'Grouped and led by business unit.' },
  { key: 'program', label: 'Program', gloss: 'Delivery', changes: 'Critical path and highest strategic weight lead.' },
]
export const focusMode = (key) => FOCUS_MODES.find((m) => m.key === key) || FOCUS_MODES[0]

const linkedInit = (db, m) => (m.refId && String(m.refId).startsWith('i-') ? db.initiatives.find((i) => i.id === m.refId) : null)
const byValue = (a, b) => (b.value || 0) - (a.value || 0)

// Reorder a mission list for a focus mode. The SAME missions come back —
// only the order changes. Profiles are computed once and cached.
export function orderMissions(missions, db, mode = 'ceo') {
  const cache = new Map()
  const P = (m) => { if (!cache.has(m.key)) cache.set(m.key, missionProfile(db, m)); return cache.get(m.key) }
  const MV = { moving: 0, blocked: 1, escalated: 2, open: 3 }
  const cmps = {
    ceo: (a, b) => (a.cls === 'decision' ? 0 : 1) - (b.cls === 'decision' ? 0 : 1) || byValue(a, b),
    cfo: (a, b) => (['risk', 'blocked'].includes(a.cls) ? 0 : 1) - (['risk', 'blocked'].includes(b.cls) ? 0 : 1) || byValue(a, b),
    coo: (a, b) => (MV[P(a).progression.key] - MV[P(b).progression.key]) || (P(b).weight - P(a).weight) || byValue(a, b),
    chro: (a, b) => (linkedInit(db, a) ? 0 : 1) - (linkedInit(db, b) ? 0 : 1) || byValue(a, b),
    regional: (a, b) => (linkedInit(db, a)?.region || '~~').localeCompare(linkedInit(db, b)?.region || '~~') || byValue(a, b),
    bu: (a, b) => (linkedInit(db, a)?.business_unit || '~~').localeCompare(linkedInit(db, b)?.business_unit || '~~') || byValue(a, b),
    program: (a, b) => (P(b).weight - P(a).weight) || (P(b).probability - P(a).probability) || byValue(a, b),
  }
  return [...missions].sort(cmps[mode] || cmps.ceo)
}

// A concrete "what leads" summary for the chosen mode, grounded in the data.
export function focusLead(missions, db, mode) {
  const linked = missions.map((m) => linkedInit(db, m)).filter(Boolean)
  if (mode === 'regional') {
    const top = topCount(linked.map((i) => i.region).filter((r) => r && r !== 'Enterprise'))
    return top ? `Leading region: ${top.k} (${top.n} initiative-backed missions)` : null
  }
  if (mode === 'bu') {
    const top = topCount(linked.map((i) => i.business_unit).filter(Boolean))
    return top ? `Leading business unit: ${top.k} (${top.n})` : null
  }
  return null
}
function topCount(arr) {
  const m = {}
  for (const x of arr) m[x] = (m[x] || 0) + 1
  const e = Object.entries(m).sort((a, b) => b[1] - a[1])[0]
  return e ? { k: e[0], n: e[1] } : null
}

// ---------------------------------------------------------------------------
// Mission lifecycle — the create→retrospect track. Risk is an overlay, not a
// linear phase (a mission can be at risk at any point).
export const LIFECYCLE = [
  { key: 'create', label: 'Create' },
  { key: 'plan', label: 'Plan' },
  { key: 'activate', label: 'Activate' },
  { key: 'monitor', label: 'Monitor' },
  { key: 'complete', label: 'Complete' },
  { key: 'retrospect', label: 'Retrospect' },
]
const STAGE_PHASE = {
  proposed: 'create', idea: 'plan', feasibility: 'activate', capability: 'activate',
  launch: 'monitor', realization: 'monitor', sustainment: 'retrospect', retired: 'retrospect',
}
const CLS_PHASE = { ai: 'create', opportunity: 'plan', decision: 'activate', blocked: 'monitor', risk: 'monitor' }

export function missionLifecycle(db, m) {
  const i = linkedInit(db, m)
  const prof = missionProfile(db, m)
  const currentKey = i ? (STAGE_PHASE[i.stage] || 'plan') : (CLS_PHASE[m.cls] || 'plan')
  const idx = LIFECYCLE.findIndex((p) => p.key === currentKey)
  const phases = LIFECYCLE.map((p, k) => ({ ...p, done: k < idx, current: k === idx }))
  const risk = (i && i.status_rag === 'red') || ['risk', 'blocked'].includes(m.cls) || ['blocked', 'escalated'].includes(prof.progression.key)
  const owner = i ? (db.people.find((p) => p.id === i.owner_id) || {}).name || 'unassigned' : 'unassigned — needs one'
  return {
    phases, currentKey, risk, owner, profile: prof, value: m.value || 0,
    linkedTitle: i ? i.title : null, stageLabel: i ? i.stage : m.cls,
  }
}
