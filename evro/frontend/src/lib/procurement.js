// Procurement Phase One — the enterprise value-object model. This is a VIEW
// layer over the deterministic engine, exactly like experience.js / mission.js:
// it projects the initiatives / opportunities / spend the engine already owns
// onto the reusable enterprise objects Procurement speaks in (Opportunity,
// Savings Type, Lifecycle stage, Supplier, Category, Contract, Decision,
// Evidence, Risk, Dependency, Owner, Sponsor). Nothing here is procurement-only
// or hard-coded — every number traces back through an engine function to the
// one seeded data record, so the dashboard, workspace, narrative and evidence
// views all reconcile by construction.
//
// It NEVER mutates the engine, the data, or the value math. "Refactor, do not
// rebuild": Procurement is the first domain lens on the existing value engine.
import {
  STAGES, STAGE_CONFIDENCE, MATERIALITY, confidence, rav, realizedYTD, pendingValue,
  implementedRunRate, forecastRemainderFY, netAnnual, worstRisk, requiredRoles,
  approvalState, nextStage, gateCheck, personName, categoryName, groupName,
  index, frame, depEdges, ROLE_APPROVE_LABEL,
  enterpriseRollup, forecastCurve, leakageBreakdown,
} from './engine.js'
import { money, pct } from './format.js'

// ── Savings governance — one shared language across Procurement / Finance /
// Operations / Leadership. Definitions are the deliverable; the demo dataset
// populates the types that genuinely exist in Athens' spend.
export const SAVINGS_TYPES = [
  { key: 'hard', label: 'Hard Savings', short: 'Hard', accent: 'var(--green)', pnl: true, definition: 'A validated reduction in unit price or total cost that flows through the P&L as a lower run-rate.', example: 'Renegotiated rate cuts the annual bill.' },
  { key: 'avoidance', label: 'Cost Avoidance', short: 'Avoidance', accent: 'var(--navy)', pnl: false, definition: 'A cost the enterprise would otherwise have incurred that is prevented — measured against a credible would-have baseline.', example: 'Index cap holds price below quoted inflation.' },
  { key: 'productivity', label: 'Productivity', short: 'Productivity', accent: 'var(--brand-value)', pnl: true, definition: 'More output or throughput from the same resource base — value delivered without headcount cuts.', example: 'Automation lifts lines processed per shift.' },
  { key: 'working_capital', label: 'Working Capital', short: 'Working cap.', accent: 'var(--brand-momentum)', pnl: false, definition: 'Cash freed by better payment terms, inventory or receivables — a balance-sheet gain, not a P&L line.', example: 'Extended terms release trapped cash.' },
  { key: 'risk_reduction', label: 'Risk Reduction', short: 'Risk', accent: 'var(--amber)', pnl: false, definition: 'Reduced exposure to failure, supply disruption or compliance loss — value protected rather than added.', example: 'Reliability program cuts unplanned downtime.' },
  { key: 'revenue', label: 'Revenue Enhancement', short: 'Revenue', accent: 'var(--opp)', pnl: true, definition: 'Supplier-enabled uplift in revenue or margin — a top-line contribution attributable to sourcing.', example: 'Supplier co-innovation opens a new lane.' },
  { key: 'sustainability', label: 'Sustainability Value', short: 'Sustainability', accent: 'var(--brand-sustain, var(--green))', pnl: false, definition: 'Emissions, waste or ESG improvement with quantified enterprise value.', example: 'Route redesign lowers fleet emissions.' },
  { key: 'strategic', label: 'Strategic Value', short: 'Strategic', accent: 'var(--brand-intelligence)', pnl: false, definition: 'Capability, resilience or optionality that positions the enterprise beyond the immediate dollar.', example: 'Make-vs-buy builds an in-house capability.' },
]
export const savingsType = (key) => SAVINGS_TYPES.find((t) => t.key === key) || SAVINGS_TYPES[SAVINGS_TYPES.length - 1]

// Deterministic classifier: which savings type an initiative delivers, from the
// engine's own benefit_type + approach signals. Rule-based, never per-record.
export function classifySavingsType(i) {
  const a = (i.approach || '').toLowerCase()
  const b = i.benefit_type
  if (b === 'reduction') return 'hard'
  if (b === 'avoidance') return 'avoidance'
  // benefit_type 'savings' splits by how the value is delivered
  if (/throughput|automation|operational redesign|yield/.test(a)) return 'productivity'
  if (/reliability/.test(a)) return 'risk_reduction'
  if (/make-vs-buy|cleansheet|should-cost/.test(a)) return 'strategic'
  if (/contract redesign|terms/.test(a)) return 'working_capital'
  return 'productivity'
}

