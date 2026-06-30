import {
  IconExec, IconPortfolio, IconForecast, IconOpportunity, IconSpend,
  IconLeaderboard, IconReport, IconLeaf, IconBook, IconPlus, IconTeam, IconFolder,
} from './Icons.jsx'

const ICON = {
  exec: IconExec, department: IconTeam, mywork: IconFolder, portfolio: IconPortfolio,
  forecast: IconForecast, reporting: IconReport, opportunities: IconOpportunity,
  spend: IconSpend, leaderboard: IconLeaderboard, sustainability: IconLeaf, methodology: IconBook,
}

// items: [{ key, label }] already filtered to the current persona's role.
export default function NavBar({ page, navigate, onNew, showNew, items, roleLabel }) {
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
        {showNew && <button className="new-btn" onClick={onNew}><IconPlus /> New initiative</button>}
        <div className="group-label">{roleLabel} view</div>
        {items.map(({ key, label }) => {
          const Icon = ICON[key] || IconExec
          return (
            <button key={key} className={`navitem ${page === key ? 'active' : ''}`} onClick={() => navigate(key)}>
              <Icon /> {label}
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <div className="group-label">Return-maximization model</div>
        <div style={{ padding: '0 11px 12px', color: 'var(--grey-2)', fontSize: 11, lineHeight: 1.5 }}>
          No savings target. Initiatives &amp; opportunities ranked by risk-adjusted value and ROI.
        </div>
      </nav>
    </>
  )
}
