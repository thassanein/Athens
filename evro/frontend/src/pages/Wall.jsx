import { useState } from 'react'
import { opportunityRiskWall } from '../lib/mission.js'
import { money, pct } from '../lib/format.js'
import { Tile, Bar } from '../components/ui.jsx'

// Strategic Opportunity & Risk Wall (5B.5 item 9) — every open opportunity and
// live risk on one prioritized wall: value impact, signal confidence, owner,
// urgency, and a rapid action per card. Presentation only.

const URG_TONE = { Now: 'var(--red)', 'This month': 'var(--amber)', 'This quarter': 'var(--grey)' }

export default function Wall({ db, navigate }) {
  const [filter, setFilter] = useState('all')
  const w = opportunityRiskWall(db)
  const shown = filter === 'all' ? w.items : w.items.filter((x) => x.type === filter)

  return (
    <>
      <p className="page-intro">
        The <b>Opportunity & Risk Wall</b> — everything worth chasing and everything worth
        protecting, on one prioritized wall. Each card carries its value impact, the
        confidence of the signal behind it, an owner, and an urgency. Act from the card.
      </p>

      <div className="grid cols-4">
        <Tile label="Opportunity on the wall" value={money(w.oppValue)} sub="open, unclaimed pools" tone="green" />
        <Tile label="Value to protect" value={money(w.riskValue)} sub="at risk or leaking · overlap de-duplicated" tone="red" />
        <Tile label="Act now" value={String(w.nowCount)} sub="urgency: Now" tone={w.nowCount ? 'amber' : 'green'} />
        <Tile label="Cards" value={String(w.items.length)} sub="ranked by value impact" tone="dark" />
      </div>

      <div className="card pad section-gap">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3>The wall</h3>
          <span className="spacer" />
          <div className="seg">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
            <button className={filter === 'opportunity' ? 'active' : ''} onClick={() => setFilter('opportunity')}>Opportunities</button>
            <button className={filter === 'risk' ? 'active' : ''} onClick={() => setFilter('risk')}>Risks</button>
          </div>
        </div>
        <div className="wall">
          {shown.map((x) => (
            <div key={`${x.type}-${x.id}`} className={`wall-card wall-${x.type}`}>
              <div className="wall-top">
                <span className={`badge ${x.type === 'opportunity' ? 'b-green' : 'b-red'}`}>{x.type}</span>
                <span className="wall-urg" style={{ color: URG_TONE[x.urgency] }}>{x.urgency}</span>
              </div>
              <div className="wall-t">{x.title}</div>
              <div className="wall-sub">{x.sub}</div>
              <div className="wall-val mono">{money(x.value)}</div>
              <div className="wall-conf" title={x.confNote}>
                <span className="wall-conf-l">confidence</span>
                <span className="wall-conf-b"><Bar value={x.confidence} max={1} color={x.type === 'opportunity' ? 'var(--green)' : 'var(--red)'} height={6} /></span>
                <span className="mono wall-conf-v">{pct(x.confidence)}</span>
              </div>
              <div className="wall-foot">
                <span className="wall-owner">{x.owner}</span>
                <button className="btn sm" onClick={() => (x.nav === 'opportunities' ? navigate('opportunities') : navigate('initiative', { id: x.id }))}>
                  {x.type === 'opportunity' ? 'Claim →' : 'Review →'}
                </button>
              </div>
            </div>
          ))}
          {shown.length === 0 && <div className="muted" style={{ padding: 8 }}>Nothing on the wall for this filter.</div>}
        </div>
      </div>
    </>
  )
}
