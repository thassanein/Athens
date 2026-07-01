import {
  IconExec, IconPortfolio, IconForecast, IconOpportunity, IconSpend, IconLeaderboard,
  IconReport, IconLeaf, IconBook, IconPlus, IconTeam, IconFolder, IconCockpit, IconMap,
  IconOptimize, IconScenarios, IconGraph, IconAI, IconHierarchy, IconBolt,
} from './Icons.jsx'

const ALL = ['exec', 'admin', 'fpna', 'leader', 'owner', 'procurement']
const ENT = ['exec', 'admin', 'fpna']           // enterprise
const ENTL = ['exec', 'admin', 'fpna', 'leader'] // enterprise + leader

// [key, label, Icon, roles]
export const NAV = [
  { group: 'Decisions', items: [
    ['cockpit', 'Decision Cockpit', IconCockpit, ENT],
    ['department', 'My Department', IconTeam, ['leader']],
    ['mywork', 'My Initiatives', IconFolder, ['owner', 'procurement']],
  ] },
  { group: 'Dashboards', items: [
    ['exec', 'Executive', IconExec, ENT],
    ['hierarchy', 'Portfolios', IconHierarchy, ENTL],
    ['portfolio', 'Initiatives', IconPortfolio, ENTL],
    ['forecast', 'Forecast', IconForecast, ALL],
    ['reporting', 'Reporting', IconReport, ENT],
  ] },
  { group: 'Value engines', items: [
    ['valuemap', 'Value Map', IconMap, ENTL],
    ['scenarios', 'Scenarios', IconScenarios, ENT],
    ['optimize', 'Capital Allocation', IconOptimize, ENT],
    ['realization', 'Value Realization', IconReport, ENTL],
    ['sustainment', 'Sustainment', IconForecast, ENTL],
    ['dependencies', 'Dependencies', IconGraph, ENTL],
    ['mining', 'AI Mining', IconAI, ENT],
    ['opportunities', 'Opportunities', IconOpportunity, ENT],
    ['spend', 'Spend Explorer', IconSpend, ALL],
  ] },
  { group: 'Engage', items: [
    ['movement', 'Value Movement', IconTeam, ALL],
    ['leaderboard', 'Leaderboard', IconLeaderboard, ALL],
    ['recognition', 'Recognition', IconBolt, ALL],
    ['sustainability', 'Sustainability', IconLeaf, ALL],
  ] },
  { group: 'Reference', items: [
    ['methodology', 'Methodology', IconBook, ALL],
  ] },
]

export const allowedKeys = (role) => NAV.flatMap((s) => s.items).filter(([, , , roles]) => roles.includes(role)).map(([k]) => k)
export const navScreens = (role) => NAV.flatMap((s) => s.items).filter(([, , , roles]) => roles.includes(role)).map(([key, label]) => ({ key, label }))

export default function NavBar({ page, navigate, onNew, showNew, role, roleLabel }) {
  return (
    <>
      <div className="brand">
        <div className="mark">
          <div className="logo">EV</div>
          <div>
            <div className="name">Athens EVRO</div>
            <div className="sub">Value Realization OS</div>
          </div>
        </div>
      </div>
      <nav className="nav">
        {showNew && <button className="new-btn" onClick={onNew}><IconPlus /> New initiative</button>}
        {NAV.map((sec) => {
          const items = sec.items.filter(([, , , roles]) => roles.includes(role))
          if (!items.length) return null
          return (
            <div key={sec.group}>
              <div className="group-label">{sec.group}</div>
              {items.map(([key, label, Icon]) => (
                <button key={key} className={`navitem ${page === key ? 'active' : ''}`} onClick={() => navigate(key)}>
                  <Icon /> {label}
                </button>
              ))}
            </div>
          )
        })}
        <div style={{ flex: 1, minHeight: 10 }} />
        <div style={{ padding: '0 11px 12px', color: 'var(--grey-2)', fontSize: 11, lineHeight: 1.5 }}>
          <b style={{ color: '#cfd6e0' }}>{roleLabel}</b> · return-maximization OS. No savings target.
        </div>
      </nav>
    </>
  )
}
