import {
  visibleInitiatives, rav, roi, realizedYTD, forecastRemainderFY, totalFY,
  canRequestAdvance, nextStage, worstRisk, pendingValue, leaderboard, STAGE_LABEL, isActive,
} from '../lib/engine.js'
import { money, num } from '../lib/format.js'
import { Tile, StagePip, PillarBadge, RagBadge } from '../components/ui.jsx'

export default function MyWork({ db, user, caps, navigate }) {
  const mine = visibleInitiatives(db, user)
  const active = mine.filter(isActive)
  const realized = mine.reduce((a, i) => a + realizedYTD(i, db), 0)
  const raPipeline = active.reduce((a, i) => a + rav(i), 0)
  const totalFy = mine.reduce((a, i) => a + totalFY(i, db), 0)
  const effort = active.reduce((a, i) => a + (i.effort_score || 0), 0)
  const blendedROI = effort ? raPipeline / effort : 0

  // attention list
  const awaiting = mine.filter((i) => i.request) // intake or advancement pending approval
  const readyToRequest = caps.edit ? mine.filter((i) => canRequestAdvance(user, i, caps).ok) : []
  const pendingActuals = mine.filter((i) => i.actuals.some((a) => !a.validated))
  const highRisks = mine.filter((i) => worstRisk(i) >= 15)

  const board = user.procurement ? leaderboard(db).procurement : leaderboard(db)
  const lb = board.total
  const myIdx = lb.findIndex((p) => p.id === user.id)
  const me = myIdx >= 0 ? lb[myIdx] : null
  const rows = mine.slice().sort((a, b) => rav(b) - rav(a))

  return (
    <>
      <p className="page-intro">
        {user.procurement ? 'Your sourcing initiatives' : 'Your initiatives'} only — {mine.length} owned or contributed.
        Value is risk-adjusted and ranked by return; only FP&amp;A-validated actuals count as realized.
        {user.procurement && ' Procurement is ranked on its own board, separate from the organization leaderboard.'}
      </p>

      <div className="tiles">
        <Tile tone="green" label="My realized YTD" value={money(realized)} sub="validated actuals" />
        <Tile tone="navy" label="My risk-adjusted pipeline" value={money(raPipeline)} sub={`${active.length} active`} />
        <Tile tone="dark" label="My total FY value" value={money(totalFy)} sub="realized + RA forecast" />
        <Tile tone="red" label="My blended ROI" value={money(blendedROI)} sub="RAV ÷ effort point" />
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Needs your attention</h3></div>
          <Attention title="Awaiting line manager + FP&A approval" items={awaiting} navigate={navigate} tone="b-amber" empty="Nothing awaiting approval." note={(i) => (i.request.kind === 'intake' ? 'new project' : `→ ${STAGE_LABEL[i.request.to_stage]}`)} />
          <Attention title="Ready to request advancement" items={readyToRequest} navigate={navigate} tone="b-green" empty="Nothing ready." note={(i) => `→ ${STAGE_LABEL[nextStage(i)] || ''}`} />
          <Attention title="Actuals awaiting FP&A validation" items={pendingActuals} navigate={navigate} tone="b-amber" empty="Nothing pending." note={(i) => money(pendingValue(i)) + ' pending'} />
          <Attention title="High risks needing a countermeasure" items={highRisks} navigate={navigate} tone="b-red" empty="No high risks." note={(i) => `score ${worstRisk(i)}`} />
        </div>
        <div className="card pad">
          <div className="card-h"><h3>My standing</h3></div>
          {me ? (
            <>
              <div className="tile dark" style={{ marginBottom: 12 }}>
                <div className="t-accent" /><div className="t-label">{user.procurement ? 'Procurement board rank' : 'Leaderboard rank'} (Total FY)</div>
                <div className="t-value mono">#{myIdx + 1}<span style={{ fontSize: 14, color: 'var(--grey)', fontWeight: 600 }}> of {lb.length}</span></div>
                <div className="t-sub">{money(me.totalFY)} total FY · {num(me.points)} pts</div>
              </div>
              <div className="kv"><span className="k">Realized YTD</span><span className="v mono">{money(me.realized)}</span></div>
              <div className="kv"><span className="k">Forecast FY (risk-adj.)</span><span className="v mono">{money(me.forecastRA)}</span></div>
              <div className="kv"><span className="k">Recurring ratio</span><span className="v mono">{(me.recurringRatio * 100).toFixed(0)}%</span></div>
              <div className="chip-row section-gap">{me.badges.map((b) => <span key={b} className="badge b-green">{b}</span>)}</div>
              <button className="btn sm section-gap" onClick={() => navigate('leaderboard')}>See leaderboard →</button>
            </>
          ) : <div className="muted">No standings yet — advance an initiative to appear on the leaderboard.</div>}
        </div>
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>My initiatives</h3><span className="spacer" />{caps.edit && <button className="btn sm primary" onClick={() => navigate('intake')}>+ New</button>}</div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Initiative</th><th>Pillar</th><th>Stage</th><th>RAG</th><th className="num">Realized</th><th className="num">RAV</th><th className="num">ROI</th></tr></thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="clickable" onClick={() => navigate('initiative', { id: i.id })}>
                  <td><b>{i.title}</b></td>
                  <td><PillarBadge pillar={i.pillar} benefit={i.benefit_type} /></td>
                  <td><StagePip stage={i.stage} /></td>
                  <td><RagBadge rag={i.status_rag} /></td>
                  <td className="num mono">{money(realizedYTD(i, db))}</td>
                  <td className="num mono"><b>{money(rav(i))}</b></td>
                  <td className="num mono">{money(roi(i))}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="7" className="muted">You don't own any initiatives yet. Use “+ New” to propose one.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function Attention({ title, items, navigate, tone, empty, note }) {
  return (
    <div className="section-gap">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span className={`badge ${tone}`}>{items.length}</span><b className="small">{title}</b>
      </div>
      {items.length === 0 ? <div className="tiny muted" style={{ paddingLeft: 4 }}>{empty}</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.slice(0, 5).map((i) => (
            <button key={i.id} className="kv" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none' }} onClick={() => navigate('initiative', { id: i.id })}>
              <span className="k" style={{ color: 'var(--dark)' }}>{i.title}</span><span className="v tiny muted">{note(i)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
