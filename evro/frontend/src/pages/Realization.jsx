import { useState } from 'react'
import { realizationWaterfall, REAL_DIMS } from '../lib/realization.js'
import { portfolioHealth, HEALTH_DIMS } from '../lib/health.js'
import { money, pct } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { IconAI } from '../components/Icons.jsx'

const DIM_ABBR = { Financial: 'Fin', Implementation: 'Impl', Technology: 'Tech', Adoption: 'Adopt', Governance: 'Gov', Sustainment: 'Sust' }

// Benefits Realization Waterfall — "where did the value go?" Gross → losses →
// realized, drillable by business unit / region / yard / owner / department.
export default function Realization({ db, openDrawer }) {
  const [dim, setDim] = useState('business_unit')
  const [filter, setFilter] = useState(null)
  const w = realizationWaterfall(db, { dimension: dim, filter })
  const dimLabel = REAL_DIMS.find((d) => d.key === dim)?.label

  return (
    <>
      <p className="page-intro">Benefits realization — <b>where did the value go?</b> Gross identified value (year-to-date) decomposed into implementation, timing, adoption and leakage losses, reconciling exactly to FP&amp;A-validated realized value. Drill by any dimension; the shaded losses are recoverable.</p>

      <div className="card-h">
        <div className="seg" style={{ flexWrap: 'wrap' }}>
          {REAL_DIMS.map((d) => <button key={d.key} className={dim === d.key ? 'active' : ''} onClick={() => { setDim(d.key); setFilter(null) }}>{d.label}</button>)}
        </div>
        <span className="spacer" />
        {filter && <button className="btn sm" onClick={() => setFilter(null)}>✕ {filter}</button>}
        <span className="tiny muted">{w.count} initiatives{filter ? ` · ${dimLabel}: ${filter}` : ''}</span>
      </div>

      <div className="tiles section-gap">
        <Tile tone="navy" label="Gross value (YTD)" value={money(w.gross)} sub="full identified potential to date" />
        <Tile tone="green" label="Realized (YTD)" value={money(w.realized)} sub={`${pct(w.gross ? w.realized / w.gross : 1)} of gross`} />
        <Tile tone="red" label="Total value lost" value={money(w.loss)} sub="implementation + timing + adoption + leakage" />
        <Tile tone="amber" label="Recoverable" value={money(w.recoverable)} sub="adoption + leakage — actionable" />
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>Value realization waterfall</h3><span className="spacer" /><span className="tiny muted">gross → losses → realized · shaded = recoverable</span></div>
        <WaterfallBridge steps={w.steps} />
      </div>

      <div className="card pad section-gap" style={{ borderLeft: '3px solid var(--navy)' }}>
        <div className="card-h"><h3 style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span className="copilot-logo" style={{ width: 22, height: 22 }}><IconAI /></span> Root cause &amp; recovery</h3><span className="spacer" /><span className="badge b-grey">rules-based</span></div>
        <p style={{ fontSize: 14, margin: '2px 0 6px' }}>Largest leak: <b>{w.topLoss.label} loss</b> at <b>{money(w.topLoss.value)}</b>{filter ? ` in ${filter}` : ''}.</p>
        <p style={{ fontSize: 13.5, margin: 0, color: 'var(--grey)' }}>{w.topLoss.rec}</p>
        <div className="chip-row section-gap">
          {w.cats.map((c) => <span key={c.key} className={`badge ${c.value === w.topLoss.value ? 'b-red' : 'b-grey'}`}>{c.label}: {money(c.value)}</span>)}
        </div>
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>By {dimLabel.toLowerCase()}</h3><span className="spacer" /><span className="tiny muted">click a row to drill</span></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>{dimLabel}</th><th className="num">Initiatives</th><th className="num">Gross (YTD)</th><th className="num">Realized</th><th className="num">Lost</th><th className="num">Recoverable</th><th className="num">Realized %</th></tr></thead>
            <tbody>
              {w.byDim.map((d) => (
                <tr key={d.name} className="clickable" onClick={() => setFilter(filter === d.name ? null : d.name)} style={filter === d.name ? { background: 'var(--tint-navy)' } : undefined}>
                  <td><b>{d.name}</b></td>
                  <td className="num mono muted">{d.count}</td>
                  <td className="num mono">{money(d.gross)}</td>
                  <td className="num mono" style={{ color: 'var(--green)' }}>{money(d.realized)}</td>
                  <td className="num mono" style={{ color: 'var(--red)' }}>{money(d.loss)}</td>
                  <td className="num mono" style={{ color: 'var(--amber)' }}>{money(d.recoverable)}</td>
                  <td className="num mono" style={{ color: d.pct >= 0.5 ? 'var(--green)' : d.pct >= 0.25 ? 'var(--amber)' : 'var(--red)' }}>{pct(d.pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny muted section-gap">Losses are derived from stage confidence, realization factor, implemented-vs-negotiated leakage and timing — labeled illustrative where not directly measured. Only FP&amp;A-validated value counts as realized.</p>
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>Portfolio execution health</h3><span className="spacer" /><span className="tiny muted">6-dimension heatmap · worst first · click to drill</span></div>
        <HealthHeatmap rows={portfolioHealth(db).slice(0, 14)} onPick={openDrawer} />
        <p className="tiny muted section-gap">Derived execution-health signals (illustrative): green ≥ 75% · amber 50–75% · red &lt; 50%. Financial, implementation, technology, adoption, governance, sustainment.</p>
      </div>
    </>
  )
}

function HealthHeatmap({ rows, onPick }) {
  const band = (v) => (v >= 0.75 ? 'green' : v >= 0.5 ? 'amber' : 'red')
  return (
    <div className="table-wrap">
      <table className="tbl heatmap">
        <thead>
          <tr><th>Initiative</th>{HEALTH_DIMS.map((d) => <th key={d} className="num" title={d}>{DIM_ABBR[d]}</th>)}<th className="num">Overall</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="clickable" onClick={() => onPick(r.id)}>
              <td><b>{r.title.length > 34 ? r.title.slice(0, 33) + '…' : r.title}</b></td>
              {HEALTH_DIMS.map((d) => { const c = band(r.current[d]); return <td key={d} className="num" style={{ background: `var(--tint-${c})`, color: `var(--${c})`, fontWeight: 700 }}>{Math.round(r.current[d] * 100)}</td> })}
              <td className="num mono"><b style={{ color: `var(--${band(r.overall)})` }}>{Math.round(r.overall * 100)}%</b></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Horizontal waterfall: gross (navy) → losses (red, shaded if recoverable) → realized (green).
function WaterfallBridge({ steps }) {
  const max = Math.max(...steps.map((s) => (s.kind ? s.value : 0)), 1)
  let running = 0
  return (
    <div className="bridge">
      {steps.map((s, k) => {
        if (s.kind) {
          running = s.value
          const wd = (s.value / max) * 100
          return (
            <div key={k} className="bridge-row">
              <span className="bridge-lbl"><b>{s.label}</b></span>
              <div className="bridge-track"><i style={{ left: 0, width: `${wd}%`, background: s.kind === 'total' ? 'var(--green)' : 'var(--navy)' }} /></div>
              <span className="bridge-val mono"><b>{money(s.value)}</b></span>
            </div>
          )
        }
        const start = running
        running += s.delta
        const left = (Math.min(start, running) / max) * 100
        const wd = (Math.abs(s.delta) / max) * 100
        return (
          <div key={k} className="bridge-row">
            <span className="bridge-lbl muted">{s.label}{s.recoverable ? ' ◇' : ''}</span>
            <div className="bridge-track"><i style={{ left: `${left}%`, width: `${Math.max(wd, 0.4)}%`, background: 'var(--red)', opacity: s.recoverable ? 0.55 : 1 }} /></div>
            <span className="bridge-val mono" style={{ color: 'var(--red)' }}>{s.delta === 0 ? '—' : `−${money(Math.abs(s.delta))}`}</span>
          </div>
        )
      })}
    </div>
  )
}
