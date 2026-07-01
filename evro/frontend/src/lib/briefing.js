// AI intelligence layer — view-only orchestration. Composes existing engine
// outputs into a role-personalized pulse (persistent bar) and a morning
// briefing. Deterministic/rules-based; does NOT touch the engine or any logic.
import {
  decisionsRequired, copilotInsights, whatChanged, execSummary, visibleInitiatives,
  mineOpportunities, realizedYTD, rav, enterpriseRollup, controlTower, rankInitiatives,
  leakageBreakdown, scopedView,
} from './engine.js'
import { money } from './format.js'

const ROLE_TITLE = { exec: 'Executive', admin: 'EVRO Lead', fpna: 'FP&A', leader: 'Function leader', owner: 'Initiative owner', procurement: 'Procurement' }
const first = (name) => (name || '').split(' ')[0]
const enterpriseRole = (user) => ['exec', 'admin', 'fpna'].includes(user.role)

// One-line role-aware pulse for the always-on intelligence bar.
export function intelSummary(db, user) {
  const dec = decisionsRequired(db, user)
  const appr = dec.filter((d) => d.kind === 'approval')
  const leak = dec.filter((d) => d.kind === 'leakage')
  const risk = dec.filter((d) => d.kind === 'risk')
  const parts = []
  if (appr.length) parts.push({ tone: 'amber', text: `${appr.length} approval${appr.length > 1 ? 's' : ''} await you` })
  if (leak.length) parts.push({ tone: 'red', text: `${money(leak.reduce((s, d) => s + d.value, 0))} leaking vs plan` })
  if (risk.length) parts.push({ tone: 'red', text: `${risk.length} at risk` })
  if (!parts.length) parts.push({ tone: 'green', text: 'Portfolio is clear — nothing needs a decision' })
  return { parts, count: dec.length, top: dec[0] || null }
}

// Full role-personalized morning briefing.
export function morningBriefing(db, user) {
  const enterprise = ['exec', 'admin', 'fpna'].includes(user.role)
  const scope = visibleInitiatives(db, user)
  const dec = decisionsRequired(db, user)
  const insights = copilotInsights(db, user).filter((c) => c.kind !== 'summary')
  const changes = whatChanged(db, 6)

  const totalRav = scope.reduce((s, i) => s + rav(i), 0)
  const realized = scope.reduce((s, i) => s + realizedYTD(i, db), 0)
  const appr = dec.filter((d) => d.kind === 'approval')
  const watch = dec.filter((d) => d.kind === 'risk' || d.kind === 'leakage')

  const headline = enterprise
    ? execSummary(db).headline
    : `${scope.length} initiative${scope.length === 1 ? '' : 's'} in your view · ${money(totalRav)} risk-adjusted · ${money(realized)} realized YTD · ${appr.length} awaiting you`

  // Recommended action = top proactive insight (approval > leakage > opportunity).
  const rec = insights[0] || null

  // Enterprise roles (exec/admin/fpna) are exactly the opportunity-visible set.
  const opps = enterprise
    ? mineOpportunities(db).filter((o) => !o.alreadyCovered).slice(0, 3)
    : []

  const sections = [
    {
      kind: 'approval', title: 'Awaiting your sign-off', badge: 'b-amber', empty: 'Nothing needs your approval.',
      items: appr.slice(0, 6).map((d) => ({ id: d.id, label: d.title, value: d.value, hint: d.detail })),
    },
    {
      kind: 'risk', title: 'On your watch list', badge: 'b-red', empty: 'Nothing at risk in your scope.',
      items: watch.slice(0, 6).map((d) => ({ id: d.id, label: d.title, value: d.value, hint: d.detail })),
    },
    {
      kind: 'changed', title: 'What changed', badge: 'b-grey', empty: 'No recent activity.',
      items: changes.map((c) => ({ label: `${c.actor} · ${c.action}`, hint: c.detail })),
    },
  ]
  if (opps.length) {
    sections.push({
      kind: 'opportunity', title: 'Opportunities to explore', badge: 'b-opp', empty: '',
      items: opps.map((o) => ({ label: `${o.group} — ${o.lever}`, value: o.estValue, hint: o.signals.slice(0, 2).join(', ') })),
    })
  }

  return {
    greeting: `Good morning, ${first(user.name)}`,
    roleTitle: ROLE_TITLE[user.role] || 'EVRO',
    headline,
    rec,
    sections,
    decisions: dec.length,
  }
}

// Executive Briefing 2.0 — an auto-generated, structured deterministic briefing:
// value realized, largest driver, biggest risk, leakage (the marquee blocks),
// plus actionable approvals, opportunities and recommended actions. Scopes to
// the user exactly as the app does. View-only; the caller wires one-click actions.
export function executiveBriefing(db, user) {
  const enterprise = enterpriseRole(user)
  const sdb = enterprise ? db : scopedView(db, user)
  const roll = enterpriseRollup(sdb)
  const ct = controlTower(sdb)
  const dec = decisionsRequired(sdb, user)
  const ranked = rankInitiatives(sdb, 'return')
  const leak = leakageBreakdown(sdb)
  const insights = copilotInsights(sdb, user).filter((c) => c.kind !== 'summary')
  const opps = enterprise ? mineOpportunities(sdb).filter((o) => !o.alreadyCovered).slice(0, 3) : []
  const approvals = dec.filter((d) => d.kind === 'approval')
  const driver = ranked[0]
  const topRisk = (roll.topRisks || [])[0]

  const scopedRealized = enterprise ? roll.realizedYTD : visibleInitiatives(db, user).reduce((s, i) => s + realizedYTD(i, db), 0)

  const blocks = [
    { key: 'realized', icon: '💰', title: 'Value realized', tone: 'green', value: money(roll.realizedYTD),
      sub: `${money(roll.raPipeline)} risk-adjusted pipeline · ${money(roll.forecastRemainderFY)} forecast for the rest of FY` },
    { key: 'driver', icon: '🚀', title: 'Largest value driver', tone: 'green', value: driver ? money(driver.rav) : '—',
      sub: driver ? `"${driver.title}"` : 'no active initiatives', id: driver?.id },
    { key: 'risk', icon: '⚠️', title: 'Biggest risk', tone: 'red', value: money(ct.valueAtRisk),
      sub: topRisk ? `"${topRisk.title}" — ${topRisk.countermeasure || 'no countermeasure yet'} (score ${topRisk.score})` : 'nothing at risk', id: topRisk?.initiative },
    { key: 'leakage', icon: '💧', title: 'Value leakage', tone: 'amber', value: money(leak.total),
      sub: leak.items[0] ? `biggest: "${leak.items[0].title}" at ${money(leak.items[0].total)} vs plan` : 'no leakage', id: leak.items[0]?.id },
  ]

  return {
    greeting: `Good morning, ${first(user.name)}`,
    roleTitle: ROLE_TITLE[user.role] || 'EVRO',
    headline: enterprise ? execSummary(db).headline
      : `${money(scopedRealized)} realized in your view · ${approvals.length} awaiting you · ${dec.length} decision${dec.length === 1 ? '' : 's'}`,
    blocks,
    approvals: approvals.slice(0, 6).map((d) => ({ id: d.id, title: d.title, value: d.value, detail: d.detail, roles: d.roles || [] })),
    opportunities: opps.map((o) => ({ label: `${o.group} — ${o.lever}`, value: o.estValue, hint: o.signals.slice(0, 2).join(', ') })),
    actions: insights.slice(0, 4).map((c) => ({ title: c.title, body: c.body, id: c.target, kind: c.kind })),
    decisions: dec.length,
  }
}
