// Executive Scenario Mode (5B.7 item 6) — strategic what-if levers (macro,
// operational, workforce, customer, capital) mapped deterministically onto the
// existing engine outputs, reading out as EBITDA, cash, risk, capacity and
// enterprise-value impacts. Every lever names the integration feed a live
// digital twin would drive it from (the same registry as /api/integration).
// View-only; illustrative multipliers are labelled; no engine change.
import {
  enterpriseRollup, controlTower, pnlImpact, isActive, rav, optimize,
} from './engine.js'
import { valueWaterfall } from './decomp.js'
import { integrationSources } from './model.js'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export const EXEC_LEVERS = [
  { key: 'macro', label: 'Macroeconomic — inflation', min: -2, max: 5, step: 0.5, unit: 'pts', zero: 0,
    help: 'Shift input-cost inflation vs the configured sourcing-group rates.', feed: 'finance' },
  { key: 'ops', label: 'Operational productivity', min: -15, max: 15, step: 1, unit: '%', zero: 0,
    help: 'Better or worse delivery across the realizing book (realization factor).', feed: 'operations' },
  { key: 'workforce', label: 'Workforce capacity', min: -20, max: 20, step: 5, unit: '%', zero: 0,
    help: 'Owner capacity to carry initiatives — hiring, attrition, redeployment.', feed: 'hr' },
  { key: 'customer', label: 'Customer demand', min: -10, max: 10, step: 1, unit: '%', zero: 0,
    help: 'Service-volume shift on the customer-facing book (Collection & Post-Collection).', feed: 'crm' },
  { key: 'capital', label: 'Capital budget', min: -50, max: 50, step: 10, unit: '%', zero: 0,
    help: 'Expand or cut the implementation budget the optimizer can deploy.', feed: 'finance' },
]
export const ZERO_LEVERS = Object.fromEntries(EXEC_LEVERS.map((l) => [l.key, 0]))

// Which registry source feeds each lever in a live digital twin.
export function leverFeeds(db) {
  const sources = integrationSources(db)
  const byCat = {}
  for (const s of sources) (byCat[s.category] ||= []).push(s)
  return Object.fromEntries(EXEC_LEVERS.map((l) => {
    const list = byCat[l.feed] || []
    const live = list.find((s) => s.status === 'connected') || list[0]
    return [l.key, live ? { name: live.name, status: live.status } : null]
  }))
}

export function execScenario(db, lv) {
  const roll = enterpriseRollup(db)
  const ct = controlTower(db)
  const pnl = pnlImpact(db)
  const active = db.initiatives.filter(isActive)
  const wf = valueWaterfall(db)

  // multipliers from the levers
  const mOps = 1 + lv.ops / 100
  const cxRav = active.filter((i) => i.business_unit === 'Collection & Post-Collection').reduce((a, i) => a + rav(i), 0)
  const cxShare = cxRav / Math.max(1, ct.raPipeline)
  const mCust = 1 + (lv.customer / 100) * cxShare
  // inflation sensitivity: addressable spend × 1pt (linear around the
  // configured sourcing-group rates — stated as an approximation)
  const addrPerPt = db.spend_categories
    .filter((c) => c.addressable)
    .reduce((a, c) => a + c.spend * (c.addressable_pct / 100), 0) * 0.01
  const macroCost = lv.macro * addrPerPt

  // EBITDA — recurring PROGRAM value flowing through the P&L, flexed for
  // delivery and demand. Inflation pressure is a different scope (the whole
  // addressable cost base), so it reads out as its own line, never silently
  // netted into the program's contribution.
  const ebitdaBase = pnl.cogs.recurring + pnl.opex.recurring
  const ebitda = ebitdaBase * mOps * mCust

  // Cash (FY) — one-time benefits plus capital headroom vs deployment.
  const oneTimeBase = pnl.cogs.one_time + pnl.opex.one_time
  const budget = (db.meta.capitalBudget || 6e6) * (1 + lv.capital / 100)
  const cashBase = oneTimeBase + (db.meta.capitalBudget || 6e6) - ct.capitalDeployed
  const cash = oneTimeBase * mOps + budget - ct.capitalDeployed

  // Risk — value at risk pressured by execution and workforce shortfalls.
  const riskMult = clamp(1 - (lv.ops / 100) * 1.2 - Math.min(0, lv.workforce) / 100, 0.4, 2)
  const varBase = ct.valueAtRisk
  const varNow = varBase * riskMult

  // Capacity — active initiatives vs what owners can carry (portfolio norm:
  // ~3 concurrent initiatives per owner, labelled illustrative).
  const owners = new Set(active.map((i) => i.owner_id)).size
  const slotsBase = owners * 3
  const slots = Math.round(slotsBase * (1 + lv.workforce / 100))
  const utilBase = active.length / Math.max(1, slotsBase)
  const util = active.length / Math.max(1, slots)

  // Enterprise value — the program's net realizable run-rate under the
  // levers, plus what an expanded capital budget lets the optimizer fund.
  const optBase = optimize(db, db.meta.capitalBudget || 6e6).value
  const optNow = lv.capital !== 0 ? optimize(db, budget).value : optBase
  const evBase = wf.net
  const ev = wf.net * mOps * mCust + (optNow - optBase)

  const m$ = (n) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`)
  const out = (key, label, base, now, fmt, note) => ({ key, label, base, now, delta: now - base, fmt, note })
  return {
    impacts: [
      out('ebitda', 'Program EBITDA contribution', ebitdaBase, ebitda, 'money', 'recurring program value through the P&L (annual run-rate)'),
      out('macro', 'Inflation pressure (cost base)', 0, -macroCost, 'money', `enterprise-wide, on ${m$(addrPerPt * 100)} addressable spend — a different scope than the program`),
      out('cash', 'Cash position (FY)', cashBase, cash, 'money', 'one-time benefits + capital headroom'),
      out('risk', 'Value at risk', varBase, varNow, 'money', 'execution & workforce pressure on exposed value'),
      out('capacity', 'Capacity utilization', utilBase, util, 'pct', `${active.length} active vs ~${slots} owner slots (≈3 per owner, illustrative)`),
      out('ev', 'Program value creation', evBase, ev, 'money', 'net realizable run-rate + capital unlock'),
    ],
    notes: {
      macro: `±1pt ≈ ${m$(addrPerPt)}/yr on the addressable cost base (linear approximation)`,
      customer: `customer-facing book is ${Math.round(cxShare * 100)}% of the risk-adjusted pipeline`,
    },
  }
}
