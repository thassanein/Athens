// Procurement definitions layer — one shared glossary so any expression on any
// screen can be explained on hover, and every project phase carries a clear
// definition plus the risks that specifically matter in that phase. Pure data
// over the existing SAVINGS_TYPES / SAVINGS_LIFECYCLE / VALUE_CHAIN, so it never
// disagrees with the model. No engine, mutation or data change.
import { SAVINGS_TYPES, SAVINGS_LIFECYCLE, VALUE_CHAIN, savingsType, lifecycleMeta } from './procurement.js'

// ── Key expressions — definition + a concrete Athens example. Keyed by a lower-
// case term so <Term> can look them up.
export const EXPRESSIONS = [
  { term: 'Savings Under Management', definition: 'The total value in the active savings book — every non-retired opportunity counted once at its lifecycle stage. It reconciles, to the dollar, with the pipeline and the by-type totals.', example: '$12.34M across 43 opportunities.' },
  { term: 'Addressable spend', definition: 'The part of third-party spend Procurement can realistically influence — excludes pass-through like franchise fees, disposal, taxes and pension. Savings ambition is measured against this base, not headline spend.', example: '$437.4M across 116 categories / 14 sourcing groups.' },
  { term: 'Baseline', definition: 'The FP&A-validated reference cost a saving is measured against — usually the 2025 AP-register run-rate for the category. Without a validated baseline a saving cannot advance.', example: 'Original run-rate for Capex Light Vehicles.' },
  { term: 'Risk-adjusted value', aka: 'RAV', definition: 'Gross annual value discounted by the stage confidence and the realization factor — value weighted by how likely it is to actually land.', example: '$2.64M gross × 75% confidence = $1.98M RAV.' },
  { term: 'Confidence', definition: 'How likely the value is to be realized, driven by the lifecycle stage (idea 25% → launch 100%). The book-level figure is value-weighted across every opportunity.', example: '55% value-weighted across the book.' },
  { term: 'Velocity', definition: 'The rate validated savings are landing — annualized validated value added per month, from the same actuals FP&A validates.', example: '$272K/month over 6 elapsed months.' },
  { term: 'Leakage', definition: 'Negotiated value that is not yet flowing through as a run-rate — a discount only saves money once real volume goes through the deal. Timing leakage is recoverable; contract leakage is structural.', example: '$1.15M leaking — $216K timing, $935K contract.' },
  { term: 'Hard Savings', definition: 'A validated price or total-cost reduction that lowers the P&L run-rate. One of the eight savings types.', example: 'A renegotiated Fleet Capital rate.' },
  { term: 'Cost Avoidance', definition: 'A cost increase that would otherwise have hit the P&L but is prevented, priced against a credible would-have baseline. Reported apart from Hard Savings.', example: 'An index cap holding price below quoted inflation.' },
  { term: 'Materiality', definition: 'The $100K annual-value threshold above which a saving needs CPO / Steering Committee approval before Launch.', example: 'A $430K award escalates to Steering.' },
  { term: 'Run-rate', definition: 'The annualized cost or saving as it is currently flowing — what the P&L will show over a full year at the current rate.', example: 'Annualized validated actuals to date.' },
  { term: 'Realized', definition: 'Value that FP&A has validated from monthly actuals this fiscal year. Only realized value counts as delivered.', example: '$1.54M validated year-to-date.' },
  { term: 'Committed', definition: 'Value locked into the plan — opportunities that are approved or beyond, at their negotiated or risk-adjusted value.', example: '$6.05M committed and beyond.' },
  { term: 'Sustained', definition: 'Delivered run-rate that is now being protected against erosion and leakage in the sustainment phase.', example: '$1.60M of run-rate protected.' },
  { term: 'Expected value', definition: 'The risk-adjusted value at stake in a decision — what advancing the opportunity is worth, weighted by confidence.', example: '$2.32M across the decision queue.' },
  { term: 'Governance ladder', definition: 'The approval chain a saving climbs: Category Manager → FP&A Validation → CPO / Steering Committee (for material awards).', example: 'Category Manager + FP&A on a $171K case.' },
]
export const expressionOf = (term) => {
  const k = String(term || '').trim().toLowerCase()
  return EXPRESSIONS.find((e) => e.term.toLowerCase() === k || (e.aka && e.aka.toLowerCase() === k)) || null
}

