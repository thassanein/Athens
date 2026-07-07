// Procurement copilot — deterministic Q&A over the model. Ask it a question and
// it answers from the same value objects every screen reads, with metrics and
// evidence and a jump-to link. Rules-based intent matching; no language model,
// no fabricated numbers. This is decision intelligence you can interrogate.
import {
  procurementModel, decisionQueue, savingsOpportunities, suppliers, procurementActions,
} from './procurement.js'
import { leakageBreakdown } from './engine.js'
import { money, pct, num } from './format.js'

export const SUGGESTIONS = [
  'How much is under management?',
  'Why is realization behind?',
  "What's blocking the most value?",
  'Where is value leaking?',
  'What decisions are waiting?',
  "What's at risk?",
  'How is Fleet Capital doing?',
  'What should I do next?',
]

const has = (q, ...ks) => ks.some((k) => q.includes(k))

export function answer(db, query) {
  const q = String(query || '').toLowerCase().trim()
  const m = procurementModel(db)
  const opps = savingsOpportunities(db)

  // leakage
  if (has(q, 'leak', 'leaking')) {
    const l = leakageBreakdown(db)
    return {
      title: 'Where value is leaking',
      answer: `${money(l.total)} of negotiated value is leaking — ${money(l.timing)} timing (recoverable by driving on-contract compliance) and ${money(l.contract)} structural. Recovering the timing portion is the fastest win.`,
      metrics: [{ label: 'Total leakage', value: money(l.total) }, { label: 'Recoverable', value: money(l.timing) }],
      evidence: l.items.slice(0, 4).map((it) => ({ label: it.title, value: money(it.total) })),
      nav: { page: 'savingspipeline', label: 'Open the Savings Pipeline' },
    }
  }
  // blockers / gates
  if (has(q, 'block', 'stuck', 'gate', 'gap')) {
    const b = m.blockers
    const gaps = opps.filter((o) => o.nextDecision && o.nextDecision.missing.length)
    return {
      title: 'What is blocking value',
      answer: `${b.length} opportunit${b.length === 1 ? 'y gates' : 'ies gate'} the most downstream value${b[0] ? `, led by ${b[0].name} (${money(b[0].value)})` : ''}. Across the book, ${gaps.length} opportunities are held by an open gate requirement.`,
      metrics: [{ label: 'Blockers', value: num(b.length) }, { label: 'Evidence gaps', value: num(gaps.length) }],
      evidence: b.slice(0, 4).map((x) => ({ label: x.name, value: `blocks ${x.blocks}` })),
      nav: { page: 'decisioncenter', label: 'Open the Decision Center' },
    }
  }
  // decisions / approvals
  if (has(q, 'decision', 'approve', 'approval', 'sign-off', 'signoff', 'waiting')) {
    const dq = decisionQueue(db)
    const ev = dq.reduce((s, o) => s + o.nextDecision.expectedValue, 0)
    return {
      title: 'Decisions waiting',
      answer: `${dq.length} decisions are waiting, ${money(ev)} of expected value at stake${dq[0] ? `. The highest-value one is ${dq[0].name} (${money(dq[0].nextDecision.expectedValue)})` : ''}.`,
      metrics: [{ label: 'Decisions', value: num(dq.length) }, { label: 'Value at stake', value: money(ev) }],
      evidence: dq.slice(0, 4).map((o) => ({ label: o.name, value: money(o.nextDecision.expectedValue) })),
      nav: { page: 'decisioncenter', label: 'Open the Decision Center' },
    }
  }
  // at risk
  if (has(q, 'risk', 'at risk', 'red', 'expos')) {
    const reds = opps.filter((o) => o.ragStatus === 'red').sort((a, b) => b.value.headline - a.value.headline)
    return {
      title: 'What is at risk',
      answer: `${money(m.sum.atRisk)} of value sits across ${reds.length} red opportunit${reds.length === 1 ? 'y' : 'ies'}${reds[0] ? `, led by ${reds[0].name} (${money(reds[0].value.headline)}, worst risk ${reds[0].worstRisk})` : ''}.`,
      metrics: [{ label: 'At-risk value', value: money(m.sum.atRisk) }, { label: 'Red opportunities', value: num(reds.length) }],
      evidence: reds.slice(0, 4).map((o) => ({ label: o.name, value: `${money(o.value.headline)} · risk ${o.worstRisk}` })),
      nav: { page: 'decisioncenter', label: 'Open the Decision Center' },
    }
  }
  // realization / behind
  if (has(q, 'realiz', 'behind', 'on track', 'deliver', 'landing')) {
    return {
      title: 'Realization status',
      answer: `${money(m.sum.lenses.realized)} is FP&A-validated year-to-date, landing at ${money(m.velocity.perMonth)}/month, with ${money(m.sum.lenses.sustained)} now protected in sustainment. ${money(m.sum.lenses.committed)} is committed and still to convert — the gap to close is conversion, not new pipeline.`,
      metrics: [{ label: 'Realized YTD', value: money(m.sum.lenses.realized) }, { label: 'Velocity', value: `${money(m.velocity.perMonth)}/mo` }, { label: 'Committed to convert', value: money(m.sum.lenses.committed) }],
      evidence: [{ label: 'Sustained run-rate', value: money(m.sum.lenses.sustained) }, { label: 'Confidence', value: pct(m.sum.confidence) }],
      nav: { page: 'procurement', label: 'Open the Executive Dashboard' },
    }
  }
  // confidence
  if (has(q, 'confidence', 'sure', 'certain')) {
    return {
      title: 'How confident the book is',
      answer: `The book is running at ${pct(m.sum.confidence)} value-weighted confidence — driven by each opportunity's lifecycle stage (early ideas count less, launched deals count fully). It is a lens on likelihood, not a target.`,
      metrics: [{ label: 'Confidence', value: pct(m.sum.confidence) }, { label: 'Opportunities', value: num(m.sum.count) }],
      evidence: [{ label: 'Realized (100% confidence)', value: money(m.sum.lenses.realized) }, { label: 'Committed', value: money(m.sum.lenses.committed) }],
      nav: { page: 'procurement', label: 'Open the Executive Dashboard' },
    }
  }
  // sourcing group / category
  const grp = suppliers(db).find((g) => g.name && q.includes(g.name.toLowerCase().split(' ')[0]) && g.name.length > 3 && q.includes(g.name.toLowerCase().slice(0, 5)))
    || suppliers(db).find((g) => g.name && q.includes(g.name.toLowerCase()))
  if (grp) {
    const inGrp = opps.filter((o) => o.supplier === grp.name)
    const val = inGrp.reduce((s, o) => s + o.value.headline, 0)
    return {
      title: `${grp.name}`,
      answer: `${grp.name} carries ${inGrp.length} opportunit${inGrp.length === 1 ? 'y' : 'ies'} worth ${money(val)} against ${money(grp.spend)} of group spend (${pct(grp.inflation || 0)} inflation). ${inGrp.filter((o) => o.ragStatus === 'red').length} are red.`,
      metrics: [{ label: 'Opportunities', value: num(inGrp.length) }, { label: 'Value', value: money(val) }, { label: 'Group spend', value: money(grp.spend) }],
      evidence: inGrp.slice(0, 4).map((o) => ({ label: o.name, value: `${o.stageLabel} · ${money(o.value.headline)}` })),
      nav: { page: 'savingspipeline', label: 'Open the Savings Pipeline' },
    }
  }
  // next / priority
  if (has(q, 'next', 'should i', 'priority', 'do now', 'action', 'focus')) {
    const a = procurementActions(db)
    return {
      title: 'What to do next',
      answer: a[0] ? `The highest-value move is: ${a[0].title} (${money(a[0].value)}). ${a[0].detail}` : 'The book is clear — no blocked value right now.',
      metrics: a.slice(0, 2).map((x) => ({ label: x.agent, value: money(x.value) })),
      evidence: a.slice(0, 4).map((x) => ({ label: x.agent, value: x.title })),
      nav: a[0] ? { page: a[0].nav.page, label: a[0].cta, id: a[0].nav.id } : { page: 'procurement', label: 'Open the Executive Dashboard' },
    }
  }
  // total / overview (default)
  return {
    title: 'Procurement, right now',
    answer: `${money(m.sum.total)} is under management across ${num(m.sum.count)} opportunities at ${pct(m.sum.confidence)} confidence. ${money(m.sum.lenses.realized)} realized, ${money(m.sum.lenses.committed)} committed, ${money(m.sum.atRisk)} at risk. ${decisionQueue(db).length} decisions are waiting. Ask me about leakage, blockers, risk, a sourcing group, or what to do next.`,
    metrics: [{ label: 'Under management', value: money(m.sum.total) }, { label: 'Realized YTD', value: money(m.sum.lenses.realized) }, { label: 'At risk', value: money(m.sum.atRisk) }],
    evidence: [],
    nav: { page: 'procurement', label: 'Open the Executive Dashboard' },
  }
}
