import { useState } from 'react'
import { scenarioTotals, monteCarlo, sensitivity, isActive, confidence } from '../lib/engine.js'
import { money } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { HBars } from '../components/Charts.jsx'

// Forecast simulator — flex four levers (acceleration, execution, slip, new
// wins) and watch the landing value move through a live value bridge. All math
// is deterministic and uses the existing scenario primitives (no new engine).
const LEVERS = [
  { key: 'accel', label: 'Pipeline acceleration', min: 0, max: 100, step: 5, suffix: '%', help: 'Pull each active initiative’s stage confidence toward 100%.' },
  { key: 'exec', label: 'Execution (realization)', min: -20, max: 20, step: 2, suffix: '%', help: 'Raise or cut the realization factor — better or worse delivery.' },
  { key: 'slip', label: 'Timing slip', min: 0, max: 40, step: 5, suffix: '%', help: 'Share of forecast value that slips beyond this fiscal year.' },
  { key: 'wins', label: 'New sourcing wins', min: 0, max: 2_000_000, step: 100_000, suffix: '$', help: 'Inject newly captured opportunity value into the pipeline.' },
]
const ZERO = { accel: 0, exec: 0, slip: 0, wins: 0 }

export default function Scenarios({ db }) {
  const [lv, setLv] = useState(ZERO)
  const sc = scenarioTotals(db)
  const mc = monteCarlo(db)
  const sens = sensitivity(db)
  const active = db.initiatives.filter(isActive)
  const committed = sc.committed

  // Deterministic recompute of FY landing under a lever set.
  const R = ({ accel, exec, slip, wins }) => {
    const sumAdj = active.reduce((a, i) => {
      const c0 = confidence(i.stage)
      const conf = c0 + (1 - c0) * (accel / 100)
      const rf = Math.min(1.2, Math.max(0, (i.realization_factor ?? 1) * (1 + exec / 100)))
      return a + i.gross_annual_value * conf * rf
    }, 0)
    const forecastPart = Math.max(0, sumAdj - committed)
    return committed + forecastPart * (1 - slip / 100) + wins
  }

  // Telescoping marginal contributions → an exact value bridge.
  const base = R(ZERO)
  const s1 = R({ ...ZERO, accel: lv.accel })
  const s2 = R({ ...ZERO, accel: lv.accel, exec: lv.exec })
  const s3 = R({ ...ZERO, accel: lv.accel, exec: lv.exec, slip: lv.slip })
  const landing = R(lv)
  const bridge = [
    { label: 'Baseline expected', value: base, kind: 'base' },
    { label: 'Acceleration', delta: s1 - base },
    { label: 'Execution', delta: s2 - s1 },
    { label: 'Timing slip', delta: s3 - s2 },
    { label: 'New wins', delta: landing - s3 },
    { label: 'Simulated landing', value: landing, kind: 'total' },
  ]

  const lo = mc.p10, hi = mc.p90, span = hi - lo || 1
  const pos = (v) => `${Math.max(0, Math.min(100, ((v - lo) / span) * 100))}%`
  const dirty = lv.accel || lv.exec || lv.slip || lv.wins

  return (
    <>
      <p className="page-intro">Forecast simulator — flex the levers below and watch the fiscal-year landing move through a live value bridge. Headline is Expected (risk-adjusted); the Monte-Carlo band is a deterministic analytic approximation.</p>

      <div className="tiles">
        <Tile tone="amber" label="Committed" value={money(sc.committed)} sub="realizing + validated" />
        <Tile tone="navy" label="Expected (headline)" value={money(sc.expected)} sub="risk-adjusted, all stages" />
        <Tile tone="green" label="Simulated landing" value={money(landing)} sub={`${landing - base >= 0 ? '+' : ''}${money(landing - base)} vs baseline`} />
        <Tile tone="red" label="Range (P10–P90)" value={money(mc.p90 - mc.p10)} sub={`${money(mc.p10)} – ${money(mc.p90)}`} />
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>What-if levers</h3><span className="spacer" />{dirty ? <button className="btn sm" onClick={() => setLv(ZERO)}>Reset</button> : <span className="tiny muted">at plan of record</span>}</div>
        <div className="sim-levers">
          {LEVERS.map((L) => (
            <div key={L.key} className="sim-lever">
              <div className="card-h" style={{ marginBottom: 4 }}>
                <span className="label" style={{ marginBottom: 0 }}>{L.label}</span><span className="spacer" />
                <b className="mono">{L.suffix === '$' ? money(lv[L.key]) : `${lv[L.key] > 0 && L.key === 'exec' ? '+' : ''}${lv[L.key]}${L.suffix}`}</b>
              </div>
              <input type="range" min={L.min} max={L.max} step={L.step} value={lv[L.key]} onChange={(e) => setLv((p) => ({ ...p, [L.key]: Number(e.target.value) }))} style={{ width: '100%' }} />
              <div className="tiny muted">{L.help}</div>
            </div>
          ))}
        </div>
      </div>

      {/* value bridge */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Value bridge</h3><span className="spacer" /><span className="tiny muted">baseline → levers → simulated landing</span></div>
        <Bridge steps={bridge} />
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Monte-Carlo range (FY)</h3></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }} className="tiny muted"><span>P10 {money(mc.p10)}</span><span>P50 {money(mc.p50)}</span><span>P90 {money(mc.p90)}</span></div>
          <div style={{ position: 'relative', height: 22, marginTop: 8, background: 'var(--line)', borderRadius: 11 }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: 'linear-gradient(90deg, var(--tint-amber), var(--tint-green))', borderRadius: 11 }} />
            <div style={{ position: 'absolute', left: pos(mc.p50), top: -3, bottom: -3, width: 3, background: 'var(--dark)', borderRadius: 2 }} title={`P50 ${money(mc.p50)}`} />
            {dirty && landing >= lo && landing <= hi && <div style={{ position: 'absolute', left: pos(landing), top: -6, bottom: -6, width: 3, background: 'var(--green)', borderRadius: 2 }} title={`Simulated ${money(landing)}`} />}
          </div>
          <p className="tiny muted section-gap">80% confidence interval around the expected landing.{dirty && landing >= lo && landing <= hi ? ' Green marker is your simulated landing.' : ''} Width reflects how much value sits in early, uncertain stages.</p>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Sensitivity — what moves the forecast</h3></div>
          <HBars data={sens.map((s) => ({ label: s.title.length > 26 ? s.title.slice(0, 25) + '…' : s.title, value: s.swing, color: 'var(--navy)' }))} />
          <p className="tiny muted section-gap">Each bar is the value swing if that initiative fully de-risks (gross − risk-adjusted). The biggest swings are where to focus.</p>
        </div>
      </div>
    </>
  )
}

