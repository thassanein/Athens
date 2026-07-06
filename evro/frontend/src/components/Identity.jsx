// EVRO identity architecture, layer 1 (Phase 6C.1B) — the MASTER BRAND.
//
// 6C.1A ended with a recorded verdict: the EV Monogram won on ownability,
// 16px survival and boardroom premium (6.9 mean, Borda 21, four of five first
// picks). 6C.1B converges on that call. The monogram is the way the company
// signs its name; the Pulse Rings remain the enterprise-state language inside
// the product, the Compass becomes the operating symbol, the Signal the AI
// identity (layers 2–4 formalize in this phase's later waves).
//
// The refinement answers the panel's two named weaknesses of the lab draft:
//  · "the 2.2-unit bezel and the r=4.6 gold apex dot drop out small" —
//    the mark is size-aware: below 28px the bezel is dropped, letterforms
//    thicken and the apex dot grows, so "EV" stays literally readable at 16px.
//  · semantic muteness — carried by the system around it, not the drawing:
//    the gold apex point IS the value spark token shared with the Pulse
//    layer, so brand and telemetry share grammar without sharing form.
//
// Usage rules (the Master Brand):
//  · The monogram is never tilted beyond its built-in italic, never recoloured
//    outside its variants; the apex point is always gold on brand surfaces.
//  · Motion is a glint on the apex only — the master brand does not dance.
//  · Icon-only ≥ 16px; horizontal lockup for chrome; vertical for ceremony.

export const MASTER = {
  field: ['#0C1626', '#16325A'],       // deep-space navy (shared brand field)
  fieldLight: ['#F4F7FB', '#E7EDF6'],  // light print field
  ink: '#EAF1FA',
  inkLight: '#14263F',
  gold: '#F5A524',                     // the value spark — always gold
  goldLight: '#B45309',                // gold darkened for light fields (3:1)
  goldLine: '#E8B54A',                 // luxury line-work gold
  plate: ['#242E3C', '#161F2B'],       // engraved/embossed metal plate
}

// The letterforms, one gesture: E as three speed lines, V as the descent that
// turns — the gold point of value at the apex where it turns upward.
// `heavy` (small sizes): no bezel, thicker strokes, larger apex.
function Letterforms({ ink, gold, sw, apexR, apexFill = true }) {
  return (
    <g transform="translate(50 50) skewX(-8) translate(-50 -50)">
      <path d="M 30 36 h 17" stroke={ink} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <path d="M 27 50 h 20" stroke={ink} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <path d="M 30 64 h 17" stroke={ink} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <path d="M 56 36 L 65 64 L 74 36" fill="none" stroke={ink} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <circle className="mbm-apex" cx="65" cy="64" r={apexR} fill={apexFill ? gold : 'none'} stroke={apexFill ? 'none' : gold} strokeWidth={apexFill ? 0 : 2.4} />
    </g>
  )
}

