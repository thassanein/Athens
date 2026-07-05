// Enterprise Mission Control (Phase 5B.5) — deterministic executive health
// signals composed for the flagship command center. View-only: builds on the
// existing pulse + rollup + controlTower engines; no engine/business change.
import { enterprisePulse } from './pulse.js'
import {
  controlTower, isActive, rav, REALIZING_STAGES, STAGES,
  decisionsRequired, canApproveRoles, ROLE_APPROVE_LABEL, sizedOpportunities,
  hasUnmitigatedHigh, personName, leakageBreakdown, worstRisk,
} from './engine.js'
import { aiRecommendations } from './model.js'
import { recDependencies } from './evidence.js'
import { money, pct } from './format.js'

// Days between an ISO date and the portfolio "now" (db.meta.now — never the
// wall clock, so demo output stays deterministic).
const daysSince = (db, iso) => {
  if (!iso) return null
  const d = (new Date(db.meta?.now || '2026-06-30') - new Date(String(iso).slice(0, 10))) / 86400000
  return Number.isFinite(d) ? Math.max(0, Math.round(d)) : null
}

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
// Interactive Pulse Ring (5B.6 item 2) — drill-through, score explainability,
// benchmarks, and the one trend the data genuinely supports (realized value by
// month). Benchmarks are ILLUSTRATIVE operating bands, labelled as such; ring
// history other than realized value is not stored, and the UI says so rather
// than fabricating a series.
// ---------------------------------------------------------------------------
const RING_BENCH = { created: 0.4, risk: 0.75, velocity: 0.5, adoption: 0.6, transformation: 0.3 }

export function ringExplain(db, key) {
  const pulse = enterprisePulse(db)
  const roll = pulse.roll
  const ct = controlTower(db)
  const active = db.initiatives.filter(isActive)
  const mature = active.filter((i) => ['capability', ...REALIZING_STAGES].includes(i.stage)).length
  const activeRav = active.reduce((a, i) => a + rav(i), 0)
  const realizingRav = active.filter((i) => REALIZING_STAGES.includes(i.stage)).reduce((a, i) => a + rav(i), 0)
  const rec = roll.recurringSplit
  const E = {
    created: { formula: 'realized ÷ (realized + risk-adjusted forecast)', inputs: [`Realized (validated) ${money(roll.realizedYTD)}`, `Forecast remainder ${money(roll.forecastRemainderFY)}`] },
    risk: { formula: '1 − value at risk ÷ (pipeline + value at risk)', inputs: [`Value at risk ${money(ct.valueAtRisk)}`, `Risk-adjusted pipeline ${money(ct.raPipeline)}`] },
    velocity: { formula: 'initiatives at Capability+ ÷ active initiatives', inputs: [`${mature} at Capability or beyond`, `${active.length} active`] },
    adoption: { formula: 'recurring RAV ÷ (recurring + one-time RAV)', inputs: [`Recurring ${money(rec.recurring)}`, `One-time ${money(rec.oneTime)}`] },
    transformation: { formula: 'RAV in realizing stages ÷ active RAV', inputs: [`Realizing ${money(realizingRav)}`, `Active ${money(activeRav)}`] },
  }
  const e = E[key] || { formula: '', inputs: [] }
  return { ...e, benchmark: RING_BENCH[key], benchNote: 'illustrative operating band — pending Athens KPI definitions' }
}

export function ringDrill(db, key) {
  const active = db.initiatives.filter(isActive)
  const rows = (list, val) => list
    .map((i) => ({ id: i.id, label: i.title, value: val(i) }))
    .filter((r) => r.value > 0).sort((a, b) => b.value - a.value).slice(0, 6)
  switch (key) {
    case 'created': return { title: 'Top realized value (validated)', rows: rows(db.initiatives, (i) => (i.actuals || []).filter((a) => a.validated).reduce((s, a) => s + a.realized_amount, 0)) }
    case 'risk': return { title: 'Largest value at risk (red)', rows: rows(active.filter((i) => i.status_rag === 'red'), rav) }
    case 'velocity': return { title: 'Value at Capability and beyond', rows: rows(active.filter((i) => ['capability', ...REALIZING_STAGES].includes(i.stage)), rav) }
    case 'adoption': return { title: 'Top recurring value', rows: rows(active, (i) => rav(i) * (i.benefit_lines || []).filter((b) => b.recurrence === 'recurring').reduce((s, b) => s + b.annual_amount, 0) / Math.max(1, i.gross_annual_value)) }
    case 'transformation': return { title: 'Value in realizing stages', rows: rows(active.filter((i) => REALIZING_STAGES.includes(i.stage)), rav) }
    default: return { title: '', rows: [] }
  }
}

