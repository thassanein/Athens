import { METHODOLOGY, STAGE_CONFIDENCE, STAGE_LABEL, MATERIALITY } from '../lib/engine.js'
import { money, pct } from '../lib/format.js'

export default function Methodology({ db }) {
  return (
    <>
      <p className="page-intro">How EVRO turns an idea into a validated, risk-adjusted, P&L-mapped dollar — and why it ranks by return instead of managing to a target.</p>

      <div className="note good section-gap"><span>◎</span><span><b>Return-maximization model.</b> There is no enterprise savings target and no avoidance target. Both pillars are fully tracked and ranked as sources of return — by Biggest Return (risk-adjusted value) and Best ROI (RAV ÷ effort).</span></div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Cost-value definitions</h3></div>
          {METHODOLOGY.definitions.map((d) => (
            <div key={d.key} className="kv" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 3 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><b>{d.term}</b><span className={`badge ${d.pillar === 'avoidance' ? 'b-navy' : 'b-green'}`}>{d.pillar === 'avoidance' ? 'Avoidance' : 'Savings'}</span></div>
              <code style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>{d.formula}</code>
              <span className="tiny muted">{d.note}</span>
            </div>
          ))}
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Sourcing best practices (McKinsey should-cost)</h3></div>
          {METHODOLOGY.practices.map((p) => (
            <div key={p.term} className="kv" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
              <b>{p.term}</b><span className="tiny muted">{p.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Stage-gate confidence</h3></div>
          {['idea', 'feasibility', 'capability', 'launch'].map((s) => (
            <div key={s} className="kv"><span className="k">{STAGE_LABEL[s]}</span><span className="v mono">{pct(STAGE_CONFIDENCE[s])}</span></div>
          ))}
          <p className="tiny muted section-gap"><b>Risk-Adjusted Value</b> = gross annual value × stage confidence × realization factor. Only FP&A-validated monthly actuals count as <b>Realized</b>.</p>
          <div className="kv"><span className="k">Materiality threshold (Steering approval to enter Launch)</span><span className="v mono">{money(MATERIALITY)}</span></div>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Forecast scenarios</h3></div>
          <div className="kv"><span className="k">Committed</span><span className="v">Launch (100%) + validated — the CFO floor</span></div>
          <div className="kv"><span className="k">Expected <span className="badge b-navy">headline</span></span><span className="v">Risk-adjusted across all stages</span></div>
          <div className="kv"><span className="k">Upside</span><span className="v">Gross value of Capability + Launch</span></div>
          <div className="divider" />
          <div className="card-h"><h3>Opportunity sizing</h3></div>
          <p className="tiny muted">Band = addressable group spend × savings %. Percentages live in a configurable table (seeded at 3% / 6%, <b>illustrative — pending Supply Chain / FP&A validation</b>) — never hardcoded. Attractiveness = size × ease ÷ risk.</p>
        </div>
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>Spend base (2025 AP register)</h3></div>
        <div className="kv"><span className="k">Addressable spend</span><span className="v mono">{money(db.meta.addressableTotal)} · 116 categories → 14 sourcing groups</span></div>
        <div className="kv"><span className="k">Non-addressable</span><span className="v mono">{money(db.meta.nonAddressableTotal)} · franchise fees, disposal pass-through, taxes, WC, pension</span></div>
        <p className="tiny muted section-gap">{db.meta.note}</p>
      </div>
    </>
  )
}
