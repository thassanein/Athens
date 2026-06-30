// EVRO deterministic engine — the single source of truth for every derived
// number on every screen. Pure functions, no DOM/framework deps. The Express
// server imports an identical copy (server/src/engine.js) so the live API and
// the demo/offline snapshot always agree (mirrors the facilities app's
// derive.js ↔ diagnostics.js pattern).
//
// ── Non-negotiables this engine enforces ──────────────────────────────────
//  • RETURN-MAXIMIZATION, not target-attainment. There is NO savings or
//    avoidance target. This module never computes a target, gap, or attainment.
//  • Only FP&A-VALIDATED monthly actuals count as Realized.
//  • Avoidance and Savings are kept separate end-to-end; summed only at a
//    clearly-labelled total.
//  • Opportunity bands read from the savings_pct config table — never hardcoded.

// 'proposed' is a pre-pipeline holding state: a newly intake'd project awaiting
// line-manager + FP&A approval. It carries 0 confidence and is excluded from all
// value rollups until approved into 'idea'.
export const STAGES = ['proposed', 'idea', 'feasibility', 'capability', 'launch', 'realization', 'sustainment', 'retired']
export const GATE_STAGES = ['idea', 'feasibility', 'capability', 'launch'] // the four value gates (funnel)
export const LIFECYCLE_STAGES = ['idea', 'feasibility', 'capability', 'launch', 'realization', 'sustainment', 'retired']
export const STAGE_LABEL = { proposed: 'Proposed', idea: 'Idea', feasibility: 'Feasibility', capability: 'Capability', launch: 'Launch', realization: 'Realization', sustainment: 'Sustainment', retired: 'Retired' }
export const STAGE_CONFIDENCE = { proposed: 0, idea: 0.25, feasibility: 0.5, capability: 0.75, launch: 1.0, realization: 1.0, sustainment: 1.0, retired: 0 }
export const REALIZING_STAGES = ['launch', 'realization', 'sustainment']
export const PILLAR_LABEL = { savings: 'Cost Savings', avoidance: 'Cost Avoidance' }
export const BENEFIT_LABEL = { reduction: 'Cost Reduction', savings: 'Cost Savings', avoidance: 'Cost Avoidance' }
export const MATERIALITY = 100_000 // ≥ this gross → Steering approval to enter Launch

// Methodology surfaced in the UI (definitions + formulae). Cost Reduction and
// Cost Savings both roll up under the Savings pillar; Avoidance is its own
// pillar. McKinsey "should-cost" discipline frames the opportunity levers.
export const METHODOLOGY = {
  definitions: [
    { key: 'reduction', term: 'Cost Reduction', pillar: 'savings', formula: 'Historical baseline price − Final negotiated price',
      note: 'Active elimination of existing cost — terminating a service or negotiating a lower rate. Directly lowers the P&L.' },
    { key: 'savings', term: 'Cost Savings (hard)', pillar: 'savings', formula: 'Original cost − New lower cost',
      note: 'Money historically spent but now paid less for — productivity and efficiency gains, no headcount cuts.' },
    { key: 'avoidance', term: 'Cost Avoidance (soft)', pillar: 'avoidance', formula: 'Projected future cost − Actual cost after intervention',
      note: 'Proactively prevents a future price increase before it hits the budget (CPI, contractual, market).' },
  ],
  practices: [
    { term: 'Cleansheet / should-cost', note: 'Break cost into material, labor, overhead to find the gap between quoted price and minimum possible cost.' },
    { term: 'Negotiation win-room', note: 'Centralize benchmarks, RFQ templates and scripts to empower cross-functional negotiation.' },
    { term: 'Volume leverage / tiering', note: 'Consolidate volume to reach higher tiered discounts and economies of scale.' },
    { term: 'Implemented vs negotiated', note: 'A negotiated discount only saves money if real volume flows through the new contract — track leakage.' },
    { term: 'Maverick-spend capture', note: 'Predictive spend analytics flag off-contract purchasing so value is not leaked to non-preferred suppliers.' },
  ],
}

// ---- persona scope / RBAC visibility --------------------------------------
// What slice of the portfolio a role may SEE:
//   enterprise — whole portfolio (exec, EVRO lead, FP&A)
//   department — only their function's initiatives (function leader)
//   own        — only initiatives they own or contribute to (initiative owner)
export const ROLE_SCOPE = { exec: 'enterprise', admin: 'enterprise', fpna: 'enterprise', leader: 'department', owner: 'own' }
// The Opportunity board is limited to these roles.
export const CAN_SEE_OPPORTUNITIES = new Set(['exec', 'admin', 'fpna'])
export const CAN_SEE_REPORTING = new Set(['exec', 'admin', 'fpna'])
export const scopeOf = (user) => ROLE_SCOPE[user?.role] || 'own'

export function ownsInitiative(user, i) {
  return i.owner_id === user?.id || (i.contributions || []).some((c) => c.user_id === user?.id)
}
// A function leader may oversee several departments (user.oversees); falls back
// to their own function.
export const overseenDepts = (user) => user?.oversees || [user?.fn]
export function canSeeInitiative(user, i) {
  const s = scopeOf(user)
  if (s === 'enterprise') return true
  if (s === 'department') return !!i.department && overseenDepts(user).includes(i.department)
  return ownsInitiative(user, i)
}
export function visibleInitiatives(db, user) {
  if (scopeOf(user) === 'enterprise') return db.initiatives
  return db.initiatives.filter((i) => canSeeInitiative(user, i))
}
// A db view filtered to the user's scope, reusable by the existing rollups.
// Returns the same object for enterprise roles (keeps the engine's WeakMap memo).
export function scopedView(db, user) {
  if (scopeOf(user) === 'enterprise') return db
  return { ...db, initiatives: visibleInitiatives(db, user) }
}

// ---- small helpers ---------------------------------------------------------
const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + f(x), 0)
const monthKey = (period) => (period || '').slice(0, 7)

export function confidence(stage) {
  return STAGE_CONFIDENCE[stage] ?? 0
}

