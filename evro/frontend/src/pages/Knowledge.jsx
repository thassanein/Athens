import { useMemo, useState } from 'react'
import { knowledgeCards, knowledgeByCategory, explain, knowledgeCard } from '../lib/model.js'
import { LevelToggle, useKnowledge } from '../components/Explain.jsx'

// Knowledge Layer (5B.4) — the glossary browser. Every EVRO term, metric, and
// formula in one searchable place, explained at the reader's chosen depth
// (beginner / practitioner / executive). View-only over knowledge_cards.

const CAT_LABEL = { value: 'Value', method: 'Method & scoring', finance: 'Finance', governance: 'Governance & control' }
const CAT_ORDER = ['value', 'method', 'finance', 'governance']

export default function Knowledge({ db }) {
  const { level } = useKnowledge()
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)

  const cards = knowledgeCards(db)
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim()
    if (!s) return cards
    return cards.filter((c) =>
      c.term.toLowerCase().includes(s) ||
      (c.aka || []).some((a) => a.toLowerCase().includes(s)) ||
      c.short.toLowerCase().includes(s) ||
      c.definition.toLowerCase().includes(s))
  }, [cards, q])

  const byCat = useMemo(() => {
    const out = {}
    for (const c of filtered) (out[c.category] ||= []).push(c)
    return out
  }, [filtered])

  return (
    <>
      <p className="page-intro">
        The <b>Knowledge Layer</b> — every term, metric, and formula EVRO uses, explained
        at your chosen depth. Hover any underlined term across the app for the same
        definitions; here you can browse and search them all.
      </p>

      <div className="card pad">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 10 }}>
          <h3>Glossary <span className="muted" style={{ fontWeight: 500 }}>· {cards.length} cards</span></h3>
          <span className="spacer" />
          <input className="k-search" placeholder="Search terms, formulas…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="label hide-sm" style={{ marginBottom: 0 }}>Explain as</span>
            <LevelToggle />
          </div>
        </div>
      </div>

      {CAT_ORDER.filter((cat) => byCat[cat]?.length).map((cat) => (
        <div key={cat} className="card pad section-gap">
          <div className="card-h"><h3>{CAT_LABEL[cat] || cat}</h3><span className="spacer" /><span className="badge b-grey">{byCat[cat].length}</span></div>
          <div className="k-grid">
            {byCat[cat].map((c) => {
              const open = openId === c.id
              return (
                <button key={c.id} className={`k-card ${open ? 'open' : ''}`} onClick={() => setOpenId(open ? null : c.id)}>
                  <div className="k-card-h">
                    <span className="k-term">{c.term}</span>
                    {c.aka?.length > 0 && <span className="k-aka">{c.aka.join(' · ')}</span>}
                  </div>
                  <div className="k-short">{explain(c, level)}</div>
                  {open && (
                    <div className="k-detail">
                      {c.formula && <div className="k-formula mono">{c.formula}</div>}
                      {c.example && <div className="k-example">e.g. {c.example}</div>}
                      {c.related?.length > 0 && (
                        <div className="k-related">
                          <span className="muted">Related:</span>
                          {c.related.map((rid) => { const r = knowledgeCard(db, rid); return r ? <span key={rid} className="badge b-navy">{r.term}</span> : null })}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="k-more">{open ? 'Hide' : 'Details'}</div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && <div className="card pad section-gap muted">No terms match “{q}”.</div>}
    </>
  )
}
