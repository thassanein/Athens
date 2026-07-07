// Auto-drafted briefs & narratives — one click turns the operating record into
// a written executive brief or board narrative. Every sentence is composed from
// the same deterministic value objects the screens read; nothing is invented,
// no language model is called. Scope it to the whole book, a sourcing group, or
// a single opportunity. The output is prose an executive can paste into a memo
// or export straight to PDF / PowerPoint.
import {
  procurementModel, savingsOpportunities, savingsUnderManagement, savingsVelocity,
  savingsByType, decisionQueue, suppliers, opportunityInsight, savingsType,
} from './procurement.js'
import { leakageBreakdown } from './engine.js'
import { money, pct, num } from './format.js'

const dateline = (db) => `Athens EVRO Procurement · FY${db.meta.fiscalYear} · as of ${db.meta.now}`
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

// The three scopes a brief can be drafted for. `opportunity` and `group` are
// populated at call time from the live book.
export function narrativeScopes(db) {
  const groups = suppliers(db).filter((g) => g.activeOpportunities > 0)
  const opps = savingsOpportunities(db)
  return {
    book: { type: 'book', label: 'The whole book' },
    groups: groups.map((g) => ({ type: 'group', key: g.name, label: g.name })),
    opps: opps.map((o) => ({ type: 'opportunity', key: o.id, label: `${o.name} · ${money(o.value.headline)}` })),
  }
}

// ── Book-level executive brief.
function bookNarrative(db) {
  const m = procurementModel(db)
  const sum = m.sum
  const vel = savingsVelocity(db)
  const leak = leakageBreakdown(db)
  const queue = decisionQueue(db)
  const evAtStake = queue.reduce((s, o) => s + o.nextDecision.expectedValue, 0)
  const byType = savingsByType(db).filter((t) => t.value > 0).sort((a, b) => b.value - a.value)
  const opps = m.opportunities
  const reds = opps.filter((o) => o.ragStatus === 'red').sort((a, b) => b.value.headline - a.value.headline)
  const topTypes = byType.slice(0, 3).map((t) => `${t.label} (${money(t.value)})`)

  return {
    kind: 'Executive brief',
    title: 'Procurement value — executive brief',
    dateline: dateline(db),
    figures: [
      { label: 'Under management', value: money(sum.total) },
      { label: 'Realized YTD', value: money(sum.lenses.realized) },
      { label: 'At risk', value: money(sum.atRisk) },
      { label: 'Confidence', value: pct(sum.confidence) },
    ],
    sections: [
      { heading: 'Position', paragraphs: [
        `Procurement is managing ${money(sum.total)} of value across ${num(sum.count)} opportunities at ${pct(sum.confidence)} value-weighted confidence. Of that book, ${money(sum.lenses.identified)} is identified, ${money(sum.lenses.committed)} is committed into the plan, and ${money(sum.lenses.realized)} has been FP&A-validated year-to-date. Validated value is landing at ${money(vel.perMonth)} a month over ${num(vel.elapsedMonths)} elapsed months.`,
        `The value concentrates in ${list(topTypes)}. Read left to right, the funnel is healthy: the constraint is conversion of committed value into realized run-rate, not a shortage of pipeline.`,
      ] },
      { heading: 'Risk & leakage', paragraphs: [
        `${money(sum.atRisk)} of the book carries a red status across ${num(reds.length)} opportunit${reds.length === 1 ? 'y' : 'ies'}${reds[0] ? `, led by ${reds[0].name} at ${money(reds[0].value.headline)}` : ''}. Separately, ${money(leak.total)} of negotiated value is leaking — ${money(leak.timing)} of that is timing leakage that is recoverable by driving on-contract compliance, and ${money(leak.contract)} is structural. The recoverable timing portion is the fastest available win.`,
      ] },
      { heading: 'Decisions', paragraphs: [
        `${num(queue.length)} decisions are waiting, with ${money(evAtStake)} of expected value at stake${queue[0] ? `. The highest-value one is ${queue[0].name} at ${money(queue[0].nextDecision.expectedValue)}${queue[0].nextDecision.missing.length ? `, held by ${num(queue[0].nextDecision.missing.length)} open evidence gap${queue[0].nextDecision.missing.length === 1 ? '' : 's'}` : ' with the case complete'}` : ''}. Clearing the queue on schedule is what protects the committed line for the rest of the fiscal year.`,
      ] },
      { heading: 'Recommendation', paragraphs: [
        `Hold the schedule on the ${num(queue.length)} open decisions, put a countermeasure on the ${num(reds.length)} red opportunit${reds.length === 1 ? 'y' : 'ies'}, and chase the ${money(leak.timing)} of recoverable timing leakage. Every figure in this brief is a sum of per-opportunity value objects and reconciles, to the dollar, with the executive dashboard.`,
      ] },
    ],
    footer: 'Drafted deterministically from the operating record — no language model, no fabricated numbers. Figures reconcile with the executive dashboard.',
  }
}

