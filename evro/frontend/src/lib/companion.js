// Executive AI Companion + Morning Operating Screen intelligence (view-only).
// Composes existing engine exports into persona-framed executive intelligence.
// Deterministic / rules-based (no LLM). Does NOT touch the engine, mutations,
// schema, API, RBAC, or any business logic.
//
// The "operating lenses" (CEO/CFO/COO/Operations/Procurement) are PRESENTATION
// viewpoints, not RBAC roles — they reorder emphasis and pick a headline metric
// only. They never change permissions or the underlying numbers; scope is still
// enforced by the engine (`scopedView`) exactly as before.
import {
  enterpriseRollup, controlTower, decisionsRequired, copilotInsights, mineOpportunities,
  sustainmentBook, scopedView,
} from './engine.js'
import { money, pct } from './format.js'

export const OPERATING_MODES = [
  { key: 'ceo', label: 'CEO', blurb: 'Enterprise value, returns & decisions' },
  { key: 'cfo', label: 'CFO', blurb: 'Realized vs forecast, leakage & capital' },
  { key: 'coo', label: 'COO', blurb: 'Delivery, risk & sustainment' },
  { key: 'ops', label: 'Operations', blurb: 'Field realization & adoption' },
  { key: 'procurement', label: 'Procurement', blurb: 'Sourcing opportunity & leakage' },
]

export const defaultModeFor = (role) =>
  ({ exec: 'ceo', admin: 'ceo', fpna: 'cfo', leader: 'coo', owner: 'ops', procurement: 'procurement' }[role] || 'ceo')

const first = (n) => (n || '').split(' ')[0]
const enterpriseRole = (user) => ['exec', 'admin', 'fpna'].includes(user.role)

// Enterprise (or scoped) value under management — the operating-screen headline.
export function valueUnderManagement(db) {
  const r = enterpriseRollup(db)
  return {
    total: r.realizedYTD + r.forecastRemainderFY + r.identifiedOpportunity,
    realized: r.realizedYTD,
    forecast: r.forecastRemainderFY,
    pipeline: r.raPipeline,
    opportunity: r.identifiedOpportunity,
    initiatives: r.counts.active,
    capturePct: r.capturePct,
  }
}

// How each operating lens reframes the same intelligence.
const MODE_PLAN = {
  ceo: {
    order: ['recommendations', 'decisions', 'risks', 'opportunities'],
    metric: (vum) => ({ label: 'Enterprise value under management', value: money(vum.total), sub: `${money(vum.realized)} realized · ${money(vum.forecast)} forecast · ${money(vum.opportunity)} identified` }),
  },
  cfo: {
    order: ['risks', 'decisions', 'opportunities', 'recommendations'],
    metric: (vum, s) => ({ label: 'Realized + forecast (FY)', value: money(vum.realized + vum.forecast), sub: `${money(s.ct.leakage)} leaking · ${money(s.ct.optimizableValue)} fundable within budget` }),
  },
  coo: {
    order: ['risks', 'sustainment', 'decisions', 'recommendations'],
    metric: (vum, s) => ({ label: 'Value at risk', value: money(s.ct.valueAtRisk), sub: `sustainment ${pct(s.sustain.avg)} of plan · ${s.sustain.eroding.length} eroding` }),
  },
  ops: {
    order: ['opportunities', 'recommendations', 'risks'],
    metric: (vum) => ({ label: 'Realized value (YTD)', value: money(vum.realized), sub: `${vum.initiatives} active initiatives · ${money(vum.pipeline)} risk-adjusted pipeline` }),
  },
  procurement: {
    order: ['opportunities', 'risks', 'decisions'],
    metric: (vum, s) => ({ label: 'Identified opportunity', value: money(vum.opportunity), sub: `${money(s.ct.leakage)} leaking vs plan` }),
  },
}

function signals(db, user) {
  const dec = decisionsRequired(db, user)
  const insights = copilotInsights(db, user).filter((c) => c.kind !== 'summary')
  const opps = enterpriseRole(user) ? mineOpportunities(db).filter((o) => !o.alreadyCovered).slice(0, 4) : []
  return { dec, insights, opps, ct: controlTower(db), sustain: sustainmentBook(db) }
}

// The persona-framed companion brief — greeting, headline metric, and the
// operating sections re-ordered for the chosen lens. Scopes to the user's
// visibility exactly as the rest of the app does.
export function companionBrief(db, user, modeKey = 'ceo') {
  const mode = OPERATING_MODES.find((m) => m.key === modeKey) || OPERATING_MODES[0]
  const sdb = enterpriseRole(user) ? db : scopedView(db, user)
  const s = signals(sdb, user)
  const vum = valueUnderManagement(sdb)

  const sectionByKey = {
    recommendations: { kind: 'reco', title: 'Recommended actions', badge: 'b-navy', nav: 'mining',
      items: s.insights.slice(0, 4).map((c) => ({ label: c.title, hint: c.body, id: c.target })) },
    decisions: { kind: 'decision', title: 'Needs a decision today', badge: 'b-amber', nav: 'cockpit',
      items: s.dec.slice(0, 6).map((d) => ({ label: d.title, hint: d.detail, value: d.value, id: d.id })) },
    risks: { kind: 'risk', title: 'Risks & leakage', badge: 'b-red', nav: 'sustainment',
      items: s.dec.filter((d) => d.kind === 'risk' || d.kind === 'leakage').slice(0, 6).map((d) => ({ label: d.title, hint: d.detail, value: d.value, id: d.id })) },
    opportunities: { kind: 'opp', title: 'Opportunities to explore', badge: 'b-opp', nav: 'mining',
      items: s.opps.map((o) => ({ label: `${o.group} — ${o.lever}`, hint: o.signals.slice(0, 2).join(', '), value: o.estValue })) },
    sustainment: { kind: 'sustain', title: 'Sustainment watch', badge: 'b-red', nav: 'sustainment',
      items: s.sustain.eroding.slice(0, 6).map((x) => ({ label: x.title, hint: `realizing ${Math.round((x.score || 0) * 100)}% of plan`, id: x.id })) },
  }

  const plan = MODE_PLAN[mode.key]
  const sections = plan.order.map((k) => sectionByKey[k]).filter((sec) => sec && sec.items.length)

  return {
    greeting: `Good morning, ${first(user.name)}`,
    mode,
    metric: plan.metric(vum, s),
    vum,
    rec: s.insights[0] || null,
    sections,
    decisions: s.dec.length,
  }
}
