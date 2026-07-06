// EVRO brand identity v2 (Phase 6C.1) — the ENTERPRISE PULSE ORBITAL.
//
// The mark: three concentric pulse arcs — the same Pulse Ring that anchors the
// product — swept as an orbital system, with a gold VALUE SPARK at the head of
// the outer orbit ascending to the upper-right (the value-flow direction
// inherited from the original ascent mark) and a solid core: the enterprise
// "now". Field: deep-space navy, calm and premium. This makes the decision the
// brief asked for explicit: the Enterprise Pulse IS the core visual identity.
//
// Usage rules (the Pulse Identity):
//  · The mark is never decorated, tilted or recoloured; the spark is always
//    gold (#F5A524) and always at 45° NE — value ascends.
//  · Motion variant only where the enterprise is "live" (app chrome, landing):
//    arcs breathe, the spark pulses — inside prefers-reduced-motion guards.
//  · Icon-only ≥ 16px; horizontal lockup for chrome; vertical for covers.
//
// Variants: EvroMark (icon), EvroLockup (horizontal | vertical), motion via
// the `motion` prop. BrandMark / BrandLockup remain as compatible aliases.

// The value journey (kept from v1 — Landing's journey strip + stage colours).
export const JOURNEY = [
  { key: 'opportunity', label: 'Opportunity', color: '#A874F5' },
  { key: 'investment', label: 'Investment', color: '#4F8DF2' },
  { key: 'realization', label: 'Realization', color: '#3FC97F' },
  { key: 'sustainment', label: 'Sustainment', color: '#2FB39A' },
]

export const BRAND = {
  field: ['#0C1626', '#16325A'], // deep-space navy gradient
  arc: '#EAF1FA',                // pulse arcs — near-white, calm
  spark: '#F5A524',              // the value spark — always gold
  core: '#EAF1FA',               // the enterprise "now"
}

// Arc geometry: three orbits, each swept ~264°, opening to the NE where the
// spark leads. r = radius, w = stroke width, o = opacity.
const ORBITS = [
  { r: 14, w: 7.5, o: 1 },
  { r: 26, w: 6.5, o: 0.78 },
  { r: 38, w: 5.5, o: 0.56 },
]
// A single arc path from angle a0 to a1 (degrees, 0 = east, CCW positive),
// drawn clockwise so the gap opens over the NE quadrant where the spark sits.
const arcPath = (cx, cy, r, a0, a1) => {
  const rad = (d) => (d * Math.PI) / 180
  const x0 = cx + r * Math.cos(rad(a0)), y0 = cy - r * Math.sin(rad(a0))
  const x1 = cx + r * Math.cos(rad(a1)), y1 = cy - r * Math.sin(rad(a1))
  const sweep = (((a0 - a1) % 360) + 360) % 360
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

export function EvroMark({ size = 34, tile = true, motion = false, journey = false, id = 'evm' }) {
  const cx = 50, cy = 50
  // arcs sweep clockwise the LONG way from 357° around to 93°, leaving the
  // ~96° gap open over the NE quadrant where the spark leads
  const A0 = 357, A1 = 93
  const sparkR = ORBITS[2].r
  const sx = cx + sparkR * Math.cos((45 * Math.PI) / 180)
  const sy = cy - sparkR * Math.sin((45 * Math.PI) / 180)
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="EVRO" className={motion ? 'evm-motion' : undefined} style={{ display: 'block', flex: 'none' }}>
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.field[0]} />
          <stop offset="1" stopColor={BRAND.field[1]} />
        </linearGradient>
      </defs>
      {tile && <rect x="2" y="2" width="96" height="96" rx="24" fill={`url(#${id}-f)`} />}
      <g className="evm-arcs">
        {ORBITS.map((o, i) => (
          <path key={i} className="evm-arc" d={arcPath(cx, cy, o.r, A0, A1)} fill="none"
            stroke={journey ? JOURNEY[i + 1].color : tile ? BRAND.arc : 'currentColor'}
            strokeWidth={o.w} strokeLinecap="round" opacity={o.o} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r="6.5" fill={tile ? BRAND.core : 'currentColor'} />
      <circle className="evm-spark" cx={sx.toFixed(2)} cy={sy.toFixed(2)} r="7" fill={BRAND.spark} />
    </svg>
  )
}

// Lockups. orientation: 'horizontal' (chrome) | 'vertical' (covers/heros).
export function EvroLockup({ size = 40, orientation = 'horizontal', sub = 'Enterprise Intelligence OS', variant = 'dark', motion = false }) {
  const ink = variant === 'light' ? '#0E0E11' : '#fff'
  const muted = variant === 'light' ? '#6b7480' : 'rgba(255,255,255,0.62)'
  const vertical = orientation === 'vertical'
  return (
    <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: 'center', gap: vertical ? 10 : 12, textAlign: vertical ? 'center' : 'left' }}>
      <EvroMark size={size} motion={motion} id={`el-${orientation}`} />
      <div style={{ lineHeight: 1.12 }}>
        <div style={{ fontWeight: 800, fontSize: size * 0.46, letterSpacing: 0.6, color: ink }}>Athens EVRO</div>
        {sub && <div style={{ fontSize: size * 0.28, color: muted, letterSpacing: 0.3 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ---- compatible aliases (v1 API) -------------------------------------------
export function BrandMark(props) { return <EvroMark {...props} /> }
export function BrandLockup({ size, sub, variant }) {
  return <EvroLockup size={size} sub={sub === 'Enterprise Value Realization OS' ? 'Enterprise Intelligence OS' : sub} variant={variant} />
}
