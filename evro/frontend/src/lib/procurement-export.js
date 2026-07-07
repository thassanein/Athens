// Procurement report exports — extraction points to Excel (CSV), PDF (print)
// and PowerPoint (.pptx). All read the deterministic procurementModel, so an
// export is a faithful snapshot of what's on screen. No engine/data change.
import { procurementModel, savingsOpportunities } from './procurement.js'
import { money, pct, num } from './format.js'

const stamp = (db) => `FY${db.meta.fiscalYear}_${String(db.meta.now).replace(/-/g, '')}`
const dl = (blob, name) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; document.body.appendChild(a); a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 0)
}
const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

// ── Excel (CSV) — the whole savings book, one row per opportunity.
export function exportCSV(db) {
  const opps = savingsOpportunities(db)
  const head = ['Opportunity', 'Supplier / group', 'Category', 'Savings type', 'Lifecycle stage', 'Owner', 'Sponsor', 'RAG', 'Confidence', 'Potential', 'Committed', 'Realized', 'Headline value', 'Worst risk', 'Next decision', 'Due']
  const rows = opps.map((o) => [
    o.name, o.supplier, o.category, o.savingsTypeLabel, o.stageLabel, o.owner, o.sponsor, o.ragStatus,
    (o.confidence * 100).toFixed(0) + '%', Math.round(o.value.potential), Math.round(o.value.committed),
    Math.round(o.value.realized), Math.round(o.value.headline), o.worstRisk,
    o.nextDecision ? o.nextDecision.label : '', o.targetClose || '',
  ])
  const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
  dl(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), `EVRO_Procurement_SavingsBook_${stamp(db)}.csv`)
  return rows.length
}

