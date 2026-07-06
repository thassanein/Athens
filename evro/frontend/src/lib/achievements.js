// Enterprise Achievement Engine (6B item 7) — the ORGANIZATION's trophy
// case: milestones crossed (dated from the validated record), a five-level
// maturity model with computed criteria, and transformation achievements.
// Nothing is awarded that the data can't prove; in-progress items show real
// progress toward the line. Deterministic, view-only.
import { frame, isActive, rav, REALIZING_STAGES, sustainmentBook } from './engine.js'
import { enterpriseHealth } from './intel.js'
import { seasonFramework } from './seasons.js'
import { leakageBreakdown } from './engine.js'
import { momentum } from './momentum.js'

const clamp01 = (v) => Math.max(0, Math.min(1, isFinite(v) ? v : 0))

// month (YYYY-MM) when cumulative validated value crossed a threshold — the
// honest way to date a milestone.
const crossedOn = (db, threshold) => {
  const fy = String(db.meta.fiscalYear)
  const { fyMonths, nowMonth } = frame(db)
  let cum = 0
  for (const mk of fyMonths.map((m) => m.slice(0, 7)).filter((m) => m <= nowMonth)) {
    for (const i of db.initiatives) for (const a of i.actuals || [])
      if (a.validated && (a.period || '').startsWith(fy) && (a.period || '').slice(0, 7) === mk) cum += a.realized_amount || 0
    if (cum >= threshold) return { month: mk, cum }
  }
  return null
}

export function orgMilestones(db) {
  const totalRealized = db.initiatives.reduce((s, i) => s + (i.actuals || []).filter((a) => a.validated).reduce((x, a) => x + a.realized_amount, 0), 0)
  const decisions = (db.decision_journal || []).length + db.initiatives.reduce((s, i) => s + (i.validations || []).length, 0)
  const sustaining = db.initiatives.filter((i) => i.stage === 'sustainment').length
  const realizing = db.initiatives.filter((i) => REALIZING_STAGES.includes(i.stage)).length
  const f = seasonFramework(db)
  const perfectSeason = f.seasons.find((s) => s.score === 100)

  const valueBands = [500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000]
  const milestones = valueBands.map((t) => {
    const hit = crossedOn(db, t)
    return {
      icon: '◆', title: `$${t / 1e6 >= 1 ? (t / 1e6).toFixed(t % 1e6 ? 1 : 0) + 'M' : t / 1e3 + 'K'} validated`,
      achieved: !!hit, on: hit?.month || null,
      progress: hit ? 1 : clamp01(totalRealized / t),
      detail: hit ? `crossed in ${hit.month}` : `${Math.round((totalRealized / t) * 100)}% of the way`,
    }
  })
  milestones.push(
    { icon: '⚑', title: '50 decisions on the record', achieved: decisions >= 50, on: null, progress: clamp01(decisions / 50), detail: `${decisions} governance decisions logged` },
    { icon: '♻', title: 'First initiative sustaining', achieved: sustaining > 0, on: null, progress: sustaining > 0 ? 1 : 0, detail: sustaining > 0 ? `${sustaining} in sustainment` : 'none yet — realization comes first' },
    { icon: '▲', title: '10 initiatives realizing', achieved: realizing >= 10, on: null, progress: clamp01(realizing / 10), detail: `${realizing} in realizing stages` },
    { icon: '★', title: 'A perfect season', achieved: !!perfectSeason, on: null, progress: perfectSeason ? 1 : clamp01((f.current?.score || 0) / 100), detail: perfectSeason ? `${perfectSeason.name} scored 100` : `best so far: ${Math.max(0, ...f.seasons.filter((s) => s.score != null).map((s) => s.score))}` },
  )
  return { milestones, totalRealized, decisions }
}

// Maturity model — five levels, each a computed checklist. The level is the
// highest one whose criteria ALL hold; progress-to-next is visible.
export const MATURITY_LEVELS = ['Foundational', 'Emerging', 'Practicing', 'Optimizing', 'Leading']

