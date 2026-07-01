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
    m.realizedMonth = realized.reduce((s, e) => s + e.value, 0)
    m.events = [...realized.slice(0, 5), ...decisions.slice(0, 3)]
    m.eventCount = realized.length + decisions.length
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
