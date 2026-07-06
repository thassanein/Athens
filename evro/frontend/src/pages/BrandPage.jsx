import { EvroMark, EvroLockup, BRAND, JOURNEY } from '../components/Brand.jsx'
import { SYMBOLS } from '../components/Symbols.jsx'
import { MANIFESTO, EVRO_IS, EVRO_IS_NOT, SIGNATURE_MOMENTS, MOTION_PRINCIPLES } from '../lib/brand.js'

// The EVRO Brand page (6C.1 Wave 3) — the identity system, ALIVE: every
// specimen on this page is the real component, the real token, the real
// motion class. If the system changes, this page changes with it.

const COLORS = [
  { token: '--brand-value', name: 'Value', meaning: 'validated, banked, compounding' },
  { token: '--brand-risk', name: 'Risk', meaning: 'exposure, escalation, storm' },
  { token: '--brand-caution', name: 'Caution', meaning: 'leakage, weather fronts, watch items' },
  { token: '--brand-intelligence', name: 'Intelligence', meaning: 'analysis, forecast, the instrument field' },
  { token: '--brand-momentum', name: 'Momentum', meaning: 'velocity, execution, motion' },
  { token: '--brand-ai', name: 'AI', meaning: 'the deterministic agent layer' },
  { token: '--brand-energy', name: 'Energy', meaning: 'the value spark — gold leads NE' },
]

