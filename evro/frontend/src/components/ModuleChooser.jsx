import { MODULES } from '../lib/capabilities.js'
import { BrandLockup, EvroMark } from './Brand.jsx'

// Module chooser — the very first screen. The operator picks which EVRO
// capability they are entering before the landing. Procurement is the active
// Phase One module; CX / Fleet / Operations are on the roadmap; Enterprise
// opens the full platform. The choice sets the capability state, so this screen
// and Settings stay in agreement. View-only; no data or engine touch.
const STATUS = {
  active: { tag: 'Active', cls: 'mc-active' },
  platform: { tag: 'Full platform', cls: 'mc-platform' },
  soon: { tag: 'On the roadmap', cls: 'mc-soon' },
}

export default function ModuleChooser({ onPick }) {
  return (
    <div className="modchooser">
      <div className="modchooser-inner">
        <header className="mc-top">
          <BrandLockup size={40} sub="Enterprise Intelligence OS" />
        </header>

        <section className="mc-hero">
          <div className="mc-eyebrow">ATHENS SERVICES · ONE PLATFORM, ONE OPERATING SYSTEM</div>
          <h1 className="mc-h1">Choose your capability.</h1>
          <p className="mc-lede">
            EVRO runs the enterprise as a set of value capabilities on one platform, one identity and one engine.
            Athens is live on <b>Procurement</b> — its first active capability. The rest are on the roadmap.
          </p>
        </section>

        <div className="mc-grid" role="list">
          {MODULES.map((m) => {
            const s = STATUS[m.status] || STATUS.soon
            const disabled = m.status === 'soon'
            return (
              <button
                key={m.key}
                role="listitem"
                className={`mc-card ${s.cls}`}
                disabled={disabled}
                aria-disabled={disabled}
                onClick={() => !disabled && onPick(m.key)}
              >
                <div className="mc-card-top">
                  <EvroMark size={30} journey={m.status !== 'active'} id={`mc-${m.key}`} />
                  <span className={`badge ${m.status === 'active' ? 'b-green' : m.status === 'platform' ? 'b-navy' : 'b-grey'}`}>{s.tag}</span>
                </div>
                <div className="mc-card-name">{m.label}</div>
                <div className="mc-card-tag">{m.tagline}</div>
                <div className="mc-card-cta">
                  {disabled ? <span className="mc-soon-l">Coming soon</span>
                    : <span className="mc-enter">Enter {m.label.replace('EVRO ', '')} →</span>}
                </div>
              </button>
            )
          })}
        </div>

        <footer className="mc-foot">
          Deterministic · rules-based intelligence — no language model. Value counts only once FP&amp;A validates it.
        </footer>
      </div>
    </div>
  )
}
