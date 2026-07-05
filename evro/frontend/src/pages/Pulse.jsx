import { useEffect, useState } from 'react'
import { enterprisePulse, axisNote } from '../lib/pulse.js'
import {
  pendingApprovalsFor, canApproveRoles, ROLE_APPROVE_LABEL,
  sizedOpportunities, personName, groupName, rav,
} from '../lib/engine.js'
import { OPERATING_MODES, defaultModeFor, companionBrief, strategicNarratives } from '../lib/companion.js'
import { aiRecommendations } from '../lib/model.js'
import { money, pct } from '../lib/format.js'
import { Tile, Bar, RagBadge } from '../components/ui.jsx'
import { Radar } from '../components/Charts.jsx'
import { IconAI } from '../components/Icons.jsx'

// Executive Cockpit / Enterprise Pulse (5B.3) — the leadership command center.
// Enterprise Pulse header + Value Radar + decision queue + top opportunities &
// risks, reframed by an operating lens (CEO/CFO/COO/Operations/Procurement).
// Presentation only: one-click approve calls the EXISTING approveRequest
// mutation; nothing here changes the engine.

const BAND_TONE = { strong: 'var(--green)', steady: 'var(--navy)', fragile: 'var(--red)' }
const BAND_LABEL = { strong: 'Strong', steady: 'Steady', fragile: 'Fragile' }

