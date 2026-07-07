import { useState, useRef, useEffect } from 'react'
import { answer, SUGGESTIONS } from '../lib/procurement-copilot.js'
import { money } from '../lib/format.js'
import { IconAI, IconClose } from './Icons.jsx'

// ProcurementCopilot — a right-drawer you can interrogate. Every answer is
// computed deterministically from the model, with metrics, evidence and a
// jump-to link. No language model; ask it about leakage, blockers, risk,
// decisions, a sourcing group, or what to do next.
export default function ProcurementCopilot({ open, onClose, db, navigate }) {
  const [thread, setThread] = useState([])
  const [q, setQ] = useState('')
  const bodyRef = useRef(null)
  const ask = (text) => {
    const t = (text ?? q).trim()
    if (!t) return
    setThread((th) => [...th, { q: t, a: answer(db, t) }]); setQ('')
  }
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight }, [thread])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="drawer-scrim show" onClick={onClose} />
      <aside className="pcp" role="dialog" aria-modal="true" aria-label="Procurement copilot">
        <div className="pcp-head">
          <span className="agx-ic"><IconAI /></span>
          <div><b>EVRO Procurement Copilot</b><div className="tiny muted">Deterministic · answers from the model with evidence</div></div>
          <span className="spacer" />
          <button className="iconbtn" onClick={onClose} aria-label="Close copilot"><IconClose /></button>
        </div>

        <div className="pcp-body" ref={bodyRef}>
          {thread.length === 0 && (
            <div className="pcp-empty">Ask about the procurement book — leakage, blockers, risk, decisions, a sourcing group, or what to do next. Every answer traces to the operating record.</div>
          )}
          {thread.map((t, i) => (
            <div key={i} className="pcp-turn">
              <div className="pcp-q">{t.q}</div>
              <div className="pcp-a">
                <div className="pcp-a-t">{t.a.title}</div>
                <div className="pcp-a-body">{t.a.answer}</div>
                {t.a.metrics.length > 0 && <div className="pcp-metrics">{t.a.metrics.map((mm, k) => <span key={k} className="pcp-metric"><b className="mono">{mm.value}</b><span>{mm.label}</span></span>)}</div>}
                {t.a.evidence.length > 0 && <div className="pcp-ev">{t.a.evidence.map((e, k) => <div key={k} className="pcp-ev-row"><span>{e.label}</span><b className="mono">{e.value}</b></div>)}</div>}
                {t.a.nav && <button className="btn sm" onClick={() => { navigate(t.a.nav.page, t.a.nav.id ? { id: t.a.nav.id } : {}); onClose() }}>{t.a.nav.label} →</button>}
              </div>
            </div>
          ))}
        </div>

        <div className="pcp-suggest">{SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}</div>
        <div className="pcp-input">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="Ask the procurement copilot…" aria-label="Ask the procurement copilot" />
          <button className="btn accent sm" onClick={() => ask()} disabled={!q.trim()}>Ask</button>
        </div>
      </aside>
    </>
  )
}
