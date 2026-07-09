import { useEffect, useMemo, useState, useRef } from 'react'
import { procurementModel, decisionQueue, SAVINGS_TYPES } from '../lib/procurement.js'
import { impactByYear } from '../lib/procurement-window.js'
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
  const defs = SAVINGS_TYPES.length
  const redCount = m.opportunities.filter((o) => o.ragStatus === 'red').length
  const blockers = m.blockers.length
  const populatedStages = m.pipeline.filter((s) => s.count > 0).length
  const topOpp = m.opportunities.find((o) => o.id === oppId) || m.opportunities[0]
  const oppRisks = topOpp && topOpp.risks ? topOpp.risks.length : 0
  const oppWorst = (topOpp && topOpp.worstRisk) || 0
  const focusYear = Number(String(db.meta.now).slice(0, 4))
  const yImpact = useMemo(() => impactByYear(db, 'rav'), [db])
  const impactFocus = yImpact.find((y) => y.year === focusYear)?.value || 0
  const nextYears = yImpact.filter((y) => y.year > focusYear).length
  const pnlTotal = m.byType.filter((t) => t.pnl).reduce((s, t) => s + t.value, 0)
  const softTotal = m.byType.filter((t) => !t.pnl).reduce((s, t) => s + t.value, 0)

  // A tight walk of the FOUR project phases — Pipeline → Commit → Execute →
  // Realize — bookended by the one number and the payoff. Six beats, not
  // seventeen: every saving follows the same four phases, so the tour does too.
  const STEPS = useMemo(() => [
    {
      page: 'procurement', target: '.pdash-sum', eyebrow: 'THE ONE NUMBER',
      title: 'This year’s impact, in one number.',
      body: `EVRO is Athens’ savings operating system. The headline is ${focusYear} impact: ${money(impactFocus)} risk-adjusted, with ${money(m.sum.lenses.realized)} already checked by Finance. Every deal behind it follows the same four phases — which this tour walks.`,
      solves: 'No more arguing over whose spreadsheet is right — one validated number, everything behind it a click away.',
      metrics: [{ label: `${focusYear} impact`, value: money(impactFocus) }, { label: 'Confirmed YTD', value: money(m.sum.lenses.realized) }, { label: 'Confidence', value: pct(m.sum.confidence) }],
    },
    {
      page: 'savingspipeline', target: '.pfun2-cols', eyebrow: 'PHASE 1 · PIPELINE',
      title: 'Every idea enters one funnel.',
      body: `Opportunities are surfaced from spend analytics, then qualified and business-cased — the top of the funnel. ${num(m.sum.count)} deals flow through the same four phases; each bubble is a real project you can hover and open.`,
      solves: 'Nothing gets lost between “good idea” and the plan — every opportunity is identified, sized and visible.',
      metrics: [{ label: 'Live deals', value: num(m.sum.count) }, { label: 'Under management', value: money(m.sum.total) }],
    },
    {
      page: 'decisioncenter', target: '.dc-ladder', eyebrow: 'PHASE 2 · COMMIT',
      title: 'Approved, negotiated, awarded — with a clear sign-off.',
      body: `A deal commits once it’s approved and awarded. ${num(dq.length)} decisions are waiting, ${money(evAtStake)} of value at stake — each with its owner and the exact ladder: Category Manager → Finance → CPO / Steering.`,
      solves: 'Approvals stop stalling — everyone sees who signs next and what the deal is waiting on.',
      metrics: [{ label: 'Decisions waiting', value: num(dq.length) }, { label: 'Value at stake', value: money(evAtStake) }],
    },
    {
      page: 'opportunity', id: oppId, target: '.ows-track', eyebrow: 'PHASE 3 · EXECUTE',
      title: 'Rolled into operations, validated by Finance.',
      body: 'In Execute the new contract goes live in spend and Finance validates the delivered value against the baseline. The current phase is lit on the track; value only books as realized once the actuals check out.',
      solves: 'The saving doesn’t just get signed — it’s implemented and proven, on the same record.',
      metrics: [{ label: 'Named owner', value: 'Yes' }, { label: 'Value', value: 'Validation-gated' }],
    },
    {
      page: 'savingspipeline', target: '.swin-summary', eyebrow: 'PHASE 4 · REALIZE',
      title: 'Counted for twelve months, then banked.',
      body: 'Realized value flows through the P&L for a 12-month window from first reporting, then banks to protected run-rate — never re-claimed year after year. The window rides on every card, so the book stays honest.',
      solves: 'Savings stop getting re-counted until the number is fiction — the book is a credible annual run-rate.',
      metrics: [{ label: 'Measurement', value: '12 months' }, { label: 'Then', value: 'Banked run-rate' }],
    },
    {
      page: 'procurement', target: '.pdash-sum', eyebrow: 'THE PAYOFF', last: true,
      title: 'Four phases, one aligned truth.',
      body: `${money(m.sum.total)} reconciles to the dollar across every screen, ${money(impactFocus)} landing in ${focusYear}. Pipeline → Commit → Execute → Realize — one path, one language, board-ready today.`,
      solves: 'Numbers finally tie out between teams — one truth, ready for the board now.',
      metrics: [{ label: 'Reconciles', value: 'To the dollar' }, { label: 'Status', value: 'Board-ready' }],
    },
  ], [m, dq, oppId, evAtStake, defs, redCount, blockers, populatedStages, oppRisks, oppWorst, focusYear, impactFocus, nextYears, pnlTotal, softTotal])

  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)

  // extend the page (bottom padding) while the tour runs, so even the last
  // content on a short mobile page can scroll up clear of the bottom sheet.
  useEffect(() => {
    document.documentElement.classList.add('evro-tour')
    return () => document.documentElement.classList.remove('evro-tour')
  }, [])
  const [playing, setPlaying] = useState(true)
  const [prog, setProg] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
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
  // while the freshly-navigated page mounts). On phones the panel is a bottom
  // sheet, so the target is scrolled to the TOP of the screen (block:'start')
  // to keep it clear of the sheet; on desktop it's centered.
  useEffect(() => {
    let timer, tries = 0
    const mobile = typeof window !== 'undefined' && window.innerWidth <= 640
    const measure = () => {
      const el = step.target ? document.querySelector(step.target) : null
      if (el) {
        // Park the target a fixed distance below the top of the viewport (clear
        // of the topbar) by scrolling the window directly — reliable on the
        // phone where the bottom sheet occupies the lower half of the screen.
        const offset = mobile ? 68 : 96
        const r0 = el.getBoundingClientRect()
        const y = Math.max(0, window.scrollY + r0.top - offset)
        window.scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' })
        timer = setTimeout(() => {
          const r = el.getBoundingClientRect()
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        }, reduced() ? 0 : 360)
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

      <section className={`onb ${rm ? '' : 'onb-in'} ${collapsed ? 'onb-collapsed' : ''}`} role="dialog" aria-modal="true" aria-label="EVRO Procurement walkthrough">
        <div className="onb-prog" aria-hidden="true"><i style={{ width: `${Math.round(prog * 100)}%` }} /></div>
        <div className="onb-head">
          <span className="onb-mark"><EvroMark size={26} id="onb" /></span>
          <div className="onb-eyebrow">{step.eyebrow} · EVRO PROCUREMENT</div>
          <button className="onb-play" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand walkthrough' : 'Minimize to see the highlight'} title={collapsed ? 'Expand' : 'Minimize'}>{collapsed ? '▴' : '▾'}</button>
          <button className="onb-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause tour' : 'Play tour'} title={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
          <span className="onb-count mono">{i + 1}/{STEPS.length}</span>
          <button className="iconbtn" onClick={onClose} aria-label="Close walkthrough"><IconClose /></button>
        </div>
        {collapsed && <div className="onb-collapsed-row"><b>{step.title}</b><button className="btn accent sm" onClick={() => { setPlaying(false); next() }}>{step.last ? 'Enter →' : 'Next →'}</button></div>}

        {!collapsed && (
        <div className="onb-scroll">
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

          <div className="onb-solves" key={`s${i}`}>
            <span className="onb-solves-l">Solves today's friction</span>
            <span className="onb-solves-t">{step.solves}</span>
          </div>
        </div>
        )}

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
