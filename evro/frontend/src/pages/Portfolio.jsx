import { useState } from 'react'
import { rankInitiatives, funnel, departmentRollup, personName, PILLAR_LABEL } from '../lib/engine.js'
import { money, pct } from '../lib/format.js'
import { Funnel } from '../components/Charts.jsx'
import { StagePip, PillarBadge, RagBadge } from '../components/ui.jsx'

export default function Portfolio({ db, navigate }) {
  const [mode, setMode] = useState('return') // return | roi
  const [pillar, setPillar] = useState('all')
  const [stage, setStage] = useState('all')
  const [dept, setDept] = useState('all')

  const f = funnel(db)
  const depts = departmentRollup(db)
  let rows = rankInitiatives(db, mode)
  if (pillar !== 'all') rows = rows.filter((r) => r.pillar === pillar)
  if (stage !== 'all') rows = rows.filter((r) => r.stage === stage)
  if (dept !== 'all') rows = rows.filter((r) => r.department === dept)

  return (
    <>
      <p className="page-intro">Every initiative ranked by <b>return</b>. Toggle Biggest Return (absolute risk-adjusted value) and Best ROI (value ÷ effort). No gap-to-target framing.</p>

      <div className="grid cols-2">
        <div className="card pad">
          <div className="card-h"><h3>Pipeline funnel</h3></div>
          <Funnel stages={f.stages} />
          <div className="divider" />
          <div className="chip-row">
            {f.conversions.map((c) => (
              <span key={c.from} className="badge b-grey" style={{ textTransform: 'capitalize' }}>{c.from}→{c.to}: <b style={{ marginLeft: 4 }}>{pct(c.rate)}</b></span>
            ))}
          </div>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>By department</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Department</th><th className="num">Initiatives</th><th className="num">Realized</th><th className="num">Total FY</th></tr></thead>
              <tbody>
                {depts.map((d) => (
                  <tr key={d.department}>
                    <td><b>{d.department}</b></td>
                    <td className="num">{d.count}</td>
                    <td className="num mono">{money(d.realized)}</td>
                    <td className="num mono">{money(d.totalFY)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card pad section-gap">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3>Initiatives ranked by return</h3>
          <span className="spacer" />
          <div className="seg">
            <button className={mode === 'return' ? 'active' : ''} onClick={() => setMode('return')}>Biggest Return</button>
            <button className={mode === 'roi' ? 'active' : ''} onClick={() => setMode('roi')}>Best ROI</button>
          </div>
        </div>
        <div className="chip-row" style={{ marginBottom: 12 }}>
          <Filter label="Pillar" value={pillar} set={setPillar} opts={[['all', 'All pillars'], ['savings', 'Cost Savings'], ['avoidance', 'Cost Avoidance']]} />
          <Filter label="Stage" value={stage} set={setStage} opts={[['all', 'All stages'], ['idea', 'Idea'], ['feasibility', 'Feasibility'], ['capability', 'Capability'], ['launch', 'Launch'], ['closed', 'Closed']]} />
          <Filter label="Dept" value={dept} set={setDept} opts={[['all', 'All depts'], ...depts.map((d) => [d.department, d.department])]} />
          <span className="badge b-grey" style={{ alignSelf: 'center' }}>{rows.length} shown</span>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th><th>Initiative</th><th>Owner</th><th>Pillar</th><th>Stage</th><th>RAG</th>
                <th className="num">Gross</th><th className="num">RAV</th><th className="num">Effort</th><th className="num">ROI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="clickable" onClick={() => navigate('initiative', { id: r.id })}>
                  <td className="muted">{i + 1}</td>
                  <td><b>{r.title}</b></td>
                  <td className="nowrap">{personName(db, r.owner_id)}</td>
                  <td><PillarBadge pillar={r.pillar} /></td>
                  <td><StagePip stage={r.stage} /></td>
                  <td><RagBadge rag={r.status_rag} /></td>
                  <td className="num mono">{money(r.gross)}</td>
                  <td className="num mono"><b>{money(r.rav)}</b></td>
                  <td className="num">{r.effort}</td>
                  <td className="num mono">{money(r.roi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function Filter({ label, value, set, opts }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="label" style={{ marginBottom: 0 }}>{label}</span>
      <select value={value} onChange={(e) => set(e.target.value)} style={{ padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 8 }}>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}
