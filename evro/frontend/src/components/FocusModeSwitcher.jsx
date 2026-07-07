import { FOCUS_MODES, focusMode } from '../lib/mission-focus.js'

// FocusModeSwitcher (6D Wave 5) — the executive seat selector. Picks a focus
// mode (CEO / CFO / COO / CHRO / Regional / BU / Program) that REORDERS and
// re-emphasises the same content; it never forks the product. Shows plainly
// what changes, so the switch is never a mystery. The chosen mode is
// remembered by Executive Memory (the parent persists it).
export default function FocusModeSwitcher({ value = 'ceo', onChange, lead }) {
  const m = focusMode(value)
  return (
    <div className="fms">
      <div className="fms-row">
        <span className="fms-l">Focus</span>
        <div className="seg fms-seg" role="group" aria-label="Executive focus mode">
          {FOCUS_MODES.map((f) => (
            <button key={f.key} className={value === f.key ? 'active' : ''} aria-pressed={value === f.key}
              onClick={() => onChange(f.key)} title={f.gloss}>{f.label}</button>
          ))}
        </div>
      </div>
      <div className="fms-what">
        <b>{m.label} · {m.gloss}.</b> {m.changes}{lead ? ` ${lead}.` : ''}
        <span className="fms-note"> Same missions — only the order changes.</span>
      </div>
    </div>
  )
}