// Fast lookups, memoized in a WeakMap keyed by the db object — NOT as an own
// property on db. A WeakMap means the cache never rides along through a
// JSON.parse(JSON.stringify(db)) clone (the write reducers) or localStorage, so
// a cloned/mutated db is a fresh object that gets a fresh index. Without this a
// stale cfgByGroup would survive setSavingsPct and re-derive opportunity bands
// from the OLD percentages.
const IDX = new WeakMap()
export function index(db) {
  if (!IDX.has(db)) {
    IDX.set(db, {
      peopleById: Object.fromEntries(db.people.map((p) => [p.id, p])),
      categoriesById: Object.fromEntries(db.spend_categories.map((c) => [c.id, c])),
      groupsById: Object.fromEntries(db.sourcing_groups.map((g) => [g.id, g])),
      cfgByGroup: Object.fromEntries(db.savings_pct_config.map((c) => [c.group_id, c])),
    })
  }
  return db
}
const idx = (db) => { index(db); return IDX.get(db) }
export const personName = (db, id) => idx(db).peopleById[id]?.name || '—'
export const groupName = (db, id) => idx(db).groupsById[id]?.name || '—'
export const categoryName = (db, id) => idx(db).categoriesById[id]?.name || '—'

// ---- fiscal frame ----------------------------------------------------------
export function frame(db) {
  const now = db.meta.now
  const nowMonth = monthKey(now)
  const fyMonths = db.meta.fyMonths
  const remaining = fyMonths.filter((m) => monthKey(m) > nowMonth).length
  const elapsed = fyMonths.length - remaining
  return { now, nowMonth, fyMonths, remaining, elapsed }
}

// ---- per-initiative measures ----------------------------------------------
// Proposed (awaiting approval) and Closed are excluded from "active" value.
export const isActive = (i) => i.stage !== 'retired' && i.stage !== 'proposed'

// Risk-Adjusted Value = gross × stage confidence × realization factor.
export function rav(i) {
  return i.gross_annual_value * confidence(i.stage) * (i.realization_factor ?? 1)
}
// Return efficiency.
export function roi(i) {
  return i.effort_score ? rav(i) / i.effort_score : 0
}
// Realized to date = Σ FP&A-validated monthly actuals (this fiscal year).
export function realizedYTD(i, db) {
  const fy = String(db.meta.fiscalYear)
  return sum((i.actuals || []).filter((a) => a.validated && monthKey(a.period).startsWith(fy)), (a) => a.realized_amount)
}
// Pipeline value still pending validation (unvalidated actuals) — shown, never Realized.
export function pendingValue(i) {
  return sum((i.actuals || []).filter((a) => !a.validated), (a) => a.realized_amount)
}
// Risk-adjusted value time-phased into the REMAINING fiscal-year months.
export function forecastRemainderFY(i, db) {
  if (i.stage === 'retired') return 0
  const { remaining, fyMonths } = frame(db)
  return rav(i) * (remaining / fyMonths.length)
}
// Headline FY contribution for a person/initiative = Realized YTD + RA forecast.
export function totalFY(i, db) {
  return realizedYTD(i, db) + forecastRemainderFY(i, db)
}
export function recurringRatio(i) {
  const t = sum(i.benefit_lines || [], (b) => b.annual_amount)
  if (!t) return 0
  return sum((i.benefit_lines || []).filter((b) => b.recurrence === 'recurring'), (b) => b.annual_amount) / t
}
// Implemented run-rate = annualized validated actuals so far this FY.
export function implementedRunRate(i, db) {
  const { elapsed } = frame(db)
  const realized = realizedYTD(i, db)
  if (!elapsed || !realized) return 0
  return (realized / elapsed) * 12
}
// Value leakage = negotiated annual value not yet flowing through as run-rate.
// A negotiated discount only saves money if real volume goes through the deal.
export function valueLeakage(i, db) {
  if (i.negotiated_value == null) return null
  return Math.max(0, i.negotiated_value - implementedRunRate(i, db))
}
export function worstRisk(i) {
  return (i.risks || []).reduce((m, r) => Math.max(m, r.score || 0), 0)
}
// Bias-to-red: any High (≥15) open risk without a countermeasure blocks "green".
export function hasUnmitigatedHigh(i) {
  return (i.risks || []).some((r) => r.score >= 15 && r.status !== 'closed' && !r.countermeasure)
}

// ---- gate advancement (validation-gated, $100K materiality) ----------------
// Returns { ok, requiresSteering, reasons[] } for advancing to the next stage.
export function gateCheck(i) {
  const idx = STAGES.indexOf(i.stage)
  const next = STAGES[idx + 1]
  const reasons = []
  if (!next) return { ok: false, next: null, reasons: ['No further gate.'] }
  if (next === 'feasibility') {
    if (!i.baseline?.validated_by) reasons.push('FP&A-validated baseline required.')
  }
  if (next === 'capability') {
    if (!i.validations?.some((v) => v.type === 'logic' && v.decision === 'approved'))
      reasons.push('Savings logic & P&L mapping must be signed off.')
  }
  if (next === 'launch') {
    if (hasUnmitigatedHigh(i)) reasons.push('High risks need a documented countermeasure.')
  }
  const requiresSteering = next === 'launch' && i.gross_annual_value >= MATERIALITY
  return { ok: reasons.length === 0, next, requiresSteering, reasons }
}

// ---- approval workflow (intake + phase change) -----------------------------
// New projects and every phase change require LINE MANAGER + FP&A sign-off
// (plus Steering when entering Launch at ≥ $100K). Approvals are first-class and
// enforced in the reducers (single source of truth for client + server paths).
export const ROLE_APPROVE_LABEL = { line_manager: 'Line manager', fpna: 'FP&A', steering: 'Steering' }
export const nextStage = (i) => STAGES[STAGES.indexOf(i.stage) + 1] || null

export function requiredRoles(i, toStage) {
  const roles = ['line_manager', 'fpna']
  if (toStage === 'launch' && i.gross_annual_value >= MATERIALITY) roles.push('steering')
  return roles
}
export function approvalState(i) {
  const r = i.request
  if (!r) return null
  const filled = (r.approvals || []).map((a) => a.role)
  return { kind: r.kind, to_stage: r.to_stage, need: r.need, approvals: r.approvals || [], filled, remaining: r.need.filter((n) => !filled.includes(n)) }
}
// Which still-needed approval roles this user is entitled to fill on this request.
export function canApproveRoles(user, i) {
  const st = approvalState(i)
  if (!st || st.remaining.length === 0) return []
  return st.remaining.filter((role) => {
    if (role === 'line_manager') return user?.role === 'admin' || (user?.role === 'leader' && overseenDepts(user).includes(i.department))
    if (role === 'fpna') return user?.role === 'fpna' || user?.role === 'admin'
    if (role === 'steering') return user?.role === 'admin' || user?.role === 'leader'
    return false
  })
}
// Can this user open an advancement request (owner/editor, not already pending)?
export function canRequestAdvance(user, i, caps) {
  if (!caps?.edit || i.request || i.stage === 'proposed') return { ok: false }
  const to = nextStage(i)
  if (!to) return { ok: false }
  if (to === 'launch' && hasUnmitigatedHigh(i)) return { ok: false, to, reason: 'High risks need a documented countermeasure first.' }
  return { ok: true, to }
}
// Initiatives anywhere with a pending request this user may approve.
export function pendingApprovalsFor(db, user) {
  return db.initiatives.filter((i) => i.request && canApproveRoles(user, i).length > 0)
}

