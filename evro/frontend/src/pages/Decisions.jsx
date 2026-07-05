import { useMemo, useState } from 'react'
import { decisionCases, ALTERNATIVES } from '../lib/decisions.js'
import { ROLE_APPROVE_LABEL } from '../lib/engine.js'
import { money, pct } from '../lib/format.js'
import { Tile, Avatar } from '../components/ui.jsx'
import TrustBadge from '../components/Evidence.jsx'
import { IconAI } from '../components/Icons.jsx'

// Executive Decision Workspace (5B.7 item 9) — the room where high-value
// decisions get made: the case queue on the left; evidence, alternatives with
// consequences, an approve-vs-hold simulation, and the AI debate on the right.
// Actions reuse existing mutations (approve / return / delegate task); every
// committed gate decision is auto-journaled by the app shell.

const TONE = { green: 'var(--green)', amber: 'var(--amber)', navy: 'var(--navy)', grey: 'var(--grey-2)' }

export default function Decisions({ db, user, caps, dispatch, navigate, flash }) {
  const cases = useMemo(() => decisionCases(db, user), [db, user])
  const [selId, setSelId] = useState(null)
  const [alt, setAlt] = useState(null)
  const [showDebate, setShowDebate] = useState(true)
  const sel = cases.find((c) => c.id === selId) || cases[0]
  const totalValue = cases.reduce((a, c) => a + c.value, 0)
  const onYou = cases.filter((c) => c.canApprove)

  const act = async (c, key) => {
    if (key === 'approve') {
      const r = await dispatch('approveRequest', c.id, user.id)
      if (!r?.error) flash('Approved — decision journaled automatically')
    } else if (key === 'return') {
      const r = await dispatch('rejectRequest', c.id, user.id, c.gate.ok ? 'Returned by executive decision.' : `Returned: ${c.gate.reasons.join(' ')}`)
      if (!r?.error) flash('Returned for rework — the owner sees why')
    } else if (key === 'delegate') {
      const r = await dispatch('addTask', c.id, `Decision diligence: ${c.ask} — review evidence and report back.`, c.ownerId, user.id)
      if (!r?.error) flash(`Diligence task on ${c.owner}'s record`)
    } else if (key === 'defer') {
      flash(`Held — timing cost ≈ ${money(c.sim.delayCost)} if it waits a quarter (nothing recorded)`)
    }
    setAlt(null)
  }

  return (
    <>
      <p className="page-intro">
        The <b>Decision Workspace</b> — every high-value decision as a case file: the
        evidence, the alternatives and their consequences, the simulation, and the AI
        debate. Decide with the whole picture, and the journal writes itself.
      </p>

      <div className="grid cols-4">
        <Tile label="Open decisions" value={String(cases.length)} sub="pending requests" tone="dark" />
        <Tile label="Value on the table" value={money(totalValue)} sub="gross annual, all cases" tone="navy" />
        <Tile label="Waiting on you" value={String(onYou.length)} sub="you hold an approver role" tone={onYou.length ? 'amber' : 'green'} />
        <Tile label="Debate verdicts" value={`${cases.filter((c) => c.debate.verdict === 'approve').length} / ${cases.length}`} sub="agents lean approve" tone="dark" />
      </div>

      {cases.length === 0 && <div className="card pad section-gap"><div className="muted">No pending decisions — the gates are clear.</div></div>}

      {sel && (
        <div className="dw-grid section-gap">
          {/* case queue */}
          <div className="card pad dw-queue">
            <div className="card-h"><h3>Case queue</h3><span className="spacer" /><span className="badge b-grey">by value</span></div>
            {cases.map((c) => (
              <button key={c.id} className={`dw-case ${sel.id === c.id ? 'on' : ''}`} onClick={() => { setSelId(c.id); setAlt(null) }}>
                <div className="dw-case-t">{c.title}</div>
                <div className="dw-case-m">
                  <span className="mono" style={{ fontWeight: 800 }}>{money(c.value)}</span>
                  <span className="muted">{c.ask}</span>
                  {c.ageDays > 7 && <span className="badge b-red">waiting {c.ageDays}d</span>}
                </div>
              </button>
            ))}
          </div>

          {/* the case file */}
          <div className="dw-file">
            <div className="card pad">
              <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 6 }}>
                <h3>{sel.title}</h3>
                <span className="spacer" />
                <button className="btn sm ghost" onClick={() => navigate('initiative', { id: sel.id })}>Open record →</button>
              </div>
              <div className="dw-meta">
                <span><Avatar name={sel.owner} /> {sel.owner} · {sel.dept}</span>
                <span>{sel.ask}</span>
                <span>requested by {sel.requestedBy}{sel.ageDays != null ? ` · ${sel.ageDays}d ago` : ''}</span>
                {sel.waiting.length > 0 && <span className="badge b-amber">awaiting {sel.waiting.map((r) => ROLE_APPROVE_LABEL[r] || r).join(' + ')}</span>}
              </div>

              {/* evidence strip */}
              <div className="dw-evidence">
                <span className={`dw-ev ${sel.evidence.baseline ? 'ok' : 'miss'}`}>{sel.evidence.baseline ? '✓' : '○'} baseline validated</span>
                <span className={`dw-ev ${sel.gate.ok ? 'ok' : 'miss'}`}>{sel.gate.ok ? '✓ gate criteria met' : `○ ${sel.gate.reasons.length} gate gap${sel.gate.reasons.length === 1 ? '' : 's'}`}</span>
                <span className="dw-ev">{sel.evidence.validations} sign-offs on file</span>
                <span className={`dw-ev ${sel.evidence.worstRisk >= 15 ? 'miss' : ''}`}>{sel.evidence.risks} open risks · worst {sel.evidence.worstRisk}/25</span>
                <span className="dw-ev mono">ROI {sel.fin.roi > 0 ? `${sel.fin.roi.toFixed(1)}×` : '— (pre-pipeline)'} · payback {sel.fin.paybackMonths ? `${Math.round(sel.fin.paybackMonths)}mo` : '—'} · NPV {money(sel.fin.npv)}</span>
                {sel.evidence.linkedRec && <TrustBadge db={db} rec={sel.evidence.linkedRec} align="right" />}
              </div>

              {/* simulation */}
              <div className="dw-sim">
                <div className="dw-sim-col">
                  <div className="t-label">If approved now</div>
                  <div className="mono dw-sim-v" style={{ color: 'var(--green)' }}>+{money(sel.sim.unlock)}</div>
                  <div className="dw-sim-n">into the credible pipeline — confidence {pct(sel.sim.c1)} → {pct(sel.sim.c2)}</div>
                </div>
                <div className="dw-sim-col">
                  <div className="t-label">If it waits a quarter</div>
                  <div className="mono dw-sim-v" style={{ color: 'var(--red)' }}>−{money(sel.sim.delayCost)}</div>
                  <div className="dw-sim-n">timing cost on the unlocked run-rate (illustrative)</div>
                </div>
                <div className="dw-sim-col">
                  <div className="t-label">Risk-adjusted value</div>
                  <div className="mono dw-sim-v">{money(sel.sim.ravNow)} → {money(sel.sim.ravNext)}</div>
                  <div className="dw-sim-n">before vs after the gate</div>
                </div>
              </div>

              {/* alternatives */}
              <div className="dw-alts">
                {ALTERNATIVES.map((a) => {
                  const disabled = a.key === 'approve' ? !(caps?.edit || caps?.validate || caps?.steering) || !sel.canApprove
                    : a.key === 'return' ? !(caps?.edit || caps?.validate || caps?.steering)
                    : a.key === 'delegate' ? !caps?.edit : false
                  return (
                    <button key={a.key} className={`dw-alt ${alt === a.key ? 'on' : ''}`} style={{ borderColor: alt === a.key ? TONE[a.tone] : undefined }}
                      onClick={() => setAlt(alt === a.key ? null : a.key)} disabled={disabled && a.key !== 'defer'}
                      title={disabled ? 'Your role can’t take this action' : undefined}>
                      <b style={{ color: TONE[a.tone] }}>{a.label}</b>
                      <span>{a.consequence(sel)}</span>
                    </button>
                  )
                })}
              </div>
              {alt && (
                <div className="dw-confirm">
                  <span className="muted" style={{ fontSize: 12.5 }}>{ALTERNATIVES.find((a) => a.key === alt)?.consequence(sel)}</span>
                  <span className="spacer" />
                  <button className="btn sm" onClick={() => act(sel, alt)}>Confirm — {ALTERNATIVES.find((a) => a.key === alt)?.label}</button>
                  <button className="btn sm ghost" onClick={() => setAlt(null)}>Cancel</button>
                </div>
              )}
            </div>

            {/* AI debate */}
            <div className="card pad">
              <div className="card-h">
                <h3>AI debate</h3>
                <span className="badge b-navy"><IconAI /> positions composed from live signals · rules-based</span>
                <span className="spacer" />
                <button className="btn sm ghost" onClick={() => setShowDebate(!showDebate)}>{showDebate ? 'Hide' : 'Show'}</button>
              </div>
              {showDebate && (
                <>
                  <div className="dw-debate">
                    <div className="dw-side">
                      <div className="dw-side-h" style={{ color: 'var(--green)' }}>FOR · {pct(sel.debate.proConf)} avg confidence</div>
                      {sel.debate.pro.map((x, k) => (
                        <div key={k} className="dw-pos">
                          <div className="dw-pos-h"><span className="badge b-green">{x.agent}</span><span className="mono">{pct(x.confidence)}</span></div>
                          <div className="dw-pos-t">{x.text}</div>
                        </div>
                      ))}
                      {sel.debate.pro.length === 0 && <div className="muted" style={{ fontSize: 12 }}>No agent argues for this yet.</div>}
                    </div>
                    <div className="dw-side">
                      <div className="dw-side-h" style={{ color: 'var(--red)' }}>AGAINST · {pct(sel.debate.conConf)} avg confidence</div>
                      {sel.debate.con.map((x, k) => (
                        <div key={k} className="dw-pos">
                          <div className="dw-pos-h"><span className="badge b-red">{x.agent}</span><span className="mono">{pct(x.confidence)}</span></div>
                          <div className="dw-pos-t">{x.text}</div>
                        </div>
                      ))}
                      {sel.debate.con.length === 0 && <div className="muted" style={{ fontSize: 12 }}>No standing objections.</div>}
                    </div>
                  </div>
                  <div className="dw-verdict">
                    Verdict: <b style={{ color: sel.debate.verdict === 'approve' ? 'var(--green)' : 'var(--amber)' }}>{sel.debate.verdict === 'approve' ? 'lean approve' : 'hold — resolve the objections first'}</b>
                    <span className="muted" style={{ fontSize: 11.5 }}> — higher average confidence leads; the dissent stays on the record. The decision is yours.</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
