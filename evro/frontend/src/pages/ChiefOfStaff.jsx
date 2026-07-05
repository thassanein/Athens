import { useMemo, useState } from 'react'
import { aiRecommendations, decisionJournal } from '../lib/model.js'
import { companionBrief, OPERATING_MODES, defaultModeFor } from '../lib/companion.js'
import { orchestrationModel } from '../lib/orchestration.js'
import { personName } from '../lib/engine.js'
import { money, pct, dateLabel } from '../lib/format.js'
import { Bar } from '../components/ui.jsx'
import { InfoDot } from '../components/Explain.jsx'
import TrustBadge from '../components/Evidence.jsx'
import MissionReplay from '../components/MissionReplay.jsx'
import ConfidenceHeatmap from '../components/ConfidenceHeatmap.jsx'
import { IconAI } from '../components/Icons.jsx'

// EVRO AI Experience Shell — Chief of Staff (5B.5). A persistent AI surface: a
// persona-framed brief, an agent console (deterministic, rules-based
// recommendations with a confidence/evidence panel), a decision journal, and a
// memory log. Reads Wave 1's ai_recommendations + decision_journal + audit_log.
//
// LLM SEAM: every recommendation is read from db.ai_recommendations, produced
// today by the deterministic rules layer. Swapping that producer for an LLM
// service leaves this shell unchanged — it only ever renders the entity.

const CAT_TONE = { governance: 'var(--amber)', opportunity: 'var(--green)', risk: 'var(--red)', value: 'var(--navy)' }
const confLabel = (c) => (c >= 0.85 ? 'High' : c >= 0.7 ? 'Medium' : 'Indicative')

