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
      body: `EVRO is Athens' Enterprise Intelligence Operating System, and Procurement is its first live capability. The headline is ${focusYear} procurement impact — ${money(impactFocus)} risk-adjusted — with ${money(m.sum.lenses.realized)} already FP&A-validated year-to-date. Behind it sits a ${money(m.sum.total)} book across ${num(m.sum.count)} opportunities at ${pct(m.sum.confidence)} value-weighted confidence.`,
      solves: 'Today, every team keeps its own savings number in its own spreadsheet, and reviews start with an argument about whose number is right. EVRO leads with one risk-adjusted, validated figure — and shows exactly what backs it.',
      metrics: [{ label: `${focusYear} impact`, value: money(impactFocus) }, { label: 'Validated YTD', value: money(m.sum.lenses.realized) }, { label: 'Confidence', value: pct(m.sum.confidence) }],
    },
    {
      page: 'procurement', target: '.pyr', eyebrow: 'IMPACT PER YEAR',
      title: `Phased across ${focusYear}, ${focusYear + 1}, ${focusYear + 2}…`,
      body: `Every saving is measured over a 12-month window from launch, so its annual run-rate is phased month-by-month into the years it actually lands. ${focusYear} is the focus (${money(impactFocus)} risk-adjusted); the next ${num(nextYears)} year${nextYears === 1 ? '' : 's'} carry the tail. Toggle Risk-adjusted ↔ Gross to see either basis.`,
      solves: 'Today, "annual savings" is one blurry number that quietly double-counts across years. EVRO time-phases every saving, so each year shows the impact that truly lands in it.',
      metrics: [{ label: `${focusYear} (focus)`, value: money(impactFocus) }, { label: 'Basis', value: 'Risk-adjusted' }],
    },
    {
      page: 'procurement', target: '.pdash-types', eyebrow: 'SAVINGS DEFINITION ALIGNMENT',
      title: 'Hard savings vs cost avoidance — kept apart.',
      body: `${defs} standardized savings types, each measured against the FP&A baseline off the 2025 AP register. Hard savings (${money(pnlTotal)}) lower the P&L run-rate; cost avoidance and the soft types (${money(softTotal)}) are priced against a would-have baseline and reported apart — so the headline stays credible. The Methodology page defines every rule.`,
      solves: 'Today, Procurement, Finance and Operations each define "savings" differently, so half of every review is spent debating what counts. EVRO is one taxonomy with two clean ledgers the whole enterprise signs up to.',
      metrics: [{ label: 'Hard savings', value: money(pnlTotal) }, { label: 'Cost avoidance', value: money(softTotal) }],
    },
    {
      page: 'procurement', target: '.pdash-funnel', eyebrow: 'VALUE CHAIN & OPPORTUNITY ID',
      title: 'A strong value chain — nothing falls through.',
      body: 'Opportunities are surfaced from spend analytics across the addressable base, then move through one visible eleven-stage lifecycle grouped into the procurement value chain: Source-to-Contract, Contract-to-Value, Value Realization. The eleven stages sum, to the dollar, to the book above.',
      solves: 'Today, ideas stall between sourcing and finance, and good opportunities quietly fall through the cracks. EVRO gives one value chain where every opportunity is identified, staged and visible end to end.',
      metrics: [{ label: 'Lifecycle stages', value: '11' }, { label: 'Reconciles to', value: money(m.sum.total) }],
    },
    {
      page: 'procurement', target: '.pdash-forecast', eyebrow: 'ACCURATE FINANCIAL FORECASTING',
      title: 'A forecast the board can trust.',
      body: 'Realized run-rate to date, then a risk-adjusted projection for the rest of the year — committed versus expected, month by month. Value is time-phased and confidence-weighted on the phase ladder, and only counts as realized once FP&A validates the actuals.',
      solves: 'Today, forecasts are optimistic, manual and out of date the day they ship. EVRO forecasts are risk-adjusted and validation-gated — aligned to the same record as the actuals, so the number holds up in the boardroom.',
      metrics: [{ label: 'Realized YTD', value: money(m.sum.lenses.realized) }, { label: 'Basis', value: 'Risk-adjusted' }],
    },
    {
      page: 'procurement', target: '.pdash-atrisk', eyebrow: 'RISK, IN THE OPEN',
      title: `${money(m.sum.atRisk)} at risk — seen now, not at year-end.`,
      body: `${num(redCount)} opportunities are red right now — ${money(m.sum.atRisk)} of value exposed — each with a worst-risk score and whether a countermeasure is logged. The Top blockers panel names the ${num(blockers)} opportunities that gate the most downstream value, so you clear the right ones first.`,
      solves: 'Today, risk shows up at year-end when the savings miss, and nobody knows which item to unblock first. EVRO scores and ranks risk continuously, so the exposure — and the fix order — is visible now.',
      metrics: [{ label: 'At-risk value', value: money(m.sum.atRisk) }, { label: 'Red · blockers', value: `${num(redCount)} · ${num(blockers)}` }],
    },
    {
      page: 'savingspipeline', target: '.swin-summary', eyebrow: 'THE 12-MONTH RULE',
      title: 'Every saving counts for twelve months.',
      body: `Athens counts each saving for 12 months from its first financial reporting, then banks it to protected run-rate — it never re-claims year-one value forever. The window rides on every card: in-window, banked, pre-launch, and any expiring within three months. That discipline is what keeps the annual number honest.`,
      solves: 'Today, "savings" get re-counted year after year until the number is fiction. EVRO caps each saving at a 12-month measurement window, so the book is a credible annual run-rate.',
      metrics: [{ label: 'Measurement', value: '12 months' }, { label: 'Then', value: 'Banked run-rate' }],
    },
    {
      page: 'savingspipeline', target: '.pfun', eyebrow: 'THE PIPELINE, AS A FUNNEL',
      title: 'The whole book, flowing through the funnel.',
      body: `Every opportunity across Athens' ${'$437.4M'} addressable base, as a horizontal funnel: Pipeline → Committed → In delivery → Realizing → Banked. Each bubble is a project, sized by value and coloured by savings type — hover any bubble for its detail, filter by type, or scope the whole funnel to ${focusYear}, ${focusYear + 1} or ${focusYear + 2} to see that year's phased impact.`,
      solves: 'Today, "the pipeline" is a static number in a monthly deck with no idea what sits where. EVRO shows every project flowing through one funnel — hover for the story, filter and phase by year.',
      metrics: [{ label: 'Projects', value: num(m.sum.count) }, { label: 'Addressable spend', value: '$437.4M' }],
    },
    {
      page: 'opportunity', id: oppId, target: '.ows-head', eyebrow: 'ONE SCREEN, ONE OWNER',
      title: 'The whole story — and who owns it.',
      body: 'Business case, financial and operational impact, supplier and category, dependencies and risks, the decision trail, and an AI recommendation — all on one screen, with a named owner and sponsor at the top. Press "View evidence" and every number drills to its source record.',
      solves: 'Today, the story is scattered across decks, emails and DMs, and no one can say who owns the full picture. EVRO puts it on one screen with one accountable owner — a single source of truth per opportunity.',
      metrics: [{ label: 'Owner', value: 'Named' }, { label: 'Evidence', value: 'Traceable' }],
    },
    {
      page: 'opportunity', id: oppId, target: '.ows-track', eyebrow: 'THE PHASES',
      title: 'Eleven phases, one clear path to value.',
      body: 'Every project walks the same eleven-phase lifecycle — Potential through Closed — grouped into Source-to-Contract, Contract-to-Value and Value Realization. The current phase is lit and completed phases sit behind it. Value is committed as a project advances, and only booked as realized once FP&A validates.',
      solves: 'Today, every category runs its own informal process, so no two projects are comparable. EVRO puts every project on the same phased path — you always know exactly how far along it is.',
      metrics: [{ label: 'Phases', value: '11' }, { label: 'Value-chain steps', value: '3' }],
    },
    {
      page: 'opportunity', id: oppId, target: '.ows-risks', eyebrow: 'RISKS & DEPENDENCIES',
      title: 'Risks scored, dependencies mapped.',
      body: `Each project carries a risk register — category, status, and a likelihood-by-impact score from 1 to 25 — with high risks flagged when no countermeasure is logged, plus the upstream projects that must land first. This one is carrying ${oppRisks} risk${oppRisks === 1 ? '' : 's'}${oppWorst ? ` (worst score ${oppWorst})` : ''}.`,
      solves: 'Today, risks live in someone’s head or a side spreadsheet, and dependencies are discovered too late. EVRO scores every risk and maps every dependency on the record, so nothing blindsides the plan.',
      metrics: [{ label: 'Risk scoring', value: '1–25' }, { label: 'This project', value: `${oppRisks} risk${oppRisks === 1 ? '' : 's'}` }],
    },
    {
      page: 'decisioncenter', target: '.dc-ladder', eyebrow: 'CLEAR APPROVALS · WHO DOES WHAT',
      title: 'Who decides, who signs, by when.',
      body: `${num(dq.length)} decisions are waiting, ${money(evAtStake)} of expected value at stake. Each names its owner and the exact approval ladder — Category Manager, then FP&A Validation, then CPO / Steering for material awards — with due dates and the missing evidence. Approve, return or comment right here.`,
      solves: 'Today, approvals stall because nobody knows who has to sign, or what the deal is waiting on. EVRO makes the approval process explicit and shows who is doing what, at any point in time.',
      metrics: [{ label: 'Decisions waiting', value: num(dq.length) }, { label: 'Value at stake', value: money(evAtStake) }],
    },
    {
      page: 'glossary', target: '.glo-ledgers', eyebrow: 'WHERE EVERY NUMBER COMES FROM',
      title: 'Nothing is a black box.',
      body: `One methodology page defines it all: the confidence ladder by phase (pipeline 25% → committed 50% → in-delivery 75% → realizing 100%), the hard-savings vs cost-avoidance forecast rules, and a line-by-line map of every metric to its formula and source of truth. Definitions also surface on hover anywhere in the module.`,
      solves: 'Today, when a number is challenged, no one can say exactly how it was built. EVRO shows the formula and the source for every figure — the whole enterprise reads from one rulebook.',
      metrics: [{ label: 'Confidence ladder', value: '25/50/75/100' }, { label: 'Every metric', value: 'Traceable' }],
    },
    {
      page: 'procai', target: '.pai-brief', eyebrow: 'EVRO AI · ON STEROIDS',
      title: 'Decision intelligence — not a chatbot.',
      body: 'Deterministic AI across the module: five executive briefs (what happened, why it matters, what to decide), proactive next-best-action agents, one-click auto-drafted briefs you can export, a What-If simulator to size a move before you make it, and an “Ask EVRO” copilot on every screen. Every answer is rules-based and traces to the validated record.',
      solves: 'Today, "the AI number" is a black box no one can trace. EVRO is deterministic — every recommendation, brief and what-if is aligned to the same record you can open and check.',
      metrics: [{ label: 'Executive briefs', value: '5' }, { label: 'Every claim', value: 'Traceable' }],
    },
    {
      page: 'studio', target: '.stu-banner', eyebrow: 'EVRO STUDIO · NO-CODE CONFIG',
      title: 'Change the logic without touching code.',
      body: 'EVRO Studio is the configuration console: adjust savings definitions, lifecycle labels and approval routing (live), and model the confidence ladder, scoring weights and materiality threshold with a preview — before anything is promoted. The deterministic engine stays the single source of truth until a change is signed off.',
      solves: 'Today, changing a rule means a ticket, a developer and a release. EVRO puts the levers in leadership’s hands — previewed, governed, and never silently rewriting the numbers.',
      metrics: [{ label: 'Config', value: 'No-code' }, { label: 'Engine', value: 'Source of truth' }],
    },
    {
      page: 'settings', target: '.set-grid', eyebrow: 'ONE PLATFORM, MORE TO COME',
      title: 'Procurement today. The enterprise next.',
      body: 'Procurement is the active capability. Fleet & Maintenance, Customer Experience, Operations, People and Finance are declared here and switched off — each one flag away. When Athens is ready, they light up on the same platform, the same identity, the same engine and the same governance you just saw.',
      solves: 'Today, every function buys its own tool and the enterprise never sees one picture. EVRO reuses this exact architecture for the next capability — no re-platforming.',
      metrics: [{ label: 'Active', value: '1 of 6' }, { label: 'Reactivation', value: 'Config only' }],
    },
    {
      page: 'procurement', target: '.pdash-sum', eyebrow: 'THE PAYOFF', last: true,
      title: 'One aligned truth, board-ready today.',
      body: `${money(m.sum.total)} reconciles to the dollar across the dashboard, the funnel, the workspace, the briefs and the evidence — with ${money(impactFocus)} of it landing in ${focusYear}. Aligned definitions, a 12-month-honest forecast, a clear approval process, one source of truth, and real-time ownership. This is Phase One of EVRO.`,
      solves: 'Today, numbers never tie out between teams. EVRO aligns every screen to the same record — one truth, ready for the board now.',
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
        const offset = mobile ? 80 : 130
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
