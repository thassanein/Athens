import { useMemo, useState } from 'react'
import { valueWaterfall, WATERFALL_SCENARIOS } from '../lib/decomp.js'
import { money } from '../lib/format.js'

// Enterprise Value Waterfall (5B.7 item 4) — Potential → Stage risk →
// Adoption → RAV → Leakage → Net realizable → Realized. Bars are clickable
// (drill-through to the initiatives and owners behind each step); a scenario
// lens recomputes the decomposition and shows base-case ghosts for comparison.

const TONE = { start: 'var(--navy)', down: 'var(--red)', mid: 'var(--grey-2)', end: 'var(--green)' }

export default function ValueWaterfall({ db, navigate }) {
  const [scen, setScen] = useState('base')
  const [drillKey, setDrillKey] = useState(null)
  const wf = useMemo(() => valueWaterfall(db, scen), [db, scen])
  const base = useMemo(() => (scen === 'base' ? null : valueWaterfall(db, 'base')), [db, scen])
  const scens = WATERFALL_SCENARIOS(db)
  const drill = wf.steps.find((s) => s.key === drillKey)

  // geometry — running level for the down-steps; full bars for start/mid/end
  const W = 760, H = 250, padT = 26, padB = 40
  const maxY = Math.max(wf.potential, base?.potential || 0) * 1.06
  const y = (v) => padT + (1 - v / maxY) * (H - padT - padB)
  const colW = (W - 30) / wf.steps.length
  let level = 0
  const bars = wf.steps.map((s, idx) => {
    let top, bottom
    if (s.kind === 'down') { top = level; bottom = level + s.value; level = bottom }
    else { top = s.value; bottom = 0; level = s.value }
    return { ...s, idx, top: Math.max(top, bottom), bottom: Math.min(top, bottom) }
  })
  let bLevel = 0
  const ghosts = base ? base.steps.map((s) => {
    let top, bottom
    if (s.kind === 'down') { top = bLevel; bottom = bLevel + s.value; bLevel = bottom }
    else { top = s.value; bottom = 0; bLevel = s.value }
    return { key: s.key, value: s.value, top: Math.max(top, bottom), bottom: Math.min(top, bottom) }
  }) : null

  return (
    <div className="card pad section-gap">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3>Enterprise Value Waterfall</h3>
        <span className="spacer" />
        <div className="seg">
          {scens.map((s) => (
            <button key={s.key} className={scen === s.key ? 'active' : ''} onClick={() => setScen(s.key)} title={s.description}>{s.name}</button>
          ))}
        </div>
      </div>
      <p className="muted vwf-sub">
        How gross potential becomes validated value — and where it thins out on the way.
        Click a bar to see the initiatives and owners behind it.
        {wf.scenario && scen !== 'base' && <> Lens: <b>{wf.scenario.name}</b> — {wf.scenario.description} Base case shown as outlines.</>}
      </p>
      <div className="table-wrap">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 560 }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Enterprise value waterfall">
          {ghosts && ghosts.map((g, i) => (
            <rect key={g.key} x={15 + i * colW + colW * 0.16} y={y(g.top)} width={colW * 0.68} height={Math.max(2, y(g.bottom) - y(g.top))}
              fill="none" stroke="var(--grey-2)" strokeDasharray="4 3" strokeWidth="1.2" rx="3" />
          ))}
          {bars.map((b) => {
            const x = 15 + b.idx * colW + colW * 0.16, bw = colW * 0.68
            const gv = ghosts?.find((g) => g.key === b.key)
            const delta = gv ? b.value - gv.value : 0
            // labels sit above whichever is taller — the live bar or the ghost
            const labelY = Math.min(y(b.top), gv ? y(gv.top) : Infinity)
            return (
              <g key={b.key} className={b.drill ? 'vwf-bar' : ''} onClick={() => b.drill && setDrillKey(drillKey === b.key ? null : b.key)}>
                {b.idx > 0 && <line x1={15 + (b.idx - 1) * colW + colW * 0.16 + colW * 0.68} x2={x} y1={y(bars[b.idx - 1].kind === 'down' ? bars[b.idx - 1].bottom : bars[b.idx - 1].top)} y2={y(b.kind === 'down' ? b.top : b.top)} stroke="var(--grey-2)" strokeWidth="1" strokeDasharray="3 3" />}
                <rect x={x} y={y(b.top)} width={bw} height={Math.max(2.5, y(b.bottom) - y(b.top))} rx="3"
                  fill={TONE[b.kind]} opacity={drillKey && drillKey !== b.key ? 0.45 : 1}
                  stroke={drillKey === b.key ? 'var(--ink)' : 'none'} strokeWidth="1.5" />
                <text x={x + bw / 2} y={labelY - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill={b.kind === 'down' ? 'var(--red)' : 'var(--ink)'}>
                  {b.kind === 'down' ? `−${money(Math.abs(b.value))}` : money(b.value)}
                </text>
                {gv && Math.abs(delta) > 1000 && (
                  // a signed value change is good news iff it's positive — for
                  // down-bars that means a smaller subtraction, for level bars
                  // a higher landing
                  <text x={x + bw / 2} y={labelY - 18} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={delta >= 0 ? 'var(--green)' : 'var(--red)'}>
                    {delta >= 0 ? '+' : '−'}{money(Math.abs(delta))} vs base
                  </text>
                )}
                <text x={x + bw / 2} y={H - padB + 15} textAnchor="middle" fontSize="10" fill="var(--grey)">
                  {b.label.length > 19 ? b.label.slice(0, 18) + '…' : b.label}
                </text>
                {b.drill && <text x={x + bw / 2} y={H - padB + 27} textAnchor="middle" fontSize="8.5" fill="var(--grey-2)">drill ↧</text>}
              </g>
            )
          })}
        </svg>
      </div>
      {drill && (
        <div className="vwf-drill">
          <div className="vwf-drill-h">
            <b>{drill.label}</b>
            <span className="muted" style={{ fontSize: 12 }}> — {drill.note}</span>
            <span className="spacer" />
            <button className="btn sm ghost" onClick={() => setDrillKey(null)}>Close</button>
          </div>
          {(drill.drill || []).map((r) => (
            <button key={r.id} className="vwf-row" onClick={() => r.id && !r.id.startsWith('__') && navigate('initiative', { id: r.id })}>
              <span className="vwf-row-t">{r.title}</span>
              <span className="vwf-row-o">{r.owner}</span>
              {r.sub && <span className="vwf-row-s">{r.sub}</span>}
              <span className="mono vwf-row-v">{money(r.value)}</span>
            </button>
          ))}
          {!(drill.drill || []).length && <div className="muted" style={{ fontSize: 12, padding: 6 }}>Nothing material behind this step right now.</div>}
        </div>
      )}
    </div>
  )
}
