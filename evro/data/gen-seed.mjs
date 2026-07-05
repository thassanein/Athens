// EVRO seed generator — deterministic. Produces the demo cube + portfolio from
// the real 2025 Athens AP-register numbers (14 sourcing groups, $437.4M
// addressable) plus a credible spread of initiatives, opportunities, people,
// validations, risks and points so every screen renders alive data on first run.
//
//   node evro/data/gen-seed.mjs
//
// Writes:
//   evro/data/seed.json                      ← canonical seed (server reads this)
//   evro/frontend/src/lib/seed-snapshot.js   ← bundled snapshot (demo/offline mode)
//
// IMPORTANT: this is the SOURCE OF TRUTH for demo data. Re-run after edits.
// Everything is derived from a fixed PRNG seed, so output is stable across runs.

import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// --- deterministic PRNG (mulberry32) ---------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20260630)
const rand = () => rng()
const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1))
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const round = (n) => Math.round(n)
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const M = 1_000_000

// --- time frame -------------------------------------------------------------
const NOW = '2026-06-30'
const FY = 2026
const FY_MONTHS = Array.from({ length: 12 }, (_, i) => `${FY}-${String(i + 1).padStart(2, '0')}-01`)
const YTD_MONTHS = FY_MONTHS.slice(0, 6) // Jan–Jun realized window

// ---------------------------------------------------------------------------
// 1) Sourcing groups (brief §4) and their categories (addendum A3.2)
// ---------------------------------------------------------------------------
// spend in $; cats = number of addressable categories; tops = named lead cats.
// `cats` totals to 116 addressable categories (the headline cube count); the
// per-group split keeps the documented small groups (Disposal 2, Labor 3,
// Utilities 2, Rental 4) and adds the remaining long-tail lines to the larger
// groups, which realistically carry more GL detail.
const GROUPS = [
  { id: 'g-fleet', name: 'Fleet Capital', spend: 106.6 * M, cats: 12, pnl: 'cogs', kind: 'capex',
    tops: ['Capex Trucks/Trailers', 'Capex Off-Highway Heavy Equipment', 'Capex Machinery & Equipment'] },
  { id: 'g-facilities', name: 'Facilities', spend: 58.6 * M, cats: 9, pnl: 'opex', kind: 'mixed',
    tops: ['Facility Leases', 'Capex Buildings', 'Facility Repairs'] },
  { id: 'g-benefits', name: 'Benefits & Insurance', spend: 51.2 * M, cats: 7, pnl: 'opex', kind: 'opex',
    tops: ['Health Insurance', 'Insurance', 'Voluntary Benefits Insurance'] },
  { id: 'g-disposal', name: 'Disposal & Transportation Out', spend: 38.4 * M, cats: 2, pnl: 'cogs', kind: 'opex',
    tops: ['Transportation Out - Disposal', 'Transportation Out - Disposal (Collections)'] },
  { id: 'g-maint', name: 'Maintenance Parts & Tires', spend: 38.3 * M, cats: 12, pnl: 'cogs', kind: 'opex',
    tops: ['Inventory Parts Payable', 'Inventory', 'Inventory Clearing'] },
  { id: 'g-containers', name: 'Containers & Bins', spend: 32.8 * M, cats: 8, pnl: 'cogs', kind: 'mixed',
    tops: ['Capex Bins & Barrels', 'Container - Outside Repairs', 'Container Parts - General'] },
  { id: 'g-fuel', name: 'Fuel & CNG', spend: 27.0 * M, cats: 14, pnl: 'cogs', kind: 'opex',
    tops: ['CNG - Athens Stations', 'Diesel - Red Dyed Untaxed', 'Diesel'] },
  { id: 'g-labor', name: 'Outside & Subcontract Labor', spend: 24.3 * M, cats: 3, pnl: 'cogs', kind: 'opex',
    tops: ['Outside Labor', 'Subcontractor Costs', 'Route Subcontracting Expense'] },
  { id: 'g-indirect', name: 'Other Indirect', spend: 18.5 * M, cats: 17, pnl: 'opex', kind: 'opex',
    tops: ['Extraordinary Expenses', 'Entertainment', 'Standing Accrued Expenses'] },
  { id: 'g-itt', name: 'IT & Telecom', spend: 10.6 * M, cats: 6, pnl: 'opex', kind: 'mixed',
    tops: ['Computer Equipment/Software Expense', 'Telephones & Radios', 'Capex Computer Equipment/Software'] },
  { id: 'g-prof', name: 'Professional Services', spend: 10.4 * M, cats: 5, pnl: 'opex', kind: 'opex',
    tops: ['Legal', 'Consulting', 'Recruiting'] },
  { id: 'g-supplies', name: 'Supplies, Uniforms & PPE', spend: 9.5 * M, cats: 15, pnl: 'cogs', kind: 'opex',
    tops: ['Operational Supplies', 'Supplies', 'Uniforms'] },
  { id: 'g-utilities', name: 'Utilities', spend: 6.8 * M, cats: 2, pnl: 'opex', kind: 'opex',
    tops: ['Utilities - MRF', 'Utilities - General'] },
  { id: 'g-rental', name: 'Equipment & Truck Rental', spend: 2.1 * M, cats: 4, pnl: 'opex', kind: 'opex',
    tops: ['Equipment Rental', 'Office Equipment Rental', 'Truck Rental'] },
]

// generic filler category names (used after the named tops) per group
const FILLER = {
  'g-fleet': ['Capex Forklifts', 'Capex Carts & Toters', 'Capex Compactors', 'Capex Roll-off Boxes', 'Capex Light Vehicles', 'Capex Trailers - Specialty'],
  'g-facilities': ['Facility Maintenance', 'Janitorial & Grounds', 'Security Services', 'Capex Site Improvements', 'Property Management'],
  'g-benefits': ['Dental & Vision', 'Life & Disability', 'Wellness Programs'],
  'g-disposal': [],
  'g-maint': ['Tires', 'Lubricants & Fluids', 'Shop Supplies', 'Outside Repairs', 'Welding & Fabrication'],
  'g-containers': ['Bin Refurbishment', 'Lids & Wheels', 'Container Paint & Decals'],
  'g-fuel': ['CNG - Public Stations', 'Unleaded Gasoline', 'DEF', 'Propane', 'Oil & Lubricants', 'Fuel Taxes - Recoverable', 'CNG Maintenance', 'Diesel - Clear'],
  'g-labor': [],
  'g-indirect': ['Travel', 'Dues & Subscriptions', 'Bank & Card Fees', 'Postage & Freight', 'Permits & Licenses', 'Printing', 'Meals', 'Miscellaneous', 'Training', 'Charitable', 'Relocation'],
  'g-itt': ['Software Subscriptions (SaaS)', 'Telecom Data & Voice'],
  'g-prof': ['Audit & Tax'],
  'g-supplies': ['PPE', 'Janitorial Supplies', 'Office Supplies', 'Safety Supplies', 'First Aid', 'Tools - Small', 'Shop Rags', 'Gloves', 'Signage'],
  'g-utilities': [],
  'g-rental': ['Trailer Rental'],
}

// distribute a group's spend across N categories with a heavy head + long tail.
// A $10k floor keeps tail lines realistic; rounding drift is absorbed by the
// head (the largest line) so every amount stays positive.
function distribute(total, n) {
  const weights = Array.from({ length: n }, (_, i) => Math.pow(0.72, i) * (0.85 + rand() * 0.3))
  const sum = weights.reduce((a, b) => a + b, 0)
  const amounts = weights.map((w) => Math.max(10_000, round((w / sum) * total)))
  amounts[0] += total - amounts.reduce((a, b) => a + b, 0)
  return amounts
}

const spend_categories = []
let catSeq = 0
for (const g of GROUPS) {
  const names = [...g.tops, ...(FILLER[g.id] || [])].slice(0, g.cats)
  while (names.length < g.cats) names.push(`${g.name} - Other ${names.length}`)
  const amounts = distribute(g.spend, g.cats)
  names.forEach((nm, i) => {
    const isCapex = /capex/i.test(nm) || (g.kind === 'capex' && i === 0)
    const isLease = /lease/i.test(nm)
    spend_categories.push({
      id: `c-${++catSeq}`,
      group_id: g.id,
      name: nm,
      spend: amounts[i],
      addressable: true,
      addressable_pct: isLease ? 25 : 100, // Facility Leases ≈ a quarter is third-party
      pnl_line: g.pnl,
      recurrence: isCapex ? 'one_time' : 'recurring',
    })
  })
}