// Monthly cumulative validated-realized series — the trend that IS in the data.
export function ringTrend(db) {
  const months = (db.meta?.fyMonths || []).map((m) => m.slice(0, 7))
  const perMonth = months.map((mk) => db.initiatives.reduce((s, i) => s + (i.actuals || []).filter((a) => a.validated && (a.period || '').slice(0, 7) === mk).reduce((x, a) => x + a.realized_amount, 0), 0))
  let cum = 0
  const series = perMonth.map((v) => (cum += v))
  const last = months.reduce((acc, mk, idx) => (perMonth[idx] > 0 ? idx : acc), -1)
  return { months, series: series.slice(0, last + 1), total: cum }
}

// ---------------------------------------------------------------------------
// Operating context (5B.6 item 1) — scope Mission Control to the enterprise, a
// region, or a business unit. A presentation filter over initiatives; every
// derived rollup recomputes automatically because it reads db.initiatives.
// ---------------------------------------------------------------------------
export function operatingContexts(db) {
  // 'Enterprise' is the HQ geo-tag on corporate-owned initiatives, not a field
  // region — offering it as a region would confusingly duplicate (and shrink)
  // the enterprise-wide option, so it is excluded here.
  const regions = [...new Set(db.initiatives.map((i) => i.region).filter((r) => r && r !== 'Enterprise'))].sort()
  const bus = [...new Set(db.initiatives.map((i) => i.business_unit).filter(Boolean))].sort()
  return [
    { key: 'enterprise', label: 'Enterprise', kind: 'enterprise' },
    ...regions.map((r) => ({ key: `region:${r}`, label: r, kind: 'region' })),
    ...bus.map((b) => ({ key: `bu:${b}`, label: b, kind: 'business_unit' })),
  ]
}

export function contextView(db, ctxKey) {
  if (!ctxKey || ctxKey === 'enterprise') return db
  const [kind, value] = ctxKey.split(/:(.+)/)
  const field = kind === 'region' ? 'region' : 'business_unit'
  return { ...db, initiatives: db.initiatives.filter((i) => i[field] === value) }
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

  // Mission intelligence (5B.6 item 3) — confidence, urgency, aging,
  // escalation, dependencies, and timing on every mission. Aging thresholds:
  // an approval pending > 7 days or a blocked item stuck > 30 days escalates.
  const CLS_CONF = {
    decision: [0.95, 'gate rules — deterministic'],
    risk: [0.85, 'flagged by validated risk rules'],
    opportunity: [0.6, 'illustrative sizing — pending FP&A validation'],
    blocked: [0.9, 'derived from request & dependency state'],
  }
  const byInit = Object.fromEntries(db.initiatives.map((i) => [i.id, i]))
  for (const m of missions) {
    const i = m.refId ? byInit[m.refId] : null
    const rec = m.cls === 'ai' ? (db.ai_recommendations || []).find((r) => `ai-${r.id}` === m.key) : null
    const [conf, confNote] = m.cls === 'ai' ? [rec?.confidence ?? 0.7, `${rec?.agent || 'agent'} signal`] : CLS_CONF[m.cls]
    const age = m.cls === 'decision' || (m.cls === 'blocked' && i?.request)
      ? daysSince(db, i?.request?.requested_at)
      : i ? daysSince(db, i.start_date) : null
    const escalated = (m.cls === 'decision' && age > 7) ? `approval pending ${age} days`
      : (m.cls === 'blocked' && age > 30) ? `stuck ${age} days` : null
    const urgency = escalated || m.cls === 'risk' ? 'Now' : m.cls === 'decision' ? 'This week' : m.cls === 'blocked' ? 'This month' : 'This quarter'
    m.intel = {
      confidence: conf, confNote,
      ageDays: age, escalated, urgency,
      deps: recDependencies(db, m.refId),
      due: i?.target_close || null,
    }
  }

  missions.sort((a, b) => b.value - a.value)
  const byClass = Object.fromEntries(MISSION_CLASSES.map((c) => [c.key, missions.filter((m) => m.cls === c.key)]))
  const totalValue = missions.reduce((a, m) => a + (m.value || 0), 0)
  return { missions, byClass, totalValue, counts: Object.fromEntries(MISSION_CLASSES.map((c) => [c.key, byClass[c.key].length])) }
}

