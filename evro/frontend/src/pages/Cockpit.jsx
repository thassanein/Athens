import { controlTower, decisionsRequired, portfolioRollup, valueMatrix, inflationExposure, ROLE_APPROVE_LABEL } from '../lib/engine.js'
import { money, pct } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { Scatter, HBars } from '../components/Charts.jsx'

// "The dashboard IS the application." Decisions, not lists.
export default function Cockpit({ db, user, dispatch, navigate, openDrawer, flash }) {
  const ct = controlTower(db)
  const decisions = decisionsRequired(db, user)
  const portfolios = portfolioRollup(db)
  const infl = inflationExposure(db)
  const matrix = valueMatrix(db)
  const RAGC = { red: 'var(--red)', amber: 'var(--amber)', green: 'var(--green)' }
  const points = matrix.map((m) => ({ id: m.id, label: m.title, x: m.risk, y: m.value, value: m.value, color: RAGC[m.rag] }))

  const act = async (d) => {
    if (d.kind === 'approval' && d.roles?.length) {
      const r = await dispatch('approveRequest', d.id, user.id)
      if (!r.error) flash(`Approved as ${d.roles.map((x) => ROLE_APPROVE_LABEL[x]).join(', ')}`)
    } else openDrawer(d.id)
  }

  return (
    <>
      <p className="page-intro">Executive decision cockpit — what needs a decision, ranked by value. One-click actions; drill anywhere without leaving the page.</p>

      <div className="tiles">
        <Tile tone="green" label="Value created (YTD)" value={money(ct.valueCreated)} sub="FP&A-validated" />
        <Tile tone="navy" label="Risk-adjusted pipeline" value={money(ct.raPipeline)} sub={`+ ${money(ct.forecastRA)} forecast FY`} />
        <Tile tone="red" label="Value at risk" value={money(ct.valueAtRisk)} sub={`incl. ${money(ct.leakage)} leakage`} />
        <Tile tone="navy" label="Inflation exposure" value={money(ct.inflationExposure)} sub="addressable × CPI" />
        <Tile tone="dark" label="Capital deployed" value={money(ct.capitalDeployed)} sub={`of ${money(ct.capitalBudget)} budget`} />
        <Tile tone="green" label="Optimizable value" value={money(ct.optimizableValue)} sub="within budget" />
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Decisions required</h3><span className="spacer" /><span className="badge b-amber">{decisions.length}</span></div>
          {decisions.length === 0 ? <div className="muted">Nothing needs a decision right now.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
              {decisions.slice(0, 14).map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 9 }}>
                  <span className={`badge ${d.kind === 'approval' ? 'b-amber' : d.kind === 'leakage' ? 'b-red' : 'b-red'}`} style={{ textTransform: 'capitalize' }}>{d.kind}</span>
                  <button className="link" onClick={() => openDrawer(d.id)} style={{ flex: 1, textAlign: 'left', background: 'none', cursor: 'pointer' }}>
                    <b style={{ fontSize: 13 }}>{d.title}</b><div className="tiny muted">{d.detail}</div>
                  </button>
                  <span className="mono small" style={{ fontWeight: 700 }}>{money(d.value)}</span>
                  {d.kind === 'approval' && d.roles?.length
                    ? <button className="btn go sm" onClick={() => act(d)}>Approve</button>
                    : <button className="btn sm" onClick={() => openDrawer(d.id)}>Open</button>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card pad">
          <div className="card-h"><h3>Value vs risk</h3><span className="spacer" /><span className="tiny muted">bubble = risk-adjusted value · click to drill</span></div>
          <Scatter points={points} xLabel="Risk (worst open risk score)" yLabel="Risk-adjusted value" xMax={25} onPick={(p) => openDrawer(p.id)} />
          <p className="tiny muted">Top-left = high value, low risk (do first). Top-right = high value, high risk (de-risk).</p>
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Portfolios</h3><span className="spacer" /><button className="btn sm" onClick={() => navigate('hierarchy')}>Hierarchy →</button></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Portfolio</th><th className="num">Realized</th><th className="num">RA pipeline</th><th className="num">At risk</th><th className="num">Total FY</th></tr></thead>
              <tbody>
                {portfolios.map((p) => (
                  <tr key={p.id}><td><b>{p.name}</b></td><td className="num mono">{money(p.realized)}</td><td className="num mono">{money(p.raPipeline)}</td>
                    <td className="num mono" style={{ color: p.atRisk ? 'var(--red)' : undefined }}>{money(p.atRisk)}</td><td className="num mono"><b>{money(p.totalFY)}</b></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Inflation exposure by group</h3><span className="spacer" /><span className="badge b-navy">{money(infl.total)}</span></div>
          <HBars data={infl.byGroup.slice(0, 7).map((g) => ({ label: g.name, value: g.exposure, color: 'var(--navy)' }))} />
          <p className="tiny muted section-gap">Budget pressure that cost avoidance must offset (addressable spend × category inflation).</p>
        </div>
      </div>
    </>
  )
}