// ── Enterprise Savings Lifecycle — the one visible journey every opportunity
// moves through. Mapped from the engine's 8-stage gate model + approval /
// negotiation / validation state, so it is a lens, not a parallel state machine.
export const SAVINGS_LIFECYCLE = [
  { key: 'potential', label: 'Potential', phase: 'pipeline', bucket: 'potential', gloss: 'Identified, not yet qualified.' },
  { key: 'qualified', label: 'Qualified', phase: 'pipeline', bucket: 'potential', gloss: 'Sized and owned; worth pursuing.' },
  { key: 'business_case', label: 'Business Case', phase: 'pipeline', bucket: 'potential', gloss: 'Baseline and savings logic being built.' },
  { key: 'approved', label: 'Approved', phase: 'commit', bucket: 'committed', gloss: 'Case signed off; committed to the plan.' },
  { key: 'negotiation', label: 'Negotiation', phase: 'commit', bucket: 'committed', gloss: 'In the win-room with the supplier.' },
  { key: 'awarded', label: 'Awarded', phase: 'commit', bucket: 'committed', gloss: 'Deal closed; value contracted.' },
  { key: 'implementation', label: 'Implementation', phase: 'execute', bucket: 'committed', gloss: 'Rolling the change into operations.' },
  { key: 'validation', label: 'Validation', phase: 'execute', bucket: 'realized', gloss: 'FP&A validating delivered value.' },
  { key: 'realized', label: 'Realized', phase: 'realized', bucket: 'realized', gloss: 'Validated value flowing through the P&L.' },
  { key: 'sustained', label: 'Sustained', phase: 'realized', bucket: 'sustained', gloss: 'Run-rate protected against erosion.' },
  { key: 'closed', label: 'Closed', phase: 'closed', bucket: 'sustained', gloss: 'Booked and retired from the active book.' },
]
export const lifecycleMeta = (key) => SAVINGS_LIFECYCLE.find((s) => s.key === key) || SAVINGS_LIFECYCLE[0]
export const lifecycleIndex = (key) => SAVINGS_LIFECYCLE.findIndex((s) => s.key === key)

const hasNegotiated = (i) => i.negotiated_value != null
const hasValidatedActuals = (db, i) => realizedYTD(i, db) > 0

// Engine 8-stage gate + state → one of the 11 lifecycle stages.
export function lifecycleStage(db, i) {
  switch (i.stage) {
    case 'proposed': return 'potential'
    case 'idea': return 'qualified'
    case 'feasibility': return 'business_case'
    case 'capability': return hasNegotiated(i) ? 'negotiation' : 'approved'
    case 'launch': return hasNegotiated(i) ? 'awarded' : 'implementation'
    case 'realization': return hasValidatedActuals(db, i) ? 'realized' : 'validation'
    case 'sustainment': return 'sustained'
    case 'retired': return 'closed'
    default: return 'potential'
  }
}

// ── Value buckets — each opportunity contributes its stage-relevant value to
// exactly one headline bucket, so Σ buckets === Savings Under Management.
export function opportunityValue(db, i) {
  const potential = i.gross_annual_value || 0            // identified, un-committed
  const committed = hasNegotiated(i) ? i.negotiated_value : rav(i) // in the plan, risk-adjusted
  const realized = realizedYTD(i, db)                    // FP&A-validated
  const sustained = implementedRunRate(i, db) || realized // annualized run-rate protected
  const bucket = lifecycleMeta(lifecycleStage(db, i)).bucket
  const headline = bucket === 'potential' ? potential : bucket === 'committed' ? committed : bucket === 'realized' ? (realized || committed) : (sustained || realized)
  return { potential, committed, realized, sustained, bucket, headline: headline || 0 }
}

// Deterministic executive sponsor: enterprise-material deals answer to the
// exec; the rest to the function leader; always a real person in the roster.
export function sponsorFor(db, i) {
  const material = (i.gross_annual_value || 0) >= MATERIALITY
  const people = db.people || []
  if (material) { const ex = people.find((p) => p.role === 'exec'); if (ex) return ex }
  const lead = people.find((p) => p.role === 'leader' && (p.fn === i.department || p.fn === i.business_unit))
    || people.find((p) => p.role === 'leader')
  return lead || people.find((p) => p.role === 'exec') || people[0] || null
}

