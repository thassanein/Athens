// AI Trust Framework (6D Wave 4) — the AI made legible and accountable.
//
// Two view-helpers, both grounded, no engine change:
//  · agentActivities — the six-agent team in the brief's richer state
//    vocabulary (listening…complete), derived from what each agent is
//    actually doing against the live record. Respects AI shadow mode.
//  · recTrust — for any recommendation, the full trust breakdown the brief
//    requires on EVERY AI claim: confidence, evidence, assumptions,
//    dependencies, risks, and expected value. Nothing invented — every field
//    traces to a real rec field or a deterministic derivation of one.
import { dependencyGraph, isActive } from './engine.js'
import { aiPresence } from './presence.js'
import { money, pct } from './format.js'

// The brief's eight states. tone drives the accent; every state is a real
// thing an agent can be doing, never decorative.
export const AI_ACTIVITY = {
  listening: { label: 'Listening', tone: 'var(--grey)', desc: 'watching the record for a signal' },
  searching: { label: 'Searching', tone: 'var(--navy)', desc: 'sweeping the operating record' },
  analyzing: { label: 'Analyzing', tone: 'var(--brand-intelligence)', desc: 'scoring what it found' },
  simulating: { label: 'Simulating', tone: 'var(--brand-ai)', desc: 'running the deterministic lenses' },
  monitoring: { label: 'Monitoring', tone: 'var(--navy)', desc: 'holding watch on committed value' },
  recommending: { label: 'Recommending', tone: 'var(--green)', desc: 'has a grounded action for you' },
  waiting: { label: 'Waiting', tone: 'var(--grey-2)', desc: 'nothing to raise — standing by' },
  complete: { label: 'Complete', tone: 'var(--green)', desc: 'its work for now is done' },
}

// Map each presence agent to a live activity. shadow=true suppresses the
// proactive "recommending" state — the AI observes silently (monitoring)
// until proactive recommendations are switched on.
export function agentActivities(db, user, shadow = false) {
  const p = aiPresence(db, user, 'chief')
  const recs = (db.ai_recommendations || []).filter((r) => r.status === 'open')
  const unvalidated = db.initiatives.flatMap((i) => i.actuals || []).filter((a) => !a.validated).length
  const scenarios = (db.forecast_scenarios || []).length
  const journal = (db.decision_journal || db.decisions || []).length

  const ACT = {
    analyst: unvalidated > 0 ? 'analyzing' : 'monitoring',
    advisor: recs.length ? 'recommending' : 'waiting',
    simulator: scenarios ? 'simulating' : 'waiting',
    memory: journal > 0 ? 'monitoring' : 'listening',
    chief: recs.length ? 'recommending' : 'monitoring',
    operator: 'monitoring',
  }
  return p.agents.map((a) => {
    let act = ACT[a.key] || 'listening'
    if (shadow && act === 'recommending') act = 'monitoring'
    return { ...a, activity: act, ...AI_ACTIVITY[act], shadowed: shadow && ACT[a.key] === 'recommending' }
  })
}

// The trust breakdown for one recommendation — the six things the brief
// requires be accessible from every AI claim. All grounded:
//  confidence  → rec.confidence (rules-based)
//  evidence    → rec.evidence[] (the record it read)
//  expected    → value_impact × confidence, or "not value-scored"
//  assumptions → the deterministic basis (rules-based, sync currency)
//  dependencies→ the linked initiative's blocking edges, or enterprise-level
//  risks       → the residual (1 − confidence) + any linked red status
export function recTrust(db, rec) {
  const conf = rec.confidence || 0
  const expected = rec.value_impact != null
    ? { value: money(Math.round(rec.value_impact * conf)), note: `${money(rec.value_impact)} impact × ${pct(conf)} confidence` }
    : { value: '—', note: 'Governance / hygiene action — not value-scored.' }

  const assumptions = [
    'Rules-based signal — deterministic, no language model or probabilistic guess.',
    'Assumes the operating record is current as of the last integration sync.',
  ]
  if (rec.value_impact != null) assumptions.push('Assumes the risk-adjusted value estimate holds as scoped.')

  const dependencies = []
  const linked = rec.linked_id ? db.initiatives.find((i) => i.id === rec.linked_id) : null
  if (linked) {
    const g = dependencyGraph(db)
    const upstream = g.edges.filter((e) => e.to === linked.id)
      .map((e) => g.nodes.find((n) => n.id === e.from)).filter(Boolean)
    dependencies.push({ label: 'Linked initiative', value: `${linked.title} (${linked.stage})` })
    if (upstream.length) upstream.forEach((u) => dependencies.push({ label: 'Blocked by', value: `${u.title} (${u.rag})` }))
    else dependencies.push({ label: 'Blocking dependencies', value: 'none on the graph' })
  } else {
    dependencies.push({ label: 'Scope', value: 'Enterprise-level — not gated on a single initiative.' })
  }

  const risks = [`${pct(1 - conf)} residual — the signal could be stale or the estimate off.`]
  if (linked && linked.status_rag === 'red') risks.push(`Linked initiative "${linked.title}" is red — the underlying value is haircut until mitigated.`)
  if (rec.category === 'leakage') risks.push('Timing leakage compounds while un-implemented — the cost of waiting is real.')

  return {
    agent: rec.agent,
    title: rec.title,
    recommendation: rec.recommendation,
    confidence: conf,
    rulesBased: rec.rules_based !== false,
    expected,
    evidence: rec.evidence || [],
    assumptions,
    dependencies,
    risks,
  }
}
