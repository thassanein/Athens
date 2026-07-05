import { useState } from 'react'
import { ownershipBoard, escalationTarget, OWNER_DIMS } from '../lib/ownership.js'
import { money, pct } from '../lib/format.js'
import { Tile, Bar, Avatar } from '../components/ui.jsx'

// Ownership & Accountability (5B.6 item 4) — who owns the value, how it is
// moving, and where to escalate. Escalation posts a real comment (with an
// @mention to the function leader) on the group's largest red/leaking
// initiative via the EXISTING addComment mutation — audit-logged, traceable.

export default function Accountability({ db, user, caps, dispatch, navigate, flash }) {
  const [dim, setDim] = useState('owner')
  const board = ownershipBoard(db, dim)
  const leader = db.people.find((p) => p.role === 'leader')

  const escalate = async (g) => {
    const target = escalationTarget(db, g)
    if (!target) return flash('Nothing to escalate in this group.')
    const first = (leader?.name || '').split(' ')[0]
    const text = `Escalation: ${g.label} — ${money(g.atStake)} at stake, ${g.red} red, ${money(g.leaking)} leaking. ${first ? `@${first} ` : ''}please review "${target.title}".`
    const r = await dispatch('addComment', target.id, text, user.id)
    if (!r?.error) flash(`Escalated on "${target.title}"${leader ? ` — ${leader.name} mentioned` : ''}`)
  }

  return (
    <>
      <p className="page-intro">
        <b>Ownership & Accountability</b> — every dollar of value has a name on it. Group
        the live portfolio by owner, business unit, region, or function; track realization
        progress, exposure, aging, and approval hygiene; escalate where it stalls.
      </p>

      <div className="grid cols-4">
        <Tile label="Value under ownership" value={money(board.totals.atStake)} sub="risk-adjusted, active" tone="navy" />
        <Tile label="Red initiatives" value={String(board.totals.red)} sub="need a countermeasure" tone={board.totals.red ? 'red' : 'green'} />
        <Tile label="Leaking vs plan" value={money(board.totals.leaking)} sub="negotiated, not landing" tone="red" />
        <Tile label="Escalations raised" value={String(board.totals.escalations)} sub="on the record, traceable" tone="dark" />
      </div>

      <div className="card pad section-gap">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3>Accountability board</h3>
          <span className="spacer" />
          <div className="seg">
            {OWNER_DIMS.map((d) => (
              <button key={d.key} className={dim === d.key ? 'active' : ''} onClick={() => setDim(d.key)}>{d.label}</button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="tbl own-tbl">
            <thead>
              <tr>
                <th>{OWNER_DIMS.find((d) => d.key === dim)?.label}</th>
                <th className="num">Items</th>
                <th className="num">At stake</th>
                <th style={{ minWidth: 150 }}>Realization</th>
                <th className="num">Red</th>
                <th className="num">Leaking</th>
                <th className="num">Awaiting gate</th>
                <th className="num">Red age</th>
                <th className="num">Hygiene</th>
                <th className="num">Esc.</th>
                {caps?.edit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {board.rows.map((g) => (
                <tr key={g.key}>
                  <td className="nowrap">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {g.ownerId && <Avatar name={g.label} />}<b>{g.label}</b>
                    </span>
                  </td>
                  <td className="num">{g.count}</td>
                  <td className="num mono"><b>{money(g.atStake)}</b></td>
                  <td>
                    <div className="own-prog">
                      <Bar value={g.progress} max={1} color="var(--green)" height={7} />
                      <span className="own-prog-l mono">{money(g.realized)} / {money(g.totalFY)}</span>
                    </div>
                  </td>
                  <td className="num">{g.red > 0 ? <span className="badge b-red">{g.red}</span> : <span className="muted">—</span>}</td>
                  <td className="num mono">{g.leaking > 0 ? money(g.leaking) : <span className="muted">—</span>}</td>
                  <td className="num">{g.pending || <span className="muted">—</span>}</td>
                  <td className="num">{g.avgRedAge != null ? `${g.avgRedAge}d` : <span className="muted">—</span>}</td>
                  <td className="num mono" title="Share of monthly actuals FP&A-validated">{g.hygiene != null ? pct(g.hygiene) : <span className="muted">—</span>}</td>
                  <td className="num">{g.escalations || <span className="muted">—</span>}</td>
                  {caps?.edit && (
                    <td className="num">
                      <button className="btn sm" onClick={() => escalate(g)} disabled={!g.red && !g.leaking} title={g.red || g.leaking ? 'Post an escalation comment on the largest red/leaking item' : 'Nothing red or leaking here'}>Escalate</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
          Hygiene = share of monthly actuals FP&A-validated. Escalate posts a traceable comment (with an @mention to the function leader) on the group's largest red or leaking initiative — it lands in the workspace, the audit log, and this board's Esc. count.
        </p>
      </div>
    </>
  )
}
