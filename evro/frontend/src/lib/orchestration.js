// Chief of Staff orchestration model (Phase 5B.5 item 3) — how the
// deterministic agent team collaborates: Analyst → Advisor → Simulator →
// Memory → Chief of Staff. Every number is computed from real portfolio state;
// "disagreements" are derived where open agent signals genuinely pull in
// opposite directions (expand vs protect). View-only; no engine change.
import { scenarioTotals, decisionsRequired, isActive } from './engine.js'
import { aiRecommendations, decisionJournal, scenarios } from './model.js'
import { money, pct } from './format.js'

export function orchestrationModel(db, user) {
  const recs = aiRecommendations(db, { status: 'open' })
  const journal = decisionJournal(db)
  const log = db.audit_log || []
  const st = scenarioTotals(db)
  const active = db.initiatives.filter(isActive)
  const validated = db.initiatives.reduce((a, i) => a + (i.actuals || []).filter((x) => x.validated).length, 0)
  const risks = db.initiatives.reduce((a, i) => a + (i.risks || []).length, 0)

  // Advisor sub-agents — grouped from the live recommendations.
  const byAgent = {}
  for (const r of recs) (byAgent[r.agent] ||= []).push(r)
  const agents = Object.entries(byAgent).map(([name, rs]) => ({
    name, count: rs.length,
    confidence: rs.reduce((a, r) => a + (r.confidence || 0), 0) / rs.length,
    top: rs.sort((a, b) => (b.value_impact || 0) - (a.value_impact || 0))[0]?.title,
  })).sort((a, b) => b.confidence - a.confidence)
  const avgConf = recs.length ? recs.reduce((a, r) => a + (r.confidence || 0), 0) / recs.length : 0

  const decisions = decisionsRequired(db, user)

  const stages = [
    { key: 'analyst', name: 'Analyst', role: 'Reads the enterprise', flow: 'signals',
      stats: [`${active.length} active initiatives`, `${(db.spend_categories || []).length} spend lines`, `${validated} validated actuals`, `${risks} logged risks`] },
    { key: 'advisor', name: 'Advisor', role: `${agents.length} domain agents`, flow: 'advice',
      stats: [`${recs.length} open recommendations`, `${pct(avgConf)} avg confidence`, 'each with evidence attached'] },
    { key: 'simulator', name: 'Simulator', role: 'Stress-tests the plan', flow: 'stress-tested plan',
      stats: [`Committed ${money(st.committed)}`, `Expected ${money(st.expected)}`, `Upside ${money(st.upside)}`, `${scenarios(db).length} scenario lenses`] },
    { key: 'memory', name: 'Memory', role: 'Remembers & feeds back', flow: 'context + precedent',
      stats: [`${journal.length} journaled decisions`, `${log.length} logged actions`, 'precedent returns to every agent'] },
    { key: 'chief', name: 'Chief of Staff', role: 'Synthesizes for you', flow: null,
      stats: [`${decisions.length} decisions surfaced`, 'briefing framed per lens', 'confidence + evidence on every call'] },
  ]

  // Disagreements — the top expansion signal challenged by each protection
  // signal. Deterministic resolution rule: the higher confidence leads; the
  // dissent is retained as evidence, never discarded.
  const expand = recs.filter((r) => r.category === 'opportunity').sort((a, b) => (b.value_impact || 0) - (a.value_impact || 0))
  const protect = recs.filter((r) => r.category === 'risk')
  const tensions = expand.length ? protect.map((b) => {
    const a = expand[0]
    return { a, b, leads: (a.confidence || 0) >= (b.confidence || 0) ? 'a' : 'b' }
  }) : []

  return { stages, agents, tensions, avgConf, recCount: recs.length }
}
