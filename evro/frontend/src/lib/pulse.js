// Enterprise Pulse (Phase 5B Wave 3) — deterministic value-health signals for
// the Executive Cockpit. Composes existing engine exports into a six-axis Value
// Radar and a single pulse index. View-only: no engine/mutation/schema change.
import { enterpriseRollup, isActive, rav } from './engine.js'

const clamp01 = (v) => Math.max(0, Math.min(1, isFinite(v) ? v : 0))

// Herfindahl concentration (0..1) of risk-adjusted value across a dimension.
function hhi(active, key) {
  const by = {}
  let total = 0
  for (const i of active) { const v = rav(i); if (v <= 0) continue; by[i[key] || '—'] = (by[i[key] || '—'] || 0) + v; total += v }
  if (total <= 0) return 0
  return Object.values(by).reduce((a, v) => a + (v / total) ** 2, 0)
}

// The six Value Radar dimensions (each 0..1) + the blended pulse index (0..100).
export function enterprisePulse(db) {
  const roll = enterpriseRollup(db)
  const active = db.initiatives.filter(isActive)
  const n = Math.max(1, active.length)

  const realization = clamp01(roll.realizedYTD / Math.max(1, roll.realizedYTD + roll.forecastRemainderFY))
  const coverage = clamp01(roll.raPipeline / Math.max(1, roll.raPipeline + roll.identifiedOpportunity))
  const mature = active.filter((i) => ['capability', 'launch', 'realization', 'sustainment'].includes(i.stage)).length
  const momentum = clamp01(mature / n)
  const red = active.filter((i) => i.status_rag === 'red').length
  const riskControl = clamp01(1 - red / n)
  const diversification = clamp01(1 - hhi(active, 'business_unit'))
  const durability = clamp01(roll.recurringSplit.recurring / Math.max(1, roll.recurringSplit.recurring + roll.recurringSplit.oneTime))

  const axes = [
    { key: 'realization', label: 'Realization', value: realization },
    { key: 'coverage', label: 'Coverage', value: coverage },
    { key: 'momentum', label: 'Momentum', value: momentum },
    { key: 'riskControl', label: 'Risk control', value: riskControl },
    { key: 'diversification', label: 'Diversification', value: diversification },
    { key: 'durability', label: 'Durability', value: durability },
  ]
  const index = Math.round((axes.reduce((a, x) => a + x.value, 0) / axes.length) * 100)
  const band = index >= 66 ? 'strong' : index >= 45 ? 'steady' : 'fragile'
  return { axes, index, band, roll, activeCount: active.length, redCount: red }
}

const AXIS_NOTE = {
  realization: 'Share of value already realized vs still forecast.',
  coverage: 'How much identified opportunity is already in plan.',
  momentum: 'Share of active initiatives at Capability or beyond.',
  riskControl: 'Share of active initiatives not flagged red.',
  diversification: 'Spread of value across business units (1 − concentration).',
  durability: 'Recurring share of risk-adjusted value.',
}
export const axisNote = (key) => AXIS_NOTE[key] || ''