// ---- enterprise rollup (Executive dashboard) -------------------------------
export function enterpriseRollup(db) {
  index(db)
  const inits = db.initiatives
  const active = inits.filter(isActive)
  const realized = sum(inits, (i) => realizedYTD(i, db))
  const raPipeline = sum(active, (i) => rav(i))
  const forecastRA = sum(inits, (i) => forecastRemainderFY(i, db))
  const blendedROI = sum(active, (i) => roi(i)) === 0 ? 0 : sum(active, rav) / Math.max(1, sum(active, (i) => i.effort_score || 0))
  const opp = opportunityValue(db)

  // pillar split (kept separate; combined only here, clearly labelled)
  const pillar = { savings: { realized: 0, forecastRA: 0 }, avoidance: { realized: 0, forecastRA: 0 } }
  for (const i of inits) {
    pillar[i.pillar].realized += realizedYTD(i, db)
    pillar[i.pillar].forecastRA += forecastRemainderFY(i, db)
  }
  // recurring vs one-time (of risk-adjusted pipeline)
  let recurring = 0, oneTime = 0
  for (const i of active) {
    const r = recurringRatio(i)
    recurring += rav(i) * r
    oneTime += rav(i) * (1 - r)
  }
  // benefit-type split (reduction / savings / avoidance), risk-adjusted
  const benefitType = { reduction: 0, savings: 0, avoidance: 0 }
  for (const i of active) benefitType[i.benefit_type || i.pillar] += rav(i)
  // value leakage — negotiated value not yet implemented as run-rate
  const leakage = sum(inits, (i) => valueLeakage(i, db) || 0)

  const topReturns = rankInitiatives(db, 'return').slice(0, 6)
  const topRisks = inits
    .flatMap((i) => (i.risks || []).filter((r) => r.status !== 'closed').map((r) => ({ ...r, initiative: i.id, title: i.title })))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return {
    realizedYTD: realized,
    raPipeline,
    forecastRemainderFY: forecastRA,
    identifiedOpportunity: opp.midpoint,
    identifiedOpportunityRange: { low: opp.low, high: opp.high },
    blendedROI,
    capturePct: realized / db.meta.addressableTotal, // progress, NOT vs a target
    addressableTotal: db.meta.addressableTotal,
    // Value bridge: Realized → +RA forecast → +Identified opportunity (no target/gap)
    bridge: [
      { label: 'Realized YTD', value: realized, kind: 'base' },
      { label: '+ Risk-adjusted forecast', value: forecastRA, kind: 'add' },
      { label: '+ Identified opportunity', value: opp.midpoint, kind: 'add' },
    ],
    bridgeTotal: realized + forecastRA + opp.midpoint,
    pillar,
    recurringSplit: { recurring, oneTime },
    benefitType,
    leakage,
    topReturns,
    topRisks,
    counts: { initiatives: inits.length, active: active.length },
  }
}

// ---- forecast scenarios + monthly curve ------------------------------------
// Committed = Launch + validated only · Expected = risk-adjusted all stages ·
// Upside = gross of Capability + Launch.
export function scenarioTotals(db) {
  const inits = db.initiatives
  const committed = sum(inits.filter((i) => REALIZING_STAGES.includes(i.stage)), rav)
  const expected = sum(inits.filter(isActive), rav)
  const upside = sum(inits.filter((i) => i.stage === 'capability' || REALIZING_STAGES.includes(i.stage)), (i) => i.gross_annual_value)
  return { committed, expected, upside }
}

export function forecastCurve(db) {
  const { fyMonths, nowMonth } = frame(db)
  const inits = db.initiatives
  return fyMonths.map((m) => {
    const mk = monthKey(m)
    const past = mk <= nowMonth
    let actual = 0
    if (past) {
      for (const i of inits)
        actual += sum((i.actuals || []).filter((a) => a.validated && monthKey(a.period) === mk), (a) => a.realized_amount)
    }
    // projected lines for FUTURE months
    let committed = 0, expected = 0, upside = 0
    if (!past) {
      for (const i of inits) {
        if (REALIZING_STAGES.includes(i.stage)) committed += rav(i) / 12
        if (isActive(i)) expected += rav(i) / 12
        if (i.stage === 'capability' || REALIZING_STAGES.includes(i.stage)) upside += i.gross_annual_value / 12
      }
    }
    return { month: mk, past, actual, committed, expected, upside }
  })
}

// "What delivers the most" — replaces "what closes the gap". Ranked by FY return.
export function whatDeliversMost(db) {
  return db.initiatives
    .filter(isActive)
    .map((i) => ({ id: i.id, title: i.title, stage: i.stage, pillar: i.pillar, totalFY: totalFY(i, db), rav: rav(i) }))
    .sort((a, b) => b.totalFY - a.totalFY)
    .slice(0, 8)
}

// ---- portfolio: ranking, funnel, conversion --------------------------------
// mode: 'return' (Biggest Return — absolute RAV) | 'roi' (Best ROI — RAV÷effort)
export function rankInitiatives(db, mode = 'return') {
  const rows = db.initiatives.map((i) => ({
    id: i.id, title: i.title, stage: i.stage, pillar: i.pillar, department: i.department,
    owner_id: i.owner_id, gross: i.gross_annual_value, rav: rav(i), roi: roi(i),
    effort: i.effort_score, realizedYTD: realizedYTD(i, db), status_rag: i.status_rag,
    recurringRatio: recurringRatio(i), opportunity_id: i.opportunity_id,
  }))
  rows.sort((a, b) => (mode === 'roi' ? b.roi - a.roi : b.rav - a.rav))
  return rows
}

