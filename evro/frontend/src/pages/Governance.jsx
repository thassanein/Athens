import { useMemo, useState } from 'react'
import {
  STAGES, STAGE_LABEL, approvalState, canApproveRoles, ROLE_APPROVE_LABEL,
  personName, rav, isActive, MATERIALITY,
} from '../lib/engine.js'
import { money, dateLabel } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { InfoDot } from '../components/Explain.jsx'

// Workflow, Governance & Auditability (5B.6) — one traceability surface: the
// approval queue as steppers, the stage-gate ladder, a role permissions matrix,
// and the portfolio activity log. Presentation only: Approve/Return call the
// EXISTING approveRequest / rejectRequest mutations; nothing here changes the
// engine or the approval rules it enforces.

const LADDER = ['proposed', 'idea', 'feasibility', 'capability', 'launch', 'realization', 'sustainment']
const GATE_REQS = [
  { to: 'feasibility', needs: ['line_manager', 'fpna'], gate: 'FP&A-validated baseline' },
  { to: 'capability', needs: ['line_manager', 'fpna'], gate: 'Savings logic & P&L mapping signed off' },
  { to: 'launch', needs: ['line_manager', 'fpna', 'steering*'], gate: `No unmitigated high risk · Steering if ≥ ${money(MATERIALITY)}` },
]

const ROLES = [
  { key: 'exec', label: 'Executive' }, { key: 'admin', label: 'EVRO Lead' }, { key: 'fpna', label: 'FP&A' },
  { key: 'leader', label: 'Function leader' }, { key: 'owner', label: 'Initiative owner' }, { key: 'procurement', label: 'Procurement' },
]
const PCAPS = [
  { key: 'edit', label: 'Edit / advance' }, { key: 'line', label: 'Approve (line mgr)' },
  { key: 'fpna', label: 'Validate (FP&A)' }, { key: 'steering', label: 'Steering gate' }, { key: 'admin', label: 'Admin config' },
]
// Mirrors capsFor() + canApproveRoles() — a read-only "who can do what" view.
const MATRIX = {
  exec: { edit: false, line: false, fpna: false, steering: false, admin: false, scope: 'Enterprise' },
  admin: { edit: true, line: true, fpna: true, steering: true, admin: true, scope: 'Enterprise' },
  fpna: { edit: false, line: false, fpna: true, steering: false, admin: false, scope: 'Enterprise' },
  leader: { edit: true, line: 'dept', fpna: false, steering: true, admin: false, scope: 'Department' },
  owner: { edit: true, line: false, fpna: false, steering: false, admin: false, scope: 'Own' },
  procurement: { edit: true, line: false, fpna: false, steering: false, admin: false, scope: 'Own' },
}

