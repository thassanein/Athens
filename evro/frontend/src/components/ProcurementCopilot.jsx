import { useState, useRef, useEffect } from 'react'
import { answer, SUGGESTIONS } from '../lib/procurement-copilot.js'
import { aiStatus, askEvroAI } from '../lib/ai.js'
import { IconAI, IconClose } from './Icons.jsx'

// ProcurementCopilot — a right-drawer you can interrogate. When the server has
// an Anthropic key (EVRO AI), free-text questions are answered by Claude,
// grounded ONLY on a snapshot of the portfolio (so it never invents a number).
// With no key it falls back to the deterministic engine — every answer still
// traces to the operating record. Ask about leakage, blockers, risk, decisions,
// a sourcing group, or what to do next.
export default function ProcurementCopilot({ open, onClose, db, navigate }) {
  const [thread, setThread] = useState([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [ai, setAi] = useState(null) // { enabled, model }
  const bodyRef = useRef(null)
  useEffect(() => { if (open && !ai) aiStatus().then(setAi) }, [open, ai])

  const ask = async (text) => {
    const t = (text ?? q).trim()
    if (!t || busy) return
    setQ(''); setBusy(true)
    setThread((th) => [...th, { q: t, a: null }]) // pending
    let a
    const res = await askEvroAI(db, t)
    if (res.ok) a = { title: 'EVRO AI', answer: res.answer, metrics: [], evidence: [], nav: null, ai: true, model: res.model }
    else a = { ...answer(db, t), ai: false } // deterministic fallback
    setThread((th) => th.map((turn, i) => (i === th.length - 1 ? { ...turn, a } : turn)))
    setBusy(false)
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
          <div><b>EVRO Procurement Copilot</b><div className="tiny muted">{ai?.enabled ? `EVRO AI · grounded on the live portfolio` : 'Deterministic · answers from the model with evidence'}</div></div>
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
              {t.a === null ? (
                <div className="pcp-a pcp-pending"><span className="pcp-dots"><i /><i /><i /></span> Thinking…</div>
              ) : (
                <div className="pcp-a">
                  <div className="pcp-a-t">{t.a.title}<span className={`pcp-badge ${t.a.ai ? 'is-ai' : ''}`}>{t.a.ai ? 'EVRO AI' : 'Evidence'}</span></div>
                  <div className="pcp-a-body" style={t.a.ai ? { whiteSpace: 'pre-wrap' } : undefined}>{t.a.answer}</div>
                  {t.a.metrics?.length > 0 && <div className="pcp-metrics">{t.a.metrics.map((mm, k) => <span key={k} className="pcp-metric"><b className="mono">{mm.value}</b><span>{mm.label}</span></span>)}</div>}
                  {t.a.evidence?.length > 0 && <div className="pcp-ev">{t.a.evidence.map((e, k) => <div key={k} className="pcp-ev-row"><span>{e.label}</span><b className="mono">{e.value}</b></div>)}</div>}
                  {t.a.nav && <button className="btn sm" onClick={() => { navigate(t.a.nav.page, t.a.nav.id ? { id: t.a.nav.id } : {}); onClose() }}>{t.a.nav.label} →</button>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pcp-suggest">{SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>)}</div>
        <div className="pcp-input">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="Ask the procurement copilot…" aria-label="Ask the procurement copilot" disabled={busy} />
          <button className="btn accent sm" onClick={() => ask()} disabled={!q.trim() || busy}>{busy ? '…' : 'Ask'}</button>
        </div>
      </aside>
    </>
  )
}