export function funnel(db) {
  const order = ['idea', 'feasibility', 'capability', 'launch']
  const stages = order.map((s) => {
    const list = db.initiatives.filter((i) => i.stage === s)
    return { stage: s, count: list.length, value: sum(list, rav), gross: sum(list, (i) => i.gross_annual_value) }
  })
  // conversion = countAtOrBeyond(next) / countAtOrBeyond(this) — monotonic ≤ 1
  const atOrBeyond = (s) => db.initiatives.filter((i) => i.stage !== 'proposed' && STAGES.indexOf(i.stage) >= STAGES.indexOf(s)).length
  const conversions = order.slice(0, -1).map((s, idx) => ({
    from: s, to: order[idx + 1],
    rate: atOrBeyond(s) ? atOrBeyond(order[idx + 1]) / atOrBeyond(s) : 0,
  }))
  return { stages, conversions }
}

export function departmentRollup(db) {
  const byDept = {}
  for (const i of db.initiatives) {
    const d = i.department || '—'
    byDept[d] ||= { department: d, count: 0, realized: 0, forecastRA: 0, rav: 0, gross: 0 }
    byDept[d].count++
    byDept[d].realized += realizedYTD(i, db)
    byDept[d].forecastRA += forecastRemainderFY(i, db)
    byDept[d].rav += rav(i)
    byDept[d].gross += i.gross_annual_value
  }
  return Object.values(byDept)
    .map((d) => ({ ...d, totalFY: d.realized + d.forecastRA }))
    .sort((a, b) => b.totalFY - a.totalFY)
}

// ---- opportunity engine ----------------------------------------------------
// Sizing reads bands straight from each opportunity's seeded est_low/est_high,
// which were computed as group_spend × savings_pct (config table). We re-derive
// here so the UI can show the live config % and re-size if config changes.
export function sizedOpportunities(db) {
  const ix = idx(db)
  return db.opportunities.map((o) => {
    const g = ix.groupsById[o.group_id]
    const cfg = ix.cfgByGroup[o.group_id]
    const low = g && cfg ? Math.round(g.spend * cfg.conservative_pct) : o.est_low
    const high = g && cfg ? Math.round(g.spend * cfg.stretch_pct) : o.est_high
    return {
      ...o, est_low: low, est_high: high, midpoint: Math.round((low + high) / 2),
      groupName: g?.name, groupSpend: g?.spend,
      conservative_pct: cfg?.conservative_pct, stretch_pct: cfg?.stretch_pct,
      illustrative: cfg?.basis || 'illustrative — pending Supply Chain / FP&A validation',
    }
  })
}
export function opportunityValue(db) {
  const open = sizedOpportunities(db).filter((o) => o.status !== 'delivered')
  return { low: sum(open, (o) => o.est_low), high: sum(open, (o) => o.est_high), midpoint: sum(open, (o) => o.midpoint), count: open.length }
}

// ---- spend intelligence ----------------------------------------------------
export function spendRollup(db, { addressableOnly = true } = {}) {
  index(db)
  // off-contract / maverick share per group (digital spend-analytics signal)
  const maverickByGroup = Object.fromEntries((db.opportunities || []).map((o) => [o.group_id, o.maverick_pct]))
  const groups = db.sourcing_groups.map((g) => {
    const cats = db.spend_categories.filter((c) => c.group_id === g.id && (!addressableOnly || c.addressable))
    const spend = sum(cats, (c) => c.spend)
    const mav = maverickByGroup[g.id] || 0
    // supplier-fragmentation proxy: a long, even tail of categories signals
    // consolidation potential (few big lines = concentrated, many small = fragmented).
    const top3 = cats.slice().sort((a, b) => b.spend - a.spend).slice(0, 3)
    const concentration = spend ? sum(top3, (c) => c.spend) / spend : 1
    return {
      id: g.id, name: g.name, spend, catCount: cats.length,
      maverickPct: mav, maverickValue: Math.round(spend * mav), concentration,
      fragmented: concentration < 0.6,
      categories: cats.slice().sort((a, b) => b.spend - a.spend),
    }
  }).sort((a, b) => b.spend - a.spend)
  const total = sum(groups, (g) => g.spend)
  // Pareto cumulative share across groups
  let cum = 0
  const pareto = groups.map((g) => { cum += g.spend; return { name: g.name, spend: g.spend, cumPct: total ? cum / total : 0 } })
  const nonAddressable = db.spend_categories.filter((c) => !c.addressable)
  return {
    groups, total, pareto,
    maverickTotal: sum(groups, (g) => g.maverickValue),
    addressableTotal: db.meta.addressableTotal,
    nonAddressableTotal: sum(nonAddressable, (c) => c.spend),
    nonAddressable: nonAddressable.slice().sort((a, b) => b.spend - a.spend),
  }
}

// ---- engagement points + leaderboard ---------------------------------------
// Points are deliberately back-loaded toward validated, realized, recurring
// value (Addendum A1.2). Risk-adjustment applies BEFORE points are awarded.
const ADVANCE_PTS = { feasibility: 40, capability: 60, launch: 100 }
function initiativePoints(i, db) {
  if (i.stage === 'proposed') return 10 // submitted, awaiting approval (not yet in pipeline)
  let pts = 10 + 15 // submit + passes triage
  const reached = STAGES.indexOf(i.stage)
  for (const s of ['feasibility', 'capability', 'launch']) {
    if (reached >= STAGES.indexOf(s)) pts += ADVANCE_PTS[s]
  }
  if (STAGES.indexOf(i.stage) >= STAGES.indexOf('launch')) pts += Math.floor(rav(i) / 10_000) * 25 // per $10k RA at Launch+
  const realized = realizedYTD(i, db)
  const realizedPts = Math.floor(realized / 10_000) * 50 // per $10k realized & validated
  pts += Math.round(realizedPts * (recurringRatio(i) >= 0.5 ? 1.5 : 1)) // recurring bonus
  if (i.opportunity_id) pts = Math.round(pts * 1.5) // claimed-opportunity +50%
  return pts
}

