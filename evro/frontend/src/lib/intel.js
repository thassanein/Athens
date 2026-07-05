// Enterprise Intelligence (Phase 5B.7) — the unified Enterprise Health Score
// ("the credit score of the enterprise") and the Enterprise Pulse Narrative.
// Both are deterministic compositions of existing engine outputs — view-only,
// rules-based (no LLM), no engine/mutation/schema change. Dimensions without a
// real data feed are scored from labelled proxies, never invented numbers.
import {
  enterpriseRollup, controlTower, isActive, rav, REALIZING_STAGES,
  realizedYTD, expectedToDate, hasUnmitigatedHigh, sustainmentBook,
  decisionsRequired, personName, profileWeights,
} from './engine.js'
import { movementStats } from './movement.js'
import { buildTimeline } from './timeline.js'
import { money, pct, monthLabel } from './format.js'

const clamp01 = (v) => Math.max(0, Math.min(1, isFinite(v) ? v : 0))

// Credit-score style grade bands over the 0–100 index.
export const GRADE_BANDS = [
  { min: 90, grade: 'AAA', label: 'Exceptional' },
  { min: 80, grade: 'AA', label: 'Very strong' },
  { min: 70, grade: 'A', label: 'Strong' },
  { min: 60, grade: 'BBB', label: 'Adequate' },
  { min: 50, grade: 'BB', label: 'Watch' },
  { min: 40, grade: 'B', label: 'Vulnerable' },
  { min: 0, grade: 'CCC', label: 'Critical' },
]
export const gradeFor = (score) => GRADE_BANDS.find((b) => score >= b.min)

// Herfindahl concentration of a share list (0..1, higher = more concentrated).
const hhi = (shares) => shares.reduce((a, s) => a + s * s, 0)

