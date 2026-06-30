import { useState } from 'react'
import {
  rav, roi, realizedYTD, recurringRatio, forecastRemainderFY, pendingValue,
  implementedRunRate, valueLeakage, STAGES, GATE_STAGES, STAGE_LABEL, STAGE_CONFIDENCE,
  MATERIALITY, BENEFIT_LABEL, personName, categoryName, groupName, canSeeInitiative,
  approvalState, canApproveRoles, canRequestAdvance, nextStage, ROLE_APPROVE_LABEL,
  npv, paybackMonths, netAnnual, PROFILE_LABEL,
} from '../lib/engine.js'
import { money, pct, monthLabel, dateLabel } from '../lib/format.js'
import { StagePip, PillarBadge, RagBadge, Avatar } from '../components/ui.jsx'
import { IconBack } from '../components/Icons.jsx'

export default function Initiative({ db, id, caps, user, dispatch, navigate, flash, home = 'exec', embedded = false }) {
  const i = db.initiatives.find((x) => x.id === id)
  if (!i) return <button className="btn" onClick={() => navigate(home)}><IconBack /> Back</button>
  if (!canSeeInitiative(user, i)) {
    return (
      <div className="card pad" style={{ maxWidth: 520 }}>
        <h3>No access</h3>
        <p className="muted">This initiative isn't in your scope. Initiative owners see only their own initiatives; function leaders see their department's.</p>
        <button className="btn primary" onClick={() => navigate(home)}><IconBack /> Back</button>
      </div>
    )
  }

  const realized = realizedYTD(i, db)
  const leak = valueLeakage(i, db)
  const recur = recurringRatio(i)
  const fyMonths = db.meta.fyMonths
  const nowMonth = db.meta.now.slice(0, 7)

  const reqState = approvalState(i)
  const myRoles = canApproveRoles(user, i)
  const reqInfo = canRequestAdvance(user, i, caps)
  const requestAdv = async () => { const r = await dispatch('requestGate', i.id, user.id); if (!r.error) flash('Advancement requested — awaiting approvals') }
  const approve = async () => { const r = await dispatch('approveRequest', i.id, user.id); if (!r.error) flash('Approved') }
  const reject = async () => { const r = await dispatch('rejectRequest', i.id, user.id, 'Returned for rework'); if (!r.error) flash('Returned for rework') }

  return (
    <>
      {!embedded && <button className="btn no-print" onClick={() => navigate(home)}><IconBack /> Back</button>}

      <div className="card pad section-gap">
        <div className="card-h" style={{ alignItems: 'flex-start', flexWrap: 'wrap', rowGap: 8 }}>
          <div>
            <h2 style={{ fontSize: 19 }}>{i.title}</h2>
            <div className="chip-row" style={{ marginTop: 8 }}>
              <PillarBadge pillar={i.pillar} benefit={i.benefit_type} />
              {i.stage === 'proposed' ? <span className="badge b-amber">Proposed — awaiting approval</span> : <StagePip stage={i.stage} />}
              {i.request && i.stage !== 'proposed' && <span className="badge b-amber">Advancement pending</span>}
              <RagBadge rag={i.status_rag} />
              {i.kr_link && <span className="badge b-grey">↳ {i.kr_link}</span>}
              {i.opportunity_id && <span className="badge b-red">From opportunity</span>}
              {i.approach && <span className="badge b-navy">{i.approach}</span>}
            </div>
          </div>
          <span className="spacer" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Avatar name={personName(db, i.owner_id)} />
            <div><div className="tiny label" style={{ marginBottom: 0 }}>Owner</div><b>{personName(db, i.owner_id)}</b></div>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 4 }}>{i.description}</p>
        <div className="tiny muted">{groupName(db, i.group_id)} · {categoryName(db, i.spend_category_id)} · started {dateLabel(i.start_date)} · target close {dateLabel(i.target_close)}</div>
      </div>

      {/* value + baseline */}
      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Value</h3><span className="spacer" /><span className="tiny muted">confidence {pct(STAGE_CONFIDENCE[i.stage])}{i.realization_factor < 1 ? ` × ${pct(i.realization_factor)} realization` : ''}</span></div>
          <div className="kv"><span className="k">Gross annual value</span><span className="v mono">{money(i.gross_annual_value)}</span></div>
          <div className="kv"><span className="k">Risk-adjusted value (RAV)</span><span className="v mono" style={{ color: 'var(--navy)' }}>{money(rav(i))}</span></div>
          <div className="kv"><span className="k">Realized YTD (validated)</span><span className="v mono" style={{ color: 'var(--green)' }}>{money(realized)}</span></div>
          {pendingValue(i) > 0 && <div className="kv"><span className="k">Pending validation</span><span className="v mono" style={{ color: 'var(--amber)' }}>{money(pendingValue(i))}</span></div>}
          <div className="kv"><span className="k">Risk-adjusted forecast (rest of FY)</span><span className="v mono">{money(forecastRemainderFY(i, db))}</span></div>
          <div className="kv"><span className="k">Net recurring (run-rate)</span><span className="v mono">{money(netAnnual(i))}</span></div>
          <div className="kv"><span className="k">Effort · ROI · Recurring</span><span className="v mono">{i.effort_score} · {money(roi(i))} · {pct(recur)}</span></div>
          <div className="divider" />
          <div className="label">Capital case</div>
          <div className="kv"><span className="k">Implementation cost</span><span className="v mono">{money(i.implementation_cost || 0)}</span></div>
          <div className="kv"><span className="k">Payback</span><span className="v mono">{paybackMonths(i) ? paybackMonths(i).toFixed(1) + ' mo' : '—'}</span></div>
          <div className="kv"><span className="k">NPV ({db.meta.npvHorizonYears}-yr @ {pct(db.meta.discountRate)})</span><span className="v mono" style={{ color: npv(i, db) >= 0 ? 'var(--green)' : 'var(--red)' }}>{money(npv(i, db))}</span></div>
          <div className="kv"><span className="k">Forecast profile</span><span className="v">{PROFILE_LABEL[i.profile] || 'Linear'}</span></div>
          {i.realization_factor < 1 && <div className="note section-gap"><span>⚑</span><span>At-risk Launch: a realization factor of {pct(i.realization_factor)} reduces recognized value (transparent haircut).</span></div>}
        </div>

        <div className="card pad">
          <div className="card-h"><h3>Baseline</h3><span className="spacer" />{i.baseline.validated_by
            ? <span className="badge b-green">✓ FP&A validated</span>
            : <span className="badge b-amber">Unvalidated</span>}</div>
          {i.baseline.formula && (
            <>
              <div className="kv"><span className="k">{i.baseline.reference_label || 'Reference'}</span><span className="v mono">{money(i.baseline.reference)}</span></div>
              <div className="kv"><span className="k">− {i.baseline.comparison_label || 'Comparison'}</span><span className="v mono">{money(i.baseline.comparison)}</span></div>
              <div className="kv"><span className="k"><b>= Benefit ({i.baseline.formula})</b></span><span className="v mono"><b>{money(i.gross_annual_value)}</b></span></div>
            </>
          )}
          <div className="kv"><span className="k">Basis</span><span className="v">{i.baseline.basis === 'forecast' ? 'Forecast (avoidance)' : 'Run-rate (savings)'}</span></div>
          <div className="kv"><span className="k">Source</span><span className="v tiny" style={{ fontWeight: 600 }}>{i.baseline.source_ref || '—'}</span></div>
          {i.baseline.validated_by
            ? <div className="tiny muted section-gap">Validated by {personName(db, i.baseline.validated_by)} on {dateLabel(i.baseline.validated_at)}.</div>
            : caps.validate
              ? <button className="btn go sm section-gap" onClick={async () => { await dispatch('validateBaseline', i.id, user.id); flash('Baseline validated') }}>Validate baseline (FP&A)</button>
              : <div className="note info section-gap"><span>ℹ︎</span><span>Only FP&A can validate the baseline.</span></div>}

          {i.negotiated_value != null && (
            <div className="section-gap">
              <div className="divider" />
              <div className="label">Implemented vs negotiated</div>
              <div className="kv"><span className="k">Negotiated annual value</span><span className="v mono">{money(i.negotiated_value)}</span></div>
              <div className="kv"><span className="k">Implemented run-rate</span><span className="v mono">{money(implementedRunRate(i, db))}</span></div>
              <div className="kv"><span className="k">Value leakage</span><span className="v mono" style={{ color: leak > 0 ? 'var(--red)' : 'var(--green)' }}>{money(leak)}</span></div>
              <p className="tiny muted">A negotiated discount only saves money if real volume flows through the new contract.</p>
            </div>
          )}
        </div>
      </div>

      {/* stage gates + approval workflow */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Stage-gate tracker</h3><span className="spacer" /><span className="tiny muted">Every phase change needs line manager + FP&A · Launch ≥ {money(MATERIALITY)} also needs Steering</span></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
          {GATE_STAGES.map((s) => {
            const cur = STAGES.indexOf(i.stage)
            const state = STAGES.indexOf(s) < cur || i.stage === 'closed' ? 'done' : STAGES.indexOf(s) === cur ? 'current' : 'todo'
            return (
              <div key={s} style={{ flex: '1 1 120px', minWidth: 120, padding: 11, borderRadius: 10, border: '1px solid var(--line)',
                background: state === 'done' ? 'var(--tint-green)' : state === 'current' ? 'var(--tint-navy)' : '#fff' }}>
                <div className="tiny label" style={{ marginBottom: 2 }}>{pct(STAGE_CONFIDENCE[s])}</div>
                <b>{STAGE_LABEL[s]}</b>
                <div className="tiny muted">{state === 'done' ? '✓ passed' : state === 'current' ? '● current' : 'pending'}</div>
              </div>
            )
          })}
        </div>

        <div className="section-gap">
          {reqState ? (
            <div className="card pad" style={{ background: 'var(--tint-amber)', borderColor: '#f0e2c0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <b>{reqState.kind === 'intake' ? 'New-project approval' : `Advancement to ${STAGE_LABEL[reqState.to_stage]}`}</b>
                <span className="tiny muted">requested by {personName(db, i.request.requested_by)}</span>
              </div>
              <div className="chip-row" style={{ marginTop: 8 }}>
                {reqState.need.map((role) => {
                  const ap = reqState.approvals.find((a) => a.role === role)
                  return <span key={role} className={`badge ${ap ? 'b-green' : 'b-grey'}`}>{ap ? '✓ ' : '○ '}{ROLE_APPROVE_LABEL[role]}{ap ? ` · ${personName(db, ap.by)}` : ' · pending'}</span>
                })}
              </div>
              {myRoles.length > 0 ? (
                <div className="btn-row section-gap">
                  <button className="btn go sm" onClick={approve}>Approve as {myRoles.map((r) => ROLE_APPROVE_LABEL[r]).join(' + ')}</button>
                  <button className="btn sm" onClick={reject}>Return for rework</button>
                </div>
              ) : (
                <div className="tiny muted section-gap">Awaiting {reqState.remaining.map((r) => ROLE_APPROVE_LABEL[r]).join(' + ')}. You aren't an approver for this request.</div>
              )}
            </div>
          ) : nextStage(i) ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn primary" disabled={!reqInfo.ok} onClick={requestAdv}>Request advancement to {STAGE_LABEL[nextStage(i)]} →</button>
              {reqInfo.reason && <span className="tiny" style={{ color: 'var(--red)' }}>{reqInfo.reason}</span>}
              {!caps.edit && <span className="tiny muted">Read-only persona — owners request advancement.</span>}
              {caps.edit && reqInfo.ok && <span className="tiny muted">Sends to line manager + FP&A{nextStage(i) === 'launch' && i.gross_annual_value >= MATERIALITY ? ' + Steering' : ''} for sign-off.</span>}
            </div>
          ) : <span className="muted">Initiative is at its final stage.</span>}
        </div>
      </div>

      {/* benefit lines (P&L) */}
      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Benefit lines (P&L mapping)</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>P&L line</th><th>Recurrence</th><th className="num">Annual</th></tr></thead>
              <tbody>
                {i.benefit_lines.map((b, k) => (
                  <tr key={k}><td>{b.pnl_line === 'cogs' ? 'COGS' : 'OpEx'}</td><td style={{ textTransform: 'capitalize' }}>{b.recurrence.replace('_', '-')}</td><td className="num mono">{money(b.annual_amount)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Contributors</h3></div>
          {i.contributions.map((c) => (
            <div key={c.user_id} className="kv"><span className="k" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={personName(db, c.user_id)} /> {personName(db, c.user_id)}</span><span className="v">{c.credit_pct}%</span></div>
          ))}
          <p className="tiny muted section-gap">Split attribution credits the leaderboard without double-counting the enterprise total.</p>
        </div>
      </div>

      <Actuals i={i} db={db} caps={caps} user={user} dispatch={dispatch} flash={flash} fyMonths={fyMonths} nowMonth={nowMonth} />
      <Risks i={i} db={db} caps={caps} user={user} dispatch={dispatch} flash={flash} />

      {/* validation history / audit */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Validation &amp; audit history</h3></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>When</th><th>Type</th><th>Decision</th><th>Actor</th><th>Note</th></tr></thead>
            <tbody>
              {i.validations.map((v, k) => (
                <tr key={k}><td className="nowrap">{dateLabel(v.decided_at)}</td><td style={{ textTransform: 'capitalize' }}>{v.type}</td>
                  <td><span className={`badge ${v.decision === 'approved' ? 'b-green' : v.decision === 'rejected' ? 'b-red' : 'b-amber'}`}>{v.decision}</span></td>
                  <td>{personName(db, v.actor_id)}</td><td className="tiny">{v.note}</td></tr>
              ))}
              {i.validations.length === 0 && <tr><td colSpan="5" className="muted">No validation events yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function Actuals({ i, db, caps, user, dispatch, flash, fyMonths, nowMonth }) {
  const [period, setPeriod] = useState(fyMonths.find((m) => m.slice(0, 7) <= nowMonth) || fyMonths[0])
  const [amt, setAmt] = useState('')
  const monthly = i.gross_annual_value / 12
  const byPeriod = Object.fromEntries(i.actuals.map((a) => [a.period.slice(0, 7), a]))
  const add = async () => {
    if (!amt) return
    await dispatch('addActual', i.id, period.slice(0, 7) + '-01', Number(amt), user.id)
    setAmt(''); flash('Actual recorded — pending FP&A validation')
  }
  return (
    <div className="card pad section-gap">
      <div className="card-h"><h3>Monthly actuals vs forecast</h3><span className="spacer" /><span className="tiny muted">Only validated actuals count as Realized</span></div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Month</th><th className="num">Forecast (RA/12)</th><th className="num">Actual</th><th>Status</th>{caps.validate && <th></th>}</tr></thead>
          <tbody>
            {fyMonths.map((m) => {
              const mk = m.slice(0, 7); const a = byPeriod[mk]; const past = mk <= nowMonth
              return (
                <tr key={mk}>
                  <td>{monthLabel(mk)}</td>
                  <td className="num mono muted">{money((rav(i) / 12))}</td>
                  <td className="num mono">{a ? money(a.realized_amount) : (past ? '—' : '')}</td>
                  <td>{a ? (a.validated ? <span className="badge b-green">Validated</span> : <span className="badge b-amber">Pending</span>) : (past ? <span className="tiny muted">no entry</span> : <span className="tiny muted">future</span>)}</td>
                  {caps.validate && <td>{a && !a.validated && <button className="btn go sm" onClick={async () => { await dispatch('validateActual', i.id, a.period, user.id); flash('Validated') }}>Validate</button>}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {caps.edit && (
        <div className="section-gap" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label><div className="label">Month</div>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input" style={{ width: 130 }}>
              {fyMonths.map((m) => <option key={m} value={m}>{monthLabel(m.slice(0, 7))}</option>)}
            </select>
          </label>
          <label><div className="label">Actual ($)</div><input className="input" style={{ width: 150 }} value={amt} onChange={(e) => setAmt(e.target.value)} placeholder={String(Math.round(monthly))} /></label>
          <button className="btn" onClick={add}>Record actual</button>
        </div>
      )}
    </div>
  )
}

function Risks({ i, db, caps, user, dispatch, flash }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ category: 'execution', likelihood: 3, impact: 3, countermeasure: '' })
  const score = Number(form.likelihood) * Number(form.impact)
  const add = async () => {
    if (score >= 15 && !form.countermeasure.trim()) return flash('High risk requires a countermeasure.')
    await dispatch('addRisk', i.id, form, user.id); setOpen(false); setForm({ category: 'execution', likelihood: 3, impact: 3, countermeasure: '' }); flash('Risk raised')
  }
  return (
    <div className="card pad section-gap">
      <div className="card-h"><h3>Risk register</h3><span className="spacer" />{caps.edit && <button className="btn sm" onClick={() => setOpen((o) => !o)}>{open ? 'Cancel' : '+ Raise risk'}</button>}</div>
      {open && (
        <div className="card pad" style={{ background: 'var(--bg)', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label><div className="label">Category</div><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{['execution', 'financial', 'data', 'adoption', 'external'].map((c) => <option key={c}>{c}</option>)}</select></label>
            <label><div className="label">Likelihood</div><select className="input" value={form.likelihood} onChange={(e) => setForm({ ...form, likelihood: e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
            <label><div className="label">Impact</div><select className="input" value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
            <span className={`badge ${score >= 15 ? 'b-red' : score >= 8 ? 'b-amber' : 'b-green'}`} style={{ alignSelf: 'center' }}>score {score}</span>
          </div>
          <label style={{ display: 'block', marginTop: 10 }}><div className="label">Countermeasure {score >= 15 && <span style={{ color: 'var(--red)' }}>(required for High)</span>}</div><input className="input" value={form.countermeasure} onChange={(e) => setForm({ ...form, countermeasure: e.target.value })} /></label>
          <button className="btn primary sm section-gap" onClick={add}>Add risk</button>
        </div>
      )}
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Category</th><th className="num">L</th><th className="num">I</th><th className="num">Score</th><th>Status</th><th>Countermeasure</th></tr></thead>
          <tbody>
            {i.risks.map((r, k) => (
              <tr key={k}><td style={{ textTransform: 'capitalize' }}>{r.category}</td><td className="num">{r.likelihood}</td><td className="num">{r.impact}</td>
                <td className="num"><span className={`badge ${r.score >= 15 ? 'b-red' : r.score >= 8 ? 'b-amber' : 'b-green'}`}>{r.score}</span></td>
                <td style={{ textTransform: 'capitalize' }}>{r.status}</td><td className="tiny">{r.countermeasure || (r.score >= 15 ? <span style={{ color: 'var(--red)' }}>needs countermeasure</span> : '—')}</td></tr>
            ))}
            {i.risks.length === 0 && <tr><td colSpan="6" className="muted">No risks logged.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
