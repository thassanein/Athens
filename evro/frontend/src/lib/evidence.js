// Explainability & Evidence framework (5B.6 item 9) — every recommendation
// carries confidence, evidence, assumptions, and dependencies, and earns a
// deterministic EXPLAINABILITY SCORE from what it can actually show:
//   +25 confidence stated · +25 evidence attached · +25 record linked ·
//   +25 assumptions stated.  ≥75 High · ≥50 Medium · else Basic.
// View-only; no engine change.
import { prerequisites, personName, STAGES, isActive } from './engine.js'

// Deterministic working assumptions per agent — the rules each signal rests
// on, stated so an executive can challenge them. Presentation copy, not data.
const AGENT_ASSUMPTIONS = {
  'Realization Agent': ['Unvalidated actuals will validate near par', 'Realized = FP&A-validated only'],
  'Avoidance Agent': ['Inflation rates hold as configured per sourcing group', 'Avoidance = projected − actual'],
  'Opportunity Agent': ['Opportunity sizing bands are illustrative pending FP&A validation'],
  'Risk Agent': ['Risk scores (likelihood × impact) are current', 'Unmitigated high risk haircuts value'],
  'Concentration Agent': ['Value share by business unit approximates delivery dependence'],
  'Leakage Agent': ['Implemented run-rate reflects invoice reality', 'Negotiated value is contractual'],
}
export const assumptionsFor = (agent) => AGENT_ASSUMPTIONS[agent] || []

// Blocking dependencies on the linked record (if it is an initiative).
export function recDependencies(db, linkedId) {
  if (!linkedId || !String(linkedId).startsWith('i-')) return []
  const byId = Object.fromEntries(db.initiatives.map((i) => [i.id, i]))
  const launchIdx = STAGES.indexOf('launch')
  return prerequisites(db, linkedId)
    .map((pid) => byId[pid])
    .filter((p) => p && isActive(p) && STAGES.indexOf(p.stage) < launchIdx)
    .map((p) => `Blocked by "${p.title}" (${p.stage}) — ${personName(db, p.owner_id)}`)
}

// The explainability score — computed from what the recommendation can show.
export function explainability(db, rec) {
  const evidence = rec.evidence || []
  const assumptions = rec.assumptions || assumptionsFor(rec.agent)
  const dependencies = rec.dependencies || recDependencies(db, rec.linked_id)
  const parts = [
    { key: 'confidence', ok: rec.confidence != null, label: rec.confidence != null ? `Confidence stated (${Math.round(rec.confidence * 100)}%)` : 'No confidence stated' },
    { key: 'evidence', ok: evidence.length > 0, label: evidence.length ? `${evidence.length} evidence item${evidence.length === 1 ? '' : 's'}` : 'No evidence attached' },
    { key: 'linked', ok: !!rec.linked_id, label: rec.linked_id ? `Linked record: ${rec.linked_id}` : 'No linked record' },
    { key: 'assumptions', ok: assumptions.length > 0, label: assumptions.length ? 'Assumptions stated' : 'No assumptions stated' },
  ]
  const score = parts.reduce((a, p) => a + (p.ok ? 25 : 0), 0)
  const tier = score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Basic'
  return { score, tier, parts, evidence, assumptions, dependencies }
}
