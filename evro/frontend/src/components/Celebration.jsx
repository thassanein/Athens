import { useEffect } from 'react'
import { money } from '../lib/format.js'

// Celebration overlay (6B item 11) — executive-grade: one refined card, a
// quiet glow, the fact being celebrated and why it matters. No confetti.
// Auto-dismisses; reduced-motion renders it static.

export default function Celebration({ queue, onDismiss }) {
  const c = queue[0]
  useEffect(() => {
    if (!c) return undefined
    const t = setTimeout(onDismiss, 9000)
    return () => clearTimeout(t)
  }, [c, onDismiss])
  if (!c) return null

  return (
    <div className="cel-scrim" role="status" aria-live="polite" onClick={onDismiss}>
      <div className="cel-card fx-expand" style={{ '--fx-accent': 'var(--green)' }} onClick={(e) => e.stopPropagation()}>
        <span className="cel-icon fx-glow">{c.icon || '✓'}</span>
        <div className="cel-head">{c.headline}</div>
        <div className="cel-title">{c.title}</div>
        {c.value > 0 && <div className="cel-value mono">{money(c.value)}</div>}
        <div className="cel-detail">{c.detail}</div>
        <div className="cel-foot">
          {queue.length > 1 && <span className="muted" style={{ fontSize: 11 }}>+{queue.length - 1} more</span>}
          <span className="spacer" />
          <button className="btn sm" onClick={onDismiss}>Carry on</button>
        </div>
      </div>
    </div>
  )
}
