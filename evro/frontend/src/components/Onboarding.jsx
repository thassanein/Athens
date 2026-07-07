import { useEffect, useMemo, useState, useRef } from 'react'
import { procurementModel, decisionQueue } from '../lib/procurement.js'
import { money, pct, num } from '../lib/format.js'
import { EvroMark } from './Brand.jsx'
import { AnimatedValue } from './ui.jsx'
import { IconClose } from './Icons.jsx'

// Onboarding walkthrough — the ~5-minute guided pitch of EVRO Procurement to an
// executive sponsor, built for visual learners. It drives the real app to each
// surface, then SPOTLIGHTS the exact element it is talking about (dimming the
// rest, with a pulsing ring and a smooth scroll-to), auto-plays with a progress
// bar, and counts the metric chips up. Self-paced too: Back / Next / dots / Esc
// / arrows / play-pause. Non-modal — the live screen stays visible. No data touch.
const reduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const STEP_MS = 17000

export default function Onboarding({ db, navigate, onClose }) {
  const m = useMemo(() => procurementModel(db), [db])
  const dq = useMemo(() => decisionQueue(db), [db])
  const oppId = (dq[0] && dq[0].id) || (m.opportunities[0] && m.opportunities[0].id)
  const evAtStake = dq.reduce((s, o) => s + o.nextDecision.expectedValue, 0)
  const types = m.byType.filter((t) => t.count > 0).length

  const STEPS = useMemo(() => [
    {
      page: 'procurement', target: '.pdash-sum', eyebrow: 'WELCOME',
      title: 'EVRO — one operating system for enterprise value.',
      body: 'Athens is not turning on a procurement tool. It is turning on the first capability of EVRO, its Enterprise Intelligence Operating System. This 5-minute tour shows what Procurement does — and how the same platform will run Fleet, CX, Operations and Finance next.',
      point: 'One platform, one identity, one engine — Procurement is capability one.',
      metrics: [{ label: 'Active capability', value: 'Procurement' }, { label: 'Under management', value: money(m.sum.total) }],
    },
    {
      page: 'procurement', target: '.pdash-lenses', eyebrow: 'THE FIVE-SECOND READ',
      title: 'Open it, and know where you stand.',
      body: `Savings Under Management is ${money(m.sum.total)} across ${num(m.sum.count)} opportunities, running at ${pct(m.sum.confidence)} confidence and landing ${money(m.velocity.perMonth)} a month. The four lenses read the funnel left to right — Identified, Committed, Realized, Sustained. No savings target: value is ranked by return.`,
      point: 'Status, confidence, risk and the next decision — in one glance.',
      metrics: [{ label: 'Opportunities', value: num(m.sum.count) }, { label: 'Confidence', value: pct(m.sum.confidence) }, { label: 'Velocity', value: `${money(m.velocity.perMonth)}/mo` }],
    },
    {
      page: 'procurement', target: '.pdash-funnel', eyebrow: 'ONE SHARED LIFECYCLE',
      title: 'Every dollar moves through one visible value chain.',
      body: 'This funnel is the eleven-stage savings lifecycle — Potential through Closed — grouped into the procurement value chain: Source-to-Contract, Contract-to-Value, Value Realization. The eleven stages sum, to the dollar, to the headline above. Everything on every screen reconciles.',
      point: 'The highlighted funnel sums exactly to Savings Under Management.',
      metrics: [{ label: 'Lifecycle stages', value: '11' }, { label: 'Reconciles to', value: money(m.sum.total) }],
    },
    {
      page: 'savingspipeline', target: '.svp-filters', eyebrow: 'THE SAVINGS BOOK',
      title: 'The whole book, in one shared language.',
      body: `Every opportunity across Athens' fourteen sourcing groups — Fleet Capital, Facilities, Benefits & Insurance and the rest of the $437M addressable base — grouped by stage. Filter by savings type: Hard Savings, Cost Avoidance, Productivity and five more, each with a governance definition Procurement, FP&A and Operations all share.`,
      point: 'Tap any opportunity to open its full workspace.',
      metrics: [{ label: 'Savings types', value: String(types) }, { label: 'Addressable spend', value: '$437.4M' }],
    },
    {
      page: 'opportunity', id: oppId, target: '.ows-head', eyebrow: 'ONE OPPORTUNITY, END TO END',
      title: 'The whole story on a single screen.',
      body: 'Mission header, the lifecycle, a board-ready summary, the business case, financial and operational impact, supplier and category, dependencies and risks, the decision trail, and an AI recommendation — all here. Press "View evidence" and every number drills to the source record it came from.',
      point: 'No number is asserted without its evidence one click away.',
      metrics: [{ label: 'Evidence-backed', value: 'Yes' }, { label: 'Source records', value: 'Traceable' }],
    },
    {
      page: 'decisioncenter', target: '.dc-rec', eyebrow: 'THE DECISION THAT MATTERS',
      title: 'Make the next decision obvious — and take it.',
      body: `${num(dq.length)} decisions are waiting, ${money(evAtStake)} of expected value at stake, ranked by value. Each shows what to decide, who owns it, the confidence, the missing evidence, the alternatives, and why the recommendation was made. The governance ladder — Category Manager, FP&A Validation, CPO / Steering — governs who can sign, and you can approve, return or comment right here.`,
      point: 'Decisions are taken in-app, under real approval governance.',
      metrics: [{ label: 'Decisions waiting', value: num(dq.length) }, { label: 'Value at stake', value: money(evAtStake) }],
    },
    {
      page: 'procai', target: '.pai-brief', eyebrow: 'ENTERPRISE AI',
      title: 'Decision intelligence — not a chatbot.',
      body: 'Five executive briefs — pipeline, risk, forecast variance, approvals, realization — each written as what happened, why it matters, and what to decide next. Every brief carries its confidence, evidence, assumptions, risks and expected value. It is deterministic and rules-based: no language model, and no fabricated numbers anywhere in the system.',
      point: 'Every AI claim exposes its confidence and its evidence.',
      metrics: [{ label: 'Executive briefs', value: '5' }, { label: 'Fabricated numbers', value: 'Zero' }],
    },
    {
      page: 'settings', target: '.set-grid', eyebrow: 'ONE PLATFORM, MORE TO COME',
      title: 'Procurement today. The enterprise next.',
      body: 'Procurement is the active capability. Fleet & Maintenance, Customer Experience, Operations, People and Finance are declared here and switched off — each is one flag away. When Athens is ready, they light up on the same platform, the same identity, the same value engine and the same decision governance you just saw.',
      point: 'The architecture you saw is reusable for every future capability.',
      metrics: [{ label: 'Active', value: '1 of 6' }, { label: 'Reactivation', value: 'Config only' }],
    },
    {
      page: 'procurement', target: '.pdash-sum', eyebrow: 'WHY IT IS REAL', last: true,
      title: 'One coherent platform, provably grounded.',
      body: `${money(m.sum.total)} reconciles to the dollar across the dashboard, the workspace, the briefs and the evidence. The deterministic value engine is provably unchanged — Procurement is a lens over it, not a rewrite. It is purpose-built on mobile, accessible in both themes, and board-demo ready today. This is Phase One of EVRO.`,
      point: 'Ready to run the board demo now.',
      metrics: [{ label: 'Reconciles', value: 'To the dollar' }, { label: 'Status', value: 'Board-ready' }],
    },
  ], [m, dq, oppId, evAtStake, types])

  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const [playing, setPlaying] = useState(true)
  const [prog, setProg] = useState(0)
  const step = STEPS[i]
  const goto = (n) => { setProg(0); setI(n) }
  const next = () => (i === STEPS.length - 1 ? onClose() : goto(i + 1))
  const back = () => goto(Math.max(0, i - 1))

  // drive the real app to this step's surface
  useEffect(() => {
    if (step?.page) navigate(step.page, step.id ? { id: step.id } : {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // spotlight: find the target, scroll it into view, measure it (with retries
  // while the freshly-navigated page mounts).
  useEffect(() => {
    let timer, tries = 0
    const measure = () => {
      const el = step.target ? document.querySelector(step.target) : null
      if (el) {
        el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' })
        timer = setTimeout(() => {
          const r = el.getBoundingClientRect()
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        }, reduced() ? 0 : 300)
      } else if (tries++ < 10) { timer = setTimeout(measure, 110) } else setRect(null)
    }
    setRect(null); measure()
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // keep the spotlight glued to the target as the page scrolls / resizes
  useEffect(() => {
    const on = () => {
      const el = step.target && document.querySelector(step.target)
      if (el) { const r = el.getBoundingClientRect(); setRect({ top: r.top, left: r.left, width: r.width, height: r.height }) }
    }
    window.addEventListener('resize', on); window.addEventListener('scroll', on, true)
    return () => { window.removeEventListener('resize', on); window.removeEventListener('scroll', on, true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  // auto-play: advance on a timed progress bar; stops on the finale
  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => {
      setProg((pr) => {
        const np = pr + 120 / STEP_MS
        if (np >= 1) {
          setI((cur) => { if (cur >= STEPS.length - 1) { setPlaying(false); return cur } return cur + 1 })
          return 0
        }
        return np
      })
    }, 120)
    return () => clearInterval(id)
  }, [playing, i, STEPS.length])

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') { setPlaying(false); next() }
      else if (e.key === 'ArrowLeft') { setPlaying(false); back() }
      else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  const rm = reduced()
  return (
    <>
      {rect ? (
        <div className={`onb-spot ${rm ? '' : 'onb-spot-anim'}`}
          style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }} aria-hidden="true" />
      ) : (
        <div className="onb-veil" onClick={onClose} aria-hidden="true" />
      )}

      <section className={`onb ${rm ? '' : 'onb-in'}`} role="dialog" aria-modal="true" aria-label="EVRO Procurement walkthrough">
        <div className="onb-prog" aria-hidden="true"><i style={{ width: `${Math.round(prog * 100)}%` }} /></div>
        <div className="onb-head">
          <span className="onb-mark"><EvroMark size={26} id="onb" /></span>
          <div className="onb-eyebrow">{step.eyebrow} · EVRO PROCUREMENT</div>
          <button className="onb-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause tour' : 'Play tour'} title={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
          <span className="onb-count mono">{i + 1}/{STEPS.length}</span>
          <button className="iconbtn" onClick={onClose} aria-label="Close walkthrough"><IconClose /></button>
        </div>

        <h2 className="onb-title" key={`t${i}`}>{step.title}</h2>
        <p className="onb-body" key={`b${i}`}>{step.body}</p>

        <div className="onb-metrics" key={`m${i}`}>
          {step.metrics.map((mt) => (
            <div key={mt.label} className="onb-metric">
              <div className="onb-metric-v mono">{/\d/.test(mt.value) ? <AnimatedValue value={mt.value} duration={900} /> : mt.value}</div>
              <div className="onb-metric-l">{mt.label}</div>
            </div>
          ))}
        </div>

        <div className="onb-point"><span className="onb-point-dot" /> {step.point}</div>

        <div className="onb-foot">
          <div className="onb-dots" aria-hidden="true">
            {STEPS.map((_, k) => <span key={k} className={`onb-dot ${k === i ? 'on' : k < i ? 'done' : ''}`} onClick={() => { setPlaying(false); goto(k) }} />)}
          </div>
          <span className="onb-time tiny">{playing ? 'auto-playing · ≈5 min' : 'paused'}</span>
          <span className="spacer" />
          {i > 0 && <button className="btn ghost sm" onClick={() => { setPlaying(false); back() }}>← Back</button>}
          <button className="btn accent sm" onClick={() => { setPlaying(false); next() }}>{step.last ? 'Enter EVRO →' : 'Next →'}</button>
        </div>
      </section>
    </>
  )
}
