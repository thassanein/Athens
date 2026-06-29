// Server-rendered diagnostics surfaces so tools that DON'T execute JavaScript
// (AI agents, crawlers, monitors) can read the app's real state — not just the
// empty SPA shell. Everything here is computed from the same portfolio data the
// API returns, so it stays in sync with the UI.

// Reference "today" — matches the frontend (seed dates are relative to this).
const TODAY = new Date('2026-06-27T00:00:00Z')

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function daysUntil(dateStr) {
  if (!dateStr) return Infinity
  const d = new Date(`${dateStr}T00:00:00Z`)
  return Math.round((d - TODAY) / 86400000)
}
const isOpenWork = (c) => c.status === 'fail' || c.status === 'open'

// Mirror of the frontend's risk tiering so the diagnostics match the UI.
function riskTier(site) {
  const checklist = site.checklist || []
  const permits = site.permits || []
  const leases = site.leases || []
  const missing = site.compliance?.missing || 0
  const failing = checklist.some((c) => c.status === 'fail')
  const overdueFinding = checklist.some((c) => isOpenWork(c) && c.due && daysUntil(c.due) < 0)
  if (missing > 0 || failing || overdueFinding) return { key: 'noncompliant', label: 'Non-compliant' }
  const verify = permits.some((p) => p.status === 'verify')
  const openWork = checklist.some(isOpenWork)
  const renew = permits.some((p) => p.status === 'renew')
  const soon = [...permits, ...leases].some((x) => {
    const d = daysUntil(x.expires)
    return d >= 0 && d <= 90
  })
  if (verify || openWork || renew || soon) return { key: 'risk', label: 'At risk' }
  return { key: 'compliant', label: 'Compliant' }
}

function nextDue(site) {
  let best = null
  for (const x of [...(site.permits || []), ...(site.leases || [])]) {
    const d = daysUntil(x.expires)
    if (d !== Infinity && d >= 0 && (!best || d < best.days)) best = { days: d, date: x.expires, name: x.name }
  }
  return best
}

function overdueCount(site) {
  const verify = (site.permits || []).filter((p) => p.status === 'verify').length
  const od = (site.checklist || []).filter((c) => isOpenWork(c) && c.due && daysUntil(c.due) < 0).length
  return verify + od
}

function siteSummary(name, site) {
  const tier = riskTier(site)
  const permits = site.permits || []
  const open = (site.checklist || []).filter(isOpenWork).length
  return {
    name,
    type: site.type,
    city: site.city,
    swis: site.swis || null,
    anchor: !!site.anchor,
    status: tier.label,
    statusKey: tier.key,
    complianceGaps: site.compliance?.missing || 0,
    openIssues: open + permits.filter((p) => p.status === 'verify').length,
    overdue: overdueCount(site),
    nextDue: nextDue(site),
    permits: {
      total: permits.length,
      verify: permits.filter((p) => p.status === 'verify').length,
      active: permits.filter((p) => p.status === 'active').length,
    },
    leases: (site.leases || []).length,
    findingsOpen: open,
    compliance: site.compliance || null,
  }
}

// Machine-readable portfolio diagnostics (JSON).
export function portfolioDiagnostics(data) {
  const sites = Object.entries(data).map(([name, site]) => siteSummary(name, site))
  const tiers = { compliant: 0, risk: 0, noncompliant: 0 }
  let overdue = 0
  let upcoming = 0
  for (const s of sites) {
    tiers[s.statusKey] += 1
    overdue += s.overdue
    if (s.nextDue && s.nextDue.days <= 90) upcoming += 1
  }
  const highRisk = sites
    .filter((s) => s.statusKey === 'noncompliant')
    .sort((a, b) => b.complianceGaps - a.complianceGaps || b.openIssues - a.openIssues)
    .slice(0, 8)
    .map((s) => ({ name: s.name, type: s.type, complianceGaps: s.complianceGaps, openIssues: s.openIssues, overdue: s.overdue }))
  return {
    app: 'Athens Facility Compliance',
    generatedAt: new Date().toISOString(),
    referenceDate: '2026-06-27',
    total: sites.length,
    tiers,
    overdue,
    upcoming,
    highRisk,
    sites,
  }
}

