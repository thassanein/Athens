import { IconExec, IconCockpit, IconReport, IconAI, IconBolt, IconMenu, IconPortfolio } from './Icons.jsx'
import { allowedKeys } from './NavBar.jsx'
import { procurementFirst } from '../lib/capabilities.js'

// Mobile Executive Command Bar (6D Wave 2; procurement-aware Phase One W7) —
// the bottom command surface for the executive command DEVICE, not desktop-lite.
// In Phase One (procurement-first) the five one-handed targets route to the
// procurement surfaces — Home (dashboard), Decisions, Pipeline, AI, More — with
// live decision + approval badges; otherwise the original enterprise tabs.
// Renders only at mobile widths (CSS), and only when no overlay is open.
const ENTERPRISE_TABS = [
  { key: 'home', label: 'Home', Icon: IconExec, always: true },
  { key: 'decisions', label: 'Decisions', Icon: IconCockpit, badge: 'decisions' },
  { key: 'brief', label: 'Brief', Icon: IconReport, always: true },
  { key: 'chief', label: 'AI', Icon: IconAI },
  { key: 'missions', label: 'Missions', Icon: IconBolt, badge: 'missions' },
  { key: 'more', label: 'More', Icon: IconMenu, always: true },
]
// The role-scoped procurement tabs (decisioncenter / savingspipeline) are NOT
// `always` — they fall through to the same allowedKeys(role) gate the enterprise
// tabs use, so the bar can never reach an ENTL screen an owner/procurement
// persona is not entitled to. `home` resolves to the procurement dashboard when
// the role can see it, otherwise the role's normal home.
const PROCUREMENT_TABS = [
  { key: 'home', label: 'Home', Icon: IconExec, always: true },
  { key: 'decisioncenter', label: 'Decisions', Icon: IconCockpit, badge: 'decisions' },
  { key: 'savingspipeline', label: 'Pipeline', Icon: IconPortfolio },
  { key: 'procai', label: 'AI', Icon: IconAI, badge: 'approvals', always: true },
  { key: 'more', label: 'More', Icon: IconMenu, always: true },
]

export default function MobileCommandBar({ page, homeKey, role, counts = {}, hidden = false, onNavigate, onBrief, onMore }) {
  if (hidden) return null
  const proc = procurementFirst()
  const allowed = new Set(allowedKeys(role))
  const tabs = (proc ? PROCUREMENT_TABS : ENTERPRISE_TABS).filter((t) => t.always || allowed.has(t.key))
  // in procurement mode Home leads with the Executive Dashboard when entitled
  const homeTarget = proc && allowed.has('procurement') ? 'procurement' : homeKey
  const activeFor = (k) => (k === 'home' ? page === homeTarget : page === k)
  const go = (t) => {
    if (t.key === 'brief') return onBrief()
    if (t.key === 'more') return onMore()
    onNavigate(t.key === 'home' ? homeTarget : t.key)
  }
  return (
    <nav className="mcbar" aria-label="Executive command bar" style={{ '--mcbar-cols': tabs.length }}>
      {tabs.map((t) => {
        const active = activeFor(t.key)
        const n = t.badge ? counts[t.badge] : 0
        return (
          <button key={t.key} className={`mcbar-tab ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => go(t)}>
            <span className="mcbar-ic"><t.Icon />{n > 0 && <span className="mcbar-badge" aria-hidden="true">{n > 9 ? '9+' : n}</span>}</span>
            <span className="mcbar-l">{t.label}</span>
            {n > 0 && <span className="sr-only">{n} {t.badge}</span>}
          </button>
        )
      })}
    </nav>
  )
}
