import { useState } from 'react'
import { leaderboard } from '../lib/engine.js'
import { money, pct, num } from '../lib/format.js'
import { Avatar } from '../components/ui.jsx'

const VIEWS = {
  total: { label: 'Total FY Impact', key: 'totalFY', fmt: money, blurb: 'Realized YTD + risk-adjusted forecast FY — the headline ranking.' },
  realized: { label: 'Most Realized', key: 'realized', fmt: money, blurb: 'FP&A-validated value delivered to date — celebrates delivery.' },
  forecast: { label: 'Most Forecasted', key: 'forecastRA', fmt: money, blurb: 'Risk-adjusted forecast for the year — celebrates pipeline strength.' },
  points: { label: 'Engagement', key: 'points', fmt: num, blurb: 'Activity points (provisional value points become permanent on FP&A validation).' },
}

export default function Leaderboard({ db }) {
  const [view, setView] = useState('total')
  const lb = leaderboard(db)
  const v = VIEWS[view]
  const rows = (view === 'total' ? lb.total : lb[view]).filter((r) => r[v.key] > 0)
  const podium = rows.slice(0, 3)

  return (
    <>
      <p className="page-intro">People ranked by the savings they drive — realized and forecasted, each risk- and time-adjusted so the ranking reflects credible value. Split attribution credits contributors without double-counting the enterprise total.</p>

      <div className="card-h">
        <div className="seg" style={{ flexWrap: 'wrap' }}>
          {Object.entries(VIEWS).map(([k, vv]) => <button key={k} className={view === k ? 'active' : ''} onClick={() => setView(k)}>{vv.label}</button>)}
        </div>
      </div>
      <p className="tiny muted" style={{ marginTop: 4 }}>{v.blurb}</p>

      <div className="grid cols-3 section-gap">
        {podium.map((p, i) => (
          <div key={p.id} className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: `3px solid ${['#c9a227', '#9aa7b6', '#b07a3c'][i]}` }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--grey)' }}>{i + 1}</div>
            <Avatar name={p.name} />
            <div style={{ flex: 1 }}>
              <b>{p.name}</b><div className="tiny muted">{p.fn}</div>
              <div className="chip-row" style={{ marginTop: 4 }}>{p.badges.slice(0, 2).map((b) => <span key={b} className="badge b-grey">{b}</span>)}</div>
            </div>
            <div className="mono" style={{ fontWeight: 800, fontSize: 17 }}>{v.fmt(p[v.key])}</div>
          </div>
        ))}
      </div>

      <div className="card pad section-gap">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>#</th><th>Person</th><th>Function</th><th className="num">Realized YTD</th><th className="num">Forecast FY (RA)</th><th className="num">Total FY</th><th className="num">Recurring</th><th className="num">Points</th><th>Badges</th></tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.id}>
                  <td className="muted">{i + 1}</td>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={p.name} /> <b>{p.name}</b></td>
                  <td>{p.fn}</td>
                  <td className="num mono">{money(p.realized)}</td>
                  <td className="num mono">{money(p.forecastRA)}</td>
                  <td className="num mono"><b>{money(p.totalFY)}</b></td>
                  <td className="num mono">{pct(p.recurringRatio)}</td>
                  <td className="num mono">{num(p.points)}</td>
                  <td><div className="chip-row">{p.badges.map((b) => <span key={b} className="badge b-green">{b}</span>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