// Approver roles still required to move to the next gate (Owner/FP&A/Steering).
export function approverRoles(i) {
  const to = nextStage(i)
  if (!to) return []
  return (requiredRoles(i, to) || []).map((r) => ({ role: r, label: ROLE_APPROVE_LABEL[r] || r }))
}

// Evidence items backing an opportunity — baseline source, validation sign-offs,
// FP&A-validated actuals, approval trail. Feeds the shared Evidence Drawer.
export function opportunityEvidence(db, i) {
  const ev = []
  if (i.baseline?.source_ref) ev.push({ kind: 'baseline', label: i.baseline.reference_label || 'Baseline', ref: i.baseline.source_ref, validated: !!i.baseline.validated_by })
  for (const v of i.validations || []) ev.push({ kind: 'validation', label: `${v.type || 'Validation'} — ${v.decision || 'pending'}`, ref: v.by ? personName(db, v.by) : 'FP&A', validated: v.decision === 'approved' })
  const va = (i.actuals || []).filter((a) => a.validated)
  if (va.length) ev.push({ kind: 'actuals', label: `${va.length} FP&A-validated actual${va.length === 1 ? '' : 's'}`, ref: `Realized ${realizedYTD(i, db) ? 'to date' : ''}`.trim(), validated: true })
  for (const ap of i.request?.approvals || []) ev.push({ kind: 'approval', label: `${ROLE_APPROVE_LABEL[ap.role] || ap.role} sign-off`, ref: ap.by ? personName(db, ap.by) : '—', validated: true })
  if (i.opportunity_id) ev.push({ kind: 'origin', label: 'Sourced opportunity', ref: i.opportunity_id, validated: true })
  return ev
}

// The next decision an opportunity needs — the spine of Decision Intelligence.
export function nextDecision(db, i) {
  const gate = gateCheck(i)
  const appr = approvalState(i)
  const to = nextStage(i)
  const life = lifecycleStage(db, i)
  if (i.stage === 'retired') return null
  const pending = i.request ? `Awaiting ${(i.request.need || []).filter((r) => !(i.request.approvals || []).some((a) => a.role === r)).map((r) => ROLE_APPROVE_LABEL[r] || r).join(' + ') || 'sign-off'}` : null
  const label = pending || (to ? `Advance to ${lifecycleMeta(life).label === 'Realized' ? 'Sustained' : 'next gate'}` : 'Sustain & protect')
  return {
    label,
    stage: life,
    owner: personName(db, i.owner_id),
    sponsor: sponsorFor(db, i)?.name || '—',
    dueBy: i.target_close,
    confidence: confidence(i.stage),
    missing: gate.reasons || [],
    requiresSteering: !!gate.requiresSteering,
    expectedValue: rav(i),
    approvals: appr,
  }
}

// ── The reusable Opportunity value object — one normalized shape the dashboard,
// workspace, narrative and evidence views all read from.
export function savingsOpportunity(db, i) {
  const value = opportunityValue(db, i)
  const life = lifecycleStage(db, i)
  const type = classifySavingsType(i)
  return {
    id: i.id,
    name: i.title,
    description: i.description,
    stage: life,
    stageLabel: lifecycleMeta(life).label,
    stagePhase: lifecycleMeta(life).phase,
    savingsType: type,
    savingsTypeLabel: savingsType(type).label,
    value,
    confidence: confidence(i.stage),
    owner: personName(db, i.owner_id),
    ownerId: i.owner_id,
    sponsor: sponsorFor(db, i)?.name || '—',
    category: i.spend_category_id ? categoryName(db, i.spend_category_id) : (i.group_id ? groupName(db, i.group_id) : '—'),
    supplier: i.group_id ? groupName(db, i.group_id) : '—',
    contractValue: hasNegotiated(i) ? i.negotiated_value : null,
    businessUnit: i.business_unit,
    region: i.region,
    ragStatus: i.status_rag,
    worstRisk: worstRisk(i),
    risks: (i.risks || []).map((r) => ({ category: r.category, score: r.score, status: r.status, countermeasure: r.countermeasure })),
    forecastImpact: forecastRemainderFY(i, db),
    pending: pendingValue(i),
    netAnnual: netAnnual(i),
    evidence: opportunityEvidence(db, i),
    nextDecision: nextDecision(db, i),
    targetClose: i.target_close,
    _raw: i,
  }
}

