import { useState } from 'react'
import { scenarioTotals, monteCarlo, sensitivity, isActive, rav, confidence } from '../lib/engine.js'
import { money } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { HBars } from '../components/Charts.jsx'

// Forecast playground — three scenarios, a Monte-Carlo confidence band, a
// sensitivity tornado, and a "pipeline acceleration" what-if slider.
export default function Scenarios({ db, openDrawer }) {
  const [accel, setAccel] = useState(0) // % of remaining confidence pulled forward
  const sc = scenarioTotals(db)
  const mc = monteCarlo(db)
  const sens = sensitivity(db)

  const base = sc.expected
  const whatIf = db.initiatives.filter(isActive).reduce((a, i) => {
    const c = confidence(i.stage) + (1 - confidence(i.stage)) * (accel / 100)
    return a + i.gross_annual_value * c * (i.realization_factor ?? 1)
  }, 0)

  // Monte Carlo band rendered as a simple p10–p90 bar with p50 marker
  const lo = mc.p10, hi = mc.p90, span = hi - lo || 1
  const pos = (v) => `${((v - lo) / span) * 100}%`

  return (
    <>
      <p className="page-intro">Forecast playground — flex the pipeline and see the landing value move. Headline scenario is Expected (risk-adjusted). Monte-Carlo band is a deterministic analytic approximation.</p>

      <div className="tiles">
        <Tile tone="amber" label="Committed" value={money(sc.committed)} sub="realizing + validated" />
        <Tile tone="navy" label="Expected (headline)" value={money(sc.expected)} sub="risk-adjusted, all stages" />
        <Tile tone="red" label="Upside" value={money(sc.upside)} sub="gross of Capability + realizing" />
        <Tile tone="green" label="What-if landing" value={money(whatIf)} sub={`+${money(whatIf - base)} vs expected`} />
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>Pipeline acceleration what-if</h3><span className="spacer" /><b className="mono">{accel}% pulled forward</b></div>
        <input type="range" min={0} max={100} step={5} value={accel} onChange={(e) => setAccel(Number(e.target.value))} style={{ width: '100%' }} />
        <p className="tiny muted">Interpolates each active initiative's stage confidence toward 100% by {accel}% — simulating faster gate progression. Expected value moves from {money(base)} to {money(whatIf)}.</p>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Monte-Carlo range (FY)</h3></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }} className="tiny muted"><span>P10 {money(mc.p10)}</span><span>P50 {money(mc.p50)}</span><span>P90 {money(mc.p90)}</span></div>
          <div style={{ position: 'relative', height: 22, marginTop: 8, background: 'var(--line)', borderRadius: 11 }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: 'linear-gradient(90deg, var(--tint-amber), var(--tint-green))', borderRadius: 11 }} />
            <div style={{ position: 'absolute', left: pos(mc.p50), top: -3, bottom: -3, width: 3, background: 'var(--dark)', borderRadius: 2 }} title={`P50 ${money(mc.p50)}`} />
          </div>
          <p className="tiny muted section-gap">80% confidence interval around the expected landing. Width reflects how much value sits in early, uncertain stages.</p>
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
