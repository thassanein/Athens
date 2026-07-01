import { useState } from 'react'
import { valueMatrix } from '../lib/engine.js'
import { money } from '../lib/format.js'
import { Scatter } from '../components/Charts.jsx'

const RAGC = { red: 'var(--red)', amber: 'var(--amber)', green: 'var(--green)' }

export default function ValueMap({ db, openDrawer }) {
  const [axis, setAxis] = useState('risk') // risk | effort
  const m = valueMatrix(db)
  const points = m.map((p) => ({ id: p.id, label: p.title, x: axis === 'risk' ? p.risk : p.effort, y: p.value, value: p.value, color: RAGC[p.rag] }))
  const xMax = axis === 'risk' ? 25 : 5

  return (
    <>
      <p className="page-intro">Prioritization heatmap — every active initiative by risk-adjusted value against {axis === 'risk' ? 'risk' : 'effort'}. Bubble size = value. Click any bubble to drill in.</p>
      <div className="card-h">
        <div className="seg">
          <button className={axis === 'risk' ? 'active' : ''} onClick={() => setAxis('risk')}>Value vs Risk</button>
          <button className={axis === 'effort' ? 'active' : ''} onClick={() => setAxis('effort')}>Value vs Effort</button>
        </div>
      </div>
      <div className="card pad section-gap">
        <Scatter points={points} xLabel={axis === 'risk' ? 'Risk (worst open risk score 1–25)' : 'Effort (1 easy – 5 hard)'} yLabel="Risk-adjusted value" xMax={xMax} onPick={(p) => openDrawer(p.id)} />
        <div className="chip-row section-gap">
          <span className="badge b-green">● On track</span><span className="badge b-amber">● Watch</span><span className="badge b-red">● At risk</span>
          <span className="tiny muted" style={{ alignSelf: 'center' }}>Top-left quadrant = highest priority (high value, low {axis}).</span>
        </div>
      </div>
      <div className="card pad section-gap">
        <div className="card-h"><h3>Quadrant — high value, low {axis}</h3></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Initiative</th><th>Stage</th><th className="num">{axis === 'risk' ? 'Risk' : 'Effort'}</th><th className="num">RAV</th></tr></thead>
            <tbody>
              {m.filter((p) => (axis === 'risk' ? p.risk : p.effort) <= xMax / 2).sort((a, b) => b.value - a.value).slice(0, 8).map((p) => (
                <tr key={p.id} className="clickable" onClick={() => openDrawer(p.id)}>
                  <td><b>{p.title}</b></td><td style={{ textTransform: 'capitalize' }}>{p.stage}</td>
                  <td className="num">{axis === 'risk' ? p.risk : p.effort}</td><td className="num mono">{money(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