export default function Pulse({ db, user, dispatch, navigate, flash }) {
  const [mode, setMode] = useState(defaultModeFor(user.role))
  const [narr, setNarr] = useState(0)
  const pulse = enterprisePulse(db)
  const brief = companionBrief(db, user, mode)
  const narratives = strategicNarratives(db)
  const pending = pendingApprovalsFor(db, user)
  const recos = aiRecommendations(db, { status: 'open' })
  const opps = sizedOpportunities(db).filter((o) => o.status === 'open' || o.status === 'in_flight').sort((a, b) => b.midpoint - a.midpoint).slice(0, 5)
  const risks = pulse.roll.topRisks

  useEffect(() => {
    if (narratives.length < 2) return
    const t = setInterval(() => setNarr((n) => (n + 1) % narratives.length), 4200)
    return () => clearInterval(t)
  }, [narratives.length])

  const approve = async (i) => {
    const roles = canApproveRoles(user, i)
    const r = await dispatch('approveRequest', i.id, user.id)
    if (!r?.error) flash(`Approved as ${roles.map((x) => ROLE_APPROVE_LABEL[x]).join(', ')}`)
    else flash(r.error)
  }

  return (
    <>
      <p className="page-intro">
        <b>Enterprise Pulse</b> — the leadership command center. One read on the health
        of enterprise value, the decisions waiting on you, and where the next return
        sits. Switch the operating lens to reframe emphasis for your seat.
      </p>

      {/* operating lens */}
      <div className="card pad">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3>Operating lens</h3>
          <span className="spacer" />
          <div className="seg">
            {OPERATING_MODES.map((m) => (
              <button key={m.key} className={mode === m.key ? 'active' : ''} onClick={() => setMode(m.key)}>{m.label}</button>
            ))}
          </div>
        </div>
        {/* AI-generated (deterministic) briefing strip */}
        <div className="pulse-brief">
          <div className="pulse-brief-metric">
            <div className="t-label">{brief.metric.label}</div>
            <div className="pulse-brief-val mono">{brief.metric.value}</div>
            <div className="t-sub">{brief.metric.sub}</div>
          </div>
          {brief.rec && (
            <div className="pulse-brief-reco">
              <span className="badge b-navy"><IconAI /> Deterministic briefing</span>
              <div className="pulse-brief-reco-t">{brief.rec.title}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{brief.rec.body}</div>
            </div>
          )}
        </div>
        {/* rotating narrative strip */}
        {narratives.length > 0 && <div className="pulse-narr" key={narr}>“{narratives[narr]}”</div>}
      </div>

      {/* pulse index + value radar + decision queue */}
      <div className="grid cols-3 section-gap">
        <div className="card pad pulse-index">
          <div className="card-h"><h3>Pulse index</h3></div>
          <div className="pulse-gauge" style={{ color: BAND_TONE[pulse.band] }}>
            <div className="pulse-num mono">{pulse.index}</div>
            <div className="pulse-band">{BAND_LABEL[pulse.band]}</div>
          </div>
          <Bar value={pulse.index} max={100} color={BAND_TONE[pulse.band]} height={10} />
          <div className="pulse-axes">
            {pulse.axes.map((a) => (
              <div key={a.key} className="pulse-axis" title={axisNote(a.key)}>
                <span className="pulse-axis-l">{a.label}</span>
                <span className="pulse-axis-b"><Bar value={a.value} max={1} color={BAND_TONE[pulse.band]} height={6} /></span>
                <span className="pulse-axis-v mono">{pct(a.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card pad">
          <div className="card-h"><h3>Value radar</h3><span className="spacer" /><span className="badge b-grey">6 dimensions</span></div>
          <Radar axes={pulse.axes} color={BAND_TONE[pulse.band]} size={220} />
          <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 4 }}>Enterprise value health across realization, coverage, momentum, risk, spread & durability.</p>
        </div>

        <div className="card pad">
          <div className="card-h"><h3>Decision queue</h3><span className="spacer" /><span className="badge b-amber">{pending.length + recos.length}</span></div>
          <div className="pulse-queue">
            {pending.length === 0 && recos.length === 0 && <div className="muted" style={{ padding: '10px 0' }}>Nothing waiting on you. 🎉</div>}
            {pending.map((i) => (
              <div key={i.id} className="pulse-q-row">
                <div className="pulse-q-main" onClick={() => navigate('initiative', { id: i.id })}>
                  <div className="pulse-q-t">{i.title}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>Approval · {canApproveRoles(user, i).map((x) => ROLE_APPROVE_LABEL[x]).join(', ')} · {money(rav(i))} RAV</div>
                </div>
                <button className="btn sm" onClick={() => approve(i)}>Approve</button>
              </div>
            ))}
            {recos.map((r) => (
              <div key={r.id} className="pulse-q-row">
                <div className="pulse-q-main" onClick={() => navigate(r.category === 'opportunity' ? 'opportunities' : r.category === 'risk' ? 'sustainment' : 'valueoffice')}>
                  <div className="pulse-q-t">{r.title}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{r.agent} · {pct(r.confidence)} confidence{r.value_impact ? ` · ${money(r.value_impact)}` : ''}</div>
                </div>
                <span className="badge b-navy" style={{ alignSelf: 'center' }}>AI</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* top opportunities + top risks */}
      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Top opportunities</h3><span className="spacer" /><button className="btn sm ghost" onClick={() => navigate('opportunities')}>Board →</button></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Opportunity</th><th>Lever</th><th className="num">Midpoint</th><th className="num">Attractive</th></tr></thead>
              <tbody>
                {opps.map((o) => (
                  <tr key={o.id} className="clickable" onClick={() => navigate('opportunities')}>
                    <td><b>{o.groupName || groupName(db, o.group_id)}</b></td>
                    <td className="nowrap">{o.lever}</td>
                    <td className="num mono">{money(o.midpoint)}</td>
                    <td className="num mono">{o.attractiveness}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Top risks</h3><span className="spacer" /><button className="btn sm ghost" onClick={() => navigate('sustainment')}>Sustainment →</button></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Risk</th><th>Initiative</th><th className="num">Score</th><th>Status</th></tr></thead>
              <tbody>
                {risks.map((r, k) => (
                  <tr key={k} className="clickable" onClick={() => navigate('initiative', { id: r.initiative })}>
                    <td style={{ textTransform: 'capitalize' }}><b>{r.category}</b></td>
                    <td className="nowrap">{r.title}</td>
                    <td className="num mono">{r.score}</td>
                    <td><span className={`badge ${r.score >= 15 ? 'b-red' : r.score >= 8 ? 'b-amber' : 'b-grey'}`} style={{ textTransform: 'capitalize' }}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
