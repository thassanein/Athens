import { useState } from 'react'
import { sizedOpportunities, opportunityValue, groupName, personName } from '../lib/engine.js'
import { money, pct } from '../lib/format.js'
import { Tile, PriorityBadge } from '../components/ui.jsx'

export default function Opportunities({ db, caps, user, dispatch, navigate, flash }) {
  const [filter, setFilter] = useState('all')
  const [showCfg, setShowCfg] = useState(false)
  const opps = sizedOpportunities(db).sort((a, b) => b.attractiveness - a.attractiveness)
  const val = opportunityValue(db)
  const list = filter === 'all' ? opps : opps.filter((o) => o.status === filter)

  const claim = async (o) => {
    const res = await dispatch('claimOpportunity', o.id, user.id)
    if (res.error) return flash('Opportunity unavailable')
    if (res.id) { flash('Claimed — a pre-tagged initiative was created'); navigate('initiative', { id: res.id }) }
  }

  return (
    <>
      <p className="page-intro">Spend gaps advertised as claimable opportunities. Bands are <b>illustrative (3% / 6% of addressable group spend)</b> from the configurable savings-% table — pending Supply Chain / FP&A validation. Claiming spins up a pre-tagged initiative and earns a leaderboard bonus.</p>

      <div className="tiles">
        <Tile tone="red" label="Identified opportunity (open)" value={money(val.midpoint)} sub={`${money(val.low)}–${money(val.high)} across ${val.count}`} />
        <Tile tone="dark" label="Hot opportunities" value={opps.filter((o) => o.priority === 'Hot').length} sub="size × ease ÷ risk" />
        <Tile tone="navy" label="Claimed / in-flight" value={opps.filter((o) => o.status !== 'open').length} sub="being delivered" />
      </div>

      <div className="card-h section-gap" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <div className="seg">
          {[['all', 'All'], ['open', 'Open'], ['claimed', 'Claimed'], ['in_flight', 'In-flight']].map(([k, l]) => (
            <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <span className="spacer" />
        {caps.admin && <button className="btn sm" onClick={() => setShowCfg((s) => !s)}>{showCfg ? 'Hide' : 'Edit'} savings-% config</button>}
      </div>

      {showCfg && <ConfigEditor db={db} dispatch={dispatch} user={user} flash={flash} />}

      <div className="grid cols-3 section-gap">
        {list.map((o) => (
          <div key={o.id} className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}><b>{o.groupName}</b><div className="tiny muted">{o.title}</div></div>
              <PriorityBadge priority={o.priority} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="t-value mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)' }}>{money(o.est_low)}–{money(o.est_high)}</span>
            </div>
            <div className="tiny muted">{pct(o.conservative_pct)} / {pct(o.stretch_pct)} of {money(o.groupSpend)} addressable · <i>{o.illustrative}</i></div>
            <div className="chip-row">
              <span className="badge b-navy">{o.approach}</span>
              <span className="badge b-grey">size {o.size_score} · ease {o.ease_score} · risk {o.risk_score}</span>
              <span className="badge b-amber">{o.points} pts</span>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {o.status === 'open' ? (
                <button className="btn accent sm" disabled={!caps.edit} onClick={() => claim(o)}>Claim opportunity</button>
              ) : (
                <>
                  <span className={`badge ${o.status === 'in_flight' ? 'b-navy' : 'b-grey'}`} style={{ textTransform: 'capitalize' }}>{o.status.replace('_', '-')}</span>
                  {o.claimed_by && <span className="tiny muted">by {personName(db, o.claimed_by)}</span>}
                  {o.initiative_id && <button className="btn sm" onClick={() => navigate('initiative', { id: o.initiative_id })}>View →</button>}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function ConfigEditor({ db, dispatch, user, flash }) {
  return (
    <div className="card pad section-gap">
      <div className="card-h"><h3>Savings-% config (illustrative)</h3><span className="spacer" /><span className="tiny muted">edits re-size opportunity bands live</span></div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Sourcing group</th><th className="num">Conservative %</th><th className="num">Stretch %</th></tr></thead>
          <tbody>
            {db.savings_pct_config.map((c) => (
              <tr key={c.group_id}>
                <td>{groupName(db, c.group_id)}</td>
                <td className="num"><PctInput value={c.conservative_pct} onSave={(v) => dispatch('setSavingsPct', c.group_id, { conservative: v }, user.id).then(() => flash('Band updated'))} /></td>
                <td className="num"><PctInput value={c.stretch_pct} onSave={(v) => dispatch('setSavingsPct', c.group_id, { stretch: v }, user.id).then(() => flash('Band updated'))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PctInput({ value, onSave }) {
  const [v, setV] = useState((value * 100).toFixed(1))
  return (
    <input className="input" style={{ width: 80, display: 'inline-block', textAlign: 'right' }} value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { const n = Number(v) / 100; if (!isNaN(n)) onSave(n) }} />
  )
}
