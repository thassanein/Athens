import { useState } from 'react'
import { valueUnderManagement } from '../lib/companion.js'
import { money, num } from '../lib/format.js'
import { BrandMark, BrandLockup, JOURNEY } from './Brand.jsx'

// EVRO landing experience — the premium "enterprise operating system" front
// door. Presents EVRO, the enterprise value under management, and the
// Find → Realize → Sustain promise, then enters the operating system.
// View-only: reads the loaded portfolio; changes nothing.
const PILLARS = [
  { k: 'find', title: 'Find Value', body: 'Surface opportunity across every dollar of addressable spend — AI mining, leakage and inflation exposure.', color: 'var(--opp)' },
  { k: 'realize', title: 'Realize Value', body: 'Gate initiatives to FP&A-validated realized value, ranked by risk-adjusted return. No savings target.', color: 'var(--green)' },
  { k: 'sustain', title: 'Sustain Value', body: 'Protect delivered value with sustainment scoring, erosion watch and one-click recovery.', color: 'var(--navy)' },
]

export default function Landing({ db, onEnter }) {
  const vum = valueUnderManagement(db)
  const [leaving, setLeaving] = useState(false)
  const go = () => {
    if (leaving) return
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onEnter(); return }
    setLeaving(true)
    setTimeout(onEnter, 360)
  }
  return (
    <div className={`landing ${leaving ? 'leaving' : ''}`}>
      <div className="landing-inner">
        <header className="landing-top">
          <BrandLockup size={40} sub="Enterprise Value Realization OS" />
          <button className="btn accent landing-enter-sm" onClick={go}>Enter →</button>
        </header>

        <section className="landing-hero">
          <div className="landing-eyebrow">ATHENS SERVICES · ENTERPRISE VALUE REALIZATION OPERATING SYSTEM</div>
          <h1 className="landing-h1">The operating system for<br />enterprise value.</h1>
          <p className="landing-lede">One command surface for finding, realizing and sustaining return across the portfolio — deterministic intelligence, return-maximization, no savings target.</p>

          <div className="landing-vum">
            <div className="landing-vum-big mono">{money(vum.total)}</div>
            <div>
              <div className="landing-vum-label">Enterprise value under management</div>
              <div className="landing-vum-sub">{money(vum.realized)} realized · {money(vum.forecast)} risk-adjusted forecast · {money(vum.opportunity)} identified</div>
            </div>
          </div>

          <div className="landing-cta">
            <button className="btn accent lg" onClick={go}>Enter the operating system →</button>
            <span className="landing-stat"><b className="mono">{num(vum.initiatives)}</b> active initiatives</span>
            <span className="landing-stat"><b className="mono">{money(vum.pipeline)}</b> risk-adjusted pipeline</span>
          </div>
        </section>

        <section className="landing-pillars">
          {PILLARS.map((p) => (
            <div key={p.k} className="landing-pillar">
              <div className="landing-pill-bar" style={{ background: p.color }} />
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </section>

        <section className="landing-journey">
          <div className="landing-journey-head">
            <BrandMark size={30} journey />
            <span>The value journey — every initiative moves through four stages.</span>
          </div>
          <div className="landing-journey-flow">
            {JOURNEY.map((s, i) => (
              <div key={s.key} className="landing-stage" style={{ '--sc': s.color }}>
                <span className="landing-stage-dot" style={{ background: s.color }} />
                <b>{s.label}</b>
                {i < JOURNEY.length - 1 && <span className="landing-stage-arrow">→</span>}
              </div>
            ))}
          </div>
        </section>

        <footer className="landing-foot">
          <span>Deterministic · rules-based intelligence — no language model.</span>
          <span>Return-maximization model · value counts only once FP&amp;A validates it.</span>
        </footer>
      </div>
    </div>
  )
}
