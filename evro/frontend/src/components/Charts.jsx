// Hand-built, dependency-free SVG charts. All scale fluidly via viewBox.
import { money } from '../lib/format.js'

// ---- Horizontal bar list (pillar split, group spend, rankings) ------------
export function HBars({ data, fmt = money, max, height = 26 }) {
  const m = max ?? Math.max(1, ...data.map((d) => Math.abs(d.value)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px 1fr auto', gap: 10, alignItems: 'center' }}>
          <div className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.label}>{d.label}</div>
          <div className="barline" style={{ height: 14 }}>
            <i style={{ width: `${(Math.abs(d.value) / m) * 100}%`, background: d.color || 'var(--navy)' }} />
          </div>
          <div className="small mono right" style={{ minWidth: 64, fontWeight: 700 }}>{fmt(d.value)}</div>
        </div>
      ))}
    </div>
  )
}

// ---- Donut ----------------------------------------------------------------
export function Donut({ data, size = 150, thickness = 22, center }) {
  const total = data.reduce((a, d) => a + Math.max(0, d.value), 0) || 1
  const r = (size - thickness) / 2
  const cx = size / 2
  const C = 2 * Math.PI * r
  let offset = 0
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: '0 0 auto' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = Math.max(0, d.value) / total
          const dash = frac * C
          const el = (
            <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={d.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cx})`} />
          )
          offset += dash
          return el
        })}
        {center && (
          <text x={cx} y={cx} textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="800" fill="var(--dark)">
            {center}
          </text>
        )}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 130 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flex: '0 0 10px' }} />
            <span style={{ flex: 1 }}>{d.label}</span>
            <span className="mono" style={{ fontWeight: 700 }}>{money(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Multi-series line chart (forecast curve) -----------------------------
// xLabels: string[]; series: [{key, color, label, dashed?, points: number[]}]
export function LineChart({ xLabels, series, height = 240, yFmt = (v) => money(v) }) {
  const W = 640, H = height, padL = 52, padR = 14, padT = 14, padB = 30
  const allVals = series.flatMap((s) => s.points.filter((v) => v != null))
  const maxY = Math.max(1, ...allVals) * 1.12
  const n = xLabels.length
  const x = (i) => padL + (i * (W - padL - padR)) / Math.max(1, n - 1)
  const y = (v) => H - padB - (v / maxY) * (H - padT - padB)
  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY)
  const pathFor = (pts) => {
    let started = false, d = ''
    pts.forEach((v, i) => {
      if (v == null) { started = false; return }
      d += `${started ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `
      started = true
    })
    return d
  }
  return (
    <div className="table-wrap">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 520 }} preserveAspectRatio="xMidYMid meet">
        {gridY.map((gv, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(gv)} y2={y(gv)} stroke="var(--line)" strokeWidth="1" />
            <text x={padL - 6} y={y(gv)} textAnchor="end" dominantBaseline="central" fontSize="10" fill="var(--grey)">{yFmt(gv)}</text>
          </g>
        ))}
        {xLabels.map((lb, i) => (
          <text key={i} x={x(i)} y={H - padB + 16} textAnchor="middle" fontSize="10" fill="var(--grey)">{lb}</text>
        ))}
        {series.map((s) => (
          <g key={s.key}>
            <path d={pathFor(s.points)} fill="none" stroke={s.color} strokeWidth="2.5"
              strokeDasharray={s.dashed ? '5 4' : 'none'} strokeLinejoin="round" strokeLinecap="round" />
            {s.points.map((v, i) => (v == null ? null : <circle key={i} cx={x(i)} cy={y(v)} r="2.6" fill={s.color} />))}
          </g>
        ))}
      </svg>
      <div className="chip-row" style={{ marginTop: 6, paddingLeft: 8 }}>
        {series.map((s) => (
          <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 16, height: 3, background: s.color, borderRadius: 2, opacity: s.dashed ? 0.9 : 1 }} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ---- Waterfall (value bridge) ---------------------------------------------
// steps: [{label, value, kind:'base'|'add'}], plus a final total bar.
export function Waterfall({ steps, total, height = 230 }) {
  const W = 640, H = height, padT = 16, padB = 46
  const bars = []
  let cum = 0
  for (const s of steps) { bars.push({ label: s.label, start: cum, value: s.value, kind: s.kind }); cum += s.value }
  bars.push({ label: 'Total potential', start: 0, value: cum, kind: 'total' })
  const maxY = Math.max(1, cum) * 1.1
  const colW = (W - 20) / bars.length
  const y = (v) => padT + (1 - v / maxY) * (H - padT - padB)
  const COLORS = { base: 'var(--green)', add: 'var(--navy)', total: 'var(--dark)' }
  const colorOf = (b, i) => (b.kind === 'total' ? COLORS.total : i === 1 ? 'var(--navy)' : i === 2 ? 'var(--red)' : COLORS.base)
  return (
    <div className="table-wrap">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 480 }} preserveAspectRatio="xMidYMid meet">
        {bars.map((b, i) => {
          const top = b.kind === 'total' ? y(b.value) : y(b.start + Math.max(0, b.value))
          const h = b.kind === 'total' ? y(0) - y(b.value) : Math.abs(y(b.start) - y(b.start + b.value))
          const cx = 10 + i * colW + colW * 0.18
          const bw = colW * 0.64
          return (
            <g key={i}>
              {i > 0 && (
                <line x1={10 + (i - 1) * colW + colW * 0.18 + bw} x2={cx} y1={y(b.start)} y2={y(b.start)} stroke="var(--grey-2)" strokeWidth="1" strokeDasharray="3 3" />
              )}
              <rect x={cx} y={top} width={bw} height={Math.max(2, h)} rx="3" fill={colorOf(b, i)} />
              <text x={cx + bw / 2} y={top - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--dark)">{money(b.value)}</text>
              <text x={cx + bw / 2} y={H - padB + 16} textAnchor="middle" fontSize="10.5" fill="var(--grey)">
                {b.label.length > 18 ? b.label.slice(0, 17) + '…' : b.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ---- Funnel (pipeline by stage) -------------------------------------------
export function Funnel({ stages, fmt = money }) {
  const max = Math.max(1, ...stages.map((s) => s.count))
  const COLORS = ['#9aa7b6', '#5b7aa6', '#2f5793', 'var(--navy)']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {stages.map((s, i) => (
        <div key={s.stage} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, alignItems: 'center' }}>
          <div className="small" style={{ fontWeight: 700, textTransform: 'capitalize' }}>{s.stage}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: `0 0 ${20 + (s.count / max) * 80}%`, background: COLORS[i] || 'var(--navy)', color: '#fff', borderRadius: 7, padding: '7px 11px', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b>{s.count}</b>
              <span className="mono" style={{ opacity: 0.92 }}>{fmt(s.value)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
