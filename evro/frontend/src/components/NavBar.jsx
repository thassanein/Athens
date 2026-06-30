import {
  IconExec, IconPortfolio, IconForecast, IconOpportunity, IconSpend,
  IconLeaderboard, IconReport, IconLeaf, IconBook, IconPlus,
} from './Icons.jsx'

const NAV = [
  { group: 'Dashboards', items: [
    ['exec', 'Executive', IconExec],
    ['portfolio', 'Portfolio', IconPortfolio],
    ['forecast', 'Forecast', IconForecast],
    ['reporting', 'Reporting', IconReport],
  ] },
  { group: 'Value engines', items: [
    ['opportunities', 'Opportunities', IconOpportunity],
    ['spend', 'Spend Explorer', IconSpend],
    ['leaderboard', 'Leaderboard', IconLeaderboard],
    ['sustainability', 'Sustainability', IconLeaf],
  ] },
  { group: 'Reference', items: [
    ['methodology', 'Methodology', IconBook],
  ] },
]

export default function NavBar({ page, navigate, onNew }) {
  return (
    <>
      <div className="brand">
        <div className="mark">
          <div className="logo">EV</div>
          <div>
            <div className="name">Athens EVRO</div>
            <div className="sub">Enterprise Value Realization Office</div>
          </div>
        </div>
      </div>
      <nav className="nav">
        <button className="new-btn" onClick={onNew}><IconPlus /> New initiative</button>
        {NAV.map((sec) => (
          <div key={sec.group}>
            <div className="group-label">{sec.group}</div>
            {sec.items.map(([key, label, Icon]) => (
              <button key={key} className={`navitem ${page === key ? 'active' : ''}`} onClick={() => navigate(key)}>
                <Icon /> {label}
              </button>
            ))}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="group-label">Return-maximization model</div>
        <div style={{ padding: '0 11px 12px', color: 'var(--grey-2)', fontSize: 11, lineHeight: 1.5 }}>
          No savings target. Initiatives & opportunities ranked by risk-adjusted value and ROI.
        </div>
      </nav>
    </>
  )
}
