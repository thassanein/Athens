import { useState } from 'react'
import { optimize } from '../lib/engine.js'
import { money, pct } from '../lib/format.js'
import { Tile, Bar } from '../components/ui.jsx'

// Capital allocation: pick the set of pre-Launch investments that maximizes
// risk-adjusted value within a capital budget. Drag the budget to re-optimize.
export default function Optimize({ db, openDrawer }) {
  const [budget, setBudget] = useState(db.meta.capitalBudget || 6_000_000)
  const [mode, setMode] = useState('roi')
  const o = optimize(db, budget, mode)
  const utilization = o.candidateCost ? o.spend / o.candidateCost : 0

  return (
    <>
      <p className="page-intro">Portfolio optimization — the highest-return set of pre-Launch investments within a capital budget (greedy knapsack). Move the slider to re-optimize live.</p>

      <div className="card pad">
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <div className="card-h" style={{ marginBottom: 6 }}><span className="label" style={{ marginBottom: 0 }}>Capital budget</span><span className="spacer" /><b className="mono">{money(budget)}</b></div>
            <input type="range" min={500000} max={Math.max(8_000_000, o.candidateCost)} step={250000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: '100%' }} />
            <div className="tiny muted">Total capital requested by candidates: {money(o.candidateCost)}</div>
          </div>
          <div className="seg">
            <button className={mode === 'roi' ? 'active' : ''} onClick={() => setMode('roi')}>Best ROI</button>
            <button className={mode === 'value' ? 'active' : ''} onClick={() => setMode('value')}>Biggest Return</button>
          </div>
        </div>
      </div>

      <div className="tiles section-gap">
        <Tile tone="dark" label="Capital deployed" value={money(o.spend)} sub={`${pct(utilization)} of requested`} />
        <Tile tone="green" label="Risk-adjusted value funded" value={money(o.value)} sub={`of ${money(o.candidateValue)} possible`} />
        <Tile tone="navy" label="Initiatives funded" value={o.count} sub={`${o.deferred.length} deferred`} />
        <Tile tone="red" label="Capital efficiency" value={o.spend ? money(o.value / (o.spend / 1_000_000)) : '—'} sub="RAV per $1M deployed" />
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Funded</h3><span className="spacer" /><span className="badge b-green">{o.selected.length}</span></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Initiative</th><th className="num">RAV</th><th className="num">Capital</th><th className="num">RAV/$</th></tr></thead>
              <tbody>
                {o.selected.map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => openDrawer(s.id)}>
                    <td><b>{s.title}</b></td><td className="num mono">{money(s.value)}</td><td className="num mono">{money(s.cost)}</td><td className="num mono">{s.eff.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Deferred (over budget)</h3><span className="spacer" /><span className="badge b-grey">{o.deferred.length}</span></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Initiative</th><th className="num">RAV</th><th className="num">Capital</th><th className="num">RAV/$</th></tr></thead>
              <tbody>
                {o.deferred.slice(0, 12).map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => openDrawer(s.id)}>
                    <td>{s.title}</td><td className="num mono">{money(s.value)}</td><td className="num mono">{money(s.cost)}</td><td className="num mono">{s.eff.toFixed(2)}</td>
                  </tr>
                ))}
                {o.deferred.length === 0 && <tr><td colSpan="4" className="muted">Everything fits within budget.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
