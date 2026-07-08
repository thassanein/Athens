import { useMemo, useState } from 'react'
import {
  savingsOpportunity, savingsOpportunities, savingsType, SAVINGS_LIFECYCLE, lifecycleIndex,
  lifecycleMeta, VALUE_CHAIN, decisionHistory, opportunityInsight,
} from '../lib/procurement.js'
import { categoryName, groupName, index } from '../lib/engine.js'
import { savingsWindow, MEASUREMENT_MONTHS } from '../lib/procurement-window.js'
import { money, pct, num, dateLabel } from '../lib/format.js'
import { IconBack, IconAI } from '../components/Icons.jsx'
import Term from '../components/Term.jsx'
import EvidenceDrawer from '../components/EvidenceDrawer.jsx'

// Opportunity Workspace (Phase One W4) — the single surface an executive opens
// to understand one savings opportunity end-to-end: where it is in the
// lifecycle, the business case, the money, the operational lift, the
// supplier/category, its risks and dependencies, the decision trail, the AI
// recommendation, and a board-ready summary. Every value is the same reusable
// object the dashboard rolls up (savingsOpportunity), so nothing here disagrees
// with the headline. Reuses the shared EvidenceDrawer for source drill-through.

function LifecycleTrack({ stage }) {
  const cur = lifecycleIndex(stage)
  const curChain = lifecycleMeta(stage).chain
  return (
    <div>
      {/* procurement value chain — the three phases the eleven stages roll into */}
      <div className="ows-chain" role="list" aria-label="Procurement value chain">
        {VALUE_CHAIN.map((c) => (
          <div key={c.key} className={`ows-chain-ph ${c.key === curChain ? 'active' : ''}`} role="listitem" title={c.gloss}>{c.label}</div>
        ))}
      </div>
      <div className="ows-track" role="list" aria-label="Savings lifecycle">
        {SAVINGS_LIFECYCLE.map((s, i) => {
          const state = i < cur ? 'done' : i === cur ? 'current' : 'todo'
          return (
            <div key={s.key} className={`ows-step ${state}`} role="listitem" title={s.gloss}>
              <span className="ows-step-dot" />
              <span className="ows-step-l">{s.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Field({ label, children, tone }) {
  return (
    <div className="ows-field">
      <div className="ows-field-l">{label}</div>
      <div className="ows-field-v" style={tone ? { color: tone } : undefined}>{children}</div>
    </div>
  )
}

export default function OpportunityWorkspace({ db, id, navigate }) {
  const raw = useMemo(() => (db.initiatives || []).find((i) => i.id === id), [db, id])
  const [evClaim, setEvClaim] = useState(null)

  const o = useMemo(() => (raw ? savingsOpportunity(db, raw) : null), [db, raw])
  const nameById = useMemo(() => Object.fromEntries(savingsOpportunities(db).map((x) => [x.id, x.name])), [db])
  const history = useMemo(() => (raw ? decisionHistory(db, raw) : []), [db, raw])
  const insight = useMemo(() => (raw ? opportunityInsight(db, raw) : null), [db, raw])

  if (!raw || !o) return (
    <div className="card pad"><p className="muted">Opportunity not found. <button className="linkbtn" onClick={() => navigate('procurement')}>Back to the dashboard →</button></p></div>
  )

  const st = savingsType(o.savingsType)
  const b = raw.baseline || {}
  const cat = raw.spend_category_id ? index(db) && categoryName(db, raw.spend_category_id) : null
  const catRec = (db.spend_categories || []).find((c) => c.id === raw.spend_category_id)
  const grp = (db.sourcing_groups || []).find((g) => g.id === raw.group_id)
  const recurringLines = (raw.benefit_lines || []).filter((l) => l.recurrence === 'recurring').length

  const openEvidence = () => setEvClaim({
    metric: { value: money(o.value.headline), label: `${o.stageLabel} value · ${st.label}` },
    text: `Evidence backing ${o.name}: baseline source, validation sign-offs and the approval trail behind ${money(o.value.headline)} at ${pct(o.confidence)} confidence.`,
    source: b.source_ref || 'Operating record',
    evidence: o.evidence.map((e) => ({ label: e.label, value: e.ref })),
    nav: { page: 'decisioncenter', label: 'Open the Decision Center' },
  })

  return (
    <>
      {/* mission-style header */}
      <div className="ows-head card pad">
        <button className="ows-back" onClick={() => navigate('procurement')} aria-label="Back to dashboard"><IconBack /></button>
        <div className="ows-head-main">
          <div className="ows-head-tags">
            <span className="badge" style={{ background: 'color-mix(in srgb, ' + st.accent + ' 22%, transparent)', color: st.accent }}>{st.label}</span>
            <span className="badge b-grey">{o.stageLabel}</span>
            <span className={`badge ${o.ragStatus === 'red' ? 'b-red' : o.ragStatus === 'amber' ? 'b-amber' : 'b-green'}`}>{o.ragStatus === 'red' ? 'At risk' : o.ragStatus === 'amber' ? 'Watch' : 'On track'}</span>
          </div>
          <h2 className="ows-title">{o.name}</h2>
          <div className="ows-head-facts">
            <Field label={o.value.bucket === 'realized' ? <Term name="Realized">Realized</Term> : <Term name="Run-rate">Annual run-rate</Term>}><span className="mono" style={{ color: 'var(--green)', fontSize: 18 }}>{money(o.value.headline)}{o.value.bucket !== 'realized' && <span className="pboard-yr">/yr</span>}</span></Field>
            <Field label={<Term name="Confidence">Confidence</Term>}><span className="mono">{pct(o.confidence)}</span></Field>
            <Field label={`Measurement (${MEASUREMENT_MONTHS}-mo)`}>{(() => {
              const w = savingsWindow(db, o)
              if (!w.launched) return <span className="tiny muted">pre-launch</span>
              if (w.graduated) return <span className="mono">banked</span>
              return <span className="mono">mo {w.monthsElapsed}/{MEASUREMENT_MONTHS}</span>
            })()}</Field>
            <Field label="Owner">{o.owner}</Field>
            <Field label="Sponsor">{o.sponsor}</Field>
          </div>
        </div>
        {o.nextDecision && (
          <div className="ows-nextdec">
            <div className="ows-nextdec-l">NEXT DECISION</div>
            <div className="ows-nextdec-t">{o.nextDecision.label}</div>
            <div className="tiny muted">{o.nextDecision.dueBy ? `due ${dateLabel(o.nextDecision.dueBy)}` : 'no date set'} · {money(o.nextDecision.expectedValue)} EV</div>
            <button className="btn accent sm" onClick={() => navigate('decisioncenter')}>Decide →</button>
          </div>
        )}
      </div>

      <LifecycleTrack stage={o.stage} />

      {/* board-ready executive summary */}
      <div className="ows-summary card pad section-gap">
        <div className="ows-tag">Board-ready summary · deterministic</div>
        <p>{o.name} is a <b>{st.label.toLowerCase()}</b> opportunity of <b>{money(o.value.potential)}</b> gross, currently <b>{o.stageLabel.toLowerCase()}</b> at {pct(o.confidence)} confidence under {o.owner} (sponsor {o.sponsor}).
        {o.value.realized > 0 ? <> {money(o.value.realized)} is already validated as realized.</> : o.contractValue ? <> A deal is contracted at {money(o.contractValue)}.</> : <> The value is identified and moving through the gates.</>}
        {' '}{o.nextDecision ? <>The next decision — <b>{o.nextDecision.label.toLowerCase()}</b>{o.nextDecision.missing.length ? ` — is waiting on ${o.nextDecision.missing.length} thing${o.nextDecision.missing.length === 1 ? '' : 's'} still to provide.` : ' — is ready to take.'}</> : 'It is in sustainment; protect the run-rate.'}</p>
        <button className="btn sm" onClick={openEvidence}>View evidence ({o.evidence.length}) →</button>
      </div>

      <div className="grid cols-2 section-gap">
        {/* business case */}
        <div className="card pad">
          <div className="card-h"><h3>Business case</h3></div>
          <div className="ows-fields">
            <Field label="Basis">{b.basis || '—'}</Field>
            <Field label="Formula">{b.formula || '—'}</Field>
            <Field label={b.reference_label || 'Reference'}><span className="mono">{b.reference != null ? money(b.reference) : '—'}</span></Field>
            <Field label={b.comparison_label || 'Comparison'}><span className="mono">{b.comparison != null ? money(b.comparison) : '—'}</span></Field>
            <Field label={<Term name="Baseline">Baseline amount</Term>}><span className="mono">{b.amount != null ? money(b.amount) : '—'}</span></Field>
            <Field label="Validated" tone={b.validated_by ? 'var(--green)' : 'var(--amber)'}>{b.validated_by ? `Yes · ${dateLabel(b.validated_at)}` : 'Pending FP&A'}</Field>
          </div>
          {b.source_ref && <div className="note section-gap"><span>📄</span><span>{b.source_ref}</span></div>}
        </div>

        {/* financial impact & forecast timing */}
        <div className="card pad">
          <div className="card-h"><h3>Financial impact &amp; forecast</h3></div>
          <div className="ows-fields">
            <Field label={<Term name="Identified">Potential (gross)</Term>}><span className="mono">{money(o.value.potential)}</span></Field>
            <Field label={<Term name="Committed">Committed</Term>}><span className="mono">{money(o.value.committed)}</span></Field>
            <Field label={<Term name="Realized">Realized YTD</Term>} tone="var(--green)"><span className="mono">{money(o.value.realized)}</span></Field>
            <Field label="Net annual"><span className="mono">{money(o.netAnnual)}</span></Field>
            <Field label="RA forecast (rest FY)"><span className="mono">{money(o.forecastImpact)}</span></Field>
            <Field label="Pending validation"><span className="mono">{money(o.pending)}</span></Field>
          </div>
          <p className="tiny muted section-gap">{recurringLines > 0 ? 'Recurring value — improves the run-rate.' : 'One-time value — does not lift the run-rate.'} Target close {o.targetClose ? dateLabel(o.targetClose) : '—'}.</p>
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        {/* operational impact & implementation */}
        <div className="card pad">
          <div className="card-h"><h3>Operational impact &amp; implementation</h3></div>
          <div className="ows-fields">
            <Field label="Approach">{raw.approach || '—'}</Field>
            <Field label="Business unit">{o.businessUnit || '—'}</Field>
            <Field label="Region">{o.region || '—'}</Field>
            <Field label="Yard">{raw.yard || '—'}</Field>
            <Field label="Effort"><span className="mono">{raw.effort_score ?? '—'}</span></Field>
            <Field label="Implementation cost"><span className="mono">{raw.implementation_cost != null ? money(raw.implementation_cost) : '—'}</span></Field>
          </div>
          <p className="tiny muted section-gap">{(raw.tasks || []).length} task{(raw.tasks || []).length === 1 ? '' : 's'} · {(raw.workstreams || []).length} workstream{(raw.workstreams || []).length === 1 ? '' : 's'} logged.</p>
        </div>

        {/* supplier / category */}
        <div className="card pad">
          <div className="card-h"><h3>Supplier &amp; category</h3></div>
          <div className="ows-fields">
            <Field label="Supplier / sourcing group">{grp ? grp.name : '—'}</Field>
            <Field label="Group spend"><span className="mono">{grp ? money(grp.spend) : '—'}</span></Field>
            <Field label="Group inflation">{grp && grp.inflation != null ? pct(grp.inflation) : '—'}</Field>
            <Field label="Spend category">{cat || '—'}</Field>
            <Field label="Category spend"><span className="mono">{catRec ? money(catRec.spend) : '—'}</span></Field>
            <Field label="Addressable"><span className="mono">{catRec ? money(catRec.addressable) : '—'}</span></Field>
          </div>
          {o.contractValue && <div className="note section-gap"><span>✎</span><span>Contracted at <b className="mono">{money(o.contractValue)}</b> negotiated value.</span></div>}
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        {/* dependencies & risks */}
        <div className="card pad ows-risks">
          <div className="card-h"><h3>Dependencies &amp; risks</h3></div>
          <div className="ows-deps">
            <div className="ows-deps-l">Blocked by</div>
            <div>{insight.dependencies.filter((d) => d.label === 'Blocked by').length
              ? insight.dependencies.filter((d) => d.label === 'Blocked by').map((d, i) => <span key={i} className="badge b-amber" style={{ marginRight: 6 }}>{nameById[d.value] || d.value}</span>)
              : <span className="muted tiny">none on the graph</span>}</div>
          </div>
          <div className="table-wrap section-gap">
            <table className="tbl">
              <thead><tr><th>Risk</th><th>Status</th><th className="num">Score</th></tr></thead>
              <tbody>
                {(o.risks || []).length === 0 ? <tr><td colSpan={3} className="muted">No risks logged.</td></tr> :
                  [...o.risks].sort((a, b) => b.score - a.score).map((r, i) => (
                    <tr key={i}>
                      <td style={{ textTransform: 'capitalize' }}>{r.category}{!r.countermeasure && r.score >= 15 && <span className="tiny" style={{ color: 'var(--red)' }}> · no countermeasure</span>}</td>
                      <td style={{ textTransform: 'capitalize' }}>{r.status}</td>
                      <td className="num"><span className={`badge ${r.score >= 15 ? 'b-red' : r.score >= 8 ? 'b-amber' : 'b-green'}`}>{r.score}</span></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* decision history & approval trail */}
        <div className="card pad">
          <div className="card-h"><h3>Decision history &amp; approval trail</h3></div>
          {history.length === 0 ? (
            <p className="muted" style={{ padding: '10px 2px' }}>No decisions recorded yet — the first gate is still ahead.</p>
          ) : (
            <div className="ows-timeline">
              {history.map((h, i) => (
                <div key={i} className={`ows-tl ${h.kind}`}>
                  <span className="ows-tl-dot" />
                  <div>
                    <div className="ows-tl-t"><b>{h.title}</b> <span className="badge b-grey">{h.detail}</span></div>
                    <div className="tiny muted">{dateLabel(h.at)} · {h.by}</div>
                    {h.rationale && <div className="tiny" style={{ marginTop: 2 }}>{h.rationale}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI insight — trust contract */}
      <div className="card pad section-gap ows-ai">
        <div className="card-h"><h3><span className="ows-ai-ic"><IconAI /></span> AI insight &amp; recommended action</h3><span className="spacer" /><span className="badge b-grey">rules-based · {pct(insight.confidence)} confidence</span></div>
        <p className="ows-ai-rec">{insight.recommendation}</p>
        <div className="grid cols-3">
          <div>
            <div className="ows-ai-h">Expected value</div>
            <div className="mono" style={{ fontSize: 18, color: 'var(--green)' }}>{money(insight.expected.value)}</div>
            <div className="tiny muted">{insight.expected.note}</div>
          </div>
          <div>
            <div className="ows-ai-h">Assumptions</div>
            <ul className="ows-ai-ul">{insight.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
          <div>
            <div className="ows-ai-h">Risks</div>
            <ul className="ows-ai-ul">{insight.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
        </div>
        <button className="btn sm section-gap" onClick={openEvidence}>Evidence ({o.evidence.length}) →</button>
      </div>

      <EvidenceDrawer claim={evClaim} onClose={() => setEvClaim(null)} navigate={navigate} />
    </>
  )
}