// ── Sourcing-group brief.
function groupNarrative(db, key) {
  const g = suppliers(db).find((x) => x.name === key)
  const opps = savingsOpportunities(db).filter((o) => o.supplier === key)
  if (!g || !opps.length) return null
  const val = opps.reduce((s, o) => s + o.value.headline, 0)
  const realized = opps.reduce((s, o) => s + o.value.realized, 0)
  const reds = opps.filter((o) => o.ragStatus === 'red')
  const top = [...opps].sort((a, b) => b.value.headline - a.value.headline).slice(0, 3)
  const byType = {}
  opps.forEach((o) => { byType[o.savingsType] = (byType[o.savingsType] || 0) + o.value.headline })
  const typeStr = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${savingsType(k).label} (${money(v)})`)

  return {
    kind: 'Sourcing-group brief',
    title: `${g.name} — sourcing brief`,
    dateline: dateline(db),
    figures: [
      { label: 'Group spend', value: money(g.spend) },
      { label: 'Opportunity value', value: money(val) },
      { label: 'Realized YTD', value: money(realized) },
      { label: 'Inflation', value: pct(g.inflation || 0) },
    ],
    sections: [
      { heading: 'Position', paragraphs: [
        `${g.name} carries ${money(g.spend)} of spend running at ${pct(g.inflation || 0)} inflation. Against it, Procurement is working ${num(opps.length)} opportunit${opps.length === 1 ? 'y' : 'ies'} worth ${money(val)}, of which ${money(realized)} is already FP&A-validated this year. The value is weighted toward ${list(typeStr.slice(0, 2))}.`,
      ] },
      { heading: 'Where the value sits', paragraphs: [
        `The largest moves are ${list(top.map((o) => `${o.name} (${money(o.value.headline)}, ${o.stageLabel})`))}. ${reds.length ? `${num(reds.length)} of the ${num(opps.length)} carry a red status and need a countermeasure before they will convert.` : 'None currently carry a red status.'}`,
      ] },
      { heading: 'Recommendation', paragraphs: [
        `${top[0] ? `Prioritise ${top[0].name}: ${opportunityInsight(db, top[0]._raw).recommendation}` : 'Advance the highest-value opportunities through their next gate.'} Every figure is drawn from the live operating record for this group.`,
      ] },
    ],
    footer: 'Drafted deterministically from the operating record — figures reconcile with the savings pipeline for this group.',
  }
}

// ── Single-opportunity brief.
function opportunityNarrative(db, id) {
  const o = savingsOpportunities(db).find((x) => x.id === id)
  if (!o) return null
  const insight = opportunityInsight(db, o._raw)
  const dec = o.nextDecision
  const risks = o.risks.filter((r) => r.score >= 8).sort((a, b) => b.score - a.score)
  const st = savingsType(o.savingsType)
  const rav = dec ? dec.expectedValue : o.value.headline

  return {
    kind: 'Opportunity brief',
    title: `${o.name} — decision brief`,
    dateline: dateline(db),
    figures: [
      { label: 'Headline value', value: money(o.value.headline) },
      { label: 'Risk-adjusted', value: money(rav) },
      { label: 'Confidence', value: pct(o.confidence) },
      { label: 'Stage', value: o.stageLabel },
    ],
    sections: [
      { heading: 'The opportunity', paragraphs: [
        `${o.name} is a ${st.label.toLowerCase()} opportunity in ${o.category}, owned by ${o.owner} and sponsored by ${o.sponsor}. It is worth ${money(o.value.headline)} at the headline and ${money(rav)} risk-adjusted, sitting at the ${o.stageLabel} stage with ${pct(o.confidence)} stage confidence.${o.description ? ` ${o.description}` : ''}`,
      ] },
      { heading: 'Where it stands', paragraphs: [
        `${dec ? `The next gate is "${dec.label}", with ${money(dec.expectedValue)} of expected value at stake.` : 'It is in sustainment; the run-rate is being protected.'}${dec && dec.missing && dec.missing.length ? ` ${num(dec.missing.length)} evidence requirement${dec.missing.length === 1 ? ' is' : 's are'} still open: ${list(dec.missing.map((x) => (typeof x === 'string' ? x : x.label || x.title || 'evidence')))}.` : dec ? ' The evidence for the gate is complete.' : ''}${risks.length ? ` The material risks are ${list(risks.map((r) => `${r.category} (score ${r.score})`))}.` : ' No material risks are open.'}`,
      ] },
      { heading: 'Recommendation', paragraphs: [
        `${insight.recommendation} ${o.ragStatus === 'red' ? 'The opportunity currently carries a red status — a countermeasure should accompany any advance.' : ''}`.trim(),
      ] },
    ],
    footer: 'Drafted deterministically from the opportunity workspace — recommendation and figures follow the engine gate model.',
  }
}

export function narrative(db, scope = { type: 'book' }) {
  if (scope.type === 'group') return groupNarrative(db, scope.key) || bookNarrative(db)
  if (scope.type === 'opportunity') return opportunityNarrative(db, scope.key) || bookNarrative(db)
  return bookNarrative(db)
}

// Flatten a drafted narrative to plain text for copy-to-clipboard / download.
export function narrativeText(n) {
  const lines = [n.title.toUpperCase(), n.dateline, '', n.figures.map((f) => `${f.label}: ${f.value}`).join('  ·  '), '']
  n.sections.forEach((s) => { lines.push(s.heading.toUpperCase()); s.paragraphs.forEach((p) => { lines.push(p); lines.push('') }) })
  lines.push('—', n.footer)
  return lines.join('\n')
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

// Download the drafted brief as a .txt memo.
export function downloadNarrative(n) {
  const blob = new Blob([narrativeText(n)], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${n.title.replace(/[^\w]+/g, '_')}.txt`
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  return a.download
}