export default function ChiefOfStaff({ db, user, caps, dispatch, flash, navigate }) {
  const [mode, setMode] = useState(defaultModeFor(user.role))
  const [agent, setAgent] = useState('all')
  const [pmFor, setPmFor] = useState(null) // postmortem form target (journal id)
  const [pmOutcome, setPmOutcome] = useState('')
  const [pmLessons, setPmLessons] = useState('')
  const savePm = async (id) => {
    const r = await dispatch?.('journalOutcome', id, pmOutcome.trim(), pmLessons.trim(), user.id)
    if (!r?.error) { flash?.('Outcome recorded — the organization just learned something'); setPmFor(null); setPmOutcome(''); setPmLessons('') }
  }
  const brief = companionBrief(db, user, mode)
  const recos = aiRecommendations(db)
  const journal = decisionJournal(db)
  const memory = (db.audit_log || []).slice(0, 10)
  const orch = orchestrationModel(db, user)

  const agents = useMemo(() => ['all', ...Array.from(new Set(recos.map((r) => r.agent)))], [recos])
  const shown = agent === 'all' ? recos : recos.filter((r) => r.agent === agent)

  const goto = (r) => {
    if (r.linked_id && r.linked_id.startsWith('i-')) return navigate('initiative', { id: r.linked_id })
    navigate(r.category === 'opportunity' ? 'opportunities' : r.category === 'risk' ? 'sustainment' : 'valueoffice')
  }

  return (
    <>
      <p className="page-intro">
        <b>Chief of Staff</b> — your persistent AI partner. A deterministic, rules-based
        team of agents watches the portfolio and surfaces what to do next, each with a
        confidence and the evidence behind it. Every decision and action is remembered.
      </p>

      {/* persona brief */}
      <div className="card pad cos-brief">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3><span className="cos-logo"><IconAI /></span> Your briefing</h3>
          <span className="spacer" />
          <div className="seg">
            {OPERATING_MODES.map((m) => (
              <button key={m.key} className={mode === m.key ? 'active' : ''} onClick={() => setMode(m.key)}>{m.label}</button>
            ))}
          </div>
        </div>
        <div className="cos-brief-body">
          <div>
            <div className="t-label">{brief.metric.label}</div>
            <div className="cos-brief-val mono">{brief.metric.value}</div>
            <div className="t-sub">{brief.metric.sub}</div>
          </div>
          {brief.rec && (
            <div className="cos-brief-next">
              <span className="badge b-navy">What I'd do next</span>
              <div className="cos-next-t">{brief.rec.title}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{brief.rec.body}</div>
            </div>
          )}
        </div>
      </div>

      {/* orchestration — how the agent team collaborates (5B.5 item 3) */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>How your AI team works</h3><span className="spacer" /><span className="badge b-navy"><IconAI /> deterministic orchestration</span></div>
        <div className="orch-flow">
          {orch.stages.map((s, k) => (
            <div key={s.key} className="orch-seg">
              <div className={`orch-node ${s.key === 'chief' ? 'orch-chief' : ''}`}>
                <div className="orch-node-n">{s.name}</div>
                <div className="orch-node-r">{s.role}</div>
                <ul className="orch-node-s">
                  {s.stats.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
              {k < orch.stages.length - 1 && (
                <div className="orch-link" aria-hidden="true">
                  <span className="orch-wire"><span className="orch-pulse" /></span>
                  <span className="orch-flow-l">{s.flow}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {orch.tensions.length > 0 && (
          <>
            <div className="divider" />
            <div className="orch-tension-h"><b>Where agents disagree</b><span className="muted" style={{ fontSize: 12 }}> — the higher confidence leads; the dissent is kept as evidence, never discarded.</span></div>
            <div className="orch-tensions">
              {orch.tensions.map((t, k) => (
                <div key={k} className="orch-tension">
                  <div className={`orch-pos ${t.leads === 'a' ? 'leads' : ''}`}>
                    <div className="orch-pos-h"><span className="badge b-green">{t.a.agent}</span><span className="mono orch-pos-c">{pct(t.a.confidence)}</span></div>
                    <div className="orch-pos-t">{t.a.title}</div>
                    {t.leads === 'a' && <div className="orch-leads">leads</div>}
                  </div>
                  <div className="orch-vs">vs</div>
                  <div className={`orch-pos ${t.leads === 'b' ? 'leads' : ''}`}>
                    <div className="orch-pos-h"><span className="badge b-red">{t.b.agent}</span><span className="mono orch-pos-c">{pct(t.b.confidence)}</span></div>
                    <div className="orch-pos-t">{t.b.title}</div>
                    {t.leads === 'b' && <div className="orch-leads">leads</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* mission replay — the orchestration run, animated (5B.7 item 3) */}
      <MissionReplay db={db} user={user} navigate={navigate} />

      {/* AI confidence heatmap (5B.7 item 5) */}
      <ConfidenceHeatmap db={db} />

      {/* agent console */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Agent console</h3><span className="spacer" /><span className="badge b-grey">{recos.length} recommendations · rules-based</span></div>
        <div className="cos-tabs">
          {agents.map((a) => (
            <button key={a} className={`cos-tab ${agent === a ? 'active' : ''}`} onClick={() => setAgent(a)}>
              {a === 'all' ? 'All agents' : a}{a !== 'all' && <span className="cos-tab-n">{recos.filter((r) => r.agent === a).length}</span>}
            </button>
          ))}
        </div>
        <div className="cos-recos">
          {shown.map((r) => (
            <div key={r.id} className="cos-reco" style={{ borderLeftColor: CAT_TONE[r.category] || 'var(--navy)' }}>
              <div className="cos-reco-h">
                <span className="badge b-navy"><IconAI /> {r.agent}</span>
                <span className="cos-reco-cat" style={{ color: CAT_TONE[r.category] }}>{r.category}</span>
                <span className="spacer" />
                <TrustBadge db={db} rec={r} align="right" />
                {r.value_impact ? <span className="mono cos-reco-v">{money(r.value_impact)}</span> : null}
              </div>
              <div className="cos-reco-t">{r.title}</div>
              <div className="cos-reco-r">{r.recommendation}</div>
              <div className="cos-conf">
                <span className="cos-conf-l">Confidence · {confLabel(r.confidence)}</span>
                <span className="cos-conf-b"><Bar value={r.confidence} max={1} color={CAT_TONE[r.category] || 'var(--navy)'} height={7} /></span>
                <span className="cos-conf-v mono">{pct(r.confidence)}</span>
              </div>
              <div className="cos-evidence">
                <span className="cos-ev-l">Evidence</span>
                {r.evidence.map((e, k) => <span key={k} className="cos-ev-chip">{e}</span>)}
              </div>
              <button className="btn sm" onClick={() => goto(r)}>Open →</button>
            </div>
          ))}
          {shown.length === 0 && <div className="muted" style={{ padding: 10 }}>No recommendations from this agent.</div>}
        </div>
      </div>

      {/* decision journal + memory log */}
      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Decision journal <InfoDot k="Stage Gate" /></h3><span className="spacer" /><span className="badge b-grey">{journal.length}</span></div>
          <div className="cos-journal">
            {journal.map((d) => (
              <div key={d.id} className="cos-dj" onClick={() => d.linked_initiative_id && navigate('initiative', { id: d.linked_initiative_id })} style={{ cursor: d.linked_initiative_id ? 'pointer' : 'default' }}>
                <div className="cos-dj-h">
                  <span className={`badge ${d.decision === 'Approved' ? 'b-green' : d.decision === 'Returned for rework' ? 'b-amber' : 'b-grey'}`}>{d.decision}</span>
                  <span className="cos-dj-date">{dateLabel(d.at)}</span>
                </div>
                <div className="cos-dj-t">{d.title}{d.auto && <span className="badge b-grey" style={{ marginLeft: 6 }}>auto-captured</span>}</div>
                <div className="cos-dj-r"><b>Why:</b> {d.rationale}</div>
                {d.outcome && <div className="cos-dj-o"><b>Outcome:</b> {d.outcome}</div>}
                {d.lessons && <div className="cos-dj-l">💡 {d.lessons}</div>}
                <div className="cos-dj-by">— {personName(db, d.decided_by)}</div>
                {!d.outcome && caps?.edit && pmFor !== d.id && (
                  <button className="btn sm ghost" style={{ marginTop: 6 }} onClick={(e) => { e.stopPropagation(); setPmFor(d.id); setPmOutcome(''); setPmLessons('') }}>+ Record outcome</button>
                )}
                {pmFor === d.id && (
                  <div className="cos-pm" onClick={(e) => e.stopPropagation()}>
                    <input className="cos-pm-in" placeholder="What actually happened?" value={pmOutcome} onChange={(e) => setPmOutcome(e.target.value)} />
                    <input className="cos-pm-in" placeholder="Lesson for next time (optional)" value={pmLessons} onChange={(e) => setPmLessons(e.target.value)} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn sm" disabled={!pmOutcome.trim()} onClick={() => savePm(d.id)}>Save postmortem</button>
                      <button className="btn sm ghost" onClick={() => setPmFor(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card pad">
          <div className="card-h"><h3>Memory log</h3><span className="spacer" /><span className="badge b-grey">last {memory.length}</span></div>
          <p className="muted" style={{ fontSize: 12, marginTop: -2, marginBottom: 8 }}>What the system remembers — every action is logged and attributed.</p>
          <div className="cos-mem">
            {memory.map((m) => (
              <div key={m.id} className="cos-mem-row">
                <span className={`cos-mem-dot cos-a-${m.action}`} />
                <div className="cos-mem-main">
                  <div className="cos-mem-d">{m.detail}</div>
                  <div className="cos-mem-meta">{personName(db, m.actor_id)} · {m.action} · {dateLabel((m.ts || '').slice(0, 10))}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