// Active procurement book = every non-retired initiative (proposed carries 0
// confidence and lands in Potential). Deterministic order by lifecycle then value.
export function savingsOpportunities(db) {
  const list = (db.initiatives || []).filter((i) => i.stage !== 'retired').map((i) => savingsOpportunity(db, i))
  return list.sort((a, b) => (lifecycleIndex(a.stage) - lifecycleIndex(b.stage)) || (b.value.headline - a.value.headline))
}

// ── Rollups — every figure below is Σ of the per-opportunity value objects, so
// the executive dashboard reconciles with the workspace to the dollar.
export function savingsUnderManagement(db) {
  const opps = savingsOpportunities(db)
  // Partition buckets: each opportunity counted once at its stage — these
  // reconcile exactly with pipelineByStage and savingsByType (provable Σ).
  const bucket = { potential: 0, committed: 0, realized: 0, sustained: 0 }
  let wConf = 0, wVal = 0
  for (const o of opps) {
    bucket[o.value.bucket] += o.value.headline
    wConf += o.confidence * o.value.headline; wVal += o.value.headline
  }
  const total = bucket.potential + bucket.committed + bucket.realized + bucket.sustained
  // Cumulative progress lenses: each opportunity's value seen through every
  // lens it qualifies for (a realized deal is also committed). These are the
  // executive funnel figures — NOT a partition, so they do not sum to `total`.
  const identified = opps.reduce((s, o) => s + o.value.potential, 0)
  const committedTotal = opps.filter((o) => lifecycleIndex(o.stage) >= lifecycleIndex('approved')).reduce((s, o) => s + o.value.committed, 0)
  const realizedYTDTotal = opps.reduce((s, o) => s + o.value.realized, 0)
  const sustainedRunRate = opps.filter((o) => o.value.bucket === 'sustained').reduce((s, o) => s + o.value.sustained, 0)
  return {
    total,
    ...bucket,
    count: opps.length,
    confidence: wVal ? wConf / wVal : 0,       // value-weighted savings confidence
    atRisk: opps.filter((o) => o.ragStatus === 'red').reduce((s, o) => s + o.value.headline, 0),
    lenses: { identified, committed: committedTotal, realized: realizedYTDTotal, sustained: sustainedRunRate },
  }
}

export function pipelineByStage(db) {
  const opps = savingsOpportunities(db)
  return SAVINGS_LIFECYCLE.map((s) => {
    const inStage = opps.filter((o) => o.stage === s.key)
    return { ...s, count: inStage.length, value: inStage.reduce((sum, o) => sum + o.value.headline, 0) }
  })
}

export function savingsByType(db) {
  const opps = savingsOpportunities(db)
  return SAVINGS_TYPES.map((t) => {
    const inType = opps.filter((o) => o.savingsType === t.key)
    return { ...t, count: inType.length, value: inType.reduce((sum, o) => sum + o.value.headline, 0) }
  })
}

// Savings velocity — validated value landing per month (annualized run-rate
// added), from the same actuals the engine validates. No fabricated rate.
export function savingsVelocity(db) {
  const { elapsed } = frame(db)
  const realized = (db.initiatives || []).reduce((s, i) => s + realizedYTD(i, db), 0)
  const perMonth = elapsed ? realized / elapsed : 0
  return { realized, perMonth, perDay: perMonth / 30, elapsedMonths: elapsed }
}

// ── Reusable object collections (Supplier / Category / Contract) derived from
// the same records — the enterprise object model, not procurement-only tables.
export function categories(db) {
  return (db.spend_categories || []).map((c) => ({ id: c.id, name: c.name, spend: c.spend, addressable: c.addressable, pnlLine: c.pnl_line, recurrence: c.recurrence }))
    .sort((a, b) => b.spend - a.spend)
}
export function suppliers(db) {
  // Sourcing groups are Athens' supplier/market families — real spend + inflation.
  const byGroup = {}
  for (const i of db.initiatives || []) { if (i.group_id) (byGroup[i.group_id] ||= []).push(i) }
  return (db.sourcing_groups || []).map((g) => ({
    id: g.id, name: g.name, spend: g.spend, inflation: g.inflation,
    activeOpportunities: (byGroup[g.id] || []).filter((i) => i.stage !== 'retired').length,
  })).sort((a, b) => b.spend - a.spend)
}
export function contracts(db) {
  // A negotiated deal is a contract — real negotiated value, term, recurrence.
  return (db.initiatives || []).filter((i) => i.negotiated_value != null && i.stage !== 'retired').map((i) => ({
    id: i.id, name: i.title, supplier: i.group_id ? groupName(db, i.group_id) : '—',
    negotiatedValue: i.negotiated_value, runRate: implementedRunRate(i, db),
    leakage: Math.max(0, (i.negotiated_value || 0) - implementedRunRate(i, db)),
    start: i.start_date, end: i.target_close, stage: lifecycleStage(db, i),
  })).sort((a, b) => b.negotiatedValue - a.negotiatedValue)
}

