import { useState } from 'react'
import {
  enterpriseRollup, scenarioTotals, pnlImpact, funnel, forecastCurve,
  whatDeliversMost, personName, valueLeakage,
} from '../lib/engine.js'
import { money, pct, monthLabel, dateLabel } from '../lib/format.js'
import { Waterfall, LineChart, HBars } from '../components/Charts.jsx'

const REPORTS = [
  ['forecast', 'Forecast & Implications'],
  ['pnl', 'P&L Impact'],
  ['pipeline', 'Pipeline & Conversion'],
  ['risk', 'Risk & Confidence'],
  ['audit', 'Validation log'],
]

export default function Reporting({ db, navigate }) {
  const [rep, setRep] = useState('forecast')
  const r = enterpriseRollup(db)

  const exportCSV = () => {
    const rows = [['initiative', 'type', 'decision', 'actor', 'date', 'note']]
    for (const i of db.initiatives) for (const v of i.validations) rows.push([i.title, v.type, v.decision, personName(db, v.actor_id), v.decided_at, (v.note || '').replace(/,/g, ';')])
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'evro-validation-log.csv'; a.click()
  }

  return (
    <>
      <p className="page-intro">The backend reporting workspace for executives and finance — it explains the forecast and its implications (timing, confidence, P&L split). Every figure carries its confidence and risk; nothing is shown without them. No target or gap.</p>

      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <div className="seg" style={{ flexWrap: 'wrap' }}>
          {REPORTS.map(([k, l]) => <button key={k} className={rep === k ? 'active' : ''} onClick={() => setRep(k)}>{l}</button>)}
        </div>
        <span className="spacer" />
        <div className="btn-row no-print">
          <button className="btn sm" onClick={() => window.print()}>Export PDF</button>
          <button className="btn sm" onClick={exportCSV}>Export validation log (CSV)</button>
        </div>
      </div>

      {rep === 'forecast' && <ForecastReport db={db} r={r} navigate={navigate} />}
      {rep === 'pnl' && <PnlReport db={db} />}
      {rep === 'pipeline' && <PipelineReport db={db} />}
      {rep === 'risk' && <RiskReport db={db} r={r} navigate={navigate} />}
      {rep === 'audit' && <AuditReport db={db} />}
    </>
  )
}

function ForecastReport({ db, r, navigate }) {
  const sc = scenarioTotals(db)
  const curve = forecastCurve(db)
  const xLabels = curve.map((c) => monthLabel(c.month))
  const elapsedIdx = curve.findIndex((c) => !c.past)
  const anchor = elapsedIdx > 0 ? curve[elapsedIdx - 1].actual : null
  const fut = (sel) => curve.map((c, idx) => (idx === elapsedIdx - 1 ? anchor : c.past ? null : sel(c)))
  const series = [
    { key: 'actual', label: 'Realized', color: 'var(--green)', points: curve.map((c) => (c.past ? c.actual : null)) },
    { key: 'committed', label: 'Committed', color: 'var(--amber)', dashed: true, points: fut((c) => c.committed) },
    { key: 'expected', label: 'Expected', color: 'var(--navy)', dashed: true, points: fut((c) => c.expected) },
    { key: 'upside', label: 'Upside', color: 'var(--red)', dashed: true, points: fut((c) => c.upside) },
  ]
  return (
    <div className="grid cols-2 section-gap">
      <div className="card pad"><div className="card-h"><h3>Value bridge</h3></div><Waterfall steps={r.bridge} total={r.bridgeTotal} /></div>
      <div className="card pad"><div className="card-h"><h3>Forecast scenarios</h3></div><LineChart xLabels={xLabels} series={series} />
        <div className="kv"><span className="k">Committed (Launch + validated)</span><span className="v mono">{money(sc.committed)}</span></div>
        <div className="kv"><span className="k">Expected (risk-adjusted) — headline</span><span className="v mono"><b>{money(sc.expected)}</b></span></div>
        <div className="kv"><span className="k">Upside (gross of Capability + Launch)</span><span className="v mono">{money(sc.upside)}</span></div>
      </div>
      <div className="card pad" style={{ gridColumn: '1 / -1' }}>
        <div className="card-h"><h3>What delivers the most</h3><span className="spacer" /><span className="tiny muted">implications: focus advancement here</span></div>
        <HBars data={whatDeliversMost(db).map((d) => ({ label: d.title.length > 26 ? d.title.slice(0, 25) + '…' : d.title, value: d.totalFY, color: 'var(--navy)' }))} />
      </div>
    </div>
  )
}

