// Enterprise value decomposition (5B.7 items 4 + 8) — the executive waterfall
// (Potential → Risk → Adoption → Leakage → Net realizable, with the validated
// Realized landing) and the Strategic Value Map (functions → initiatives →
// outcomes with dependency tracing). Pure composition of engine outputs —
// every step reconciles exactly to rav()/leakageBreakdown(); deterministic,
// view-only, no engine change.
import {
  isActive, rav, confidence, realizedYTD, forecastRemainderFY,
  leakageBreakdown, personName, depEdges, worstRisk,
} from './engine.js'
import { scenarios, defaultScenario } from './model.js'

const sum = (list, f) => list.reduce((a, x) => a + f(x), 0)

// ---------------------------------------------------------------------------
// Enterprise Value Waterfall. Exact identity per initiative:
//   gross = gross(1−conf) + gross·conf(1−rf) + rav
// so Potential − Risk − Adoption ≡ Σ rav to the dollar. Leakage then nets the
// risk-adjusted book down to what is genuinely realizable; Realized (validated
// YTD) is shown as the landing, with the remainder still forecast to land.
// Scenario lenses reuse the seeded forecast-scenario assumptions.
// ---------------------------------------------------------------------------
export function valueWaterfall(db, scenKey) {
  const scen = scenarios(db).find((s) => s.key === scenKey) || defaultScenario(db)
  const a = scen?.assumptions || { realization_multiplier: 1, adoption_factor: 1 }
  const active = db.initiatives.filter(isActive)

  const adjRf = (i) => Math.min(1, (i.realization_factor ?? 1) * (a.adoption_factor ?? 1))
  const potential = sum(active, (i) => i.gross_annual_value)
  const riskDiscount = sum(active, (i) => i.gross_annual_value * (1 - confidence(i.stage)))
  const adoptionDrag = sum(active, (i) => i.gross_annual_value * confidence(i.stage) * (1 - adjRf(i)))
  const raValue = (potential - riskDiscount - adoptionDrag) * (a.realization_multiplier ?? 1)
  const leak = leakageBreakdown(db)
  // Leakage under a scenario lens scales with delivery: better execution
  // recovers timing leakage proportionally.
  const leakTotal = leak.total * (2 - (a.realization_multiplier ?? 1))
  const net = Math.max(0, raValue - leakTotal)
  const realized = sum(db.initiatives, (i) => realizedYTD(i, db))

  const top = (val, extra) => active
    .map((i) => ({ id: i.id, title: i.title, owner: personName(db, i.owner_id), value: val(i), ...(extra ? extra(i) : {}) }))
    .filter((r) => r.value > 500)
    .sort((x, y) => y.value - x.value).slice(0, 6)

  return {
    scenario: scen ? { key: scen.key, name: scen.name, description: scen.description } : null,
    steps: [
      { key: 'potential', label: 'Potential value', value: potential, kind: 'start', note: 'gross annual value of the active book',
        drill: top((i) => i.gross_annual_value) },
      { key: 'risk', label: 'Stage risk', value: -riskDiscount, kind: 'down', note: 'discounted for stage confidence — earn it back by advancing gates',
        drill: top((i) => i.gross_annual_value * (1 - confidence(i.stage)), (i) => ({ sub: `${Math.round(confidence(i.stage) * 100)}% stage confidence` })) },
      { key: 'adoption', label: 'Adoption drag', value: -adoptionDrag, kind: 'down', note: 'value the organization isn’t yet capturing in practice',
        drill: top((i) => i.gross_annual_value * confidence(i.stage) * (1 - adjRf(i)), (i) => ({ sub: `${Math.round(adjRf(i) * 100)}% realization factor` })) },
      { key: 'ra', label: 'Risk-adjusted value', value: raValue, kind: 'mid', note: 'the credible annual book (RAV)' },
      { key: 'leakage', label: 'Value leakage', value: -leakTotal, kind: 'down', note: 'negotiated or expected value not flowing — timing + contract',
        drill: leak.items.slice(0, 6).map((l) => ({ id: l.id, title: l.title, owner: personName(db, (db.initiatives.find((i) => i.id === l.id) || {}).owner_id), value: l.total, sub: `${money0(l.timing)} timing · ${money0(Math.max(0, l.contract - l.timing))} contract` })) },
      { key: 'net', label: 'Net realizable', value: net, kind: 'mid', note: 'what should genuinely land at run-rate' },
      { key: 'realized', label: 'Realized (validated)', value: realized, kind: 'end', note: 'FP&A-validated actuals YTD — the rest is still forecast',
        drill: top((i) => realizedYTD(i, db)) },
    ],
    potential, raValue, leakTotal, net, realized,
  }
}