// ── PDF — a formatted printable report opened in a new window (Save as PDF).
export function exportPDF(db) {
  const m = procurementModel(db)
  const fy = db.meta.fiscalYear
  const row = (cells, tag = 'td') => `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`
  const pipeRows = m.pipeline.filter((s) => s.count).map((s) => row([s.label, s.count, money(s.value)])).join('')
  const typeRows = m.byType.filter((t) => t.count).map((t) => row([t.label, t.count, money(t.value)])).join('')
  const decRows = m.opportunities.filter((o) => o.nextDecision && (o._raw.request || o.nextDecision.missing.length))
    .sort((a, b) => b.nextDecision.expectedValue - a.nextDecision.expectedValue).slice(0, 10)
    .map((o) => row([o.name, o.owner, o.nextDecision.label, money(o.nextDecision.expectedValue)])).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>EVRO Procurement — Executive Report FY${fy}</title>
  <style>
    body{font-family:Archivo,Segoe UI,system-ui,sans-serif;color:#12131a;margin:32px;font-size:12px}
    h1{font-size:22px;margin:0 0 2px} h2{font-size:14px;margin:20px 0 8px;border-bottom:2px solid #eee;padding-bottom:4px}
    .sub{color:#666;font-size:12px;margin-bottom:16px}
    .kpis{display:flex;gap:26px;margin:10px 0 4px;flex-wrap:wrap}
    .kpi b{display:block;font-size:20px} .kpi span{color:#666;font-size:11px}
    table{border-collapse:collapse;width:100%;margin-top:6px} th,td{text-align:left;padding:5px 8px;border-bottom:1px solid #eee;font-size:11.5px}
    th{color:#666;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:.3px}
    td:last-child,th:last-child{text-align:right} .foot{margin-top:24px;color:#888;font-size:10px}
  </style></head><body>
  <h1>Athens EVRO · Procurement — Executive Report</h1>
  <div class="sub">Enterprise Savings Under Management · FY${fy} · as of ${db.meta.now}</div>
  <div class="kpis">
    <div class="kpi"><b>${money(m.sum.total)}</b><span>Under management (${num(m.sum.count)} opportunities)</span></div>
    <div class="kpi"><b>${money(m.sum.lenses.realized)}</b><span>Realized YTD</span></div>
    <div class="kpi"><b>${money(m.sum.lenses.committed)}</b><span>Committed</span></div>
    <div class="kpi"><b>${money(m.sum.atRisk)}</b><span>At risk</span></div>
    <div class="kpi"><b>${pct(m.sum.confidence)}</b><span>Confidence</span></div>
  </div>
  <h2>Pipeline by stage</h2><table><thead>${row(['Stage', 'Count', 'Value'], 'th')}</thead><tbody>${pipeRows}</tbody></table>
  <h2>Savings by type</h2><table><thead>${row(['Type', 'Count', 'Value'], 'th')}</thead><tbody>${typeRows}</tbody></table>
  <h2>Decision queue (top 10)</h2><table><thead>${row(['Opportunity', 'Owner', 'Next decision', 'Expected'], 'th')}</thead><tbody>${decRows}</tbody></table>
  <div class="foot">Deterministic · rules-based — every figure aligned to the same validated source of truth. Value counts only once FP&amp;A validates it.</div>
  </body></html>`
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return false
  win.document.write(html); win.document.close()
  setTimeout(() => { try { win.print() } catch { /* user can print manually */ } }, 300)
  return true
}

// ── PowerPoint (.pptx) — a board deck (lazy-loads pptxgenjs).
const HEX = { bg: '0E0E11', card: '16161A', ink: 'F4F4F6', grey: '9AA0AA', green: '3FB27F', navy: '5B8DEF', amber: 'D9A441', red: 'E5645E', opp: 'C08457' }
const FONT = 'Archivo'
export async function exportPPTX(db) {
  const m = procurementModel(db)
  const fy = db.meta.fiscalYear
  const mod = await import('pptxgenjs')
  const PptxGenJS = mod.default || mod
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'Athens EVRO'; pptx.company = 'Athens Services'
  pptx.title = `EVRO Procurement — Board Pack FY${fy}`
  pptx.defineSlideMaster({ title: 'EVRO', background: { color: HEX.bg }, objects: [
    { rect: { x: 0, y: 0, w: '100%', h: 0.11, fill: { color: HEX.red } } },
    { text: { text: 'Athens EVRO · Procurement', options: { x: 0.5, y: 7.06, w: 6, h: 0.3, fontSize: 9, color: HEX.grey, fontFace: FONT } } },
    { text: { text: 'Deterministic · aligned to one validated source of truth', options: { x: 5, y: 7.06, w: 7.83, h: 0.3, fontSize: 9, color: HEX.grey, align: 'right', fontFace: FONT } } },
  ] })
  const T = (s, t, o) => s.addText(t, { fontFace: FONT, ...o })
  const tbl = (s, headArr, rows, y) => s.addTable([
    headArr.map((h) => ({ text: h, options: { bold: true, color: HEX.grey, fontSize: 11, fill: { color: HEX.card } } })),
    ...rows,
  ], { x: 0.5, y, w: 12.3, color: HEX.ink, fontFace: FONT, fontSize: 12, border: { type: 'solid', color: '2A2A31', pt: 0.5 }, autoPage: false })

  // cover
  const c = pptx.addSlide({ masterName: 'EVRO' })
  T(c, 'Procurement — Savings Under Management', { x: 0.5, y: 0.7, w: 12, h: 0.6, fontSize: 30, bold: true, color: HEX.ink })
  T(c, `Athens EVRO · FY${fy} · as of ${db.meta.now}`, { x: 0.5, y: 1.4, w: 12, h: 0.4, fontSize: 14, color: HEX.grey })
  T(c, money(m.sum.total), { x: 0.5, y: 2.3, w: 6, h: 1.1, fontSize: 54, bold: true, color: HEX.green })
  const lenses = [['Identified', m.sum.lenses.identified], ['Committed', m.sum.lenses.committed], ['Realized YTD', m.sum.lenses.realized], ['Sustained', m.sum.lenses.sustained]]
  lenses.forEach((l, i) => { T(c, money(l[1]), { x: 0.5 + i * 3.1, y: 3.8, w: 3, h: 0.5, fontSize: 20, bold: true, color: HEX.ink }); T(c, l[0], { x: 0.5 + i * 3.1, y: 4.3, w: 3, h: 0.3, fontSize: 11, color: HEX.grey }) })
  T(c, `${num(m.sum.count)} opportunities · ${pct(m.sum.confidence)} confidence · ${money(m.velocity.perMonth)}/mo velocity · ${money(m.sum.atRisk)} at risk`, { x: 0.5, y: 5.2, w: 12, h: 0.4, fontSize: 13, color: HEX.grey })

  // pipeline slide
  const p1 = pptx.addSlide({ masterName: 'EVRO' })
  T(p1, 'Savings pipeline by stage', { x: 0.5, y: 0.4, w: 12, h: 0.5, fontSize: 22, bold: true, color: HEX.ink })
  tbl(p1, ['Stage', 'Count', 'Value'], m.pipeline.filter((s) => s.count).map((s) => [s.label, String(s.count), money(s.value)]), 1.2)

  // by-type slide
  const p2 = pptx.addSlide({ masterName: 'EVRO' })
  T(p2, 'Savings by type', { x: 0.5, y: 0.4, w: 12, h: 0.5, fontSize: 22, bold: true, color: HEX.ink })
  tbl(p2, ['Savings type', 'Count', 'Value'], m.byType.filter((t) => t.count).map((t) => [t.label, String(t.count), money(t.value)]), 1.2)

  // decisions slide
  const dec = m.opportunities.filter((o) => o.nextDecision && (o._raw.request || o.nextDecision.missing.length))
    .sort((a, b) => b.nextDecision.expectedValue - a.nextDecision.expectedValue).slice(0, 8)
  const p3 = pptx.addSlide({ masterName: 'EVRO' })
  T(p3, 'Decision queue', { x: 0.5, y: 0.4, w: 12, h: 0.5, fontSize: 22, bold: true, color: HEX.ink })
  tbl(p3, ['Opportunity', 'Owner', 'Next decision', 'Expected'], dec.map((o) => [o.name, o.owner, o.nextDecision.label, money(o.nextDecision.expectedValue)]), 1.2)

  const fileName = `EVRO_Procurement_BoardPack_${stamp(db)}.pptx`
  await pptx.writeFile({ fileName })
  return fileName
}
