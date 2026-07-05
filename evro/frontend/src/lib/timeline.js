// Enterprise Timeline — view-only longitudinal model across the fiscal year.
// Cumulative realized (past) and forecast (future) value, per-month events
// (realized landings + decisions from the audit log), and the current
// risk/opportunity/sustainment state. Composes engine outputs; deterministic.
import { forecastCurve, frame, personName, controlTower, enterpriseRollup, sustainmentBook } from './engine.js'

export function buildTimeline(db) {
  const curve = forecastCurve(db)
  const { nowMonth } = frame(db)
  let cumR = 0
  const months = curve.map((m, idx) => {
    cumR += m.actual || 0
    return { key: m.month, idx, past: m.month <= nowMonth, actualMonth: m.actual || 0, expectedMonth: m.expected || 0, cumR }
  })
  const nowIdx = Math.max(0, months.filter((m) => m.past).length - 1)
  const realizedToNow = months[nowIdx]?.cumR || 0

  let fcum = realizedToNow
  for (const m of months) {
    if (m.idx <= nowIdx) m.cumValue = m.cumR
    else { fcum += m.expectedMonth; m.cumValue = fcum }

    // events landing in this month
    const realized = []
    for (const i of db.initiatives) for (const a of i.actuals || []) {
      if (a.validated && (a.period || '').slice(0, 7) === m.key && a.realized_amount > 0)
        realized.push({ kind: 'realized', label: i.title, value: a.realized_amount, id: i.id })
    }
    realized.sort((x, y) => y.value - x.value)
    const decisions = (db.audit_log || [])
      .filter((e) => (e.ts || '').slice(0, 7) === m.key)
      .map((e) => ({ kind: 'decision', label: `${personName(db, e.actor_id)} · ${e.action}`, detail: e.detail }))
    // Memory layer (5B.5): journaled decisions — richer than audit rows, each
    // carrying its rationale so the timeline reads as a story of judgement.
    const journal = (db.decision_journal || [])
      .filter((e) => (e.at || '').slice(0, 7) === m.key)
      .map((e) => ({ kind: 'journal', label: `${e.decision} — ${e.title}`, detail: `Why: ${e.rationale}` }))
    // Governance layer (5B.6): dated sign-offs from the validation trail —
    // intake/gate decisions plus FP&A baseline/logic/productivity approvals —
    // so the timeline shows WHEN the org decided. (Monthly validations are
    // excluded: they'd duplicate the 'realized' landings above.)
    const APPROVAL_TYPES = { intake: 'intake', gate: 'gate', baseline: 'baseline validated', logic: 'savings logic signed off', productivity: 'benefit confirmed' }
    const approvals = []
    for (const i of db.initiatives) for (const v of i.validations || []) {
      if (APPROVAL_TYPES[v.type] && (v.decided_at || '').slice(0, 7) === m.key)
        approvals.push({ kind: 'approval', label: `${v.decision === 'approved' ? 'Approved' : 'Returned'}: ${APPROVAL_TYPES[v.type]} — ${i.title}`, detail: v.note, id: i.id })
    }
    m.realizedMonth = realized.reduce((s, e) => s + e.value, 0)
    m.events = [...realized.slice(0, 5), ...approvals.slice(0, 3), ...journal.slice(0, 3), ...decisions.slice(0, 3)]
    m.eventCount = realized.length + approvals.length + journal.length + decisions.length
    m.kindCounts = { realized: realized.length, approval: approvals.length, journal: journal.length, decision: decisions.length }
  }

  const roll = enterpriseRollup(db)
  const ct = controlTower(db)
  const sustain = sustainmentBook(db)
  return {
    months, nowIdx,
    realizedTotal: realizedToNow,
    forecastTotal: months[months.length - 1]?.cumValue || realizedToNow,
    maxVal: Math.max(1, ...months.map((m) => m.cumValue)),
    state: {
      atRisk: ct.valueAtRisk, leakage: ct.leakage, opportunity: roll.identifiedOpportunity,
      eroding: sustain.eroding.length, sustainAvg: sustain.avg,
      decisions: (db.audit_log || []).length,
    },
  }
}
