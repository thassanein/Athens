// EVRO Identity Lab — the five icon systems of Phase 6C.1A. Each direction is
// a self-contained SVG system on the 100-grid with a tile/glyph mode, a light
// preview field, and a motion variant (reduced-motion safe). The shipped 6C.1
// mark (the Enterprise Pulse Orbital) is closest to Direction 2 — the lab
// exists to pressure-test that call, not to defend it.

const FIELD = { dark: ['#0C1626', '#16325A'], light: ['#F4F7FB', '#E7EDF6'] }
const INK = (light) => (light ? '#14263F' : '#EAF1FA')
const GOLD = (light) => (light ? '#B45309' : '#F5A524')  // gold darkens on the light field (3:1 floor)

const Tile = ({ id, light, children, size, motion, label }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'} className={motion ? 'evm-motion' : undefined} style={{ display: 'block', flex: 'none' }}>
    <defs>
      <linearGradient id={`${id}-f`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={FIELD[light ? 'light' : 'dark'][0]} />
        <stop offset="1" stopColor={FIELD[light ? 'light' : 'dark'][1]} />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="96" height="96" rx="24" fill={`url(#${id}-f)`} stroke={light ? '#D5DEEA' : 'none'} strokeWidth={light ? 1 : 0} />
    {children}
  </svg>
)

// polar helper — angle in degrees, 0=east, CCW positive, screen-y down
const pt = (cx, cy, r, a) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)]
const arc = (cx, cy, r, a0, a1) => {
  const [x0, y0] = pt(cx, cy, r, a0); const [x1, y1] = pt(cx, cy, r, a1)
  const sweep = (((a0 - a1) % 360) + 360) % 360
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

// ---------------------------------------------------------------------------
// Direction 1 — Executive Pulse Mark (Apple Activity × Blackstone)
// Three closed rings, each with a live sweep at a different completion; the
// innermost sweep is gold. Premium restraint: track + sweep, nothing else.
// ---------------------------------------------------------------------------
export function MarkPulse({ size = 72, light = false, motion = false, id = 'mkp', decorative = false }) {
  const ink = INK(light)
  const small = size <= 24 // below ~24px the track+sweep split can't survive — closed rings only
  const rings = [
    { r: 16, w: 9, from: 90, to: 250, color: GOLD(light), o: 1 },
    { r: 28.5, w: 8, from: 90, to: 330, color: ink, o: 0.92 },
    { r: 40, w: 7, from: 90, to: 200, color: ink, o: 0.6 },
  ]
  return (
    <Tile id={id} light={light} size={size} motion={motion} label={decorative ? '' : 'Executive Pulse Mark'}>
      <g className="evm-arcs">
        {rings.map((g, i) => (
          <g key={i}>
            {small
              ? <circle cx="50" cy="50" r={g.r} fill="none" stroke={g.color} strokeWidth={g.w} opacity={g.o} />
              : <>
                <circle cx="50" cy="50" r={g.r} fill="none" stroke={g.color} strokeWidth={g.w} opacity="0.28" />
                <path d={arc(50, 50, g.r, g.from, g.to)} fill="none" stroke={g.color} strokeWidth={g.w} strokeLinecap="round" opacity={g.o} />
              </>}
          </g>
        ))}
      </g>
    </Tile>
  )
}

// ---------------------------------------------------------------------------
// Direction 2 — Value Orbit (NASA × Bloomberg)
// A core, two inclined orbits with satellites, and a trajectory breaking
// orbit to the NE — escape velocity as value creation.
// ---------------------------------------------------------------------------
export function MarkOrbit({ size = 72, light = false, motion = false, decorative = false, id = 'mko' }) {
  const ink = INK(light)
  return (
    <Tile id={id} light={light} size={size} motion={motion} label={decorative ? '' : 'Value Orbit'}>
      <g className="evm-arcs">
        <ellipse cx="50" cy="50" rx="34" ry="13.5" fill="none" stroke={ink} strokeWidth="3.4" opacity="0.75" transform="rotate(-28 50 50)" />
        <ellipse cx="50" cy="50" rx="24" ry="9.5" fill="none" stroke={ink} strokeWidth="3" opacity="0.45" transform="rotate(22 50 50)" />
        {/* satellites — computed on the rotated ellipses (left apex / right apex) */}
        <circle cx="19.98" cy="65.95" r="4.2" fill={ink} />
        <circle cx="72.25" cy="59.0" r="3.2" fill={ink} opacity="0.7" />
      </g>
      <circle cx="50" cy="50" r="7" fill={ink} />
      <path d="M 56 44 L 74 26" stroke={GOLD(light)} strokeWidth="4" strokeLinecap="round" />
      <circle className="evm-spark" cx="76.5" cy="23.5" r="5.4" fill={GOLD(light)} />
    </Tile>
  )
}

// ---------------------------------------------------------------------------
// Direction 3 — EV Monogram (Porsche × Apple)
// A luxury letterform: E and V share one italic gesture inside a thin bezel —
// the E's bars are speed lines, the V's apex carries the gold point of value.
// ---------------------------------------------------------------------------
export function MarkMonogram({ size = 72, light = false, motion = false, decorative = false, id = 'mkm' }) {
  const ink = INK(light)
  return (
    <Tile id={id} light={light} size={size} motion={motion} label={decorative ? '' : 'EV Monogram'}>
      <circle cx="50" cy="50" r="42" fill="none" stroke={ink} strokeWidth="2.2" opacity="0.5" />
      <g transform="skewX(-8)" style={{ transformOrigin: '50px 50px' }}>
        <g className="evm-arcs">
          <path d="M 30 36 h 17" stroke={ink} strokeWidth="6.5" strokeLinecap="round" />
          <path d="M 27 50 h 20" stroke={ink} strokeWidth="6.5" strokeLinecap="round" />
          <path d="M 30 64 h 17" stroke={ink} strokeWidth="6.5" strokeLinecap="round" />
          <path d="M 56 36 L 65 64 L 74 36" fill="none" stroke={ink} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle className="evm-spark" cx="65" cy="64" r="4.6" fill={GOLD(light)} />
        </g>
      </g>
    </Tile>
  )
}

// ---------------------------------------------------------------------------
// Direction 4 — Enterprise Compass (Formula 1 × Mission Control)
// A bezel of ticks, a needle locked NE — command is knowing your heading.
// ---------------------------------------------------------------------------
export function MarkCompass({ size = 72, light = false, motion = false, decorative = false, id = 'mkc' }) {
  const ink = INK(light)
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30)
  return (
    <Tile id={id} light={light} size={size} motion={motion} label={decorative ? '' : 'Enterprise Compass'}>
      <g className="evm-arcs">
        {ticks.map((a) => {
          const long = a % 90 === 0
          const [x0, y0] = pt(50, 50, long ? 34 : 37, a)
          const [x1, y1] = pt(50, 50, 41, a)
          return <line key={a} x1={x0} y1={y0} x2={x1} y2={y1} stroke={ink} strokeWidth={long ? 3.4 : 2.2} strokeLinecap="round" opacity={long ? 0.9 : 0.45} />
        })}
      </g>
      <path d="M 50 50 L 44.5 44.5 L 71 29 L 55.5 55.5 Z" fill={GOLD(light)} className="evm-spark" />
      <path d="M 50 50 L 55.5 55.5 L 29 71 L 44.5 44.5 Z" fill={ink} opacity="0.35" />
      <circle cx="50" cy="50" r="5.4" fill="none" stroke={ink} strokeWidth="3" />
    </Tile>
  )
}

