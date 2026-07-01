import { useState } from 'react'
import { forecastCurve, scenarioTotals, whatDeliversMost, departmentRollup, enterpriseRollup } from '../lib/engine.js'
import { money, monthLabel } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { LineChart } from '../components/Charts.jsx'

export default function Forecast({ db, navigate }) {
  const [scenario, setScenario] = useState('expected')
  const sc = scenarioTotals(db)
  const curve = forecastCurve(db)
  const r = enterpriseRollup(db)
  const deliver = whatDeliversMost(db)
  const depts = departmentRollup(db)
  const xLabels = curve.map((c) => monthLabel(c.month))
  const elapsedIdx = curve.findIndex((c) => !c.past)
  const anchor = elapsedIdx > 0 ? curve[elapsedIdx - 1].actual : null
  const fut = (sel) => curve.map((c, idx) => (idx === elapsedIdx - 1 ? anchor : c.past ? null : sel(c)))
  const SC = {
    committed: { label: 'Committed', color: 'var(--amber)', sel: (c) => c.committed },
    expected: { label: 'Expected', color: 'var(--navy)', sel: (c) => c.expected },
    upside: { label: 'Upside', color: 'var(--red)', sel: (c) => c.upside },
  }
  const series = [
    { key: 'actual', label: 'Realized (validated)', color: 'var(--green)', points: curve.map((c) => (c.past ? c.actual : null)) },
    { key: scenario, label: SC[scenario].label, color: SC[scenario].color, dashed: true, points: fut(SC[scenario].sel) },
  ]

  return (
    <>
      <p className="page-intro">Given the current pipeline, what will we deliver this year — by month? Three transparent, rules-based scenarios. Headline is <b>Expected (risk-adjusted)</b>. No target line, no projected year-end gap.</p>

      <div className="tiles">
        <Tile tone="amber" label="Committed (FY)" value={money(sc.committed)} sub="Launch + validated only" />
        <Tile tone="navy" label="Expected (FY) — headline" value={money(sc.expected)} sub="risk-adjusted, all stages" />
        <Tile tone="red" label="Upside (FY)" value={money(sc.upside)} sub="gross of Capability + Launch" />
        <Tile tone="green" label="Realized YTD" value={money(r.realizedYTD)} sub="validated to date" />
      </div>

      <div className="card pad section-gap">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3>Monthly enterprise forecast</h3><span className="spacer" />
          <div className="seg">
            {Object.entries(SC).map(([k, v]) => <button key={k} className={scenario === k ? 'active' : ''} onClick={() => setScenario(k)}>{v.label}</button>)}
          </div>
        </div>
        <LineChart xLabels={xLabels} series={series} />
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>What delivers the most</h3><span className="spacer" /><span className="tiny muted">replaces “what closes the gap”</span></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>#</th><th>Initiative</th><th>Stage</th><th className="num">Total FY</th></tr></thead>
              <tbody>
                {deliver.map((d, i) => (
                  <tr key={d.id} className="clickable" onClick={() => navigate('initiative', { id: d.id })}>
                    <td className="muted">{i + 1}</td><td><b>{d.title}</b></td>
                    <td style={{ textTransform: 'capitalize' }}>{d.stage}</td><td className="num mono">{money(d.totalFY)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Department roll-up</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Department</th><th className="num">Realized</th><th className="num">RA forecast</th><th className="num">Total FY</th></tr></thead>
              <tbody>
                {depts.map((d) => (
                  <tr key={d.department}><td><b>{d.department}</b></td><td className="num mono">{money(d.realized)}</td><td className="num mono">{money(d.forecastRA)}</td><td className="num mono"><b>{money(d.totalFY)}</b></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
