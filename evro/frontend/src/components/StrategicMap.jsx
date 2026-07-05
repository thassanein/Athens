import { useMemo, useState } from 'react'
import { strategicMap, traceMap, MAP_STATES } from '../lib/decomp.js'
import { money } from '../lib/format.js'
import { STAGE_LABEL } from '../lib/engine.js'

// Strategic Value Map (5B.7 item 8) — functions → initiatives → outcomes as an
// interactive flow map. Node size tracks FY value; colour tracks state
// (realizing / building / at-risk / leaking); dashed edges are blocking
// dependencies. Click any node to trace its connected neighbourhood —
// including the transitive dependency chain — and open the record.

const EDGE_TONE = { flow: 'var(--grey-2)', risk: 'var(--red)', leak: 'var(--amber)' }
const OUT_TONE = { realized: 'var(--green)', forecast: 'var(--navy)', atrisk: 'var(--red)', leaking: 'var(--amber)' }

export default function StrategicMap({ db, navigate }) {
  const map = useMemo(() => strategicMap(db), [db])
  const [sel, setSel] = useState(null)
  const keep = useMemo(() => traceMap(map, sel), [map, sel])

  // ---- layout ---------------------------------------------------------------
  const W = 860
  const colX = { fn: [10, 190], init: [300, 560], out: [660, 850] }
  const gap = 10
  const hFor = (v, min, max, tot) => Math.max(min, Math.min(max, (v / Math.max(1, tot)) * 500))
  const fnTot = map.functions.reduce((a, n) => a + n.value, 0)
  const inTot = map.inits.reduce((a, n) => a + n.value, 0)
  const outTot = map.outcomes.reduce((a, n) => a + n.value, 0)

  const place = (list, x0, x1, getH) => {
    let yPos = 14
    return list.map((n) => { const h = getH(n); const node = { ...n, x: x0, w: x1 - x0, y: yPos, h }; yPos += h + gap; return node })
  }
  const fns = place(map.functions, ...colX.fn, (n) => hFor(n.value, 44, 96, fnTot))
  const ins = place(map.inits, ...colX.init, (n) => hFor(n.value, 30, 64, inTot))
  const outs = place(map.outcomes, ...colX.out, (n) => hFor(n.value, 44, 110, outTot))
  const H = Math.max(...[...fns, ...ins, ...outs].map((n) => n.y + n.h)) + 14

  const byId = {}
  for (const n of fns) byId[n.id] = n
  for (const n of ins) byId[n.id] = n
  for (const n of outs) byId['out:' + n.key] = n

  const bez = (a, b) => {
    const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2
    const mx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
  }
  const dim = (id) => (keep && !keep.has(id) ? 0.14 : 1)
  const edgeDim = (e) => (keep && !(keep.has(e.from) && keep.has(e.to)) ? 0.06 : keep ? 0.9 : 0.55)
  const wOf = (w) => Math.max(1, Math.min(9, Math.sqrt(w / Math.max(1, inTot)) * 26))

  const selNode = sel ? byId[sel] : null
  const selDeps = sel ? map.deps.filter((d) => d.from === sel || d.to === sel) : []

  return (
    <div className="card pad section-gap">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3>Strategic Value Map</h3>
        <span className="spacer" />
        <div className="smap-legend">
          {Object.entries(MAP_STATES).map(([k, s]) => <span key={k} className="smap-leg"><span className="smap-leg-dot" style={{ background: s.tone }} />{s.label}</span>)}
          <span className="smap-leg"><svg width="22" height="8"><line x1="1" y1="4" x2="21" y2="4" stroke="var(--purple, #8B5CF6)" strokeWidth="1.6" strokeDasharray="4 3" /></svg>dependency</span>
        </div>
      </div>
      <p className="muted vwf-sub">
        Where value is created and where it leaks — functions on the left, the value book in
        the middle, outcomes on the right. Click a node to trace everything connected to it
        (dependencies follow the chain both ways).{map.pooled > 0 && <> The tail is pooled into one node — nothing is hidden.</>}
      </p>
      <div className="table-wrap">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 640 }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Strategic value map">
          {/* flow edges */}
          {map.edges.map((e, k) => {
            const a = byId[e.from], b = byId[e.to]
            if (!a || !b) return null
            return <path key={k} d={bez(a, b)} fill="none" stroke={EDGE_TONE[e.kind]} strokeWidth={wOf(e.w)} opacity={edgeDim(e)} strokeLinecap="round" />
          })}
          {/* dependency edges */}
          {map.deps.map((e, k) => {
            const a = byId[e.from], b = byId[e.to]
            if (!a || !b) return null
            return <path key={'d' + k} d={bez(a, b)} fill="none" stroke="var(--purple, #8B5CF6)" strokeWidth="1.6" strokeDasharray="4 3" opacity={keep && !(keep.has(e.from) && keep.has(e.to)) ? 0.08 : 0.85} />
          })}
          {/* functions */}
          {fns.map((n) => (
            <g key={n.id} className="smap-node" opacity={dim(n.id)} onClick={() => setSel(sel === n.id ? null : n.id)}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="7" fill="var(--panel-2)" stroke={sel === n.id ? 'var(--ink)' : 'var(--line)'} strokeWidth="1.2" />
              <text x={n.x + 10} y={n.y + 17} fontSize="11.5" fontWeight="700" fill="var(--ink)">{n.name}</text>
              <text x={n.x + 10} y={n.y + 31} fontSize="10" fill="var(--grey)" className="mono">{money(n.value)} · {n.count} initiatives</text>
              {n.leak > 1000 && <text x={n.x + 10} y={n.y + 43} fontSize="9" fill="var(--amber)">{money(n.leak)} leaking</text>}
            </g>
          ))}
          {/* initiatives */}
          {ins.map((n) => (
            <g key={n.id} className="smap-node" opacity={dim(n.id)} onClick={() => setSel(sel === n.id ? null : n.id)}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="6"
                fill={`color-mix(in srgb, ${MAP_STATES[n.state].tone} 16%, var(--card))`}
                stroke={sel === n.id ? 'var(--ink)' : MAP_STATES[n.state].tone} strokeWidth={sel === n.id ? 1.6 : 1} />
              <text x={n.x + 8} y={n.y + 14} fontSize="10.5" fontWeight="700" fill="var(--ink)">{n.title.length > 34 ? n.title.slice(0, 33) + '…' : n.title}</text>
              <text x={n.x + 8} y={n.y + 26} fontSize="9.5" fill="var(--grey)" className="mono">{money(n.value)}{n.leak > 1000 ? ` · ${money(n.leak)} leak` : ''}</text>
            </g>
          ))}
          {/* outcomes */}
          {outs.map((n) => (
            <g key={n.key} className="smap-node" opacity={dim('out:' + n.key)} onClick={() => setSel(sel === 'out:' + n.key ? null : 'out:' + n.key)}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="7" fill={`color-mix(in srgb, ${OUT_TONE[n.key]} 14%, var(--card))`} stroke={OUT_TONE[n.key]} strokeWidth="1.2" />
              <text x={n.x + 10} y={n.y + 17} fontSize="11" fontWeight="700" fill="var(--ink)">{n.label}</text>
              <text x={n.x + 10} y={n.y + 32} fontSize="11" fontWeight="800" fill={OUT_TONE[n.key]} className="mono">{money(n.value)}</text>
            </g>
          ))}
        </svg>
      </div>
      {selNode && (
        <div className="vwf-drill">
          <div className="vwf-drill-h">
            <b>{selNode.title || selNode.name || selNode.label}</b>
            {selNode.state && <span className="badge" style={{ borderColor: MAP_STATES[selNode.state].tone, color: MAP_STATES[selNode.state].tone }}>{MAP_STATES[selNode.state].label}</span>}
            {selNode.stage && selNode.stage !== 'pooled' && <span className="badge b-grey">{STAGE_LABEL[selNode.stage] || selNode.stage}</span>}
            <span className="spacer" />
            {sel && sel.startsWith('i-') && <button className="btn sm" onClick={() => navigate('initiative', { id: sel })}>Open →</button>}
            <button className="btn sm ghost" onClick={() => setSel(null)}>Clear trace</button>
          </div>
          <div className="smap-detail">
            {selNode.owner && selNode.owner !== '—' && <span>Owner: <b>{selNode.owner}</b></span>}
            {selNode.value != null && <span>FY value: <b className="mono">{money(selNode.value)}</b></span>}
            {selNode.leak > 1000 && <span style={{ color: 'var(--amber)' }}>Leaking: <b className="mono">{money(selNode.leak)}</b></span>}
            {selNode.atrisk > 1000 && <span style={{ color: 'var(--red)' }}>At risk: <b className="mono">{money(selNode.atrisk)}</b></span>}
            {selDeps.length > 0 && <span>⛓ {selDeps.length} blocking dependenc{selDeps.length === 1 ? 'y' : 'ies'} traced (highlighted)</span>}
            {keep && (() => { const n = [...keep].filter((k) => k.startsWith('i-')).length; return <span className="muted">{n} initiative{n === 1 ? '' : 's'} in this trace</span> })()}
          </div>
        </div>
      )}
    </div>
  )
}
