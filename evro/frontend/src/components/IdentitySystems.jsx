// EVRO identity architecture, layers 2–4 (Phase 6C.1B Wave 2) — the operating
// marks as live components. Geometry descends from the 6C.1A lab systems
// (Marks.jsx); behavior is new: each mark carries STATES driven by the real
// data helpers in lib/identity-systems.js. All motion sits inside
// prefers-reduced-motion guards — under reduce, every state rests in its
// final pose.

const FIELD = ['#0C1626', '#16325A']
const INK = '#EAF1FA'
const GOLD = '#F5A524'

const pt = (cx, cy, r, a) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)]
const arc = (cx, cy, r, a0, a1) => {
  const [x0, y0] = pt(cx, cy, r, a0); const [x1, y1] = pt(cx, cy, r, a1)
  const sweep = (((a0 - a1) % 360) + 360) % 360
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

const Tile = ({ id, size, children, className, label }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}
    role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'}
    style={{ display: 'block', flex: 'none' }}>
    <defs>
      <linearGradient id={`${id}-f`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={FIELD[0]} />
        <stop offset="1" stopColor={FIELD[1]} />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="96" height="96" rx="24" fill={`url(#${id}-f)`} />
    {children}
  </svg>
)

// ---------------------------------------------------------------------------
// Layer 2 — the Enterprise Compass. state: 'idle' | 'orient' | 'locked'.
// idle: needle rests NE in ink. orient: the gold needle searches (swings)
// until a heading is chosen. locked: gold needle committed NE + lock ring.
export function CompassSymbol({ size = 72, state = 'idle', motion = true, id = 'idc', label }) {
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30)
  const gold = state !== 'idle'
  return (
    <Tile id={id} size={size} label={label} className={motion ? 'ids-motion' : undefined}>
      <g opacity={state === 'idle' ? 0.55 : 1}>
        {ticks.map((a) => {
          const long = a % 90 === 0
          const [x0, y0] = pt(50, 50, long ? 34 : 37, a)
          const [x1, y1] = pt(50, 50, 41, a)
          return <line key={a} x1={x0} y1={y0} x2={x1} y2={y1} stroke={INK} strokeWidth={long ? 3.4 : 2.2} strokeLinecap="round" opacity={long ? 0.9 : 0.45} />
        })}
      </g>
      {state === 'locked' && <circle className="ids-lockring" cx="50" cy="50" r="30" fill="none" stroke={GOLD} strokeWidth="1.6" opacity="0.5" />}
      <g className={state === 'orient' ? 'ids-orienting' : undefined} style={{ transformOrigin: '50px 50px' }}>
        <path d="M 50 50 L 44.5 44.5 L 71 29 L 55.5 55.5 Z" fill={gold ? GOLD : INK} opacity={state === 'idle' ? 0.5 : 1} />
        <path d="M 50 50 L 55.5 55.5 L 29 71 L 44.5 44.5 Z" fill={INK} opacity="0.35" />
      </g>
      <circle cx="50" cy="50" r="5.4" fill="none" stroke={INK} strokeWidth="3" />
    </Tile>
  )
}

// ---------------------------------------------------------------------------
// Layer 3 — the Pulse Rings, formalized. Five concentric gauges — Energy,
// Momentum, Health, Risk containment, Transformation — each ring's sweep IS
// its live score (score/100 of the circle, from 12 o'clock, clockwise).
const RING_R = [44, 37, 30, 23, 16] // outermost = energy … innermost = transformation
export function PulseRings({ dims, size = 200, motion = true, id = 'idp', label }) {
  return (
    <Tile id={id} size={size} label={label} className={motion ? 'ids-motion' : undefined}>
      {dims.map((d, i) => {
        const r = RING_R[i]
        const score = Math.max(0, Math.min(100, d.score))
        const a1 = 90 - Math.min(359.5, (score / 100) * 360)
        return (
          <g key={d.key}>
            <circle cx="50" cy="50" r={r} fill="none" stroke={d.color} strokeWidth="5" opacity="0.16" />
            {/* below 1 the round linecap would render a false dot — an empty track is the honest zero */}
            {score >= 1 && <path className="ids-ring" style={{ animationDelay: `${i * 0.45}s` }} d={arc(50, 50, r, 90, a1)}
              fill="none" stroke={d.color} strokeWidth="5" strokeLinecap="round" />}
          </g>
        )
      })}
      <circle cx="50" cy="50" r="4" fill={INK} />
    </Tile>
  )
}

// Mobile behavior: the stack compacts to the outermost gauge (Energy) with
// the score in the core — the other four collapse to chips beside it.
export function PulseCompact({ dims, size = 64, id = 'idpc', label }) {
  const e = dims[0]
  const a1 = 90 - Math.min(359.5, (Math.max(0, Math.min(100, e.score)) / 100) * 360)
  return (
    <Tile id={id} size={size} label={label}>
      <circle cx="50" cy="50" r="38" fill="none" stroke={e.color} strokeWidth="7" opacity="0.16" />
      <path d={arc(50, 50, 38, 90, a1)} fill="none" stroke={e.color} strokeWidth="7" strokeLinecap="round" />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill={INK} fontSize="30" fontWeight="800" fontFamily="Space Mono, monospace">{e.score}</text>
    </Tile>
  )
}

// ---------------------------------------------------------------------------
// Layer 4 — the Enterprise Signal. state: 'idle' | 'sensing' | 'orchestrating'.
// sensing: the three fronts propagate from the origin. orchestrating: sensing
// plus the confirmed gold contact pulsing beyond the outermost front.
export function SignalGlyph({ size = 72, state = 'idle', motion = true, id = 'idsg', label }) {
  const fronts = [
    { r: 18, o: 0.9 },
    { r: 31, o: 0.55 },
    { r: 44, o: 0.3 },
  ]
  const live = state !== 'idle'
  return (
    <Tile id={id} size={size} label={label} className={motion ? 'ids-motion' : undefined}>
      <circle cx="30" cy="70" r="5.6" fill={INK} />
      <g style={{ transformOrigin: '30px 70px' }} opacity={live ? 1 : 0.5}>
        {fronts.map((f, i) => (
          <path key={f.r} className={live ? 'ids-front' : undefined} style={{ animationDelay: `${i * 0.5}s` }}
            d={arc(30, 70, f.r, 80, 10)} fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" opacity={f.o} />
        ))}
      </g>
      {state === 'orchestrating' && <circle className="ids-contact" cx="66" cy="34" r="5.6" fill={GOLD} />}
    </Tile>
  )
}
