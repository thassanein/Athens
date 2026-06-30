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

export const STAGES = ['idea', 'feasibility', 'capability', 'launch', 'closed']
export const STAGE_LABEL = { idea: 'Idea', feasibility: 'Feasibility', capability: 'Capability', launch: 'Launch', closed: 'Closed' }
export const STAGE_CONFIDENCE = { idea: 0.25, feasibility: 0.5, capability: 0.75, launch: 1.0, closed: 1.0 }
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

// ---- small helpers ---------------------------------------------------------
const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + f(x), 0)
const monthKey = (period) => (period || '').slice(0, 7)

export function confidence(stage) {
  return STAGE_CONFIDENCE[stage] ?? 0
}

// Build fast lookups onto the raw db (idempotent).
export function index(db) {
  if (db._idx) return db
  const peopleById = Object.fromEntries(db.people.map((p) => [p.id, p]))
  const categoriesById = Object.fromEntries(db.spend_categories.map((c) => [c.id, c]))
  const groupsById = Object.fromEntries(db.sourcing_groups.map((g) => [g.id, g]))
  const cfgByGroup = Object.fromEntries(db.savings_pct_config.map((c) => [c.group_id, c]))
  db._idx = { peopleById, categoriesById, groupsById, cfgByGroup }
  return db
}
export const personName = (db, id) => index(db)._idx.peopleById[id]?.name || '—'
export const groupName = (db, id) => index(db)._idx.groupsById[id]?.name || '—'
export const categoryName = (db, id) => index(db)._idx.categoriesById[id]?.name || '—'

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
export const isActive = (i) => i.stage !== 'closed'

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
  if (i.stage === 'closed') return 0
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
  if (!next || next === 'closed') return { ok: false, next: null, reasons: ['No further gate.'] }
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
  const committed = sum(inits.filter((i) => i.stage === 'launch' || i.stage === 'closed'), rav)
  const expected = sum(inits.filter(isActive), rav)
  const upside = sum(inits.filter((i) => i.stage === 'capability' || i.stage === 'launch'), (i) => i.gross_annual_value)
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
        if (i.stage === 'launch') committed += rav(i) / 12
        if (isActive(i)) expected += rav(i) / 12
        if (i.stage === 'capability' || i.stage === 'launch') upside += i.gross_annual_value / 12
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
  const atOrBeyond = (s) => db.initiatives.filter((i) => order.indexOf(i.stage) >= order.indexOf(s) || i.stage === 'closed').length
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
  index(db)
  return db.opportunities.map((o) => {
    const g = db._idx.groupsById[o.group_id]
    const cfg = db._idx.cfgByGroup[o.group_id]
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
  let pts = 10 + 15 // submit + passes triage (all seeded ideas accepted)
  const reached = STAGES.indexOf(i.stage)
  for (const s of ['feasibility', 'capability', 'launch']) {
    if (reached >= STAGES.indexOf(s)) pts += ADVANCE_PTS[s]
  }
  if (i.stage === 'launch' || i.stage === 'closed') pts += Math.floor(rav(i) / 10_000) * 25 // per $10k RA at Launch
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
  const list = Object.values(rows).map((r) => ({
    ...r,
    totalFY: r.realized + r.forecastRA,
    recurringRatio: r.recurringDen ? r.recurringNum / r.recurringDen : 0,
    badges: earnedBadges(r, db),
  }))
  // headline rank = Total FY (Realized YTD + risk-adjusted forecast FY)
  return {
    total: list.slice().filter((r) => r.totalFY > 0 || r.points > 0).sort((a, b) => b.totalFY - a.totalFY),
    realized: list.slice().sort((a, b) => b.realized - a.realized),
    forecast: list.slice().sort((a, b) => b.forecastRA - a.forecastRA),
    points: list.slice().sort((a, b) => b.points - a.points),
  }
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
