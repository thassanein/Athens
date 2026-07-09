// EVRO AI client (phase-1 spike) — talks to the optional server LLM endpoint.
// If the server has no key, aiStatus().enabled is false and callers fall back to
// the deterministic copilot. The context we send is the SAME numbers the UI
// shows, computed from the model — so the AI stays grounded and honest.
import { procurementModel, savingsUnderManagement, spendCoverage, savingsByType, decisionQueue, lifecycleMeta, savingsOpportunities } from './procurement.js'
import { impactByYear } from './procurement-window.js'

let _status = null // { enabled, model, remaining } — fetched once per session
export async function aiStatus() {
  if (_status) return _status
  try {
    const r = await fetch('/api/ai/status')
    _status = r.ok ? await r.json() : { enabled: false }
  } catch { _status = { enabled: false } }
  return _status
}

const r0 = (n) => Math.round(n || 0)

// A compact, complete snapshot of the book — the AI's only source of truth.
export function buildAIContext(db) {
  const m = procurementModel(db)
  const sum = savingsUnderManagement(db)
  const cov = spendCoverage(db)
  const focusYear = Number(String(db.meta.now).slice(0, 4))
  const years = impactByYear(db, 'rav').map((y) => ({ year: y.year, total: r0(y.value), costSavings: r0(y.hard), costAvoidance: r0(y.soft) }))
  const byType = savingsByType(db).filter((t) => t.count > 0).map((t) => ({ type: t.label, pnl: !!t.pnl, count: t.count, value: r0(t.value) }))
  const decisions = decisionQueue(db).slice(0, 15).map((o) => ({
    deal: o.name, owner: o.owner, phase: lifecycleMeta(o.stage).label,
    nextStep: o.nextDecision?.label, expectedValue: r0(o.nextDecision?.expectedValue),
    missing: o.nextDecision?.missing || [],
  }))
  const deals = savingsOpportunities(db).map((o) => ({
    deal: o.name, type: o.savingsTypeLabel, phase: lifecycleMeta(o.stage).label,
    owner: o.owner, supplier: o.supplier || o.category, annualValue: r0(o.value.headline),
    confidence: Math.round((o.confidence || 0) * 100) + '%', atRisk: o.ragStatus === 'red',
  }))

  return {
    asOf: db.meta.now, fiscalYear: db.meta.fiscalYear, focusYear,
    currency: 'USD',
    portfolio: {
      totalUnderManagement: r0(sum.total),
      confirmedThisYear: r0(sum.lenses.realized),
      committed: r0(sum.lenses.committed),
      sustained: r0(sum.lenses.sustained),
      identified: r0(sum.lenses.identified),
      atRiskValue: r0(sum.atRisk),
      confidencePct: Math.round((sum.confidence || 0) * 100),
      dealCount: sum.count,
      velocityPerMonth: r0(m.velocity?.perMonth),
    },
    spend: {
      thirdPartyTotal: r0(cov.totalSpend), addressable: r0(cov.addressable),
      addressablePct: Math.round((cov.addressablePct || 0) * 100),
      activelyAddressed: r0(cov.addressed),
      savingsAsPctOfAddressable: +(100 * (cov.savings / (cov.addressable || 1))).toFixed(2),
    },
    impactByYear: years,
    savingsByType: byType,
    decisionsWaiting: decisions,
    deals,
    note: 'costSavings = hard / P&L savings; costAvoidance = soft / non-P&L. Values are annual run-rate in USD. Only "confirmedThisYear" is delivered; the rest is plan.',
  }
}

// Ask the LLM. Resolves to { ok, answer } on success, or { ok:false, reason } so
// the caller can fall back to the deterministic copilot.
export async function askEvroAI(db, question) {
  const st = await aiStatus()
  if (!st.enabled) return { ok: false, reason: 'disabled' }
  try {
    const r = await fetch('/api/ai/ask', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context: buildAIContext(db) }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || j.error) return { ok: false, reason: j.error || `http_${r.status}` }
    if (!j.enabled) { _status = j; return { ok: false, reason: 'disabled' } }
    if (typeof j.remaining === 'number') _status = { ..._status, remaining: j.remaining }
    return { ok: true, answer: j.answer, model: j.model, usage: j.usage }
  } catch (e) {
    return { ok: false, reason: 'network' }
  }
}