export function leaderboard(db) {
  index(db)
  const rows = {}
  for (const p of db.people) rows[p.id] = { id: p.id, name: p.name, initials: p.initials, fn: p.fn, realized: 0, forecastRA: 0, recurringNum: 0, recurringDen: 0, points: 0 }
  for (const i of db.initiatives) {
    const ipts = initiativePoints(i, db)
    for (const c of i.contributions || []) {
      const r = rows[c.user_id]
      if (!r) continue
      const share = c.credit_pct / 100
      r.realized += realizedYTD(i, db) * share
      r.forecastRA += forecastRemainderFY(i, db) * share
      r.recurringNum += rav(i) * recurringRatio(i) * share
      r.recurringDen += rav(i) * share
      r.points += Math.round(ipts * share)
    }
  }
  for (const pl of db.points_ledger || []) if (rows[pl.user_id] && !pl.provisional) rows[pl.user_id].points += pl.points
  const peopleById = idx(db).peopleById
  const list = Object.values(rows).map((r) => ({
    ...r,
    procurement: !!peopleById[r.id]?.procurement,
    totalFY: r.realized + r.forecastRA,
    recurringRatio: r.recurringDen ? r.recurringNum / r.recurringDen : 0,
    badges: earnedBadges(r, db),
  }))
  // Procurement is ranked on its OWN board, not the organization board.
  // Procurement's mandate is to generate savings, so including them would
  // dominate the engagement ranking — the org board keeps the rest of the
  // organization competing (change-management). Enterprise value still counts
  // every initiative once; only the leaderboard attribution is separated.
  const board = (arr) => ({
    total: arr.filter((r) => r.totalFY > 0 || r.points > 0).sort((a, b) => b.totalFY - a.totalFY),
    realized: arr.slice().sort((a, b) => b.realized - a.realized),
    forecast: arr.slice().sort((a, b) => b.forecastRA - a.forecastRA),
    points: arr.slice().sort((a, b) => b.points - a.points),
  })
  const org = board(list.filter((r) => !r.procurement))
  // headline `total/realized/...` default to the ORGANIZATION board (back-compat).
  return { ...org, org, procurement: board(list.filter((r) => r.procurement)) }
}

function earnedBadges(r, db) {
  const out = []
  if (r.realized >= 100_000) out.push('$100K Club')
  if (r.totalFY >= 1_000_000) out.push('$1M Club')
  if (r.recurringRatio >= 0.7) out.push('Recurring Hero')
  // Opportunity Closer — owns/contributes to an initiative tied to an opportunity
  if (db.initiatives.some((i) => i.opportunity_id && (i.contributions || []).some((c) => c.user_id === r.id)))
    out.push('Opportunity Closer')
  return out
}

// ---- P&L impact (reporting) ------------------------------------------------
export function pnlImpact(db) {
  const out = { cogs: { recurring: 0, one_time: 0 }, opex: { recurring: 0, one_time: 0 } }
  for (const i of db.initiatives.filter(isActive)) {
    const scale = rav(i) / Math.max(1, sum(i.benefit_lines || [], (b) => b.annual_amount)) // risk-adjust the lines
    for (const b of i.benefit_lines || []) out[b.pnl_line][b.recurrence] += b.annual_amount * scale
  }
  return out
}

// ---- audit log helper (writes) ---------------------------------------------
export function auditEntry(actor_id, action, entity, detail, ts) {
  return { id: `al-${ts || ''}-${Math.floor((Number(ts) || 0) % 100000)}`, ts, actor_id, action, entity, detail }
}

// ===========================================================================
// v2 — EVROS engines: hierarchy, financial extras, forecast profiles, value
// leakage, dependency graph, scenarios/Monte Carlo, optimization, AI mining,
// value matrices, executive control tower + decision queue.
// ===========================================================================

// ---- forecast profiles (time-phasing shapes) -------------------------------
export const PROFILE_LABEL = { linear: 'Linear', ramp: 'Ramp', scurve: 'S-curve', seasonal: 'Seasonal' }
export function profileWeights(profile, n) {
  if (n <= 0) return []
  let w
  if (profile === 'ramp') w = Array.from({ length: n }, (_, k) => k + 1)
  else if (profile === 'scurve') w = Array.from({ length: n }, (_, k) => { const x = (k + 0.5) / n; return 1 / (1 + Math.exp(-10 * (x - 0.5))) })
  else if (profile === 'seasonal') w = Array.from({ length: n }, (_, k) => 1 + 0.5 * Math.sin((k / n) * 2 * Math.PI))
  else w = Array.from({ length: n }, () => 1)
  const s = w.reduce((a, b) => a + b, 0)
  return w.map((x) => x / s)
}

// ---- financial extras (net, payback, NPV) ----------------------------------
export const netAnnual = (i) => i.gross_annual_value * recurringRatio(i)
export function paybackMonths(i) {
  const monthly = i.gross_annual_value / 12
  return i.implementation_cost && monthly > 0 ? i.implementation_cost / monthly : 0
}
export function npv(i, db) {
  const r = db.meta.discountRate ?? 0.1, H = db.meta.npvHorizonYears ?? 3
  const annual = netAnnual(i) || i.gross_annual_value
  let v = -(i.implementation_cost || 0)
  for (let y = 1; y <= H; y++) v += annual / Math.pow(1 + r, y)
  return v
}
export function financials(i, db) {
  return { gross: i.gross_annual_value, net: netAnnual(i), rav: rav(i), roi: roi(i),
    implementationCost: i.implementation_cost || 0, paybackMonths: paybackMonths(i), npv: npv(i, db), recurringRatio: recurringRatio(i) }
}

// ---- value leakage engine (forecast vs actual + classification) ------------
export function expectedToDate(i, db) {
  if (!REALIZING_STAGES.includes(i.stage) && i.stage !== 'retired') return 0
  const { elapsed } = frame(db)
  const sofar = profileWeights(i.profile || 'linear', 12).slice(0, elapsed).reduce((a, b) => a + b, 0)
  return rav(i) * sofar
}
export function leakage(i, db) {
  const expected = expectedToDate(i, db)
  const realized = realizedYTD(i, db)
  const timing = Math.max(0, expected - realized)
  const contract = valueLeakage(i, db) || 0
  return { timing, contract, total: timing + Math.max(0, contract - timing), expected, realized }
}
export function leakageBreakdown(db) {
  let timing = 0, contract = 0
  const items = []
  for (const i of db.initiatives.filter((x) => REALIZING_STAGES.includes(x.stage))) {
    const l = leakage(i, db)
    timing += l.timing; contract += l.contract
    if (l.total > 1000) items.push({ id: i.id, title: i.title, ...l, recoverable: l.timing })
  }
  items.sort((a, b) => b.total - a.total)
  return { timing, contract, total: timing + contract, items }
}

