// Server-rendered / JSON surfaces for tools, crawlers and AI diagnostics.
// All numbers come from the shared engine, so these agree with the SPA.
import {
  enterpriseRollup, scenarioTotals, funnel, rankInitiatives, leaderboard,
  spendRollup, opportunityValue, sizedOpportunities, personName,
} from './engine.js'

const M = (n) => (n == null ? '—' : '$' + (n / 1e6).toFixed(2) + 'M')

export function portfolioDiagnostics(db) {
  const r = enterpriseRollup(db)
  const f = funnel(db)
  return {
    app: 'Athens EVRO',
    model: 'return-maximization (no savings/avoidance target)',
    meta: db.meta,
    headline: {
      realizedYTD: r.realizedYTD,
      riskAdjustedPipeline: r.raPipeline,
      riskAdjustedForecastFY: r.forecastRemainderFY,
      identifiedOpportunity: r.identifiedOpportunity,
      blendedROI: r.blendedROI,
      capturePctOfAddressable: r.capturePct,
      valueLeakage: r.leakage,
    },
    pillars: r.pillar,
    benefitType: r.benefitType,
    scenarios: scenarioTotals(db),
    funnel: f.stages,
    conversions: f.conversions,
    topReturns: rankInitiatives(db, 'return').slice(0, 10).map((i) => ({ id: i.id, title: i.title, stage: i.stage, pillar: i.pillar, rav: i.rav, roi: i.roi })),
    leaderboardTop: leaderboard(db).total.slice(0, 5).map((p) => ({ name: p.name, totalFY: p.totalFY, realized: p.realized, points: p.points })),
    opportunityValue: opportunityValue(db),
    counts: { initiatives: db.initiatives.length, opportunities: db.opportunities.length, categories: db.spend_categories.length },
  }
}

export function renderLlmsTxt(db, { baseUrl }) {
  const r = enterpriseRollup(db)
  const sc = scenarioTotals(db)
  return `# Athens EVRO — Enterprise Value Realization Office

A cost-management platform for Athens Services. It tracks cost-savings and
cost-avoidance value across the $${(db.meta.addressableTotal / 1e6).toFixed(0)}M addressable spend base (2025 AP register,
14 sourcing groups, 116 categories).

ORGANIZING PRINCIPLE: return-maximization, NOT target-attainment. There is no
savings target and no avoidance target anywhere. Initiatives and opportunities
are ranked by Biggest Return (risk-adjusted value) and Best ROI (RAV / effort).
Only FP&A-validated value counts as Realized.

## Headline (current seed)
- Realized YTD (validated): ${M(r.realizedYTD)}
- Risk-adjusted pipeline: ${M(r.raPipeline)}
- Risk-adjusted forecast (rest of FY): ${M(r.forecastRemainderFY)}
- Identified opportunity value (illustrative): ${M(r.identifiedOpportunity)}
- Forecast scenarios — Committed ${M(sc.committed)} / Expected ${M(sc.expected)} / Upside ${M(sc.upside)}
- Implemented-vs-negotiated leakage: ${M(r.leakage)}

## Machine-readable endpoints
- ${baseUrl}/api/db          Whole portfolio (groups, categories, initiatives, opportunities, people)
- ${baseUrl}/api/exec        Executive rollup (engine-computed)
- ${baseUrl}/api/portfolio   Diagnostics: headline, scenarios, funnel, top returns, leaderboard
- ${baseUrl}/api/health      Service + DB status
- ${baseUrl}/overview        Server-rendered HTML summary (no JS)

## Definitions
- Cost Reduction = historical baseline price − final negotiated price (active elimination).
- Cost Savings  = original cost − new lower cost (productivity).
- Cost Avoidance = projected future cost − actual cost after intervention (prevented increase).
- Risk-Adjusted Value = gross × stage confidence (25/50/75/100%) × realization factor.
`
}

const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))