export default function BrandPage() {
  return (
    <>
      <p className="page-intro">
        The <b>EVRO identity system</b> — living specimens, not pictures of them. Every mark,
        token, glyph and motion on this page is the production component; the brand and the
        product cannot drift because they are the same thing.
      </p>

      {/* hero — the mark + manifesto opening */}
      <div className="card pad bp-hero">
        <EvroLockup orientation="vertical" size={84} motion variant="auto" />
        <p className="bp-open">{MANIFESTO.opening}</p>
      </div>

      {/* the mark — variants + anatomy + rules */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>The mark — the Enterprise Pulse Orbital</h3><span className="spacer" /><span className="badge b-grey">icon · lockups · motion</span></div>
        <div className="bp-marks">
          <figure><EvroMark size={72} id="bp1" /><figcaption>App icon</figcaption></figure>
          <figure><span style={{ color: 'var(--ink)' }}><EvroMark size={72} tile={false} id="bp2" /></span><figcaption>Glyph — takes any ink</figcaption></figure>
          <figure><EvroMark size={72} journey id="bp3" /><figcaption>Journey variant</figcaption></figure>
          <figure><EvroMark size={72} motion id="bp4" /><figcaption>Motion — where it lives</figcaption></figure>
          <figure className="bp-lockup"><EvroLockup size={44} variant="auto" /><figcaption>Horizontal lockup</figcaption></figure>
        </div>
        <div className="bp-anatomy">
          <span><i style={{ background: BRAND.arc }} /> <b>The orbits</b> — the Enterprise Pulse, the product's own hero visualization, as the identity itself.</span>
          <span><i style={{ background: 'var(--brand-energy)' }} /> <b>The value spark</b> — always gold, always 45° north-east. Value ascends.</span>
          <span><i style={{ background: BRAND.core, borderRadius: 999 }} /> <b>The core</b> — the enterprise "now": the validated record everything traces to.</span>
        </div>
        <p className="eh-fine">Rules: never decorated, tilted or recoloured · icon-only at 16px and up · motion only where the enterprise is live · the spark never moves from NE.</p>
      </div>

      {/* color system */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Color — meaning before palette</h3><span className="spacer" /><span className="badge b-grey">themed for dark + light</span></div>
        <div className="bp-colors">
          {COLORS.map((c) => (
            <div key={c.token} className="bp-color">
              <span className="bp-swatch" style={{ background: `var(${c.token})` }} />
              <b>{c.name}</b>
              <span className="mono bp-token">{c.token}</span>
              <span className="bp-meaning">{c.meaning}</span>
            </div>
          ))}
        </div>
      </div>

      {/* typography */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Typography — the instrument voice</h3><span className="spacer" /><span className="badge b-grey">Archivo · Space Mono</span></div>
        <div className="bp-type">
          <div className="t-display">Display — the number that matters</div>
          <div className="t-headline">Headline — what happened and why</div>
          <div className="t-title">Title — the working level</div>
          <p style={{ margin: 0, fontSize: 13.5 }}>Body — complete sentences, concrete words, the honest register.</p>
          <div className="t-data" style={{ fontSize: 18 }}>$1.63M · 66 · 97% — data speaks mono, tabular, exact</div>
          <div className="t-caption">CAPTION — provenance, disclaimers, the fine print that keeps us honest</div>
        </div>
        <p className="eh-fine">Evaluated per the brief: SF Pro (platform-locked), Inter (ubiquitous — reads generic), Geist (vendor-flavoured). Archivo keeps the grotesque authority with more character; Space Mono gives data its instrument voice.</p>
      </div>

      {/* motion identity */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Motion — it must mean something</h3><span className="spacer" /><span className="badge b-grey">reduced-motion mandatory</span></div>
        <div className="bp-motion">
          {MOTION_PRINCIPLES.map((m) => (
            <div key={m.fx} className="bp-fx">
              <span className={`bp-fx-chip ${m.fx}`} style={{ '--fx-accent': 'var(--brand-intelligence)' }} />
              <b>{m.name}</b>
              <span>{m.use}</span>
            </div>
          ))}
        </div>
        <p className="eh-fine">Transform and opacity, with one honoured exception — glow animates box-shadow at low frequency, for ceremonies only. Every behavior lives inside a prefers-reduced-motion guard — under reduce, everything rests in its final state.</p>
      </div>

      {/* enterprise symbols */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Enterprise symbols</h3><span className="spacer" /><span className="badge b-grey">the eight system glyphs</span></div>
        <div className="bp-syms">
          {SYMBOLS.map(({ key, label, Sym, token, meaning }) => (
            <div key={key} className="bp-sym">
              <span className="bp-sym-g" style={{ color: `var(${token})` }}><Sym size={26} /></span>
              <b>{label}</b>
              <span>{meaning}</span>
            </div>
          ))}
        </div>
      </div>

      {/* signature moments */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Signature moments</h3><span className="spacer" /><span className="badge b-grey">computed live, never staged</span></div>
        <div className="bp-moments">
          {SIGNATURE_MOMENTS.map((m) => (
            <div key={m.key} className="bp-moment"><b>{m.name}</b><span>{m.line}</span></div>
          ))}
        </div>
      </div>

      {/* manifesto */}
      <div className="card pad section-gap bp-manifesto">
        <div className="card-h"><h3>The manifesto</h3></div>
        <div className="bp-man-grid">
          <div><div className="t-caption">WE BELIEVE</div>{MANIFESTO.beliefs.map((x, k) => <p key={k}>{x}</p>)}</div>
          <div><div className="t-caption">HOW WE BUILD</div>{MANIFESTO.philosophy.map((x, k) => <p key={k}>{x}</p>)}</div>
          <div><div className="t-caption">OPERATING PRINCIPLES</div>{MANIFESTO.principles.map((x, k) => <p key={k}>{x}</p>)}</div>
          <div><div className="t-caption">THE VOICE</div>{MANIFESTO.voice.map((x, k) => <p key={k}>{x}</p>)}</div>
        </div>
      </div>

      {/* is / is not */}
      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>What EVRO is</h3></div>
          {EVRO_IS.map((x) => <div key={x} className="bp-is">◈ {x}</div>)}
        </div>
        <div className="card pad">
          <div className="card-h"><h3>What EVRO is not</h3></div>
          {EVRO_IS_NOT.map((x) => <div key={x} className="bp-isnot">— {x}</div>)}
        </div>
      </div>

      {/* the value journey — heritage */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Heritage — the value journey</h3><span className="spacer" /><span className="badge b-grey">carried from the first mark</span></div>
        <div className="bp-journey">
          {JOURNEY.map((s, i) => (
            <span key={s.key} className="bp-j"><i style={{ background: s.color }} />{s.label}{i < JOURNEY.length - 1 ? ' →' : ''}</span>
          ))}
        </div>
        <p className="eh-fine">The original ascent — Opportunity → Investment → Realization → Sustainment — survives in the journey variant, whose three arcs carry the Investment, Realization and Sustainment colours (Opportunity purple lives on in this strip), and in the spark's north-east heading.</p>
      </div>
    </>
  )
}