// Non-addressable spend (~$256.4M) — loaded, tagged, excluded from sizing.
const NON_ADDRESSABLE = [
  { name: 'Franchise Fees', spend: 110.0 * M },
  { name: 'Accrued Disposal (Pass-Through)', spend: 70.0 * M },
  { name: "Workers' Compensation", spend: 33.0 * M },
  { name: 'Union Pension', spend: 25.4 * M },
  { name: 'Personal Property & Other Taxes', spend: 18.0 * M },
]
for (const na of NON_ADDRESSABLE) {
  spend_categories.push({
    id: `c-${++catSeq}`,
    group_id: null,
    name: na.name,
    spend: na.spend,
    addressable: false,
    addressable_pct: 0,
    pnl_line: 'opex',
    recurrence: 'recurring',
  })
}

const addressableTotal = spend_categories.filter((c) => c.addressable).reduce((a, c) => a + c.spend, 0)

// ---------------------------------------------------------------------------
// 2) savings_pct config — illustrative, pending Supply Chain / FP&A validation.
//    NEVER hardcode in the engine; sizing reads from here.
// ---------------------------------------------------------------------------
const savings_pct_config = GROUPS.map((g) => ({
  group_id: g.id,
  conservative_pct: 0.03,
  stretch_pct: 0.06,
  basis: 'illustrative — pending Supply Chain / FP&A validation',
}))
const cfgFor = (gid) => savings_pct_config.find((c) => c.group_id === gid)

// ---------------------------------------------------------------------------
// 3) People (demo placeholders — not real Athens staff)
// ---------------------------------------------------------------------------
const people = [
  { id: 'u-torres', name: 'Cesar Torres', initials: 'CT', fn: 'Executive', role: 'exec', title: 'CEO / CFO — Sponsor' },
  { id: 'u-nguyen', name: 'Rosa Nguyen', initials: 'RN', fn: 'FP&A', role: 'fpna', title: 'FP&A Validation Lead' },
  { id: 'u-schwartz', name: 'Lena Schwartzler', initials: 'LS', fn: 'OpEx', role: 'admin', title: 'EVRO Lead — Operational Excellence' },
  { id: 'u-train', name: 'Kofi Train', initials: 'KT', fn: 'OpEx', role: 'admin', title: 'EVRO Analyst' },
  { id: 'u-rivera', name: 'Jordan Rivera', initials: 'JR', fn: 'Fleet', role: 'owner', title: 'Fleet & Maintenance Lead' },
  { id: 'u-okafor', name: 'Sofia Okafor', initials: 'SO', fn: 'MRF Ops', role: 'owner', title: 'MRF Operations Manager' },
  { id: 'u-chen', name: 'Marcus Chen', initials: 'MC', fn: 'Procurement', role: 'procurement', procurement: true, title: 'Procurement Lead — Supply Chain' },
  { id: 'u-anand', name: 'Priya Anand', initials: 'PA', fn: 'Procurement', role: 'procurement', procurement: true, title: 'Senior Sourcing Manager' },
  { id: 'u-patel', name: 'Dev Patel', initials: 'DP', fn: 'Logistics', role: 'owner', title: 'Logistics & Route Manager' },
  { id: 'u-gomez', name: 'Ana Gomez', initials: 'AG', fn: 'Facilities', role: 'owner', title: 'Facilities Manager' },
  { id: 'u-brooks', name: 'Tasha Brooks', initials: 'TB', fn: 'Operations', role: 'leader', title: 'VP Operations', oversees: ['Fleet', 'MRF Ops', 'Logistics'] },
  { id: 'u-underwood', name: 'Henry Underwood', initials: 'HU', fn: 'IT', role: 'owner', title: 'IT Director' },
]

// Geographic tags (region + home yard) per person — illustrative, SoCal waste
// operations. Enterprise roles sit at Corporate HQ. Data only; no engine change.
const PEOPLE_GEO = {
  'u-torres': ['Enterprise', 'Corporate HQ'], 'u-nguyen': ['Enterprise', 'Corporate HQ'],
  'u-schwartz': ['Enterprise', 'Corporate HQ'], 'u-train': ['Enterprise', 'Corporate HQ'],
  'u-chen': ['Enterprise', 'Corporate HQ'], 'u-anand': ['Enterprise', 'Corporate HQ'],
  'u-rivera': ['San Gabriel Valley', 'City of Industry Yard'],
  'u-brooks': ['San Gabriel Valley', 'City of Industry Yard'],
  'u-okafor': ['LA Metro', 'Vernon Transfer Yard'],
  'u-patel': ['Inland Empire', 'Fontana Ops Yard'],
  'u-gomez': ['Orange County', 'Anaheim Hauling Yard'],
  'u-underwood': ['Central Coast', 'Oxnard Yard'],
}
for (const p of people) { const g = PEOPLE_GEO[p.id] || ['Enterprise', 'Corporate HQ']; p.region = g[0]; p.yard = g[1] }

// Sourcing group → business unit (illustrative operating structure).
const BU_BY_GROUP = {
  'g-fleet': 'Fleet & Maintenance', 'g-maint': 'Fleet & Maintenance', 'g-fuel': 'Fleet & Maintenance', 'g-rental': 'Fleet & Maintenance',
  'g-disposal': 'Collection & Post-Collection', 'g-containers': 'Collection & Post-Collection', 'g-labor': 'Collection & Post-Collection',
  'g-facilities': 'Facilities & Operations', 'g-utilities': 'Facilities & Operations', 'g-supplies': 'Facilities & Operations',
  'g-benefits': 'Corporate & Shared Services', 'g-indirect': 'Corporate & Shared Services', 'g-itt': 'Corporate & Shared Services', 'g-prof': 'Corporate & Shared Services',
}
const geoFor = (ownerId) => { const p = people.find((x) => x.id === ownerId); return { region: p?.region || 'Enterprise', yard: p?.yard || 'Corporate HQ' } }

const owners = people.filter((p) => p.role === 'owner')
// People who can own / contribute to initiatives (org owners + procurement).
const assignables = people.filter((p) => p.role === 'owner' || p.role === 'procurement')
const fpna = people.find((p) => p.role === 'fpna')

// map a sourcing group to the most natural owner. Sourcing-led groups
// (benefits/insurance, professional services, supplies, indirect) are owned by
// Procurement; operational groups by their function owners.
const GROUP_OWNER = {
  'g-fleet': 'u-rivera', 'g-maint': 'u-rivera', 'g-rental': 'u-rivera',
  'g-facilities': 'u-gomez', 'g-utilities': 'u-gomez',
  'g-benefits': 'u-chen', 'g-prof': 'u-chen', 'g-supplies': 'u-anand', 'g-indirect': 'u-anand',
  'g-disposal': 'u-patel', 'g-labor': 'u-patel',
  'g-containers': 'u-okafor',
  'g-fuel': 'u-rivera',
  'g-itt': 'u-underwood',
}

// ---------------------------------------------------------------------------
// 4) Athens OKR linkage (subset; initiatives link to ≥1)
// ---------------------------------------------------------------------------
const krs = [
  { id: 'KR5', label: 'Turn cities profit-positive (+$5M)', driver: 'Focused Growth' },
  { id: 'KR6', label: '30% minimum gross margin', driver: 'Commercial Excellence' },
  { id: 'KR13', label: '3% route labor improvement', driver: 'Operational Excellence' },
  { id: 'KR15', label: 'Strategic Priorities governance', driver: 'Operational Excellence' },
  { id: 'KR16', label: 'Safety performance', driver: 'Safety' },
]