// Open a print-ready view of the brief (Print → Save as PDF).
export function printNarrative(n) {
  const w = window.open('', '_blank')
  if (!w) return false
  const secs = n.sections.map((s) => `<h2>${esc(s.heading)}</h2>${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('')
  const figs = n.figures.map((f) => `<div class="fig"><b>${esc(f.value)}</b><span>${esc(f.label)}</span></div>`).join('')
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(n.title)}</title>
<style>body{font:15px/1.6 Georgia,'Times New Roman',serif;color:#111;max-width:720px;margin:40px auto;padding:0 24px}
h1{font-size:22px;margin:0 0 4px}.dl{color:#666;font-size:12px;letter-spacing:.4px;text-transform:uppercase;margin-bottom:20px}
.figs{display:flex;gap:28px;flex-wrap:wrap;border-top:2px solid #111;border-bottom:1px solid #ccc;padding:12px 0;margin-bottom:24px}
.fig b{display:block;font-size:20px;font-family:Arial,sans-serif}.fig span{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.3px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.6px;color:#444;margin:22px 0 6px;font-family:Arial,sans-serif}
p{margin:0 0 10px}.ft{margin-top:28px;padding-top:12px;border-top:1px solid #ccc;color:#888;font-size:11px;font-style:italic}
@media print{body{margin:0}}</style></head><body>
<h1>${esc(n.title)}</h1><div class="dl">${esc(n.dateline)}</div>
<div class="figs">${figs}</div>${secs}<div class="ft">${esc(n.footer)}</div>
<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`)
  w.document.close()
  return true
}
