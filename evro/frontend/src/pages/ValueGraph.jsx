import { useMemo, useState } from 'react'
import { buildValueGraph, GRAPH_DIMS } from '../lib/valuegraph.js'
import { money, pct, num } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'

const RAGC = { red: 'var(--red)', amber: 'var(--amber)', green: 'var(--green)' }
const groupColor = (g) => (g.atRisk === 0 ? 'var(--navy)' : g.atRisk / g.count >= 0.4 ? 'var(--red)' : 'var(--amber)')

// Enterprise Value Graph — a relationship view of where value concentrates:
// Enterprise → dimension groups (region / BU / department / owner) → initiatives,
// sized by value, edged by value share, with concentration risk. View-only.
export default function ValueGraph({ db, openDrawer }) {
  const [dimension, setDim] = useState('region')
  const [pillar, setPillar] = useState('all')
  const [hi, setHi] = useState(null)
  const g = useMemo(() => buildValueGraph(db, { dimension, pillar }), [db, dimension, pillar])

  // deterministic radial layout
  const W = 780, H = 540, cx = W / 2, cy = H / 2, R1 = 172
  const groups = g.groupList
  const maxG = Math.max(1, ...groups.map((x) => x.value))
  const maxN = Math.max(1, ...groups.flatMap((x) => x.nodes.map((n) => n.rav)))
  const laid = groups.map((grp, gi) => {
    const ang = -Math.PI / 2 + (gi / Math.max(1, groups.length)) * 2 * Math.PI
    const x = cx + Math.cos(ang) * R1
    const y = cy + Math.sin(ang) * R1
    const r = 12 + Math.sqrt(grp.value / maxG) * 20
    const n = grp.nodes.length
    const spread = Math.min(Math.PI * 1.15, 0.45 + n * 0.14)
    const nodes = grp.nodes.map((nd, k) => {
      const a = ang + (n === 1 ? 0 : (k / (n - 1) - 0.5) * spread)
      const rr = r + 30
      return { ...nd, x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr, r: 2.5 + Math.sqrt(nd.rav / maxN) * 7 }
    })
    return { ...grp, x, y, r, ang, share: grp.value / g.total, nodes }
  })
  const dimmed = (key) => hi && hi !== key
  const c = g.concentration
  const concLabel = c.hhi >= 0.4 ? 'Highly concentrated' : c.hhi >= 0.22 ? 'Moderately concentrated' : 'Diversified'
  const concTone = c.hhi >= 0.4 ? 'red' : c.hhi >= 0.22 ? 'amber' : 'green'
  const dimLabel = GRAPH_DIMS.find((d) => d.key === dimension)?.label

  return (
    <>
      <p className="page-intro">Enterprise Value Graph — how value connects across the portfolio. Enterprise → {dimLabel?.toLowerCase()} → initiatives, sized by value and edged by share. Spot where value concentrates and where risk clusters. Click any initiative to drill in.</p>

      <div className="card-h">
        <h3>Group by</h3>
        <div className="seg" style={{ marginLeft: 8 }}>
          {GRAPH_DIMS.map((d) => <button key={d.key} className={dimension === d.key ? 'active' : ''} onClick={() => { setDim(d.key); setHi(null) }}>{d.label}</button>)}
        </div>
        <span className="spacer" />
        <div className="seg">
          {[['all', 'All value'], ['savings', 'Savings'], ['avoidance', 'Avoidance']].map(([k, l]) => (
            <button key={k} className={pillar === k ? 'active' : ''} onClick={() => setPillar(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="tiles section-gap">
        <Tile tone="navy" label="Value under management" value={money(g.total)} sub={`${num(g.initiatives)} active initiatives`} />
        <Tile tone={concTone} label="Concentration (HHI)" value={pct(c.hhi)} sub={concLabel} />
        <Tile tone="dark" label={`Top ${dimLabel?.toLowerCase()}`} value={c.topGroup ? c.topGroup.label : '—'} sub={c.topGroup ? `${pct(c.topShare)} of value` : ''} />
        <Tile tone="amber" label="Top-3 share" value={pct(c.top3Share)} sub={`of ${c.groups} ${dimLabel?.toLowerCase()}s`} />
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>Value relationship graph</h3><span className="spacer" /><span className="tiny muted">node size = value · edge = share · colour = risk · hover to isolate</span></div>
        <div className="table-wrap">
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 640 }} preserveAspectRatio="xMidYMid meet">
            {/* edges: enterprise → group */}
            {laid.map((grp) => (
              <line key={`e-${grp.key}`} x1={cx} y1={cy} x2={grp.x} y2={grp.y}
                stroke={groupColor(grp)} strokeOpacity={dimmed(grp.key) ? 0.08 : 0.35} strokeWidth={1 + grp.share * 9} />
            ))}
            {/* edges: group → initiative */}
            {laid.map((grp) => grp.nodes.map((nd) => (
              <line key={`ei-${nd.id}`} x1={grp.x} y1={grp.y} x2={nd.x} y2={nd.y}
                stroke="var(--line)" strokeOpacity={dimmed(grp.key) ? 0.05 : 0.5} strokeWidth="1" />
            )))}
            {/* initiative leaf nodes */}
            {laid.map((grp) => grp.nodes.map((nd) => (
              <circle key={nd.id} cx={nd.x} cy={nd.y} r={nd.r} fill={RAGC[nd.rag] || 'var(--navy)'} fillOpacity={dimmed(grp.key) ? 0.12 : 0.85}
                stroke="var(--bg)" strokeWidth="0.6" style={{ cursor: 'pointer' }} onClick={() => openDrawer(nd.id)}>
                <title>{nd.title} · {money(nd.rav)}</title>
              </circle>
            )))}
            {/* group hubs */}
            {laid.map((grp) => (
              <g key={grp.key} style={{ cursor: 'pointer' }} onMouseEnter={() => setHi(grp.key)} onMouseLeave={() => setHi(null)}>
                <circle cx={grp.x} cy={grp.y} r={grp.r} fill={groupColor(grp)} fillOpacity={dimmed(grp.key) ? 0.18 : 0.9} stroke="var(--bg)" strokeWidth="1.5" />
                <text x={grp.x} y={grp.y - grp.r - 5} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--ink)" opacity={dimmed(grp.key) ? 0.3 : 1}>
                  {grp.label.length > 20 ? grp.label.slice(0, 19) + '…' : grp.label}
                </text>
                <text x={grp.x} y={grp.y + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff" opacity={dimmed(grp.key) ? 0.3 : 1}>{money(grp.value)}</text>
                <title>{grp.label} · {money(grp.value)} · {grp.count} initiatives · {grp.atRisk} at risk</title>
              </g>
            ))}
            {/* enterprise core */}
            <circle cx={cx} cy={cy} r="30" fill="var(--dark)" stroke="var(--red)" strokeWidth="2" />
            <text x={cx} y={cy - 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--grey)">ENTERPRISE</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--ink)">{money(g.total)}</text>
          </svg>
        </div>
        <div className="chip-row section-gap">
          <span className="tiny"><span className="dot" style={{ background: 'var(--navy)', display: 'inline-block', width: 8, height: 8, borderRadius: 4, marginRight: 4 }} />on track</span>
          <span className="tiny"><span className="dot" style={{ background: 'var(--amber)', display: 'inline-block', width: 8, height: 8, borderRadius: 4, marginRight: 4 }} />some at risk</span>
          <span className="tiny"><span className="dot" style={{ background: 'var(--red)', display: 'inline-block', width: 8, height: 8, borderRadius: 4, marginRight: 4 }} />mostly at risk</span>
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad" style={{ borderLeft: `3px solid var(--${concTone === 'green' ? 'green' : concTone === 'amber' ? 'amber' : 'red'})` }}>
          <div className="card-h"><h3>Concentration risk</h3><span className="spacer" /><span className={`badge b-${concTone === 'green' ? 'green' : concTone === 'amber' ? 'amber' : 'red'}`}>{concLabel}</span></div>
          <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            {c.topGroup
              ? <>Value is {concLabel.toLowerCase()} (HHI {pct(c.hhi)}). <b>{c.topGroup.label}</b> alone holds <b>{pct(c.topShare)}</b> of value under management ({money(c.topGroup.value)} across {c.topGroup.count} initiatives{c.topGroup.atRisk > 0 ? `, ${c.topGroup.atRisk} at risk` : ''}). The top three {dimLabel?.toLowerCase()}s hold {pct(c.top3Share)}.</>
              : 'No active value in this view.'}
          </p>
          <p className="tiny muted">HHI (Herfindahl) sums the squared value shares: higher means value depends on fewer {dimLabel?.toLowerCase()}s — a resilience signal, not a target.</p>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>{dimLabel} value & risk</h3><span className="spacer" /><span className="badge b-navy">{groups.length}</span></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>{dimLabel}</th><th className="num">Initiatives</th><th className="num">At risk</th><th className="num">Value</th><th className="num">Share</th></tr></thead>
              <tbody>
                {laid.map((grp) => (
                  <tr key={grp.key} onMouseEnter={() => setHi(grp.key)} onMouseLeave={() => setHi(null)} style={{ cursor: 'default' }}>
                    <td><b>{grp.label}</b></td>
                    <td className="num mono muted">{grp.count}</td>
                    <td className="num mono" style={{ color: grp.atRisk ? 'var(--red)' : undefined }}>{grp.atRisk}</td>
                    <td className="num mono"><b>{money(grp.value)}</b></td>
                    <td className="num mono muted">{pct(grp.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
