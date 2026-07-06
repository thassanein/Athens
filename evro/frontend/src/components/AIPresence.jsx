import { useMemo, useState } from 'react'
import { aiPresence, PRESENCE_STATES } from '../lib/presence.js'
import { pct } from '../lib/format.js'
import { IconAI } from './Icons.jsx'

// AI Presence rail (6B item 8) — the persistent, glanceable proof that the
// agent team is on duty: six dots (the active one pulses), expanding to each
// agent's state, confidence and current reasoning. Collapsed state persists;
// hidden on small screens (the Chief of Staff page carries the full story).

const LS = 'evro.presence'

export default function AIPresence({ db, user, page, navigate }) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(LS) === 'open' } catch { return false } })
  const toggle = () => setOpen((o) => { try { localStorage.setItem(LS, o ? 'closed' : 'open') } catch { /* ignore */ } return !o })
  const p = useMemo(() => aiPresence(db, user, page), [db, user, page])

  return (
    <aside className={`aip ${open ? 'open' : ''}`} aria-label="AI presence">
      <button className="aip-head" onClick={toggle} aria-expanded={open} title="The agent team — live states and reasoning">
        <span className="aip-logo"><IconAI /></span>
        <span className="aip-dots" aria-hidden="true">
          {p.agents.map((a) => (
            <span key={a.key} className={`aip-dot ${a.state === 'active' ? 'fx-pulse' : ''}`} style={{ background: PRESENCE_STATES[a.state].tone }} />
          ))}
        </span>
        {open && <span className="aip-title">AI on duty · {p.lead.name} leads here</span>}
        <span className="aip-chev">{open ? '‹' : '›'}</span>
      </button>
      {open && (
        <div className="aip-body">
          {p.agents.map((a) => (
            <div key={a.key} className={`aip-agent ${a.state}`}>
              <span className="aip-a-dot" style={{ background: PRESENCE_STATES[a.state].tone }} />
              <div className="aip-a-main">
                <div className="aip-a-h">
                  <b>{a.name}</b>
                  <span className="aip-a-state" style={{ color: PRESENCE_STATES[a.state].tone }}>{PRESENCE_STATES[a.state].label}</span>
                  <span className="spacer" />
                  <span className="mono aip-a-conf" title={a.confNote}>{pct(a.confidence)}</span>
                </div>
                <div className="aip-a-r">{a.reasoning}</div>
              </div>
            </div>
          ))}
          <button className="aip-all" onClick={() => navigate('chief')}>Open the Chief of Staff →</button>
          <div className="aip-foot">deterministic · rules-based · every line computed from the portfolio</div>
        </div>
      )}
    </aside>
  )
}