// ---------------------------------------------------------------------------
// Direction 5 — Enterprise Signal (Palantir × Anduril)
// Telemetry from an origin: three signal fronts fanning NE, one confirmed
// detection. Sensing as identity — the enterprise, instrumented.
// ---------------------------------------------------------------------------
export function MarkSignal({ size = 72, light = false, motion = false, decorative = false, id = 'mks' }) {
  const ink = INK(light)
  return (
    <Tile id={id} light={light} size={size} motion={motion} label={decorative ? '' : 'Enterprise Signal'}>
      <circle cx="30" cy="70" r="5.6" fill={ink} />
      <g className="evm-arcs" style={{ transformOrigin: '30px 70px' }}>
        <path d={arc(30, 70, 18, 80, 10)} fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        <path d={arc(30, 70, 31, 80, 10)} fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" opacity="0.55" />
        <path d={arc(30, 70, 44, 80, 10)} fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" opacity="0.3" />
      </g>
      <circle className="evm-spark" cx="66" cy="34" r="5.6" fill={GOLD(light)} />
    </Tile>
  )
}

// ---------------------------------------------------------------------------
export const DIRECTIONS = [
  {
    key: 'pulse', n: 1, name: 'Executive Pulse Mark', refs: 'Apple Activity × Blackstone', Mark: MarkPulse,
    says: 'Enterprise health, motion, intelligence',
    rationale: 'Three closed rings, each mid-sweep — the enterprise as a living instrument that is always partway through earning its day. The gold inner ring is the value engine. Quietest of the five; the most Blackstone.',
    risk: 'Closest to Apple Activity — familiarity cuts both ways: instantly legible, but borrowed.',
  },
  {
    key: 'orbit', n: 2, name: 'Value Orbit', refs: 'NASA × Bloomberg', Mark: MarkOrbit,
    says: 'Enterprise, value flow, movement',
    rationale: 'A governed system with mass at the centre and a trajectory breaking orbit to the NE — value reaching escape velocity. The evolution of the shipped 6C.1 mark: same physics, more literal orbital mechanics.',
    risk: 'Busiest silhouette at 16px; the ellipses demand room.',
  },
  {
    key: 'monogram', n: 3, name: 'EV Monogram', refs: 'Porsche × Apple', Mark: MarkMonogram,
    says: 'Motion, value and intelligence in the letterforms',
    rationale: 'The name itself, engineered: E as speed lines, V as the descent that turns — with the gold point of value at the apex where it turns upward. A crest, not a chart. The most timeless; the most luxury-marque.',
    risk: 'Says nothing about intelligence or telemetry without the system around it.',
  },
  {
    key: 'compass', n: 4, name: 'Enterprise Compass', refs: 'Formula 1 × Mission Control', Mark: MarkCompass,
    says: 'Command, orientation and leadership',
    rationale: 'A bezel of ticks and a needle locked NE — command is knowing your heading and holding it. Reads as an instrument dial from a race wall or a flight deck. Strongest "executive command" signal of the five.',
    risk: 'Compasses are a crowded metaphor in enterprise software; the execution must stay this austere to avoid cliché.',
  },
  {
    key: 'signal', n: 5, name: 'Enterprise Signal', refs: 'Palantir × Anduril', Mark: MarkSignal,
    says: 'Insight, sensing and awareness',
    rationale: 'Telemetry propagating from an origin, one detection confirmed in gold — the enterprise, instrumented. Asymmetric and directional; the most Palantir. Pairs naturally with the AI presence layer.',
    risk: 'The defence-tech register may read colder than the AVCM movement side of the product wants.',
  },
]
