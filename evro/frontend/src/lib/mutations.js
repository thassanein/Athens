// Pure write reducers: (db, payload) → new db. Used by the frontend for
// optimistic local writes (demo mode persists to localStorage) and mirrored by
// the Express server for the Postgres path, so both produce identical state.
// Every reducer appends to the append-only audit_log.
import { STAGES, STAGE_CONFIDENCE, nextStage, requiredRoles, approvalState, canApproveRoles, hasUnmitigatedHigh, ROLE_APPROVE_LABEL } from './engine.js'

// Drop any memoized engine cache before cloning (defensive — the engine now
// keys its index off a WeakMap, but never persist a vestigial _idx).
const clone = (o) => { const { _idx, ...rest } = o; return JSON.parse(JSON.stringify(rest)) }
const now = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)
const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`

function log(db, actor_id, action, entity, detail) {
  db.audit_log.unshift({ id: uid('al'), ts: now(), actor_id, action, entity, detail })
}

// ---- create an initiative (enters as Proposed, awaiting approval) ----------
// A new project does NOT enter the pipeline until a line manager AND FP&A
// approve it (its financials, timing, phase, cost category, savings/avoidance).
export function createInitiative(db, draft, actorId) {
  const next = clone(db)
  const id = uid('i')
  const cat = next.spend_categories.find((c) => c.id === draft.spend_category_id)
  const init = {
    id,
    title: draft.title || 'New initiative',
    description: draft.description || '',
    pillar: draft.pillar || 'savings',
    benefit_type: draft.benefit_type || (draft.pillar === 'avoidance' ? 'avoidance' : 'savings'),
    approach: draft.approach || '',
    stage: 'proposed',
    confidence: 0,
    group_id: cat?.group_id || draft.group_id || null,
    department: draft.department || '—',
    owner_id: draft.owner_id,
    contributions: [{ user_id: draft.owner_id, credit_pct: 100 }],
    spend_category_id: draft.spend_category_id || null,
    vendor: null,
    gross_annual_value: Number(draft.gross_annual_value) || 0,
    negotiated_value: null,
    effort_score: Number(draft.effort_score) || 3,
    realization_factor: 1,
    start_date: today(),
    target_close: draft.target_close || null,
    kr_link: draft.kr_link || null,
    status_rag: 'green',
    opportunity_id: draft.opportunity_id || null,
    baseline: { basis: draft.pillar === 'avoidance' ? 'forecast' : 'run_rate', amount: 0, source_ref: cat ? `2025 AP register · ${cat.name}` : '', validated_by: null, validated_at: null },
    benefit_lines: [{ pnl_line: cat?.pnl_line || 'opex', recurrence: 'recurring', annual_amount: Number(draft.gross_annual_value) || 0 }],
    actuals: [],
    risks: [],
    validations: [],
    request: { kind: 'intake', to_stage: 'idea', need: ['line_manager', 'fpna'], approvals: [], requested_by: actorId, requested_at: now() },
  }
  next.initiatives.unshift(init)
  log(next, actorId, 'create', id, `Project "${init.title}" proposed — awaiting line manager + FP&A approval.`)
  return { db: next, id }
}

// ---- commit an approved request (intake → Idea, or phase change) -----------
function commitRequest(next, i, actorId) {
  const r = i.request
  if (r.kind === 'intake') {
    i.stage = 'idea'; i.confidence = STAGE_CONFIDENCE.idea
    i.validations.unshift({ type: 'intake', decision: 'approved', actor_id: actorId, decided_at: today(), note: 'New project approved into the pipeline (line manager + FP&A).' })
    log(next, actorId, 'approve', i.id, 'New project approved into pipeline.')
  } else {
    i.stage = r.to_stage; i.confidence = STAGE_CONFIDENCE[r.to_stage]
    i.validations.unshift({ type: 'gate', decision: 'approved', actor_id: actorId, decided_at: today(), note: `Advanced to ${r.to_stage} (line manager + FP&A${r.need.includes('steering') ? ' + Steering' : ''}).` })
    log(next, actorId, 'advance', i.id, `Advanced to ${r.to_stage}.`)
  }
  i.request = null
}

// ---- owner requests advancement to the next phase --------------------------
export function requestGate(db, id, actorId) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  if (!i) return { db, error: 'not found' }
  if (i.request) return { db, error: 'An approval is already pending.' }
  if (i.stage === 'proposed') return { db, error: 'Project is still awaiting intake approval.' }
  const to = nextStage(i)
  if (!to) return { db, error: 'No further gate.' }
  if (to === 'launch' && hasUnmitigatedHigh(i)) return { db, error: 'High risks need a documented countermeasure before requesting Launch.' }
  i.request = { kind: 'gate', to_stage: to, need: requiredRoles(i, to), approvals: [], requested_by: actorId, requested_at: now() }
  log(next, actorId, 'request', id, `Advancement to ${to} requested (needs ${i.request.need.map((r) => ROLE_APPROVE_LABEL[r]).join(' + ')}).`)
  return { db: next }
}

// ---- approve a pending request (fills every role the actor is entitled to) --
export function approveRequest(db, id, actorId) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  if (!i || !i.request) return { db, error: 'No pending request.' }
  const actor = next.people.find((p) => p.id === actorId)
  const roles = canApproveRoles(actor, i)
  if (roles.length === 0) return { db, error: 'You are not entitled to approve this request.' }
  for (const role of roles) i.request.approvals.push({ role, by: actorId, at: today() })
  log(next, actorId, 'approve', id, `Approved as ${roles.map((r) => ROLE_APPROVE_LABEL[r]).join(', ')}.`)
  if (approvalState(i).remaining.length === 0) commitRequest(next, i, actorId)
  return { db: next }
}

// ---- return a pending request for rework -----------------------------------
export function rejectRequest(db, id, actorId, note) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  if (!i || !i.request) return { db, error: 'No pending request.' }
  const actor = next.people.find((p) => p.id === actorId)
  if (canApproveRoles(actor, i).length === 0) return { db, error: 'You are not entitled to act on this request.' }
  i.validations.unshift({ type: i.request.kind, decision: 'returned', actor_id: actorId, decided_at: today(), note: note || 'Returned for rework.' })
  i.request = null
  log(next, actorId, 'reject', id, 'Request returned for rework.')
  return { db: next }
}

// ---- FP&A validate baseline ------------------------------------------------
export function validateBaseline(db, id, actorId) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  if (!i) return { db }
  i.baseline.validated_by = actorId
  i.baseline.validated_at = today()
  i.validations.unshift({ type: 'baseline', decision: 'approved', actor_id: actorId, decided_at: today(), note: 'Baseline validated.' })
  log(next, actorId, 'validate', id, 'Baseline approved by FP&A.')
  return { db: next }
}

// ---- FP&A validate a monthly actual (only validated value counts Realized) --
export function validateActual(db, id, period, actorId) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  const a = i?.actuals.find((x) => x.period === period)
  if (!a) return { db }
  a.validated = true
  i.validations.unshift({ type: 'monthly', decision: 'approved', actor_id: actorId, decided_at: today(), note: `Realized ${period.slice(0, 7)} validated.` })
  log(next, actorId, 'validate', id, `Monthly actual ${period.slice(0, 7)} validated.`)
  return { db: next }
}

// ---- owner records a monthly actual (unvalidated until FP&A signs off) ------
export function addActual(db, id, period, amount, actorId) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  if (!i) return { db }
  const ex = i.actuals.find((x) => x.period === period)
  if (ex) ex.realized_amount = Number(amount)
  else i.actuals.push({ period, realized_amount: Number(amount), validated: false })
  i.actuals.sort((a, b) => a.period.localeCompare(b.period))
  log(next, actorId, 'update', id, `Recorded actual ${period.slice(0, 7)} = ${amount} (pending validation).`)
  return { db: next }
}

// ---- raise a risk ----------------------------------------------------------
export function addRisk(db, id, risk, actorId) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  if (!i) return { db }
  const score = Number(risk.likelihood) * Number(risk.impact)
  i.risks.unshift({
    category: risk.category, likelihood: Number(risk.likelihood), impact: Number(risk.impact), score,
    countermeasure: risk.countermeasure || '', status: score >= 15 ? 'mitigating' : 'open',
  })
  // worst risk drives RAG
  const worst = Math.max(...i.risks.map((r) => r.score))
  i.status_rag = worst >= 15 ? 'red' : worst >= 8 ? 'amber' : 'green'
  log(next, actorId, 'risk', id, `Risk raised (score ${score}).`)
  return { db: next }
}

// ---- claim an advertised opportunity → spins up a pre-tagged initiative ----
export function claimOpportunity(db, oppId, actorId) {
  const next = clone(db)
  const o = next.opportunities.find((x) => x.id === oppId)
  if (!o || o.status !== 'open') return { db, error: 'unavailable' }
  const g = next.sourcing_groups.find((x) => x.id === o.group_id)
  const owner = next.people.find((p) => p.id === actorId) || next.people.find((p) => p.role === 'owner')
  const { db: d2, id } = createInitiative(next, {
    title: `${o.lever} — ${g?.name}`,
    description: `Claimed from advertised opportunity (${o.approach}). Target band ${o.est_low}–${o.est_high}.`,
    pillar: 'savings', benefit_type: 'reduction', approach: o.approach,
    group_id: o.group_id, owner_id: owner.id, department: owner.fn,
    gross_annual_value: Math.round((o.est_low + o.est_high) / 2), effort_score: o.ease_score ? 6 - o.ease_score : 3,
    opportunity_id: oppId,
  }, actorId)
  const opp = d2.opportunities.find((x) => x.id === oppId)
  opp.status = 'claimed'
  opp.claimed_by = owner.id
  opp.initiative_id = id
  log(d2, actorId, 'claim', oppId, `Opportunity claimed by ${owner.name} → initiative ${id}.`)
  return { db: d2, id }
}

// ---- admin: edit the illustrative savings-% config (re-sizes opportunities) -
export function setSavingsPct(db, groupId, { conservative, stretch }, actorId) {
  const next = clone(db)
  const cfg = next.savings_pct_config.find((c) => c.group_id === groupId)
  if (!cfg) return { db }
  if (conservative != null) cfg.conservative_pct = Number(conservative)
  if (stretch != null) cfg.stretch_pct = Number(stretch)
  const g = next.sourcing_groups.find((x) => x.id === groupId)
  for (const o of next.opportunities.filter((o) => o.group_id === groupId)) {
    o.est_low = Math.round(g.spend * cfg.conservative_pct)
    o.est_high = Math.round(g.spend * cfg.stretch_pct)
  }
  log(next, actorId, 'config', groupId, `Savings band set to ${(cfg.conservative_pct * 100).toFixed(1)}% / ${(cfg.stretch_pct * 100).toFixed(1)}%.`)
  return { db: next }
}

// ---- claim an AI-mined opportunity → a proposed initiative -----------------
export function claimMined(db, payload, actorId) {
  const { group_id, lever, estValue } = payload
  const cat = db.spend_categories.find((c) => c.group_id === group_id && c.addressable)
  const g = db.sourcing_groups.find((x) => x.id === group_id)
  return createInitiative(db, {
    title: `${lever} — ${g?.name}`,
    description: `AI-mined opportunity in ${g?.name} (rules-based spend signal). Estimated value ${estValue}.`,
    pillar: 'savings', benefit_type: 'reduction', approach: lever, group_id, spend_category_id: cat?.id,
    owner_id: actorId, department: db.people.find((p) => p.id === actorId)?.fn,
    gross_annual_value: Number(estValue) || 0, effort_score: 3,
  }, actorId)
}

// ---- open a value-leakage recovery on an initiative ------------------------
export function recoverLeakage(db, id, actorId) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  if (!i) return { db }
  i.recovery = { opened_by: actorId, opened_at: today() }
  i.validations.unshift({ type: 'recovery', decision: 'approved', actor_id: actorId, decided_at: today(), note: 'Value-leakage recovery opened.' })
  log(next, actorId, 'recovery', id, 'Leakage recovery opened.')
  return { db: next }
}

// Parse "@First" tokens in free text into mentioned person ids (first-name match).
function parseMentions(db, text) {
  return (text.match(/@([A-Za-z][A-Za-z.]*)/g) || [])
    .map((t) => db.people.find((p) => p.name.split(' ')[0].toLowerCase() === t.slice(1).toLowerCase())?.id)
    .filter(Boolean)
}

// ---- collaboration: post a comment on an initiative (with @mentions) -------
export function addComment(db, id, text, actorId) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  if (!i || !text?.trim()) return { db }
  i.comments = i.comments || []
  const mentions = parseMentions(next, text)
  i.comments.unshift({ id: uid('cm'), by: actorId, at: today(), text: text.trim(), mentions })
  log(next, actorId, 'comment', id, mentions.length ? `Comment added (mentioned ${mentions.length}).` : 'Comment added.')
  return { db: next }
}

// ---- collaboration: action tasks on an initiative -------------------------
export function addTask(db, id, text, assigneeId, actorId) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  if (!i || !text?.trim()) return { db }
  i.tasks = i.tasks || []
  i.tasks.push({ id: uid('tk'), text: text.trim(), assignee_id: assigneeId || null, status: 'open', created_by: actorId, at: today() })
  log(next, actorId, 'task', id, 'Task added.')
  return { db: next }
}

export function toggleTask(db, id, taskId, actorId) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  const t = (i?.tasks || []).find((x) => x.id === taskId)
  if (!t) return { db }
  t.status = t.status === 'done' ? 'open' : 'done'
  log(next, actorId, 'task', id, `Task ${t.status === 'done' ? 'completed' : 'reopened'}.`)
  return { db: next }
}

// ---- collaboration: attach a document reference ---------------------------
export function addAttachment(db, id, att, actorId) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  if (!i || !att?.name?.trim()) return { db }
  i.attachments = i.attachments || []
  i.attachments.unshift({ id: uid('at'), name: att.name.trim(), kind: att.kind || 'doc', url: att.url || null, by: actorId, at: today() })
  log(next, actorId, 'attachment', id, `Attached "${att.name.trim()}".`)
  return { db: next }
}

export const MUTATIONS = {
  createInitiative, requestGate, approveRequest, rejectRequest,
  validateBaseline, validateActual, addActual, addRisk, claimOpportunity, setSavingsPct,
  claimMined, recoverLeakage, addComment, addTask, toggleTask, addAttachment,
}
export { STAGES }
