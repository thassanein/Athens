import { siteStats, siteTone, portfolioStats } from '../lib/derive.js'
import { IconChevron } from '../components/Icons.jsx'

const TONE_HEX = { fail: '#D5172A', open: '#B7791F', pass: '#1A5632' }

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

function StatTile({ label, value, tone }) {
  const color = tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : '#fff'
  return (
    <div
      style={{
        background: 'rgba(255,255,255,.07)',
        border: '1px solid rgba(255,255,255,.10)',
        borderRadius: 'var(--r-tile)',
        padding: '11px 12px',
        flex: 1,
      }}
    >
      <div className="stat-num" style={{ color }}>
        {value}
      </div>
      <div className="label" style={{ color: '#9FB0C4', marginTop: 5 }}>
        {label}
      </div>
    </div>
  )
}

export default function MapScreen({ data, onOpenSite }) {
  const stats = portfolioStats(data)
  const W = 408,
    H = 264 // matches the panel aspect so nothing is cropped
  const project = makeProjector(data, W, H)
  const names = Object.keys(data)
  // Anchor pin labels inward at the edges so they never clip the panel.
  const anchorFor = (x) => (x < 70 ? 'start' : x > W - 70 ? 'end' : 'middle')

  return (
    <div className="screen">
      <div className="header">
        <div className="muted" style={{ color: '#9FB0C4', fontSize: 13.5, fontWeight: 600 }}>
          Good morning, Dave
        </div>
        <div className="title" style={{ marginTop: 2 }}>
          Portfolio compliance
        </div>
        <div className="row gap" style={{ marginTop: 16 }}>
          <StatTile label="Open findings" value={stats.openFindings} tone="red" />
          <StatTile label="To verify" value={stats.toVerify} tone="amber" />
          <StatTile label="Due ≤30d" value={stats.due30} tone="navy" />
        </div>
      </div>

      {/* Regional map panel */}
      <div className="pad">
        <div
          className="card"
          style={{ height: 264, padding: 0, overflow: 'hidden', position: 'relative' }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="terr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#EFEADD" />
                <stop offset="1" stopColor="#E4E8DF" />
              </linearGradient>
            </defs>
            <rect width={W} height={H} fill="url(#terr)" />
            {/* stylized terrain / road lines */}
            <g stroke="#CFD6C9" strokeWidth="2" fill="none" opacity="0.8">
              <path d="M-10 70 Q120 40 260 90 T430 80" />
              <path d="M-10 150 Q140 120 280 165 T430 150" />
            </g>
            <g stroke="#C7CEDA" strokeWidth="3" fill="none" opacity="0.7">
              <path d="M60 -10 L120 120 L90 240" />
              <path d="M300 -10 L250 110 L330 240" />
            </g>
            {/* connecting hairlines from pins to a faint centroid */}
            {names.map((n) => {
              const p = project(data[n].lat, data[n].lng)
              return <circle key={'h' + n} cx={p.x} cy={p.y} r="22" fill="rgba(26,39,54,.04)" />
            })}
            {/* pins */}
            {names.map((n) => {
              const p = project(data[n].lat, data[n].lng)
              const tone = siteTone(data[n])
              const open = siteStats(data[n]).open
              return (
                <g key={n} onClick={() => onOpenSite(n)} style={{ cursor: 'pointer' }}>
                  <circle cx={p.x} cy={p.y} r="13" fill="#fff" />
                  <circle cx={p.x} cy={p.y} r="10" fill={TONE_HEX[tone]} />
                  <text
                    x={p.x}
                    y={p.y + 3.5}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#fff"
                  >
                    {open}
                  </text>
                  <text
                    x={p.x}
                    y={p.y + 27}
                    textAnchor={anchorFor(p.x)}
                    fontSize="9.5"
                    fontWeight="700"
                    fill="#1A2736"
                  >
                    {n.split(' ')[0]}
                  </text>
                </g>
              )
            })}
          </svg>
          {/* legend chip */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              background: 'rgba(255,255,255,.92)',
              borderRadius: 12,
              padding: '7px 10px',
              fontSize: 10.5,
              fontWeight: 700,
              display: 'flex',
              gap: 10,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <span style={{ color: 'var(--red)' }}>● At risk</span>
            <span style={{ color: 'var(--amber)' }}>● Open</span>
            <span style={{ color: 'var(--green)' }}>● Clear</span>
          </div>
        </div>
      </div>

      {/* All sites list */}
      <div className="pad">
        <div className="label" style={{ marginBottom: 8 }}>
          All sites
        </div>
        <div className="stack">
          {names.map((n) => {
            const s = siteStats(data[n])
            const tone = siteTone(data[n])
            return (
              <button
                key={n}
                className={`card lrow bd-${tone}`}
                onClick={() => onOpenSite(n)}
                style={{ width: '100%', textAlign: 'left', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <div style={{ flex: 1 }}>
                  <div className="h2" style={{ fontSize: 15.5 }}>
                    {n}
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {data[n].type} · {data[n].city}
                  </div>
                  {s.verify > 0 && (
                    <div className="s-verify" style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                      {s.verify} to verify
                    </div>
                  )}
                </div>
                <span className={`pill bg-${tone === 'fail' ? 'fail' : tone === 'open' ? 'open' : 'pass'} s-${tone === 'fail' ? 'fail' : tone === 'open' ? 'open' : 'pass'}`}>
                  {s.open} open
                </span>
                <span className="muted">
                  <IconChevron />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
