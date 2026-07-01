// Athens EVRO — Story & Board-Packet narrative (view-only orchestration).
// Composes existing engine outputs into audience- and period-specific "beats"
// that BOTH the on-screen Story Mode presenter and the .pptx board-packet
// export render — one source of truth, no divergence. Deterministic and
// rules-based (no LLM); does NOT touch the engine, mutations, server, or data.
import {
  controlTower, execSummary, enterpriseRollup, rankInitiatives, decisionsRequired,
  scenarioTotals, sustainmentBook, recognition, inflationExposure, STAGE_LABEL,
} from './engine.js'
import { money, pct, dateLabel } from './format.js'

// Who the deck is framed for — reorders and reframes the middle of the story.
export const AUDIENCES = [
  { key: 'board', label: 'Board', blurb: 'Directors · value, risk & decisions' },
  { key: 'exec', label: 'Executive', blurb: 'Ops depth · leakage, capital, forecast' },
  { key: 'operators', label: 'Operators', blurb: 'Teams · momentum & recognition' },
]

// Which slice of the fiscal year the hero beat leads with.
export const PERIODS = [
  { key: 'fy', label: 'Full FY', blurb: 'realized + forecast + opportunity' },
  { key: 'ytd', label: 'Year to date', blurb: "what's validated & banked" },
  { key: 'outlook', label: 'Remaining FY', blurb: "what's still ahead" },
]

const audLabel = (k) => AUDIENCES.find((a) => a.key === k)?.label || 'Board'
const perLabel = (k) => PERIODS.find((p) => p.key === k)?.label || 'Full FY'
const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

