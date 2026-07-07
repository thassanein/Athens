import { useMemo, useState } from 'react'
import { narrative, narrativeScopes, narrativeText, downloadNarrative, printNarrative } from '../lib/procurement-narrative.js'
import { IconAI } from '../components/Icons.jsx'

// Auto-Drafted Briefs — one click turns the live operating record into a written
// executive brief or board narrative. Pick a scope (the whole book, a sourcing
// group, or a single opportunity) and EVRO drafts the memo deterministically:
// position, risk, decisions, recommendation — every sentence traceable, no LLM.
// Copy it, download it, or print to PDF.

export default function ProcurementBrief({ db, navigate, flash }) {
  const scopes = useMemo(() => narrativeScopes(db), [db])
  const [kind, setKind] = useState('book') // book | group | opportunity
  const [groupKey, setGroupKey] = useState(scopes.groups[0]?.key || '')
  const [oppKey, setOppKey] = useState(scopes.opps[0]?.key || '')

  const scope = kind === 'group' ? { type: 'group', key: groupKey }
    : kind === 'opportunity' ? { type: 'opportunity', key: oppKey }
      : { type: 'book' }
  const n = useMemo(() => narrative(db, scope), [db, kind, groupKey, oppKey])

  const copy = async () => {
    try { await navigator.clipboard.writeText(narrativeText(n)); flash?.('Brief copied to clipboard') }
    catch { flash?.('Copy failed — select and copy manually') }
  }
  const download = () => { const f = downloadNarrative(n); flash?.(`Downloaded ${f}`) }
  const print = () => { printNarrative(n) ? flash?.('Opening print view…') : flash?.('Pop-up blocked — allow pop-ups to print') }

  return (
    <>
      <p className="page-intro">
        One click drafts a written brief from the live record — no language model, no invented numbers. Every figure is a sum
        of the same value objects the dashboard reads, and every sentence traces to it. Choose a scope, then copy, download or
        print the memo.
      </p>

      <div className="brf-controls card pad">
        <div className="brf-scope" role="tablist" aria-label="Brief scope">
          {[['book', 'Whole book'], ['group', 'Sourcing group'], ['opportunity', 'Single opportunity']].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={kind === k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{label}</button>
          ))}
        </div>
        {kind === 'group' && (
          <select className="brf-select" value={groupKey} onChange={(e) => setGroupKey(e.target.value)} aria-label="Choose sourcing group">
            {scopes.groups.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        )}
        {kind === 'opportunity' && (
          <select className="brf-select" value={oppKey} onChange={(e) => setOppKey(e.target.value)} aria-label="Choose opportunity">
            {scopes.opps.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        )}
        <span className="spacer" />
        <div className="brf-actions">
          <button className="btn sm" onClick={copy}>⧉ Copy</button>
          <button className="btn sm" onClick={download}>⬇ .txt</button>
          <button className="btn sm accent" onClick={print}>⎙ Print / PDF</button>
        </div>
      </div>

      <article className="brf-memo card pad section-gap">
        <div className="brf-kind"><span className="agx-ic"><IconAI /></span> {n.kind} · auto-drafted</div>
        <h2 className="brf-title">{n.title}</h2>
        <div className="brf-dateline">{n.dateline}</div>

        <div className="brf-figs">
          {n.figures.map((f) => (
            <div key={f.label} className="brf-fig"><b className="mono">{f.value}</b><span>{f.label}</span></div>
          ))}
        </div>

        {n.sections.map((s) => (
          <section key={s.heading} className="brf-sec">
            <h3>{s.heading}</h3>
            {s.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </section>
        ))}

        <div className="brf-footer">{n.footer}</div>
      </article>

      <div className="brf-cta">
        <button className="btn ghost" onClick={() => navigate('procai')}>Structured briefs & AI intelligence →</button>
        <button className="btn ghost" onClick={() => navigate('savingspipeline')}>Open the Savings Pipeline →</button>
      </div>
    </>
  )
}
