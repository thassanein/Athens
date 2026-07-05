import { useState } from 'react'
import { missionQueue, MISSION_CLASSES } from '../lib/mission.js'
import { canApproveRoles, ROLE_APPROVE_LABEL } from '../lib/engine.js'
import { money } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { IconAI } from '../components/Icons.jsx'

// Mission Queue (5B.5 item 4) — the traditional approval queue, reimagined:
// everything the enterprise needs a human for, classified into five mission
// types and ranked by enterprise value impact. Presentation only: Approve
// dispatches the existing approveRequest mutation; everything else navigates.

const CLS = Object.fromEntries(MISSION_CLASSES.map((c) => [c.key, c]))

export default function MissionQueue({ db, user, dispatch, navigate, flash }) {
  const [view, setView] = useState('ranked') // ranked | class
  const q = missionQueue(db, user)

  const act = async (m) => {
    if (m.action === 'approve') {
      const i = db.initiatives.find((x) => x.id === m.refId)
      const roles = i ? canApproveRoles(user, i) : []
      const r = await dispatch('approveRequest', m.refId, user.id)
      if (!r?.error) flash(roles.length ? `Approved as ${roles.map((x) => ROLE_APPROVE_LABEL[x]).join(', ')}` : 'Approved')
    } else if (m.action === 'navigate') {
      navigate(m.nav || 'valueoffice')
    } else if (m.refId && String(m.refId).startsWith('i-')) {
      navigate('initiative', { id: m.refId })
    } else {
      navigate('valueoffice')
    }
  }

  const MissionRow = ({ m, rank }) => {
    const c = CLS[m.cls]
    return (
      <div className="mq-row" style={{ borderLeftColor: c.tone }}>
        {rank != null && <span className="mq-rank mono">{rank}</span>}
        <div className="mq-main" onClick={() => act({ ...m, action: m.action === 'approve' ? 'open' : m.action })}>
          <div className="mq-t">{m.title}</div>
          <div className="mq-why">{m.why}</div>
        </div>
        <span className="mq-cls" style={{ color: c.tone, background: `color-mix(in srgb, ${c.tone} 14%, transparent)` }}>
          {m.cls === 'ai' && <IconAI />} {c.label}
        </span>
        {m.value > 0 && <span className="mq-val mono">{money(m.value)}</span>}
        <button className="btn sm" onClick={() => act(m)}>{m.action === 'approve' ? 'Approve' : m.action === 'navigate' ? 'View' : 'Open'}</button>
      </div>
    )
  }

  return (
    <>
      <p className="page-intro">
        The <b>Mission Queue</b> — everything the enterprise needs a human for, in one
        ranked list. Not an approval inbox: each mission is classified (decision,
        opportunity, risk, AI signal, blocked execution) and ranked by <b>value impact</b>,
        so the biggest dollar always sits on top.
      </p>

      <div className="grid cols-4">
        <Tile label="Open missions" value={String(q.missions.length)} sub="across 5 classes" tone="dark" />
        <Tile label="Value at stake" value={money(q.totalValue)} sub="sum of mission impact" tone="navy" />
        <Tile label="Decisions on you" value={String(q.counts.decision)} sub="one-click approve" tone={q.counts.decision ? 'amber' : 'green'} />
        <Tile label="Blocked execution" value={String(q.counts.blocked)} sub="value stuck behind a gate" tone={q.counts.blocked ? 'red' : 'green'} />
      </div>

      <div className="card pad section-gap">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3>Missions</h3>
          <span className="spacer" />
          <div className="mq-legend">
            {MISSION_CLASSES.map((c) => (
              <span key={c.key} className="mq-leg" title={c.hint}><span className="mq-leg-dot" style={{ background: c.tone }} />{q.counts[c.key]}</span>
            ))}
          </div>
          <div className="seg">
            <button className={view === 'ranked' ? 'active' : ''} onClick={() => setView('ranked')}>Ranked by value</button>
            <button className={view === 'class' ? 'active' : ''} onClick={() => setView('class')}>By class</button>
          </div>
        </div>

        {q.missions.length === 0 && <div className="muted" style={{ padding: 8 }}>Queue is clear — nothing needs a human right now.</div>}

        {view === 'ranked' && (
          <div className="mq-list">
            {q.missions.map((m, k) => <MissionRow key={m.key} m={m} rank={k + 1} />)}
          </div>
        )}

        {view === 'class' && MISSION_CLASSES.map((c) => (
          q.byClass[c.key].length > 0 && (
            <div key={c.key} className="mq-lane">
              <div className="mq-lane-h">
                <span className="mq-leg-dot" style={{ background: c.tone }} />
                <b>{c.label}</b>
                <span className="muted" style={{ fontSize: 12 }}>· {c.hint}</span>
                <span className="spacer" />
                <span className="badge b-grey">{q.byClass[c.key].length} · {money(q.byClass[c.key].reduce((a, m) => a + m.value, 0))}</span>
              </div>
              <div className="mq-list">
                {q.byClass[c.key].map((m) => <MissionRow key={m.key} m={m} />)}
              </div>
            </div>
          )
        ))}
      </div>
    </>
  )
}
