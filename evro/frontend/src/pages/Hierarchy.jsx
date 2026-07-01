import { useState } from 'react'
import { portfolioRollup, programRollup, rav, realizedYTD, personName, STAGE_LABEL } from '../lib/engine.js'
import { money } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'

// Portfolio > Program > Initiative hierarchy with roll-up analytics.
export default function Hierarchy({ db, openDrawer }) {
  const [open, setOpen] = useState({})
  const portfolios = portfolioRollup(db)
  const programs = programRollup(db)
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }))
  const total = portfolios.reduce((a, p) => a + p.totalFY, 0)
  const atRisk = portfolios.reduce((a, p) => a + p.atRisk, 0)

  return (
    <>
      <p className="page-intro">Enterprise hierarchy — Portfolio › Program › Initiative, with roll-up value. Expand to drill; click an initiative to open it.</p>

      <div className="tiles">
        <Tile tone="dark" label="Portfolios" value={portfolios.length} sub={`${programs.length} programs`} />
        <Tile tone="green" label="Total FY value" value={money(total)} sub="realized + RA forecast" />
        <Tile tone="red" label="Value at risk" value={money(atRisk)} sub="red initiatives" />
      </div>

      <div className="card pad section-gap">
        <table className="tbl" style={{ width: '100%' }}>
          <thead><tr><th>Portfolio / Program / Initiative</th><th className="num">Items</th><th className="num">Realized</th><th className="num">RA pipeline</th><th className="num">Total FY</th></tr></thead>
          <tbody>
            {portfolios.map((pf) => (
              <PortfolioRows key={pf.id} pf={pf} programs={programs.filter((p) => p.portfolio_id === pf.id)} db={db} open={open} toggle={toggle} openDrawer={openDrawer} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function PortfolioRows({ pf, programs, db, open, toggle, openDrawer }) {
  return (
    <>
      <tr className="clickable" onClick={() => toggle(pf.id)} style={{ background: 'var(--tint-navy)' }}>
        <td><b>{open[pf.id] ? '▾' : '▸'} {pf.name}</b></td>
        <td className="num">{pf.count}</td><td className="num mono">{money(pf.realized)}</td><td className="num mono">{money(pf.raPipeline)}</td><td className="num mono"><b>{money(pf.totalFY)}</b></td>
      </tr>
      {open[pf.id] && programs.map((pg) => (
        <ProgramRows key={pg.id} pg={pg} db={db} open={open} toggle={toggle} openDrawer={openDrawer} />
      ))}
    </>
  )
}

function ProgramRows({ pg, db, open, toggle, openDrawer }) {
  const inits = db.initiatives.filter((i) => i.program_id === pg.id && i.stage !== 'proposed').sort((a, b) => rav(b) - rav(a))
  return (
    <>
      <tr className="clickable" onClick={() => toggle(pg.id)} style={{ background: 'var(--line-2)' }}>
        <td style={{ paddingLeft: 24 }}>{open[pg.id] ? '▾' : '▸'} {pg.name}</td>
        <td className="num">{pg.count}</td><td className="num mono">{money(pg.realized)}</td><td className="num mono">{money(pg.raPipeline)}</td><td className="num mono">{money(pg.totalFY)}</td>
      </tr>
      {open[pg.id] && inits.map((i) => (
        <tr key={i.id} className="clickable" onClick={() => openDrawer(i.id)}>
          <td style={{ paddingLeft: 44 }} className="small">{i.title} <span className="tiny muted">· {STAGE_LABEL[i.stage]}</span></td>
          <td className="num">—</td><td className="num mono">{money(realizedYTD(i, db))}</td><td className="num mono">{money(rav(i))}</td><td className="num mono">{money(realizedYTD(i, db) + rav(i) * 0.5)}</td>
        </tr>
      ))}
    </>
  )
}
