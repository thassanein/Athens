import { useMemo, useState } from 'react'
import { procurementActions } from '../lib/procurement.js'
import { money, pct } from '../lib/format.js'
import { IconAI } from './Icons.jsx'

// AgentActions — the always-on "next best actions" surface. Each EVRO agent
// watches one failure mode (leakage, decisions, risk, approvals, evidence) and
// pushes the highest-value move with its confidence and evidence. Deterministic
// and rules-based; click an action to jump straight to where it's taken.
export default function AgentActions({ db, navigate }) {
  const actions = useMemo(() => procurementActions(db), [db])
  const [open, setOpen] = useState(null)
  if (!actions.length) return null
  return (
    <div className="agx card pad section-gap">
      <div className="card-h">
        <h3><span className="agx-ic"><IconAI /></span> Next best actions</h3>
        <span className="tiny muted" style={{ marginLeft: 8 }}>EVRO agents · always on · rules-based</span>
        <span className="spacer" />
        <span className="badge b-grey">{actions.length} live</span>
      </div>
      <div className="agx-list">
        {actions.map((a) => (
          <div key={a.key} className={`agx-item ${open === a.key ? 'open' : ''}`}>
            <div className="agx-main">
              <div className="agx-agent">{a.agent}<span className="agx-conf">{pct(a.confidence)} conf</span></div>
              <div className="agx-title">{a.title}</div>
              <div className="agx-detail">{a.detail}</div>
            </div>
            <div className="agx-side">
              <div className="agx-val mono">{money(a.value)}</div>
              <div className="agx-actions">
                <button className="btn sm" onClick={() => navigate(a.nav.page, a.nav.id ? { id: a.nav.id } : {})}>{a.cta} →</button>
                <button className="linkbtn tiny" onClick={() => setOpen(open === a.key ? null : a.key)} aria-expanded={open === a.key}>{open === a.key ? 'Hide evidence' : `Evidence (${a.evidence.length})`}</button>
              </div>
            </div>
            {open === a.key && (
              <div className="agx-ev">
                {a.evidence.map((e, i) => <div key={i} className="agx-ev-row"><span>{e.label}</span><b className="mono">{e.value}</b></div>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
