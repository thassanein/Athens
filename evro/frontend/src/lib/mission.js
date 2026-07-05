// Enterprise Mission Control (Phase 5B.5) — deterministic executive health
// signals composed for the flagship command center. View-only: builds on the
// existing pulse + rollup + controlTower engines; no engine/business change.
import { enterprisePulse } from './pulse.js'
import {
  controlTower, isActive, rav, REALIZING_STAGES, STAGES,
  decisionsRequired, canApproveRoles, ROLE_APPROVE_LABEL, sizedOpportunities,
  hasUnmitigatedHigh, personName,
} from './engine.js'
import { aiRecommendations } from './model.js'
import { money, pct } from './format.js'

const clamp01 = (v) => Math.max(0, Math.min(1, isFinite(v) ? v : 0))

// The Enterprise Pulse Ring — five concentric "activity rings", each a 0..1
// progress value with a colour and a plain-language detail. Reuses the pulse
// axes plus value-created and a transformation-progress measure.
export function missionHealth(db) {
  const pulse = enterprisePulse(db)
  const roll = pulse.roll
  const ct = controlTower(db)
  const recs = db.ai_recommendations || []
  const aiConfidence = recs.length ? recs.reduce((a, r) => a + (r.confidence || 0), 0) / recs.length : 0
  const axis = (k) => pulse.axes.find((a) => a.key === k)?.value ?? 0

  const active = db.initiatives.filter(isActive)
  const activeRav = active.reduce((a, i) => a + rav(i), 0)
  const realizingRav = active.filter((i) => REALIZING_STAGES.includes(i.stage)).reduce((a, i) => a + rav(i), 0)
  const transformation = clamp01(activeRav ? realizingRav / activeRav : 0)
  const riskControl = clamp01(1 - ct.valueAtRisk / Math.max(1, ct.raPipeline + ct.valueAtRisk))

  const rings = [
    { key: 'created', label: 'Value Created', value: axis('realization'), color: '#3FC97F', detail: `${money(roll.realizedYTD)} realized` },
    { key: 'risk', label: 'Value at Risk', value: riskControl, color: '#E5484D', detail: `${money(ct.valueAtRisk)} exposed`, invert: true },
    { key: 'velocity', label: 'Execution Velocity', value: axis('momentum'), color: '#4F8DF2', detail: 'pipeline maturing' },
    { key: 'adoption', label: 'Adoption', value: axis('durability'), color: '#8B5CF6', detail: 'recurring value share' },
    { key: 'transformation', label: 'Transformation', value: transformation, color: '#F5A524', detail: 'value reaching realization' },
  ]

  // Enterprise health signals — each answers "what happened", framed for the
  // 30-second read.
  const signals = [
    { key: 'created', label: 'Value created (YTD)', value: money(roll.realizedYTD), tone: 'green', note: 'FP&A-validated, booked' },
    { key: 'leakage', label: 'Value leakage', value: money(roll.leakage), tone: 'red', note: 'negotiated, not yet implemented' },
    { key: 'atrisk', label: 'Value at risk', value: money(ct.valueAtRisk), tone: 'red', note: `${pulse.redCount} initiatives red` },
    { key: 'velocity', label: 'Execution velocity', value: pct(axis('momentum')), tone: 'navy', note: 'share at Capability+' },
    { key: 'transformation', label: 'Transformation progress', value: pct(transformation), tone: 'amber', note: 'value reaching realization' },
    { key: 'ai', label: 'AI confidence', value: pct(aiConfidence), tone: 'navy', note: `${recs.length} agent signals` },
  ]

  return { pulse, rings, signals, aiConfidence, ct, roll }
}

// ---------------------------------------------------------------------------
// Mission Queue (sprint item 4) — the work of the enterprise classified into
// five mission types and ranked by value impact. Composes existing engine
// surfaces only; actions map to existing mutations/navigation.
// ---------------------------------------------------------------------------
export const MISSION_CLASSES = [
  { key: 'decision', label: 'Decisions required', tone: '#F5A524', hint: 'Waiting on your sign-off' },
  { key: 'opportunity', label: 'Value opportunities', tone: '#3FC97F', hint: 'Advertised, unclaimed value' },
  { key: 'risk', label: 'Risk escalations', tone: '#E5484D', hint: 'Value leaking or at risk' },
  { key: 'ai', label: 'AI recommendations', tone: '#4F8DF2', hint: 'Deterministic agent signals' },
  { key: 'blocked', label: 'Blocked execution', tone: '#8B5CF6', hint: 'Value stuck behind a gate' },
]