// "Why is this ranked #N?" — the transparent composition of a mission's rank.
export function missionWhy(m, rank, total) {
  const t = m.intel || {}
  const parts = [
    m.value > 0 ? `${money(m.value)} value impact — rank #${rank} of ${total} is by dollar, nothing else` : `no dollar attached — ranked below every valued mission`,
    `urgency ${t.urgency}${t.escalated ? ` (ESCALATED — ${t.escalated})` : ''}`,
    `confidence ${pct(t.confidence)} (${t.confNote})`,
  ]
  if (t.ageDays != null) parts.push(`open ${t.ageDays} day${t.ageDays === 1 ? '' : 's'}`)
  if (t.due) parts.push(`target close ${t.due.slice(0, 7)}`)
  if ((t.deps || []).length) parts.push(`${t.deps.length} blocking dependenc${t.deps.length === 1 ? 'y' : 'ies'}`)
  return parts
}

// ---------------------------------------------------------------------------
// Strategic Opportunity & Risk Wall (5B.5 item 9) — every open opportunity and
// live risk as one prioritized wall: value impact, signal confidence, owner,
// urgency. Confidence is about the SIGNAL, stated per source: leakage is
// measured from actuals (0.9); a red flag comes from validated risk rules
// (0.85); opportunity sizing is illustrative pending FP&A validation (0.6).
// ---------------------------------------------------------------------------
const OPP_URGENCY = { Hot: 'Now', High: 'This month', Medium: 'This quarter', Low: 'This quarter' }
export function opportunityRiskWall(db) {
  const items = []
  for (const o of sizedOpportunities(db).filter((x) => x.status === 'open'))
    items.push({ type: 'opportunity', id: o.id, title: o.groupName || o.title, sub: `${o.lever} · band ${money(o.est_low)}–${money(o.est_high)}`, value: o.midpoint || 0, confidence: 0.6, confNote: 'illustrative sizing — pending FP&A validation', owner: 'Unclaimed', urgency: OPP_URGENCY[o.priority] || 'This quarter', nav: 'opportunities' })

  // Risks: red realizing initiatives + measured leakage, merged per initiative.
  const risk = {}
  for (const i of db.initiatives.filter((x) => isActive(x) && x.status_rag === 'red')) {
    const w = worstRisk(i) // highest likelihood×impact score (a number, 0–25)
    // Red already implies score ≥ 15, so tier WITHIN red: ≥20 is "Now".
    risk[i.id] = { type: 'risk', id: i.id, title: i.title, sub: `at risk in ${i.stage}${w ? ` · worst risk ${w}` : ''}`, value: rav(i), confidence: 0.85, confNote: 'flagged by validated risk rules', owner: personName(db, i.owner_id), urgency: w >= 20 ? 'Now' : 'This month', nav: 'initiative' }
  }
  for (const l of leakageBreakdown(db).items) {
    const i = db.initiatives.find((x) => x.id === l.id)
    const base = risk[l.id]
    // rav + leakage ADD (matching controlTower.valueAtRisk) so the wall's
    // "value to protect" reconciles with every other at-risk rollup.
    if (base) { base.value += l.total; base.sub += ` · ${money(l.total)} leaking`; base.urgency = 'Now'; base.confidence = 0.9; base.confNote = 'measured from actuals vs plan' }
    else risk[l.id] = { type: 'risk', id: l.id, title: l.title, sub: `${money(l.total)} leaking vs plan`, value: l.total, confidence: 0.9, confNote: 'measured from actuals vs plan', owner: personName(db, i?.owner_id), urgency: 'Now', nav: 'initiative' }
  }
  items.push(...Object.values(risk))
  items.sort((a, b) => b.value - a.value)
  return {
    items,
    oppValue: items.filter((x) => x.type === 'opportunity').reduce((a, x) => a + x.value, 0),
    riskValue: items.filter((x) => x.type === 'risk').reduce((a, x) => a + x.value, 0),
    nowCount: items.filter((x) => x.urgency === 'Now').length,
  }
}