// ---------------------------------------------------------------------------
// Enterprise Health Score — six dimensions, each 0..1 with an explicit formula
// and drivers, blended into one weighted 0–100 index. Benchmarks are
// ILLUSTRATIVE operating bands, labelled as such (pending Athens KPI defs).
// ---------------------------------------------------------------------------
export function enterpriseHealth(db) {
  const roll = enterpriseRollup(db)
  const ct = controlTower(db)
  const active = db.initiatives.filter(isActive)
  const n = Math.max(1, active.length)
  const sustain = sustainmentBook(db)
  const mv = movementStats(db)

  // Financial — is validated value landing, and is the pipeline economic?
  const realization = clamp01(roll.realizedYTD / Math.max(1, roll.realizedYTD + roll.forecastRemainderFY))
  const leakRatio = clamp01(1 - ct.leakage / Math.max(1, roll.realizedYTD + ct.leakage))
  const financial = 0.6 * realization + 0.4 * leakRatio

  // Operational — execution status + delivery vs the risk-adjusted plan.
  const rags = { green: 0, amber: 0, red: 0 }
  for (const i of active) rags[i.status_rag || 'green']++
  const ragScore = clamp01((rags.green + 0.5 * rags.amber) / n)
  const realizing = active.filter((i) => REALIZING_STAGES.includes(i.stage))
  const exp = realizing.reduce((a, i) => a + expectedToDate(i, db), 0)
  const act = realizing.reduce((a, i) => a + realizedYTD(i, db), 0)
  const delivery = exp > 0 ? clamp01(act / exp) : 0.6
  const operational = 0.5 * ragScore + 0.5 * delivery

  // Customer — PROXY: service-delivery health of the customer-facing book
  // (delivery vs plan + adoption-risk pressure + realization factor). Labelled
  // as a proxy until a real customer KPI feed (CSAT, complaints, retention).
  const cxBook = active.filter((i) => i.business_unit === 'Collection & Post-Collection')
  const cx = cxBook.length ? cxBook : active
  const cxRealizing = cx.filter((i) => REALIZING_STAGES.includes(i.stage))
  const cxExp = cxRealizing.reduce((a, i) => a + expectedToDate(i, db), 0)
  const cxDelivery = cxExp > 0 ? clamp01(cxRealizing.reduce((a, i) => a + realizedYTD(i, db), 0) / cxExp) : 0.6
  const cxAdoptionRisk = clamp01(cx.reduce((a, i) => a + Math.max(0, ...(i.risks || []).filter((r) => r.category === 'adoption' && r.status !== 'closed').map((r) => r.score / 25), 0), 0) / Math.max(1, cx.length))
  const cxRf = cx.reduce((a, i) => a + (i.realization_factor ?? 1), 0) / Math.max(1, cx.length)
  const customer = 0.5 * cxDelivery + 0.3 * (1 - cxAdoptionRisk) + 0.2 * clamp01(cxRf)

  // Workforce — PROXY: participation breadth + how evenly the value book is
  // spread across owners (keyperson concentration).
  const participation = clamp01(mv.participants / Math.max(1, mv.totalPeople))
  const byOwner = {}
  let totRav = 0
  for (const i of active) { const v = rav(i); byOwner[i.owner_id] = (byOwner[i.owner_id] || 0) + v; totRav += v }
  const conc = totRav > 0 ? hhi(Object.values(byOwner).map((v) => v / totRav)) : 0
  const workforce = 0.6 * participation + 0.4 * (1 - clamp01(conc))

  // Transformation — how much of the book has crossed into realizing stages,
  // and whether new opportunity keeps the funnel fed.
  const activeRav = active.reduce((a, i) => a + rav(i), 0)
  const realizingRav = realizing.reduce((a, i) => a + rav(i), 0)
  const crossed = clamp01(activeRav ? realizingRav / activeRav : 0)
  const feed = clamp01(roll.identifiedOpportunity / Math.max(1, roll.raPipeline))
  const transformation = 0.7 * crossed + 0.3 * feed

  // Risk — exposure share, unmitigated highs, sustainment erosion.
  const exposure = clamp01(1 - ct.valueAtRisk / Math.max(1, ct.raPipeline + ct.valueAtRisk))
  const highs = active.filter(hasUnmitigatedHigh).length
  const mitigation = clamp01(1 - highs / n)
  const durability = clamp01(sustain.avg ?? 0.7)
  const risk = 0.5 * exposure + 0.25 * mitigation + 0.25 * durability

  const dims = [
    { key: 'financial', label: 'Financial', score: financial, weight: 0.22, bench: [0.45, 0.7],
      formula: '60% realization progress + 40% leakage control',
      drivers: [`${money(roll.realizedYTD)} realized (validated) vs ${money(roll.forecastRemainderFY)} still forecast`, `${money(ct.leakage)} value leakage`, `Realization progress ${pct(realization)}`] },
    { key: 'operational', label: 'Operational', score: operational, weight: 0.18, bench: [0.55, 0.8],
      formula: '50% RAG status + 50% delivery vs risk-adjusted plan',
      drivers: [`${rags.green} green · ${rags.amber} amber · ${rags.red} red of ${n} active`, exp > 0 ? `Delivery ${pct(delivery)} of expected-to-date (${money(act)} vs ${money(exp)})` : 'No realizing book yet — neutral delivery assumed'] },
    { key: 'customer', label: 'Customer', score: customer, weight: 0.15, bench: [0.5, 0.75], proxy: 'service-delivery proxy — pending customer KPI feed (CSAT, complaints, retention)',
      formula: '50% customer-facing delivery + 30% adoption-risk control + 20% realization factor',
      drivers: [`${cx.length} customer-facing initiatives (Collection & Post-Collection)`, `Delivery ${pct(cxDelivery)} · adoption-risk pressure ${pct(cxAdoptionRisk)}`, `Avg realization factor ${pct(clamp01(cxRf))}`] },
    { key: 'workforce', label: 'Workforce', score: workforce, weight: 0.15, bench: [0.4, 0.65], proxy: 'engagement proxy — pending HRIS feed (attrition, vacancies, engagement survey)',
      formula: '60% participation breadth + 40% owner de-concentration',
      drivers: [`${mv.participants} of ${mv.totalPeople} people carry active value work`, `Owner concentration (HHI) ${pct(clamp01(conc))} — lower is healthier`] },
    { key: 'transformation', label: 'Transformation', score: transformation, weight: 0.15, bench: [0.35, 0.6],
      formula: '70% value crossed into realizing stages + 30% funnel feed',
      drivers: [`${money(realizingRav)} of ${money(activeRav)} risk-adjusted value is realizing`, `${money(roll.identifiedOpportunity)} identified opportunity feeding the funnel`] },
    { key: 'risk', label: 'Risk', score: risk, weight: 0.15, bench: [0.6, 0.85],
      formula: '50% exposure control + 25% high-risk mitigation + 25% sustainment durability',
      drivers: [`${money(ct.valueAtRisk)} value at risk`, `${highs} unmitigated high risks`, `Sustainment durability ${pct(durability)} · ${sustain.eroding.length} eroding`] },
  ]

  const score = Math.round(dims.reduce((a, d) => a + d.score * d.weight, 0) / dims.reduce((a, d) => a + d.weight, 0) * 100)
  const grade = gradeFor(score)
  return { score, grade: grade.grade, gradeLabel: grade.label, dims, benchNote: 'benchmark bands are illustrative — pending Athens KPI definitions' }
}

