// Procurement definitions layer — one shared glossary so any expression on any
// screen can be explained on hover, and every project phase carries a clear
// definition plus the risks that specifically matter in that phase. Pure data
// over the existing SAVINGS_TYPES / SAVINGS_LIFECYCLE / VALUE_CHAIN, so it never
// disagrees with the model. No engine, mutation or data change.
import { SAVINGS_TYPES, SAVINGS_LIFECYCLE, VALUE_CHAIN, savingsType, lifecycleMeta } from './procurement.js'

// ── Key expressions — definition + a concrete Athens example. Keyed by a lower-
// case term so <Term> can look them up.
// Plain-English first. Every definition leads with what it means to someone new
// to procurement, so a legacy Athens user is never stuck on a word.
export const EXPRESSIONS = [
  { term: 'Savings Under Management', aka: 'the book', definition: 'Every saving we’re working, added up into one number for the whole book. It ties, to the dollar, with the pipeline and the by-type totals.', example: '$12.18M across 43 deals.' },
  { term: 'Addressable spend', definition: 'The spend Procurement can actually influence — it leaves out pass-throughs like taxes, disposal, franchise fees and pension. It’s the base we measure savings against.', example: '$437.4M across 14 sourcing groups.' },
  { term: 'Baseline', definition: 'The “before” price a saving is measured against — the Finance-checked cost we were paying, usually last year’s.', example: 'Last year’s rate for light vehicles.' },
  { term: 'Risk-adjusted', aka: 'Risk-adjusted value', definition: 'The value adjusted for how likely the deal is to actually happen. An early idea counts for less than a signed, delivering deal.', example: '$2.64M idea × 50% likely = $1.32M.' },
  { term: 'Confidence', definition: 'How likely the plan is to land. Early ideas count 25%, signed & delivering deals count 100%; the book figure is the value-weighted average.', example: '45% across the book — higher means more of it is nearly done.' },
  { term: 'Velocity', definition: 'How fast confirmed savings are landing — roughly the dollars banked per month.', example: '$272K a month so far.' },
  { term: 'Leakage', aka: 'not landing yet', definition: 'Savings we’ve agreed but aren’t collecting yet — a discount only saves money once the volume actually flows through the deal. Some is just timing (recoverable); some is structural.', example: '$1.15M agreed but not landing yet.' },
  { term: 'Hard Savings', aka: 'Cost savings', definition: 'A real price cut that lowers what we pay — it shows up in the P&L.', example: 'A renegotiated fleet rate.' },
  { term: 'Cost Avoidance', aka: 'Cost avoidance', definition: 'A price increase we stopped before it hit us. Real value, but it doesn’t lower the P&L, so we track it separately.', example: 'A cap that held price below a quoted hike.' },
  { term: 'Materiality', definition: 'The $100K mark. Deals bigger than this need CPO / Steering sign-off before they launch.', example: 'A $430K award goes to Steering.' },
  { term: 'Run-rate', definition: 'What a cost or saving is worth over a full year at today’s rate.', example: 'This month’s savings × 12.' },
  { term: 'Measurement window', aka: '12-month window', definition: 'We count each saving for 12 months from when it first shows up in the numbers, then it’s “banked” — we don’t keep re-counting it year after year. That keeps the number honest.', example: 'A saving that starts in Feb is counted through the next Jan.' },
  { term: 'Annual impact', aka: 'annualized run-rate', definition: 'The value of a saving over one year. Book totals are “what we’d save in a full year if every deal lands” — only confirmed savings count as banked.', example: '$12.18M/yr in the book; $1.54M confirmed so far.' },
  { term: 'Realized', aka: 'Confirmed & banked', definition: 'Confirmed and banked — Finance has checked it against the actual invoices. Only this counts as delivered.', example: '$1.54M confirmed this year.' },
  { term: 'Committed', definition: 'Approved and being worked — locked into the plan, but not all delivered yet.', example: '$5.88M approved and in progress.' },
  { term: 'Sustained', definition: 'Delivered savings we’re now protecting so they don’t erode over time.', example: '$1.60M locked in and protected.' },
  { term: 'Identified', definition: 'Ideas we’ve found but haven’t committed to yet — the top of the funnel.', example: 'Spend analytics flagged a category to re-source.' },
  { term: 'At risk', definition: 'Deals flagged red — something’s blocking them or they may miss, so they need attention now.', example: '19 deals flagged red.' },
  { term: 'Expected value', definition: 'What a pending decision is worth — the value at stake, adjusted for how likely it is.', example: '$2.32M across the decisions waiting.' },
  { term: 'Governance ladder', aka: 'approvals', definition: 'Who signs off, in order: Category Manager → Finance → CPO / Steering for the big deals.', example: 'Category Manager + Finance on a $171K case.' },
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