// Horizontal value bridge (waterfall). Base + landing are anchored bars;
// the middle steps are floating deltas, green up / red down.
function Bridge({ steps }) {
  const max = Math.max(...steps.map((s) => (s.kind ? s.value : 0)), 1)
  let running = 0
  return (
    <div className="bridge">
      {steps.map((s, k) => {
        if (s.kind) {
          running = s.value
          const w = (s.value / max) * 100
          return (
            <div key={k} className="bridge-row">
              <span className="bridge-lbl"><b>{s.label}</b></span>
              <div className="bridge-track"><i style={{ left: 0, width: `${w}%`, background: s.kind === 'total' ? 'var(--green)' : 'var(--navy)' }} /></div>
              <span className="bridge-val mono"><b>{money(s.value)}</b></span>
            </div>
          )
        }
        const start = running
        running += s.delta
        const up = s.delta >= 0
        const left = (Math.min(start, running) / max) * 100
        const w = (Math.abs(s.delta) / max) * 100
        return (
          <div key={k} className="bridge-row">
            <span className="bridge-lbl muted">{s.label}</span>
            <div className="bridge-track"><i style={{ left: `${left}%`, width: `${Math.max(w, 0.4)}%`, background: up ? 'var(--green)' : 'var(--red)' }} /></div>
            <span className="bridge-val mono" style={{ color: up ? 'var(--green)' : 'var(--red)' }}>{s.delta === 0 ? '—' : `${up ? '+' : ''}${money(s.delta)}`}</span>
          </div>
        )
      })}
    </div>
  )
}
