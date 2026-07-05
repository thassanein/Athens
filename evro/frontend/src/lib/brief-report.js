// Morning Brief 2.0 — printable export (5B.6 item 5). Composes the persona-
// scoped briefing + board narrative into a self-contained, print-friendly
// window; the browser's "Save as PDF" is the PDF export. Sections follow the
// user's personalized template. Deterministic, rules-based — labelled on page.
import { executiveBriefing } from './briefing.js'
import { narrative } from './narrative.js'
import { scopedView, enterpriseRollup } from './engine.js'
import { aiRecommendations } from './model.js'
import { money, pct } from './format.js'

export const BRIEF_SECTIONS = [
  { key: 'ask', label: 'The ask' },
  { key: 'blocks', label: 'Value blocks' },
  { key: 'approvals', label: 'Sign-off queue' },
  { key: 'opportunities', label: 'Top opportunities' },
  { key: 'risks', label: 'Top risks' },
  { key: 'ai', label: 'AI recommendations' },
  { key: 'narrative', label: 'Board narrative' },
]
export const DEFAULT_TPL = Object.fromEntries(BRIEF_SECTIONS.map((s) => [s.key, true]))

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function printBriefing(db, user, tpl = DEFAULT_TPL) {
  const sdb = scopedView(db, user)
  const b = executiveBriefing(db, user)
  const board = narrative(sdb, user, 'board')
  const risks = enterpriseRollup(sdb).topRisks.slice(0, 4)
  const recs = aiRecommendations(db, { status: 'open' }).slice(0, 4)
  const today = db.meta?.now || ''

  const sec = (key, title, body) => (tpl[key] ? `<div class="sec"><h2>${title}</h2>${body}</div>` : '')
  const li = (rows) => `<ul>${rows.join('')}</ul>`

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>EVRO briefing — ${esc(user.name)}</title><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, Arial, sans-serif; color: #1a2736; padding: 34px 40px; max-width: 760px; margin: 0 auto; }
    .head { border-bottom: 3px solid #E5243B; padding-bottom: 12px; margin-bottom: 18px; }
    .head h1 { font-size: 21px; letter-spacing: -0.3px; }
    .head .meta { color: #6b7480; font-size: 12px; margin-top: 3px; }
    .headline { font-size: 14.5px; line-height: 1.55; font-weight: 700; margin-bottom: 14px; }
    .ask { background: #eef3fb; border-left: 3px solid #1a428a; color: #1a428a; font-weight: 700; font-size: 13px; padding: 9px 12px; border-radius: 6px; margin-bottom: 16px; }
    .sec { margin-bottom: 16px; page-break-inside: avoid; }
    .sec h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #E5243B; margin-bottom: 7px; }
    ul { padding-left: 18px; } li { font-size: 12.5px; line-height: 1.6; color: #33404f; }
    .blocks { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .blk { border: 1px solid #e4e8ee; border-radius: 8px; padding: 8px 10px; }
    .blk .l { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7480; font-weight: 700; }
    .blk .v { font-size: 16px; font-weight: 800; margin-top: 2px; }
    .blk .s { font-size: 10px; color: #6b7480; margin-top: 1px; }
    .foot { margin-top: 22px; border-top: 1px solid #e4e8ee; padding-top: 9px; font-size: 10.5px; color: #6b7480; }
    b.money { font-variant-numeric: tabular-nums; }
    @media print { body { padding: 0; } }
  </style></head><body>
    <div class="head"><h1>${esc(b.greeting)} — your EVRO briefing</h1><div class="meta">${esc(b.roleTitle)} · as of ${esc(today)} · scoped to your view</div></div>
    <p class="headline">${esc(b.headline)}</p>
    ${tpl.ask ? `<div class="ask">${esc(board.ask)}</div>` : ''}
    ${sec('blocks', 'Value blocks', `<div class="blocks">${b.blocks.map((x) => `<div class="blk"><div class="l">${esc(x.title)}</div><div class="v">${esc(x.value)}</div><div class="s">${esc(x.sub)}</div></div>`).join('')}</div>`)}
    ${sec('approvals', 'Awaiting sign-off', b.approvals.length ? li(b.approvals.map((d) => `<li><b>${esc(d.title)}</b> — ${esc(d.detail)} (<b class="money">${money(d.value)}</b>)</li>`)) : '<ul><li>Nothing needs approval.</li></ul>')}
    ${sec('opportunities', 'Top opportunities', b.opportunities.length ? li(b.opportunities.map((o) => `<li><b>${esc(o.label)}</b> — ${esc(o.hint)} (<b class="money">${money(o.value)}</b>)</li>`)) : '<ul><li>No open opportunities in view.</li></ul>')}
    ${sec('risks', 'Top risks', risks.length ? li(risks.map((r) => `<li><b>${esc(r.title)}</b> — ${esc(r.category)} risk, score ${r.score}</li>`)) : '<ul><li>No open risks in view.</li></ul>')}
    ${sec('ai', 'AI recommendations (deterministic)', li(recs.map((r) => `<li><b>${esc(r.agent)}:</b> ${esc(r.title)} — confidence ${pct(r.confidence)}${r.value_impact ? `, impact <b class="money">${money(r.value_impact)}</b>` : ''}</li>`)))}
    ${sec('narrative', 'Board narrative', li(board.bullets.map((x) => `<li>${esc(x)}</li>`)))}
    <div class="foot">Athens EVRO · auto-generated for your role and scope · computed from the live portfolio by deterministic rules — no language model. Only FP&amp;A-validated value counts as realized.</div>
  </body></html>`

  const win = window.open('', '_blank', 'width=820,height=900')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 250)
  return true
}