// Dependencies + blockers across the book (reuses the engine's edge model).
export function opportunityDependencies(db, id) {
  const edges = depEdges(db)
  return {
    blockedBy: edges.filter((e) => e.to === id).map((e) => e.from),
    blocks: edges.filter((e) => e.from === id).map((e) => e.to),
  }
}
export function topBlockers(db) {
  const opps = savingsOpportunities(db)
  const byId = Object.fromEntries(opps.map((o) => [o.id, o]))
  const edges = depEdges(db)
  const counts = {}
  for (const e of edges) counts[e.from] = (counts[e.from] || 0) + 1
  return Object.entries(counts)
    .map(([id, n]) => ({ id, blocks: n, name: byId[id]?.name || id, value: byId[id]?.value.headline || 0 }))
    .filter((b) => byId[b.id]).sort((a, b) => b.blocks - a.blocks || b.value - a.value).slice(0, 6)
}

// Decision history & approval trail for one opportunity — journal entries,
// validation sign-offs and the live approval request, in one chronological list.
export function decisionHistory(db, i) {
  const rows = []
  for (const e of db.decision_journal || []) {
    if (e.linked_initiative_id === i.id) rows.push({ at: e.at, kind: 'decision', title: e.title, detail: e.decision, by: e.decided_by ? personName(db, e.decided_by) : '—', rationale: e.rationale })
  }
  for (const v of i.validations || []) rows.push({ at: v.decided_at, kind: 'validation', title: `${v.type} validation`, detail: v.decision, by: v.actor_id ? personName(db, v.actor_id) : 'FP&A', rationale: v.note })
  for (const a of i.request?.approvals || []) rows.push({ at: a.at, kind: 'approval', title: `${ROLE_APPROVE_LABEL[a.role] || a.role} sign-off`, detail: 'Approved', by: a.by ? personName(db, a.by) : '—' })
  return rows.filter((r) => r.at).sort((a, b) => String(b.at).localeCompare(String(a.at)))
}

// Deterministic AI insight for one opportunity — the EVRO trust contract
// (recommendation + confidence + evidence + assumptions + dependencies + risks
// + expected value), computed from the opportunity's own state. Rules-based;
// no language model, no fabricated numbers.
export function opportunityInsight(db, i) {
  const dec = nextDecision(db, i)
  const conf = confidence(i.stage)
  const ev = opportunityEvidence(db, i)
  const deps = opportunityDependencies(db, i.id)
  const risks = (i.risks || []).filter((r) => r.score >= 8).sort((a, b) => b.score - a.score)
  const gaps = dec?.missing || []
  const pending = !!i.request
  const recommendation = pending
    ? `${dec.label} — chase the sign-off to move it off the bench and into the pipeline.`
    : gaps.length
      ? `Close ${gaps.length} evidence gap${gaps.length === 1 ? '' : 's'} to unblock the next gate, then advance.`
      : dec ? `${dec.label} — the case is complete and the value justifies the move.` : 'Protect the run-rate; no further gate action required.'
  return {
    recommendation,
    confidence: conf,
    rulesBased: true,
    expected: { value: rav(i), note: `${(i.gross_annual_value || 0).toLocaleString()} gross × ${Math.round(conf * 100)}% stage confidence × realization factor` },
    evidence: ev.map((e) => ({ label: e.label, value: e.ref })),
    assumptions: [
      'Rules-based signal — deterministic, no language model.',
      'Baseline and savings logic assumed current as of the last FP&A sync.',
      i.negotiated_value != null ? 'Assumes negotiated volume actually flows through as run-rate.' : 'Assumes the risk-adjusted estimate holds as scoped.',
    ],
    dependencies: deps.blockedBy.length ? deps.blockedBy.map((id) => ({ label: 'Blocked by', value: id })) : [{ label: 'Blocking dependencies', value: 'none on the graph' }],
    risks: [
      `${Math.round((1 - conf) * 100)}% residual — the estimate could move as the gate closes.`,
      ...risks.slice(0, 2).map((r) => `${r.category} risk (score ${r.score})${r.countermeasure ? ' — countermeasure logged' : ' — no countermeasure yet'}.`),
    ],
  }
}

