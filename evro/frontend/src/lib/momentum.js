// Enterprise Momentum Engine (6B item 2) — is value creation speeding up,
// slowing down, or stalled, at every altitude: enterprise, region, business
// unit, function, mission (initiative), and person. The signal is the one the
// data genuinely dates — validated monthly landings — compared across two
// two-month windows. Deterministic, view-only, no engine change.
import { frame, personName, realizedYTD, forecastRemainderFY, isActive, REALIZING_STAGES } from './engine.js'

export const MOMENTUM_SCOPES = [
  { key: 'enterprise', label: 'Enterprise' },
  { key: 'region', label: 'Regions' },
  { key: 'business_unit', label: 'Business units' },
  { key: 'department', label: 'Functions' },
  { key: 'mission', label: 'Missions' },
  { key: 'owner', label: 'People' },
]

export const MOMENTUM_STATES = {
  accelerating: { label: 'Accelerating', tone: 'var(--green)', arrow: '▲' },
  steady: { label: 'Steady', tone: 'var(--navy)', arrow: '▶' },
  decelerating: { label: 'Decelerating', tone: 'var(--amber)', arrow: '▼' },
  stagnant: { label: 'Stagnant', tone: 'var(--red)', arrow: '■' },
}

// Monthly validated landings for a set of initiatives, over the FY-to-date.
const monthlySeries = (inits, months, fy) => months.map((mk) =>
  inits.reduce((s, i) => s + (i.actuals || []).filter((a) => a.validated && (a.period || '').startsWith(fy) && (a.period || '').slice(0, 7) === mk)
    .reduce((x, a) => x + (a.realized_amount || 0), 0), 0))

const classify = (recent, prior) => {
  if (recent < 1000 && prior < 1000) return 'stagnant'
  if (prior < 1000) return 'accelerating'
  const d = (recent - prior) / prior
  return d > 0.1 ? 'accelerating' : d < -0.1 ? 'decelerating' : 'steady'
}

export function momentum(db, scope = 'enterprise') {
  const fy = String(db.meta.fiscalYear)
  const { fyMonths, nowMonth } = frame(db)
  const months = fyMonths.map((m) => m.slice(0, 7)).filter((mk) => mk <= nowMonth)
  const active = db.initiatives.filter(isActive)

  // group initiatives by the scope key
  let groups
  if (scope === 'enterprise') groups = { Enterprise: active }
  else if (scope === 'mission') groups = Object.fromEntries(active.filter((i) => REALIZING_STAGES.includes(i.stage)).map((i) => [i.title, [i]]))
  else if (scope === 'owner') { groups = {}; for (const i of active) (groups[personName(db, i.owner_id)] ||= []).push(i) }
  else { groups = {}; for (const i of active) { const k = i[scope] || '—'; if (scope === 'region' && k === 'Enterprise') continue; (groups[k] ||= []).push(i) } }

  const rows = Object.entries(groups).map(([label, list]) => {
    const series = monthlySeries(list, months, fy)
    const n = series.length
    const recent = (series[n - 1] + (series[n - 2] || 0)) / 2
    const prior = ((series[n - 3] || 0) + (series[n - 4] || 0)) / 2
    const state = classify(recent, prior)
    const delta = prior > 1000 ? (recent - prior) / prior : recent >= 1000 ? 1 : 0
    return {
      label, series, recent, prior, delta, state,
      weight: list.reduce((a, i) => a + realizedYTD(i, db) + forecastRemainderFY(i, db), 0),
      count: list.length,
    }
  }).sort((a, b) => b.weight - a.weight)

  const counts = { accelerating: 0, steady: 0, decelerating: 0, stagnant: 0 }
  for (const r of rows) counts[r.state]++
  return { rows, counts, months, window: 'last 2 months vs the 2 before — validated landings only' }
}