// ---- dependency engine -----------------------------------------------------
export const depEdges = (db) => db.dependencies || []
export const dependents = (db, id) => depEdges(db).filter((e) => e.from === id).map((e) => e.to)
export const prerequisites = (db, id) => depEdges(db).filter((e) => e.to === id).map((e) => e.from)
export function downstreamImpact(db, id) {
  const seen = new Set(), stack = [...dependents(db, id)]
  while (stack.length) { const x = stack.pop(); if (seen.has(x)) continue; seen.add(x); for (const d of dependents(db, x)) stack.push(d) }
  const byId = Object.fromEntries(db.initiatives.map((i) => [i.id, i]))
  const list = [...seen].map((x) => byId[x]).filter(Boolean)
  return { ids: [...seen], count: seen.size, ravAtRisk: sum(list, rav), initiatives: list }
}
export function criticalPath(db) {
  const byId = Object.fromEntries(db.initiatives.map((i) => [i.id, i]))
  const memo = {}
  // Longest dependency chain (most nodes), tie-broken by total risk-adjusted value.
  const better = (a, b) => a.len > b.len || (a.len === b.len && a.val > b.val)
  const best = (id) => {
    if (memo[id]) return memo[id]
    const w = rav(byId[id] || {}) || 0
    let nx = { len: 0, val: 0, path: [] }
    for (const d of dependents(db, id)) { const r = best(d); if (better(r, nx)) nx = r }
    return (memo[id] = { len: 1 + nx.len, val: w + nx.val, path: [id, ...nx.path] })
  }
  let top = { len: 0, val: 0, path: [] }
  for (const i of db.initiatives) { const r = best(i.id); if (better(r, top)) top = r }
  return { path: top.path.map((id) => byId[id]).filter(Boolean), value: top.val, length: top.path.length }
}
export function dependencyGraph(db) {
  const nodes = db.initiatives.filter((i) => i.stage !== 'proposed').map((i) => ({ id: i.id, title: i.title, stage: i.stage, rav: rav(i), rag: i.status_rag, program_id: i.program_id }))
  const ids = new Set(nodes.map((n) => n.id))
  return { nodes, edges: depEdges(db).filter((e) => ids.has(e.from) && ids.has(e.to)) }
}

// ---- hierarchy rollups (Portfolio > Program > Initiative) -------------------
export function programRollup(db) {
  const m = {}
  for (const i of db.initiatives) {
    const k = i.program_id || '—'
    m[k] ||= { id: k, realized: 0, raPipeline: 0, forecastRA: 0, gross: 0, count: 0, atRisk: 0 }
    m[k].realized += realizedYTD(i, db); m[k].forecastRA += forecastRemainderFY(i, db); m[k].gross += i.gross_annual_value
    if (isActive(i)) { m[k].raPipeline += rav(i); m[k].count++; if (i.status_rag === 'red') m[k].atRisk += rav(i) }
  }
  const byId = Object.fromEntries((db.programs || []).map((p) => [p.id, p]))
  return Object.values(m).map((r) => ({ ...r, name: byId[r.id]?.name || r.id, portfolio_id: byId[r.id]?.portfolio_id, totalFY: r.realized + r.forecastRA }))
}
export function portfolioRollup(db) {
  const m = {}
  for (const p of programRollup(db)) {
    const k = p.portfolio_id || '—'
    m[k] ||= { id: k, realized: 0, raPipeline: 0, forecastRA: 0, atRisk: 0, count: 0, programs: [] }
    m[k].realized += p.realized; m[k].raPipeline += p.raPipeline; m[k].forecastRA += p.forecastRA
    m[k].atRisk += p.atRisk; m[k].count += p.count; m[k].programs.push(p)
  }
  const byId = Object.fromEntries((db.portfolios || []).map((p) => [p.id, p]))
  return Object.values(m).map((r) => ({ ...r, name: byId[r.id]?.name || r.id, totalFY: r.realized + r.forecastRA })).sort((a, b) => b.totalFY - a.totalFY)
}

// ---- scenarios + Monte Carlo (deterministic analytic band) -----------------
export function monteCarlo(db) {
  const active = db.initiatives.filter(isActive)
  let mean = 0, variance = 0
  for (const i of active) {
    const m = rav(i)
    const sd = m * (1 - confidence(i.stage)) * 0.6 + i.gross_annual_value * 0.05 * (1 - confidence(i.stage))
    mean += m; variance += sd * sd
  }
  const sd = Math.sqrt(variance)
  return { p10: Math.max(0, mean - 1.2816 * sd), p50: mean, p90: mean + 1.2816 * sd, mean, sd }
}
export function sensitivity(db) {
  return db.initiatives.filter(isActive)
    .map((i) => ({ id: i.id, title: i.title, swing: rav(i) * (1 - confidence(i.stage)) }))
    .sort((a, b) => b.swing - a.swing).slice(0, 8)
}

// ---- portfolio optimization / capital allocation (greedy knapsack) ---------
export function optimize(db, budget, mode = 'roi') {
  const cands = db.initiatives.filter((i) => isActive(i) && STAGES.indexOf(i.stage) < STAGES.indexOf('launch') && (i.implementation_cost || 0) > 0)
  const ranked = cands.map((i) => ({ i, value: rav(i), cost: i.implementation_cost, eff: rav(i) / Math.max(1, i.implementation_cost) }))
    .sort((a, b) => (mode === 'roi' ? b.eff - a.eff : b.value - a.value))
  const picked = new Set(); let spend = 0, value = 0
  for (const c of ranked) if (spend + c.cost <= budget) { picked.add(c); spend += c.cost; value += c.value }
  const row = (c) => ({ id: c.i.id, title: c.i.title, stage: c.i.stage, value: c.value, cost: c.cost, eff: c.eff })
  return {
    budget, spend, value, count: picked.size,
    selected: ranked.filter((c) => picked.has(c)).map(row),
    deferred: ranked.filter((c) => !picked.has(c)).map(row),
    candidateCost: sum(cands, (i) => i.implementation_cost), candidateValue: sum(cands, rav),
  }
}

