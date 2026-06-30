// Pure write reducers: (db, payload) → new db. Used by the frontend for
// optimistic local writes (demo mode persists to localStorage) and mirrored by
// the Express server for the Postgres path, so both produce identical state.
// Every reducer appends to the append-only audit_log.
import { STAGES, STAGE_CONFIDENCE, gateCheck } from './engine.js'

// Drop any memoized engine cache before cloning (defensive — the engine now
// keys its index off a WeakMap, but never persist a vestigial _idx).
const clone = (o) => { const { _idx, ...rest } = o; return JSON.parse(JSON.stringify(rest)) }
// Steering authority (mirrors capsFor in App.jsx). Kept here so the gate is
// enforced in the reducer itself — the single source of truth for both the
// optimistic local path AND the server /api/action path.
const canSteer = (actor) => !!actor && (actor.role === 'admin' || actor.role === 'leader')
const now = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)
const uid = (p) => `${p}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`

function log(db, actor_id, action, entity, detail) {
  db.audit_log.unshift({ id: uid('al'), ts: now(), actor_id, action, entity, detail })
}

// ---- create an initiative (enters as Idea, 25%) ----------------------------
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
    stage: 'idea',
    confidence: STAGE_CONFIDENCE.idea,
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
  }
  next.initiatives.unshift(init)
  log(next, actorId, 'create', id, `Initiative "${init.title}" submitted as Idea.`)
  return { db: next, id }
}

// ---- advance a gate (validation-gated, $100K Steering threshold) -----------
export function advanceStage(db, id, actorId) {
  const next = clone(db)
  const i = next.initiatives.find((x) => x.id === id)
  if (!i) return { db, error: 'not found' }
  const g = gateCheck(i)
  if (!g.ok) return { db, error: g.reasons.join(' ') }
  // Materiality gate: entering Launch at ≥ $100K gross requires Steering
  // approval. Enforced HERE (not only in the UI) so a direct POST /api/action
  // can't bypass it.
  if (g.requiresSteering && !canSteer(next.people.find((p) => p.id === actorId))) {
    return { db, error: 'Steering approval (Function leader / EVRO Lead) is required to enter Launch for initiatives ≥ $100K.' }
  }
  i.stage = g.next
  i.confidence = STAGE_CONFIDENCE[g.next]
  i.validations.unshift({ type: 'gate', decision: 'approved', actor_id: actorId, decided_at: today(), note: `Advanced to ${g.next}${g.requiresSteering ? ' (Steering approved — ≥ $100K)' : ''}.` })
  log(next, actorId, 'advance', id, `Advanced to ${g.next}.`)
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

export const MUTATIONS = {
  createInitiative, advanceStage, validateBaseline, validateActual, addActual, addRisk, claimOpportunity, setSavingsPct,
}
export { STAGES }
