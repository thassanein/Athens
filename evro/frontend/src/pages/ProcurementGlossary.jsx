import { useMemo } from 'react'
import { glossary } from '../lib/procurement-glossary.js'

// Procurement Glossary — the shared definitions surface: what every expression
// means, the eight savings types, and every project phase with a clear
// definition, its entry/exit and the risks that specifically matter in it, plus
// how risk is scored. One reference the whole enterprise reads from.
export default function ProcurementGlossary() {
  const g = useMemo(() => glossary(), [])
  return (
    <>
      <p className="page-intro">
        One shared language for EVRO Procurement. Every expression below is defined with a concrete Athens example; every
        project phase carries a definition and the risks that matter in it. The same definitions surface on hover anywhere in
        the module.
      </p>

      {/* project phases + per-phase risks */}
      <div className="card pad">
        <div className="card-h"><h3>Project phases &amp; the risks in each</h3><span className="spacer" /><span className="badge b-grey">source-to-contract → value</span></div>
        <div className="glo-phases">
          {g.phases.map((p, i) => (
            <div key={p.key} className="glo-phase">
              <div className="glo-phase-h">
                <span className="glo-phase-n mono">{i + 1}</span>
                <b>{p.label}</b>
                <span className="badge b-grey">{p.chainLabel}</span>
              </div>
              <div className="glo-phase-def">{p.gloss}</div>
              <div className="glo-phase-io"><span><b>In:</b> {p.entry}</span><span><b>Out:</b> {p.exit}</span></div>
              <ul className="glo-risks">{(p.risks || []).map((r, k) => <li key={k}>{r}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="note section-gap"><span>⚑</span><span>{g.riskScoring.definition} {g.riskScoring.bands.map((b) => <span key={b.band} className="badge" style={{ marginLeft: 6, background: 'color-mix(in srgb, ' + b.tone + ' 20%, transparent)', color: b.tone }}>{b.band} {b.range}</span>)}</span></div>
      </div>

      {/* savings types */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Savings definitions</h3><span className="spacer" /><span className="badge b-grey">one measure of savings</span></div>
        <div className="glo-types">
          {g.savingsTypes.map((t) => (
            <div key={t.key} className="glo-type">
              <div className="glo-type-h"><span className="glo-dot" style={{ background: t.accent }} /><b>{t.label}</b>{t.pnl && <span className="badge b-green" style={{ marginLeft: 6 }}>hits P&amp;L</span>}</div>
              <div className="glo-type-d">{t.definition}</div>
              <div className="glo-type-e"><i>e.g.</i> {t.example}</div>
            </div>
          ))}
        </div>
      </div>

      {/* expressions */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Expressions</h3><span className="spacer" /><span className="tiny muted">hover these anywhere in the module</span></div>
        <div className="glo-exprs">
          {g.expressions.map((e) => (
            <div key={e.term} className="glo-expr">
              <div className="glo-expr-t"><b>{e.term}</b>{e.aka && <span className="tiny muted"> · {e.aka}</span>}</div>
              <div className="glo-expr-d">{e.definition}</div>
              <div className="glo-expr-e"><i>e.g.</i> {e.example}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