// ---- AI opportunity mining (heuristic over the spend cube; labeled) --------
export function mineOpportunities(db) {
  const covered = new Set(db.initiatives.map((i) => i.group_id))
  const cfgByGroup = idx(db).cfgByGroup
  const out = []
  for (const g of spendRollup(db).groups) {
    const inflation = db.sourcing_groups.find((x) => x.id === g.id)?.inflation || 0
    const signals = []
    if (g.spend >= 30e6) signals.push('large category')
    if (g.fragmented) signals.push('supplier fragmentation')
    if (g.maverickPct >= 0.12) signals.push('high off-contract spend')
    if (inflation >= 0.05) signals.push('inflation exposure')
    if (!signals.length) continue
    out.push({
      id: `mine-${g.id}`, group_id: g.id, group: g.name, spend: g.spend,
      estValue: Math.round(g.spend * (cfgByGroup[g.id]?.conservative_pct ?? 0.03)),
      signals, confidence: Math.min(0.95, 0.4 + signals.length * 0.15), alreadyCovered: covered.has(g.id),
      lever: g.fragmented ? 'Supplier consolidation' : g.maverickPct >= 0.12 ? 'On-contract / maverick capture' : inflation >= 0.05 ? 'Index cap / price lock' : 'Cleansheet / should-cost',
    })
  }
  return out.sort((a, b) => b.estValue - a.estValue)
}

// ---- value matrices (heatmaps: value vs risk / value vs effort) ------------
export function valueMatrix(db) {
  return db.initiatives.filter(isActive).map((i) => ({
    id: i.id, title: i.title, stage: i.stage, pillar: i.pillar, rag: i.status_rag,
    value: rav(i), risk: worstRisk(i) || 1, effort: i.effort_score || 1,
  }))
}

// ---- executive control tower + decision queue ------------------------------
export function inflationExposure(db) {
  let total = 0; const byGroup = []
  for (const g of db.sourcing_groups) {
    const addr = sum(db.spend_categories.filter((c) => c.group_id === g.id && c.addressable), (c) => c.spend * (c.addressable_pct / 100))
    const exposure = addr * (g.inflation || 0)
    total += exposure; byGroup.push({ id: g.id, name: g.name, inflation: g.inflation, exposure })
  }
  return { total, byGroup: byGroup.sort((a, b) => b.exposure - a.exposure) }
}
export function controlTower(db) {
  const r = enterpriseRollup(db)
  const leak = leakageBreakdown(db)
  const opt = optimize(db, db.meta.capitalBudget || 6e6)
  return {
    valueCreated: r.realizedYTD, raPipeline: r.raPipeline, forecastRA: r.forecastRemainderFY,
    identifiedOpportunity: r.identifiedOpportunity, blendedROI: r.blendedROI,
    valueAtRisk: sum(db.initiatives.filter((i) => isActive(i) && i.status_rag === 'red'), rav) + leak.total,
    leakage: leak.total, inflationExposure: inflationExposure(db).total,
    capitalBudget: db.meta.capitalBudget || 6e6, capitalDeployed: sum(db.initiatives.filter(isActive), (i) => i.implementation_cost || 0),
    optimizableValue: opt.value,
  }
}
// What needs a human, ranked by value — the cockpit's decision queue.
export function decisionsRequired(db, user) {
  const out = []
  for (const i of db.initiatives.filter((x) => x.request)) {
    const roles = canApproveRoles(user, i)
    if (!roles.length) continue
    out.push({ kind: 'approval', id: i.id, title: i.title, value: i.gross_annual_value,
      detail: i.request.kind === 'intake' ? 'New project — approve into pipeline' : `Advance → ${STAGE_LABEL[i.request.to_stage]}`, action: 'approve', roles })
  }
  for (const l of leakageBreakdown(db).items.slice(0, 6))
    out.push({ kind: 'leakage', id: l.id, title: l.title, value: l.total, detail: 'Value leaking vs plan — open recovery', action: 'open' })
  for (const i of db.initiatives.filter((x) => REALIZING_STAGES.includes(x.stage) && x.status_rag === 'red'))
    out.push({ kind: 'risk', id: i.id, title: i.title, value: rav(i), detail: 'At-risk in realization — review countermeasure', action: 'open' })
  return out.sort((a, b) => b.value - a.value)
}

// ===========================================================================
// Phase 2.5 — experience layer: AI copilot, decision narrative, recognition,
// sustainment scoring. (AI is rules-based/deterministic — labeled in the UI.)
// ===========================================================================
const _m = (n) => (n == null ? '—' : (n < 0 ? '-' : '') + '$' + (Math.abs(n) >= 1e6 ? (Math.abs(n) / 1e6).toFixed(2) + 'M' : Math.round(Math.abs(n) / 1e3) + 'K'))

// ---- AI-generated executive summary (decision narrative) -------------------
export function execSummary(db) {
  const ct = controlTower(db)
  const dec = decisionsRequired(db, { role: 'admin' })
  const top = rankInitiatives(db, 'return')[0]
  const leak = leakageBreakdown(db)
  return {
    headline: `${_m(ct.valueCreated)} realized · ${_m(ct.raPipeline)} risk-adjusted pipeline · ${dec.length} decisions pending`,
    bullets: [
      top && `Largest return is "${top.title}" at ${_m(top.rav)} risk-adjusted value.`,
      `${_m(ct.valueAtRisk)} of value is at risk, including ${_m(ct.leakage)} leaking versus plan${leak.items[0] ? ` (biggest: ${leak.items[0].title})` : ''}.`,
      `Inflation exposure is ${_m(ct.inflationExposure)} — cost avoidance has to offset it.`,
      `${_m(ct.optimizableValue)} of value is fundable within the ${_m(ct.capitalBudget)} capital budget.`,
    ].filter(Boolean),
  }
}

// ---- "What changed?" — recent activity from the audit log ------------------
export function whatChanged(db, limit = 8) {
  return (db.audit_log || []).slice(0, limit).map((e) => ({
    ts: e.ts, actor: personName(db, e.actor_id), action: e.action, entity: e.entity, detail: e.detail,
  }))
}

