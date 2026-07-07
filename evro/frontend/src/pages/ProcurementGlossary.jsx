import { useMemo } from 'react'
import { glossary } from '../lib/procurement-glossary.js'
import { savingsByType, savingsUnderManagement, savingsVelocity } from '../lib/procurement.js'
import { PIPELINE_PHASES } from '../lib/procurement-window.js'
import { money, pct, num } from '../lib/format.js'

// The live confidence ladder, keyed to the five lifecycle phases.
const CONF_LADDER = [
  { phase: 'Pipeline', conf: 0.25, rule: 'Identified → qualified → business case. An idea sized against the AP-register baseline but not yet committed.' },
  { phase: 'Committed', conf: 0.5, rule: 'Approved → negotiation → awarded. Business case signed off; contracted but not yet delivering.' },
  { phase: 'In delivery', conf: 0.75, rule: 'Implementation → FP&A validation. The contract is rolling into operations and being validated.' },
  { phase: 'Realizing', conf: 1.0, rule: 'Validated savings flowing through the P&L run-rate, inside the 12-month measurement window.' },
  { phase: 'Banked', conf: 1.0, rule: 'Window complete — protected run-rate in sustainment.' },
]

// Where each headline number comes from — metric → formula → source of truth.
const LINEAGE = [
  { metric: 'Savings Under Management', formula: 'Σ each opportunity’s headline value at its lifecycle stage bucket', source: 'engine value objects (potential / committed / realized / sustained)' },
  { metric: 'Risk-adjusted value (RAV)', formula: 'gross annual value × phase confidence × realization factor', source: 'engine rav()' },
  { metric: 'Confidence', formula: 'phase ladder (25/50/75/100), value-weighted across the book', source: 'engine STAGE_CONFIDENCE' },
  { metric: 'Realized YTD', formula: 'Σ FP&A-validated monthly actuals this fiscal year', source: 'initiative.actuals (validated only)' },
  { metric: 'Committed', formula: 'negotiated value, or RAV, for opportunities approved & beyond', source: 'engine' },
  { metric: 'Velocity', formula: 'realized YTD ÷ elapsed fiscal months', source: 'engine (validated actuals)' },
  { metric: 'Leakage', formula: 'negotiated value − implemented run-rate (timing + structural)', source: 'engine leakageBreakdown()' },
  { metric: 'Impact by year', formula: 'annual run-rate spread month-by-month across the 12-month window', source: 'procurement-window impactByYear()' },
  { metric: '12-month window', formula: 'earliest validated actual (launch) + 12 months', source: 'procurement-window savingsWindow()' },
]

// Procurement Glossary & Methodology — the shared definitions surface: every
// expression, the eight savings types, each phase + its risks, the confidence
// ladder, the hard-savings vs cost-avoidance forecast split, and a line-by-line
// map of where every number comes from. One reference the whole enterprise reads.
export default function ProcurementGlossary({ db }) {
  const g = useMemo(() => glossary(), [])
  const byType = useMemo(() => savingsByType(db), [db])
  const sum = useMemo(() => savingsUnderManagement(db), [db])
  const vel = useMemo(() => savingsVelocity(db), [db])
  const pnl = byType.filter((t) => t.pnl)
  const soft = byType.filter((t) => !t.pnl)
  const pnlTotal = pnl.reduce((s, t) => s + t.value, 0)
  const softTotal = soft.reduce((s, t) => s + t.value, 0)
  return (
    <>
      <p className="page-intro">
        One shared language and methodology for EVRO Procurement — every expression defined with a concrete Athens example,
        every phase with its risks and confidence, the forecast rules that separate hard savings from cost avoidance, and a
        line-by-line map of where each number comes from. The same definitions surface on hover anywhere in the module.
      </p>

      {/* Confidence ladder by phase */}
      <div className="card pad">
        <div className="card-h"><h3>Confidence rules by phase</h3><span className="spacer" /><span className="badge b-green">live scoring model</span></div>
        <p className="tiny muted" style={{ marginTop: -2 }}>Every opportunity is risk-adjusted by the phase it sits in — the sourcing-funnel ladder. This is the live engine model; RAV = gross × this confidence × realization factor.</p>
        <div className="glo-ladder">
          {CONF_LADDER.map((c, i) => (
            <div key={c.phase} className="glo-rung">
              <div className="glo-rung-h"><span className="glo-phase-n mono">{i + 1}</span><b>{c.phase}</b><span className="glo-rung-pct mono">{pct(c.conf)}</span></div>
              <div className="glo-rung-bar"><div className="glo-rung-fill" style={{ width: `${c.conf * 100}%` }} /></div>
              <div className="tiny muted">{c.rule}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial forecast rules — hard savings vs cost avoidance */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Financial forecast rules</h3><span className="spacer" /><span className="badge b-grey">hard savings vs cost avoidance</span></div>
        <p className="tiny muted" style={{ marginTop: -2 }}>Two ledgers, forecast and reported separately so the P&amp;L number stays credible. Only hard savings lower the run-rate; avoidance is protected value, never added to the P&amp;L.</p>
        <div className="glo-ledgers">
          <div className="glo-ledger pnl">
            <div className="glo-ledger-h"><b>Hard savings — hits the P&amp;L</b><span className="mono">{money(pnlTotal)}</span></div>
            <ul>
              <li>Measured against the <b>FP&amp;A-validated baseline</b> (2025 AP-register run-rate).</li>
              <li>Forecast flows into the P&amp;L run-rate; counts toward the delivered number once validated.</li>
              <li>Types: {pnl.map((t) => t.label).join(', ')}.</li>
            </ul>
          </div>
          <div className="glo-ledger soft">
            <div className="glo-ledger-h"><b>Cost avoidance — reported apart</b><span className="mono">{money(softTotal)}</span></div>
            <ul>
              <li>Priced against a credible <b>would-have baseline</b> (quoted escalation, index movement).</li>
              <li>Forecast tracked separately; protects budget but does <b>not</b> reduce the P&amp;L run-rate.</li>
              <li>Types: {soft.map((t) => t.label).join(', ')}.</li>
            </ul>
          </div>
        </div>
        <div className="note section-gap"><span>Σ</span><span>Both ledgers reconcile into Savings Under Management ({money(sum.total)}); only {money(sum.lenses.realized)} is FP&amp;A-validated year-to-date, landing at {money(vel.perMonth)}/month.</span></div>
      </div>

      {/* Data lineage — where each number comes from */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Where each number comes from</h3><span className="spacer" /><span className="badge b-grey">deterministic · no fabricated numbers</span></div>
        <div className="table-wrap">
          <table className="tbl glo-lineage">
            <thead><tr><th>Metric</th><th>How it’s computed</th><th>Source of truth</th></tr></thead>
            <tbody>
              {LINEAGE.map((r) => (
                <tr key={r.metric}><td><b>{r.metric}</b></td><td className="tiny">{r.formula}</td><td className="tiny muted">{r.source}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny muted" style={{ marginTop: 8 }}>Every figure traces through an engine function to the one seeded data record — the dashboard, pipeline, workspace, briefs and evidence all reconcile to the dollar ({money(sum.total)} across {num(sum.count)} opportunities).</p>
      </div>

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
