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

// ---------------------------------------------------------------------------
// AI Confidence Heatmap (5B.7 item 5) — recommendation confidence and quality
// by executive domain × capability. Domains come from what each deterministic
// agent actually watches; a domain no agent covers (Customer Experience today)
// is shown as a coverage gap, never given an invented score.
// ---------------------------------------------------------------------------
export const AGENT_DOMAIN = {
  'Realization Agent': 'Finance',
  'Leakage Agent': 'Finance',
  'Avoidance Agent': 'Procurement',
  'Opportunity Agent': 'Procurement',
  'Risk Agent': 'Operations',
  'Concentration Agent': 'Transformation',
}
export const HEATMAP_DOMAINS = ['Finance', 'Operations', 'Procurement', 'Customer Experience', 'Transformation']
export const HEATMAP_CAPS = [
  { key: 'governance', label: 'Governance' },
  { key: 'value', label: 'Value delivery' },
  { key: 'opportunity', label: 'Opportunity' },
  { key: 'risk', label: 'Risk' },
]

export function confidenceHeatmap(db) {
  const recs = (db.ai_recommendations || []).filter((r) => r.status === 'open')
  const cells = {}
  for (const r of recs) {
    const domain = AGENT_DOMAIN[r.agent] || 'Transformation'
    const cell = (cells[`${domain}|${r.category}`] ||= { recs: [] })
    cell.recs.push(r)
  }
  const rows = HEATMAP_DOMAINS.map((domain) => {
    const rowCells = HEATMAP_CAPS.map((cap) => {
      const cell = cells[`${domain}|${cap.key}`]
      if (!cell) return { cap: cap.key, empty: true }
      const conf = cell.recs.reduce((a, r) => a + (r.confidence || 0), 0) / cell.recs.length
      const exps = cell.recs.map((r) => explainability(db, r).score)
      const quality = exps.reduce((a, x) => a + x, 0) / exps.length
      const weak = quality < 50 || cell.recs.some((r) => (r.evidence || []).length < 2)
      return { cap: cap.key, count: cell.recs.length, conf, quality, weak, recs: cell.recs }
    })
    const all = rowCells.filter((c) => !c.empty)
    const covered = all.length > 0
    return {
      domain, cells: rowCells, covered,
      count: all.reduce((a, c) => a + c.count, 0),
      conf: covered ? all.reduce((a, c) => a + c.conf * c.count, 0) / all.reduce((a, c) => a + c.count, 0) : null,
      weak: all.some((c) => c.weak),
      note: covered ? null : 'no agent coverage yet — a real weak-evidence area',
    }
  })
  const gaps = rows.filter((r) => !r.covered).map((r) => r.domain)
  const weakCells = rows.flatMap((r) => r.cells.filter((c) => !c.empty && c.weak).map((c) => ({ domain: r.domain, cap: c.cap })))
  return { rows, gaps, weakCells, total: recs.length }
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
