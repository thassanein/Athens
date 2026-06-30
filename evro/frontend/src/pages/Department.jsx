import {
  visibleInitiatives, scopedView, rav, roi, realizedYTD, forecastRemainderFY,
  funnel, leaderboard, personName, overseenDepts,
} from '../lib/engine.js'
import { money } from '../lib/format.js'
import { Tile, StagePip, PillarBadge, RagBadge, Avatar } from '../components/ui.jsx'
import { Funnel } from '../components/Charts.jsx'
import ApprovalsCard from '../components/ApprovalsCard.jsx'

export default function Department({ db, user, navigate }) {
  const dept = visibleInitiatives(db, user)
  const view = scopedView(db, user)
  const realized = dept.reduce((a, i) => a + realizedYTD(i, db), 0)
  const forecastRA = dept.reduce((a, i) => a + forecastRemainderFY(i, db), 0)
  const active = dept.filter((i) => i.stage !== 'closed')
  const depts = overseenDepts(user)
  const f = funnel(view)
  const team = leaderboard(db).total.filter((p) => depts.includes(p.fn))
  const rows = dept.slice().sort((a, b) => rav(b) - rav(a))

  return (
    <>
      <p className="page-intro">{user.fn} — {depts.join(', ')} ({dept.length} initiatives). Realized + risk-adjusted value, ranked by return. No department target or gap.</p>

      <div className="tiles">
        <Tile tone="green" label="Department realized YTD" value={money(realized)} sub="validated actuals" />
        <Tile tone="navy" label="RA forecast (rest of FY)" value={money(forecastRA)} sub={`${active.length} active`} />
        <Tile tone="dark" label="Department total FY" value={money(realized + forecastRA)} sub="realized + RA forecast" />
        <Tile tone="red" label="Initiatives" value={dept.length} sub={`${active.length} active`} />
      </div>

      <ApprovalsCard db={db} user={user} navigate={navigate} />

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Department pipeline</h3></div>
          <Funnel stages={f.stages} />
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Team standings</h3><span className="spacer" /><button className="btn sm" onClick={() => navigate('leaderboard')}>Full board →</button></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>#</th><th>Person</th><th className="num">Realized</th><th className="num">Total FY</th><th className="num">Points</th></tr></thead>
              <tbody>
                {team.map((p, i) => (
                  <tr key={p.id}>
                    <td className="muted">{i + 1}</td>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={p.name} /> <b>{p.name}</b></td>
                    <td className="num mono">{money(p.realized)}</td>
                    <td className="num mono"><b>{money(p.totalFY)}</b></td>
                    <td className="num mono">{p.points}</td>
                  </tr>
                ))}
                {team.length === 0 && <tr><td colSpan="5" className="muted">No team members with value yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>Department initiatives — ranked by return</h3></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>#</th><th>Initiative</th><th>Owner</th><th>Pillar</th><th>Stage</th><th>RAG</th><th className="num">Realized</th><th className="num">RAV</th><th className="num">ROI</th></tr></thead>
            <tbody>
              {rows.map((i, idx) => (
                <tr key={i.id} className="clickable" onClick={() => navigate('initiative', { id: i.id })}>
                  <td className="muted">{idx + 1}</td>
                  <td><b>{i.title}</b></td>
                  <td className="nowrap">{personName(db, i.owner_id)}</td>
                  <td><PillarBadge pillar={i.pillar} benefit={i.benefit_type} /></td>
                  <td><StagePip stage={i.stage} /></td>
                  <td><RagBadge rag={i.status_rag} /></td>
                  <td className="num mono">{money(realizedYTD(i, db))}</td>
                  <td className="num mono"><b>{money(rav(i))}</b></td>
                  <td className="num mono">{money(roi(i))}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="9" className="muted">No initiatives in this department yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
