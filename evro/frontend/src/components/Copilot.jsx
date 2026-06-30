import { useState } from 'react'
import { copilotInsights, answerQuery } from '../lib/engine.js'
import { IconAI, IconClose, IconBolt } from './Icons.jsx'

// Persistent "Ask EVRO" copilot — rules-based (deterministic) insights + Q&A.
const KIND_CLASS = { summary: 'b-navy', approval: 'b-amber', leakage: 'b-red', opportunity: 'b-green', sustainment: 'b-red' }

export default function Copilot({ open, onClose, db, user, openDrawer }) {
  const [q, setQ] = useState('')
  const [ans, setAns] = useState(null)
  if (!open) return null
  const insights = copilotInsights(db, user)
  const ask = () => { if (q.trim()) setAns(answerQuery(db, user, q)) }
  const chip = (text) => { setQ(text); setAns(answerQuery(db, user, text)) }

  return (
    <>
      <div className="copilot-scrim" onClick={onClose} />
      <aside className="copilot" role="dialog" aria-label="Ask EVRO copilot">
        <div className="copilot-head">
          <span className="copilot-logo"><IconAI /></span>
          <div><b>Ask EVRO</b><div className="tiny muted">AI copilot · rules-based</div></div>
          <span className="spacer" />
          <button className="iconbtn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>
        <div className="copilot-body">
          <div className="copilot-ask">
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
              <div className="card-h"><h3 style={{ fontSize: 14 }}>{ans.title}</h3><span className="spacer" /><button className="btn sm" onClick={() => setAns(null)}>Insights ↺</button></div>
              <p style={{ fontSize: 13, margin: 0 }}>{ans.body}</p>
              {ans.bullets && <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5 }}>{ans.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
            </div>
          )}

          {!ans && (
            <div className="section-gap" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="label">Proactive insights</div>
              {insights.map((c, i) => (
                <div key={i} className="card pad" style={{ cursor: c.target ? 'pointer' : 'default' }} onClick={() => c.target && (openDrawer(c.target), onClose())}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <span className={`badge ${KIND_CLASS[c.kind] || 'b-grey'}`}>{c.kind}</span>
                    <b style={{ fontSize: 13 }}>{c.title}</b>
                  </div>
                  <p className="small" style={{ margin: 0, color: 'var(--grey)' }}>{c.body}</p>
                  {c.target && <div className="tiny" style={{ color: 'var(--navy)', marginTop: 4 }}><IconBolt /> open →</div>}
                </div>
              ))}
            </div>
          )}
          <p className="tiny muted section-gap">Deterministic copilot — answers are computed from the live portfolio, not a language model.</p>
        </div>
      </aside>
    </>
  )
}
