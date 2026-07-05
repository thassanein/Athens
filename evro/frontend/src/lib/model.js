// Phase 5B — Athens OS foundation entities: pure read accessors over the new
// data-model collections (org hierarchy, forecast scenarios, knowledge cards,
// decision journal, deterministic AI recommendations). These compose existing
// db state only — no engine or business-logic here. Every accessor is defensive
// so an older cached db (pre-backfill) degrades to empty rather than throwing.

// ---- OrganizationNode -------------------------------------------------------
export function orgNodes(db) { return db?.org_nodes || [] }

export function orgRoot(db) { return orgNodes(db).find((n) => n.type === 'enterprise') || null }

// Nested tree { ...node, children: [] } from the flat parent_id list.
export function orgTree(db) {
  const nodes = orgNodes(db).map((n) => ({ ...n, children: [] }))
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const roots = []
  for (const n of nodes) {
    if (n.parent_id && byId[n.parent_id]) byId[n.parent_id].children.push(n)
    else roots.push(n)
  }
  return roots.length === 1 ? roots[0] : { id: 'virtual-root', type: 'enterprise', name: 'Enterprise', children: roots }
}

// Flat list filtered to one dimension ('geography' | 'operating'), keeping order.
export function orgByDimension(db, dimension) {
  return orgNodes(db).filter((n) => n.dimension === dimension)
}
export function orgByType(db, type) { return orgNodes(db).filter((n) => n.type === type) }

// ---- ForecastScenario -------------------------------------------------------
export function scenarios(db) { return db?.forecast_scenarios || [] }
export function defaultScenario(db) { return scenarios(db).find((s) => s.is_default) || scenarios(db)[0] || null }
export function scenario(db, key) { return scenarios(db).find((s) => s.key === key || s.id === key) || null }

// ---- KnowledgeCard (glossary + explainability) ------------------------------
export function knowledgeCards(db) { return db?.knowledge_cards || [] }

// Case-insensitive lookup by id, exact term, or any alias.
export function knowledgeCard(db, key) {
  if (!key) return null
  const k = String(key).toLowerCase().trim()
  return knowledgeCards(db).find(
    (c) => c.id === key || c.term.toLowerCase() === k || (c.aka || []).some((a) => a.toLowerCase() === k)
  ) || null
}

// A lookup index keyed by every term + alias (lowercased) → card. Powers hover
// help / "Explain This" without re-scanning the list per token.
export function knowledgeIndex(db) {
  const idx = {}
  for (const c of knowledgeCards(db)) {
    idx[c.term.toLowerCase()] = c
    for (const a of c.aka || []) idx[a.toLowerCase()] = c
  }
  return idx
}

export function knowledgeByCategory(db) {
  const out = {}
  for (const c of knowledgeCards(db)) (out[c.category] ||= []).push(c)
  return out
}

// Audience-scoped explanation text: 'beginner' | 'practitioner' | 'executive'.
export function explain(card, level = 'practitioner') {
  if (!card) return ''
  return card.levels?.[level] || card.definition || card.short || ''
}

// ---- DecisionJournal --------------------------------------------------------
export function decisionJournal(db) {
  return [...(db?.decision_journal || [])].sort((a, b) => String(b.at).localeCompare(String(a.at)))
}

// ---- AIRecommendation (deterministic, rules-based — no LLM) ------------------
export function aiRecommendations(db, { category, status } = {}) {
  return (db?.ai_recommendations || []).filter(
    (r) => (!category || r.category === category) && (!status || r.status === status)
  )
}