// ---------------------------------------------------------------------------
// 5) Initiatives (~40) across both pillars and all four stages
// ---------------------------------------------------------------------------
// Extended value lifecycle (PRD §5): idea → feasibility → capability → launch →
// realization → sustainment → retired (+ proposed pre-pipeline).
const STAGE_CONFIDENCE = { proposed: 0, idea: 0.25, feasibility: 0.5, capability: 0.75, launch: 1.0, realization: 1.0, sustainment: 1.0, retired: 0 }
const FORECAST_PROFILES = ['linear', 'ramp', 'scurve', 'seasonal']
const RISK_CATS = ['execution', 'financial', 'data', 'adoption', 'external']
// Levers carry a benefit_type (reduction | savings | avoidance) and the McKinsey
// approach they embody. Cost Reduction = active elimination of existing cost
// (baseline − negotiated price). Cost Savings = productivity (run-rate down).
// Cost Avoidance = prevent a future increase (projected − actual).
const LEVERS = {
  savings: [
    { name: 'Route optimization', type: 'savings', approach: 'Operational redesign' },
    { name: 'Spec standardization', type: 'reduction', approach: 'Cleansheet / should-cost' },
    { name: 'Preventive-maintenance program', type: 'savings', approach: 'Reliability program' },
    { name: 'MRF throughput uplift', type: 'savings', approach: 'Throughput / yield' },
    { name: 'Supplier consolidation', type: 'reduction', approach: 'Volume leverage / tiering' },
    { name: 'Renegotiation (win-room)', type: 'reduction', approach: 'Negotiation win-room' },
    { name: 'Automation', type: 'savings', approach: 'Automation' },
    { name: 'Maverick-spend capture', type: 'reduction', approach: 'On-contract compliance' },
    { name: 'Insourcing', type: 'reduction', approach: 'Make-vs-buy' },
  ],
  avoidance: [
    { name: 'Multi-year price lock', type: 'avoidance', approach: 'Index cap / price lock' },
    { name: 'Renewal renegotiation', type: 'avoidance', approach: 'Negotiation win-room' },
    { name: 'Index cap / CPI ceiling', type: 'avoidance', approach: 'Index cap' },
    { name: 'Volume tier commitment', type: 'avoidance', approach: 'Volume leverage / tiering' },
    { name: 'Contract restructuring', type: 'avoidance', approach: 'Contract redesign' },
    { name: 'Avoided escalation', type: 'avoidance', approach: 'Avoided escalation' },
  ],
}

// a credible initiative title from group + lever
function titleFor(group, lever, pillar) {
  return `${lever.name} — ${group.name}`
}

const initiatives = []
let initSeq = 0

// Build a stage plan so we get a realistic funnel: idea-heavy, fewer at launch.
const STAGE_PLAN = [
  ...Array(11).fill('idea'),
  ...Array(10).fill('feasibility'),
  ...Array(8).fill('capability'),
  ...Array(6).fill('launch'),
  ...Array(4).fill('realization'),
  ...Array(2).fill('sustainment'),
  ...Array(1).fill('retired'),
]