export default function Governance({ db, user, dispatch, navigate, flash }) {
  const [actionFilter, setActionFilter] = useState('all')

  const pending = db.initiatives.filter((i) => i.request)
  const active = db.initiatives.filter(isActive)
  const validatedActuals = db.initiatives.reduce((a, i) => a + (i.actuals || []).filter((x) => x.validated).length, 0)
  const log = db.audit_log || []
  const actions = useMemo(() => ['all', ...Array.from(new Set(log.map((l) => l.action)))], [log])
  const shownLog = actionFilter === 'all' ? log : log.filter((l) => l.action === actionFilter)
  const counts = Object.fromEntries(LADDER.map((s) => [s, db.initiatives.filter((i) => i.stage === s).length]))

  const approve = async (i) => {
    const roles = canApproveRoles(user, i)
    const r = await dispatch('approveRequest', i.id, user.id)
    if (!r?.error) flash(`Approved as ${roles.map((x) => ROLE_APPROVE_LABEL[x]).join(', ')}`)
  }
  const reject = async (i) => {
    const r = await dispatch('rejectRequest', i.id, user.id, 'Returned for rework from Governance.')
    if (!r?.error) flash('Request returned for rework')
  }

  return (
    <>
      <p className="page-intro">
        <b>Governance</b> — every initiative and decision has a traceable record. Approvals
        run through stage gates (line manager + FP&A, Steering for the biggest moves); every
        action is logged. This is the control room for that workflow.
      </p>

      <div className="grid cols-4">
        <Tile label={<>Pending approvals <InfoDot k="Stage Gate" /></>} value={String(pending.length)} sub="awaiting sign-off" tone={pending.length ? 'amber' : 'green'} />
        <Tile label="In-flight initiatives" value={String(active.length)} sub="idea → sustainment" />
        <Tile label={<>Validated actuals <InfoDot k="FP&A Validation" /></>} value={String(validatedActuals)} sub="FP&A-signed months" tone="green" />
        <Tile label="Activity entries" value={String(log.length)} sub="append-only audit log" tone="dark" />
      </div>

      {/* approval queue — steppers */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Approval queue</h3><span className="spacer" /><span className="badge b-amber">{pending.length} pending</span></div>
        {pending.length === 0 && <div className="muted" style={{ padding: 8 }}>No approvals pending. Every initiative is at a settled gate.</div>}
        <div className="gov-queue">
          {pending.map((i) => {
            const st = approvalState(i)
            const mine = canApproveRoles(user, i)
            return (
              <div key={i.id} className="gov-appr">
                <div className="gov-appr-main">
                  <div className="gov-appr-t" onClick={() => navigate('initiative', { id: i.id })}>{i.title}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    {st.kind === 'intake' ? 'Intake → Idea' : `Advance → ${STAGE_LABEL[st.to_stage]}`} · {money(rav(i))} RAV
                  </div>
                  <div className="gov-stepper">
                    {st.need.map((role) => {
                      const done = st.filled.includes(role)
                      const who = st.approvals.find((a) => a.role === role)
                      return (
                        <div key={role} className={`gov-step ${done ? 'done' : 'wait'}`}>
                          <span className="gov-step-dot">{done ? '✓' : '•'}</span>
                          <span className="gov-step-l">{ROLE_APPROVE_LABEL[role]}{done && who ? ` · ${personName(db, who.by)}` : ''}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="gov-appr-act">
                  {mine.length > 0 ? (
                    <>
                      <button className="btn sm" onClick={() => approve(i)}>Approve</button>
                      <button className="btn sm ghost" onClick={() => reject(i)}>Return</button>
                    </>
                  ) : <span className="badge b-grey">Awaiting {st.remaining.map((r) => ROLE_APPROVE_LABEL[r]).join(', ')}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* stage-gate ladder */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Stage-gate ladder</h3></div>
        <div className="gov-ladder">
          {LADDER.map((s, k) => (
            <div key={s} className="gov-rung">
              <div className="gov-rung-n">{counts[s]}</div>
              <div className="gov-rung-l">{STAGE_LABEL[s]}</div>
              {k < LADDER.length - 1 && <div className="gov-rung-arrow">→</div>}
            </div>
          ))}
        </div>
        <div className="divider" />
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Gate (into)</th><th>Approvals required</th><th>Gate condition</th></tr></thead>
            <tbody>
              {GATE_REQS.map((g) => (
                <tr key={g.to}>
                  <td><b>{STAGE_LABEL[g.to]}</b></td>
                  <td>{g.needs.map((n) => <span key={n} className="badge b-navy" style={{ marginRight: 4 }}>{ROLE_APPROVE_LABEL[n.replace('*', '')] || n}{n.endsWith('*') ? '*' : ''}</span>)}</td>
                  <td className="muted">{g.gate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* permissions matrix + activity log */}
      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Permissions</h3><span className="spacer" /><span className="badge b-grey">role × capability</span></div>
          <div className="table-wrap">
            <table className="tbl gov-perm">
              <thead>
                <tr><th>Role</th>{PCAPS.map((c) => <th key={c.key} className="num">{c.label}</th>)}<th>Scope</th></tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r.key} className={user.role === r.key ? 'gov-you' : ''}>
                    <td><b>{r.label}</b>{user.role === r.key && <span className="badge b-navy" style={{ marginLeft: 6 }}>you</span>}</td>
                    {PCAPS.map((c) => {
                      const v = MATRIX[r.key][c.key]
                      return <td key={c.key} className="num">{v === true ? <span className="gov-yes">✓</span> : v === 'dept' ? <span className="gov-part" title="Own department only">◑</span> : <span className="gov-no">—</span>}</td>
                    })}
                    <td>{MATRIX[r.key].scope}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>✓ full · ◑ own department · — none. Enforced in the engine reducers (client + server), not just the UI.</p>
        </div>

        <div className="card pad">
          <div className="card-h"><h3>Activity log</h3><span className="spacer" />
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ padding: '5px 8px', border: '1px solid var(--line)', borderRadius: 8, textTransform: 'capitalize' }}>
              {actions.map((a) => <option key={a} value={a}>{a === 'all' ? 'All actions' : a}</option>)}
            </select>
          </div>
          <div className="gov-log">
            {shownLog.slice(0, 40).map((l) => (
              <div key={l.id} className="gov-log-row">
                <span className={`gov-log-tag cos-a-${l.action}`}>{l.action}</span>
                <div className="gov-log-main">
                  <div className="gov-log-d">{l.detail}</div>
                  <div className="gov-log-m">{personName(db, l.actor_id)} · {dateLabel((l.ts || '').slice(0, 10))}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
