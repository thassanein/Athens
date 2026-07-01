import { IconMap, IconTasks, IconAlerts, IconProfile, IconPlus } from './Icons.jsx'

// Persistent bottom tab bar with a center Capture FAB.
// Map · Tasks · (Capture) · Alerts · Profile. Active = Athens Red.
export default function TabBar({ screen, setScreen, onCapture, alertBadge }) {
  const Tab = ({ id, label, icon }) => (
    <button
      className={`tab ${screen === id ? 'active' : ''}`}
      onClick={() => setScreen(id)}
      aria-current={screen === id ? 'page' : undefined}
    >
      <span style={{ position: 'relative' }}>
        {icon}
        {id === 'alerts' && alertBadge > 0 && <span className="badge">{alertBadge}</span>}
      </span>
      {label}
    </button>
  )

  return (
    <nav className="tabbar">
      <Tab id="map" label="Home" icon={<IconMap />} />
      <Tab id="tasks" label="Tasks" icon={<IconTasks />} />
      <button className="tab" onClick={onCapture} aria-label="Capture finding">
        <span className="fab">
          <IconPlus />
        </span>
      </button>
      <Tab id="alerts" label="Alerts" icon={<IconAlerts />} />
      <Tab id="profile" label="Profile" icon={<IconProfile />} />
    </nav>
  )
}