// ---- proactive copilot insight cards ---------------------------------------
export function copilotInsights(db, user) {
  const cards = []
  const sum = execSummary(db)
  cards.push({ kind: 'summary', title: 'Executive summary', body: sum.headline })
  const mine = decisionsRequired(db, user).filter((d) => d.kind === 'approval')
  if (mine.length) cards.push({ kind: 'approval', title: `${mine.length} approval${mine.length > 1 ? 's' : ''} await you`, body: `Top: "${mine[0].title}" (${_m(mine[0].value)}).`, target: mine[0].id })
  const leak = leakageBreakdown(db)
  if (leak.items[0]) cards.push({ kind: 'leakage', title: 'Largest value leakage', body: `"${leak.items[0].title}" — ${_m(leak.items[0].total)} vs plan. Open a recovery.`, target: leak.items[0].id })
  const mined = mineOpportunities(db).filter((m) => !m.alreadyCovered)[0]
  if (mined) cards.push({ kind: 'opportunity', title: 'Suggested opportunity', body: `${mined.group}: ${mined.lever}, est. ${_m(mined.estValue)} (${mined.signals.join(', ')}).` })
  const eroding = db.initiatives.map((i) => ({ i, s: sustainmentScore(i, db) })).filter((x) => x.s && x.s.erosion)[0]
  if (eroding) cards.push({ kind: 'sustainment', title: 'Savings erosion alert', body: `"${eroding.i.title}" is realizing below plan (${Math.round(eroding.s.score * 100)}% of expected).`, target: eroding.i.id })
  return cards
}

// ---- Ask EVRO — rules-based question answering -----------------------------
export function answerQuery(db, user, q) {
  const t = (q || '').toLowerCase()
  const has = (...k) => k.some((x) => t.includes(x))
  if (has('summary', 'how are we', 'overview', 'headline')) { const s = execSummary(db); return { title: 'Executive summary', body: s.headline, bullets: s.bullets } }
  if (has('forecast', 'scenario', 'landing')) { const sc = scenarioTotals(db), mc = monteCarlo(db); return { title: 'Forecast', body: `Committed ${_m(sc.committed)} · Expected ${_m(sc.expected)} (headline) · Upside ${_m(sc.upside)}. Monte-Carlo P10–P90: ${_m(mc.p10)}–${_m(mc.p90)}.` } }
  if (has('leak', 'erosion')) { const l = leakageBreakdown(db); return { title: 'Value leakage', body: `${_m(l.total)} total — ${_m(l.timing)} timing, ${_m(l.contract)} implemented-vs-negotiated. ${l.items.length} initiatives leaking.`, bullets: l.items.slice(0, 4).map((x) => `${x.title} — ${_m(x.total)}`) } }
  if (has('approv', 'sign off', 'pending')) { const d = decisionsRequired(db, user).filter((x) => x.kind === 'approval'); return { title: 'Approvals awaiting you', body: d.length ? `${d.length} pending.` : 'Nothing awaiting your sign-off.', bullets: d.slice(0, 5).map((x) => `${x.title} — ${_m(x.value)}`) } }
  if (has('opportun', 'mine', 'mining', 'sourcing idea')) { const m = mineOpportunities(db); return { title: 'Opportunities', body: `${m.length} mined signals.`, bullets: m.slice(0, 5).map((x) => `${x.group}: ${x.lever} — ${_m(x.estValue)}`) } }
  if (has('risk', 'at risk')) { const r = enterpriseRollup(db).topRisks; return { title: 'Top risks', body: `${r.length} open risks on the watch list.`, bullets: r.slice(0, 5).map((x) => `${x.title} — score ${x.score}`) } }
  if (has('optimi', 'capital', 'budget', 'allocat')) { const o = optimize(db, db.meta.capitalBudget); return { title: 'Capital allocation', body: `Within ${_m(o.budget)}: fund ${o.count} initiatives for ${_m(o.value)} risk-adjusted value (${_m(o.spend)} deployed).` } }
  if (has('champion', 'leader', 'who', 'top perform', 'recognition')) { const lb = leaderboard(db).total[0]; return { title: 'Top performer', body: lb ? `${lb.name} leads the organization board with ${_m(lb.totalFY)} total FY.` : 'No standings yet.' } }
  return { title: 'Ask EVRO', body: 'Try: "summary", "forecast", "leakage", "approvals", "opportunities", "risks", "capital", or "who is the top champion?"' }
}

// ---- recognition / gamification --------------------------------------------
export const POINT_LEVELS = [{ name: 'Platinum', min: 10000 }, { name: 'Gold', min: 5000 }, { name: 'Silver', min: 2000 }, { name: 'Bronze', min: 0 }]
export const levelFor = (points) => POINT_LEVELS.find((l) => points >= l.min)?.name || 'Bronze'
export function streakFor(db, userId) {
  const fy = String(db.meta.fiscalYear)
  const months = new Set()
  for (const i of db.initiatives) {
    if (!(i.contributions || []).some((c) => c.user_id === userId)) continue
    for (const a of i.actuals || []) if (a.validated && a.period.startsWith(fy)) months.add(a.period.slice(0, 7))
  }
  const { nowMonth, fyMonths } = frame(db)
  let streak = 0
  for (let k = fyMonths.length - 1; k >= 0; k--) {
    const mk = fyMonths[k].slice(0, 7)
    if (mk > nowMonth) continue
    if (months.has(mk)) streak++; else break
  }
  return streak
}
export function recognition(db) {
  const lb = leaderboard(db)
  const all = [...lb.org.total, ...lb.procurement.total]
    .map((p) => ({ ...p, level: levelFor(p.points), streak: streakFor(db, p.id), millionClub: p.totalFY >= 1_000_000 }))
    .sort((a, b) => b.points - a.points)
  const byLevel = {}
  for (const l of POINT_LEVELS) byLevel[l.name] = all.filter((p) => p.level === l.name).length
  return { people: all, millionClub: all.filter((p) => p.millionClub), byLevel, org: lb.org, procurement: lb.procurement }
}

// ---- sustainment scoring + erosion (30/90/180/365 realization tracking) ----
export function sustainmentScore(i, db) {
  if (!['realization', 'sustainment', 'retired'].includes(i.stage)) return null
  const expected = expectedToDate(i, db)
  const realized = realizedYTD(i, db)
  const score = expected ? Math.min(1.2, realized / expected) : 1
  return { score, band: score >= 0.9 ? 'strong' : score >= 0.7 ? 'watch' : 'eroding', erosion: score < 0.7, expected, realized }
}
export function sustainmentBook(db) {
  const items = db.initiatives.filter((i) => ['realization', 'sustainment', 'retired'].includes(i.stage))
    .map((i) => ({ id: i.id, title: i.title, stage: i.stage, ...sustainmentScore(i, db) }))
    .sort((a, b) => a.score - b.score)
  return { items, eroding: items.filter((x) => x.erosion), avg: items.length ? items.reduce((a, x) => a + x.score, 0) / items.length : 1 }
}
