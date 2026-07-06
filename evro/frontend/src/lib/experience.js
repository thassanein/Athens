// EVRO Experience Engine core (Phase 6B Wave 1) — the deterministic layer that
// makes the enterprise feel ALIVE without ever inventing a number:
//   · Enterprise Energy (0–100, five states, history + FY-end projection)
//   · Value Velocity  ($/day created, leaking, net — real-time telemetry)
//   · Enterprise Weather (conditions → recommendation + a UI accent token)
// Every score is a labelled composition of existing engine outputs. View-only:
// no engine, mutation, or schema change. This module IS the "Energy/Momentum
// API" — every dashboard imports it rather than re-deriving.
import { enterpriseRollup, controlTower, isActive, frame } from './engine.js'
import { enterpriseHealth, healthTrend } from './intel.js'
import { enterprisePulse } from './pulse.js'
import { leakageBreakdown } from './engine.js'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// ---------------------------------------------------------------------------
// 1) Enterprise Energy — one number for "how alive is the enterprise", blended
// from health (structure), pulse (flow) and delivery velocity (pace).
// ---------------------------------------------------------------------------
export const ENERGY_STATES = [
  { min: 80, key: 'high', label: 'High Performance', tone: 'var(--green)', blurb: 'Compounding — protect the operating rhythm.' },
  { min: 65, key: 'accelerating', label: 'Accelerating', tone: '#3FC97F', blurb: 'Momentum is building — feed the funnel.' },
  { min: 50, key: 'stable', label: 'Stable', tone: 'var(--navy)', blurb: 'Steady state — look for the next unlock.' },
  { min: 35, key: 'recovering', label: 'Recovering', tone: 'var(--amber)', blurb: 'Climbing back — clear the blockers first.' },
  { min: 0, key: 'critical', label: 'Critical', tone: 'var(--red)', blurb: 'Value engine at risk — escalate now.' },
]
export const energyState = (score) => ENERGY_STATES.find((s) => score >= s.min)

export function enterpriseEnergy(db) {
  const health = enterpriseHealth(db)
  const pulse = enterprisePulse(db)
  const vel = valueVelocity(db)
  // pace: are we landing value at the rate the rest-of-year plan needs?
  const pace = clamp(vel.neededPerDay > 0 ? vel.createdPerDay / vel.neededPerDay : 1, 0, 1.25)
  const parts = [
    { key: 'health', label: 'Enterprise health', weight: 0.45, value: health.score / 100, note: `${health.score} · ${health.grade}` },
    { key: 'pulse', label: 'Value pulse', weight: 0.3, value: pulse.index / 100, note: `pulse ${pulse.index}` },
    { key: 'pace', label: 'Delivery pace vs plan', weight: 0.25, value: clamp(pace, 0, 1), note: `${Math.round(pace * 100)}% of needed run-rate` },
  ]
  const score = Math.round(parts.reduce((a, p) => a + p.value * p.weight, 0) * 100)
  const st = energyState(score)
  return { score, state: st, parts, health, pulse, formula: '45% health + 30% pulse + 25% delivery pace' }
}

// History — reconstructed the same honest way healthTrend is: only the
// financial/realization inputs are historized; the UI carries that note.
export function energyHistory(db) {
  const ht = healthTrend(db)
  const e = enterpriseEnergy(db)
  const nonHealth = e.score - Math.round(e.parts[0].value * e.parts[0].weight * 100)
  const series = ht.series.map((h) => clamp(Math.round(h * e.parts[0].weight + nonHealth), 0, 100))
  return { months: ht.months, series, states: series.map((s) => energyState(s).key), note: ht.note.replace('health score', 'energy') }
}

// FY-end projection — if the risk-adjusted forecast lands as planned. Only the
// inputs that mechanically move with realization are projected (the financial
// health dimension's realization term steps to 100%, delivery pace to on-plan);
// everything else is held at today. A labelled projection, not a promise.
export function energyForecast(db) {
  const e = enterpriseEnergy(db)
  const roll = enterpriseRollup(db)
  const fullFY = roll.realizedYTD + roll.forecastRemainderFY
  const rNow = fullFY > 0 ? roll.realizedYTD / fullFY : 1
  const fin = e.health.dims.find((d) => d.key === 'financial')
  // financial dim = 0.6·realization + 0.4·leakage-control → at full landing the
  // realization term becomes 0.6; the health index moves by the weighted delta.
  const projHealth = clamp(e.health.score + 0.6 * (1 - rNow) * fin.weight * 100, 0, 100)
  const projected = clamp(Math.round(projHealth * 0.45 + e.pulse.index * 0.3 + 25), 0, 100)
  return { projected, state: energyState(projected), note: 'projection assumes the risk-adjusted forecast lands as planned — other inputs held at today' }
}