// ── Per-phase project definition + the risks that specifically matter in that
// phase, with how they are scored. Keyed to the 11 lifecycle stages.
export const PHASE_RISKS = {
  potential: { entry: 'Surfaced from spend analytics.', exit: 'Owned and worth qualifying.', risks: ['Data quality — the spend signal may be miscategorised.', 'Double-count — the same value claimed in two opportunities.'] },
  qualified: { entry: 'Sized against the AP-register baseline.', exit: 'A category lead owns it.', risks: ['Baseline dispute — Finance and Procurement disagree on the reference cost.', 'Over-sizing — an optimistic estimate that will not survive the business case.'] },
  business_case: { entry: 'Baseline and savings logic drafted.', exit: 'FP&A validates the case.', risks: ['Unvalidated baseline — the reference is not yet FP&A-signed.', 'Savings-logic gap — the P&L mapping does not hold up.'] },
  approved: { entry: 'Business case signed off.', exit: 'Committed to the sourcing plan.', risks: ['Scope creep — the approved scope drifts.', 'Stakeholder pull-back — the sponsoring function hesitates.'] },
  negotiation: { entry: 'In the win-room with the supplier.', exit: 'Terms agreed.', risks: ['Supplier leverage — a sole or entrenched supplier resists.', 'Concession creep — giveaways erode the modelled saving.'] },
  awarded: { entry: 'Supplier awarded, value contracted.', exit: 'Contract signed and ready to implement.', risks: ['Contract terms — clauses that weaken price protection.', 'Award delay — the contract stalls in legal.'] },
  implementation: { entry: 'Rolling the new contract into operations.', exit: 'The change is live in spend.', risks: ['Adoption / compliance — buyers keep using the old supplier (maverick spend).', 'Timing leakage — value that does not flow while un-implemented.'] },
  validation: { entry: 'Delivered value being checked.', exit: 'FP&A validates the actuals.', risks: ['Unvalidated actuals — the latest month is not yet signed.', 'Measurement dispute — the delivered number is contested.'] },
  realized: { entry: 'Validated value flowing through the P&L.', exit: 'Value booked and stable.', risks: ['Early erosion — the saving slips in the first months.'] },
  sustained: { entry: 'Run-rate protected against erosion.', exit: 'Value holds through the year.', risks: ['Leakage / erosion — price or volume drifts back over time.', 'Contract lapse — the deal expires without renewal.'] },
  closed: { entry: 'Booked and retired from the active book.', exit: '—', risks: ['—'] },
}

// Risk scoring, in plain language.
export const RISK_SCORING = {
  definition: 'Each risk is scored likelihood (1–5) × impact (1–5) = 1–25. A High risk (≥15) with no logged countermeasure blocks a project from advancing to Launch.',
  bands: [
    { band: 'Low', range: '1–7', tone: 'var(--green)' },
    { band: 'Watch', range: '8–14', tone: 'var(--amber)' },
    { band: 'High', range: '15–25', tone: 'var(--red)' },
  ],
}

// Assembled glossary for the reference surface.
export function glossary() {
  return {
    expressions: EXPRESSIONS,
    savingsTypes: SAVINGS_TYPES,
    valueChain: VALUE_CHAIN,
    phases: SAVINGS_LIFECYCLE.map((s) => ({ ...s, chainLabel: (VALUE_CHAIN.find((c) => c.key === s.chain) || {}).label, ...PHASE_RISKS[s.key] })),
    riskScoring: RISK_SCORING,
  }
}
export { savingsType, lifecycleMeta }
