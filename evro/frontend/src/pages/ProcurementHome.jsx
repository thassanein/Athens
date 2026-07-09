import { useMemo } from 'react'
import { procurementModel, decisionQueue } from '../lib/procurement.js'
import { money, num } from '../lib/format.js'
import AgentActions from '../components/AgentActions.jsx'

// Home — the daily driver. Deliberately NOT the dashboard: this screen answers
// one question, "what needs me today?", with a short, ranked action list. The
// numbers/value story lives on the Executive Dashboard, so the two never overlap
// (per exec feedback — one place for actions, one for the story).
export default function ProcurementHome({ db, navigate }) {
  const m = useMemo(() => procurementModel(db), [db])
  const { sum, opportunities } = m
  const decisions = useMemo(() => decisionQueue(db).slice(0, 5), [db])
  const atRisk = useMemo(() => opportunities
    .filter((o) => o.ragStatus === 'red')
    .sort((a, b) => b.value.headline - a.value.headline)
    .slice(0, 5), [opportunities])

  const redCount = opportunities.filter((o) => o.ragStatus === 'red').length
  const rowNav = (id) => ({
    className: 'clickable', role: 'button', tabIndex: 0,
    onClick: () => navigate('opportunity', { id }),
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('opportunity', { id }) } },
  })

  return (
    <>
      {/* One-line pulse — the whole book in a sentence, then straight to the work. */}
      <div className="phome-hero card pad">
        <div className="phome-hero-t">What needs you today</div>
        <div className="phome-pulse">
          <span><b className="mono" style={{ color: 'var(--green)' }}>{money(sum.lenses.realized)}</b> confirmed this year</span>
          <span className="phome-dot" />
          <span><b className="mono">{num(decisionQueue(db).length)}</b> decision{decisionQueue(db).length === 1 ? '' : 's'} waiting</span>
          <span className="phome-dot" />
          <span><b className="mono" style={{ color: redCount ? 'var(--red)' : 'inherit' }}>{num(redCount)}</b> deal{redCount === 1 ? '' : 's'} at risk</span>
        </div>
        <div className="phome-hero-cta">
          <button className="btn sm" onClick={() => navigate('procurement')}>See the numbers →</button>
          <button className="btn sm ghost" onClick={() => navigate('decisioncenter')}>Decision Center →</button>
        </div>
      </div>

      {/* Next best actions — the always-on agents, the top of the to-do list. */}
      <AgentActions db={db} navigate={navigate} />

      <div className="grid cols-2 section-gap">
        {/* Decisions waiting */}
        <div className="card pad">
          <div className="card-h"><h3>Decisions waiting</h3><span className="spacer" /><button className="btn sm" onClick={() => navigate('decisioncenter')}>All →</button></div>
          {decisions.length === 0 ? (
            <p className="muted" style={{ padding: '10px 2px' }}>Clear — nothing is waiting on a decision.</p>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Opportunity</th><th>Next decision</th><th className="num">Expected</th></tr></thead>
                <tbody>
                  {decisions.map((o) => (
                    <tr key={o.id} {...rowNav(o.id)}>
                      <td><b>{o.name}</b><div className="tiny muted">{o.owner} · {o.stageLabel}</div></td>
                      <td>{o.nextDecision.label}{o.nextDecision.missing.length > 0 && <div className="tiny" style={{ color: 'var(--brand-energy)' }}>{o.nextDecision.missing.length} thing{o.nextDecision.missing.length === 1 ? '' : 's'} to provide</div>}</td>
                      <td className="num mono">{money(o.nextDecision.expectedValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* At risk */}
        <div className="card pad">
          <div className="card-h"><h3>Deals at risk</h3><span className="badge b-red">{num(redCount)}</span></div>
          {atRisk.length === 0 ? (
            <p className="muted" style={{ padding: '10px 2px' }}>No red deals — the book is on track.</p>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Opportunity</th><th>Phase</th><th className="num">Value</th></tr></thead>
                <tbody>
                  {atRisk.map((o) => (
                    <tr key={o.id} {...rowNav(o.id)}>
                      <td><b>{o.name}</b><div className="tiny muted">{o.owner} · worst risk {o.worstRisk}</div></td>
                      <td>{o.stageLabel}</td>
                      <td className="num mono">{money(o.value.headline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
