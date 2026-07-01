// EVRO brand identity — the permanent mark + lockup. The mark is a four-node
// value ascent: Opportunity → Investment → Realization → Sustainment (rising,
// compounding). Pure SVG, scales from favicon to hero, themes on any surface.

// The four brand journey stages + their semantic colours (shared with the app).
export const JOURNEY = [
  { key: 'opportunity', label: 'Opportunity', color: '#A874F5' },
  { key: 'investment', label: 'Investment', color: '#4F8DF2' },
  { key: 'realization', label: 'Realization', color: '#3FC97F' },
  { key: 'sustainment', label: 'Sustainment', color: '#2FB39A' },
]

// The mark. `tile` draws the red brand tile; set false for a transparent glyph
// (e.g. on a coloured hero). `journey` colours the four nodes by stage; default
// is the monochrome white ascent used in the app chrome.
export function BrandMark({ size = 34, tile = true, journey = false, id = 'bm' }) {
  const nodes = [
    { x: 26, y: 72, r: 5 },
    { x: 45, y: 59, r: 6 },
    { x: 64, y: 45, r: 7 },
    { x: 80, y: 27, r: 9.5 },
  ]
  const stroke = journey ? 'rgba(255,255,255,0.6)' : '#fff'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="EVRO" style={{ display: 'block', flex: 'none' }}>
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E5243B" />
          <stop offset="1" stopColor="#8F1220" />
        </linearGradient>
      </defs>
      {tile && <rect x="2" y="2" width="96" height="96" rx="24" fill={`url(#${id}-tile)`} />}
      <polyline points={nodes.map((n) => `${n.x},${n.y}`).join(' ')} fill="none" stroke={stroke} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={journey ? JOURNEY[i].color : '#fff'} stroke={tile ? 'none' : 'rgba(0,0,0,0.15)'} />
      ))}
    </svg>
  )
}

// Full lockup — mark + wordmark. `variant`: 'dark' (light text) or 'light'.
export function BrandLockup({ size = 40, sub = 'Value Realization OS', variant = 'dark', journey = false }) {
  const ink = variant === 'light' ? '#0E0E11' : '#fff'
  const muted = variant === 'light' ? '#6b7480' : 'rgba(255,255,255,0.6)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <BrandMark size={size} journey={journey} id="bl" />
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontWeight: 800, fontSize: size * 0.46, letterSpacing: 0.3, color: ink }}>Athens EVRO</div>
        {sub && <div style={{ fontSize: size * 0.3, color: muted, letterSpacing: 0.2 }}>{sub}</div>}
      </div>
    </div>
  )
}
