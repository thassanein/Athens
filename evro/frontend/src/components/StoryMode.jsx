import { useEffect, useState } from 'react'
import { execSummary, controlTower, decisionsRequired, rankInitiatives } from '../lib/engine.js'
import { money } from '../lib/format.js'
import { IconClose } from './Icons.jsx'

// Executive Story Mode — a full-screen, keyboard-navigable presenter that walks
// the FY value narrative. Deterministic; reads the same engine outputs the
// cockpit does. Arrow keys / space advance; Esc exits.
export default function StoryMode({ db, user, onClose }) {
  const ct = controlTower(db)
  const sum = execSummary(db)
  const top = rankInitiatives(db, 'return')[0]
  const dec = decisionsRequired(db, user)
  const slides = [
    { lbl: 'Athens EVRO · FY value story', title: 'Where we are', big: money(ct.valueCreated), cap: 'realized to date · FP&A-validated', sub: sum.headline },
    { lbl: 'The biggest return', title: top?.title || 'Portfolio', big: money(top?.rav || 0), cap: 'risk-adjusted value', sub: sum.bullets[0] },
    { lbl: 'What is at risk', title: 'Value that could slip', big: money(ct.valueAtRisk), cap: `including ${money(ct.leakage)} leaking versus plan`, sub: sum.bullets[1] },
    { lbl: 'The cost headwind', title: 'Inflation exposure', big: money(ct.inflationExposure), cap: 'addressable × CPI — cost avoidance must offset it', sub: sum.bullets[2] },
    { lbl: 'What we can fund', title: 'Optimizable value', big: money(ct.optimizableValue), cap: `fundable within the ${money(ct.capitalBudget)} capital envelope`, sub: sum.bullets[3] },
    { lbl: 'The decisions in front of you', title: 'What needs a decision', big: String(dec.length), cap: `${dec.filter((d) => d.kind === 'approval').length} awaiting your sign-off`, sub: 'Start at the top — everything is ranked highest-value first. Return is the only target.' },
  ].filter((s) => s.sub != null)

  const [k, setK] = useState(0)
  const next = () => setK((v) => Math.min(slides.length - 1, v + 1))
  const prev = () => setK((v) => Math.max(0, v - 1))
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const s = slides[k]
  return (
    <div className="story" role="dialog" aria-label="Executive story mode">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="badge b-red">Story mode</span>
        <span className="lead" style={{ fontSize: 13, margin: 0 }}>Executive value narrative · rules-based</span>
        <span style={{ flex: 1 }} />
        <span className="lead" style={{ fontSize: 13, margin: 0 }}>{k + 1} / {slides.length}</span>
        <button className="iconbtn" onClick={onClose} aria-label="Exit story mode" style={{ color: '#fff' }}><IconClose /></button>
      </div>

      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <div style={{ maxWidth: 940 }}>
          <div className="lbl" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, color: '#8b97a8', fontWeight: 700 }}>{s.lbl}</div>
          <h1 style={{ marginTop: 8 }}>{s.title}</h1>
          <div className="big" style={{ color: '#fff', marginTop: 6 }}>{s.big}</div>
          <div className="lead" style={{ marginTop: 4 }}>{s.cap}</div>
          <p className="lead" style={{ marginTop: 22, fontSize: 18 }}>{s.sub}</p>
        </div>
      </div>

      <div className="story-nav">
        <button className="btn" onClick={prev} disabled={k === 0}>← Back</button>
        <div style={{ display: 'flex', gap: 7 }}>
          {slides.map((_, i) => <button key={i} onClick={() => setK(i)} aria-label={`Slide ${i + 1}`} style={{ width: 9, height: 9, padding: 0, borderRadius: '50%', border: 'none', background: i === k ? 'var(--red)' : 'rgba(255,255,255,0.28)' }} />)}
        </div>
        <span style={{ flex: 1 }} />
        {k < slides.length - 1 ? <button className="btn accent" onClick={next}>Next →</button> : <button className="btn accent" onClick={onClose}>Done</button>}
      </div>
    </div>
  )
}
