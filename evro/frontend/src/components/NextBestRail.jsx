import { useState } from 'react'
import { missionQueue, MISSION_CLASSES } from '../lib/mission.js'
import { canApproveRoles, ROLE_APPROVE_LABEL } from '../lib/engine.js'
import { money } from '../lib/format.js'
import { IconBolt } from './Icons.jsx'

// Next Best Action engine (5B.6 item 7) — a persistent "what should I do
// next?" rail on the operating screens. Top missions for this user, ranked by
// value impact, each with a one-click action. Collapsed state persists.

const CLS = Object.fromEntries(MISSION_CLASSES.map((c) => [c.key, c]))
const LS = 'evro.nextrail'

export default function NextBestRail({ db, user, dispatch, navigate, flash }) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(LS) !== 'closed' } catch { return true } })
  const toggle = () => setOpen((o) => { try { localStorage.setItem(LS, o ? 'closed' : 'open') } catch { /* ignore */ } return !o })
  const q = missionQueue(db, user)
  const top = q.missions.slice(0, 3)

  const act = async (m) => {
    if (m.action === 'approve') {
      const i = db.initiatives.find((x) => x.id === m.refId)
      const roles = i ? canApproveRoles(user, i) : []
      const r = await dispatch('approveRequest', m.refId, user.id)
      if (!r?.error) flash(roles.length ? `Approved as ${roles.map((x) => ROLE_APPROVE_LABEL[x]).join(', ')}` : 'Approved')
    } else if (m.action === 'navigate') navigate(m.nav || 'valueoffice')
    else if (m.refId && String(m.refId).startsWith('i-')) navigate('initiative', { id: m.refId })
    else navigate('missions')
  }

  if (!top.length) return null
  return (
    <aside className={`nbr ${open ? 'open' : ''}`} aria-label="Next best actions">
      <button className="nbr-head" onClick={toggle} aria-expanded={open}>
        <IconBolt /> <span className="nbr-title">Do next</span>
        <span className="nbr-count">{q.missions.length}</span>
        <span className="nbr-chev">{open ? '›' : '‹'}</span>
      </button>
      {open && (
        <div className="nbr-body">
          {top.map((m, k) => {
            const c = CLS[m.cls]
            return (
              <div key={m.key} className="nbr-item" style={{ borderLeftColor: c.tone }}>
                <div className="nbr-item-t" onClick={() => act({ ...m, action: m.action === 'approve' ? 'open' : m.action })}>
                  <span className="nbr-rank mono">{k + 1}</span>{m.title}
                </div>
                <div className="nbr-item-m">
                  {m.value > 0 && <span className="mono nbr-val">{money(m.value)}</span>}
                  <span className="nbr-why">{m.why}</span>
                </div>
                <button className="btn sm" onClick={() => act(m)}>{m.action === 'approve' ? 'Approve' : m.action === 'navigate' ? 'View' : 'Open'}</button>
              </div>
            )
          })}
          <button className="nbr-all" onClick={() => navigate('missions')}>Full mission queue →</button>
        </div>
      )}
    </aside>
  )
}
