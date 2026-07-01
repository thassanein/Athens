import { intelSummary } from '../lib/briefing.js'
import { IconAI, IconClose } from './Icons.jsx'

const TONE = { amber: 'var(--amber)', red: 'var(--red)', green: 'var(--green)' }

// Persistent, always-on executive intelligence bar — the AI-as-interface layer.
// Sits under the topbar on every screen; opens the morning briefing or the
// full copilot. Collapsible per session.
export default function IntelligenceBar({ db, user, onBriefing, onCopilot, openDrawer, collapsed, onToggle }) {
  const s = intelSummary(db, user)

  if (collapsed) {
    return (
      <button className="intel-bar collapsed" onClick={onToggle} title="Show executive intelligence">
        <span className="copilot-logo sm"><IconAI /></span>
        <span className="tiny" style={{ color: 'var(--grey)' }}>Intelligence · {s.count} decision{s.count === 1 ? '' : 's'}</span>
      </button>
    )
  }

  return (
    <div className="intel-bar">
      <span className="copilot-logo sm"><IconAI /></span>
      <div className="intel-pulse">
        {s.parts.map((p, i) => (
          <span key={i} className="intel-chip" style={{ color: TONE[p.tone] }}>
            <span className="dot" style={{ background: 'currentColor' }} />{p.text}
          </span>
        ))}
      </div>
      <span className="spacer" />
      {s.top && <button className="btn sm hide-sm" onClick={() => openDrawer(s.top.id)}>Top: {s.top.title.length > 26 ? s.top.title.slice(0, 25) + '…' : s.top.title}</button>}
      <button className="btn sm primary" onClick={onBriefing}>▸ My briefing</button>
      <button className="btn sm hide-sm" onClick={onCopilot}>Companion</button>
      <button className="iconbtn" onClick={onToggle} aria-label="Collapse intelligence bar" title="Collapse"><IconClose /></button>
    </div>
  )
}
