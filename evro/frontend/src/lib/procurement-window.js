// The 12-month savings-measurement philosophy — applied consistently across
// EVRO Procurement. Athens counts a saving for exactly TWELVE months from its
// first financial reporting (its launch — the earliest FP&A-validated actual).
// After that the year-one value is banked and the initiative becomes protected
// run-rate (sustainment), not a saving you keep re-claiming forever. This is the
// standard "in-year savings" discipline that keeps the number credible.
//
// This is a VIEW-LAYER lens over data the engine already owns (each initiative's
// validated monthly actuals). It never rewrites the engine's reconciled dollar
// totals — it frames WHEN a saving is inside its measurement window, so the
// pipeline, dashboard, workspace and briefs all speak about it the same way.
import { savingsOpportunities, lifecycleMeta } from './procurement.js'

export const MEASUREMENT_MONTHS = 12

const ym = (period) => { const [y, m] = String(period || '').split('-'); return { y: +y, m: +m } }
const monthsBetween = (a, b) => (b.y - a.y) * 12 + (b.m - a.m)
const fmt = (y, m) => `${y}-${String(m).padStart(2, '0')}`

// The launch = first financial reporting month = earliest validated actual.
export function launchPeriod(opp) {
  const acts = (opp?._raw?.actuals || []).filter((a) => a.validated !== false && a.period).map((a) => a.period).sort()
  return acts[0] || null
}

// Per-opportunity window state. Deterministic from db.meta.now + validated actuals.
export function savingsWindow(db, opp) {
  const now = ym(db.meta.now)
  const lp = launchPeriod(opp)
  if (!lp) {
    return { launched: false, launchPeriod: null, monthsElapsed: 0, rawElapsed: 0, monthsRemaining: MEASUREMENT_MONTHS, pct: 0, graduated: false, windowEnd: null }
  }
  const l = ym(lp)
  const rawElapsed = Math.max(1, monthsBetween(l, now) + 1) // the launch month itself is month 1
  const monthsElapsed = Math.min(rawElapsed, MEASUREMENT_MONTHS)
  const monthsRemaining = Math.max(0, MEASUREMENT_MONTHS - rawElapsed)
  const graduated = rawElapsed > MEASUREMENT_MONTHS
  const endIdx = l.m - 1 + (MEASUREMENT_MONTHS - 1)
  const windowEnd = fmt(l.y + Math.floor(endIdx / 12), (endIdx % 12) + 1)
  return { launched: true, launchPeriod: lp, monthsElapsed, rawElapsed, monthsRemaining, pct: Math.min(1, rawElapsed / MEASUREMENT_MONTHS), graduated, windowEnd }
}

// Portfolio lens — how the book sits against the 12-month window. Value figures
// reuse the engine's per-opportunity headline (already annualized = a 12-month
// run-rate), grouped by window state; no total is recomputed.
export function windowSummary(db) {
  const opps = savingsOpportunities(db)
  const buckets = { preLaunch: [], inWindow: [], graduated: [] }
  for (const o of opps) {
    const w = savingsWindow(db, o)
    if (!w.launched) buckets.preLaunch.push(o)
    else if (w.graduated) buckets.graduated.push(o)
    else buckets.inWindow.push(o)
  }
  const val = (xs) => xs.reduce((s, o) => s + o.value.headline, 0)
  // Nearest opportunities to graduating out of the measurement window.
  const expiring = buckets.inWindow
    .map((o) => ({ o, w: savingsWindow(db, o) }))
    .filter((x) => x.w.monthsRemaining <= 3)
    .sort((a, b) => a.w.monthsRemaining - b.w.monthsRemaining)
  return {
    months: MEASUREMENT_MONTHS,
    preLaunch: { count: buckets.preLaunch.length, value: val(buckets.preLaunch) },
    inWindow: { count: buckets.inWindow.length, value: val(buckets.inWindow) },
    graduated: { count: buckets.graduated.length, value: val(buckets.graduated) },
    expiring,
  }
}

// ── Real pipeline board — opportunities flowing left-to-right through the five
// lifecycle phases. One column per phase; the 12-month window rides on each
// realizing card so the cap is visible where the value lives.
export const PIPELINE_PHASES = [
  { key: 'pipeline', label: 'Pipeline', gloss: 'Identified → qualified → business case', tone: 'var(--opp)' },
  { key: 'commit', label: 'Committed', gloss: 'Approved → negotiation → awarded', tone: 'var(--brand-value)' },
  { key: 'execute', label: 'In delivery', gloss: 'Implementation → FP&A validation', tone: 'var(--navy)' },
  { key: 'realized', label: 'Realizing', gloss: 'In the 12-month measurement window', tone: 'var(--green)' },
  { key: 'closed', label: 'Banked', gloss: 'Window complete — protected run-rate', tone: 'var(--grey)' },
]

export function pipelineBoard(db) {
  const opps = savingsOpportunities(db)
  return PIPELINE_PHASES.map((ph) => {
    const cards = opps
      .filter((o) => lifecycleMeta(o.stage).phase === ph.key)
      .map((o) => ({ ...o, window: savingsWindow(db, o) }))
      .sort((a, b) => b.value.headline - a.value.headline)
    return { ...ph, cards, count: cards.length, value: cards.reduce((s, o) => s + o.value.headline, 0) }
  })
}
