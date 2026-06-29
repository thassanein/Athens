import { portfolioRollup, nextDue, fmtDate, overdueCount } from './derive.js'
import { ownerFor } from './employees.js'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Build a standalone, print-ready portfolio compliance summary (Save as PDF
// from the print dialog) — the leadership / monthly summary view.
export function openPortfolioReport(data, userName) {
  const now = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
  const r = portfolioRollup(data)
  const rows = r.sites
    .slice()
    .sort((a, b) => {
      const rank = { noncompliant: 0, risk: 1, compliant: 2 }
      return rank[a.tier.key] - rank[b.tier.key] || b.openIssues - a.openIssues
    })
    .map((s) => {
      const site = data[s.name]
      const owner = ownerFor(s.name)
      const nd = s.nextDue
      const cls = s.tier.key === 'noncompliant' ? 'bad' : s.tier.key === 'risk' ? 'warn' : 'ok'
      return `<tr>
        <td>${esc(s.name)}</td>
        <td>${esc(site.type)}</td>
        <td><span class="tag ${cls}">${esc(s.tier.label)}</span></td>
        <td>${s.gaps || 0}</td>
        <td>${s.openIssues || 0}</td>
        <td>${overdueCount(site)}</td>
        <td>${nd ? `${esc(fmtDate(nd.date))} (${nd.days}d)` : '—'}</td>
        <td>${esc(owner.name)}</td>
      </tr>`
    })
    .join('')

  const kpi = (n, l, cls) => `<div class="kpi ${cls || ''}"><div class="n">${n}</div><div class="l">${esc(l)}</div></div>`
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Portfolio compliance summary</title>
  <style>
    body{font:14px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1A2736;margin:30px;max-width:1000px}
    h1{font-size:22px;margin:0 0 2px}.muted{color:#889}
    .grid{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 8px}
    .kpi{flex:1;min-width:120px;border:1px solid #dde3ea;border-radius:10px;padding:12px 14px}
    .kpi .n{font-size:26px;font-weight:800}.kpi .l{font-size:12px;color:#667;margin-top:2px}
    .kpi.ok{background:#eaf6ee;border-color:#b6e2c5}.kpi.warn{background:#fdf4e3;border-color:#f0d39a}.kpi.bad{background:#fdecee;border-color:#f3b8bf}
    table{border-collapse:collapse;width:100%;font-size:12.5px;margin-top:14px}
    th,td{border:1px solid #dde3ea;padding:6px 8px;text-align:left}th{background:#f2f5f8}
    .tag{display:inline-block;border-radius:20px;padding:1px 8px;font-size:11px;font-weight:700}
    .tag.ok{background:#eaf6ee;color:#1A5632}.tag.warn{background:#fdf4e3;color:#8a5a00}.tag.bad{background:#fdecee;color:#D5172A}
    .toolbar{position:fixed;top:10px;right:10px}button{font:14px sans-serif;padding:8px 14px;border-radius:8px;border:0;background:#1A2736;color:#fff;cursor:pointer}
    @media print{.toolbar{display:none}}
  </style></head><body>
  <div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div>
  <h1>Portfolio Compliance Summary</h1>
  <div class="muted">Athens Services · ${r.total} facilities · generated ${esc(now)}${userName ? ` · by ${esc(userName)}` : ''}</div>
  <div class="grid">
    ${kpi(r.total, 'Facilities')}
    ${kpi(r.tiers.compliant, 'Compliant', 'ok')}
    ${kpi(r.tiers.risk, 'At risk', 'warn')}
    ${kpi(r.tiers.noncompliant, 'Non-compliant', 'bad')}
    ${kpi(r.overdue, 'Overdue / unconfirmed', r.overdue ? 'bad' : 'ok')}
    ${kpi(r.upcoming, 'Due ≤ 90 days', r.upcoming ? 'warn' : 'ok')}
  </div>
  <table>
    <thead><tr><th>Facility</th><th>Type</th><th>Status</th><th>Gaps</th><th>Open issues</th><th>Overdue</th><th>Next due</th><th>Owner</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  </body></html>`

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}
