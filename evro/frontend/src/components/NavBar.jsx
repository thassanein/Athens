import {
  IconExec, IconPortfolio, IconForecast, IconOpportunity, IconSpend, IconLeaderboard,
  IconReport, IconLeaf, IconBook, IconPlus, IconTeam, IconFolder, IconCockpit, IconMap,
  IconOptimize, IconScenarios, IconGraph, IconAI, IconHierarchy, IconBolt,
} from './Icons.jsx'
import { BrandMark } from './Brand.jsx'
import { PROCUREMENT_NAV, procurementFirst } from '../lib/capabilities.js'

const ALL = ['exec', 'admin', 'fpna', 'leader', 'owner', 'procurement']
const ENT = ['exec', 'admin', 'fpna']           // enterprise
const ENTL = ['exec', 'admin', 'fpna', 'leader'] // enterprise + leader

// [key, label, Icon, roles]
export const NAV = [
  { group: 'Decisions', items: [
    ['mission', 'Mission Control', IconCockpit, ENTL],
    ['intelligence', 'Intelligence', IconAI, ENTL],
    ['missions', 'Mission Queue', IconBolt, ENTL],
    ['decisions', 'Decisions', IconCockpit, ENTL],
    ['decisioncenter', 'Decision Center', IconCockpit, ENTL],
    ['narrative', 'Narrative', IconReport, ENTL],
    ['aitrust', 'AI Trust', IconAI, ALL],
    ['procai', 'Procurement AI', IconAI, ALL],
    ['wall', 'The Wall', IconOpportunity, ENTL],
    ['morning', 'Today', IconBolt, ALL],
    ['chief', 'Chief of Staff', IconAI, ALL],
    ['pulse', 'Enterprise Pulse', IconExec, ENTL],
    ['cockpit', 'Decision Cockpit', IconCockpit, ENT],
    ['department', 'My Department', IconTeam, ['leader']],
    ['mywork', 'My Initiatives', IconFolder, ['owner', 'procurement']],
  ] },
  { group: 'Dashboards', items: [
    ['procurement', 'Procurement Dashboard', IconExec, ENTL],
    ['valueoffice', 'Value Office', IconPortfolio, ENTL],
    ['accountability', 'Accountability', IconTeam, ENTL],
    ['exec', 'Executive', IconExec, ENT],
    ['hierarchy', 'Portfolios', IconHierarchy, ENTL],
    ['portfolio', 'Initiatives', IconPortfolio, ENTL],
    ['forecast', 'Forecast', IconForecast, ALL],
    ['timeline', 'Timeline', IconForecast, ENTL],
    ['reporting', 'Reporting', IconReport, ENT],
    ['governance', 'Governance', IconCockpit, ENTL],
  ] },
  { group: 'Value engines', items: [
    ['integrations', 'Integrations', IconGraph, ENTL],
    ['valuemap', 'Value Map', IconMap, ENTL],
    ['scenarios', 'Scenarios', IconScenarios, ENT],
    ['optimize', 'Capital Allocation', IconOptimize, ENT],
    ['savingspipeline', 'Savings Pipeline', IconPortfolio, ENTL],
    ['realization', 'Value Realization', IconReport, ENTL],
    ['sustainment', 'Sustainment', IconForecast, ENTL],
    ['dependencies', 'Dependencies', IconGraph, ENTL],
    ['valuegraph', 'Value Graph', IconGraph, ENTL],
    ['mining', 'AI Mining', IconAI, ENT],
    ['opportunities', 'Opportunities', IconOpportunity, ENT],
    ['spend', 'Spend Explorer', IconSpend, ALL],
  ] },
  { group: 'Engage', items: [
    ['movement', 'Value Movement', IconTeam, ALL],
    ['summit', 'Value Summit', IconLeaderboard, ALL],
    ['leaderboard', 'Leaderboard', IconLeaderboard, ALL],
    ['recognition', 'Recognition', IconBolt, ALL],
    ['sustainability', 'Sustainability', IconLeaf, ALL],
  ] },
  { group: 'Reference', items: [
    ['knowledge', 'Knowledge Layer', IconBook, ALL],
    ['methodology', 'Methodology', IconBook, ALL],
    ['brand', 'Brand', IconOpportunity, ALL],
    ['identity', 'Identity', IconOpportunity, ALL],
    ['identitylab', 'Identity Lab', IconOpportunity, ALL],
    ['settings', 'Settings', IconCockpit, ENT],
  ] },
]

// allowedKeys / navScreens intentionally span the FULL nav (never the curated
// procurement front door): route guards and the command palette must keep
// every page reachable even when the sidebar leads with procurement only.
export const allowedKeys = (role) => NAV.flatMap((s) => s.items).filter(([, , , roles]) => roles.includes(role)).map(([k]) => k)
export const navScreens = (role) => NAV.flatMap((s) => s.items).filter(([, , , roles]) => roles.includes(role)).map(([key, label]) => ({ key, label }))

export default function NavBar({ page, navigate, onNew, showNew, role, roleLabel, onBrand, disabled }) {
  const off = disabled || new Set()
  // Phase One: lead with the curated procurement front door. When a second
  // capability is switched on in Settings, fall back to the full enterprise nav.
  const procFirst = procurementFirst()
  const sections = procFirst ? PROCUREMENT_NAV : NAV
  return (
    <>
      <div className="brand">
        <button className="mark" onClick={onBrand} title="EVRO landing" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
          <BrandMark size={38} id="nvb" />
          <div>
            <div className="name">Athens EVRO</div>
            <div className="sub">{procFirst ? 'Procurement · first active capability' : 'Enterprise Intelligence OS'}</div>
          </div>
        </button>
      </div>
      <nav className="nav">
        {showNew && <button className="new-btn" onClick={onNew}><IconPlus /> New initiative</button>}
        {sections.map((sec) => {
          const items = sec.items.filter(([key, , , roles]) => roles.includes(role) && !off.has(key))
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
