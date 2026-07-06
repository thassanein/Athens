import { useMemo, useState } from 'react'
import { missionQueue, missionWhy, MISSION_CLASSES } from '../lib/mission.js'
import { missionProfile, missionCeremony } from '../lib/mission-engine.js'
import { canApproveRoles, ROLE_APPROVE_LABEL } from '../lib/engine.js'
import { money, pct } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { IconAI } from '../components/Icons.jsx'

// Mission Queue (5B.5 item 4; intelligence layer 5B.6 item 3) — everything the
// enterprise needs a human for, classified and ranked by value impact. Every
// mission can explain its rank ("Why #N?"), shows urgency/aging/escalation,
// and initiative-backed missions can be DELEGATED — a real task on the record
// via the existing addTask mutation. Presentation only.

const CLS = Object.fromEntries(MISSION_CLASSES.map((c) => [c.key, c]))
const URG_TONE = { Now: 'var(--red)', 'This week': 'var(--amber)', 'This month': 'var(--navy)', 'This quarter': 'var(--grey)' }

export default function MissionQueue({ db, user, caps, dispatch, navigate, flash }) {
  const [view, setView] = useState('ranked') // ranked | class
  const [whyKey, setWhyKey] = useState(null)
  const [delKey, setDelKey] = useState(null)
  const [ceremony, setCeremony] = useState(null) // completion ceremony (6B item 5)
  const q = useMemo(() => missionQueue(db, user), [db, user])
  const assignables = db.people.filter((p) => ['owner', 'procurement', 'leader', 'admin'].includes(p.role))

  const act = async (m) => {
    if (m.action === 'approve') {
      const i = db.initiatives.find((x) => x.id === m.refId)
      const roles = i ? canApproveRoles(user, i) : []
      const r = await dispatch('approveRequest', m.refId, user.id)
      if (!r?.error) {
        flash(roles.length ? `Approved as ${roles.map((x) => ROLE_APPROVE_LABEL[x]).join(', ')}` : 'Approved')
        setCeremony(missionCeremony(db, m))
      }
    } else if (m.action === 'navigate') {
      navigate(m.nav || 'valueoffice')
    } else if (m.refId && String(m.refId).startsWith('i-')) {
      navigate('initiative', { id: m.refId })
    } else {
      navigate('valueoffice')
    }
  }

  const delegate = async (m, assigneeId) => {
    const r = await dispatch('addTask', m.refId, `Mission: ${m.title} — ${m.why}`, assigneeId, user.id)
    setDelKey(null)
    if (!r?.error) flash(`Delegated to ${db.people.find((p) => p.id === assigneeId)?.name} — task on the record`)
  }

  const MissionRow = ({ m, rank }) => {
    const c = CLS[m.cls]
    const t = m.intel || {}
    const open = whyKey === m.key
    const canDelegate = caps?.edit && m.refId && String(m.refId).startsWith('i-')
    const prof = missionProfile(db, m)
    return (
      <div className={`mq-wrap ${open ? 'open' : ''}`}>
        <div className="mq-row" style={{ borderLeftColor: c.tone }}>
          {rank != null && <span className="mq-rank mono">{rank}</span>}
          <div className="mq-main" onClick={() => act({ ...m, action: m.action === 'approve' ? 'open' : m.action })}>
            <div className="mq-t">{m.title}{t.escalated && <span className="badge b-red" style={{ marginLeft: 6 }}>escalated</span>}</div>
            <div className="mq-why">{m.why}{t.ageDays != null ? ` · ${t.ageDays}d old` : ''}</div>
            <div className="mq-prof">
              <span style={{ color: prof.difficulty.tone }} title={`Difficulty: ${prof.difficulty.why.join(' · ')}`}>{prof.difficulty.label}</span>
              <span title="Deterministic completion estimate — confidence × risk × dependencies">{pct(prof.probability)} likely</span>
              <span title={`Strategic weight: ${prof.weightWhy.join(' · ')}`}>{'★'.repeat(prof.weight)}<i>{'★'.repeat(5 - prof.weight)}</i></span>
              <span style={{ color: prof.progression.tone }}>{prof.progression.label}</span>
            </div>
          </div>
          <span className="mq-urg" style={{ color: URG_TONE[t.urgency] }}>{t.urgency}</span>
          <span className="mq-cls" style={{ color: c.tone, background: `color-mix(in srgb, ${c.tone} 14%, transparent)` }}>
            {m.cls === 'ai' && <IconAI />} {c.label}
          </span>
          {m.value > 0 && <span className="mq-val mono">{money(m.value)}</span>}
          <button className="mq-whybtn" onClick={() => { setWhyKey(open ? null : m.key); setDelKey(null) }} aria-expanded={open} title="Why is this ranked here?">why?</button>
          {canDelegate && <button className="btn sm ghost" onClick={() => { setDelKey(delKey === m.key ? null : m.key); setWhyKey(null) }}>Delegate</button>}
          <button className="btn sm" onClick={() => act(m)}>{m.action === 'approve' ? 'Approve' : m.action === 'navigate' ? 'View' : 'Open'}</button>
        </div>
        {open && (
          <div className="mq-explain">
            <b>Why {rank != null ? `#${rank}` : 'here'}?</b>
            <ul>{missionWhy(m, rank ?? '—', q.missions.length).map((p, k) => <li key={k}>{p}</li>)}</ul>
            {(t.deps || []).map((d, k) => <div key={k} className="mq-dep">⛓ {d}</div>)}
          </div>
        )}
        {delKey === m.key && (
          <div className="mq-explain">
            <b>Delegate this mission</b>
            <div className="mq-del">
              {assignables.map((p) => (
                <button key={p.id} className="btn sm" onClick={() => delegate(m, p.id)}>{p.name}</button>
              ))}
            </div>
            <span className="muted" style={{ fontSize: 11 }}>Creates a task on the initiative via the existing workflow — visible in its workspace and the audit log.</span>
          </div>
        )}
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

        {ceremony && (
          <div className="mq-ceremony fx-expand" style={{ '--fx-accent': 'var(--green)' }}>
            <span className="mq-cer-i fx-glow">✓</span>
            <div className="mq-cer-main">
              <b>{ceremony.headline}</b>
              <span>{ceremony.title}{ceremony.value > 0 ? ` — ${money(ceremony.value)}` : ''} · {ceremony.detail}</span>
            </div>
            <button className="btn sm ghost" onClick={() => setCeremony(null)}>Dismiss</button>
          </div>
        )}

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
