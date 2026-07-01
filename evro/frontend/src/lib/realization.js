// Benefits Realization Waterfall — view-only orchestration. Answers "where did
// the value go?" by decomposing YTD gross-potential into loss categories that
// reconcile exactly to validated realized value. Composes existing engine
// outputs (confidence, realization factor, leakage, realized) — no engine change.
import { isActive, confidence, realizedYTD, valueLeakage, personName } from './engine.js'

export const REAL_DIMS = [
  { key: 'business_unit', label: 'Business unit' },
  { key: 'region', label: 'Region' },
  { key: 'yard', label: 'Yard' },
  { key: 'owner', label: 'Owner' },
  { key: 'department', label: 'Department' },
]

function elapsedFraction(db) {
  const now = db.meta.now.slice(0, 7)
  const elapsed = db.meta.fyMonths.map((m) => m.slice(0, 7)).filter((m) => m <= now).length
  return Math.max(1 / 12, elapsed / 12)
}

// Decompose one population of initiatives (already filtered) into the staircase.
function decompose(pop, db, f) {
  let gross = 0, impl = 0, adopt = 0, leakRaw = 0, realized = 0
  for (const i of pop) {
    const g = i.gross_annual_value * f
    const c = confidence(i.stage)
    const rf = i.realization_factor ?? 1
    gross += g
    impl += g * (1 - c)
    adopt += g * c * (1 - rf)
    leakRaw += Math.max(0, valueLeakage(i, db)) * f
    realized += realizedYTD(i, db)
  }
  const preTiming = Math.max(0, gross - realized - impl - adopt)
  const leak = Math.min(leakRaw, preTiming)
  const timing = Math.max(0, preTiming - leak)
  return { gross, impl, timing, adopt, leak, realized, loss: gross - realized, recoverable: leak + adopt }
}

const dimValue = (i, key, db) => (key === 'owner' ? personName(db, i.owner_id) : (i[key] || '—'))

export function realizationWaterfall(db, { dimension = 'business_unit', filter = null } = {}) {
  const f = elapsedFraction(db)
  const all = db.initiatives.filter(isActive)
  const pop = filter ? all.filter((i) => dimValue(i, dimension, db) === filter) : all
  const d = decompose(pop, db, f)

  const steps = [
    { label: 'Gross value', value: d.gross, kind: 'base' },
    { label: 'Implementation loss', delta: -d.impl, recoverable: false },
    { label: 'Timing loss', delta: -d.timing, recoverable: false },
    { label: 'Adoption loss', delta: -d.adopt, recoverable: true },
    { label: 'Leakage', delta: -d.leak, recoverable: true },
    { label: 'Realized value', value: d.realized, kind: 'total' },
  ]

  // Breakdown by the chosen dimension (of the full population, unfiltered).
  const groups = {}
  for (const i of all) {
    const k = dimValue(i, dimension, db)
    ;(groups[k] ||= []).push(i)
  }
  const byDim = Object.entries(groups).map(([name, list]) => {
    const g = decompose(list, db, f)
    return { name, gross: g.gross, realized: g.realized, loss: g.loss, recoverable: g.recoverable, pct: g.gross ? g.realized / g.gross : 1, count: list.length }
  }).sort((a, b) => b.loss - a.loss)

  // Rules-based root cause + recovery on the largest loss category.
  const cats = [
    { key: 'impl', label: 'Implementation', value: d.impl, rec: 'Value is stuck pre-Launch. Accelerate feasibility→capability gate reviews and unblock the biggest pending initiatives.' },
    { key: 'timing', label: 'Timing', value: d.timing, rec: 'Value is ramping slower than plan. Pull launches forward and de-risk timing on the largest forecasts.' },
    { key: 'adopt', label: 'Adoption', value: d.adopt, rec: 'Realization factors are haircutting value — drive adoption and push real volume through the new contracts and processes.' },
    { key: 'leak', label: 'Leakage', value: d.leak, rec: 'Implemented run-rate trails negotiated price. Open recoveries on the top leaking contracts and verify volume flow.' },
  ].sort((a, b) => b.value - a.value)

  return { ...d, f, steps, byDim, dimension, filter, topLoss: cats[0], cats, count: pop.length }
}
