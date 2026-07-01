import { enterpriseRollup, forecastCurve, personName, PILLAR_LABEL } from '../lib/engine.js'
import { money, pct, monthLabel } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { Waterfall, Donut, LineChart, HBars } from '../components/Charts.jsx'
import ApprovalsCard from '../components/ApprovalsCard.jsx'

export default function Exec({ db, user, navigate }) {
  const r = enterpriseRollup(db)
  const curve = forecastCurve(db)
  const xLabels = curve.map((c) => monthLabel(c.month))
  const elapsedIdx = curve.findIndex((c) => !c.past)
  const anchor = elapsedIdx > 0 ? curve[elapsedIdx - 1].actual : null
  const fut = (sel) => curve.map((c, idx) => (idx === elapsedIdx - 1 ? anchor : c.past ? null : sel(c)))
  const series = [
    { key: 'actual', label: 'Realized (validated)', color: 'var(--green)', points: curve.map((c) => (c.past ? c.actual : null)) },
    { key: 'expected', label: 'Expected (risk-adj.)', color: 'var(--navy)', dashed: true, points: fut((c) => c.expected) },
    { key: 'committed', label: 'Committed', color: 'var(--amber)', dashed: true, points: fut((c) => c.committed) },
    { key: 'upside', label: 'Upside', color: 'var(--red)', dashed: true, points: fut((c) => c.upside) },
  ]

  const pillarData = [
    { label: PILLAR_LABEL.savings, value: r.pillar.savings.realized + r.pillar.savings.forecastRA, color: 'var(--green)' },
    { label: PILLAR_LABEL.avoidance, value: r.pillar.avoidance.realized + r.pillar.avoidance.forecastRA, color: 'var(--navy)' },
  ]
  const recurData = [
    { label: 'Recurring', value: r.recurringSplit.recurring, color: 'var(--green)' },
    { label: 'One-time', value: r.recurringSplit.oneTime, color: 'var(--amber)' },
  ]
  const benefitData = [
    { label: 'Cost Reduction', value: r.benefitType.reduction, color: 'var(--red)' },
    { label: 'Cost Savings', value: r.benefitType.savings, color: 'var(--green)' },
    { label: 'Cost Avoidance', value: r.benefitType.avoidance, color: 'var(--navy)' },
  ]

  return (
    <>
      <p className="page-intro">
        Enterprise return across the ${(r.addressableTotal / 1e6).toFixed(0)}M addressable spend base. Value is ranked by
        return, not measured against a target — there is no savings or avoidance target anywhere in EVRO.
      </p>

      <div className="tiles">
        <Tile tone="green" label="Realized YTD (validated)" value={money(r.realizedYTD)} sub="FP&A-validated actuals only" />
        <Tile tone="navy" label="Risk-adjusted pipeline" value={money(r.raPipeline)} sub={`${r.counts.active} active initiatives`} />
        <Tile tone="red" label="Identified opportunity" value={money(r.identifiedOpportunity)} sub={`${money(r.identifiedOpportunityRange.low)}–${money(r.identifiedOpportunityRange.high)} · illustrative`} />
        <Tile tone="dark" label="Blended ROI" value={money(r.blendedROI)} sub="risk-adjusted value ÷ effort point" />
      </div>

      <ApprovalsCard db={db} user={user} navigate={navigate} />

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Value bridge</h3><span className="spacer" /><span className="badge b-grey">no target · no gap</span></div>
          <Waterfall steps={r.bridge} total={r.bridgeTotal} />
          <p className="tiny muted" style={{ marginTop: 4 }}>
            Realized → + risk-adjusted forecast → + identified opportunity. The total is potential return, not a commitment.
          </p>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Monthly forecast curve</h3></div>
          <LineChart xLabels={xLabels} series={series} />
          <p className="tiny muted">Realized run-rate to date, then Committed / Expected / Upside scenarios for the remainder of the year.</p>
        </div>
      </div>

      <div className="grid cols-3 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Savings vs Avoidance</h3></div>
          <Donut data={pillarData} center={money(pillarData[0].value + pillarData[1].value)} />
          <p className="tiny muted" style={{ marginTop: 8 }}>Two pillars tracked separately; combined only at this labelled total.</p>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Benefit type</h3></div>
          <Donut data={benefitData} />
          <p className="tiny muted" style={{ marginTop: 8 }}>Reduction (negotiated rate ↓) · Savings (productivity) · Avoidance (prevented increase).</p>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Recurring vs one-time</h3></div>
          <Donut data={recurData} center={pct(r.recurringSplit.recurring / Math.max(1, r.recurringSplit.recurring + r.recurringSplit.oneTime))} />
          <p className="tiny muted" style={{ marginTop: 8 }}>Recurring value improves the run-rate; one-time does not.</p>
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Top returns</h3><span className="spacer" /><button className="btn sm" onClick={() => navigate('portfolio')}>Full portfolio →</button></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Initiative</th><th>Stage</th><th className="num">RAV</th><th className="num">ROI</th></tr></thead>
              <tbody>
                {r.topReturns.map((i) => (
                  <tr key={i.id} className="clickable" onClick={() => navigate('initiative', { id: i.id })}>
                    <td><b>{i.title}</b><div className="tiny muted">{personName(db, i.owner_id)}</div></td>
                    <td style={{ textTransform: 'capitalize' }}>{i.stage}</td>
                    <td className="num mono">{money(i.rav)}</td>
                    <td className="num mono">{money(i.roi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Top risks</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Initiative</th><th>Category</th><th className="num">Score</th></tr></thead>
              <tbody>
                {r.topRisks.map((rk, i) => (
                  <tr key={i} className="clickable" onClick={() => navigate('initiative', { id: rk.initiative })}>
                    <td>{rk.title}</td>
                    <td style={{ textTransform: 'capitalize' }}>{rk.category}</td>
                    <td className="num"><span className={`badge ${rk.score >= 15 ? 'b-red' : rk.score >= 8 ? 'b-amber' : 'b-green'}`}>{rk.score}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="note section-gap"><span>⚑</span><span><b>{money(r.leakage)}</b> of negotiated value is not yet flowing through as run-rate (implemented-vs-negotiated leakage). Track it before it erodes.</span></div>
        </div>
      </div>

      <div className="card pad section-gap">
        <div className="kv"><span className="k">% of addressable spend captured (progress, not vs a target)</span><span className="v mono">{pct(r.capturePct, 3)}</span></div>
        <div className="barline" style={{ marginTop: 8 }}><i style={{ width: `${Math.min(100, r.capturePct * 100 * 12)}%`, background: 'var(--green)' }} /></div>
        <p className="tiny muted" style={{ marginTop: 6 }}>Realized {money(r.realizedYTD)} of {money(r.addressableTotal)} addressable. Shown as progress — EVRO does not manage to a capture target.</p>
      </div>
    </>
  )
}
