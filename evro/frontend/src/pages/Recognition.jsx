import { useState } from 'react'
import { recognition, POINT_LEVELS } from '../lib/engine.js'
import { money, num } from '../lib/format.js'
import { Avatar } from '../components/ui.jsx'

// Value Champion Dashboard — recognition + gamification layer.
// Levels, Million Dollar Club, streaks and achievement badges turn realized
// value into reputation, so the whole org (not just Procurement) competes.
const LEVEL_COLOR = { Platinum: '#7c8aa0', Gold: '#c9a227', Silver: '#9aa7b6', Bronze: '#b07a3c' }
const LEVEL_TONE = { Platinum: 'b-navy', Gold: 'b-amber', Silver: 'b-grey', Bronze: 'b-grey' }

function LevelChip({ level }) {
  return <span className={`badge ${LEVEL_TONE[level] || 'b-grey'}`} style={{ borderLeft: `3px solid ${LEVEL_COLOR[level]}` }}>{level}</span>
}

function Streak({ n }) {
  if (!n) return <span className="tiny muted">—</span>
  return <span className="badge b-green" title={`${n} consecutive months of validated value`}>🔥 {n}-mo streak</span>
}

function Board({ title, rows, badge }) {
  return (
    <div className="card pad section-gap">
      <div className="card-h"><h3>{title}</h3><span className="spacer" />{badge}</div>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr><th>#</th><th>Champion</th><th>Function</th><th>Level</th><th className="num">Realized YTD</th><th className="num">Total FY</th><th className="num">Points</th><th>Streak</th></tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id}>
                <td className="muted">{i + 1}</td>
                <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={p.name} /> <b>{p.name}</b>{p.millionClub && <span title="Million Dollar Club">💎</span>}</td>
                <td>{p.fn}</td>
                <td><LevelChip level={p.level} /></td>
                <td className="num mono">{money(p.realized)}</td>
                <td className="num mono"><b>{money(p.totalFY)}</b></td>
                <td className="num mono">{num(p.points)}</td>
                <td><Streak n={p.streak} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="8" className="muted">No champions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Recognition({ db }) {
  const [scope, setScope] = useState('org')
  const r = recognition(db)
  const orgRows = r.org.total.map((p) => r.people.find((x) => x.id === p.id) || p)
  const procRows = r.procurement.total.map((p) => r.people.find((x) => x.id === p.id) || p)
  const podium = (scope === 'org' ? orgRows : procRows).slice(0, 3)

  return (
    <>
      <p className="page-intro">Recognition turns realized value into reputation. Champions earn a tier from their <b>points</b> (provisional on creation, permanent once FP&amp;A validates), join the <b>Million Dollar Club</b> at $1M total FY impact, and build <b>streaks</b> for consecutive months of validated value. Procurement is celebrated on its own board so the rest of the organization can compete.</p>

      <div className="grid cols-4 section-gap">
        {POINT_LEVELS.map((l) => (
          <div key={l.name} className="card pad" style={{ borderTop: `3px solid ${LEVEL_COLOR[l.name]}` }}>
            <div className="t-label">{l.name}</div>
            <div className="t-value mono" style={{ fontSize: 26 }}>{r.byLevel[l.name] || 0}</div>
            <div className="tiny muted">{l.min ? `≥ ${num(l.min)} pts` : 'getting started'}</div>
          </div>
        ))}
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>💎 Million Dollar Club</h3><span className="spacer" /><span className="badge b-green">{r.millionClub.length} member{r.millionClub.length === 1 ? '' : 's'}</span></div>
        <p className="tiny muted" style={{ marginTop: -6, marginBottom: 10 }}>$1M+ total FY impact (realized YTD + risk-adjusted forecast).</p>
        {r.millionClub.length ? (
          <div className="grid cols-3">
            {r.millionClub.map((p) => (
              <div key={p.id} className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <Avatar name={p.name} />
                <div style={{ flex: 1 }}>
                  <b>{p.name}</b> <LevelChip level={p.level} />
                  <div className="tiny muted">{p.fn}</div>
                </div>
                <div className="mono" style={{ fontWeight: 800 }}>{money(p.totalFY)}</div>
              </div>
            ))}
          </div>
        ) : <p className="muted">No members yet — the first to $1M total FY impact joins the club.</p>}
      </div>

      <div className="card-h section-gap">
        <h3>Champion standings</h3>
        <span className="spacer" />
        <div className="seg">
          <button className={scope === 'org' ? 'active' : ''} onClick={() => setScope('org')}>Organization</button>
          <button className={scope === 'proc' ? 'active' : ''} onClick={() => setScope('proc')}>Procurement</button>
        </div>
      </div>

      <div className="grid cols-3 section-gap">
        {podium.map((p, i) => (
          <div key={p.id} className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: `3px solid ${['#c9a227', '#9aa7b6', '#b07a3c'][i]}` }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--grey)' }}>{i + 1}</div>
            <Avatar name={p.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{p.name}</b> {p.millionClub && <span title="Million Dollar Club">💎</span>}
              <div className="tiny muted">{p.fn}</div>
              <div className="chip-row" style={{ marginTop: 5 }}><LevelChip level={p.level} /><Streak n={p.streak} /></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontWeight: 800, fontSize: 16 }}>{money(p.totalFY)}</div>
              <div className="tiny muted">{num(p.points)} pts</div>
            </div>
          </div>
        ))}
      </div>

      {scope === 'org'
        ? <Board title="Organization champions" rows={orgRows} badge={<span className="badge b-navy">all functions</span>} />
        : <Board title="Procurement champions" rows={procRows} badge={<span className="badge b-navy">separate metrics</span>} />}

      <p className="tiny muted section-gap">Points are an engagement signal, not a target — the operating model maximizes return, and value only counts as realized once FP&amp;A validates it.</p>
    </>
  )
}