function PnlReport({ db }) {
  const p = pnlImpact(db)
  const rows = [
    ['COGS — recurring', p.cogs.recurring], ['COGS — one-time', p.cogs.one_time],
    ['OpEx — recurring', p.opex.recurring], ['OpEx — one-time', p.opex.one_time],
  ]
  const total = rows.reduce((a, [, v]) => a + v, 0)
  const recurring = p.cogs.recurring + p.opex.recurring
  return (
    <div className="grid cols-2 section-gap">
      <div className="card pad"><div className="card-h"><h3>Risk-adjusted value by P&L line</h3></div>
        <HBars data={rows.map(([l, v], i) => ({ label: l, value: v, color: i < 2 ? 'var(--navy)' : 'var(--green)' }))} />
      </div>
      <div className="card pad"><div className="card-h"><h3>Quality of value</h3></div>
        <div className="kv"><span className="k">Total risk-adjusted</span><span className="v mono">{money(total)}</span></div>
        <div className="kv"><span className="k">Recurring (improves run-rate)</span><span className="v mono" style={{ color: 'var(--green)' }}>{money(recurring)}</span></div>
        <div className="kv"><span className="k">One-time</span><span className="v mono">{money(total - recurring)}</span></div>
        <div className="kv"><span className="k">Recurring ratio</span><span className="v mono">{pct(recurring / Math.max(1, total))}</span></div>
        <p className="tiny muted section-gap">A recurring dollar improves the run-rate permanently; a one-time dollar does not. COGS vs OpEx shows where operating income is affected.</p>
      </div>
    </div>
  )
}

function PipelineReport({ db }) {
  const f = funnel(db)
  return (
    <div className="card pad section-gap">
      <div className="card-h"><h3>Pipeline funnel &amp; conversion</h3></div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Stage</th><th className="num">Count</th><th className="num">Risk-adjusted value</th><th className="num">Gross value</th></tr></thead>
          <tbody>
            {f.stages.map((s) => <tr key={s.stage}><td style={{ textTransform: 'capitalize' }}>{s.stage}</td><td className="num">{s.count}</td><td className="num mono">{money(s.value)}</td><td className="num mono">{money(s.gross)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="chip-row section-gap">
        {f.conversions.map((c) => <span key={c.from} className="badge b-grey" style={{ textTransform: 'capitalize' }}>{c.from}→{c.to}: <b style={{ marginLeft: 4 }}>{pct(c.rate)}</b></span>)}
      </div>
    </div>
  )
}

function RiskReport({ db, r, navigate }) {
  const leak = db.initiatives.map((i) => ({ i, l: valueLeakage(i, db) })).filter((x) => x.l > 0).sort((a, b) => b.l - a.l)
  return (
    <div className="grid cols-2 section-gap">
      <div className="card pad"><div className="card-h"><h3>Top risks (value at risk)</h3></div>
        <div className="table-wrap"><table className="tbl"><thead><tr><th>Initiative</th><th>Category</th><th className="num">Score</th></tr></thead>
          <tbody>{r.topRisks.map((rk, i) => <tr key={i} className="clickable" onClick={() => navigate('initiative', { id: rk.initiative })}><td>{rk.title}</td><td style={{ textTransform: 'capitalize' }}>{rk.category}</td><td className="num"><span className={`badge ${rk.score >= 15 ? 'b-red' : 'b-amber'}`}>{rk.score}</span></td></tr>)}</tbody>
        </table></div>
      </div>
      <div className="card pad"><div className="card-h"><h3>Implemented vs negotiated leakage</h3><span className="spacer" /><span className="badge b-red">{money(r.leakage)}</span></div>
        <div className="table-wrap"><table className="tbl"><thead><tr><th>Initiative</th><th className="num">Negotiated</th><th className="num">Leakage</th></tr></thead>
          <tbody>{leak.slice(0, 8).map(({ i, l }) => <tr key={i.id} className="clickable" onClick={() => navigate('initiative', { id: i.id })}><td>{i.title}</td><td className="num mono">{money(i.negotiated_value)}</td><td className="num mono" style={{ color: 'var(--red)' }}>{money(l)}</td></tr>)}
            {leak.length === 0 && <tr><td colSpan="3" className="muted">No leakage detected.</td></tr>}</tbody>
        </table></div>
      </div>
    </div>
  )
}

function AuditReport({ db }) {
  const events = []
  for (const i of db.initiatives) for (const v of i.validations) events.push({ when: v.decided_at, title: i.title, type: v.type, decision: v.decision, actor: personName(db, v.actor_id), note: v.note })
  events.sort((a, b) => String(b.when).localeCompare(String(a.when)))
  return (
    <div className="card pad section-gap">
      <div className="card-h"><h3>Validation log (audit trail)</h3><span className="spacer" /><span className="tiny muted">{events.length} events · who recognized which value, when</span></div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Date</th><th>Initiative</th><th>Type</th><th>Decision</th><th>Actor</th><th>Note</th></tr></thead>
          <tbody>
            {events.slice(0, 60).map((e, i) => (
              <tr key={i}><td className="nowrap">{dateLabel(e.when)}</td><td>{e.title}</td><td style={{ textTransform: 'capitalize' }}>{e.type}</td>
                <td><span className={`badge ${e.decision === 'approved' ? 'b-green' : 'b-amber'}`}>{e.decision}</span></td><td>{e.actor}</td><td className="tiny">{e.note}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
