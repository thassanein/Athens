import { useState } from 'react'
import { geoLeaderboard, movementStats, engagement, valueAwards, GEO_DIMS } from '../lib/movement.js'
import { money, pct, num } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'

// Athens Value Creation Movement — the enterprise adoption hub. Region / yard /
// business-unit leaderboards, value awards, and engagement analytics.
export default function Movement({ db, openDrawer, navigate }) {
  const [dim, setDim] = useState('region')
  const s = movementStats(db)
  const board = geoLeaderboard(db, dim)
  const eng = engagement(db)
  const awards = valueAwards(db)
  const podium = board.slice(0, 3)
  const dimLabel = GEO_DIMS.find((d) => d.key === dim)?.label

  return (
    <>
      <div className="movement-banner">
        <div>
          <div className="tiny" style={{ letterSpacing: 1, opacity: 0.85, fontWeight: 700 }}>ATHENS VALUE CREATION MOVEMENT</div>
          <h2 style={{ fontSize: 22, margin: '4px 0 2px', color: '#fff' }}>Find Waste · Create Value · Build Our Future</h2>
          <div className="tiny" style={{ opacity: 0.9 }}>{s.participants} of {s.totalPeople} people creating value across {s.activeInitiatives} initiatives</div>
        </div>
        <span className="spacer" />
        <button className="btn sm" onClick={() => navigate('recognition')} style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', borderColor: 'transparent' }}>Value Champions →</button>
      </div>

      <div className="tiles section-gap">
        <Tile tone="green" label="Value created (YTD)" value={money(s.valueCreated)} sub="FP&A-validated" />
        <Tile tone="navy" label="Total FY value" value={money(s.totalFY)} sub="realized + risk-adjusted forecast" />
        <Tile tone="dark" label="Movement participants" value={`${s.participants}/${s.totalPeople}`} sub="people owning or contributing" />
        <Tile tone="green" label="Active initiatives" value={num(s.activeInitiatives)} sub="in the value pipeline" />
      </div>

      {/* value awards hall of fame */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Value awards</h3><span className="spacer" /><span className="tiny muted">this fiscal period · FY{db.meta.fiscalYear}</span></div>
        <div className="grid cols-3">
          {awards.map((a) => (
            <div key={a.award} className={`award-card ${a.id ? 'clickable' : ''}`} onClick={() => a.id && openDrawer(a.id)}>
              <div className="award-ico">{a.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tiny label" style={{ marginBottom: 1 }}>{a.award}</div>
                <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.winner}</div>
                <div className="tiny muted">{a.sub}</div>
              </div>
              <div className="mono" style={{ fontWeight: 800, color: 'var(--green)' }}>{money(a.value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* geo / org leaderboards */}
      <div className="card-h section-gap">
        <h3>Leaderboards</h3>
        <span className="spacer" />
        <div className="seg">
          {GEO_DIMS.map((d) => <button key={d.key} className={dim === d.key ? 'active' : ''} onClick={() => setDim(d.key)}>{d.label}</button>)}
        </div>
      </div>

      <div className="grid cols-3 section-gap">
        {podium.map((r, i) => (
          <div key={r.name} className="card pad" style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: `3px solid ${['#c9a227', '#9aa7b6', '#b07a3c'][i]}` }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--grey)' }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{r.name}</b>
              <div className="tiny muted">{r.count} initiatives · {r.people} {r.people === 1 ? 'owner' : 'owners'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontWeight: 800, fontSize: 16 }}>{money(r.totalFY)}</div>
              <div className="tiny muted">{money(r.realized)} realized</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>{dimLabel} standings</h3><span className="spacer" /><span className="badge b-navy">{board.length} {dimLabel.toLowerCase()}s</span></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>#</th><th>{dimLabel}</th><th className="num">Initiatives</th><th className="num">Owners</th><th className="num">Realized YTD</th><th className="num">Total FY</th></tr></thead>
            <tbody>
              {board.map((r, i) => (
                <tr key={r.name}>
                  <td className="muted">{i + 1}</td>
                  <td><b>{r.name}</b></td>
                  <td className="num mono muted">{r.count}</td>
                  <td className="num mono muted">{r.people}</td>
                  <td className="num mono" style={{ color: 'var(--green)' }}>{money(r.realized)}</td>
                  <td className="num mono"><b>{money(r.totalFY)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* engagement analytics */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Adoption &amp; engagement</h3><span className="spacer" /><span className="tiny muted">is the movement taking hold?</span></div>
        <div className="grid cols-2">
          {eng.map((e) => (
            <div key={e.key} style={{ padding: '10px 0', borderBottom: '1px solid var(--line-2)' }}>
              <div className="card-h" style={{ marginBottom: 6 }}>
                <b style={{ fontSize: 13 }}>{e.label}</b><span className="spacer" />
                <span className="mono" style={{ fontWeight: 800, color: e.value >= 0.66 ? 'var(--green)' : e.value >= 0.4 ? 'var(--amber)' : 'var(--red)' }}>{pct(e.value)}</span>
              </div>
              <div className="meter"><i style={{ width: `${e.value * 100}%`, background: e.value >= 0.66 ? 'var(--green)' : e.value >= 0.4 ? 'var(--amber)' : 'var(--red)' }} /></div>
              <div className="tiny muted" style={{ marginTop: 4 }}>{e.hint}</div>
            </div>
          ))}
        </div>
        <p className="tiny muted section-gap">Engagement is a movement signal, not a target — the operating model maximizes return. Value only counts once FP&amp;A validates it.</p>
      </div>
    </>
  )
}
