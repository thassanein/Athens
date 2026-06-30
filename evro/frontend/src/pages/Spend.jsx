import { useState } from 'react'
import { spendRollup } from '../lib/engine.js'
import { money, pct, num } from '../lib/format.js'
import { Tile, Bar } from '../components/ui.jsx'

export default function Spend({ db }) {
  const [addr, setAddr] = useState(true)
  const [sel, setSel] = useState(null)
  const roll = spendRollup(db, { addressableOnly: addr })
  const group = roll.groups.find((g) => g.id === sel) || roll.groups[0]
  const maxGroup = Math.max(...roll.groups.map((g) => g.spend))

  return (
    <>
      <p className="page-intro">The 2025 AP register: {num(roll.groups.reduce((a, g) => a + g.catCount, 0))} categories across 14 sourcing groups. Addressable spend is the platform's working surface; non-addressable (franchise fees, disposal pass-through, taxes, WC, pension) is loaded but excluded from opportunity sizing.</p>

      <div className="tiles">
        <Tile tone="navy" label="Addressable spend" value={money(roll.addressableTotal)} sub="14 groups · primary surface" />
        <Tile tone="grey" label="Non-addressable" value={money(roll.nonAddressableTotal)} sub="loaded, excluded from sizing" />
        <Tile tone="red" label="Off-contract / maverick" value={money(roll.maverickTotal)} sub="spend-analytics signal" />
      </div>

      <div className="card-h section-gap">
        <div className="seg">
          <button className={addr ? 'active' : ''} onClick={() => setAddr(true)}>Addressable</button>
          <button className={!addr ? 'active' : ''} onClick={() => setAddr(false)}>All spend</button>
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Sourcing groups</h3><span className="spacer" /><span className="tiny muted">click to drill</span></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Group</th><th>Share</th><th className="num">Spend</th><th className="num">Cats</th><th className="num">Maverick</th></tr></thead>
              <tbody>
                {roll.groups.map((g) => (
                  <tr key={g.id} className="clickable" onClick={() => setSel(g.id)} style={{ background: g.id === group.id ? 'var(--tint-navy)' : undefined }}>
                    <td><b>{g.name}</b>{g.fragmented && <span className="badge b-amber" style={{ marginLeft: 6 }}>fragmented</span>}</td>
                    <td style={{ width: 110 }}><Bar value={g.spend} max={maxGroup} /></td>
                    <td className="num mono">{money(g.spend)}</td>
                    <td className="num">{g.catCount}</td>
                    <td className="num mono" style={{ color: g.maverickValue ? 'var(--red)' : undefined }}>{money(g.maverickValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card pad">
          <div className="card-h"><h3>Pareto concentration</h3></div>
          <p className="tiny muted">Cumulative share of addressable spend — a few groups hold most of the prize.</p>
          <div className="table-wrap section-gap">
            <table className="tbl">
              <thead><tr><th>Group</th><th>Cumulative</th><th className="num">Cum %</th></tr></thead>
              <tbody>
                {roll.pareto.slice(0, 8).map((p) => (
                  <tr key={p.name}><td>{p.name}</td><td style={{ width: 140 }}><Bar value={p.cumPct} max={1} color="var(--green)" /></td><td className="num mono">{pct(p.cumPct)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>{group.name} — categories</h3><span className="spacer" />
          <span className="badge b-grey">{money(group.spend)}</span>
          <span className="badge b-navy">top-3 = {pct(group.concentration)}</span>
          <span className="badge b-red">maverick {pct(group.maverickPct, 1)}</span>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Category</th><th>Share</th><th className="num">2025 spend</th><th className="num">Addressable %</th><th>P&L</th><th>Type</th></tr></thead>
            <tbody>
              {group.categories.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td style={{ width: 120 }}><Bar value={c.spend} max={group.categories[0].spend} /></td>
                  <td className="num mono">{money(c.spend)}</td>
                  <td className="num">{c.addressable_pct}%</td>
                  <td>{c.pnl_line === 'cogs' ? 'COGS' : 'OpEx'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.recurrence === 'one_time' ? 'Capex / one-time' : 'Recurring'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!addr && (
        <div className="card pad section-gap">
          <div className="card-h"><h3>Non-addressable spend</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Category</th><th className="num">2025 spend</th></tr></thead>
              <tbody>
                {roll.nonAddressable.map((c) => <tr key={c.id}><td>{c.name}</td><td className="num mono">{money(c.spend)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
