import { useEffect, useMemo, useRef, useState } from 'react'
import { rav, pendingApprovalsFor } from '../lib/engine.js'
import { exportBoardPacket } from '../lib/board-packet.js'
import { money } from '../lib/format.js'
import { IconSearch } from './Icons.jsx'

// Executive Command Layer — a universal command interface (⌘K / Ctrl-K).
// Run actions (approvals, optimization, reporting, companion/briefing, theme),
// navigate to any screen, or jump to any initiative / person / opportunity.
export default function CommandPalette({ open, onClose, screens, db, user, caps, navigate, openDrawer, dispatch, flash, onCompanion, onBriefing, toggleTheme }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)
  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30) } }, [open])

  const entries = useMemo(() => {
    const allow = new Set(screens.map((s) => s.key))
    const doApprove = async (i) => { const r = await dispatch?.('approveRequest', i.id, user.id); if (r && !r.error) flash?.(`Approved: ${i.title}`) }
    const exportPacket = async () => { try { const fn = await exportBoardPacket(db, { audience: 'board', period: 'fy', user }); flash?.(`Board packet exported — ${fn}`) } catch (e) { flash?.('Export failed — ' + (e?.message || 'unknown')) } }

    const cmd = []
    cmd.push({ cat: 'Command', badge: 'b-red', label: 'Ask the EVRO Companion', hint: 'Executive intelligence', run: () => onCompanion?.() })
    cmd.push({ cat: 'Command', badge: 'b-red', label: 'Open executive briefing', hint: 'Your morning briefing', run: () => onBriefing?.() })
    if (caps?.edit) cmd.push({ cat: 'Command', badge: 'b-red', label: 'New initiative', hint: 'Start intake', run: () => navigate('intake') })
    cmd.push({ cat: 'Command', badge: 'b-red', label: 'Toggle theme (dark / light)', hint: 'Appearance', run: () => toggleTheme?.() })
    if (allow.has('optimize')) cmd.push({ cat: 'Command', badge: 'b-navy', label: 'Optimize capital allocation', hint: 'Run the allocator', run: () => navigate('optimize') })
    if (allow.has('timeline')) cmd.push({ cat: 'Command', badge: 'b-navy', label: 'Play the enterprise timeline', hint: 'Longitudinal value', run: () => navigate('timeline') })
    if (allow.has('valuegraph')) cmd.push({ cat: 'Command', badge: 'b-navy', label: 'Open the enterprise value graph', hint: 'Relationships & concentration', run: () => navigate('valuegraph') })
    if (allow.has('reporting')) cmd.push({ cat: 'Command', badge: 'b-navy', label: 'Open reporting workspace', hint: 'Reporting', run: () => navigate('reporting') })
    cmd.push({ cat: 'Command', badge: 'b-navy', label: 'Export board packet (.pptx)', hint: 'Generate PowerPoint', run: exportPacket })

    const approvals = pendingApprovalsFor(db, user).slice(0, 8).map((i) => ({
      cat: 'Approve', badge: 'b-amber', label: `Approve: ${i.title}`, hint: `${money(i.gross_annual_value)} · one-click sign-off`, run: () => doApprove(i),
    }))
    const screenEntries = screens.map((s) => ({ cat: 'Navigate', badge: 'b-grey', label: s.label, hint: 'Go to screen', run: () => navigate(s.key) }))
    const initEntries = db.initiatives.map((i) => ({ cat: 'Initiative', badge: 'b-grey', label: i.title, hint: `${i.stage} · ${money(rav(i))}`, run: () => openDrawer(i.id) }))
    const peopleTo = allow.has('recognition') ? 'recognition' : allow.has('leaderboard') ? 'leaderboard' : null
    const peopleEntries = peopleTo ? db.people.map((p) => ({ cat: 'Person', badge: 'b-grey', label: p.name, hint: p.fn, run: () => navigate(peopleTo) })) : []
    const oppEntries = allow.has('opportunities') ? (db.opportunities || []).map((o) => ({ cat: 'Opportunity', badge: 'b-grey', label: o.title, hint: 'Opportunity', run: () => navigate('opportunities') })) : []
    return { cmd, approvals, rest: [...screenEntries, ...initEntries, ...peopleEntries, ...oppEntries] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screens, db, user, caps])

  const results = useMemo(() => {
    const all = [...entries.cmd, ...entries.approvals, ...entries.rest]
    const t = q.trim().toLowerCase()
    if (!t) return [...entries.cmd.slice(0, 7), ...entries.approvals.slice(0, 4), ...entries.rest.filter((e) => e.cat === 'Navigate').slice(0, 4)]
    return all.filter((e) => (e.label + ' ' + e.hint).toLowerCase().includes(t)).slice(0, 16)
  }, [q, entries])

  if (!open) return null
  const choose = async (e) => { if (!e) return; onClose(); await e.run?.() }
  const onKey = (ev) => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)) }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
    else if (ev.key === 'Enter') { ev.preventDefault(); choose(results[sel]) }
    else if (ev.key === 'Escape') onClose()
  }

  let lastCat = null
  return (
    <div className="palette-scrim" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <IconSearch />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0) }} onKeyDown={onKey}
            placeholder="Search or run a command…  (↑↓ move · ↵ run · esc)" />
          <span className="kbd">esc</span>
        </div>
        <div className="palette-list">
          {results.map((e, i) => {
            const header = e.cat !== lastCat ? e.cat : null
            lastCat = e.cat
            return (
              <div key={i}>
                {header && <div className="palette-cat">{header}</div>}
                <button className={`palette-item ${i === sel ? 'sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => choose(e)}>
                  <span className={`badge ${e.badge}`}>{e.cat === 'Command' ? 'Run' : e.cat === 'Approve' ? 'Approve' : e.cat === 'Navigate' ? 'Go' : e.cat}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{e.label}</span>
                  <span className="tiny muted">{e.hint}</span>
                </button>
              </div>
            )
          })}
          {results.length === 0 && <div className="muted" style={{ padding: 14 }}>No matches.</div>}
        </div>
      </div>
    </div>
  )
}
