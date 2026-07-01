import { useEffect, useMemo, useState } from 'react'
import { strategicSummary, strategicNarratives } from '../lib/companion.js'
import { money, num } from '../lib/format.js'
import { AnimatedValue } from './ui.jsx'
import { BrandMark, BrandLockup, JOURNEY } from './Brand.jsx'
import { IconAI } from './Icons.jsx'

// EVRO landing experience — the premium "enterprise operating system" front
// door. Presents the strategic state of the enterprise (value under management
// + who and where value is created), a rotating strategic narrative, and the
// Find → Realize → Sustain promise, then enters the OS. View-only.
const PILLARS = [
  { k: 'find', title: 'Find Value', body: 'Surface opportunity across every dollar of addressable spend — AI mining, leakage and inflation exposure.', color: 'var(--opp)' },
  { k: 'realize', title: 'Realize Value', body: 'Gate initiatives to FP&A-validated realized value, ranked by risk-adjusted return. No savings target.', color: 'var(--green)' },
  { k: 'sustain', title: 'Sustain Value', body: 'Protect delivered value with sustainment scoring, erosion watch and one-click recovery.', color: 'var(--navy)' },
]
const ROLE_TAG = { exec: 'Executive Command', admin: 'EVRO Command', fpna: 'Financial Control', leader: 'Function Leadership', owner: 'Initiative Owner', procurement: 'Procurement' }
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Landing({ db, user, onEnter }) {
  const s = useMemo(() => strategicSummary(db), [db])
  const narratives = useMemo(() => strategicNarratives(db), [db])
  const [ni, setNi] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const fy = db.meta.fiscalYear

  useEffect(() => {
    if (reducedMotion() || narratives.length < 2) return undefined
    const t = setInterval(() => setNi((i) => (i + 1) % narratives.length), 4200)
    return () => clearInterval(t)
  }, [narratives.length])

  const go = () => {
    if (leaving) return
    if (reducedMotion()) { onEnter(); return }
    setLeaving(true); setTimeout(onEnter, 360)
  }

  const STATS = [
    { label: 'Realized (YTD)', value: money(s.realized), sub: 'FP&A-validated', tone: 'var(--green)' },
    { label: 'Risk-adjusted forecast', value: money(s.forecast), sub: 'rest of FY', tone: 'var(--navy)' },
    { label: 'Identified opportunity', value: money(s.opportunity), sub: 'not yet in plan', tone: 'var(--opp)' },
    { label: 'Active initiatives', value: num(s.initiatives), sub: 'in the pipeline', tone: '#fff' },
    { label: 'Value leaders', value: num(s.leaders), sub: s.topLeader ? `${s.topLeader.name} leads` : 'the movement', tone: '#fff' },
    { label: 'Regions', value: num(s.regions), sub: s.topRegion ? `${s.topRegion.name} top` : 'across the portfolio', tone: '#fff' },
    { label: 'Business units', value: num(s.businessUnits), sub: s.topBU ? `${s.topBU.name} top` : 'enterprise-wide', tone: '#fff' },
  ]

  return (
    <div className={`landing ${leaving ? 'leaving' : ''}`}>
      <div className="landing-inner">
        <header className="landing-top">
          <BrandLockup size={40} sub="Enterprise Value Realization OS" />
          <button className="btn accent landing-enter-sm" onClick={go}>Enter →</button>
        </header>

        <section className="landing-hero">
          <div className="landing-eyebrow">ATHENS SERVICES · {(ROLE_TAG[user?.role] || 'Enterprise').toUpperCase()} · FY{fy}</div>
          <h1 className="landing-h1">The operating system for<br />enterprise value.</h1>
          <p className="landing-lede">One command surface for finding, realizing and sustaining return across the portfolio — deterministic intelligence, return-maximization, no savings target.</p>

          <div className="landing-narrative">
            <span className="badge b-grey"><IconAI /> AI · rules-based</span>
            <span key={ni} className="landing-narrative-text">{narratives[ni]}</span>
          </div>

          <div className="landing-summary">
            <div className="landing-vum">
              <div className="landing-vum-big mono"><AnimatedValue value={money(s.total)} duration={900} /></div>
              <div>
                <div className="landing-vum-label">Enterprise value under management</div>
                <div className="landing-vum-sub">the state of the enterprise · FY{fy}</div>
              </div>
            </div>
            <div className="landing-stats">
              {STATS.map((st) => (
                <div key={st.label} className="landing-stat-card">
                  <div className="tiny landing-stat-label">{st.label}</div>
                  <div className="mono landing-stat-val" style={{ color: st.tone }}><AnimatedValue value={st.value} duration={900} /></div>
                  <div className="tiny landing-stat-sub">{st.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-cta">
            <button className="btn accent lg" onClick={go}>Enter the operating system →</button>
            <span className="landing-stat"><b className="mono">{money(s.pipeline)}</b> risk-adjusted pipeline</span>
            <span className="landing-stat"><b className="mono">{num(s.millionClub)}</b> in the Million Dollar Club</span>
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
            {JOURNEY.map((st, i) => (
              <div key={st.key} className="landing-stage" style={{ '--sc': st.color }}>
                <span className="landing-stage-dot" style={{ background: st.color }} />
                <b>{st.label}</b>
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
