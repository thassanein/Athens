import { useMemo, useState } from 'react'
import { decisionQueue, decisionIntel } from '../lib/procurement.js'
import { canApproveRoles, canRequestAdvance, ROLE_APPROVE_LABEL } from '../lib/engine.js'
import { money, pct, num, dateLabel } from '../lib/format.js'
import { IconAI, IconCheck } from '../components/Icons.jsx'

// Decision Center (Phase One W5) — every opportunity's next decision made
// obvious, ranked by value, with the full decision-intelligence contract:
// what to decide, who owns it, by when, what evidence is missing, the
// confidence, the expected value, risks & dependencies, the recommended action,
// the alternatives, the lineage, and *why* the recommendation was made. Where
// the acting persona is entitled, the decision can be taken here — reusing the
// existing approval mutations (no new decision engine).

export default function DecisionCenter({ db, user, caps, dispatch, navigate, flash }) {
  const queue = useMemo(() => decisionQueue(db), [db])
  const [selId, setSelId] = useState(null)
  const sel = queue.find((o) => o.id === selId) || queue[0] || null
  const raw = sel ? (db.initiatives || []).find((i) => i.id === sel.id) : null
  const intel = useMemo(() => (raw ? decisionIntel(db, raw) : null), [db, raw])

  const totalEV = queue.reduce((s, o) => s + o.nextDecision.expectedValue, 0)

  if (!sel || !intel) return (
    <div className="card pad"><h3>Decision Center</h3><p className="muted">The queue is clear — no opportunity is waiting on a decision right now.</p></div>
  )

  const approveRoles = canApproveRoles(user, raw)
  const canApprove = intel.pending && approveRoles.length > 0
  const reqAdvance = canRequestAdvance(user, raw, caps)

  const act = async (fn, args, ok) => { const r = await dispatch(fn, ...args); if (!r?.error) flash?.(ok) }
  const onApprove = () => act('approveRequest', [sel.id, user.id], `Approved as ${approveRoles.map((r) => ROLE_APPROVE_LABEL[r]).join(', ')}`)
  const onReturn = () => act('rejectRequest', [sel.id, user.id, 'Returned for rework from the Decision Center'], 'Returned for rework')
  const onRequest = () => act('requestGate', [sel.id, user.id], 'Advancement requested — approvals opened')

  return (
    <>
      <p className="page-intro">
        <b>{num(queue.length)}</b> decision{queue.length === 1 ? '' : 's'} waiting across the procurement book · <b className="mono">{money(totalEV)}</b> of
        expected value at stake. Ranked by value; each carries its evidence, confidence, alternatives and lineage. Every figure is deterministic.
      </p>

      <div className="dc-layout">
        {/* queue */}
        <div className="dc-queue card">
          <div className="dc-queue-h">Decision queue</div>
          {queue.map((o) => (
            <button key={o.id} className={`dc-qrow ${o.id === sel.id ? 'active' : ''}`} onClick={() => setSelId(o.id)}>
              <div className="dc-qrow-t"><b>{o.name}</b></div>
              <div className="dc-qrow-m">
                <span className="badge b-grey">{o.stageLabel}</span>
                {o.nextDecision.missing.length > 0 && <span className="badge b-amber">{o.nextDecision.missing.length} gap{o.nextDecision.missing.length === 1 ? '' : 's'}</span>}
                {o._raw.request && <span className="badge b-navy">sign-off</span>}
                <span className="spacer" />
                <span className="mono dc-qrow-ev">{money(o.nextDecision.expectedValue)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* detail */}
        <div className="dc-detail">
          <div className="card pad">
            <div className="dc-d-head">
              <div>
                <div className="dc-d-eyebrow">NEXT DECISION · {intel.stageLabel}</div>
                <h2 className="dc-d-title">{intel.name}</h2>
              </div>
              <button className="btn sm ghost" onClick={() => navigate('opportunity', { id: sel.id })}>Full workspace →</button>
            </div>

            {/* recommended action + explanation */}
            <div className="dc-rec">
              <div className="dc-rec-tag"><span className="ows-ai-ic"><IconAI /></span> RECOMMENDED · rules-based · {pct(intel.confidence)} confidence</div>
              <div className="dc-rec-t">{intel.recommended}</div>
              <div className="dc-rec-why">{intel.rationale}</div>
            </div>

            {/* the decision contract */}
            <div className="dc-grid">
              <div><div className="dc-k">Decision</div><div className="dc-v">{intel.decision}</div></div>
              <div><div className="dc-k">Owner</div><div className="dc-v">{intel.owner}</div></div>
              <div><div className="dc-k">Sponsor</div><div className="dc-v">{intel.sponsor}</div></div>
              <div><div className="dc-k">Due</div><div className="dc-v">{intel.due ? dateLabel(intel.due) : '—'}</div></div>
              <div><div className="dc-k">Confidence</div><div className="dc-v mono">{pct(intel.confidence)}</div></div>
              <div><div className="dc-k">Expected value</div><div className="dc-v mono" style={{ color: 'var(--green)' }}>{money(intel.expectedValue)}</div></div>
              <div><div className="dc-k">Approvers</div><div className="dc-v">{intel.approvers.length ? intel.approvers.map((a) => a.label).join(' + ') : '—'}{intel.requiresSteering && <span className="badge b-red" style={{ marginLeft: 6 }}>Steering</span>}</div></div>
              <div><div className="dc-k">Risk status</div><div className="dc-v"><span className={`badge ${intel.ragStatus === 'red' ? 'b-red' : intel.ragStatus === 'amber' ? 'b-amber' : 'b-green'}`}>{intel.ragStatus === 'red' ? 'At risk' : intel.ragStatus === 'amber' ? 'Watch' : 'On track'}</span></div></div>
            </div>

            {/* missing evidence */}
            <div className="dc-block">
              <div className="dc-block-h">Missing evidence</div>
              {intel.missing.length === 0 ? <p className="tiny" style={{ color: 'var(--green)' }}>✓ Nothing outstanding — the gate requirements are met.</p>
                : <ul className="dc-ul">{intel.missing.map((mm, i) => <li key={i}>{mm}</li>)}</ul>}
            </div>

            {/* actions */}
            <div className="dc-actions">
              {canApprove && <button className="btn accent" onClick={onApprove}><IconCheck /> Approve as {approveRoles.map((r) => ROLE_APPROVE_LABEL[r]).join(', ')}</button>}
              {canApprove && <button className="btn ghost" onClick={onReturn}>Return for rework</button>}
              {!intel.pending && reqAdvance.ok && <button className="btn accent" onClick={onRequest}>Request advance to {reqAdvance.to}</button>}
              {!intel.pending && !reqAdvance.ok && !canApprove && <span className="tiny muted">{reqAdvance.reason || 'This decision is owned elsewhere — open the workspace to progress it.'}</span>}
              {intel.pending && !canApprove && <span className="tiny muted">Awaiting {intel.approvalState?.remaining.map((r) => ROLE_APPROVE_LABEL[r]).join(' + ')} — you are not entitled to sign this off.</span>}
            </div>
          </div>

          <div className="grid cols-2 section-gap">
            {/* alternatives */}
            <div className="card pad">
              <div className="card-h"><h3>Alternatives</h3></div>
              <div className="dc-alts">
                {intel.alternatives.map((a, i) => (
                  <div key={i} className={`dc-alt ${a.recommended ? 'rec' : ''}`}>
                    <div className="dc-alt-t"><b>{a.label}</b>{a.recommended && <span className="badge b-green" style={{ marginLeft: 6 }}>recommended</span>}</div>
                    <div className="tiny muted">{a.effect}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* risks & dependencies */}
            <div className="card pad">
              <div className="card-h"><h3>Risks &amp; dependencies</h3></div>
              <div className="dc-block-h">Risks</div>
              <ul className="dc-ul">{intel.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
              <div className="dc-block-h section-gap">Dependencies</div>
              <ul className="dc-ul">{intel.dependencies.map((d, i) => <li key={i}>{d.label}: {d.value}</li>)}</ul>
            </div>
          </div>

          {/* decision lineage */}
          <div className="card pad section-gap">
            <div className="card-h"><h3>Decision lineage</h3></div>
            {intel.lineage.length === 0 ? <p className="muted">No prior decisions — this is the first gate on the record.</p>
              : <div className="ows-timeline">{intel.lineage.map((h, i) => (
                <div key={i} className={`ows-tl ${h.kind}`}>
                  <span className="ows-tl-dot" />
                  <div>
                    <div className="ows-tl-t"><b>{h.title}</b> <span className="badge b-grey">{h.detail}</span></div>
                    <div className="tiny muted">{dateLabel(h.at)} · {h.by}</div>
                    {h.rationale && <div className="tiny" style={{ marginTop: 2 }}>{h.rationale}</div>}
                  </div>
                </div>
              ))}</div>}
          </div>
        </div>
      </div>
    </>
  )
}