// tiny local formatter for drill subs (avoids importing format into a lib
// consumed by both chart + page)
const money0 = (n) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`)

export const WATERFALL_SCENARIOS = (db) => scenarios(db).filter((s) => !s.editable || s.key === 'custom')

// ---------------------------------------------------------------------------
// Strategic Value Map — functions (departments) → initiatives → outcomes, with
// dependency edges between initiatives. Node sizes are FY value (realized +
// risk-adjusted forecast); states colour the map: realizing / building /
// at-risk / leaking. Cap the middle column at the top initiatives by value and
// pool the tail into one labelled node (never silently dropped).
// ---------------------------------------------------------------------------
export const MAP_STATES = {
  leaking: { label: 'Leaking', tone: 'var(--amber)' },
  atrisk: { label: 'At risk', tone: 'var(--red)' },
  realizing: { label: 'Realizing', tone: 'var(--green)' },
  building: { label: 'Building', tone: 'var(--navy)' },
}
const OUTCOMES = [
  { key: 'realized', label: 'Realized (validated)' },
  { key: 'forecast', label: 'Forecast to land' },
  { key: 'atrisk', label: 'Value at risk' },
  { key: 'leaking', label: 'Leakage' },
]

export function strategicMap(db, { limit = 12 } = {}) {
  const active = db.initiatives.filter(isActive)
  const leak = leakageBreakdown(db)
  const leakById = Object.fromEntries(leak.items.map((l) => [l.id, l.total]))
  const fy = (i) => realizedYTD(i, db) + forecastRemainderFY(i, db)

  const stateOf = (i) => (leakById[i.id] > 1000 ? 'leaking' : i.status_rag === 'red' ? 'atrisk'
    : ['launch', 'realization', 'sustainment'].includes(i.stage) ? 'realizing' : 'building')

  const ranked = [...active].sort((x, y) => fy(y) - fy(x))
  const shown = ranked.slice(0, limit)
  const rest = ranked.slice(limit)

  const inits = shown.map((i) => ({
    id: i.id, title: i.title, dept: i.department || '—', owner: personName(db, i.owner_id),
    value: fy(i), realized: realizedYTD(i, db), forecast: forecastRemainderFY(i, db),
    atrisk: i.status_rag === 'red' ? rav(i) : 0, leak: leakById[i.id] || 0,
    state: stateOf(i), riskScore: worstRisk(i), stage: i.stage,
  }))
  if (rest.length) {
    inits.push({
      id: '__rest', title: `${rest.length} smaller initiatives`, dept: '—', owner: '—',
      value: sum(rest, fy), realized: sum(rest, (i) => realizedYTD(i, db)), forecast: sum(rest, (i) => forecastRemainderFY(i, db)),
      atrisk: sum(rest.filter((i) => i.status_rag === 'red'), rav), leak: sum(rest, (i) => leakById[i.id] || 0),
      state: 'building', riskScore: 0, stage: 'pooled', pooled: rest.map((i) => i.id),
    })
  }

  // functions column — departments, aggregated over ALL active initiatives
  const byDept = {}
  for (const i of active) (byDept[i.department || '—'] ||= []).push(i)
  const functions = Object.entries(byDept).map(([name, list]) => ({
    id: 'fn:' + name, name,
    value: sum(list, fy), leak: sum(list, (i) => leakById[i.id] || 0),
    atrisk: sum(list.filter((i) => i.status_rag === 'red'), rav), count: list.length,
  })).sort((x, y) => y.value - x.value)

  // outcomes column
  const outcomes = OUTCOMES.map((o) => ({ ...o, value: {
    realized: sum(active, (i) => realizedYTD(i, db)),
    forecast: sum(active, (i) => forecastRemainderFY(i, db)),
    atrisk: sum(active.filter((i) => i.status_rag === 'red'), rav),
    leaking: leak.total,
  }[o.key] }))

  // edges: function → initiative (weight = FY value), initiative → outcomes
  const deptOf = (n) => 'fn:' + (n.dept || '—')
  const edges = []
  for (const n of inits) {
    if (n.id !== '__rest') edges.push({ from: deptOf(n), to: n.id, w: n.value, kind: 'flow' })
    if (n.realized > 500) edges.push({ from: n.id, to: 'out:realized', w: n.realized, kind: 'flow' })
    if (n.forecast > 500) edges.push({ from: n.id, to: 'out:forecast', w: n.forecast, kind: 'flow' })
    if (n.atrisk > 500) edges.push({ from: n.id, to: 'out:atrisk', w: n.atrisk, kind: 'risk' })
    if (n.leak > 500) edges.push({ from: n.id, to: 'out:leaking', w: n.leak, kind: 'leak' })
  }
  // dependency edges between shown initiatives (blocks only — the traceable kind)
  const shownIds = new Set(inits.map((n) => n.id))
  const deps = depEdges(db).filter((e) => e.type === 'blocks' && shownIds.has(e.from) && shownIds.has(e.to))
    .map((e) => ({ from: e.from, to: e.to, kind: 'dep' }))

  return { functions, inits, outcomes, edges, deps, pooled: rest.length }
}

// Trace the connected neighbourhood of a node: its edges, dependency chain
// (both directions, transitively), and the touched functions/outcomes.
export function traceMap(map, nodeId) {
  if (!nodeId) return null
  const keep = new Set([nodeId])
  if (nodeId.startsWith('fn:')) for (const e of map.edges) { if (e.from === nodeId) keep.add(e.to) }
  if (nodeId.startsWith('out:')) for (const e of map.edges) { if (e.to === nodeId) keep.add(e.from) }
  // dependency closure in both directions
  let grew = true
  while (grew) {
    grew = false
    for (const d of map.deps) {
      if (keep.has(d.from) && !keep.has(d.to)) { keep.add(d.to); grew = true }
      if (keep.has(d.to) && !keep.has(d.from)) { keep.add(d.from); grew = true }
    }
  }
  // pull in the columns each kept initiative touches
  for (const e of map.edges) if (keep.has(e.from) && e.to.startsWith('out:')) keep.add(e.to)
  for (const e of map.edges) if (keep.has(e.to) && e.from.startsWith('fn:')) keep.add(e.from)
  return keep
}
