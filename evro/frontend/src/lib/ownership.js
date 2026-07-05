// Opportunity & Risk Ownership (5B.6 item 4) — accountability boards grouping
// the live portfolio by executive owner, business unit, region, or function:
// value at stake, realization progress, red/leaking exposure, aging, approval
// hygiene, and escalations already raised. View-only; escalation itself uses
// the existing addComment mutation (audit-logged, @mention parsed).
import { isActive, rav, realizedYTD, totalFY, personName, leakageBreakdown } from './engine.js'

export const OWNER_DIMS = [
  { key: 'owner', label: 'Executive owner' },
  { key: 'business_unit', label: 'Business unit' },
  { key: 'region', label: 'Region' },
  { key: 'department', label: 'Function' },
]

const daysSince = (db, iso) => {
  if (!iso) return null
  const d = (new Date(db.meta?.now || '2026-06-30') - new Date(String(iso).slice(0, 10))) / 86400000
  return Number.isFinite(d) ? Math.max(0, Math.round(d)) : null
}

export function ownershipBoard(db, dim = 'owner') {
  const leak = leakageBreakdown(db)
  const leakById = Object.fromEntries(leak.items.map((l) => [l.id, l.total]))
  const groups = {}
  for (const i of db.initiatives.filter(isActive)) {
    const key = dim === 'owner' ? i.owner_id : i[dim] || '—'
    const g = (groups[key] ||= {
      key, label: dim === 'owner' ? personName(db, i.owner_id) : key, ownerId: dim === 'owner' ? i.owner_id : null,
      count: 0, atStake: 0, realized: 0, totalFY: 0, red: 0, leaking: 0, pending: 0,
      ages: [], acts: 0, actsValidated: 0, escalations: 0, initiatives: [],
    })
    g.count += 1
    g.atStake += rav(i)
    g.realized += realizedYTD(i, db)
    g.totalFY += totalFY(i, db)
    if (i.status_rag === 'red') { g.red += 1; const a = daysSince(db, i.start_date); if (a != null) g.ages.push(a) }
    g.leaking += leakById[i.id] || 0
    if (i.request) g.pending += 1
    for (const a of i.actuals || []) { g.acts += 1; if (a.validated) g.actsValidated += 1 }
    g.escalations += (i.comments || []).filter((c) => (c.text || '').startsWith('Escalation:')).length
    g.initiatives.push(i)
  }
  const rows = Object.values(groups).map((g) => ({
    ...g,
    avgRedAge: g.ages.length ? Math.round(g.ages.reduce((a, b) => a + b, 0) / g.ages.length) : null,
    hygiene: g.acts ? g.actsValidated / g.acts : null, // share of actuals FP&A-validated
    progress: g.totalFY ? Math.min(1, g.realized / g.totalFY) : 0,
  }))
  rows.sort((a, b) => b.atStake - a.atStake)
  return {
    rows,
    totals: {
      atStake: rows.reduce((a, r) => a + r.atStake, 0),
      red: rows.reduce((a, r) => a + r.red, 0),
      leaking: rows.reduce((a, r) => a + r.leaking, 0),
      escalations: rows.reduce((a, r) => a + r.escalations, 0),
    },
  }
}

// The record an escalation lands on: the group's largest red-or-leaking
// initiative (falls back to largest at stake).
export function escalationTarget(db, group) {
  const leak = leakageBreakdown(db)
  const leaking = new Set(leak.items.map((l) => l.id))
  const cands = group.initiatives.filter((i) => i.status_rag === 'red' || leaking.has(i.id))
  const pool = cands.length ? cands : group.initiatives
  return pool.slice().sort((a, b) => rav(b) - rav(a))[0] || null
}
