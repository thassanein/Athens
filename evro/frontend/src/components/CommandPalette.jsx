import { useEffect, useMemo, useRef, useState } from 'react'
import { rav } from '../lib/engine.js'
import { money } from '../lib/format.js'
import { IconSearch } from './Icons.jsx'

// Universal command palette (⌘K / Ctrl-K). Jump to any screen or initiative.
export default function CommandPalette({ open, onClose, screens, db, navigate, openDrawer }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30) } }, [open])

  const entries = useMemo(() => {
    const allow = new Set(screens.map((s) => s.key))
    const screenEntries = screens.map((s) => ({ type: 'screen', key: s.key, label: s.label, hint: 'Go to screen' }))
    const initEntries = db.initiatives.map((i) => ({ type: 'initiative', id: i.id, label: i.title, hint: `${i.stage} · ${money(rav(i))}` }))
    const peopleEntries = db.people.map((p) => ({ type: 'person', label: p.name, hint: p.fn, to: allow.has('recognition') ? 'recognition' : (allow.has('leaderboard') ? 'leaderboard' : null) }))
    const oppEntries = allow.has('opportunities')
      ? (db.opportunities || []).map((o) => ({ type: 'opportunity', label: o.title, hint: 'Opportunity', to: 'opportunities' }))
      : []
    return [...screenEntries, ...initEntries, ...peopleEntries, ...oppEntries]
  }, [screens, db])

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return entries.slice(0, 8)
    return entries.filter((e) => e.label.toLowerCase().includes(t)).slice(0, 12)
  }, [q, entries])

  if (!open) return null
  const choose = (e) => {
    if (!e) return
    if (e.type === 'screen') navigate(e.key)
    else openDrawer(e.id)
    onClose()
  }
  const onKey = (ev) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)) }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
    else if (ev.key === 'Enter') { ev.preventDefault(); choose(results[sel]) }
    else if (ev.key === 'Escape') onClose()
  }

  return (
    <div className="palette-scrim" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <IconSearch />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0) }} onKeyDown={onKey}
            placeholder="Search screens and initiatives…  (↑↓ to move, ↵ to open)" />
          <span className="kbd">esc</span>
        </div>
        <div className="palette-list">
          {results.map((e, i) => (
            <button key={`${e.type}-${e.id || e.key}`} className={`palette-item ${i === sel ? 'sel' : ''}`}
              onMouseEnter={() => setSel(i)} onClick={() => choose(e)}>
              <span className={`badge ${e.type === 'screen' ? 'b-navy' : 'b-grey'}`}>{e.type === 'screen' ? 'Go' : 'Init'}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{e.label}</span>
              <span className="tiny muted">{e.hint}</span>
            </button>
          ))}
          {results.length === 0 && <div className="muted" style={{ padding: 14 }}>No matches.</div>}
        </div>
      </div>
    </div>
  )
}