// Server-rendered HTML overview — readable by humans AND by tools that do not
// run JavaScript. This is the page to point an AI diagnostics tool at.
export function renderOverviewHTML(data, { authMode } = {}) {
  const d = portfolioDiagnostics(data)
  const rows = d.sites
    .slice()
    .sort((a, b) => {
      const rank = { noncompliant: 0, risk: 1, compliant: 2 }
      return rank[a.statusKey] - rank[b.statusKey] || b.openIssues - a.openIssues
    })
    .map((s) => {
      const cls = s.statusKey === 'noncompliant' ? 'bad' : s.statusKey === 'risk' ? 'warn' : 'ok'
      const nd = s.nextDue ? `${esc(s.nextDue.date)} (${s.nextDue.days}d)` : '—'
      return `<tr>
        <td>${esc(s.name)}</td><td>${esc(s.type)}</td><td>${esc(s.city)}</td>
        <td><span class="tag ${cls}">${esc(s.status)}</span></td>
        <td>${s.complianceGaps}</td><td>${s.openIssues}</td><td>${s.overdue}</td>
        <td>${nd}</td><td>${s.permits.total}</td>
      </tr>`
    })
    .join('')
  const kpi = (n, l, cls) => `<div class="kpi ${cls || ''}"><div class="n">${n}</div><div class="l">${esc(l)}</div></div>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Athens Facility Compliance — Overview & Diagnostics</title>
  <meta name="description" content="Server-rendered overview of the Athens facility compliance portfolio: ${d.total} facilities, compliance status, open gaps, overdue items and upcoming deadlines. JSON API at /api/sites and /api/portfolio.">
  <style>
    body{font:15px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1A2736;margin:28px;max-width:1040px}
    h1{font-size:24px;margin:0 0 2px}h2{font-size:16px;margin:24px 0 8px}
    .muted{color:#677}a{color:#1f5fbf}
    .grid{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}
    .kpi{flex:1;min-width:120px;border:1px solid #dde3ea;border-radius:10px;padding:12px 14px}
    .kpi .n{font-size:26px;font-weight:800}.kpi .l{font-size:12px;color:#667;margin-top:2px}
    .kpi.ok{background:#eaf6ee;border-color:#b6e2c5}.kpi.warn{background:#fdf4e3;border-color:#f0d39a}.kpi.bad{background:#fdecee;border-color:#f3b8bf}
    table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px}
    th,td{border:1px solid #dde3ea;padding:6px 8px;text-align:left}th{background:#f2f5f8}
    .tag{display:inline-block;border-radius:20px;padding:1px 8px;font-size:12px;font-weight:700}
    .tag.ok{background:#eaf6ee;color:#1A5632}.tag.warn{background:#fdf4e3;color:#8a5a00}.tag.bad{background:#fdecee;color:#D5172A}
    code{background:#f2f5f8;border-radius:5px;padding:1px 5px}
    ul{margin:6px 0}
  </style></head><body>
  <h1>Athens Facility Compliance</h1>
  <div class="muted">Track facility compliance status, open gaps, due dates, owners, and audit readiness across the Athens portfolio.
  Server-rendered overview · ${d.total} facilities · reference date ${esc(d.referenceDate)} · generated ${esc(d.generatedAt)} · auth mode: ${esc(authMode || 'open')}</div>

  <div class="grid">
    ${kpi(d.total, 'Facilities')}
    ${kpi(d.tiers.compliant, 'Compliant', 'ok')}
    ${kpi(d.tiers.risk, 'At risk', 'warn')}
    ${kpi(d.tiers.noncompliant, 'Non-compliant', 'bad')}
    ${kpi(d.overdue, 'Overdue / unconfirmed', d.overdue ? 'bad' : 'ok')}
    ${kpi(d.upcoming, 'Due ≤ 90 days', d.upcoming ? 'warn' : 'ok')}
  </div>

  <h2>For automated tools & AI diagnostics</h2>
  <p class="muted">The interactive app is a JavaScript single-page app, so a fetch that does not run JS only sees the HTML shell. Use these server-rendered, CORS-enabled endpoints instead:</p>
  <ul class="muted">
    <li><code>GET /api/portfolio</code> — JSON diagnostics: portfolio rollup + per-facility status, gaps, open issues, overdue, next due.</li>
    <li><code>GET /api/sites</code> — full JSON portfolio (permits, leases, findings, compliance, documents).</li>
    <li><code>GET /api/health</code> — service + database status.</li>
    <li><code>GET /overview</code> — this page (human + machine readable).</li>
    <li><code>GET /llms.txt</code> — plain-text guide for AI tools.</li>
  </ul>

  <h2>Facilities (${d.total})</h2>
  <table>
    <thead><tr><th>Facility</th><th>Type</th><th>City</th><th>Status</th><th>Gaps</th><th>Open issues</th><th>Overdue</th><th>Next due</th><th>Permits</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  </body></html>`
}

// Plain-text descriptor for AI tools (emerging /llms.txt convention).
export function renderLlmsTxt(data, { baseUrl = '' } = {}) {
  const d = portfolioDiagnostics(data)
  return `# Athens Facility Compliance

> A compliance command center for the Athens Services waste/recycling portfolio.
> Tracks ${d.total} facilities: permits, leases, inspection findings, audits,
> compliance gaps, due dates, owners, and audit readiness.

The user interface is a JavaScript single-page app. To read its data
programmatically (no browser/JS required), use the JSON and server-rendered
endpoints below. All are public and CORS-enabled (Access-Control-Allow-Origin: *).

## Endpoints
- ${baseUrl}/api/portfolio : JSON diagnostics — portfolio rollup (totals, status tiers, overdue, upcoming, high-risk) plus a per-facility summary.
- ${baseUrl}/api/sites : JSON — full portfolio (each facility's permits, leases, findings, compliance, documents).
- ${baseUrl}/api/health : JSON — service and database status.
- ${baseUrl}/overview : HTML — server-rendered overview (human + machine readable).
- ${baseUrl}/llms.txt : this file.

## Current snapshot (reference date ${d.referenceDate})
- Facilities: ${d.total}
- Compliant: ${d.tiers.compliant}; At risk: ${d.tiers.risk}; Non-compliant: ${d.tiers.noncompliant}
- Overdue / unconfirmed items: ${d.overdue}
- Due within 90 days: ${d.upcoming}

## Status definitions
- Non-compliant: a missing required item, a failing finding, or an overdue open action.
- At risk: a permit to verify, open work, a renewal, or an expiry within 90 days.
- Compliant: none of the above.
`
}
