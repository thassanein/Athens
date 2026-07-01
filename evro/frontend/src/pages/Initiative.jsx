import { useState } from 'react'
import {
  rav, roi, realizedYTD, recurringRatio, forecastRemainderFY, pendingValue,
  implementedRunRate, valueLeakage, STAGES, GATE_STAGES, STAGE_LABEL, STAGE_CONFIDENCE,
  MATERIALITY, BENEFIT_LABEL, personName, categoryName, groupName, canSeeInitiative,
  approvalState, canApproveRoles, canRequestAdvance, nextStage, ROLE_APPROVE_LABEL,
  npv, paybackMonths, netAnnual, PROFILE_LABEL,
} from '../lib/engine.js'
import { initiativeHealth, HEALTH_DIMS } from '../lib/health.js'
import { money, pct, monthLabel, dateLabel } from '../lib/format.js'
import { StagePip, PillarBadge, RagBadge, Avatar } from '../components/ui.jsx'
import { Radar } from '../components/Charts.jsx'
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

  const [pane, setPane] = useState('financials')
  const openTaskCount = (i.tasks || []).filter((t) => t.status === 'open').length

  // 6-dimension health radar (current + forecast overlay) + benefits waterfall.
  const conf = STAGE_CONFIDENCE[i.stage]
  const health = initiativeHealth(i, db)
  const radarAxes = HEALTH_DIMS.map((k) => ({ label: k, value: health.current[k] }))
  const radarOverlay = HEALTH_DIMS.map((k) => health.forecast[k])
  const gross = i.gross_annual_value
  const benefitSteps = [
    { label: 'Gross annual', value: gross, kind: 'base' },
    { label: 'Stage confidence', delta: gross * conf - gross },
    { label: 'Realization', delta: rav(i) - gross * conf },
    { label: 'Risk-adjusted value', value: rav(i), kind: 'total' },
  ]

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
        <div className="ws-kpis">
          <KPI label="Gross annual" value={money(i.gross_annual_value)} />
          <KPI label="Risk-adjusted" value={money(rav(i))} tone="navy" />
          <KPI label="Realized YTD" value={money(realized)} tone="green" />
          <KPI label={`NPV ${db.meta.npvHorizonYears}-yr`} value={money(npv(i, db))} tone={npv(i, db) >= 0 ? 'green' : 'red'} />
          <KPI label="Payback" value={paybackMonths(i) ? paybackMonths(i).toFixed(1) + ' mo' : '—'} />
        </div>
      </div>

      <div className="ws-tabs no-print">
        {[['timeline', 'Timeline'], ['financials', 'Financials'], ['collaboration', 'Collaboration']].map(([k, lbl]) => (
          <button key={k} className={pane === k ? 'active' : ''} onClick={() => setPane(k)}>
            {lbl}{k === 'collaboration' && openTaskCount > 0 && <span className="ws-pill">{openTaskCount}</span>}
          </button>
        ))}
      </div>

      {pane === 'financials' && <>
      {/* health radar + benefits waterfall */}
      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Initiative health</h3><span className="spacer" /><span className={`badge ${health.overall >= 0.75 ? 'b-green' : health.overall >= 0.5 ? 'b-amber' : 'b-red'}`}>{pct(health.overall)} overall</span></div>
          <Radar axes={radarAxes} overlay={radarOverlay} />
          <p className="tiny muted section-gap">Six execution dimensions — financial, implementation, technology, adoption, governance, sustainment. Solid = today; dashed = forecast as it matures. Derived from stage, realization, risk, validation and delivery signals.</p>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Benefits waterfall</h3><span className="spacer" /><span className="tiny muted">gross → risk-adjusted</span></div>
          <BenefitBridge steps={benefitSteps} />
          <p className="tiny muted section-gap">How gross annual value is haircut by stage confidence and realization to reach risk-adjusted value (RAV).</p>
        </div>
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

      {/* benefit lines + contributors */}
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
      </>}

      {pane === 'timeline' && <>
      {/* stage gates + approval workflow */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Stage-gate tracker</h3><span className="spacer" /><span className="tiny muted">Every phase change needs line manager + FP&A · Launch ≥ {money(MATERIALITY)} also needs Steering</span></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
          {GATE_STAGES.map((s) => {
            const cur = STAGES.indexOf(i.stage)
            const state = STAGES.indexOf(s) < cur || i.stage === 'closed' ? 'done' : STAGES.indexOf(s) === cur ? 'current' : 'todo'
            return (
              <div key={s} style={{ flex: '1 1 120px', minWidth: 120, padding: 11, borderRadius: 10, border: '1px solid var(--line)',
                background: state === 'done' ? 'var(--tint-green)' : state === 'current' ? 'var(--tint-navy)' : 'var(--card)' }}>
                <div className="tiny label" style={{ marginBottom: 2 }}>{pct(STAGE_CONFIDENCE[s])}</div>
                <b>{STAGE_LABEL[s]}</b>
                <div className="tiny muted">{state === 'done' ? '✓ passed' : state === 'current' ? '● current' : 'pending'}</div>
              </div>
            )
          })}
        </div>

        <div className="section-gap">
          {reqState ? (
            <div className="card pad" style={{ background: 'var(--tint-amber)', borderColor: 'var(--line)' }}>
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

      <Actuals i={i} db={db} caps={caps} user={user} dispatch={dispatch} flash={flash} fyMonths={fyMonths} nowMonth={nowMonth} />
      <Risks i={i} db={db} caps={caps} user={user} dispatch={dispatch} flash={flash} />
      </>}

      {pane === 'collaboration' && <Collaboration i={i} db={db} caps={caps} user={user} dispatch={dispatch} flash={flash} />}
    </>
  )
}

// Benefits waterfall — horizontal bridge from gross to risk-adjusted value.
function BenefitBridge({ steps }) {
  const max = Math.max(...steps.map((s) => (s.kind ? s.value : 0)), 1)
  let running = 0
  return (
    <div className="bridge">
      {steps.map((s, k) => {
        if (s.kind) {
          running = s.value
          const w = (s.value / max) * 100
          return (
            <div key={k} className="bridge-row">
              <span className="bridge-lbl"><b>{s.label}</b></span>
              <div className="bridge-track"><i style={{ left: 0, width: `${w}%`, background: s.kind === 'total' ? 'var(--green)' : 'var(--navy)' }} /></div>
              <span className="bridge-val mono"><b>{money(s.value)}</b></span>
            </div>
          )
        }
        const start = running
        running += s.delta
        const up = s.delta >= 0
        const left = (Math.min(start, running) / max) * 100
        const w = (Math.abs(s.delta) / max) * 100
        return (
          <div key={k} className="bridge-row">
            <span className="bridge-lbl muted">{s.label}</span>
            <div className="bridge-track"><i style={{ left: `${left}%`, width: `${Math.max(w, 0.4)}%`, background: up ? 'var(--green)' : 'var(--red)' }} /></div>
            <span className="bridge-val mono" style={{ color: up ? 'var(--green)' : 'var(--red)' }}>{s.delta === 0 ? '—' : `${up ? '+' : ''}${money(s.delta)}`}</span>
          </div>
        )
      })}
    </div>
  )
}

// Compact KPI tile for the workspace header strip.
function KPI({ label, value, tone }) {
  const c = { navy: 'var(--navy)', green: 'var(--green)', red: 'var(--red)' }[tone]
  return (
    <div className="ws-kpi">
      <div className="tiny label" style={{ marginBottom: 2 }}>{label}</div>
      <div className="mono" style={{ fontSize: 17, fontWeight: 800, color: c }}>{value}</div>
    </div>
  )
}

// Render free text with @mentions highlighted.
function withMentions(text, db) {
  const parts = String(text).split(/(@[A-Za-z][A-Za-z.]*)/g)
  return parts.map((p, k) => {
    if (p[0] === '@') {
      const person = db.people.find((x) => x.name.split(' ')[0].toLowerCase() === p.slice(1).toLowerCase())
      if (person) return <span key={k} className="mention" title={person.name}>@{person.name.split(' ')[0]}</span>
    }
    return <span key={k}>{p}</span>
  })
}

const ATT_ICON = { doc: '📄', sheet: '📊', image: '🖼️', link: '🔗' }

// Collaboration workspace — discussion + tasks + attachments + decision log.
function Collaboration({ i, db, caps, user, dispatch, flash }) {
  const [text, setText] = useState('')
  const [task, setTask] = useState('')
  const [assignee, setAssignee] = useState(i.owner_id)
  const [attName, setAttName] = useState('')
  const [attKind, setAttKind] = useState('doc')
  const comments = i.comments || []
  const tasks = i.tasks || []
  const attachments = i.attachments || []

  const post = async () => { if (!text.trim()) return; await dispatch('addComment', i.id, text, user.id); setText(''); flash('Comment posted') }
  const addTask = async () => { if (!task.trim()) return; await dispatch('addTask', i.id, task, assignee, user.id); setTask(''); flash('Task added') }
  const toggle = async (tid) => { await dispatch('toggleTask', i.id, tid, user.id) }
  const attach = async () => { if (!attName.trim()) return; await dispatch('addAttachment', i.id, { name: attName, kind: attKind }, user.id); setAttName(''); flash('Attachment added') }

  // Decision log: validation events + workflow approvals, newest first.
  const log = []
  for (const v of i.validations || []) log.push({ ts: v.decided_at, who: personName(db, v.actor_id), kind: v.type, decision: v.decision, note: v.note })
  if (i.request) for (const a of i.request.approvals || []) log.push({ ts: a.at, who: personName(db, a.by), kind: 'approval', decision: ROLE_APPROVE_LABEL[a.role] || a.role, note: 'Signed off advancement.' })
  log.sort((a, b) => String(b.ts).localeCompare(String(a.ts)))

  return (
    <div className="card pad section-gap">
      <div className="card-h"><h3>Collaboration</h3><span className="spacer" /><span className="tiny muted">discussion · tasks · files · decisions</span></div>
      <div className="ws-grid">
        <div>
          {/* discussion */}
          <div className="label">Discussion</div>
          {caps.edit && (
            <div className="copilot-ask section-gap" style={{ marginTop: 6 }}>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && post()} placeholder="Comment… use @name to mention" />
              <button className="btn primary sm" onClick={post}>Post</button>
            </div>
          )}
          <div className="section-gap">
            {comments.length === 0 ? <p className="muted">No comments yet. Start the conversation.</p> : comments.map((c) => (
              <div key={c.id} className="comment" style={{ display: 'flex', gap: 10 }}>
                <Avatar name={personName(db, c.by)} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><b style={{ fontSize: 13 }}>{personName(db, c.by)}</b><span className="tiny muted">{dateLabel(c.at)}</span></div>
                  <p style={{ margin: '2px 0 0', fontSize: 13.5 }}>{withMentions(c.text, db)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* tasks */}
          <div className="label section-gap">Action items</div>
          {caps.edit && (
            <div className="ws-compose">
              <input value={task} onChange={(e) => setTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="New task…" />
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} title="Assignee">
                {db.people.map((p) => <option key={p.id} value={p.id}>{p.name.split(' ')[0]}</option>)}
              </select>
              <button className="btn sm" onClick={addTask}>Add</button>
            </div>
          )}
          <div className="section-gap">
            {tasks.length === 0 ? <p className="muted tiny">No action items yet.</p> : tasks.map((t) => (
              <label key={t.id} className={`task-row ${t.status === 'done' ? 'done' : ''}`}>
                <input type="checkbox" checked={t.status === 'done'} disabled={!caps.edit} onChange={() => toggle(t.id)} />
                <span style={{ flex: 1 }}>{t.text}</span>
                {t.assignee_id && <span className="badge b-grey" title={personName(db, t.assignee_id)}>{personName(db, t.assignee_id).split(' ')[0]}</span>}
              </label>
            ))}
          </div>

          {/* attachments */}
          <div className="label section-gap">Attachments</div>
          {caps.edit && (
            <div className="ws-compose">
              <input value={attName} onChange={(e) => setAttName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && attach()} placeholder="File or link name…" />
              <select value={attKind} onChange={(e) => setAttKind(e.target.value)}>
                {['doc', 'sheet', 'image', 'link'].map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <button className="btn sm" onClick={attach}>Attach</button>
            </div>
          )}
          <div className="section-gap">
            {attachments.length === 0 ? <p className="muted tiny">No files attached.</p> : attachments.map((a) => (
              <div key={a.id} className="att-row">
                <span className="att-ico">{ATT_ICON[a.kind] || '📄'}</span>
                <span style={{ flex: 1 }}>{a.url ? <a href={a.url} target="_blank" rel="noreferrer">{a.name}</a> : a.name}</span>
                <span className="tiny muted">{personName(db, a.by).split(' ')[0]} · {dateLabel(a.at)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ws-side">
          <div className="label">Decision log</div>
          <div className="feed section-gap">
            {log.length === 0 ? <p className="muted tiny">No decisions recorded yet.</p> : log.map((e, k) => (
              <div key={k} className="feed-row" style={{ alignItems: 'flex-start' }}>
                <span className="feed-dot" style={{ marginTop: 6, background: e.decision === 'rejected' ? 'var(--red)' : e.kind === 'approval' || e.decision === 'approved' ? 'var(--green)' : 'var(--navy)' }} />
                <div style={{ flex: 1 }}>
                  <div className="tiny"><b style={{ textTransform: 'capitalize' }}>{e.kind}</b> · <span style={{ textTransform: 'capitalize' }}>{e.decision}</span></div>
                  <div className="tiny muted">{e.who} · {dateLabel(e.ts)}</div>
                  {e.note && <div className="tiny" style={{ color: 'var(--grey)' }}>{e.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
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
