import { useMemo } from 'react'
import { enterpriseEnergy, energyHistory, energyForecast, execWeather, valueVelocity } from '../lib/experience.js'
import { enterprisePulse } from '../lib/pulse.js'
import { missionHealth } from '../lib/mission.js'
import { momentum } from '../lib/momentum.js'
import { seasonFramework } from '../lib/seasons.js'
import { SymEnergy, SymValue, SymWeather } from './Symbols.jsx'
import { money } from '../lib/format.js'

// Enterprise Vitals (6B Wave 1; converged 6C.1B W3; 6D W2 completes the
// brief's persistent status layer) — the living strip: the Energy ring
// breathes as the enterprise "battery"; Weather now reads the executive
// state (Stable/Opportunity/Watch/Volatile/Critical); velocity telemetry
// moves in $/day; and Pulse + AI Confidence round out the six status
// metrics workstream C names. Every value is deterministic; every metric
// has a hover/tap explanation. On mobile the strip distills (`.vit-deep`
// hides); motion honors reduced-motion.

const perDay = (n) => `${money(Math.round(n))}/day`
const TIER_COLOR = { good: 'var(--green)', calm: 'var(--navy)', watch: 'var(--brand-momentum)', warn: 'var(--amber)', crit: 'var(--red)' }

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
  const w = useMemo(() => execWeather(db), [db])
  const vel = useMemo(() => valueVelocity(db), [db])
  const mom = useMemo(() => momentum(db, 'business_unit'), [db])
  const season = useMemo(() => seasonFramework(db).current, [db])
  const pulse = useMemo(() => enterprisePulse(db), [db])
  const mh = useMemo(() => missionHealth(db), [db])
  const aiConf = Math.round(mh.aiConfidence * 100)
  const aiSignals = (db.ai_recommendations || []).length
  const wTone = TIER_COLOR[w.tier] || w.accent

  const min = Math.min(...hist.series, e.score) - 3, max = Math.max(...hist.series, e.score) + 3
  const X = (i) => (hist.series.length < 2 ? 46 : (i / (hist.series.length - 1)) * 88 + 2)
  const Y = (v) => 28 - ((v - min) / Math.max(1, max - min)) * 24 - 2

  return (
    <div className="vitals" style={{ '--fx-accent': w.accent }}>
      <div className="vit-energy" title={`${e.formula} — ${e.parts.map((p) => `${p.label}: ${p.note}`).join(' · ')}`}>
        <EnergyRing score={e.score} tone={e.state.tone} />
        <div className="vit-energy-t">
          <span className="vit-state" style={{ color: e.state.tone }}><span className="sym" style={{ color: 'var(--brand-energy)', marginRight: 4 }}><SymEnergy size={14} /></span>{e.state.label}</span>
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

      <div className="vit-weather" tabIndex={0} aria-label={`Enterprise state: ${w.execState} (${w.label})`}>
        <span className="vit-w-icon fx-float" aria-hidden="true">{w.icon}</span>
        <div className="vit-energy-t">
          <span className="vit-state" style={{ color: wTone }}>{w.execState}</span>
          <span className="vit-sub">{w.label} · {w.urgency} · hover</span>
        </div>
        <span className="kpop card pad" style={{ width: 292 }}>
          <b style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, color: wTone }}><span className="sym"><SymWeather size={14} /></span>{w.execState} · {w.label}</b>
          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--grey)', margin: '4px 0' }}>{w.gloss} {w.why}.</span>
          <span style={{ display: 'block', fontSize: 12 }}>{w.recommendation}</span>
        </span>
      </div>

      <span className="vit-div" aria-hidden="true" />

      <div className="vit-vel">
        <span className="sym" style={{ color: 'var(--brand-value)', alignSelf: 'center' }} title="Value velocity"><SymValue size={15} /></span>
        <span className="vit-v"><b className="mono" style={{ color: 'var(--green)' }}>{perDay(vel.createdPerDay)}</b><span>value created</span></span>
        <span className="vit-v vit-deep"><b className="mono" style={{ color: vel.leakPerDay > 0 ? 'var(--amber)' : 'var(--ink)' }}>{perDay(vel.leakPerDay)}</b><span>leaking</span></span>
        <span className="vit-v"><b className="mono">{perDay(vel.netPerDay)}</b><span>net momentum</span></span>
        <span className="vit-v vit-deep"><b className="mono" style={{ color: 'var(--navy)' }}>{perDay(vel.neededPerDay)}</b><span>needed to land plan</span></span>
        {!compact && <span className="vit-v vit-deep"><b className="mono" style={{ color: fc.projected >= e.score ? 'var(--green)' : 'var(--amber)' }}>{fc.projected} · {fc.state.label}</b><span title={fc.note}>FY-end projection*</span></span>}
      </div>

      <span className="vit-div" aria-hidden="true" />

      <div className="vit-vel" role="group" aria-label="Pulse and AI confidence">
        <span className="vit-v" title={`Enterprise Pulse — six-axis value radar · ${pulse.band}`}><b className="mono" style={{ color: 'var(--brand-intelligence)' }}>{pulse.index}</b><span>pulse index</span></span>
        <span className="vit-v" title={`Mean confidence across ${aiSignals} deterministic agent signal${aiSignals === 1 ? '' : 's'}`}><b className="mono" style={{ color: 'var(--brand-ai)' }}>{aiConf}%</b><span>AI confidence</span></span>
      </div>

      <span className="vit-div" aria-hidden="true" />

      <div className="vit-chips" title={`Momentum by business unit — ${mom.window}`}>
        <span className="vit-chip" style={{ color: 'var(--green)' }}>▲ {mom.counts.accelerating} accelerating</span>
        <span className="vit-chip" style={{ color: 'var(--amber)' }}>▼ {mom.counts.decelerating} decelerating</span>
        {season && <span className="vit-chip" style={{ color: 'var(--navy)' }}>{season.name} in season · {season.score}</span>}
      </div>

      {w.alert && <div className="vit-alert fx-pulse">{w.alert}</div>}
    </div>
  )
}
