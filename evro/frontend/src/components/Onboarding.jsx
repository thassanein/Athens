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

  const STEPS = useMemo(() => [
    {
      page: 'procurement', target: '.pdash-sum', eyebrow: 'ONE SOURCE OF TRUTH',
      title: 'This year’s impact, risk-adjusted.',
      body: `EVRO is Athens' Enterprise Intelligence Operating System — Procurement is its first live capability. The headline is ${focusYear} impact: ${money(impactFocus)} risk-adjusted, with ${money(m.sum.lenses.realized)} already FP&A-validated.`,
      solves: 'No more arguing over whose spreadsheet is right — one validated number, with everything behind it a click away.',
      metrics: [{ label: `${focusYear} impact`, value: money(impactFocus) }, { label: 'Validated YTD', value: money(m.sum.lenses.realized) }, { label: 'Confidence', value: pct(m.sum.confidence) }],
    },
    {
      page: 'procurement', target: '.pyr', eyebrow: 'IMPACT PER YEAR',
      title: `Phased across ${focusYear}, ${focusYear + 1}, ${focusYear + 2}…`,
      body: `Each saving is measured over a 12-month window, so its run-rate is phased into the years it actually lands. ${focusYear} is the focus at ${money(impactFocus)}; toggle Risk-adjusted ↔ Gross, or split by hard savings vs avoidance.`,
      solves: '“Annual savings” stops being one blurry figure that double-counts across years — each year shows what truly lands.',
      metrics: [{ label: `${focusYear} (focus)`, value: money(impactFocus) }, { label: 'Basis', value: 'Risk-adjusted' }],
    },
    {
      page: 'procurement', target: '.pdash-types', eyebrow: 'SAVINGS, DEFINED ONCE',
      title: 'Hard savings vs cost avoidance — kept apart.',
      body: `${defs} savings types, all measured against the FP&A baseline. Hard savings (${money(pnlTotal)}) lower the P&L; cost avoidance (${money(softTotal)}) is priced against a would-have baseline and reported apart.`,
      solves: 'One taxonomy, two clean ledgers — Procurement, Finance and Operations finally count “savings” the same way.',
      metrics: [{ label: 'Hard savings', value: money(pnlTotal) }, { label: 'Cost avoidance', value: money(softTotal) }],
    },
    {
      page: 'procurement', target: '.pdash-funnel', eyebrow: 'VALUE CHAIN & OPPORTUNITY ID',
      title: 'A strong value chain — nothing falls through.',
      body: 'Opportunities are surfaced from spend analytics, then move through one eleven-stage lifecycle: Source-to-Contract → Contract-to-Value → Value Realization. The stages sum, to the dollar, to the book.',
      solves: 'Nothing stalls between sourcing and finance — every opportunity is identified, staged and visible end to end.',
      metrics: [{ label: 'Lifecycle stages', value: '11' }, { label: 'Reconciles to', value: money(m.sum.total) }],
    },
    {
      page: 'procurement', target: '.pdash-forecast', eyebrow: 'A FORECAST YOU CAN TRUST',
      title: 'Risk-adjusted, validation-gated.',
      body: 'Realized run-rate to date, then a risk-adjusted, confidence-weighted projection for the rest of the year. Value only counts as realized once FP&A validates the actuals.',
      solves: 'A forecast that isn’t wishful — on the same record as the actuals, so it holds up in the boardroom.',
      metrics: [{ label: 'Realized YTD', value: money(m.sum.lenses.realized) }, { label: 'Basis', value: 'Risk-adjusted' }],
    },
    {
      page: 'procurement', target: '.pdash-atrisk', eyebrow: 'RISK, IN THE OPEN',
      title: `${money(m.sum.atRisk)} at risk — seen now, not at year-end.`,
      body: `${num(redCount)} opportunities are red — ${money(m.sum.atRisk)} exposed — each with a risk score and countermeasure status. Top blockers names the ${num(blockers)} that gate the most downstream value.`,
      solves: 'Risk surfaces now, not when the savings miss — with the fix order already ranked.',
      metrics: [{ label: 'At-risk value', value: money(m.sum.atRisk) }, { label: 'Red · blockers', value: `${num(redCount)} · ${num(blockers)}` }],
    },
    {
      page: 'savingspipeline', target: '.swin-summary', eyebrow: 'THE 12-MONTH RULE',
      title: 'Every saving counts for twelve months.',
      body: 'Athens counts each saving for 12 months from first reporting, then banks it to protected run-rate — never re-claiming year-one value forever. The window rides on every card.',
      solves: 'Savings stop getting re-counted until the number is fiction — the book stays a credible annual run-rate.',
      metrics: [{ label: 'Measurement', value: '12 months' }, { label: 'Then', value: 'Banked run-rate' }],
    },
    {
      page: 'savingspipeline', target: '.pfun', eyebrow: 'THE PIPELINE, AS A FUNNEL',
      title: 'The whole book, flowing through one funnel.',
      body: 'The $437.4M addressable base as a funnel: Pipeline → Committed → In delivery → Realizing → Banked. Every bubble is a project — hover for detail, filter by type, or scope to a single year.',
      solves: '“The pipeline” stops being a static slide — every project flows through one funnel you can interrogate.',
      metrics: [{ label: 'Projects', value: num(m.sum.count) }, { label: 'Addressable spend', value: '$437.4M' }],
    },
    {
      page: 'opportunity', id: oppId, target: '.ows-head', eyebrow: 'ONE SCREEN, ONE OWNER',
      title: 'The whole story — and who owns it.',
      body: 'One screen per opportunity: business case, financials, supplier, risks, dependencies, the decision trail and an AI recommendation — with a named owner and sponsor. Every number drills to its source.',
      solves: 'The story stops living in decks and DMs — one screen, one accountable owner, fully traceable.',
      metrics: [{ label: 'Owner', value: 'Named' }, { label: 'Evidence', value: 'Traceable' }],
    },
    {
      page: 'opportunity', id: oppId, target: '.ows-track', eyebrow: 'THE PHASES',
      title: 'Eleven phases, one clear path to value.',
      body: 'Every project walks the same eleven phases — Potential through Closed — across the three value-chain steps. The current phase is lit; value only books as realized once FP&A validates.',
      solves: 'No two categories run different informal processes — every project is on the same path, comparable at a glance.',
      metrics: [{ label: 'Phases', value: '11' }, { label: 'Value-chain steps', value: '3' }],
    },
    {
      page: 'opportunity', id: oppId, target: '.ows-risks', eyebrow: 'RISKS & DEPENDENCIES',
      title: 'Risks scored, dependencies mapped.',
      body: `Each project carries a risk register scored 1–25, high risks flagged without a countermeasure, plus the upstream projects that must land first.${oppRisks ? ` This one carries ${oppRisks} risk${oppRisks === 1 ? '' : 's'}${oppWorst ? `, worst ${oppWorst}` : ''}.` : ''}`,
      solves: 'Risks and dependencies live on the record, scored and mapped — nothing blindsides the plan.',
      metrics: [{ label: 'Risk scoring', value: '1–25' }, { label: 'This project', value: `${oppRisks} risk${oppRisks === 1 ? '' : 's'}` }],
    },
    {
      page: 'decisioncenter', target: '.dc-ladder', eyebrow: 'CLEAR APPROVALS',
      title: 'Who decides, who signs, by when.',
      body: `${num(dq.length)} decisions waiting, ${money(evAtStake)} of expected value at stake — each with its owner, the exact ladder (Category Manager → FP&A → CPO / Steering) and what it’s waiting on.`,
      solves: 'Approvals stop stalling — everyone can see who signs next and what the deal needs.',
      metrics: [{ label: 'Decisions waiting', value: num(dq.length) }, { label: 'Value at stake', value: money(evAtStake) }],
    },
    {
      page: 'glossary', target: '.glo-ledgers', eyebrow: 'WHERE EVERY NUMBER COMES FROM',
      title: 'Nothing is a black box.',
      body: 'One page defines it all: the confidence ladder by phase (25 → 50 → 75 → 100), the hard-vs-avoidance forecast rules, and every metric mapped to its formula and source. Definitions also surface on hover.',
      solves: 'Challenge any number and the formula and source are right there — one rulebook for the enterprise.',
      metrics: [{ label: 'Confidence ladder', value: '25/50/75/100' }, { label: 'Every metric', value: 'Traceable' }],
    },
    {
      page: 'procai', target: '.pai-brief', eyebrow: 'EVRO AI · ON STEROIDS',
      title: 'Decision intelligence — not a chatbot.',
      body: 'Deterministic AI throughout: five executive briefs, proactive next-best-action agents, one-click auto-drafted briefs, a What-If simulator, and an “Ask EVRO” copilot on every screen. Every answer traces to the record.',
      solves: 'No black-box “AI number” — every recommendation and what-if is rules-based and checkable.',
      metrics: [{ label: 'Executive briefs', value: '5' }, { label: 'Every claim', value: 'Traceable' }],
    },
    {
      page: 'studio', target: '.stu-banner', eyebrow: 'EVRO STUDIO · NO-CODE CONFIG',
      title: 'Change the logic without touching code.',
      body: 'The no-code console: edit definitions, labels and approval routing live, and model the confidence ladder, weights and materiality with a preview before promoting. The engine stays the source of truth.',
      solves: 'Changing a rule no longer needs a ticket and a release — leadership holds the levers, governed and previewed.',
      metrics: [{ label: 'Config', value: 'No-code' }, { label: 'Engine', value: 'Source of truth' }],
    },
    {
      page: 'settings', target: '.set-grid', eyebrow: 'ONE PLATFORM, MORE TO COME',
      title: 'Procurement today. The enterprise next.',
      body: 'Procurement is live. Fleet, Customer Experience, Operations, People and Finance are declared here and one flag away — same platform, identity, engine and governance.',
      solves: 'No more a tool per function — the next capability reuses this exact architecture, no re-platforming.',
      metrics: [{ label: 'Active', value: '1 of 6' }, { label: 'Reactivation', value: 'Config only' }],
    },
    {
      page: 'procurement', target: '.pdash-sum', eyebrow: 'THE PAYOFF', last: true,
      title: 'One aligned truth, board-ready today.',
      body: `${money(m.sum.total)} reconciles to the dollar across every screen, with ${money(impactFocus)} landing in ${focusYear}. Aligned definitions, an honest forecast, clear approvals, one source of truth. This is Phase One of EVRO.`,
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
