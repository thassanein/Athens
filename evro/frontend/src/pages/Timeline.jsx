import { useEffect, useMemo, useState } from 'react'
import { buildTimeline } from '../lib/timeline.js'
import { money, pct, monthLabel } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'

const STEP_MS = 1100
const KIND = { realized: 'b-green', decision: 'b-navy' }

// Enterprise Timeline — a longitudinal value story across the fiscal year.
// Cumulative realized (solid) → forecast (dashed), month event markers, a
// state-as-of panel, and a playback mode for historical storytelling. View-only.
export default function Timeline({ db, openDrawer }) {
  const t = useMemo(() => buildTimeline(db), [db])
  const [cur, setCur] = useState(t.nowIdx)
  const [playing, setPlaying] = useState(false)
  const n = t.months.length

  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => setCur((v) => (v >= n - 1 ? v : v + 1)), STEP_MS)
    return () => clearInterval(id)
  }, [playing, n])
  useEffect(() => { if (playing && cur >= n - 1) setPlaying(false) }, [playing, cur, n])

  const m = t.months[cur]
  // svg geometry
  const W = 800, H = 300, padL = 54, padR = 16, padT = 16, padB = 40
  const x = (i) => padL + (i / Math.max(1, n - 1)) * (W - padL - padR)
  const y = (v) => H - padB - (v / t.maxVal) * (H - padT - padB)
  const pathUpTo = (from, to) => t.months.slice(from, to + 1).map((mm, k) => `${k === 0 ? 'M' : 'L'}${x(mm.idx).toFixed(1)} ${y(mm.cumValue).toFixed(1)}`).join(' ')
  const areaRealized = `${t.months.slice(0, t.nowIdx + 1).map((mm) => `${x(mm.idx).toFixed(1)},${y(mm.cumValue).toFixed(1)}`).join(' ')} ${x(t.nowIdx).toFixed(1)},${y(0)} ${x(0).toFixed(1)},${y(0)}`
  const gridY = [0.25, 0.5, 0.75, 1].map((f) => f * t.maxVal)

  return (
    <>
      <p className="page-intro">Enterprise Timeline — the value story across FY. Realized value compounds through {monthLabel(t.months[t.nowIdx].key)}, then risk-adjusted forecast carries it to year-end. Scrub or press play to walk the year; each month shows what landed and what was decided.</p>

      <div className="tiles section-gap">
        <Tile tone="green" label="Realized to date" value={money(t.realizedTotal)} sub={`through ${monthLabel(t.months[t.nowIdx].key)}`} />
        <Tile tone="navy" label="Forecast year-end" value={money(t.forecastTotal)} sub="realized + risk-adjusted" />
        <Tile tone="red" label="Value at risk" value={money(t.state.atRisk)} sub={`incl. ${money(t.state.leakage)} leakage`} />
        <Tile tone="opp" label="Identified opportunity" value={money(t.state.opportunity)} sub="not yet in plan" />
      </div>

      <div className="card pad section-gap">
        <div className="card-h">
          <h3>Value timeline</h3>
          <span className="spacer" />
          <button className="btn sm" onClick={() => { if (cur >= n - 1) setCur(0); setPlaying((p) => !p) }}>{playing ? '⏸ Pause' : '▶ Play'}</button>
        </div>
        <div className="table-wrap">
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 620 }} preserveAspectRatio="xMidYMid meet">
            {gridY.map((gv, i) => (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={y(gv)} y2={y(gv)} stroke="var(--line)" strokeWidth="1" />
                <text x={padL - 6} y={y(gv)} textAnchor="end" dominantBaseline="central" fontSize="10" fill="var(--grey)">{money(gv)}</text>
              </g>
            ))}
            {/* realized area */}
            <polygon points={areaRealized} fill="var(--tint-green)" stroke="none" />
            {/* realized (solid) + forecast (dashed) */}
            <path d={pathUpTo(0, t.nowIdx)} fill="none" stroke="var(--green)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
            <path d={pathUpTo(t.nowIdx, n - 1)} fill="none" stroke="var(--navy)" strokeWidth="2.4" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
            {/* month event dots + x labels */}
            {t.months.map((mm) => {
              const dimmed = mm.idx > cur
              const r = mm.eventCount ? 3 + Math.min(6, Math.sqrt(mm.eventCount) * 2.2) : 0
              return (
                <g key={mm.key} style={{ cursor: 'pointer' }} onClick={() => { setPlaying(false); setCur(mm.idx) }} opacity={dimmed ? 0.32 : 1}>
                  <line x1={x(mm.idx)} x2={x(mm.idx)} y1={padT} y2={H - padB} stroke={mm.idx === cur ? 'var(--red)' : 'transparent'} strokeWidth={mm.idx === cur ? 1.5 : 8} strokeOpacity={mm.idx === cur ? 0.9 : 0} />
                  <circle cx={x(mm.idx)} cy={y(mm.cumValue)} r={mm.idx === cur ? 5 : 3} fill={mm.past ? 'var(--green)' : 'var(--navy)'} stroke="var(--bg)" strokeWidth="1.5" />
                  {r > 0 && <circle cx={x(mm.idx)} cy={padT + 6} r={r} fill={mm.realizedMonth ? 'var(--green)' : 'var(--navy)'} fillOpacity="0.55" />}
                  <text x={x(mm.idx)} y={H - padB + 15} textAnchor="middle" fontSize="9.5" fontWeight={mm.idx === cur ? 800 : 400} fill={mm.idx === cur ? 'var(--ink)' : 'var(--grey)'}>{monthLabel(mm.key).split(' ')[0]}</text>
                </g>
              )
            })}
          </svg>
        </div>
        <input type="range" min="0" max={n - 1} value={cur} onChange={(e) => { setPlaying(false); setCur(Number(e.target.value)) }} style={{ width: '100%', marginTop: 6, accentColor: 'var(--red)' }} aria-label="Scrub timeline" />
      </div>

      {/* state as of the cursor month */}
      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>As of {monthLabel(m.key)}</h3><span className="spacer" /><span className={`badge ${m.past ? 'b-green' : 'b-navy'}`}>{m.past ? 'realized' : 'forecast'}</span></div>
          <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Tile tone="green" label="Cumulative value" value={money(m.cumValue)} sub={m.past ? 'realized to date' : 'forecast to date'} />
            <Tile tone="dark" label="This month" value={money(m.realizedMonth)} sub={`${m.eventCount} event${m.eventCount === 1 ? '' : 's'}`} />
          </div>
          <div className="label section-gap">What happened in {monthLabel(m.key)}</div>
          {m.events.length === 0 ? <p className="tiny muted" style={{ margin: 0 }}>{m.past ? 'No recorded activity this month.' : 'Forecast month — no events yet.'}</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {m.events.map((e, i) => (
                <button key={i} className="op-row" onClick={() => e.id && openDrawer(e.id)} style={{ cursor: e.id ? 'pointer' : 'default' }}>
                  <span className={`badge ${KIND[e.kind] || 'b-grey'}`} style={{ flex: 'none' }}>{e.kind}</span>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}><b style={{ fontSize: 13 }}>{e.label}</b>{e.detail && <div className="tiny muted">{e.detail}</div>}</div>
                  {e.value != null && <span className="mono small" style={{ fontWeight: 700, color: 'var(--green)' }}>{money(e.value)}</span>}
                  {e.id && <span style={{ color: 'var(--navy)' }}>→</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card pad">
          <div className="card-h"><h3>Portfolio state</h3><span className="spacer" /><span className="tiny muted">current snapshot</span></div>
          <div className="tiles" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Tile tone="red" label="Value at risk" value={money(t.state.atRisk)} sub={`${t.state.eroding} eroding`} />
            <Tile tone="opp" label="Opportunity" value={money(t.state.opportunity)} sub="identified" />
            <Tile tone="amber" label="Leakage" value={money(t.state.leakage)} sub="vs plan" />
            <Tile tone="navy" label="Sustainment" value={pct(t.state.sustainAvg)} sub="of plan" />
          </div>
          <p className="tiny muted section-gap">The value line is cumulative realized through {monthLabel(t.months[t.nowIdx].key)}, then risk-adjusted forecast to year-end. Risk, opportunity and sustainment are the live portfolio state — deterministic, rules-based, no language model.</p>
        </div>
      </div>
    </>
  )
}
