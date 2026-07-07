import { useMemo, useState } from 'react'
import { agentActivities } from '../lib/ai-trust.js'
import { aiRecommendations } from '../lib/model.js'
import { flagOn, setFlag } from '../lib/flags.js'
import { NAV } from '../components/NavBar.jsx'
import AIConfidenceEvidencePanel from '../components/AIConfidenceEvidencePanel.jsx'
import ExecutiveMemoryPanel from '../components/ExecutiveMemoryPanel.jsx'

// AI Trust page (6D Wave 4) — the AI made accountable. The six-agent team in
// live activity states, a Shadow Mode switch (observe silently before
// proactive recommendations), every open recommendation with its full trust
// breakdown, and the transparent Executive Memory. Deterministic throughout.
const LABELS = Object.fromEntries(NAV.flatMap((s) => s.items).map(([k, l]) => [k, l]))
const labelFor = (k) => LABELS[k] || k

export default function AITrust({ db, user }) {
  const [shadow, setShadow] = useState(() => flagOn('aiShadow'))
  const agents = useMemo(() => agentActivities(db, user, shadow), [db, user, shadow])
  const recs = useMemo(() => aiRecommendations(db, { status: 'open' })
    .sort((a, b) => (b.value_impact || 0) - (a.value_impact || 0)), [db])

  const toggleShadow = () => { const v = !shadow; setShadow(v); setFlag('aiShadow', v) }

  return (
    <>
      <p className="page-intro">
        <b>AI trust</b> — EVRO's intelligence is deterministic and rules-based, and it shows its work.
        The six agents below run against the live record; every recommendation carries its confidence,
        evidence, assumptions, dependencies, risks and expected value. It assists without interrupting.
      </p>

      {/* the agent team + shadow mode */}
      <div className="card pad">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3>The agent team</h3>
          <span className="spacer" />
          <label className="ait-shadow">
            <input type="checkbox" checked={shadow} onChange={toggleShadow} />
            <span>Shadow mode</span>
            <span className="ait-shadow-h">{shadow ? 'observing silently' : 'proactive'}</span>
          </label>
        </div>
        {shadow && <div className="ait-shadow-note fx-collapse-in">Shadow mode is on — the AI is watching and analysing, but holding proactive recommendations until you switch it off.</div>}
        <div className="ait-agents">
          {agents.map((a) => (
            <div key={a.key} className="ait-agent">
              <div className="ait-agent-h">
                <span className="ait-dot" style={{ background: a.tone }} />
                <b>{a.name}</b>
                <span className="ait-act" style={{ color: a.tone }}>{a.label}</span>
              </div>
              <div className="ait-agent-desc">{a.desc}.</div>
              <div className="ait-agent-reason">{a.reasoning}</div>
              <div className="ait-agent-conf mono" title={a.confNote}>{Math.round(a.confidence * 100)}% · {a.confNote}</div>
            </div>
          ))}
        </div>
      </div>

      {/* trust breakdown on every recommendation */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Recommendations — every claim, its evidence</h3><span className="spacer" /><span className="badge b-grey">{recs.length} open · confidence · assumptions · risks</span></div>
        {shadow ? (
          <p className="emp-empty">Shadow mode is on — recommendations are held. The evidence is still computed; switch shadow off to surface the {recs.length} open action{recs.length === 1 ? '' : 's'}.</p>
        ) : (
          <div className="ait-recs">
            {recs.map((r, i) => <AIConfidenceEvidencePanel key={r.id} db={db} rec={r} defaultOpen={i === 0} />)}
          </div>
        )}
      </div>

      {/* executive memory */}
      <div className="section-gap">
        <ExecutiveMemoryPanel labelFor={labelFor} />
      </div>
    </>
  )
}