export function maturityModel(db) {
  const active = db.initiatives.filter(isActive)
  const h = enterpriseHealth(db)
  const sustain = sustainmentBook(db)
  const leak = leakageBreakdown(db)
  const realized = db.initiatives.reduce((s, i) => s + (i.actuals || []).filter((a) => a.validated).reduce((x, a) => x + a.realized_amount, 0), 0)
  const actuals = db.initiatives.flatMap((i) => i.actuals || [])
  const hygiene = actuals.length ? actuals.filter((a) => a.validated).length / actuals.length : 0
  const ravRealizing = active.filter((i) => REALIZING_STAGES.includes(i.stage)).reduce((a, i) => a + rav(i), 0)
  const ravAll = Math.max(1, active.reduce((a, i) => a + rav(i), 0))
  const withBaseline = active.filter((i) => i.baseline?.validated_by).length
  const f = seasonFramework(db)
  const scored = f.seasons.filter((s) => s.score != null)

  const levels = [
    { name: 'Foundational', criteria: [
      { label: 'Portfolio seeded with owners', ok: active.length > 0 && active.every((i) => i.owner_id) },
      { label: 'Both value pillars present', ok: new Set(active.map((i) => i.pillar)).size === 2 },
    ] },
    { name: 'Emerging', criteria: [
      { label: 'Gates enforced — validations flowing', ok: db.initiatives.some((i) => (i.validations || []).length > 0) },
      { label: 'FP&A-validated value on the books', ok: realized > 0 },
    ] },
    { name: 'Practicing', criteria: [
      { label: '≥ 40% of credible value realizing', ok: ravRealizing / ravAll >= 0.4, note: `${Math.round((ravRealizing / ravAll) * 100)}%` },
      { label: 'Record hygiene ≥ 80%', ok: hygiene >= 0.8, note: `${Math.round(hygiene * 100)}%` },
      { label: 'Baselines validated on most of the book', ok: withBaseline / Math.max(1, active.length) >= 0.5, note: `${withBaseline}/${active.length}` },
    ] },
    { name: 'Optimizing', criteria: [
      { label: 'Leakage under 33% of realized', ok: leak.total < realized * 0.33, note: `${Math.round((leak.total / Math.max(1, realized)) * 100)}%` },
      { label: 'Sustainment durability ≥ 0.9', ok: (sustain.avg ?? 0) >= 0.9, note: (sustain.avg ?? 0).toFixed(2) },
      { label: 'Every closed season ≥ 90', ok: scored.length > 0 && scored.filter((s) => s.status === 'complete').every((s) => s.score >= 90) },
    ] },
    { name: 'Leading', criteria: (() => {
      const stagnant = momentum(db, 'business_unit').counts.stagnant + momentum(db, 'owner').counts.stagnant
      return [
        { label: 'Enterprise health ≥ 80', ok: h.score >= 80, note: String(h.score) },
        { label: 'Record hygiene ≥ 95%', ok: hygiene >= 0.95, note: `${Math.round(hygiene * 100)}%` },
        { label: 'No stagnant value at any altitude', ok: stagnant === 0, note: stagnant ? `${stagnant} stagnant book${stagnant === 1 ? '' : 's'}` : 'all moving' },
      ]
    })() },
  ]

  let level = 0
  for (const l of levels) { if (l.criteria.every((c) => c.ok)) level++; else break }
  const next = levels[level] || null
  const progress = next ? next.criteria.filter((c) => c.ok).length / next.criteria.length : 1
  return { level, name: MATURITY_LEVELS[Math.max(0, level - 1)] || 'Pre-foundational', next: next ? { name: next.name, criteria: next.criteria, progress } : null, levels }
}

// Transformation achievements — patterns the organization has proven.
export function transformationAchievements(db) {
  const f = seasonFramework(db)
  const scored = f.seasons.filter((s) => s.score != null)
  const qoqUp = f.compare.length > 0 && f.compare.every((c) => c.realized > 0)
  const actuals = db.initiatives.flatMap((i) => i.actuals || [])
  const hygiene = actuals.length ? actuals.filter((a) => a.validated).length / actuals.length : 0
  const rhythm = scored.filter((s) => s.decisions >= 8).length

  return [
    { icon: '📈', title: 'Momentum quarter', achieved: qoqUp, detail: qoqUp ? 'every season landed more than the last' : 'land more than last season to earn it' },
    { icon: '🧾', title: 'Validation discipline', achieved: hygiene >= 0.9, detail: `${Math.round(hygiene * 100)}% of the record FP&A-validated` },
    { icon: '⚖', title: 'Governance rhythm', achieved: rhythm >= 2, detail: `${rhythm} season${rhythm === 1 ? '' : 's'} with 8+ decisions on the record` },
    { icon: '🛡', title: 'Nothing unowned', achieved: db.initiatives.filter(isActive).every((i) => i.owner_id), detail: 'every active initiative has an accountable owner' },
  ]
}
