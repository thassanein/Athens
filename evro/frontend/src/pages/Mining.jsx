import { mineOpportunities } from '../lib/engine.js'
import { money, pct } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'

// AI opportunity mining — heuristic (rules-based) signal detection over the
// 2025 spend cube. Labeled clearly: not a trained model in the PoC.
export default function Mining({ db, caps, user, dispatch, navigate, flash }) {
  const mined = mineOpportunities(db)
  const fresh = mined.filter((m) => !m.alreadyCovered)
  const totalValue = mined.reduce((a, m) => a + m.estValue, 0)

  const claim = async (m) => {
    const res = await dispatch('claimMined', { group_id: m.group_id, lever: m.lever, estValue: m.estValue }, user.id)
    if (res.id) { flash('Mined opportunity → proposed initiative (awaiting approval)'); navigate('initiative', { id: res.id }) }
  }

  return (
    <>
      <p className="page-intro">AI opportunity mining — automated signal detection over the 2025 AP cube (large categories, supplier fragmentation, off-contract spend, inflation exposure). <i>Rules-based heuristic for the PoC — not a trained model.</i> Recommendations enter the pipeline through the normal approval gate.</p>

      <div className="tiles">
        <Tile tone="red" label="Recommendations" value={mined.length} sub={`${fresh.length} not yet covered`} />
        <Tile tone="navy" label="Identified value" value={money(totalValue)} sub="illustrative (conservative band)" />
        <Tile tone="dark" label="Signals scanned" value="14 groups" sub="116 categories" />
      </div>

      <div className="grid cols-3 section-gap">
        {mined.map((m) => (
          <div key={m.id} className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1 }}><b>{m.group}</b><div className="tiny muted">{m.lever}</div></div>
              {m.alreadyCovered ? <span className="badge b-grey">Covered</span> : <span className="badge b-red">New</span>}
            </div>
            <div className="t-value mono" style={{ fontSize: 21, fontWeight: 800, color: 'var(--red)' }}>{money(m.estValue)}</div>
            <div className="tiny muted">{money(m.spend)} addressable · model confidence {pct(m.confidence)}</div>
            <div className="chip-row">{m.signals.map((s) => <span key={s} className="badge b-amber">{s}</span>)}</div>
            <div className="barline" style={{ marginTop: 2 }}><i style={{ width: `${m.confidence * 100}%`, background: 'var(--navy)' }} /></div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <button className="btn accent sm" disabled={!caps.edit} onClick={() => claim(m)}>Claim → propose initiative</button>
          </div>
        ))}
      </div>
    </>
  )
}
