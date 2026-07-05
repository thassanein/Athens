// Enterprise Pulse (Phase 5B Wave 3) — deterministic value-health signals for
// the Executive Cockpit. Composes existing engine exports into a six-axis Value
// Radar and a single pulse index. View-only: no engine/mutation/schema change.
// 5B.5 Wave 4 adds the interactive layer: scenario-stressed axes, per-axis
// confidence grounding, and axis drill-throughs (with dependency flags).
import { enterpriseRollup, isActive, rav, realizedYTD, recurringRatio, sizedOpportunities, REALIZING_STAGES, STAGES } from './engine.js'

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

// ---------------------------------------------------------------------------
// Interactive Value Radar (5B.5 item 7) — scenario stress, confidence, drill.
// ---------------------------------------------------------------------------

// Radar axes recomputed under a scenario lens. Only forward-looking axes move
// (forecast × realization multiplier, adoption factor on durability, pipeline
// share of opportunity); momentum / risk control / diversification are facts
// of the current book and stay put — that stability is itself the message.
export function stressedAxes(db, scen) {
  const base = enterprisePulse(db)
  const m = (scen?.assumptions?.realization_multiplier ?? 1) * (scen?.assumptions?.adoption_factor ?? 1)
  const af = scen?.assumptions?.adoption_factor ?? 1
  if (m === 1 && af === 1) return base.axes
  const roll = base.roll
  return base.axes.map((a) => {
    if (a.key === 'realization') return { ...a, value: clamp01(roll.realizedYTD / Math.max(1, roll.realizedYTD + roll.forecastRemainderFY * m)) }
    if (a.key === 'coverage') return { ...a, value: clamp01((roll.raPipeline * m) / Math.max(1, roll.raPipeline * m + roll.identifiedOpportunity)) }
    if (a.key === 'durability') return { ...a, value: clamp01(a.value * af) }
    return a
  })
}

// Per-axis confidence — how well-grounded each dimension is, computed from the
// data itself (validation coverage, countermeasure coverage, baseline coverage).
// Coverage sizing is flagged lower because opportunity bands are illustrative,
// pending Supply Chain / FP&A validation (savings_pct_config.basis).
export function axisConfidence(db) {
  const acts = db.initiatives.flatMap((i) => i.actuals || [])
  const validated = acts.filter((a) => a.validated).length
  const high = db.initiatives.flatMap((i) => (i.risks || []).filter((r) => r.score >= 15))
  const countered = high.filter((r) => (r.countermeasure || '').trim()).length
  const active = db.initiatives.filter(isActive)
  const baselined = active.filter((i) => i.baseline?.validated_by).length
  return {
    realization: acts.length ? validated / acts.length : 1,
    coverage: 0.6,
    momentum: 1,
    riskControl: high.length ? countered / high.length : 1,
    diversification: 1,
    durability: active.length ? baselined / active.length : 1,
  }
}
const CONF_NOTE = {
  realization: 'share of monthly actuals FP&A-validated',
  coverage: 'opportunity sizing is illustrative — pending FP&A validation',
  momentum: 'stage positions are fact',
  riskControl: 'share of high risks with a countermeasure',
  diversification: 'current book composition is fact',
  durability: 'share of active initiatives with a validated baseline',
}
export const confNote = (key) => CONF_NOTE[key] || ''

// Drill-through: the concrete items behind an axis. Rows carry an optional
// `blocked` flag when the initiative is the target of an undelivered 'blocks'
// dependency — the dependency view woven into the radar.
export function axisDrill(db, key) {
  const active = db.initiatives.filter(isActive)
  const launchIdx = STAGES.indexOf('launch')
  const byId = Object.fromEntries(db.initiatives.map((i) => [i.id, i]))
  const isDepBlocked = (id) => (db.dependencies || []).some((e) => {
    if (e.type !== 'blocks' || e.to !== id) return false
    const from = byId[e.from]
    return from && isActive(from) && STAGES.indexOf(from.stage) < launchIdx
  })
  const initRows = (list, val) => list
    .map((i) => ({ id: i.id, label: i.title, value: val(i), blocked: isDepBlocked(i.id), nav: 'initiative' }))
    .sort((a, b) => b.value - a.value).slice(0, 6)
  switch (key) {
    case 'realization':
      return { title: 'Top realized value (validated)', rows: initRows(db.initiatives.filter((i) => realizedYTD(i, db) > 0), (i) => realizedYTD(i, db)) }
    case 'coverage':
      return { title: 'Largest unclaimed opportunities', rows: sizedOpportunities(db).filter((o) => o.status === 'open').sort((a, b) => b.midpoint - a.midpoint).slice(0, 6).map((o) => ({ id: o.id, label: o.groupName || o.title, value: o.midpoint, nav: 'opportunities' })) }
    case 'momentum':
      return { title: 'Value at Capability and beyond', rows: initRows(active.filter((i) => i.stage === 'capability' || REALIZING_STAGES.includes(i.stage)), rav) }
    case 'riskControl':
      return { title: 'Red initiatives by risk-adjusted value', rows: initRows(active.filter((i) => i.status_rag === 'red'), rav) }
    case 'diversification': {
      const by = {}
      let total = 0
      for (const i of active) { const v = rav(i); if (v > 0) { by[i.business_unit || '—'] = (by[i.business_unit || '—'] || 0) + v; total += v } }
      return { title: 'Risk-adjusted value by business unit', rows: Object.entries(by).map(([label, value]) => ({ id: null, label, value, share: total ? value / total : 0 })).sort((a, b) => b.value - a.value) }
    }
    case 'durability':
      return { title: 'Top recurring value', rows: initRows(active.filter((i) => recurringRatio(i) > 0), (i) => rav(i) * recurringRatio(i)) }
    default:
      return { title: '', rows: [] }
  }
}