// The master mark. variant: 'primary' | 'light' | 'luxury' | 'engraved' |
// 'embossed' | 'mono'. Size-aware: <=28px drops the bezel and thickens.
export function MasterMark({ size = 40, variant = 'primary', motion = false, tile = true, id = 'mbm', decorative = false }) {
  const small = size <= 28
  const sw = small ? 8 : 6.8
  const apexR = small ? 6 : 5.2
  const a11y = decorative ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': 'Athens EVRO' }

  const field = variant === 'light' ? MASTER.fieldLight
    : variant === 'engraved' || variant === 'embossed' ? MASTER.plate
    : MASTER.field
  const ink = variant === 'light' ? MASTER.inkLight
    : variant === 'luxury' ? MASTER.goldLine
    : variant === 'mono' ? 'currentColor'
    : MASTER.ink
  const gold = variant === 'light' ? MASTER.goldLight
    : variant === 'mono' ? 'currentColor'
    : MASTER.gold

  // engraved: carved into the plate — shadow on the top edge, light on the
  // lower edge. embossed: raised from it — light above, shadow below.
  const relief = variant === 'engraved'
    ? { hi: 1.1, hiA: 0.20, sh: -1.1, shA: 0.5, main: '#101A26' }
    : variant === 'embossed'
      ? { hi: -1.1, hiA: 0.24, sh: 1.1, shA: 0.45, main: '#33404F' }
      : null

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" {...a11y} className={motion ? 'mbm-motion' : undefined} style={{ display: 'block', flex: 'none' }}>
      {tile && variant !== 'mono' && (
        <>
          <defs>
            <linearGradient id={`${id}-f`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={field[0]} />
              <stop offset="1" stopColor={field[1]} />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="96" height="96" rx="24" fill={`url(#${id}-f)`}
            stroke={variant === 'light' ? '#D5DEEA' : 'none'} strokeWidth={variant === 'light' ? 1 : 0} />
        </>
      )}
      {!small && variant !== 'mono' && (
        <circle cx="50" cy="50" r="42" fill="none"
          stroke={relief ? relief.main : ink} strokeWidth={variant === 'luxury' ? 1.8 : 2.2}
          opacity={variant === 'luxury' ? 0.9 : 0.5} />
      )}
      {relief ? (
        <>
          <g opacity={relief.hiA} transform={`translate(0 ${relief.hi})`}>
            <Letterforms ink="#FFFFFF" gold="#FFFFFF" sw={sw} apexR={apexR} />
          </g>
          <g opacity={relief.shA} transform={`translate(0 ${relief.sh})`}>
            <Letterforms ink="#000000" gold="#000000" sw={sw} apexR={apexR} />
          </g>
          <Letterforms ink={relief.main} gold={variant === 'engraved' ? relief.main : MASTER.gold} sw={sw} apexR={apexR} />
        </>
      ) : (
        <Letterforms ink={ink} gold={gold} sw={variant === 'luxury' ? 5.2 : sw} apexR={apexR} />
      )}
    </svg>
  )
}

// Lockups. orientation: 'horizontal' (chrome) | 'vertical' (ceremony/covers).
// tone: 'dark' (white ink for dark heros) | 'light' (fixed dark ink) | 'auto'
// (theme tokens — in-app surfaces that flip with the theme).
export function MasterLockup({ size = 40, orientation = 'horizontal', sub = 'Enterprise Intelligence OS', tone = 'dark', variant = 'primary', motion = false, id }) {
  const ink = tone === 'light' ? '#0E0E11' : tone === 'auto' ? 'var(--ink)' : '#fff'
  const muted = tone === 'light' ? '#6b7480' : tone === 'auto' ? 'var(--grey)' : 'rgba(255,255,255,0.62)'
  const vertical = orientation === 'vertical'
  return (
    <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: 'center', gap: vertical ? 10 : 12, textAlign: vertical ? 'center' : 'left' }}>
      <MasterMark size={size} variant={variant} motion={motion} id={id || `ml-${orientation}`} decorative />
      <div style={{ lineHeight: 1.12 }}>
        <div style={{ fontWeight: 800, fontSize: size * 0.46, letterSpacing: 0.6, color: ink }}>Athens EVRO</div>
        {sub && <div style={{ fontSize: size * 0.28, color: muted, letterSpacing: 0.3 }}>{sub}</div>}
      </div>
    </div>
  )
}

// The four-layer identity architecture — the convergence 6C.1B commits to.
// role: what the layer is FOR; surface: where it lives. Layers 2–4 reference
// the systems as they stand today; their formalized behaviors land in the
// later waves of this phase.
export const IDENTITY_LAYERS = [
  { n: 1, key: 'master', name: 'Master Brand', mark: 'EV Monogram', says: 'Premium · ownership · timelessness', surface: 'App chrome, favicon, covers, ceremony — the signature.', status: 'live' },
  { n: 2, key: 'operating', name: 'Operating Identity', mark: 'Enterprise Compass', says: 'Command · navigation · strategy', surface: 'Mission control, navigation, strategic direction.', status: 'wave 2' },
  { n: 3, key: 'state', name: 'Enterprise State', mark: 'Pulse Rings', says: 'Energy · health · momentum', surface: 'Gauges and vitals — the operating language the product already speaks.', status: 'wave 2' },
  { n: 4, key: 'ai', name: 'AI Identity', mark: 'Enterprise Signal', says: 'Sensing · intelligence · telemetry', surface: 'AI presence, predictions, orchestration.', status: 'wave 2' },
]
