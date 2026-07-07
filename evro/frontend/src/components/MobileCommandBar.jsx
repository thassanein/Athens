import { IconExec, IconCockpit, IconReport, IconAI, IconBolt, IconMenu } from './Icons.jsx'
import { allowedKeys } from './NavBar.jsx'

// Mobile Executive Command Bar (6D Wave 2) — the bottom command surface for
// the executive command DEVICE, not desktop-lite. Six one-handed targets in
// the brief's order: Home, Decisions, Brief, AI, Missions, More. Renders only
// at mobile widths (CSS), and only when no overlay is open (App passes
// `hidden`, so the fixed bar never paints over a drawer/modal). Page tabs are
// filtered by the same role gate every other nav surface uses — the bar can
// never reach a screen the sidebar and palette hide. Badges are live counts.
const TABS = [
  { key: 'home', label: 'Home', Icon: IconExec, always: true },
  { key: 'decisions', label: 'Decisions', Icon: IconCockpit, badge: 'decisions' },
  { key: 'brief', label: 'Brief', Icon: IconReport, always: true },
  { key: 'chief', label: 'AI', Icon: IconAI },
  { key: 'missions', label: 'Missions', Icon: IconBolt, badge: 'missions' },
  { key: 'more', label: 'More', Icon: IconMenu, always: true },
]

export default function MobileCommandBar({ page, homeKey, role, counts = {}, hidden = false, onNavigate, onBrief, onMore }) {
  if (hidden) return null
  const allowed = new Set(allowedKeys(role))
  const tabs = TABS.filter((t) => t.always || allowed.has(t.key))
  const activeFor = (k) => (k === 'home' ? page === homeKey : page === k)
  const go = (t) => {
    if (t.key === 'brief') return onBrief()
    if (t.key === 'more') return onMore()
    onNavigate(t.key === 'home' ? homeKey : t.key)
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
