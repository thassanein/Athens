import { championList, millionClub, awardsGallery, gamificationStats, summitHighlights, LEVEL_TONE, MEDAL } from '../lib/avcm.js'
import { money, pct, num } from '../lib/format.js'
import { Tile, Avatar } from '../components/ui.jsx'

// AVCM Value Summit — the annual recognition showcase. Champions, the Million
// Dollar Club, an awards gallery, gamification and records. View-only; every
// number is composed from the live portfolio (rules-based, no LLM).
export default function Summit({ db, openDrawer, navigate }) {
  const h = summitHighlights(db)
  const champs = championList(db)
  const mdc = millionClub(db)
  const awards = awardsGallery(db)
  const g = gamificationStats(db)
  const podium = champs.slice(0, 3)
  const LEVEL_ORDER = ['Platinum', 'Gold', 'Silver', 'Bronze']
  const maxLevel = Math.max(1, ...LEVEL_ORDER.map((l) => g.byLevel[l] || 0))

  return (
    <>
      <div className="summit-banner">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tiny" style={{ letterSpacing: 1.4, fontWeight: 800, opacity: 0.9 }}>ATHENS VALUE CREATION MOVEMENT</div>
          <h2 style={{ fontSize: 26, margin: '4px 0 2px', color: '#fff' }}>Value Summit · FY{h.fiscalYear}</h2>
          <div className="tiny" style={{ opacity: 0.92 }}>Celebrating the people who find waste and create value — {h.participants} of {h.totalPeople} contributing.</div>
        </div>
        <span className="spacer" />
        <button className="btn sm" onClick={() => navigate('movement')} style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', borderColor: 'transparent' }}>← Movement hub</button>
      </div>

      <div className="tiles section-gap">
        <Tile tone="green" label="Value created (YTD)" value={money(h.valueCreated)} sub="FP&A-validated" />
        <Tile tone="navy" label="Total FY value" value={money(h.totalFY)} sub="realized + risk-adjusted" />
        <Tile tone="opp" label="Million Dollar Club" value={num(mdc.count)} sub={`${mdc.approaching.length} approaching`} />
        <Tile tone="dark" label="Value players" value={`${g.players}`} sub={`${g.streakers} on an active streak`} />
      </div>

      {/* champion spotlight + podium */}
      <div className="grid cols-2 section-gap">
        {h.champion && (
          <div className="card pad champion-card">
            <div className="tiny label">Value Champion · FY{h.fiscalYear}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
              <div className="champion-avatar"><Avatar name={h.champion.name} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 20 }}>{h.champion.name}</div>
                <div className="tiny muted">{h.champion.fn}</div>
                <div className="chip-row" style={{ marginTop: 6 }}>
                  <span className={`badge ${LEVEL_TONE[h.champion.level] || 'b-grey'}`}>{h.champion.level}</span>
                  <span className="badge b-grey mono">{num(h.champion.points)} pts</span>
                  {h.champion.streak > 0 && <span className="badge b-red">🔥 {h.champion.streak}-mo streak</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontWeight: 800, fontSize: 22, color: 'var(--green)' }}>{money(h.champion.totalFY)}</div>
                <div className="tiny muted">total FY value</div>
              </div>
            </div>
            {h.champion.badges?.length > 0 && <div className="chip-row section-gap">{h.champion.badges.map((b) => <span key={b} className="badge b-navy">{b}</span>)}</div>}
          </div>
        )}
        <div className="card pad">
          <div className="card-h"><h3>Champions podium</h3><span className="spacer" /><button className="btn sm" onClick={() => navigate('leaderboard')}>Full board →</button></div>
          <div className="grid cols-3">
            {podium.map((p, i) => (
              <div key={p.id} className="podium-card" style={{ borderTopColor: ['#c9a227', '#9aa7b6', '#b07a3c'][i] }}>
                <div style={{ fontSize: 22 }}>{['🥇', '🥈', '🥉'][i]}</div>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div className="tiny muted">{p.level} · {num(p.points)} pts</div>
                <div className="mono" style={{ fontWeight: 800, color: 'var(--green)', marginTop: 3 }}>{money(p.totalFY)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* awards gallery */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Awards gallery</h3><span className="spacer" /><span className="tiny muted">this fiscal period</span></div>
        <div className="grid cols-3">
          {awards.map((a) => (
            <div key={a.award} className={`award-card ${a.id ? 'clickable' : ''}`} onClick={() => a.id && openDrawer(a.id)}>
              <div className="award-ico">{a.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tiny label" style={{ marginBottom: 1 }}>{a.award}</div>
                <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.winner}</div>
                <div className="tiny muted">{a.sub}</div>
              </div>
              {a.value != null && <div className="mono" style={{ fontWeight: 800, color: 'var(--green)' }}>{money(a.value)}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* million dollar club */}
      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>💎 Million Dollar Club</h3><span className="spacer" /><span className="badge b-opp">{mdc.count} members</span></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Member</th><th>Level</th><th className="num">Realized</th><th className="num">Total FY</th></tr></thead>
              <tbody>
                {mdc.members.map((p) => (
                  <tr key={p.id}>
                    <td><b>{MEDAL[p.medal]} {p.name}</b></td>
                    <td><span className={`badge ${LEVEL_TONE[p.level] || 'b-grey'}`}>{p.level}</span></td>
                    <td className="num mono">{money(p.realized)}</td>
                    <td className="num mono"><b>{money(p.totalFY)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mdc.approaching.length > 0 && (
            <div className="section-gap">
              <div className="label">Approaching the club</div>
              {mdc.approaching.map((p) => (
                <div key={p.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--line-2)' }}>
                  <div className="card-h" style={{ marginBottom: 5 }}><b style={{ fontSize: 12.5 }}>{p.name}</b><span className="spacer" /><span className="mono tiny">{money(p.totalFY)} / $1M</span></div>
                  <div className="meter"><i style={{ width: `${p.progress * 100}%`, background: 'var(--opp)' }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* gamification */}
        <div className="card pad">
          <div className="card-h"><h3>Gamification</h3><span className="spacer" /><span className="badge b-navy mono">{num(g.totalPoints)} pts in play</span></div>
          <div className="label">Recognition tiers</div>
          {LEVEL_ORDER.map((l) => (
            <div key={l} style={{ display: 'grid', gridTemplateColumns: '86px 1fr 34px', gap: 10, alignItems: 'center', padding: '5px 0' }}>
              <span className={`badge ${LEVEL_TONE[l] || 'b-grey'}`}>{l}</span>
              <div className="meter"><i style={{ width: `${((g.byLevel[l] || 0) / maxLevel) * 100}%`, background: l === 'Platinum' ? 'var(--navy)' : l === 'Gold' ? 'var(--amber)' : l === 'Silver' ? 'var(--grey)' : 'var(--red)' }} /></div>
              <span className="mono tiny right" style={{ fontWeight: 700 }}>{g.byLevel[l] || 0}</span>
            </div>
          ))}
          <div className="tiles section-gap" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Tile tone="red" label="Longest streak" value={`${g.longestStreak} mo`} sub={`${g.streakers} on a streak`} />
            <Tile tone="green" label="Badges earned" value={num(g.badges.reduce((s, b) => s + b.count, 0))} sub={`${g.badges.length} badge types`} />
          </div>
          {g.badges.length > 0 && (
            <div className="chip-row section-gap">
              {g.badges.map((b) => <span key={b.name} className="badge b-grey">{b.name} · {b.count}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* records */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Summit records</h3><span className="spacer" /><span className="tiny muted">FY{h.fiscalYear} marquee</span></div>
        <div className="grid cols-3">
          {h.record && (
            <button className="record-card" onClick={() => openDrawer(h.record.id)}>
              <div className="tiny label">🚀 Biggest single return</div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{h.record.title}</div>
              <div className="mono" style={{ fontWeight: 800, color: 'var(--green)', marginTop: 3 }}>{money(h.record.value)}</div>
            </button>
          )}
          {h.topRegion && (
            <div className="record-card">
              <div className="tiny label">📍 Top region</div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{h.topRegion.name}</div>
              <div className="mono" style={{ fontWeight: 800, color: 'var(--green)', marginTop: 3 }}>{money(h.topRegion.totalFY)}</div>
            </div>
          )}
          {h.topBU && (
            <div className="record-card">
              <div className="tiny label">⚙️ Top business unit</div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{h.topBU.name}</div>
              <div className="mono" style={{ fontWeight: 800, color: 'var(--green)', marginTop: 3 }}>{money(h.topBU.totalFY)}</div>
            </div>
          )}
        </div>
      </div>

      <p className="tiny muted section-gap">Recognition and streaks are movement signals, not targets — the operating model maximizes return. Value counts only once FP&amp;A validates it, and procurement is celebrated on its own board.</p>
    </>
  )
}