// Returns an ordered array of beats. Each beat:
//   { type?: 'cover'|'closing', id, lbl, title, big?, cap?, sub?, tone,
//     bullets?: string[], bridge?: [{label,value,kind}], table?: {cols,align,rows} }
export function storyBeats(db, opts = {}) {
  const { audience = 'board', period = 'fy', user } = opts
  const ct = controlTower(db)
  const sum = execSummary(db)
  const roll = enterpriseRollup(db)
  const ranked = rankInitiatives(db, 'return')
  const dec = decisionsRequired(db, user || { role: 'admin' })
  const scen = scenarioTotals(db)
  const sustain = sustainmentBook(db)
  const rec = recognition(db)
  const infl = inflationExposure(db)
  const fy = db.meta.fiscalYear
  const top = ranked[0]
  const approvals = dec.filter((d) => d.kind === 'approval').length

  const cover = {
    type: 'cover', id: 'cover', tone: 'red',
    lbl: `Athens EVRO · FY${fy}`,
    title: 'Value realization board packet',
    cap: `${audLabel(audience)} view · ${perLabel(period)} · as of ${dateLabel(db.meta.now)}`,
    sub: 'Find waste · create value · build our future.',
  }

  const position = (() => {
    if (period === 'ytd') return {
      id: 'position', tone: 'green', lbl: 'Where we are', title: 'Value realized to date',
      big: money(roll.realizedYTD), cap: 'FP&A-validated · banked this fiscal year',
      sub: `${money(roll.realizedYTD)} of value is validated and banked — the only value that counts as realized. A further ${money(roll.raPipeline)} sits in the risk-adjusted pipeline.`,
      bullets: [
        `Risk-adjusted pipeline in flight: ${money(roll.raPipeline)}`,
        `Leaking versus plan (recoverable): ${money(roll.leakage)}`,
        `Sustainment health: ${pct(sustain.avg)} of plan across live & sustained value`,
      ],
    }
    if (period === 'outlook') return {
      id: 'position', tone: 'navy', lbl: 'What is ahead', title: 'Outlook for the rest of FY',
      big: money(roll.forecastRemainderFY), cap: 'risk-adjusted · remaining months',
      sub: `${money(roll.forecastRemainderFY)} more is forecast to land this year on a risk-adjusted basis, on top of ${money(roll.realizedYTD)} already realized.`,
      bullets: [
        `Committed landing: ${money(scen.committed)}`,
        `Expected (headline): ${money(scen.expected)}`,
        `Upside case: ${money(scen.upside)}`,
      ],
    }
    return {
      id: 'position', tone: 'green', lbl: 'The full-year picture', title: 'Total FY value bridge',
      big: money(roll.bridgeTotal), cap: 'realized → + risk-adjusted forecast → + identified opportunity',
      sub: 'Return-maximization in one line: what we have realized, plus what is forecast, plus what we have identified. There is no savings target — return is the only measure.',
      bridge: roll.bridge,
      bullets: roll.bridge.map((b) => `${b.label}: ${money(b.value)}`),
    }
  })()

  const summary = {
    id: 'summary', tone: 'navy', lbl: 'Executive summary', title: 'The headline',
    cap: 'AI · rules-based synthesis of the portfolio',
    sub: sum.headline, bullets: sum.bullets,
  }

  const returns = {
    id: 'returns', tone: 'green', lbl: 'Biggest returns', title: 'Where the value concentrates',
    big: money(top?.rav || 0), cap: top ? `top return · "${top.title}"` : 'no active initiatives',
    sub: sum.bullets[0] || `The largest single return is ${money(top?.rav || 0)} risk-adjusted.`,
    table: {
      cols: ['Initiative', 'Stage', 'Realized YTD', 'Risk-adj value'], align: ['l', 'l', 'r', 'r'],
      rows: ranked.slice(0, 6).map((t) => [t.title, STAGE_LABEL[t.stage] || t.stage, money(t.realizedYTD), money(t.rav)]),
    },
  }

  const risk = {
    id: 'risk', tone: 'red', lbl: 'What is at risk', title: 'Value that could slip',
    big: money(ct.valueAtRisk), cap: `including ${money(ct.leakage)} leaking versus plan`,
    sub: sum.bullets[1] || 'Open risks and value leakage the portfolio must recover.',
    table: {
      cols: ['Initiative', 'Score', 'Status', 'Countermeasure'], align: ['l', 'r', 'l', 'l'],
      rows: (roll.topRisks || []).slice(0, 5).map((r) => [r.title, String(r.score), r.status || '—', r.countermeasure || '—']),
    },
  }

  const cost = {
    id: 'cost', tone: 'amber', lbl: 'The cost headwind', title: 'Inflation exposure',
    big: money(ct.inflationExposure), cap: 'addressable spend × category inflation',
    sub: sum.bullets[2] || 'Budget pressure that cost avoidance has to offset.',
    table: {
      cols: ['Category group', 'Inflation', 'Exposure'], align: ['l', 'r', 'r'],
      rows: infl.byGroup.slice(0, 6).map((g) => [g.name, pct(g.inflation), money(g.exposure)]),
    },
  }

  const fund = {
    id: 'fund', tone: 'green', lbl: 'What we can fund', title: 'Optimizable value',
    big: money(ct.optimizableValue), cap: `fundable within the ${money(ct.capitalBudget)} capital envelope`,
    sub: sum.bullets[3] || 'The value we can fund within the capital budget, allocated to the best return.',
    bullets: [
      `Capital deployed: ${money(ct.capitalDeployed)} of ${money(ct.capitalBudget)}`,
      `Blended ROI: ${ct.blendedROI ? ct.blendedROI.toFixed(1) : '—'}× risk-adjusted value per unit of effort`,
      `Identified opportunity not yet in plan: ${money(ct.identifiedOpportunity)}`,
    ],
  }

  const scenarios = {
    id: 'scenarios', tone: 'navy', lbl: 'Forecast scenarios', title: 'How the year could land',
    big: money(scen.expected), cap: 'expected (headline) landing',
    sub: `The spread between committed and upside is the confidence band the portfolio is steering through — the expected case is the headline number.`,
    bullets: [
      `Committed — Launch + validated only: ${money(scen.committed)}`,
      `Expected — risk-adjusted, all active stages: ${money(scen.expected)}`,
      `Upside — gross of Capability + Launch: ${money(scen.upside)}`,
    ],
  }

  const sustainment = {
    id: 'sustainment', tone: sustain.avg >= 0.9 ? 'green' : sustain.avg >= 0.7 ? 'amber' : 'red',
    lbl: 'Does value hold', title: 'Savings sustainment',
    big: pct(sustain.avg), cap: 'realized vs expected across live, sustained & retired value',
    sub: sustain.eroding.length
      ? `${sustain.eroding.length} initiative${sustain.eroding.length > 1 ? 's are' : ' is'} eroding below 70% of plan — a recovery is needed to protect delivered value.`
      : 'Delivered value is holding at or above plan across the realizing portfolio.',
    table: {
      cols: ['Initiative', 'Band', 'Realized', 'Expected', 'vs plan'], align: ['l', 'l', 'r', 'r', 'r'],
      rows: sustain.items.slice(0, 6).map((s) => [s.title, capitalize(s.band), money(s.realized), money(s.expected), pct(s.score)]),
    },
  }

  const recognitionBeat = (() => {
    const champ = rec.people[0]
    return {
      id: 'recognition', tone: 'opp', lbl: 'The people behind it', title: 'Value champions',
      big: champ ? money(champ.totalFY) : '—', cap: champ ? `${champ.name} · ${champ.level}` : 'no standings yet',
      sub: `${rec.millionClub.length} ${rec.millionClub.length === 1 ? 'person is' : 'people are'} in the $1M club. Value creation is a team sport — the movement counts every contributor, and procurement is ranked on its own board.`,
      table: {
        cols: ['Person', 'Level', 'Realized', 'Total FY'], align: ['l', 'l', 'r', 'r'],
        rows: rec.people.slice(0, 6).map((p) => [p.name, p.level, money(p.realized), money(p.totalFY)]),
      },
    }
  })()

  const decisions = {
    id: 'decisions', tone: 'amber', lbl: 'The decisions in front of you', title: 'What needs a decision',
    big: String(dec.length), cap: `${approvals} awaiting sign-off · ranked highest-value first`,
    sub: 'Start at the top — everything is ranked by value at stake. Return is the only target.',
    table: {
      cols: ['Type', 'Item', 'Value', 'Detail'], align: ['l', 'l', 'r', 'l'],
      rows: dec.slice(0, 7).map((d) => [capitalize(d.kind), d.title, money(d.value), d.detail]),
    },
  }

  const closing = {
    type: 'closing', id: 'closing', tone: 'red', lbl: 'The operating principle',
    title: 'Return is the only target',
    cap: 'No savings or avoidance target — we maximize return.',
    sub: 'Value counts only once FP&A validates it. Procurement is ranked separately so the whole organization competes on change. Find waste · create value · build our future.',
  }

  let mid
  if (audience === 'exec') mid = [decisions, risk, fund, scenarios, sustainment, cost, returns]
  else if (audience === 'operators') mid = [returns, recognitionBeat, sustainment]
  else mid = [returns, risk, cost, fund, decisions] // board (default)

  // Period nudges: guarantee the period's signature beat is present.
  if (period === 'ytd' && !mid.includes(sustainment)) mid = [...mid, sustainment]
  if (period === 'outlook' && !mid.includes(scenarios)) mid = [scenarios, ...mid]

  return [cover, position, summary, ...mid, closing]
}