export function missionQueue(db, user) {
  const missions = []
  // One mission per underlying item: `emitted` tracks every refId already
  // carrying a mission so no initiative/opportunity is listed — or summed into
  // "value at stake" — twice across classes.
  const emitted = new Set()

  // 1) Decisions required — pending approvals this user can act on.
  const dec = decisionsRequired(db, user)
  for (const d of dec.filter((x) => x.kind === 'approval')) {
    emitted.add(d.id)
    missions.push({ cls: 'decision', key: `dec-${d.id}`, refId: d.id, title: d.title, why: d.detail, value: d.value || 0, action: 'approve' })
  }

  // 3) Risk escalations — leakage + at-risk realization (non-approval kinds).
  //    decisionsRequired can emit BOTH kinds for one initiative; keep the first
  //    (it sorts by value desc, so that's the larger signal).
  for (const d of dec.filter((x) => x.kind !== 'approval')) {
    if (emitted.has(d.id)) continue
    emitted.add(d.id)
    missions.push({ cls: 'risk', key: `${d.kind}-${d.id}`, refId: d.id, title: d.title, why: d.detail, value: d.value || 0, action: 'open' })
  }

  // 2) Value opportunities — open advertised pools, sized at midpoint.
  for (const o of sizedOpportunities(db).filter((x) => x.status === 'open')) {
    emitted.add(o.id)
    missions.push({ cls: 'opportunity', key: `opp-${o.id}`, refId: o.id, title: o.title, why: `${o.lever} · band ${money(o.est_low)}–${money(o.est_high)}`, value: o.midpoint || 0, action: 'navigate', nav: 'opportunities' })
  }

  // 4) AI recommendations — the deterministic agent signals. A rec whose
  //    linked item already carries a mission is skipped (same dollar, same
  //    destination — it would double-count the ranked list and the KPI).
  for (const r of aiRecommendations(db, { status: 'open' })) {
    if (r.linked_id && emitted.has(r.linked_id)) continue
    missions.push({ cls: 'ai', key: `ai-${r.id}`, refId: r.linked_id, title: r.title, why: `${r.agent} · ${pct(r.confidence)} confidence`, value: r.value_impact || 0, action: 'navigate', nav: r.category === 'opportunity' ? 'opportunities' : r.category === 'risk' ? 'sustainment' : 'valueoffice' })
  }

  // 5) Blocked execution — value stuck behind someone/something else:
  //    a) a pending request awaiting OTHER approvers, b) a launch gate held by
  //    an unmitigated high risk, c) a blocking dependency not yet delivered.
  //    Seeded with already-emitted initiative ids so an item never appears as
  //    both a decision/risk and a blocked mission.
  const seen = new Set([...emitted].filter((id) => String(id).startsWith('i-')))
  const block = (i, why) => { if (!seen.has(i.id)) { seen.add(i.id); missions.push({ cls: 'blocked', key: `blk-${i.id}`, refId: i.id, title: i.title, why, value: rav(i) || i.gross_annual_value || 0, action: 'open' }) } }
  for (const i of db.initiatives.filter((x) => x.request && canApproveRoles(user, x).length === 0)) {
    const filled = (i.request.approvals || []).map((a) => a.role)
    const waiting = i.request.need.filter((r) => !filled.includes(r)).map((r) => ROLE_APPROVE_LABEL[r] || r)
    block(i, `Awaiting ${waiting.join(' + ') || 'sign-off'}`)
  }
  for (const i of db.initiatives.filter((x) => x.stage === 'capability' && hasUnmitigatedHigh(x)))
    block(i, 'Launch gate held — high risk needs a countermeasure')
  const byId = Object.fromEntries(db.initiatives.map((i) => [i.id, i]))
  const realizingIdx = STAGES.indexOf('launch')
  for (const e of (db.dependencies || []).filter((d) => d.type === 'blocks')) {
    const from = byId[e.from], to = byId[e.to]
    if (!from || !to || !isActive(to)) continue
    if (STAGES.indexOf(from.stage) < realizingIdx && isActive(from))
      block(to, `Blocked by "${from.title}" (${from.stage}) — ${personName(db, from.owner_id)}`)
  }

  missions.sort((a, b) => b.value - a.value)
  const byClass = Object.fromEntries(MISSION_CLASSES.map((c) => [c.key, missions.filter((m) => m.cls === c.key)]))
  const totalValue = missions.reduce((a, m) => a + (m.value || 0), 0)
  return { missions, byClass, totalValue, counts: Object.fromEntries(MISSION_CLASSES.map((c) => [c.key, byClass[c.key].length])) }
}