// ---------------------------------------------------------------------------
// 2) Value Velocity — enterprise value telemetry in $/day.
// ---------------------------------------------------------------------------
export function valueVelocity(db) {
  const roll = enterpriseRollup(db)
  const leak = leakageBreakdown(db)
  const { fyMonths, nowMonth } = frame(db)
  const now = new Date(db.meta?.now || '2026-06-30')
  const fyStart = new Date(fyMonths[0])
  const fyEnd = new Date(new Date(fyMonths[fyMonths.length - 1]).getFullYear(), new Date(fyMonths[fyMonths.length - 1]).getMonth() + 1, 0)
  const daysElapsed = Math.max(1, Math.round((now - fyStart) / 86400000))
  const daysLeft = Math.max(1, Math.round((fyEnd - now) / 86400000))

  const createdPerDay = roll.realizedYTD / daysElapsed
  const leakPerDay = leak.total / daysElapsed
  const netPerDay = createdPerDay - leakPerDay
  const neededPerDay = roll.forecastRemainderFY / daysLeft

  // recent acceleration: last full month's landings vs the prior month
  const months = fyMonths.map((m) => m.slice(0, 7)).filter((mk) => mk <= nowMonth)
  const perMonth = (mk) => db.initiatives.reduce((s, i) => s + (i.actuals || []).filter((a) => a.validated && (a.period || '').slice(0, 7) === mk).reduce((x, a) => x + a.realized_amount, 0), 0)
  const cur = perMonth(months[months.length - 1] || '')
  const prev = perMonth(months[months.length - 2] || '')
  const accel = prev > 0 ? (cur - prev) / prev : cur > 0 ? 1 : 0

  return { createdPerDay, leakPerDay, netPerDay, neededPerDay, daysElapsed, daysLeft, accel, lastMonth: cur, prevMonth: prev }
}

// ---------------------------------------------------------------------------
// 3) Enterprise Weather — a glanceable condition with a concrete
// recommendation and a UI accent. Deterministic mapping, worst-signal-first.
// ---------------------------------------------------------------------------
export const WEATHER = {
  storm: { label: 'Storm', icon: '⛈', accent: '#E5484D', urgency: 'act now' },
  overcast: { label: 'Overcast', icon: '☁', accent: '#F5A524', urgency: 'this week' },
  clearing: { label: 'Clearing', icon: '🌤', accent: '#4F8DF2', urgency: 'keep going' },
  fair: { label: 'Fair', icon: '⛅', accent: '#4F8DF2', urgency: 'steady' },
  clear: { label: 'Clear skies', icon: '☀', accent: '#3FC97F', urgency: 'compound it' },
}

export function enterpriseWeather(db) {
  const e = enterpriseEnergy(db)
  const ct = controlTower(db)
  const vel = valueVelocity(db)
  const active = db.initiatives.filter(isActive)
  const redShare = active.length ? active.filter((i) => i.status_rag === 'red').length / active.length : 0
  const varShare = ct.valueAtRisk / Math.max(1, ct.raPipeline + ct.valueAtRisk)

  let key, why, rec
  if (e.score < 35 || varShare > 0.5) {
    key = 'storm'; why = `energy ${e.score} · ${Math.round(varShare * 100)}% of pipeline value at risk`
    rec = 'Convene the risk owners today — the exposed value outweighs the healthy book.'
  } else if (redShare > 0.25 || varShare > 0.32) {
    key = 'overcast'; why = `${Math.round(redShare * 100)}% of the book is red · ${Math.round(varShare * 100)}% of value exposed`
    rec = 'Work the at-risk list before it becomes leakage — escalations are cheaper than recoveries.'
  } else if (e.state.key === 'recovering' || (vel.accel > 0.15 && e.score < 65)) {
    key = 'clearing'; why = `energy ${e.score} and last month's landings ${vel.accel >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(vel.accel * 100))}%`
    rec = 'Momentum is returning — protect the two biggest realizing engines and let it build.'
  } else if (e.score >= 80 && redShare < 0.1) {
    key = 'clear'; why = `energy ${e.score} with ${Math.round(redShare * 100)}% red`
    rec = 'Conditions are ideal — this is the window to pull opportunity forward.'
  } else {
    key = 'fair'; why = `energy ${e.score} · ${Math.round(varShare * 100)}% exposure — normal operating conditions`
    rec = 'Hold the rhythm: validate the month, clear the approval queue, feed the funnel.'
  }
  return { key, ...WEATHER[key], why, recommendation: rec, energy: e.score, alert: key === 'storm' ? 'Executive alert: exposed value exceeds healthy pipeline — intervention required.' : null }
}
