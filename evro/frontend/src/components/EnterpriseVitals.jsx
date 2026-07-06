import { useMemo } from 'react'
import { enterpriseEnergy, energyHistory, energyForecast, enterpriseWeather, valueVelocity } from '../lib/experience.js'
import { money } from '../lib/format.js'

// Enterprise Vitals (6B Wave 1) — the living strip: the Energy ring breathes,
// the Weather chip carries a recommendation, the velocity telemetry shows the
// enterprise moving in $/day. All deterministic; motion honors reduced-motion.

const perDay = (n) => `${money(Math.round(n))}/day`

function EnergyRing({ score, tone }) {
  const r = 22, c = 2 * Math.PI * r
  return (
    <span className="vit-ring fx-breathe" style={{ '--fx-accent': tone }}>
      <svg viewBox="0 0 52 52" width="52" height="52" role="img" aria-label={`Enterprise energy ${score} of 100`}>
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 26 26)" />
      </svg>
      <span className="vit-ring-n mono" style={{ color: tone }}>{score}</span>
    </span>
  )
}

export default function EnterpriseVitals({ db, compact = false }) {
  const e = useMemo(() => enterpriseEnergy(db), [db])
  const hist = useMemo(() => energyHistory(db), [db])
  const fc = useMemo(() => energyForecast(db), [db])
  const w = useMemo(() => enterpriseWeather(db), [db])
  const vel = useMemo(() => valueVelocity(db), [db])

  const min = Math.min(...hist.series, e.score) - 3, max = Math.max(...hist.series, e.score) + 3
  const X = (i) => (hist.series.length < 2 ? 46 : (i / (hist.series.length - 1)) * 88 + 2)
  const Y = (v) => 28 - ((v - min) / Math.max(1, max - min)) * 24 - 2

  return (
    <div className="vitals" style={{ '--fx-accent': w.accent }}>
      <div className="vit-energy" title={`${e.formula} — ${e.parts.map((p) => `${p.label}: ${p.note}`).join(' · ')}`}>
        <EnergyRing score={e.score} tone={e.state.tone} />
        <div className="vit-energy-t">
          <span className="vit-state" style={{ color: e.state.tone }}>{e.state.label}</span>
          <span className="vit-sub">Enterprise Energy · {e.state.blurb}</span>
        </div>
      </div>

      {!compact && hist.series.length > 1 && (
        <svg className="vit-spark" viewBox="0 0 92 30" preserveAspectRatio="none" aria-label="Energy by month (reconstructed)">
          <polyline points={hist.series.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke={e.state.tone} strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx={X(hist.series.length - 1)} cy={Y(hist.series[hist.series.length - 1])} r="2.4" fill={e.state.tone} />
        </svg>
      )}

      <span className="vit-div" aria-hidden="true" />

      <div className="vit-weather" tabIndex={0} aria-label={`Enterprise weather: ${w.label}`}>
        <span className="vit-w-icon fx-float" aria-hidden="true">{w.icon}</span>
        <div className="vit-energy-t">
          <span className="vit-state" style={{ color: w.accent }}>{w.label}</span>
          <span className="vit-sub">{w.urgency} · hover for the read</span>
        </div>
        <span className="kpop card pad" style={{ width: 280 }}>
          <b style={{ fontSize: 12.5 }}>{w.icon} {w.label}</b>
          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--grey)', margin: '4px 0' }}>{w.why}</span>
          <span style={{ display: 'block', fontSize: 12 }}>{w.recommendation}</span>
        </span>
      </div>

      <span className="vit-div" aria-hidden="true" />

      <div className="vit-vel">
        <span className="vit-v"><b className="mono" style={{ color: 'var(--green)' }}>{perDay(vel.createdPerDay)}</b><span>value created</span></span>
        <span className="vit-v"><b className="mono" style={{ color: vel.leakPerDay > 0 ? 'var(--amber)' : 'var(--ink)' }}>{perDay(vel.leakPerDay)}</b><span>leaking</span></span>
        <span className="vit-v"><b className="mono">{perDay(vel.netPerDay)}</b><span>net momentum</span></span>
        <span className="vit-v"><b className="mono" style={{ color: 'var(--navy)' }}>{perDay(vel.neededPerDay)}</b><span>needed to land plan</span></span>
        {!compact && <span className="vit-v"><b className="mono" style={{ color: fc.projected >= e.score ? 'var(--green)' : 'var(--amber)' }}>{fc.projected} · {fc.state.label}</b><span title={fc.note}>FY-end projection*</span></span>}
      </div>

      {w.alert && <div className="vit-alert fx-pulse">{w.alert}</div>}
    </div>
  )
}