// ── Decision Intelligence (Phase One W5) — make the next decision obvious for
// every opportunity. The queue is the same set the dashboard surfaces; the
// intel object is the full §11 contract for one decision.
export function decisionQueue(db) {
  return savingsOpportunities(db)
    .filter((o) => o.nextDecision && (o._raw.request || o.nextDecision.missing.length > 0))
    .sort((a, b) => b.nextDecision.expectedValue - a.nextDecision.expectedValue)
}

export function decisionIntel(db, i) {
  const o = savingsOpportunity(db, i)
  const dec = o.nextDecision
  const insight = opportunityInsight(db, i)
  const lineage = decisionHistory(db, i)
  const appr = approverRoles(i)
  const pending = !!i.request
  const state = approvalState(i)
  // Alternatives — deterministic option set framed by the decision type.
  let alternatives
  if (pending) {
    alternatives = [
      { label: 'Approve', effect: `Commit the sign-off; unlocks ${lifecycleMeta(o.stage).label.toLowerCase()} and books ${money(dec.expectedValue)} of expected value into the plan.`, recommended: dec.missing.length === 0 },
      { label: 'Return for rework', effect: 'Send it back to the owner; protects gate integrity but delays the value.', recommended: dec.missing.length > 0 },
      { label: 'Defer', effect: 'Hold in the queue for the next review; no change, but the opportunity cost accrues.', recommended: false },
    ]
  } else {
    alternatives = [
      { label: 'Advance the gate', effect: `Open the approval to move to the next stage; ${money(dec.expectedValue)} at stake.`, recommended: dec.missing.length === 0 },
      { label: 'Hold for evidence', effect: `Close ${dec.missing.length || 'the remaining'} gap${dec.missing.length === 1 ? '' : 's'} first; de-risks the decision.`, recommended: dec.missing.length > 0 },
      { label: 'Descope', effect: 'Split the opportunity and take the certain portion now; lower value, faster realization.', recommended: false },
    ]
  }
  // Explanation — why the recommendation, in one deterministic sentence.
  const rationale = dec.missing.length
    ? `Recommended because ${dec.missing.length} gate requirement${dec.missing.length === 1 ? ' is' : 's are'} still open — closing ${dec.missing.length === 1 ? 'it' : 'them'} is the fastest path to ${money(dec.expectedValue)} of risk-adjusted value at ${Math.round(o.confidence * 100)}% confidence.`
    : pending
      ? `Recommended because the case is complete and the sign-off is the only thing between here and ${money(dec.expectedValue)} committed at ${Math.round(o.confidence * 100)}% confidence.`
      : `Recommended because the evidence is in place and the ${money(dec.expectedValue)} expected value at ${Math.round(o.confidence * 100)}% confidence justifies advancing now.`
  return {
    id: o.id, name: o.name, stage: o.stage, stageLabel: o.stageLabel, savingsType: o.savingsType,
    decision: dec.label, owner: o.owner, sponsor: o.sponsor, approvers: appr,
    due: dec.dueBy, missing: dec.missing, confidence: o.confidence, expectedValue: dec.expectedValue,
    requiresSteering: dec.requiresSteering, risks: insight.risks, dependencies: insight.dependencies,
    recommended: insight.recommendation, alternatives, lineage, rationale, pending, approvalState: state,
    ragStatus: o.ragStatus,
  }
}