// ---------------------------------------------------------------------------
// Health trend — an honest reconstruction. Only the FINANCIAL realization input
// is historized (validated actuals by month); the other dimensions are held at
// their current value, and the UI says so. No fabricated history.
// ---------------------------------------------------------------------------
export function healthTrend(db) {
  const h = enterpriseHealth(db)
  const roll = enterpriseRollup(db)
  const months = (db.meta?.fyMonths || []).map((m) => m.slice(0, 7))
  const nowKey = (db.meta?.now || '').slice(0, 7)
  const past = months.filter((m) => m <= nowKey)
  const fullFY = roll.realizedYTD + roll.forecastRemainderFY
  const fin = h.dims.find((d) => d.key === 'financial')
  const rest = h.dims.filter((d) => d.key !== 'financial')
  const restPart = rest.reduce((a, d) => a + d.score * d.weight, 0)
  const wTotal = h.dims.reduce((a, d) => a + d.weight, 0)

  let cum = 0
  const series = past.map((mk) => {
    cum += db.initiatives.reduce((s, i) => s + (i.actuals || []).filter((a) => a.validated && (a.period || '').slice(0, 7) === mk).reduce((x, a) => x + a.realized_amount, 0), 0)
    const realization = clamp01(cum / Math.max(1, fullFY))
    const leakPart = fin.score - 0.6 * clamp01(roll.realizedYTD / Math.max(1, fullFY)) // current leakage component
    const finScore = clamp01(0.6 * realization + leakPart)
    return Math.round((restPart + finScore * fin.weight) / wTotal * 100)
  })
  return { months: past, series, note: 'reconstructed from the realized-value history — the other five dimensions aren’t historized yet, so they are held at today’s level' }
}

// ---------------------------------------------------------------------------
// Enterprise Pulse Playback (5B.7 item 2) — the replay model. One frame per
// fiscal-year month carrying everything the data genuinely dates: validated
// landings, the timing gap vs plan ("value lost"), governance sign-offs,
// journaled decisions, tasks raised, audit actions, and the reconstructed
// health score. Risks are NOT date-stamped in the model, so the replay never
// pretends to know when they appeared — the UI carries that note.
// ---------------------------------------------------------------------------
export function playbackModel(db) {
  const tl = buildTimeline(db)
  const trend = healthTrend(db)

  // tasks raised per month (the dated "actions taken" signal)
  const tasksByMonth = {}
  for (const i of db.initiatives) for (const t of i.tasks || []) {
    const mk = (t.at || '').slice(0, 7)
    if (mk) tasksByMonth[mk] = (tasksByMonth[mk] || 0) + 1
  }

  // per-month plan for the realizing book — the engine's forecastCurve only
  // projects FUTURE months, so reconstruct past-month expectations from the
  // same profile weights expectedToDate() uses (mirrors the leakage math)
  const realizing = db.initiatives.filter((i) => REALIZING_STAGES.includes(i.stage))
  const planByIdx = tl.months.map((_, idx) =>
    realizing.reduce((s, i) => s + rav(i) * (profileWeights(i.profile || 'linear', 12)[idx] || 0), 0))

  let cumLost = 0
  const frames = tl.months.map((m, idx) => {
    const lost = m.past ? Math.max(0, planByIdx[idx] - (m.actualMonth || 0)) : 0
    if (m.past) cumLost += lost
    const decisions = (m.kindCounts?.approval || 0) + (m.kindCounts?.journal || 0)
    const actions = (tasksByMonth[m.key] || 0) + (m.kindCounts?.decision || 0)
    return {
      key: m.key, idx, past: m.past,
      created: m.actualMonth || 0, cumCreated: m.past ? m.cumR : null,
      lost, cumLost: m.past ? cumLost : null,
      forecastMonth: m.expectedMonth || 0, cumValue: m.cumValue,
      decisions, actions, events: m.events || [],
      health: m.past ? trend.series[idx] ?? null : null,
    }
  })
  return {
    frames, nowIdx: tl.nowIdx, maxCum: tl.maxVal,
    riskNote: 'risk events aren’t date-stamped in the model yet — the replay shows only what the data genuinely dates',
  }
}

