import { useEffect, useState } from 'react'
import { answerQuery } from '../lib/engine.js'
import { companionBrief, OPERATING_MODES, defaultModeFor } from '../lib/companion.js'
import { money } from '../lib/format.js'
import { IconAI, IconClose, IconBolt } from './Icons.jsx'

// EVRO Companion — persistent executive intelligence. Persona-framed proactive
// brief (recommendations / risks / decisions / opportunities) + deterministic,
// rules-based Q&A. No language model; every answer is computed from the portfolio.
const KIND_CLASS = { reco: 'b-navy', decision: 'b-amber', risk: 'b-red', opp: 'b-green', sustain: 'b-red' }

export default function Copilot({ open, onClose, db, user, openDrawer, navigate }) {
  const [q, setQ] = useState('')
  const [ans, setAns] = useState(null)
  const [mode, setMode] = useState(defaultModeFor(user.role))
  useEffect(() => { setMode(defaultModeFor(user.role)) }, [user.role])
  if (!open) return null
  const b = companionBrief(db, user, mode)
  const ask = () => { if (q.trim()) setAns(answerQuery(db, user, q)) }
  const chip = (text) => { setQ(text); setAns(answerQuery(db, user, text)) }
  const go = (id, nav) => { if (id) { openDrawer(id); onClose() } else if (nav && navigate) { navigate(nav); onClose() } }

  return (
    <>
      <div className="copilot-scrim" onClick={onClose} />
      <aside className="copilot" role="dialog" aria-label="EVRO Companion">
        <div className="copilot-head">
          <span className="copilot-logo"><IconAI /></span>
          <div><b>EVRO Companion</b><div className="tiny muted">Executive intelligence · rules-based</div></div>
          <span className="spacer" />
          <button className="iconbtn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>
        <div className="copilot-body">
          {/* persona-framed brief header */}
          <div className="companion-brief">
            <div className="tiny" style={{ opacity: 0.9, fontWeight: 700 }}>{b.greeting}</div>
            <div className="companion-metric mono">{b.metric.value}</div>
            <div className="tiny muted">{b.metric.label}</div>
          </div>
          <div className="seg companion-seg">
            {OPERATING_MODES.map((m) => <button key={m.key} className={mode === m.key ? 'active' : ''} onClick={() => setMode(m.key)} title={m.blurb}>{m.label}</button>)}
          </div>

          <div className="copilot-ask section-gap">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="Ask about forecast, leakage, approvals…" />
            <button className="btn primary sm" onClick={ask}>Ask</button>
          </div>
          <div className="chip-row" style={{ marginTop: 8 }}>
            {['Summary', 'Forecast', 'Leakage', 'Approvals', 'Opportunities', 'Capital'].map((c) => (
              <button key={c} className="badge b-grey" style={{ cursor: 'pointer' }} onClick={() => chip(c)}>{c}</button>
            ))}
          </div>

          {ans && (
            <div className="card pad section-gap" style={{ borderLeft: '3px solid var(--navy)' }}>
              <div className="card-h"><h3 style={{ fontSize: 14 }}>{ans.title}</h3><span className="spacer" /><button className="btn sm" onClick={() => setAns(null)}>Brief ↺</button></div>
              <p style={{ fontSize: 13, margin: 0 }}>{ans.body}</p>
              {ans.bullets && <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5 }}>{ans.bullets.map((x, i) => <li key={i}>{x}</li>)}</ul>}
            </div>
          )}

          {!ans && b.sections.map((sec) => (
            <div key={sec.kind} className="section-gap">
              <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={`badge ${sec.badge}`} style={{ padding: '1px 7px' }}>{sec.items.length}</span> {sec.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 6 }}>
                {sec.items.slice(0, 4).map((it, i) => (
                  <button key={i} className="reco-row" onClick={() => go(it.id, sec.nav)}>
                    <span className={`badge ${KIND_CLASS[sec.kind] || 'b-grey'}`} style={{ flex: 'none' }}>{sec.kind}</span>
                    <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      <b style={{ fontSize: 12.5 }}>{it.label}</b>
                      {it.hint && <div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.hint}</div>}
                    </div>
                    {it.value != null && <span className="mono tiny" style={{ fontWeight: 700 }}>{money(it.value)}</span>}
                    <span style={{ color: 'var(--navy)' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <p className="tiny muted section-gap"><IconBolt /> Deterministic companion — answers and priorities are computed from the live portfolio, not a language model. The lens reframes emphasis for you; it never changes permissions.</p>
        </div>
      </aside>
    </>
  )
}