function isoDaysAgo(days) {
  const d = new Date('2026-06-30T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}
function isoMonthsAhead(months) {
  const d = new Date('2026-06-30T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

// weight group selection by spend so big groups host more initiatives
const groupBag = []
for (const g of GROUPS) {
  const n = Math.max(1, Math.round((g.spend / addressableTotal) * STAGE_PLAN.length * 1.1))
  for (let i = 0; i < n; i++) groupBag.push(g)
}

for (const stage of STAGE_PLAN) {
  const g = pick(groupBag)
  const groupCats = spend_categories.filter((c) => c.group_id === g.id)
  const cat = pick(groupCats)
  const pillar = rand() < 0.55 ? 'savings' : 'avoidance'
  const lever = pick(LEVERS[pillar])
  const benefit_type = lever.type // reduction | savings | avoidance
  const ownerId = GROUP_OWNER[g.id] || pick(assignables).id

  // gross annual value = slice of category spend × plausible lever %
  const slice = cat.spend * (0.25 + rand() * 0.6) // the portion this initiative touches
  const leverPct = pillar === 'savings' ? 0.03 + rand() * 0.07 : 0.02 + rand() * 0.05
  const gross = Math.max(20_000, round((slice * leverPct) / 1000) * 1000)
  const effort = randInt(1, 5)
  const confidence = STAGE_CONFIDENCE[stage]

  const id = `i-${String(++initSeq).padStart(2, '0')}`
  const startedDaysAgo = stage === 'idea' ? randInt(5, 60) : stage === 'feasibility' ? randInt(40, 150) : randInt(120, 360)
  const start_date = isoDaysAgo(startedDaysAgo)
  const target_close = isoMonthsAhead(randInt(4, 20))

  // baseline — validated from Feasibility onward. The formula is explicit so a
  // reviewer can trace gross value to its inputs:
  //   savings/reduction:  Original (run-rate) − New (lower) = benefit
  //   avoidance:          Projected (future) − Actual (post-intervention) = benefit
  const REALIZING = ['launch', 'realization', 'sustainment', 'retired'] // benefit being/already booked
  const validatedStage = ['feasibility', 'capability', ...REALIZING].includes(stage)
  const isAvoid = pillar === 'avoidance'
  const reference = isAvoid ? round(slice + gross) : round(slice) // projected vs original
  const comparison = reference - gross // actual vs new lower
  const baseline = {
    basis: isAvoid ? 'forecast' : 'run_rate',
    formula: isAvoid ? 'Projected − Actual' : 'Original − New',
    reference_label: isAvoid ? 'Projected future cost' : 'Original cost (run-rate)',
    comparison_label: isAvoid ? 'Actual after intervention' : 'New lower cost',
    reference,
    comparison,
    amount: reference, // validated baseline cost
    source_ref: `2025 AP register · ${cat.name}`,
    validated_by: validatedStage ? fpna.id : null,
    validated_at: validatedStage ? isoDaysAgo(startedDaysAgo - randInt(5, 25)) : null,
  }

  // Implemented vs Negotiated (value leakage). A negotiated discount only yields
  // savings if real volume flows through the new contract. For contract-based
  // levers (reduction/avoidance) at Capability+, store the negotiated annual
  // value; the engine compares it to the implemented run-rate from actuals.
  const contractBased = benefit_type !== 'savings'
  const negotiated_value =
    contractBased && ['capability', ...REALIZING].includes(stage) ? gross : null

  // benefit lines (1–2) summing to gross
  const lineCount = rand() < 0.4 ? 2 : 1
  const benefit_lines = []
  if (lineCount === 1) {
    benefit_lines.push({ pnl_line: cat.pnl_line, recurrence: cat.recurrence, annual_amount: gross })
  } else {
    const a = round(gross * (0.5 + rand() * 0.3))
    benefit_lines.push({ pnl_line: cat.pnl_line, recurrence: 'recurring', annual_amount: a })
    benefit_lines.push({ pnl_line: cat.pnl_line === 'cogs' ? 'opex' : 'cogs', recurrence: 'one_time', annual_amount: gross - a })
  }

  // risks (1–3). Force at least one HIGH on a few launch items to exercise the
  // countermeasure rule + realization factor.
  const riskN = randInt(1, 3)
  const risks = []
  let worst = 0
  for (let r = 0; r < riskN; r++) {
    let likelihood = randInt(1, 5)
    let impact = randInt(2, 5)
    if (stage === 'launch' && r === 0 && initSeq % 4 === 0) { likelihood = 4; impact = randInt(4, 5) }
    const score = likelihood * impact
    worst = Math.max(worst, score)
    risks.push({
      category: pick(RISK_CATS),
      likelihood,
      impact,
      score,
      countermeasure: score >= 15 ? 'Weekly delivery review with function leader; contingency plan logged.' : (score >= 8 ? 'Owner monitoring; mitigation in plan.' : ''),
      status: score >= 15 ? 'mitigating' : 'open',
    })
  }

  // realization factor: reduce recognized value on at-risk realizing items (+flag)
  const atRisk = ['launch', 'realization'].includes(stage) && worst >= 15
  const realization_factor = atRisk ? 0.85 : 1.0
  const status_rag = worst >= 15 ? 'red' : worst >= 8 ? 'amber' : 'green'

  // monthly actuals — for realizing stages. Validated except the most recent
  // month for some (pending FP&A) to keep Realized ⊂ pipeline honest.
  const actuals = []
  if (REALIZING.includes(stage)) {
    const monthly = gross / 12
    const fullValidated = ['sustainment', 'retired'].includes(stage)
    const realizedMonths = fullValidated ? YTD_MONTHS : YTD_MONTHS.slice(randInt(0, 2)) // some ramped in later
    realizedMonths.forEach((period, idx) => {
      const isLatest = idx === realizedMonths.length - 1
      const validated = fullValidated ? true : !(isLatest && initSeq % 3 === 0)
      actuals.push({
        period,
        realized_amount: round(monthly * realization_factor * (0.85 + rand() * 0.3)),
        validated,
      })
    })
  }

  // validation events (audit trail on the initiative)
  const validations = []
  const vlog = (type, decision, daysAgo, note) =>
    validations.push({ type, decision, actor_id: fpna.id, decided_at: isoDaysAgo(daysAgo), note: note || '' })
  if (validatedStage) vlog('baseline', 'approved', startedDaysAgo - 10, 'Baseline tied to 2025 AP run-rate.')
  if (['capability', 'launch', 'closed'].includes(stage)) vlog('logic', 'approved', startedDaysAgo - 30, 'Savings logic and P&L mapping confirmed.')
  if (['launch', 'closed'].includes(stage)) vlog('productivity', 'approved', startedDaysAgo - 45, 'Operational benefit confirmed.')
  actuals.filter((a) => a.validated).forEach((a) => vlog('monthly', 'approved', 20, `Realized ${a.period.slice(0, 7)} validated.`))

  // contributors (split attribution) — sometimes a second person at 20–35%
  const contributions = [{ user_id: ownerId, credit_pct: 100 }]
  if (rand() < 0.35) {
    const other = pick(assignables.filter((o) => o.id !== ownerId))
    const share = randInt(20, 35)
    contributions[0].credit_pct = 100 - share
    contributions.push({ user_id: other.id, credit_pct: share })
  }

  initiatives.push({
    id,
    title: titleFor(g, lever, pillar),
    description: `${lever.name} initiative targeting ${cat.name} (${g.name}). ${pillar === 'avoidance' ? 'Prevents a forecast cost increase (cost avoidance).' : benefit_type === 'reduction' ? 'Actively eliminates existing cost via ' + lever.approach + ' (cost reduction).' : 'Improves productivity to lower run-rate cost without headcount cuts (cost savings).'}`,
    pillar,
    benefit_type,
    approach: lever.approach,
    stage,
    confidence,
    group_id: g.id,
    business_unit: BU_BY_GROUP[g.id] || 'Corporate & Shared Services',
    region: geoFor(ownerId).region,
    yard: geoFor(ownerId).yard,
    department: people.find((p) => p.id === ownerId)?.fn,
    owner_id: ownerId,
    contributions,
    request: null,
    comments: [],
    tasks: [],
    attachments: [],
    spend_category_id: cat.id,
    vendor: null,
    gross_annual_value: gross,
    negotiated_value,
    implementation_cost: round(gross * (0.18 + rand() * 0.5)), // one-time investment (payback/NPV)
    profile: FORECAST_PROFILES[initSeq % FORECAST_PROFILES.length], // time-phasing shape
    effort_score: effort,
    realization_factor,
    start_date,
    target_close,
    kr_link: pick(krs).id,
    status_rag,
    opportunity_id: null,
    baseline,
    benefit_lines,
    actuals,
    risks,
    validations,
  })
}

// Two PROPOSED projects awaiting line manager + FP&A approval — they demo the
// intake approval queue and stay out of all value rollups until approved.
function proposed(id, { title, ownerId, groupId, catId, pillar, benefitType, approach, gross, effort, requestedAgo }) {
  const cat = spend_categories.find((c) => c.id === catId)
  return {
    id, title,
    description: `${approach} initiative proposed for ${cat?.name} (${GROUPS.find((g) => g.id === groupId)?.name}). Awaiting line manager + FP&A approval before entering the pipeline.`,
    pillar, benefit_type: benefitType, approach,
    stage: 'proposed', confidence: 0,
    group_id: groupId, business_unit: BU_BY_GROUP[groupId] || 'Corporate & Shared Services',
    region: geoFor(ownerId).region, yard: geoFor(ownerId).yard,
    department: people.find((p) => p.id === ownerId)?.fn, owner_id: ownerId,
    contributions: [{ user_id: ownerId, credit_pct: 100 }], request: null, comments: [], tasks: [], attachments: [],
    spend_category_id: catId, vendor: null, gross_annual_value: gross, negotiated_value: null,
    implementation_cost: round(gross * 0.3), profile: 'ramp',
    effort_score: effort, realization_factor: 1,
    start_date: isoDaysAgo(requestedAgo), target_close: isoMonthsAhead(randInt(8, 18)),
    kr_link: pick(krs).id, status_rag: 'green', opportunity_id: null,
    baseline: { basis: pillar === 'avoidance' ? 'forecast' : 'run_rate', formula: pillar === 'avoidance' ? 'Projected − Actual' : 'Original − New', amount: 0, source_ref: `2025 AP register · ${cat?.name}`, validated_by: null, validated_at: null },
    benefit_lines: [{ pnl_line: cat?.pnl_line || 'opex', recurrence: 'recurring', annual_amount: gross }],
    actuals: [], risks: [], validations: [],
    request: { kind: 'intake', to_stage: 'idea', need: ['line_manager', 'fpna'], approvals: [], requested_by: ownerId, requested_at: isoDaysAgo(requestedAgo) },
  }
}
initiatives.push(proposed('i-p1', {
  title: 'Telematics-led idle reduction — Fleet Capital', ownerId: 'u-rivera', groupId: 'g-fleet',
  catId: spend_categories.find((c) => c.group_id === 'g-fleet').id, pillar: 'savings', benefitType: 'savings',
  approach: 'Operational redesign', gross: 180000, effort: 3, requestedAgo: 4,
}))
initiatives.push(proposed('i-p2', {
  title: 'Health plan network re-sourcing — Benefits & Insurance', ownerId: 'u-chen', groupId: 'g-benefits',
  catId: spend_categories.find((c) => c.group_id === 'g-benefits').id, pillar: 'savings', benefitType: 'reduction',
  approach: 'Negotiation win-room', gross: 420000, effort: 4, requestedAgo: 6,
}))

// ---------------------------------------------------------------------------
// 6) Opportunities (~10) from the largest groups — sized from the config table
// ---------------------------------------------------------------------------
const PRIORITY = (attr) => (attr >= 6 ? 'Hot' : attr >= 4 ? 'High' : attr >= 2.5 ? 'Medium' : 'Low')
const sizeScore = (spend) => (spend >= 60 * M ? 5 : spend >= 35 * M ? 4 : spend >= 20 * M ? 3 : spend >= 8 * M ? 2 : 1)

const oppGroups = ['g-fleet', 'g-facilities', 'g-benefits', 'g-disposal', 'g-maint', 'g-containers', 'g-fuel', 'g-labor', 'g-itt', 'g-supplies']
const opportunities = []
let oppSeq = 0
for (const gid of oppGroups) {
  const g = GROUPS.find((x) => x.id === gid)
  const cfg = cfgFor(gid)
  const ease = randInt(2, 5) // renegotiation easier than capital redesign
  const risk = randInt(1, 4)
  const size = sizeScore(g.spend)
  const attractiveness = +((size * ease) / risk).toFixed(2)
  const est_low = round(g.spend * cfg.conservative_pct)
  const est_high = round(g.spend * cfg.stretch_pct)
  const approach = pick([
    'Cleansheet / should-cost', 'Negotiation win-room', 'Volume leverage / tiering',
    'Supplier-base redesign', 'On-contract / maverick capture', 'Demand management',
  ])
  opportunities.push({
    id: `o-${++oppSeq}`,
    group_id: gid,
    title: `${g.name} sourcing & specification review`,
    lever: pick(['Renegotiation', 'Consolidation', 'Spec standardization', 'Demand management', 'Index cap']),
    approach,
    // off-contract / maverick share of the group's spend (digital spend-analytics
    // signal — addressable value leaking to non-preferred suppliers/specs).
    maverick_pct: +(0.04 + rand() * 0.18).toFixed(3),
    est_low,
    est_high,
    size_score: size,
    ease_score: ease,
    risk_score: risk,
    attractiveness,
    points: round(50 * attractiveness),
    priority: PRIORITY(attractiveness),
    status: 'open',
    claimed_by: null,
    initiative_id: null,
  })
}
// link two opportunities to existing launch/capability initiatives as "claimed"
const claimable = initiatives.filter((i) => ['capability', 'launch'].includes(i.stage))
opportunities[0].status = 'in_flight'
opportunities[0].claimed_by = claimable[0]?.owner_id || owners[0].id
opportunities[0].initiative_id = claimable[0]?.id || null
if (claimable[0]) claimable[0].opportunity_id = opportunities[0].id
opportunities[3].status = 'claimed'
opportunities[3].claimed_by = claimable[1]?.owner_id || owners[1].id
opportunities[3].initiative_id = claimable[1]?.id || null
if (claimable[1]) claimable[1].opportunity_id = opportunities[3].id

// ---------------------------------------------------------------------------
// 7) Badges (criteria) — earned set is computed by the engine from value/points
// ---------------------------------------------------------------------------
const badges = [
  { id: 'b-firstlaunch', name: 'First Launch', criteria: 'Own an initiative that reached Launch' },
  { id: 'b-100k', name: '$100K Club', criteria: 'Realized ≥ $100K validated value' },
  { id: 'b-1m', name: '$1M Club', criteria: 'Total FY value ≥ $1M' },
  { id: 'b-recurring', name: 'Recurring Hero', criteria: 'Recurring ratio ≥ 70%' },
  { id: 'b-opp', name: 'Opportunity Closer', criteria: 'Claimed & delivered an advertised opportunity' },
  { id: 'b-champion', name: 'Category Champion', criteria: 'Top contributor in a sourcing group' },
]

// ---------------------------------------------------------------------------
// 8) Points ledger — seed a few manual recognition bonuses; the bulk of points
//    is computed deterministically by the engine from lifecycle + realized value.
// ---------------------------------------------------------------------------
const points_ledger = [
  { id: 'p-1', user_id: 'u-rivera', event_type: 'recognition', initiative_id: null, points: 50, awarded_at: isoDaysAgo(20), provisional: false, note: 'CEO spot recognition — Realization Race' },
  { id: 'p-2', user_id: 'u-okafor', event_type: 'recognition', initiative_id: null, points: 30, awarded_at: isoDaysAgo(48), provisional: false, note: 'Top team — MRF throughput' },
  { id: 'p-3', user_id: 'u-chen', event_type: 'challenge', initiative_id: null, points: 40, awarded_at: isoDaysAgo(60), provisional: false, note: 'Sprint to Pipeline — Benefits & Insurance' },
]

// ---------------------------------------------------------------------------
// 9) Audit log seed — append-only; the app appends on every write.
// ---------------------------------------------------------------------------
// Append-only activity — seeded with a realistic recent history so the memory
// log / audit trail renders alive on first run. Newest first (the app unshifts).
const _launch = initiatives.find((i) => i.stage === 'launch')
const _real = initiatives.find((i) => i.stage === 'realization')
const _cap = initiatives.find((i) => i.stage === 'capability')
const _feas = initiatives.find((i) => i.stage === 'feasibility')
const audit_log = [
  { id: 'al-9', ts: isoDaysAgo(2), actor_id: 'u-nguyen', action: 'validate', entity: _real?.id || 'i-01', detail: `Realized month validated — "${_real?.title || 'initiative'}".` },
  { id: 'al-8', ts: isoDaysAgo(4), actor_id: 'u-schwartz', action: 'recovery', entity: _real?.id || 'i-01', detail: 'Value-leakage recovery opened (implemented run-rate trailing negotiated price).' },
  { id: 'al-7', ts: isoDaysAgo(7), actor_id: 'u-brooks', action: 'advance', entity: _cap?.id || 'i-02', detail: `Advanced to Capability — "${_cap?.title || 'initiative'}".` },
  { id: 'al-6', ts: isoDaysAgo(11), actor_id: 'u-rivera', action: 'risk', entity: _launch?.id || 'i-03', detail: 'High risk raised with a documented countermeasure ahead of Launch.' },
  { id: 'al-5', ts: isoDaysAgo(16), actor_id: 'u-nguyen', action: 'reject', entity: 'i-p2', detail: 'Intake returned for rework — baseline not yet tied to the AP register.' },
  { id: 'al-4', ts: isoDaysAgo(21), actor_id: 'u-torres', action: 'approve', entity: _launch?.id || 'i-03', detail: `Approved into Launch — "${_launch?.title || 'initiative'}".` },
  { id: 'al-3', ts: isoDaysAgo(30), actor_id: 'u-chen', action: 'advance', entity: _feas?.id || 'i-04', detail: `Advanced to Feasibility — "${_feas?.title || 'initiative'}".` },
  { id: 'al-2', ts: isoDaysAgo(45), actor_id: fpna.id, action: 'validate', entity: _launch?.id || 'i-01', detail: 'Baseline approved.' },
  { id: 'al-1', ts: isoDaysAgo(120), actor_id: 'u-schwartz', action: 'seed', entity: 'portfolio', detail: 'Initial portfolio seeded from 2025 AP register.' },
]

// ---------------------------------------------------------------------------
// 10) v2 — enterprise hierarchy (Portfolio > Program > Initiative > Workstream
//     > Task), dependency graph, and inflation exposure.
// ---------------------------------------------------------------------------
const portfolios = [
  { id: 'pf-asset', name: 'Fleet & Asset Productivity', owner_id: 'u-brooks' },
  { id: 'pf-network', name: 'Operations & Network', owner_id: 'u-brooks' },
  { id: 'pf-sourcing', name: 'Indirect & Sourcing', owner_id: 'u-chen' },
  { id: 'pf-corporate', name: 'People, Risk & Corporate', owner_id: 'u-schwartz' },
]
const programs = [
  { id: 'pg-fleet', portfolio_id: 'pf-asset', name: 'Fleet & Maintenance', owner_id: 'u-rivera' },
  { id: 'pg-ops', portfolio_id: 'pf-network', name: 'Post-Collection & Logistics', owner_id: 'u-patel' },
  { id: 'pg-facilities', portfolio_id: 'pf-network', name: 'Facilities & Utilities', owner_id: 'u-gomez' },
  { id: 'pg-sourcing', portfolio_id: 'pf-sourcing', name: 'Indirect Sourcing & IT', owner_id: 'u-anand' },
  { id: 'pg-benefits', portfolio_id: 'pf-corporate', name: 'Benefits & Insurance', owner_id: 'u-chen' },
]
const GROUP_PROGRAM = {
  'g-fleet': 'pg-fleet', 'g-maint': 'pg-fleet', 'g-rental': 'pg-fleet', 'g-fuel': 'pg-fleet',
  'g-disposal': 'pg-ops', 'g-labor': 'pg-ops', 'g-containers': 'pg-ops',
  'g-facilities': 'pg-facilities', 'g-utilities': 'pg-facilities',
  'g-prof': 'pg-sourcing', 'g-supplies': 'pg-sourcing', 'g-indirect': 'pg-sourcing', 'g-itt': 'pg-sourcing',
  'g-benefits': 'pg-benefits',
}
for (const i of initiatives) i.program_id = GROUP_PROGRAM[i.group_id] || 'pg-sourcing'

// Workstreams + tasks on realizing initiatives (lightweight)
const WS_TITLES = ['Data & baseline', 'Sourcing / negotiation', 'Implementation', 'Tracking & validation']
let wsSeq = 0
for (const i of initiatives.filter((x) => ['launch', 'realization', 'sustainment'].includes(x.stage))) {
  const n = 2 + (wsSeq % 2)
  i.workstreams = Array.from({ length: n }, (_, k) => {
    const status = i.stage === 'sustainment' ? 'done' : k === 0 ? 'done' : k === 1 ? 'in_progress' : 'planned'
    const title = WS_TITLES[k % WS_TITLES.length]
    return { id: `ws-${++wsSeq}`, title, status, owner_id: i.owner_id,
      tasks: Array.from({ length: 2 + (k % 2) }, (_, t) => ({ id: `tk-${wsSeq}-${t}`, title: `${title} — task ${t + 1}`, status })) }
  })
}
for (const i of initiatives) if (!i.workstreams) i.workstreams = []

// Seed collaboration on realizing initiatives — comments (with @mentions),
// action tasks, and document attachments (the "work system" demo).
const firstName = (uid) => (people.find((p) => p.id === uid)?.name || '').split(' ')[0]
let cmSeq = 0
const CM = [
  (i) => `Baseline tied to the 2025 AP run-rate for ${(i.title.split(' — ')[1] || 'this category')}. Looks solid.`,
  (i) => `Implementation on track — first months of actuals are landing close to plan. @${firstName(i.owner_id)} can you confirm the latest invoice volume?`,
  () => `Watch the latest month vs forecast; flag if we slip two consecutive cycles. @Rosa please validate once the period closes.`,
]
const CM_WHO = [null, 'u-schwartz', 'u-brooks']
let tkSeq = 0, atSeq = 0
const TASKS = [
  (i) => ['Confirm implemented run-rate vs negotiated price', i.owner_id],
  () => ['Attach signed contract + savings memo to the record', 'u-nguyen'],
  (i) => ['Schedule month-2 actuals review with FP&A', i.owner_id],
]
const ATTACH = [
  { name: 'Savings_memo.pdf', kind: 'doc' },
  { name: 'Cleansheet_model.xlsx', kind: 'sheet' },
  { name: 'Signed_contract.pdf', kind: 'doc' },
]
for (const i of initiatives.filter((x) => ['launch', 'realization', 'sustainment'].includes(x.stage)).slice(0, 14)) {
  const n = 1 + (cmSeq % 2)
  i.comments = Array.from({ length: n }, (_, k) => {
    const idx = (cmSeq + k) % CM.length
    const text = CM[idx](i)
    const mentions = (text.match(/@([A-Za-z][A-Za-z.]*)/g) || [])
      .map((t) => people.find((p) => p.name.split(' ')[0].toLowerCase() === t.slice(1).toLowerCase())?.id)
      .filter(Boolean)
    return { id: `cm-${++cmSeq}`, by: CM_WHO[idx] || i.owner_id, at: isoDaysAgo(randInt(2, 30)), text, mentions }
  })
  // tasks: 1–2 action items per initiative
  const tn = 1 + (tkSeq % 2)
  i.tasks = Array.from({ length: tn }, (_, k) => {
    const [text, assignee] = TASKS[(tkSeq + k) % TASKS.length](i)
    const seq = ++tkSeq
    return { id: `tk-${seq}`, text, assignee_id: assignee, status: seq % 3 === 0 ? 'done' : 'open', created_by: i.owner_id, at: isoDaysAgo(randInt(3, 24)) }
  })
  // attachments on every other initiative
  if (atSeq % 2 === 0) {
    const a = ATTACH[atSeq % ATTACH.length]
    i.attachments = [{ id: `at-${++atSeq}`, name: a.name, kind: a.kind, by: i.owner_id, at: isoDaysAgo(randInt(3, 20)) }]
  } else { atSeq++ }
}

// Dependency graph — a DAG (edges only from earlier to later initiative index).
const order = Object.fromEntries(initiatives.map((i, idx) => [i.id, idx]))
const dependencies = []
let depSeq = 0
const addDep = (a, b, type) => { if (order[a] != null && order[b] != null && order[a] < order[b]) dependencies.push({ id: `dep-${++depSeq}`, from: a, to: b, type }) }
const byProg = {}
for (const i of initiatives) (byProg[i.program_id] ||= []).push(i)
for (const list of Object.values(byProg)) {
  const sorted = list.filter((i) => i.stage !== 'proposed').sort((a, b) => order[a.id] - order[b.id])
  for (let k = 0; k + 1 < sorted.length && k < 4; k++) addDep(sorted[k].id, sorted[k + 1].id, depSeq % 2 ? 'enables' : 'blocks')
}
const realizing = initiatives.filter((i) => ['launch', 'realization'].includes(i.stage)).sort((a, b) => order[a.id] - order[b.id])
for (let k = 0; k < 5 && k + 1 < realizing.length; k++) addDep(realizing[k].id, realizing[realizing.length - 1 - k].id, 'enables')

const INFLATION = { 'g-fuel': 0.07, 'g-benefits': 0.09, 'g-disposal': 0.05, 'g-labor': 0.045, 'g-maint': 0.04, 'g-facilities': 0.035, 'g-containers': 0.03, 'g-fleet': 0.03, 'g-utilities': 0.04, 'g-itt': 0.03, 'g-prof': 0.03, 'g-supplies': 0.025, 'g-rental': 0.03, 'g-indirect': 0.03 }

// ---------------------------------------------------------------------------
// 11) Athens OS (Phase 5B) foundation entities — the net-new Section-6 entities
//     the app reads instead of hardcoding structure/definitions: a configurable
//     org hierarchy, forecast scenarios, knowledge cards (glossary/
//     explainability), a decision journal, and deterministic (rules-based) AI
//     recommendations. User/Initiative/ValueModel/Risk/Approval/Comment/
//     ActivityLog already exist (people, initiatives + embedded value/risk/
//     approval/comment models, audit_log) — not duplicated here.
// ---------------------------------------------------------------------------

// 11a) OrganizationNode — a configurable hierarchy so Athens' structure is data,
//      not code. One enterprise root; two dimensions hang off it: geography
//      (region → yard) and operating (business unit, department). Derived from
//      the seeded people/initiatives so the tree always matches live tags.
const org_nodes = [{ id: 'org-root', type: 'enterprise', name: 'Athens Services', parent_id: null, dimension: 'enterprise', meta: { fiscalYear: FY } }]
for (const r of [...new Set(people.map((p) => p.region))]) {
  const rid = `org-region-${slug(r)}`
  org_nodes.push({ id: rid, type: 'region', name: r, parent_id: 'org-root', dimension: 'geography', meta: {} })
  for (const y of [...new Set(people.filter((p) => p.region === r).map((p) => p.yard))])
    org_nodes.push({ id: `org-yard-${slug(y)}`, type: 'yard', name: y, parent_id: rid, dimension: 'geography', meta: {} })
}
for (const bu of [...new Set(initiatives.map((i) => i.business_unit).filter(Boolean))])
  org_nodes.push({ id: `org-bu-${slug(bu)}`, type: 'business_unit', name: bu, parent_id: 'org-root', dimension: 'operating', meta: {} })
for (const d of [...new Set(people.map((p) => p.fn))])
  org_nodes.push({ id: `org-dept-${slug(d)}`, type: 'department', name: d, parent_id: 'org-root', dimension: 'operating', meta: {} })

// 11b) ForecastScenario — Base / Aggressive / Conservative / Custom. Presentation
//      lenses (assumption multipliers the UI can apply), NOT a change to the
//      forecast engine or a savings target. Base = plan of record, unadjusted.
const forecast_scenarios = [
  { id: 'fs-base', key: 'base', name: 'Base case', description: 'Validated plan of record — realization exactly as the engine forecasts. No adjustment.', assumptions: { realization_multiplier: 1.0, timing_shift_months: 0, adoption_factor: 1.0 }, editable: false, is_default: true },
  { id: 'fs-aggressive', key: 'aggressive', name: 'Aggressive', description: 'Upside lens — faster ramp, full adoption. Illustrative, not a target.', assumptions: { realization_multiplier: 1.15, timing_shift_months: -1, adoption_factor: 1.0 }, editable: false, is_default: false },
  { id: 'fs-conservative', key: 'conservative', name: 'Conservative', description: 'Downside stress lens — slower adoption, delayed timing.', assumptions: { realization_multiplier: 0.85, timing_shift_months: 2, adoption_factor: 0.9 }, editable: false, is_default: false },
  { id: 'fs-custom', key: 'custom', name: 'Custom', description: 'Editable scenario — adjust the assumptions to model your own case.', assumptions: { realization_multiplier: 1.0, timing_shift_months: 0, adoption_factor: 1.0 }, editable: true, is_default: false },
]

// 11c) KnowledgeCard — the glossary + explainability substrate (no glossary
//      source was provided, so these are sensible EVRO defaults). Each term
//      carries a one-line short, a fuller definition, an optional formula and
//      worked example, three audience levels, and related terms. Feeds hover
//      help, "Explain This", and the Knowledge Layer.
const kc = (id, term, category, aka, short, definition, extra = {}) => ({
  id, term, category, aka, short, definition,
  formula: extra.formula || null, example: extra.example || null,
  levels: { beginner: extra.beginner || short, practitioner: extra.practitioner || definition, executive: extra.executive || short },
  related: extra.related || [],
})
const knowledge_cards = [
  kc('kc-rav', 'Risk-Adjusted Value', 'value', ['RAV'], 'Expected value after discounting for stage confidence and delivery risk.', 'The headline number EVRO ranks on. It takes an initiative\'s gross annual value and multiplies by stage confidence and the realization factor, so early-stage or at-risk value is not counted at face value.', { formula: 'RAV = Gross annual value × Stage confidence × Realization factor', example: '$1.0M gross × 0.75 (Capability) × 0.85 (at risk) = $637.5K RAV', related: ['kc-gross', 'kc-confidence', 'kc-realization-factor'], executive: 'Our honest, risk-adjusted view of what an initiative is worth — not its best-case headline.' }),
  kc('kc-gross', 'Gross Annual Value', 'value', ['Gross value'], 'The full annualised benefit an initiative would deliver at face value.', 'The un-adjusted annual benefit before any confidence or risk discount. It is the starting point for RAV and is never itself booked as realized.', { related: ['kc-rav', 'kc-realized'] }),
  kc('kc-realized', 'Realized Value', 'value', ['Realized'], 'Value that FP&A has validated as actually delivered.', 'The only value that counts as realized is a monthly actual that FP&A has signed off. Un-validated actuals sit in pipeline but never in the realized total — this keeps the number defensible.', { formula: 'Realized = Σ validated monthly actuals', related: ['kc-pipeline', 'kc-fpna-validation'], executive: 'Money we can prove hit the P&L — validated by Finance, not self-reported.' }),
  kc('kc-pipeline', 'Pipeline Value', 'value', [], 'Risk-adjusted value of everything in flight that is not yet realized.', 'The forward book of value — initiatives from Idea through Launch, risk-adjusted. Realized value is a strict subset of what the pipeline promised.', { related: ['kc-rav', 'kc-realized'] }),
  kc('kc-reduction', 'Cost Reduction', 'method', [], 'Actively eliminating existing cost: original price − new lower price.', 'One of three benefit types. A reduction removes cost that is on the books today, typically by renegotiating a price or standardizing a spec.', { formula: 'Benefit = Original (run-rate) cost − New lower cost', example: 'Renegotiate a $2.0M contract to $1.8M → $200K reduction', related: ['kc-savings', 'kc-avoidance'] }),
  kc('kc-savings', 'Cost Savings', 'method', [], 'Productivity: lowering run-rate cost without cutting the price you pay.', 'A savings improves how efficiently work is done — fewer hours, less waste, higher throughput — so the run-rate falls without a price change or headcount cut.', { example: 'Route optimization cuts miles 6% → lower fuel & labor run-rate', related: ['kc-reduction', 'kc-avoidance'] }),
  kc('kc-avoidance', 'Cost Avoidance', 'method', [], 'Preventing a future cost increase: projected cost − actual cost.', 'Avoidance stops a cost that has not happened yet — capping an index escalation, locking a price before a rise. It is real value but is tracked separately from reductions/savings because it never lowers today\'s run-rate.', { formula: 'Benefit = Projected future cost − Actual cost after intervention', example: 'Supplier seeks +9%; cap at +3% → 6 points of avoidance', related: ['kc-reduction', 'kc-savings'] }),
  kc('kc-baseline', 'Baseline', 'method', [], 'The validated reference cost an initiative\'s benefit is measured against.', 'The anchor for every benefit claim, tied to the 2025 AP register run-rate (or a forecast, for avoidance). FP&A validates the baseline before value can be recognized.', { related: ['kc-fpna-validation', 'kc-realized'] }),
  kc('kc-leakage', 'Value Leakage', 'value', [], 'Negotiated value that never lands because real volume did not flow through.', 'The gap between the value negotiated on paper and the value actually implemented in the run-rate. A discount only pays off if spend flows through the new contract.', { formula: 'Leakage = Negotiated value − Implemented (actual) value', related: ['kc-realized', 'kc-realization-factor'] }),
  kc('kc-confidence', 'Stage Confidence', 'method', [], 'The probability weight attached to each lifecycle stage.', 'Each stage carries a confidence factor (Idea 25% → Launch 100%) used to risk-adjust value. It reflects how likely the benefit is to land given how mature the work is.', { formula: 'Idea .25 · Feasibility .50 · Capability .75 · Launch+ 1.0', related: ['kc-rav', 'kc-stage-gate'] }),
  kc('kc-realization-factor', 'Realization Factor', 'method', [], 'A haircut applied to value when an initiative carries unmitigated high risk.', 'When a realizing initiative has an open high risk, its recognized value is trimmed (e.g. ×0.85) until the risk is mitigated — so the portfolio never over-books at-risk value.', { related: ['kc-rav', 'kc-risk-score'] }),
  kc('kc-npv', 'Net Present Value', 'finance', ['NPV'], 'Time-value view of an initiative: discounted benefits minus investment.', 'Future benefits are discounted to today\'s dollars at the enterprise discount rate and netted against the implementation cost, so multi-year value is comparable to a one-time spend.', { formula: 'NPV = Σ (benefit_t ÷ (1+r)^t) − implementation cost', related: ['kc-payback', 'kc-rav'] }),
  kc('kc-payback', 'Payback Period', 'finance', [], 'How long until an initiative\'s cumulative benefit repays its investment.', 'The month at which running benefits equal the up-front implementation cost. Shorter payback = faster self-funding.', { related: ['kc-npv'] }),
  kc('kc-hhi', 'Concentration (HHI)', 'value', ['Herfindahl'], 'How concentrated value is in a few owners, regions, or units.', 'A Herfindahl-style index of value share. High concentration means the portfolio depends heavily on a few sources — a delivery-risk signal.', { formula: 'HHI = Σ (value share)²', related: ['kc-rav'] }),
  kc('kc-addressable', 'Addressable Spend', 'value', [], 'The portion of spend EVRO can realistically influence.', 'Third-party, sourceable spend — the denominator for opportunity sizing. Pass-through items (franchise fees, disposal, taxes, pension) are tagged non-addressable and excluded.', { example: '$437.4M addressable of ~$694M total', related: ['kc-opportunity'] }),
  kc('kc-opportunity', 'Opportunity', 'value', [], 'An advertised, sized value idea a team can claim into an initiative.', 'A pre-sized value pool (conservative–stretch band) on a sourcing group. Claiming one spins up a pre-tagged initiative and enters the approval funnel.', { related: ['kc-addressable', 'kc-initiative'] }),
  kc('kc-effort', 'Effort Score', 'method', [], 'A 1–5 estimate of how hard an initiative is to deliver.', 'Used with value to prioritise (value-vs-effort). Higher effort pushes an item down the ranking unless the value justifies it.', { related: ['kc-rav'] }),
  kc('kc-risk-score', 'Risk Score', 'method', [], 'Likelihood × impact for a logged risk (1–25).', 'Every risk is scored likelihood × impact. ≥15 is high (drives red status and may trigger a realization-factor haircut); 8–14 amber.', { formula: 'Score = Likelihood (1–5) × Impact (1–5)', related: ['kc-realization-factor', 'kc-rag'] }),
  kc('kc-rag', 'RAG Status', 'method', ['Red/Amber/Green'], 'The health colour of an initiative, driven by its worst open risk.', 'Green = on track, Amber = watch, Red = intervention needed. Set from the highest risk score on the record.', { related: ['kc-risk-score'] }),
  kc('kc-stage-gate', 'Stage Gate', 'governance', [], 'An approval checkpoint an initiative must pass to advance a stage.', 'Advancing (e.g. Feasibility → Capability) needs the required approvals — line manager and FP&A, plus Steering for the biggest moves — recorded on the initiative.', { related: ['kc-confidence', 'kc-fpna-validation'] }),
  kc('kc-fpna-validation', 'FP&A Validation', 'governance', [], 'Finance sign-off that makes value real.', 'FP&A validates the baseline and each monthly actual. Nothing counts as realized value without it — the control that keeps the number credible.', { related: ['kc-realized', 'kc-baseline'] }),
  kc('kc-sustainment', 'Sustainment', 'governance', [], 'Keeping delivered value from eroding after launch.', 'Post-launch stage where benefits are monitored to ensure the run-rate improvement holds and does not quietly leak back.', { related: ['kc-leakage', 'kc-realized'] }),
]

// 11d) DecisionJournal — a traceable record of consequential calls, each linked
//      to evidence and (where relevant) an initiative. Seeded from real records.
const dj = (id, daysAgo, title, decision, rationale, by, evidence, outcome, lessons, linked) =>
  ({ id, at: isoDaysAgo(daysAgo), title, decision, rationale, decided_by: by, evidence, outcome, lessons, linked_initiative_id: linked || null })
const launchLike = initiatives.filter((i) => ['launch', 'realization', 'sustainment'].includes(i.stage))
const decision_journal = [
  dj('dj-1', 40, `Advance "${launchLike[0]?.title || 'lead initiative'}" to Launch`, 'Approved', 'Baseline validated by FP&A and the single high risk had a logged countermeasure; expected RAV justified the implementation capital.', 'u-torres', ['FP&A baseline validation', 'Risk countermeasure log', 'RAV ranking'], 'Realizing on plan — first months of actuals within tolerance.', 'Insist on a countermeasure before Launch, not after — it de-risked the ramp.', launchLike[0]?.id),
  dj('dj-2', 55, 'Fund the FY26 implementation-capital envelope at $6.0M', 'Approved', 'The efficient-frontier optimizer showed diminishing RAV per dollar beyond ~$6M given current pipeline maturity.', 'u-nguyen', ['Capital-allocation frontier', 'Pipeline RAV by stage'], 'Envelope set; optimizer re-runs as pipeline matures.', 'Size the envelope to pipeline maturity, not ambition.', null),
  dj('dj-3', 30, 'Prioritise Fuel & CNG index-cap over spec work this quarter', 'Approved', 'Fuel carries the highest inflation exposure (7%); an index cap avoids the largest forecast increase per unit of effort.', 'u-chen', ['Inflation exposure by group', 'Opportunity attractiveness score'], 'Index-cap opportunity advanced ahead of lower-urgency specs.', 'Let inflation exposure, not just size, drive avoidance sequencing.', null),
  dj('dj-4', 22, 'Hold one Benefits & Insurance proposal for re-scoping', 'Returned for rework', 'Proposed value leaned on volume assumptions FP&A could not yet tie to the AP register baseline.', 'u-nguyen', ['Intake financials', 'AP register baseline gap'], 'Returned to owner; awaiting a defensible baseline.', 'A proposal without a tie-out to baseline is not ready for the pipeline.', null),
  dj('dj-5', 12, 'Open a value-leakage recovery on a realizing contract', 'Approved', 'Implemented run-rate trailed the negotiated price — volume was not fully flowing through the new contract.', 'u-schwartz', ['Negotiated vs implemented delta', 'Monthly actuals trend'], 'Recovery opened; owner reconciling invoice routing.', 'Track implemented vs negotiated monthly, not at year-end.', launchLike[1]?.id),
]

// 11e) AIRecommendation — deterministic, RULES-BASED suggestions (no LLM),
//      derived here from real portfolio signals so the AI shell has grounded
//      content. Each carries a confidence, evidence, and a value impact.
const topInflationGroup = [...GROUPS].sort((a, b) => (INFLATION[b.id] || 0) - (INFLATION[a.id] || 0))[0]
const unvalidatedCount = initiatives.filter((i) => i.actuals?.some((a) => !a.validated)).length
const biggestOpp = [...opportunities].filter((o) => o.status === 'open').sort((a, b) => b.est_high - a.est_high)[0]
const highRiskLaunch = initiatives.filter((i) => i.stage === 'launch' && (i.risks || []).some((r) => r.score >= 15))
const air = (id, agent, title, recommendation, confidence, evidence, value_impact, category, linked) =>
  ({ id, agent, title, recommendation, confidence, evidence, value_impact, category, status: 'open', rules_based: true, linked_id: linked || null })
const ai_recommendations = [
  air('ai-1', 'Realization Agent', `${unvalidatedCount} initiatives have unvalidated latest actuals`, `Nudge FP&A to validate the most recent month on ${unvalidatedCount} realizing initiatives so booked value reflects reality.`, 0.9, ['Monthly actuals flagged validated=false', 'Realized = validated actuals only'], null, 'governance', null),
  air('ai-2', 'Avoidance Agent', `Prioritise an index cap on ${topInflationGroup?.name}`, `${topInflationGroup?.name} carries the highest inflation exposure (${Math.round((INFLATION[topInflationGroup?.id] || 0) * 100)}%). Sequence an index-cap / price-lock avoidance ahead of lower-urgency work.`, 0.8, [`Inflation exposure ${Math.round((INFLATION[topInflationGroup?.id] || 0) * 100)}% (highest of 14 groups)`, 'Avoidance = projected − actual'], Math.round((topInflationGroup?.spend || 0) * (INFLATION[topInflationGroup?.id] || 0) * 0.3), 'opportunity', null),
  air('ai-3', 'Opportunity Agent', `Claim the largest open opportunity`, biggestOpp ? `"${biggestOpp.title}" is the largest unclaimed pool (up to $${(biggestOpp.est_high / M).toFixed(1)}M stretch). Assign an owner to enter it into the funnel.` : 'No open opportunities remain — pipeline is fully claimed.', 0.75, biggestOpp ? [`Stretch band $${(biggestOpp.est_low / M).toFixed(1)}M–$${(biggestOpp.est_high / M).toFixed(1)}M`, `Attractiveness ${biggestOpp.attractiveness}`] : ['All opportunities claimed'], biggestOpp ? Math.round((biggestOpp.est_low + biggestOpp.est_high) / 2) : null, 'opportunity', biggestOpp?.id || null),
  air('ai-4', 'Risk Agent', highRiskLaunch.length ? `${highRiskLaunch.length} launch initiatives carry an unmitigated high risk` : 'No unmitigated high risks at Launch', highRiskLaunch.length ? `Review the countermeasure on ${highRiskLaunch.length} Launch-stage initiative(s); their value is haircut by the realization factor until mitigated.` : 'All Launch-stage high risks have a logged countermeasure.', highRiskLaunch.length ? 0.85 : 0.6, ['Risk score ≥ 15 = high', 'Realization factor haircut applies while open'], null, 'risk', highRiskLaunch[0]?.id || null),
  air('ai-5', 'Concentration Agent', 'Watch value concentration by business unit', 'A large share of risk-adjusted value sits in one business unit. Diversify the pipeline or stress-test that unit\'s delivery capacity.', 0.7, ['Value share by business unit (HHI)', 'Delivery-risk signal'], null, 'risk', null),
  air('ai-6', 'Leakage Agent', 'Monitor implemented vs negotiated value monthly', 'Several contract-based initiatives show a gap between negotiated and implemented value. Reconcile invoice routing to stop leakage before year-end.', 0.75, ['Negotiated − implemented delta', 'Leakage recovery precedent (decision journal)'], null, 'value', null),
]

// ---------------------------------------------------------------------------
const seed = {
  meta: {
    now: NOW,
    fiscalYear: FY,
    fyMonths: FY_MONTHS,
    addressableTotal,
    addressableHeadline: 437_400_000,
    nonAddressableTotal: NON_ADDRESSABLE.reduce((a, n) => a + n.spend, 0),
    discountRate: 0.10, // NPV
    npvHorizonYears: 3,
    capitalBudget: 6_000_000, // illustrative implementation-capital envelope for the optimizer
    note: 'Demo data — seeded from the real 2025 Athens AP-register sourcing groups. People and dollar figures on initiatives are illustrative placeholders. Return-maximization model: no savings/avoidance targets anywhere.',
  },
  krs,
  people,
  portfolios,
  programs,
  sourcing_groups: GROUPS.map((g) => ({ id: g.id, name: g.name, spend: g.spend, cats: g.cats, inflation: INFLATION[g.id] || 0.03 })),
  spend_categories,
  savings_pct_config,
  opportunities,
  initiatives,
  dependencies,
  badges,
  points_ledger,
  audit_log,
  // Phase 5B — Athens OS foundation entities
  org_nodes,
  forecast_scenarios,
  knowledge_cards,
  decision_journal,
  ai_recommendations,
}

// --- write outputs ----------------------------------------------------------
const dataPath = path.resolve(__dirname, 'seed.json')
const snapPath = path.resolve(__dirname, '../frontend/src/lib/seed-snapshot.js')
await mkdir(path.dirname(snapPath), { recursive: true })
await writeFile(dataPath, JSON.stringify(seed, null, 2))
await writeFile(
  snapPath,
  '// AUTO-GENERATED by evro/data/gen-seed.mjs — do not edit by hand.\n' +
    '// Bundled snapshot for demo/offline mode (no backend).\n' +
    `export const SEED = ${JSON.stringify(seed)}\n`
)

const realizedYTD = initiatives.reduce(
  (a, i) => a + i.actuals.filter((x) => x.validated).reduce((s, x) => s + x.realized_amount, 0),
  0
)
console.log(`seed.json written: ${initiatives.length} initiatives, ${spend_categories.length} categories, ${opportunities.length} opportunities`)
console.log(`athens-os foundation: ${org_nodes.length} org nodes, ${forecast_scenarios.length} scenarios, ${knowledge_cards.length} knowledge cards, ${decision_journal.length} decisions, ${ai_recommendations.length} AI recs`)
console.log(`addressable Σ = $${(addressableTotal / M).toFixed(1)}M · realized YTD (validated) ≈ $${(realizedYTD / M).toFixed(2)}M`)