export function renderOverviewHTML(db) {
  const r = enterpriseRollup(db)
  const sc = scenarioTotals(db)
  const top = rankInitiatives(db, 'return').slice(0, 12)
  const groups = spendRollup(db).groups
  const lb = leaderboard(db).total.slice(0, 6)
  const tile = (label, val, color) => `<div style="flex:1;min-width:180px;border:1px solid #e4e8ee;border-left:4px solid ${color};border-radius:10px;padding:12px 14px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#6b7480;font-weight:700">${label}</div><div style="font-size:24px;font-weight:800;color:${color}">${val}</div></div>`
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Athens EVRO — Overview</title>
<style>body{font-family:'Helvetica Neue',Arial,sans-serif;margin:0;background:#f1f4f8;color:#1a2736}
.wrap{max-width:1100px;margin:0 auto;padding:22px}h1{font-size:20px;margin:0 0 4px}.sub{color:#6b7480;font-size:13px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px;background:#fff}th{ text-align:left;font-size:10.5px;text-transform:uppercase;color:#6b7480;border-bottom:1px solid #e4e8ee;padding:8px}
td{padding:8px;border-bottom:1px solid #eef1f5}.card{background:#fff;border:1px solid #e4e8ee;border-radius:12px;padding:16px;margin-top:16px}
.r{text-align:right;font-variant-numeric:tabular-nums}a{color:#1a428a}</style></head>
<body><div class="wrap">
<h1>Athens EVRO — Enterprise Value Realization Office</h1>
<div class="sub">Return-maximization model — no savings or avoidance target. Addressable base ${M(db.meta.addressableTotal)} · ${db.initiatives.length} initiatives · ${db.opportunities.length} opportunities. JSON: <a href="/api/portfolio">/api/portfolio</a> · <a href="/api/db">/api/db</a> · <a href="/llms.txt">/llms.txt</a></div>
<div style="display:flex;gap:12px;flex-wrap:wrap">
${tile('Realized YTD (validated)', M(r.realizedYTD), '#1a5632')}
${tile('Risk-adjusted pipeline', M(r.raPipeline), '#1a428a')}
${tile('Identified opportunity', M(r.identifiedOpportunity), '#d5172a')}
${tile('Expected forecast (FY)', M(sc.expected), '#1a2736')}
</div>
<div class="card"><h2 style="font-size:15px;margin:0 0 10px">Top returns</h2>
<table><thead><tr><th>#</th><th>Initiative</th><th>Owner</th><th>Stage</th><th class="r">RAV</th><th class="r">ROI</th></tr></thead><tbody>
${top.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.title)}</td><td>${esc(personName(db, i.owner_id))}</td><td>${i.stage}</td><td class="r">${M(i.rav)}</td><td class="r">${M(i.roi)}</td></tr>`).join('')}
</tbody></table></div>
<div class="card"><h2 style="font-size:15px;margin:0 0 10px">Addressable spend by sourcing group</h2>
<table><thead><tr><th>Group</th><th class="r">2025 spend</th><th class="r">Categories</th></tr></thead><tbody>
${groups.map((g) => `<tr><td>${esc(g.name)}</td><td class="r">${M(g.spend)}</td><td class="r">${g.catCount}</td></tr>`).join('')}
</tbody></table></div>
<div class="card"><h2 style="font-size:15px;margin:0 0 10px">Leaderboard — Total FY impact</h2>
<table><thead><tr><th>#</th><th>Person</th><th class="r">Realized YTD</th><th class="r">Forecast FY</th><th class="r">Total FY</th></tr></thead><tbody>
${lb.map((p, n) => `<tr><td>${n + 1}</td><td>${esc(p.name)} — ${esc(p.fn)}</td><td class="r">${M(p.realized)}</td><td class="r">${M(p.forecastRA)}</td><td class="r">${M(p.totalFY)}</td></tr>`).join('')}
</tbody></table></div>
</div></body></html>`
}
