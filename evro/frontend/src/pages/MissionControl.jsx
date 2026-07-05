import { useState } from 'react'
import { missionHealth } from '../lib/mission.js'
import { OPERATING_MODES, defaultModeFor, companionBrief, strategicNarratives } from '../lib/companion.js'
import { decisionsRequired, canApproveRoles, ROLE_APPROVE_LABEL, personName } from '../lib/engine.js'
import { aiRecommendations } from '../lib/model.js'
import { money, pct } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { ActivityRings } from '../components/Charts.jsx'
import { InfoDot } from '../components/Explain.jsx'
import { IconAI } from '../components/Icons.jsx'

// Enterprise Mission Control (5B.5) — the flagship executive landing. Answers,
// in one screen: what happened, why it matters, what to do next. Built on the
// existing pulse / rollup / decision engines + the Phase 5B AI entity. View-
// only: one-click actions call the existing approveRequest mutation.

const BAND_TONE = { strong: 'var(--green)', steady: 'var(--navy)', fragile: 'var(--red)' }
const SIG_TONE = { green: 'var(--green)', red: 'var(--red)', navy: 'var(--navy)', amber: 'var(--amber)' }

export default function MissionControl({ db, user, dispatch, navigate, flash }) {
  const [mode, setMode] = useState(defaultModeFor(user.role))
  const h = missionHealth(db)
  const brief = companionBrief(db, user, mode)
  const narrative = strategicNarratives(db)[0]

  // "What to do next" — decisions ranked by value, then top AI recommendations.
  const decisions = decisionsRequired(db, user).slice(0, 3)
  const recs = aiRecommendations(db, { status: 'open' }).slice(0, 3)

  const act = async (d) => {
    if (d.action === 'approve') {
      const r = await dispatch('approveRequest', d.id, user.id)
      if (!r?.error) flash('Approved')
    } else navigate('initiative', { id: d.id })
  }

  return (
    <>
      <p className="page-intro">
        <b>Enterprise Mission Control</b> — the state of enterprise value in one read. What
        happened, why it matters, and what to do next, framed for your seat. Switch the lens
        to reweight the view.
      </p>

      {/* lens */}
      <div className="mc-lens">
        <div className="seg">
          {OPERATING_MODES.map((m) => (
            <button key={m.key} className={mode === m.key ? 'active' : ''} onClick={() => setMode(m.key)}>{m.label}</button>
          ))}
        </div>
        <span className="mc-lens-blurb">{OPERATING_MODES.find((m) => m.key === mode)?.blurb}</span>
      </div>

      {/* the 30-second triad */}
      <div className="grid cols-3">
        <div className="card pad mc-triad"><div className="mc-triad-l">What happened</div>
          <div className="mc-triad-v">{money(h.roll.realizedYTD)} created</div>
          <div className="mc-triad-s">{money(h.roll.leakage)} leaking · {money(h.ct.valueAtRisk)} at risk</div></div>
        <div className="card pad mc-triad"><div className="mc-triad-l">Why it matters</div>
          <div className="mc-triad-n">{narrative}</div></div>
        <div className="card pad mc-triad"><div className="mc-triad-l">What to do next</div>
          <div className="mc-triad-v mc-next">{(decisions[0]?.title) || brief.rec?.title || 'Portfolio is settled'}</div>
          <div className="mc-triad-s">{decisions.length ? `${decisions.length} decisions waiting on you` : 'No approvals pending'}</div></div>
      </div>

      {/* pulse ring + health signals */}
      <div className="grid cols-2 section-gap">
        <div className="card pad mc-ring-card">
          <div className="card-h"><h3>Enterprise Pulse Ring</h3><span className="spacer" /><span className="badge" style={{ background: 'var(--tint-navy)', color: BAND_TONE[h.pulse.band] }}>Pulse {h.pulse.index}</span></div>
          <div className="mc-ring">
            <ActivityRings rings={h.rings} size={230} />
            <div className="mc-ring-legend">
              {h.rings.map((r) => (
                <div key={r.key} className="mc-ring-row">
                  <span className="mc-ring-dot" style={{ background: r.color }} />
                  <span className="mc-ring-l">{r.label}</span>
                  <span className="mc-ring-v mono">{pct(r.value)}</span>
                  <span className="mc-ring-d">{r.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card pad">
          <div className="card-h"><h3>Enterprise health</h3><span className="spacer" /><button className="btn sm ghost" onClick={() => navigate('pulse')}>Value radar →</button></div>
          <div className="mc-signals">
            {h.signals.map((s) => (
              <div key={s.key} className="mc-sig" style={{ borderLeftColor: SIG_TONE[s.tone] }}>
                <div className="mc-sig-v mono" style={{ color: SIG_TONE[s.tone] }}>{s.value}</div>
                <div className="mc-sig-l">{s.label}{s.key === 'ai' && <InfoDot k="RAV" />}</div>
                <div className="mc-sig-n">{s.note}</div>
              </div>
            ))}
          </div>
          <div className="mc-ai">
            <span className="badge b-navy"><IconAI /> AI confidence {pct(h.aiConfidence)}</span>
            <span className="muted" style={{ fontSize: 12 }}>across {(db.ai_recommendations || []).length} deterministic agent signals</span>
          </div>
        </div>
      </div>

      {/* next best actions */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>What to do next</h3><span className="spacer" /><button className="btn sm ghost" onClick={() => navigate('missions')}>Mission queue →</button><span className="badge b-amber">{decisions.length + recs.length}</span></div>
        <div className="mc-actions">
          {decisions.map((d) => (
            <div key={d.id} className="mc-action">
              <div className="mc-action-main" onClick={() => navigate('initiative', { id: d.id })}>
                <div className="mc-action-t">{d.title}</div>
                <div className="mc-action-m">{d.detail}{d.value ? ` · ${money(d.value)}` : ''}</div>
              </div>
              <button className="btn sm" onClick={() => act(d)}>{d.action === 'approve' ? 'Approve' : 'Open'}</button>
            </div>
          ))}
          {recs.map((r) => (
            <div key={r.id} className="mc-action">
              <div className="mc-action-main" onClick={() => navigate(r.category === 'opportunity' ? 'opportunities' : r.category === 'risk' ? 'sustainment' : 'valueoffice')}>
                <div className="mc-action-t">{r.title}</div>
                <div className="mc-action-m">{r.agent} · {pct(r.confidence)} confidence{r.value_impact ? ` · ${money(r.value_impact)}` : ''}</div>
              </div>
              <span className="badge b-navy" style={{ alignSelf: 'center' }}><IconAI /> AI</span>
            </div>
          ))}
          {decisions.length + recs.length === 0 && <div className="muted" style={{ padding: 8 }}>Nothing needs you right now.</div>}
        </div>
        <div className="mc-jump">
          <button className="btn sm ghost" onClick={() => navigate('chief')}>Chief of Staff →</button>
          <button className="btn sm ghost" onClick={() => navigate('valueoffice')}>Value Office →</button>
          <button className="btn sm ghost" onClick={() => navigate('governance')}>Governance →</button>
          <button className="btn sm ghost" onClick={() => navigate('timeline')}>Timeline →</button>
        </div>
      </div>
    </>
  )
}
