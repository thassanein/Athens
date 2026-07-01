import { useState } from 'react'
import { controlTower, decisionsRequired, portfolioRollup, valueMatrix, inflationExposure, execSummary, whatChanged, sustainmentBook, copilotInsights, mineOpportunities, ROLE_APPROVE_LABEL } from '../lib/engine.js'
import { money, pct, dateLabel } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { Scatter, HBars } from '../components/Charts.jsx'
import { IconAI } from '../components/Icons.jsx'
import StoryMode from '../components/StoryMode.jsx'
import { exportBoardPacket } from '../lib/board-packet.js'

const KIND = { approval: 'b-amber', leakage: 'b-red', opportunity: 'b-green', sustainment: 'b-red' }

// "The dashboard IS the application." Decisions, not lists.
export default function Cockpit({ db, user, dispatch, navigate, openDrawer, flash }) {
  const ct = controlTower(db)
  const decisions = decisionsRequired(db, user)
  const portfolios = portfolioRollup(db)
  const infl = inflationExposure(db)
  const matrix = valueMatrix(db)
  const summary = execSummary(db)
  const changes = whatChanged(db)
  const sustain = sustainmentBook(db)
  const recos = copilotInsights(db, user).filter((c) => c.kind !== 'summary')
  const opps = mineOpportunities(db).filter((o) => !o.alreadyCovered).slice(0, 5)
  const [story, setStory] = useState(false)
  const [pkg, setPkg] = useState(false)
  const RAGC = { red: 'var(--red)', amber: 'var(--amber)', green: 'var(--green)' }

  const exportPacket = async () => {
    setPkg(true)
    try { const fn = await exportBoardPacket(db, { audience: 'board', period: 'fy', user }); flash(`Board packet exported — ${fn}`) }
    catch (e) { flash('Export failed — ' + (e?.message || 'unknown error')) }
    finally { setPkg(false) }
  }
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

      <div className="card pad section-gap" style={{ borderLeft: '3px solid var(--navy)' }}>
        <div className="card-h">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span className="copilot-logo" style={{ width: 24, height: 24 }}><IconAI /></span> Executive briefing</h3>
          <span className="spacer" />
          <span className="badge b-grey">AI · rules-based</span>
          <button className="btn sm" onClick={exportPacket} disabled={pkg} title="Export the FY board packet as PowerPoint (.pptx)">{pkg ? 'Building…' : '⤓ Board packet'}</button>
          <button className="btn sm accent" onClick={() => setStory(true)}>▶ Story mode</button>
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, margin: '2px 0 8px' }}>{summary.headline}</p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7 }}>
          {summary.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>

      {story && <StoryMode db={db} user={user} onClose={() => setStory(false)} />}

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

      {/* AI-as-interface: recommendations + opportunity feed (control tower) */}
      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span className="copilot-logo" style={{ width: 22, height: 22 }}><IconAI /></span> AI recommendations</h3><span className="spacer" /><span className="badge b-grey">rules-based</span></div>
          {recos.length === 0 ? <div className="muted">Nothing to recommend — the portfolio is clear.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recos.map((c, i) => (
                <button key={i} className="reco-row" onClick={() => (c.target ? openDrawer(c.target) : navigate('mining'))}>
                  <span className={`badge ${KIND[c.kind] || 'b-grey'}`} style={{ textTransform: 'capitalize' }}>{c.kind}</span>
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}><b style={{ fontSize: 13 }}>{c.title}</b><div className="tiny muted">{c.body}</div></div>
                  <span style={{ color: 'var(--navy)' }}>→</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Opportunity feed</h3><span className="spacer" /><button className="btn sm" onClick={() => navigate('mining')}>AI mining →</button></div>
          <p className="tiny muted" style={{ marginTop: -4 }}>Uncovered categories with sourcing signals — illustrative sizing.</p>
          {opps.length === 0 ? <div className="muted">No new signals right now.</div> : (
            <div className="feed">
              {opps.map((o) => (
                <button key={o.id} className="feed-row" style={{ width: '100%', background: 'none', cursor: 'pointer', textAlign: 'left' }} onClick={() => navigate('mining')}>
                  <span className="feed-dot" style={{ background: 'var(--opp)', marginTop: 6 }} />
                  <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 13 }}>{o.group}</b> <span className="tiny muted">{o.lever}</span>
                    <div className="chip-row" style={{ marginTop: 3 }}>{o.signals.slice(0, 3).map((s) => <span key={s} className="badge b-grey">{s}</span>)}</div>
                  </div>
                  <span className="mono small" style={{ fontWeight: 700, color: 'var(--opp)' }}>{money(o.estValue)}</span>
                </button>
              ))}
            </div>
          )}
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

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>What changed</h3><span className="spacer" /><span className="tiny muted">latest activity</span></div>
          {changes.length === 0 ? <div className="muted">No recent activity.</div> : (
            <div className="feed">
              {changes.map((c, i) => (
                <div key={i} className="feed-row">
                  <span className="feed-dot" />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13 }}><b>{c.actor}</b> <span className="badge b-grey" style={{ textTransform: 'capitalize' }}>{c.action}</span> {c.detail}</span>
                  </div>
                  <span className="tiny muted">{dateLabel(c.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card pad">
          <div className="card-h"><h3>Savings sustainment</h3><span className="spacer" /><span className={`badge ${sustain.avg >= 0.9 ? 'b-green' : sustain.avg >= 0.7 ? 'b-amber' : 'b-red'}`}>{pct(sustain.avg)} of plan</span></div>
          <p className="tiny muted" style={{ marginTop: -4 }}>Realized-vs-expected for live, sustained and retired initiatives — does delivered value hold?</p>
          {sustain.items.length === 0 ? <div className="muted">No realizing initiatives yet.</div> : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Initiative</th><th>Band</th><th className="num">Realized</th><th className="num">Expected</th><th className="num">vs plan</th></tr></thead>
                <tbody>
                  {sustain.items.slice(0, 7).map((s) => (
                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => openDrawer(s.id)}>
                      <td><button className="link" style={{ background: 'none', cursor: 'pointer', textAlign: 'left' }}>{s.title}</button></td>
                      <td><span className={`badge ${s.band === 'strong' ? 'b-green' : s.band === 'watch' ? 'b-amber' : 'b-red'}`} style={{ textTransform: 'capitalize' }}>{s.band}</span></td>
                      <td className="num mono">{money(s.realized)}</td>
                      <td className="num mono muted">{money(s.expected)}</td>
                      <td className="num mono" style={{ color: s.score >= 0.9 ? 'var(--green)' : s.score >= 0.7 ? 'var(--amber)' : 'var(--red)' }}>{pct(s.score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {sustain.eroding.length > 0 && <p className="tiny section-gap" style={{ color: 'var(--red)' }}>⚑ {sustain.eroding.length} initiative{sustain.eroding.length > 1 ? 's are' : ' is'} eroding (below 70% of expected) — open a recovery.</p>}
        </div>
      </div>
    </>
  )
}
