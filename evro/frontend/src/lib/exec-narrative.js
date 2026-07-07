// Executive Narrative Mode (6D Wave 3) — the story layer with EVIDENCE.
//
// The 5B.5 narrative() engine (lib/narrative.js) already writes board /
// executive / operational prose and is used by Mission Control + the Briefing.
// What the 6D brief adds — and what this module provides — is the drill:
// every narrative claim carries its metric, its deterministic source, and
// expandable evidence rows, so the executive can go story → evidence → metric
// → system source without leaving the surface. Three audience modes
// (executive / board / operator) reframe emphasis and ordering; they never
// change the facts.
//
// View-layer only: composes existing engine + experience exports. Every claim
// is grounded — nothing is narrated that the data does not already say.
import { enterpriseRollup, controlTower, decisionsRequired, rav, REALIZING_STAGES, isActive } from './engine.js'
import { enterpriseHealth } from './intel.js'
import { enterpriseEnergy, valueVelocity, execWeather } from './experience.js'
import { money } from './format.js'

export const NARRATIVE_MODES = [
  { key: 'executive', label: 'Executive', gloss: 'Balanced — state, cause, exposure, action.' },
  { key: 'board', label: 'Board', gloss: 'Outcome and risk first, strategic and terse.' },
  { key: 'operator', label: 'Operator', gloss: 'The queue first, owners named, granular.' },
]

const personName = (db, id) => (db.people.find((p) => p.id === id) || {}).name || 'unassigned'
const claim = (text, metric, source, evidence = [], nav = null) => ({ text, metric, source, evidence, nav })

