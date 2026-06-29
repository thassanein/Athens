import { useMemo, useState } from 'react'
import { siteStats, siteTone, portfolioRollup, riskTier, nextDue, fmtShort } from '../lib/derive.js'
import { ownerFor } from '../lib/employees.js'
import { demoAuditFor } from '../lib/demo-audits.js'
import { openPortfolioReport } from '../lib/portfolio-report.js'
import { IconChevron, IconExport } from '../components/Icons.jsx'

const TONE_HEX = { fail: '#D5172A', open: '#B7791F', pass: '#1A5632' }
const TIER_HEX = { compliant: '#1A5632', risk: '#B7791F', noncompliant: '#D5172A' }

// Project lat/lng into the map panel using the portfolio's bounding box.
function makeProjector(data, w, h, pad = 52) {
  const lats = [],
    lngs = []
  for (const n of Object.keys(data)) {
    lats.push(data[n].lat)
    lngs.push(data[n].lng)
  }
  const minLat = Math.min(...lats),
    maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs),
    maxLng = Math.max(...lngs)
  const spanLat = maxLat - minLat || 1
  const spanLng = maxLng - minLng || 1
  return (lat, lng) => {
    const x = pad + ((lng - minLng) / spanLng) * (w - pad * 2)
    const y = pad + ((maxLat - lat) / spanLat) * (h - pad * 2) // north = up
    return { x, y }
  }
}

// One executive KPI tile. `active` outlines it when its filter is applied.
function Kpi({ value, label, accent, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)',
        border: `1px solid ${active ? accent || 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.10)'}`,
        borderRadius: 'var(--r-tile)',
        padding: '10px 11px',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'block',
        minWidth: 0,
      }}
    >
      <div className="stat-num" style={{ color: accent || '#fff', fontSize: 22, lineHeight: 1.1 }}>
        {value}
      </div>
      <div className="label" style={{ color: '#9FB0C4', marginTop: 4, fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </div>
    </button>
  )
}

const TIER_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'noncompliant', label: 'Non-compliant' },
  { key: 'risk', label: 'At risk' },
  { key: 'compliant', label: 'Compliant' },
]
const SORTS = [
  { key: 'risk', label: 'Risk' },
  { key: 'due', label: 'Next due' },
  { key: 'issues', label: 'Open issues' },
  { key: 'name', label: 'Name' },
]

