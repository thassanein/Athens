import { useEffect, useMemo, useState, useRef } from 'react'
import { procurementModel, decisionQueue, SAVINGS_TYPES } from '../lib/procurement.js'
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

  const STEPS = useMemo(() => [
    {
      page: 'procurement', target: '.pdash-sum', eyebrow: 'ONE SOURCE OF TRUTH',
      title: 'One number, everyone agrees on.',
      body: `EVRO is Athens' Enterprise Intelligence Operating System, and Procurement is its first live capability. Savings Under Management is ${money(m.sum.total)} across ${num(m.sum.count)} opportunities, at ${pct(m.sum.confidence)} confidence, landing ${money(m.velocity.perMonth)} a month — read left to right through Identified, Committed, Realized, Sustained.`,
      solves: 'Today, every team keeps its own savings number in its own spreadsheet, and reviews start with an argument about whose number is right. EVRO gives one aligned source of truth, readable in seconds.',
      metrics: [{ label: 'Under management', value: money(m.sum.total) }, { label: 'Confidence', value: pct(m.sum.confidence) }, { label: 'Velocity', value: `${money(m.velocity.perMonth)}/mo` }],
    },
    {
      page: 'procurement', target: '.pdash-types', eyebrow: 'SAVINGS DEFINITION ALIGNMENT',
      title: 'One measure of savings — no more debates.',
      body: `${defs} standardized savings types — Hard Savings, Cost Avoidance, Productivity and more — each with a governance definition, all measured against the FP&A baseline off the 2025 AP register. Hard Savings and Productivity move the P&L run-rate; the rest are reported apart, so the headline stays credible.`,
      solves: 'Today, Procurement, Finance and Operations each define "savings" differently, so half of every review is spent debating what counts. EVRO is one measure-of-savings taxonomy the whole enterprise signs up to.',
      metrics: [{ label: 'Savings definitions', value: String(defs) }, { label: 'Baseline', value: 'FP&A-validated' }],
    },
    {
      page: 'procurement', target: '.pdash-funnel', eyebrow: 'VALUE CHAIN & OPPORTUNITY ID',
      title: 'A strong value chain — nothing falls through.',
      body: 'Opportunities are surfaced from spend analytics across the addressable base, then move through one visible eleven-stage lifecycle grouped into the procurement value chain: Source-to-Contract, Contract-to-Value, Value Realization. The eleven stages sum, to the dollar, to the headline above.',
      solves: 'Today, ideas stall between sourcing and finance, and good opportunities quietly fall through the cracks. EVRO gives one value chain where every opportunity is identified, staged and visible end to end.',
      metrics: [{ label: 'Lifecycle stages', value: '11' }, { label: 'Reconciles to', value: money(m.sum.total) }],
    },
    {
      page: 'procurement', target: '.pdash-forecast', eyebrow: 'ACCURATE FINANCIAL FORECASTING',
      title: 'A forecast the board can trust.',
      body: 'Realized run-rate to date, then a risk-adjusted projection for the rest of the year — committed versus expected, month by month. Value is time-phased and confidence-weighted, and only counts as realized once FP&A validates the actuals.',
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
      page: 'savingspipeline', target: '.svp-filters', eyebrow: 'THE SAVINGS BOOK',
      title: 'The whole pipeline, in one place.',
      body: `Every opportunity across Athens' fourteen sourcing groups — Fleet Capital, Facilities, Benefits & Insurance and the rest of the $437.4M addressable base — grouped by stage, filterable by savings type. One book, not fourteen spreadsheets.`,
      solves: 'Today, the pipeline lives in one analyst’s workbook and nobody trusts the version they were sent. EVRO is the single, always-current savings book — every category, every stage, one source.',
      metrics: [{ label: 'Opportunities', value: num(m.sum.count) }, { label: 'Addressable spend', value: '$437.4M' }],
    },
    {
      page: 'savingspipeline', target: '.svp-stage', eyebrow: 'PIPELINE OF PROJECTS',
      title: 'Every project, at the exact stage it is in.',
      body: `The book is grouped across ${populatedStages} live stages — Potential, Qualified, Business Case, Approved, Negotiation, Awarded, Implementation, Realized, Sustained. Each group shows its count and its value; each project its owner, savings type, confidence and a risk flag. This is the real pipeline, stage by stage.`,
      solves: 'Today, "the pipeline" is a static number in a monthly deck with no idea what sits where. EVRO shows every project at its live stage, with the value and the owner behind each one.',
      metrics: [{ label: 'Live stages', value: String(populatedStages) }, { label: 'Projects', value: num(m.sum.count) }],
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
      page: 'procai', target: '.pai-brief', eyebrow: 'ENTERPRISE AI',
      title: 'Decision intelligence — not a chatbot.',
      body: 'Five executive briefs — pipeline, risk, forecast variance, approvals, realization — each written as what happened, why it matters, and what to decide next. Every brief carries its confidence, evidence, assumptions, risks and expected value, and deep-links to the source.',
      solves: 'Today, "the AI number" is a black box no one can trace. EVRO is deterministic and rules-based, and every recommendation is aligned to the same validated record you can open and check.',
      metrics: [{ label: 'Executive briefs', value: '5' }, { label: 'Every claim', value: 'Traceable' }],
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
      body: `${money(m.sum.total)} reconciles to the dollar across the dashboard, the workspace, the briefs and the evidence. The value engine is provably unchanged — Procurement is a lens over it. Aligned definitions, a trustworthy forecast, a clear approval process, one source of truth, and real-time ownership. This is Phase One of EVRO.`,
      solves: 'Today, numbers never tie out between teams. EVRO aligns every screen to the same record — one truth, ready for the board now.',
      metrics: [{ label: 'Reconciles', value: 'To the dollar' }, { label: 'Status', value: 'Board-ready' }],
    },
  ], [m, dq, oppId, evAtStake, defs, redCount, blockers, populatedStages, oppRisks, oppWorst])

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
  // while the freshly-navigated page mounts). On phones the panel is a bottom
  // sheet, so the target is scrolled to the TOP of the screen (block:'start')
  // to keep it clear of the sheet; on desktop it's centered.
  useEffect(() => {
    let timer, tries = 0
    const mobile = typeof window !== 'undefined' && window.innerWidth <= 640
    const measure = () => {
      const el = step.target ? document.querySelector(step.target) : null
      if (el) {
        el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: mobile ? 'start' : 'center' })
        timer = setTimeout(() => {
          const r = el.getBoundingClientRect()
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        }, reduced() ? 0 : 320)
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