export function execNarrative(db, user, mode = 'executive') {
  const roll = enterpriseRollup(db)
  const ct = controlTower(db)
  const h = enterpriseHealth(db)
  const e = enterpriseEnergy(db)
  const vel = valueVelocity(db)
  const w = execWeather(db)
  const active = db.initiatives.filter(isActive)
  const approvals = user ? decisionsRequired(db, user).filter((d) => d.kind === 'approval') : []
  const realizing = active.filter((i) => REALIZING_STAGES.includes(i.stage))
    .map((i) => ({ i, v: rav(i) })).sort((a, b) => b.v - a.v)
  const weakest = [...h.dims].sort((a, b) => a.score - b.score).slice(0, 2)
  const netDay = Math.round(vel.netPerDay)

  // --- What happened ---
  const happened = [
    claim(
      `${money(roll.realizedYTD)} of value is validated and on the books year-to-date.`,
      { label: 'Realized YTD', value: money(roll.realizedYTD) },
      'Enterprise value bridge · FP&A-validated actuals',
      [
        { label: 'Realized YTD', value: money(roll.realizedYTD) },
        { label: '+ Risk-adjusted forecast', value: money(roll.forecastRemainderFY) },
        { label: '+ Identified opportunity', value: money(roll.identifiedOpportunity) },
        { label: 'Value under management', value: money(roll.bridgeTotal) },
      ],
    ),
    claim(
      `Net value momentum is running at ${money(netDay)}/day (${money(Math.round(vel.createdPerDay))} created less ${money(Math.round(vel.leakPerDay))} leaking).`,
      { label: 'Net momentum', value: `${money(netDay)}/day` },
      'Value velocity · dated realization record',
      [
        { label: 'Value created', value: `${money(Math.round(vel.createdPerDay))}/day` },
        { label: 'Leaking', value: `${money(Math.round(vel.leakPerDay))}/day` },
        { label: 'Needed to land plan', value: `${money(Math.round(vel.neededPerDay))}/day` },
      ],
    ),
  ]

  // --- Why it happened ---
  const why = [
    claim(
      `Enterprise health is ${h.score} (${h.grade} · ${h.gradeLabel}); ${weakest[0].label} is the weakest dimension at ${Math.round(weakest[0].score * 100)}.`,
      { label: 'Health', value: `${h.score} · ${h.grade}` },
      'Health engine · six weighted dimensions',
      h.dims.map((d) => ({ label: d.label, value: `${Math.round(d.score * 100)}${d.proxy ? ' (proxy)' : ''}` })),
    ),
    claim(
      `${weakest[0].label}: ${weakest[0].drivers[0]}${weakest[1] ? `; ${weakest[1].label} next at ${Math.round(weakest[1].score * 100)}.` : '.'}`,
      { label: weakest[0].label, value: Math.round(weakest[0].score * 100) },
      'Health engine · dimension drivers',
      weakest[0].drivers.map((d) => ({ label: 'driver', value: d })),
    ),
  ]

  // --- What it means ---
  const means = [
    claim(
      `${money(ct.valueAtRisk)} of value is at risk and ${money(ct.leakage)} is leaking — negotiated value not yet implemented.`,
      { label: 'Value at risk', value: money(ct.valueAtRisk) },
      'Control tower · risk-adjusted exposure',
      [
        { label: 'Value at risk', value: money(ct.valueAtRisk) },
        { label: 'Leaking (timing)', value: money(ct.leakage) },
        { label: 'Risk-adjusted pipeline', value: money(ct.raPipeline) },
      ],
    ),
    claim(
      `Enterprise state is ${w.execState} — ${w.gloss.toLowerCase().replace(/\.$/, '')}. ${money(roll.forecastRemainderFY)} of forecast remains to land this fiscal year.`,
      { label: 'State', value: w.execState },
      'Executive weather · worst-signal-first over the energy engine',
      [
        { label: 'Enterprise energy', value: `${e.score} · ${e.state.label}` },
        { label: 'Condition', value: `${w.label} — ${w.why}` },
        { label: 'Forecast remaining FY', value: money(roll.forecastRemainderFY) },
      ],
    ),
  ]
  if (weakest[0] && weakest[0].proxy) {
    means.push(claim(
      `${weakest[0].label} is scored from a proxy — treat with judgement until the real feed lands.`,
      { label: weakest[0].label, value: 'proxy' },
      'Health engine · proxy disclosure',
      [{ label: 'proxy', value: weakest[0].proxy }],
    ))
  }

  // --- What to do next --- (the concrete queue, deep-linked to Decisions)
  const next = []
  if (approvals.length) {
    next.push(claim(
      `${approvals.length} approval${approvals.length === 1 ? '' : 's'} ${approvals.length === 1 ? 'is' : 'are'} waiting on you — largest: "${approvals[0].title}" (${money(approvals[0].value || 0)}).`,
      { label: 'Approvals waiting', value: approvals.length },
      'Governance record · decisions required for your role',
      approvals.slice(0, 4).map((d) => ({ label: d.title, value: money(d.value || 0) })),
      { page: 'decisions', label: 'Open the decision queue' },
    ))
  } else {
    next.push(claim(
      'No approvals are waiting on you — the decision queue is clear.',
      { label: 'Approvals waiting', value: 0 },
      'Governance record · decisions required for your role',
      [],
      { page: 'decisions', label: 'Open the decision queue' },
    ))
  }
  if (ct.leakage > 0) {
    next.push(claim(
      `Recover ${money(ct.leakage)} of timing leakage first — it is realized value already negotiated, just not implemented.`,
      { label: 'Leakage to recover', value: money(ct.leakage) },
      'Control tower · leakage (negotiated, un-implemented)',
      [{ label: 'Leaking value', value: money(ct.leakage) }],
      { page: 'realization', label: 'Open value realization' },
    ))
  }
  if (realizing[0]) {
    next.push(claim(
      `Protect the biggest realizing engine: "${realizing[0].i.title}" (${money(realizing[0].v)}, ${personName(db, realizing[0].i.owner_id)}).`,
      { label: 'Largest realizing', value: money(realizing[0].v) },
      'Portfolio · risk-adjusted value in realizing stages',
      realizing.slice(0, 4).map((r) => ({ label: r.i.title, value: money(r.v) })),
      { page: 'sustainment', label: 'Open the sustainment center' },
    ))
  }

  const SECTIONS = {
    happened: { key: 'happened', q: 'What happened', claims: happened },
    why: { key: 'why', q: 'Why it happened', claims: why },
    means: { key: 'means', q: 'What it means', claims: means },
    next: { key: 'next', q: 'What to do next', claims: next },
  }

  // audience modes reframe ORDER and emphasis — not the facts.
  const ORDER = {
    executive: ['happened', 'why', 'means', 'next'],
    board: ['means', 'happened', 'why', 'next'],
    operator: ['next', 'happened', 'why', 'means'],
  }
  const order = ORDER[mode] || ORDER.executive
  // board is terse — one lead claim per section except the exposure it leads on.
  const trim = (secKey, claims) => (mode === 'board' && secKey !== 'means' ? claims.slice(0, 1) : claims)

  const sections = order.map((k) => ({ ...SECTIONS[k], claims: trim(k, SECTIONS[k].claims) }))
  const headline = `${w.execState} · ${h.score} ${h.grade} · ${money(roll.bridgeTotal)} under management · ${money(netDay)}/day net`

  return { mode, modes: NARRATIVE_MODES, headline, sections, generatedFrom: 'deterministic · rules-based · no language model' }
}
