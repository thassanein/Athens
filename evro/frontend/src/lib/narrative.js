// Executive Narrative Engine (5B.5 item 8) — deterministic, rules-based
// narratives explaining performance: what changed, why it matters, what should
// happen next — in board / executive / operational formats. Composes existing
// engine surfaces only (no LLM; labelled in the UI). View-only.
import {
  enterpriseRollup, controlTower, leakageBreakdown, inflationExposure,
  decisionsRequired, whatChanged, personName, isActive, rav,
} from './engine.js'
import { aiRecommendations } from './model.js'
import { money, pct } from './format.js'

export const NARRATIVE_FORMATS = [
  { key: 'board', label: 'Board', blurb: 'Three lines and the ask' },
  { key: 'executive', label: 'Executive', blurb: 'Changed · why · next' },
  { key: 'operational', label: 'Operational', blurb: 'Who does what now' },
]

export function narrative(db, user, format = 'executive') {
  const roll = enterpriseRollup(db)
  const ct = controlTower(db)
  const leak = leakageBreakdown(db)
  const infl = inflationExposure(db)
  const dec = decisionsRequired(db, user)
  const recs = aiRecommendations(db, { status: 'open' })
  const changed = whatChanged(db, 5)
  const topRisk = roll.topRisks[0]
  const topRec = recs.slice().sort((a, b) => (b.value_impact || 0) - (a.value_impact || 0))[0]
  // The ask must be a REAL pending approval — decisionsRequired mixes kinds
  // (approval | leakage | risk) sorted by value, so filter, don't take [0].
  const topDec = dec.find((d) => d.kind === 'approval')
  const inflTop = infl.byGroup[0]

  if (format === 'board') {
    // "No approvals outstanding" must be TRUE for the reader: some personas
    // (e.g. exec) can never approve, yet gates may still be pending with the
    // entitled approvers — say that instead of implying a clear queue.
    const pendingAll = db.initiatives.filter((i) => i.request).length
    const ask = topDec
      ? `The ask: approve "${topDec.title}" (${money(topDec.value)}).`
      : pendingAll
        ? `The ask: ${pendingAll} gate${pendingAll === 1 ? '' : 's'} pending with the entitled approvers — hold the cadence.`
        : 'No approvals outstanding — the ask is continued cadence.'
    return {
      headline: `${money(roll.realizedYTD)} realized and FP&A-validated · ${money(roll.raPipeline)} risk-adjusted pipeline · ${money(roll.identifiedOpportunity)} identified beyond plan.`,
      bullets: [
        `Value: realized is ${pct(roll.realizedYTD / Math.max(1, roll.realizedYTD + roll.forecastRemainderFY))} of the expected FY book; ${pct(roll.recurringSplit.recurring / Math.max(1, roll.recurringSplit.recurring + roll.recurringSplit.oneTime))} of pipeline value recurs.`,
        `Risk: ${money(ct.valueAtRisk)} at risk — ${money(leak.total)} leaking vs plan${topRisk ? `; largest single risk sits on "${topRisk.title}"` : ''}.`,
        `Outlook: ${money(infl.total)} of inflation exposure${inflTop ? `, led by ${inflTop.name} (${pct(inflTop.inflation)})` : ''}; avoidance work is sequenced against it.`,
      ],
      ask,
    }
  }

  if (format === 'operational') {
    // Who does what now — concrete, owner-attributed actions.
    const actions = []
    for (const i of db.initiatives.filter((x) => isActive(x) && (x.actuals || []).some((a) => !a.validated)).slice(0, 3))
      actions.push({ who: 'FP&A', what: `Validate the latest actual on "${i.title}"`, why: 'only validated value counts as realized', id: i.id })
    for (const i of db.initiatives.filter((x) => isActive(x) && x.status_rag === 'red' && REAL(x)).slice(0, 3))
      actions.push({ who: personName(db, i.owner_id), what: `Review the countermeasure on "${i.title}"`, why: `${money(rav(i))} haircut until mitigated`, id: i.id })
    for (const l of leak.items.slice(0, 2))
      actions.push({ who: personName(db, db.initiatives.find((x) => x.id === l.id)?.owner_id), what: `Reconcile implemented vs negotiated on "${l.title}"`, why: `${money(l.total)} leaking`, id: l.id })
    for (const d of dec.filter((x) => x.kind === 'approval').slice(0, 2))
      actions.push({ who: 'Approvers', what: `Clear the gate on "${d.title}"`, why: `${money(d.value)} waiting to enter the pipeline`, id: d.id })
    return { headline: actions.length ? `${actions.length} concrete actions keep the quarter on plan.` : 'Nothing needs attention — the quarter is on plan.', actions }
  }

  // executive (default): what changed · why it matters · what should happen next
  return {
    changed: changed.map((c) => ({ text: c.detail, who: c.actor, action: c.action })),
    why: [
      `${money(leak.total)} of negotiated value is not yet landing in the run-rate — the gap between contract and reality.`,
      topRisk ? `The largest open risk (score ${topRisk.score}) sits on "${topRisk.title}" — its value is haircut until countered.` : 'No high risks are open — realization confidence is intact.',
      inflTop ? `${inflTop.name} carries ${pct(inflTop.inflation)} inflation — ${money(inflTop.exposure)} of exposure if unaddressed.` : '',
    ].filter(Boolean),
    next: [
      topDec ? { text: `Approve "${topDec.title}" (${money(topDec.value)})`, id: topDec.id } : null,
      topRec ? { text: `${topRec.agent}: ${topRec.recommendation}`, id: topRec.linked_id } : null,
      leak.items[0] ? { text: `Open/advance the recovery on "${leak.items[0].title}" (${money(leak.items[0].total)} leaking)`, id: leak.items[0].id } : null,
    ].filter(Boolean),
  }
}

// realizing-stage helper kept local to avoid widening imports
const REAL = (i) => ['launch', 'realization', 'sustainment'].includes(i.stage)