// ---------------------------------------------------------------------------
// Enterprise Pulse Narrative — answers, in order: What changed? Why? What
// matters? What should happen next? Composed from the timeline, the health
// score, and the decision surfaces. Deterministic and rules-based.
// ---------------------------------------------------------------------------
export function pulseNarrative(db, user) {
  const tl = buildTimeline(db)
  const h = enterpriseHealth(db)
  const ct = controlTower(db)
  const roll = enterpriseRollup(db)
  const nowIdx = tl.nowIdx
  const cur = tl.months[nowIdx]
  const prev = tl.months[nowIdx - 1]

  // What changed — the latest period's landings and decisions vs the prior.
  const changed = []
  if (cur) {
    const delta = cur.realizedMonth - (prev?.realizedMonth || 0)
    changed.push(`${monthLabel(cur.key + '-01')}: ${money(cur.realizedMonth)} validated value landed (${delta >= 0 ? '+' : '−'}${money(Math.abs(delta))} vs ${prev ? monthLabel(prev.key + '-01') : 'prior month'}).`)
    if (cur.kindCounts.approval + cur.kindCounts.journal + cur.kindCounts.decision > 0)
      changed.push(`${cur.kindCounts.approval} governance sign-offs, ${cur.kindCounts.journal} journaled decisions and ${cur.kindCounts.decision} recorded actions this period.`)
    const top = cur.events.find((e) => e.kind === 'realized')
    if (top) changed.push(`Largest landing: ${top.label} (${money(top.value)}).`)
  }
  if (!changed.length) changed.push('No validated value has landed yet this period.')

  // Why — the drivers behind the score, weakest dimensions first.
  const weakest = [...h.dims].sort((a, b) => a.score - b.score).slice(0, 2)
  const why = [
    `Enterprise health is ${h.score} (${h.grade} · ${h.gradeLabel}).`,
    ...weakest.map((d) => `${d.label} is the ${d === weakest[0] ? 'weakest' : 'next weakest'} dimension at ${Math.round(d.score * 100)}: ${d.drivers[0]}.`),
  ]

  // What matters — the exposure an executive should hold in mind.
  const matters = [
    `${money(ct.valueAtRisk)} of value is at risk and ${money(ct.leakage)} is leaking (negotiated, not yet implemented).`,
    `${money(roll.forecastRemainderFY)} of risk-adjusted forecast remains to land this fiscal year.`,
  ]
  const worstDim = weakest[0]
  if (worstDim?.proxy) matters.push(`${worstDim.label} is scored from a ${worstDim.proxy.split(' — ')[0]} — treat with judgement until the real feed lands.`)

  // What next — the concrete queue, not generic advice.
  const dec = user ? decisionsRequired(db, user).filter((d) => d.kind === 'approval') : []
  const next = []
  if (dec.length) next.push(`${dec.length} approvals are waiting on you — the largest is "${dec[0].title}" (${money(dec[0].value || 0)}).`)
  const leakTop = (db.initiatives.filter((i) => REALIZING_STAGES.includes(i.stage))
    .map((i) => ({ i, v: rav(i) })).sort((a, b) => b.v - a.v))[0]
  if (ct.leakage > 0) next.push(`Recover timing leakage first — it is realized-value already negotiated, just not implemented.`)
  if (leakTop) next.push(`Protect the biggest realizing engine: "${leakTop.i.title}" (${money(leakTop.v)}, ${personName(db, leakTop.i.owner_id)}).`)

  return {
    asOf: db.meta?.now,
    sections: [
      { q: 'What changed?', a: changed },
      { q: 'Why?', a: why },
      { q: 'What matters?', a: matters },
      { q: 'What should happen next?', a: next },
    ],
  }
}