// ── AI & Narrative (Phase One W6) — Enterprise Decision Intelligence, not a
// chatbot. Five deterministic executive briefs (pipeline, risks, forecast
// variance, approvals, realization). Each carries the full EVRO trust contract
// (confidence + expected value + evidence + assumptions + risks + dependencies)
// and drills to source through the shared Evidence Drawer. No fabricated values.
export function procurementBriefs(db) {
  const sum = savingsUnderManagement(db)
  const pipeline = pipelineByStage(db)
  const vel = savingsVelocity(db)
  const queue = decisionQueue(db)
  const blockers = topBlockers(db)
  const r = enterpriseRollup(db)
  const leak = leakageBreakdown(db)
  const opps = savingsOpportunities(db)
  const reds = opps.filter((o) => o.ragStatus === 'red').sort((a, b) => b.value.headline - a.value.headline)
  const pendingSignoff = opps.filter((o) => o._raw.request)
  const evAtStake = queue.reduce((s, o) => s + o.nextDecision.expectedValue, 0)

  // forecast variance: committed vs risk-adjusted-expected over remaining FY
  const curve = forecastCurve(db)
  const fCommitted = curve.filter((c) => !c.past).reduce((s, c) => s + c.committed, 0)
  const fExpected = curve.filter((c) => !c.past).reduce((s, c) => s + c.expected, 0)
  const variance = fExpected - fCommitted

  const busiest = [...pipeline].filter((s) => s.count > 0).sort((a, b) => b.value - a.value)[0]

  return [
    {
      key: 'pipeline', title: 'Pipeline brief', tone: 'var(--opp)',
      headline: money(sum.total), sub: 'savings under management',
      claims: [
        { label: 'What', text: `${money(sum.total)} is under active management across ${sum.count} opportunities — ${money(sum.lenses.identified)} identified, ${money(sum.lenses.committed)} committed, ${money(sum.lenses.realized)} realized.` },
        { label: 'Why', text: `The book is running at ${pct(sum.confidence)} value-weighted confidence and landing value at ${money(vel.perMonth)}/month.` },
        { label: 'Next', text: busiest ? `The ${busiest.label} stage holds the most value (${money(busiest.value)}, ${busiest.count} opportunities) — clear it to keep the funnel moving.` : 'The funnel is balanced across stages.' },
      ],
      trust: {
        confidence: sum.confidence,
        expected: { value: money(sum.lenses.committed), note: 'committed value in the plan' },
        evidence: pipeline.filter((s) => s.count).map((s) => ({ label: s.label, value: `${s.count} · ${money(s.value)}` })),
        assumptions: ['Every figure is Σ of per-opportunity value objects — reconciles to the dashboard.', 'Stage confidence follows the engine gate model.'],
        risks: [`${money(sum.atRisk)} of the book carries a red status.`],
        dependencies: [`${blockers.length} opportunit${blockers.length === 1 ? 'y gates' : 'ies gate'} downstream value.`],
      },
      nav: { page: 'savingspipeline', label: 'Open the Savings Pipeline' },
    },
    {
      key: 'risks', title: 'Risk brief', tone: 'var(--amber)',
      headline: money(sum.atRisk), sub: `at risk · ${reds.length} red`,
      claims: [
        { label: 'What', text: `${money(sum.atRisk)} of value sits across ${reds.length} red opportunit${reds.length === 1 ? 'y' : 'ies'}${reds[0] ? `, led by ${reds[0].name} (${money(reds[0].value.headline)})` : ''}.` },
        { label: 'Why', text: `${money(leak.total)} of negotiated value is leaking — ${money(leak.timing)} timing (recoverable) and ${money(leak.contract)} contract.` },
        { label: 'Next', text: reds[0] ? `Put a countermeasure on ${reds[0].name} and chase the ${money(leak.timing)} of recoverable timing leakage.` : 'No red opportunities — hold the line on leakage.' },
      ],
      trust: {
        confidence: 0.8,
        expected: { value: money(leak.timing), note: 'recoverable timing leakage' },
        evidence: reds.slice(0, 5).map((o) => ({ label: o.name, value: `${money(o.value.headline)} · risk ${o.worstRisk}` })),
        assumptions: ['Red status follows the engine RAG rules (missing item, failing finding, or overdue action).', 'Leakage = negotiated value not yet flowing as run-rate.'],
        risks: ['Timing leakage compounds while un-implemented — the cost of waiting is real.'],
        dependencies: leak.items.slice(0, 3).map((it) => ({ label: it.title, value: money(it.total) })),
      },
      nav: { page: 'decisioncenter', label: 'Open the Decision Center' },
    },
    {
      key: 'forecast', title: 'Forecast variance brief', tone: 'var(--navy)',
      headline: money(r.forecastRA ?? fExpected), sub: 'risk-adjusted, rest of FY',
      claims: [
        { label: 'What', text: `Risk-adjusted forecast for the rest of the year is ${money(fExpected)}, against ${money(fCommitted)} committed — a ${variance >= 0 ? 'positive' : 'negative'} spread of ${money(Math.abs(variance))}.` },
        { label: 'Why', text: `${money(sum.lenses.realized)} is already validated; the remainder depends on ${queue.length} decisions clearing on schedule.` },
        { label: 'Next', text: variance >= 0 ? 'Upside is available if committed initiatives convert — protect the schedule.' : 'The plan is ahead of committed run-rate; secure the gap with sign-offs.' },
      ],
      trust: {
        confidence: sum.confidence,
        expected: { value: money(fExpected), note: 'risk-adjusted remaining-FY forecast' },
        evidence: [
          { label: 'Committed (rest FY)', value: money(fCommitted) },
          { label: 'Risk-adjusted (rest FY)', value: money(fExpected) },
          { label: 'Realized YTD', value: money(sum.lenses.realized) },
          { label: 'Velocity', value: `${money(vel.perMonth)}/mo` },
        ],
        assumptions: ['Forecast time-phases risk-adjusted value across remaining fiscal months (engine curve).', 'Only FP&A-validated actuals count as realized.'],
        risks: [`${money(sum.atRisk)} at-risk value could haircut the forecast.`],
        dependencies: [`${queue.length} open decisions gate the committed line.`],
      },
      nav: { page: 'procurement', label: 'Open the Executive Dashboard' },
    },
    {
      key: 'approvals', title: 'Approvals brief', tone: 'var(--brand-value)',
      headline: String(queue.length), sub: `decisions · ${money(evAtStake)} EV`,
      claims: [
        { label: 'What', text: `${queue.length} decisions are waiting, ${money(evAtStake)} of expected value at stake, including ${pendingSignoff.length} pending sign-off${pendingSignoff.length === 1 ? '' : 's'}.` },
        { label: 'Why', text: queue[0] ? `The highest-value decision is ${queue[0].name} (${money(queue[0].nextDecision.expectedValue)}).` : 'No decisions are blocked.' },
        { label: 'Next', text: queue[0] ? `${queue[0].nextDecision.missing.length ? `Close ${queue[0].nextDecision.missing.length} evidence gap${queue[0].nextDecision.missing.length === 1 ? '' : 's'} on it,` : 'Take'} the top decision to unlock the queue.` : 'Queue is clear.' },
      ],
      trust: {
        confidence: 0.9,
        expected: { value: money(evAtStake), note: 'expected value across the decision queue' },
        evidence: queue.slice(0, 5).map((o) => ({ label: o.name, value: `${o.nextDecision.label} · ${money(o.nextDecision.expectedValue)}` })),
        assumptions: ['A decision is queued when a sign-off is pending or a gate requirement is open.', 'Expected value is engine risk-adjusted value.'],
        risks: ['Decisions left unmade delay realization and accrue opportunity cost.'],
        dependencies: [`${blockers.length} opportunit${blockers.length === 1 ? 'y blocks' : 'ies block'} downstream gates.`],
      },
      nav: { page: 'decisioncenter', label: 'Open the Decision Center' },
    },
    {
      key: 'realization', title: 'Realization brief', tone: 'var(--green)',
      headline: money(sum.lenses.realized), sub: 'validated YTD',
      claims: [
        { label: 'What', text: `${money(sum.lenses.realized)} of savings is FP&A-validated year-to-date, with ${money(sum.lenses.sustained)} of run-rate now in sustainment.` },
        { label: 'Why', text: `Value is landing at ${money(vel.perMonth)}/month over ${vel.elapsedMonths} elapsed months; ${money(r.leakage ?? leak.total)} of negotiated value is not yet flowing.` },
        { label: 'Next', text: `Convert committed deals to validated run-rate and recover ${money(leak.timing)} of timing leakage.` },
      ],
      trust: {
        confidence: 0.85,
        expected: { value: money(sum.lenses.sustained), note: 'sustained run-rate protected' },
        evidence: [
          { label: 'Realized YTD', value: money(sum.lenses.realized) },
          { label: 'Sustained run-rate', value: money(sum.lenses.sustained) },
          { label: 'Velocity', value: `${money(vel.perMonth)}/mo` },
          { label: 'Leakage', value: money(leak.total) },
        ],
        assumptions: ['Realized = Σ FP&A-validated monthly actuals this fiscal year.', 'Sustained = annualized validated run-rate for sustainment-stage opportunities.'],
        risks: ['Un-recovered leakage erodes delivered value over time.'],
        dependencies: leak.items.slice(0, 3).map((it) => ({ label: it.title, value: money(it.total) })),
      },
      nav: { page: 'savingspipeline', label: 'Open the Savings Pipeline' },
    },
  ]
}

// The full model in one call — what every Procurement surface consumes.
export function procurementModel(db) {
  return {
    opportunities: savingsOpportunities(db),
    sum: savingsUnderManagement(db),
    pipeline: pipelineByStage(db),
    byType: savingsByType(db),
    velocity: savingsVelocity(db),
    suppliers: suppliers(db),
    categories: categories(db),
    contracts: contracts(db),
    blockers: topBlockers(db),
    lifecycle: SAVINGS_LIFECYCLE,
    savingsTypes: SAVINGS_TYPES,
  }
}