export default function MapScreen({ data, user, onOpenSite, onNav }) {
  const roll = useMemo(() => portfolioRollup(data), [data])
  const [tier, setTier] = useState('all')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState('risk')
  const [q, setQ] = useState('')

  const W = 408,
    H = 200
  const project = makeProjector(data, W, H)
  const names = Object.keys(data)
  const types = useMemo(() => ['all', ...Array.from(new Set(names.map((n) => data[n].type))).sort()], [data, names])
  const anchorFor = (x) => (x < 70 ? 'start' : x > W - 70 ? 'end' : 'middle')

  const rows = useMemo(() => {
    const tierRank = { noncompliant: 0, risk: 1, compliant: 2 }
    let list = names.map((name) => {
      const site = data[name]
      const t = riskTier(site)
      const nd = nextDue(site)
      const insp = demoAuditFor(name, site)
      return {
        name,
        site,
        tier: t,
        nextDue: nd,
        owner: ownerFor(name).name,
        open: siteStats(site).open + (site.permits || []).filter((p) => p.status === 'verify').length,
        lastInsp: insp ? new Date(insp.updated) : null,
      }
    })
    if (tier !== 'all') list = list.filter((r) => r.tier.key === tier)
    if (type !== 'all') list = list.filter((r) => r.site.type === type)
    if (q.trim()) {
      const k = q.trim().toLowerCase()
      list = list.filter((r) => r.name.toLowerCase().includes(k) || (r.site.city || '').toLowerCase().includes(k))
    }
    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'issues') return b.open - a.open
      if (sort === 'due') return (a.nextDue?.days ?? 1e9) - (b.nextDue?.days ?? 1e9)
      return tierRank[a.tier.key] - tierRank[b.tier.key] || b.open - a.open // risk
    })
    return list
  }, [data, names, tier, type, sort, q])

  const fmtInsp = (d) => (d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—')

  return (
    <div className="screen">
      <div className="header">
        <div className="row spread" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="muted" style={{ color: '#9FB0C4', fontSize: 13.5, fontWeight: 600 }}>
              Good morning{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </div>
            <div className="title" style={{ marginTop: 2 }}>Compliance command center</div>
          </div>
          <button
            onClick={() => openPortfolioReport(data, user?.name)}
            className="pill"
            style={{ background: 'rgba(255,255,255,.14)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: '0 0 auto' }}
          >
            <IconExport size={14} /> Export
          </button>
        </div>
        <div className="muted" style={{ color: '#8497ab', fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
          Track facility compliance status, open gaps, due dates, owners, and audit readiness across the Athens portfolio.
        </div>

        {/* executive summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
          <Kpi value={roll.total} label="Facilities" active={tier === 'all' && type === 'all'} onClick={() => { setTier('all'); setType('all') }} />
          <Kpi value={roll.tiers.compliant} label="Compliant" accent="#7BE0A3" active={tier === 'compliant'} onClick={() => setTier(tier === 'compliant' ? 'all' : 'compliant')} />
          <Kpi value={roll.tiers.risk} label="At risk" accent="#F1C66B" active={tier === 'risk'} onClick={() => setTier(tier === 'risk' ? 'all' : 'risk')} />
          <Kpi value={roll.tiers.noncompliant} label="Non-compliant" accent="#FF8C99" active={tier === 'noncompliant'} onClick={() => setTier(tier === 'noncompliant' ? 'all' : 'noncompliant')} />
          <Kpi value={roll.overdue} label="Overdue items" accent={roll.overdue ? '#FF8C99' : '#fff'} onClick={() => onNav?.('alerts')} />
          <Kpi value={roll.upcoming} label="Due ≤ 90 days" accent={roll.upcoming ? '#F1C66B' : '#fff'} onClick={() => onNav?.('alerts')} />
        </div>
      </div>

      {/* Regional map panel */}
      <div className="pad">
        <div className="card" style={{ height: 200, padding: 0, overflow: 'hidden', position: 'relative' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="terr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#EFEADD" />
                <stop offset="1" stopColor="#E4E8DF" />
              </linearGradient>
            </defs>
            <rect width={W} height={H} fill="url(#terr)" />
            <g stroke="#CFD6C9" strokeWidth="2" fill="none" opacity="0.8">
              <path d="M-10 60 Q120 34 260 70 T430 64" />
              <path d="M-10 130 Q140 104 280 138 T430 126" />
            </g>
            {names.map((n) => {
              const p = project(data[n].lat, data[n].lng)
              const t = riskTier(data[n])
              const open = siteStats(data[n]).open
              return (
                <g key={n} onClick={() => onOpenSite(n)} role="button" aria-label={`Open ${n}`} style={{ cursor: 'pointer' }}>
                  <circle cx={p.x} cy={p.y} r="15" fill="transparent" style={{ pointerEvents: 'all' }} />
                  <circle cx={p.x} cy={p.y} r="11" fill="#fff" />
                  <circle cx={p.x} cy={p.y} r="8.5" fill={TIER_HEX[t.key]} />
                  <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">
                    {open || ''}
                  </text>
                  <text x={p.x} y={p.y + 23} textAnchor={anchorFor(p.x)} fontSize="9" fontWeight="700" fill="#1A2736">
                    {n.split(' ')[0]}
                  </text>
                </g>
              )
            })}
          </svg>
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,.92)', borderRadius: 12, padding: '7px 10px', fontSize: 10, fontWeight: 700, display: 'flex', gap: 9, boxShadow: 'var(--shadow-card)' }}>
            <span style={{ color: 'var(--red)' }}>● Non-compl.</span>
            <span style={{ color: 'var(--amber)' }}>● At risk</span>
            <span style={{ color: 'var(--green)' }}>● Compliant</span>
          </div>
        </div>
      </div>

      {/* Controls: search · filters · sort */}
      <div className="pad" style={{ paddingTop: 4 }}>
        <input
          className="input"
          placeholder="Search facility or city…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ fontSize: 14, marginBottom: 8 }}
        />
        <div className="chips" style={{ marginBottom: 8 }}>
          {TIER_FILTERS.map((f) => (
            <button key={f.key} className={`chip ${tier === f.key ? 'active' : ''}`} onClick={() => setTier(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="row gap" style={{ gap: 8 }}>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)} style={{ fontSize: 13, flex: 1 }}>
            {types.map((t) => (
              <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>
            ))}
          </select>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} style={{ fontSize: 13, flex: 1 }}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>Sort: {s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Facility cards */}
      <div className="pad" style={{ paddingTop: 4 }}>
        <div className="row spread" style={{ marginBottom: 8 }}>
          <div className="label">{rows.length} {rows.length === 1 ? 'facility' : 'facilities'}</div>
          {(tier !== 'all' || type !== 'all' || q) && (
            <button className="label" onClick={() => { setTier('all'); setType('all'); setQ('') }} style={{ color: 'var(--blue)' }}>
              Clear filters
            </button>
          )}
        </div>
        <div className="stack">
          {rows.length === 0 && (
            <div className="card" style={{ padding: 22, textAlign: 'center' }}><div className="muted">No facilities match these filters.</div></div>
          )}
          {rows.map((r) => {
            const t = r.tier
            const tn = siteTone(r.site)
            return (
              <button
                key={r.name}
                className={`card bd-${t.tone}`}
                onClick={() => onOpenSite(r.name)}
                style={{ width: '100%', textAlign: 'left', padding: '12px 14px', display: 'block' }}
              >
                <div className="row spread" style={{ alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="h2" style={{ fontSize: 15.5 }}>{r.name}</div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{r.site.type} · {r.site.city}</div>
                  </div>
                  <span className={`pill bg-${t.tone} s-${t.tone}`} style={{ fontSize: 10.5, flex: '0 0 auto' }}>{t.label}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: 10 }}>
                  <Meta k="Last inspection" v={fmtInsp(r.lastInsp)} />
                  <Meta k="Next due" v={r.nextDue ? `${fmtShort(r.nextDue.date)} · ${r.nextDue.days}d` : '—'} warn={r.nextDue && r.nextDue.days <= 30} />
                  <Meta k="Owner" v={r.owner} />
                  <Meta k="Open issues" v={String(r.open)} warn={r.open > 0} />
                </div>
                <div className="row spread" style={{ marginTop: 8, alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 11.5, color: TONE_HEX[tn] }}>
                    {r.site.compliance?.missing ? `${r.site.compliance.missing} compliance gap${r.site.compliance.missing > 1 ? 's' : ''}` : 'No compliance gaps'}
                  </span>
                  <span className="muted"><IconChevron size={18} /></span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Meta({ k, v, warn }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="label" style={{ color: 'var(--grey)', fontSize: 10 }}>{k}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: warn ? 'var(--red)' : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
    </div>
  )
}
