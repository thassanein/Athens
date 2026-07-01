import { useState } from 'react'
import { sustainmentScore, rav, REALIZING_STAGES, personName } from '../lib/engine.js'
import { money, pct, monthLabel } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'

// Sustainment Command Center — does delivered value hold? Trailing-window
// realized-vs-expected (30/90/180/365), erosion curves, confidence, and
// recovery actions. Deterministic, built on the existing sustainment engine.
const WINDOWS = [{ k: 30, label: '30 days', m: 1 }, { k: 90, label: '90 days', m: 3 }, { k: 180, label: '180 days', m: 6 }, { k: 365, label: '365 days', m: 12 }]
const BAND = { strong: 'b-green', watch: 'b-amber', eroding: 'b-red' }

const monthsUpToNow = (db) => {
  const now = db.meta.now.slice(0, 7)
  return db.meta.fyMonths.map((m) => m.slice(0, 7)).filter((m) => m <= now)
}
const validatedIn = (i, mk) => (i.actuals || []).filter((a) => a.validated && a.period.slice(0, 7) === mk).reduce((s, a) => s + a.realized_amount, 0)

function recoveryActions(r) {
  const acts = []
  if (r.i.negotiated_value != null) acts.push('Verify implemented run-rate vs negotiated price — check for contract leakage.')
  if (r.score < 0.5) acts.push('Escalate to owner + FP&A and reforecast the remaining year.')
  else acts.push('Root-cause the monthly shortfall and log a countermeasure.')
  acts.push('Confirm real volume is flowing through the new contract or process.')
  return acts.slice(0, 3)
}

export default function Sustainment({ db, openDrawer, dispatch, user, caps, flash }) {
  const [win, setWin] = useState(90)
  const w = WINDOWS.find((x) => x.k === win)
  const months = monthsUpToNow(db)
  const windowMonths = months.slice(-w.m)

  const realizing = db.initiatives.filter((i) => REALIZING_STAGES.includes(i.stage) || i.stage === 'retired')
  const rows = realizing.map((i) => {
    const monthly = rav(i) / 12
    let realized = 0, expected = 0
    for (const mk of windowMonths) { expected += monthly; realized += validatedIn(i, mk) }
    const score = expected ? Math.min(1.4, realized / expected) : 1
    const band = score >= 0.9 ? 'strong' : score >= 0.7 ? 'watch' : 'eroding'
    const full = sustainmentScore(i, db)
    const trend = full ? score - full.score : 0
    const confidence = Math.max(0.05, Math.min(1, 0.55 + (score - 0.9)))
    return { i, id: i.id, title: i.title, owner: personName(db, i.owner_id), realized, expected, score, band, trend, confidence, erosion: band === 'eroding' }
  }).sort((a, b) => a.score - b.score)

  const avg = rows.length ? rows.reduce((s, r) => s + r.score, 0) / rows.length : 1
  const eroding = rows.filter((r) => r.erosion)
  const atRisk = eroding.reduce((s, r) => s + Math.max(0, r.expected - r.realized), 0)
  const strong = rows.filter((r) => r.band === 'strong').length

  const recover = async (r) => {
    const act = recoveryActions(r)[0]
    await dispatch('addTask', r.id, `Recovery: ${act}`, r.i.owner_id, user.id)
    flash('Recovery task added to the initiative')
  }

  return (
    <>
      <p className="page-intro">Sustainment command center — realized value only counts if it <b>holds</b>. This tracks trailing realized-vs-expected over your chosen window, flags erosion, scores confidence, and turns shortfalls into recovery actions.</p>

      <div className="card-h">
        <div className="seg">
          {WINDOWS.map((x) => <button key={x.k} className={win === x.k ? 'active' : ''} onClick={() => setWin(x.k)}>{x.label}</button>)}
        </div>
        <span className="spacer" />
        <span className="tiny muted">window = trailing {w.label} ({windowMonths.length} month{windowMonths.length === 1 ? '' : 's'})</span>
      </div>

      <div className="tiles section-gap">
        <Tile tone={avg >= 0.9 ? 'green' : avg >= 0.7 ? 'navy' : 'red'} label={`Sustainment (${w.label})`} value={pct(avg)} sub="realized ÷ expected" />
        <Tile tone="red" label="Eroding initiatives" value={eroding.length} sub="below 70% of plan" />
        <Tile tone="red" label="Value slipping" value={money(atRisk)} sub="expected − realized (eroding)" />
        <Tile tone="green" label="Holding strong" value={strong} sub="≥ 90% of plan" />
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>Sustainment book</h3><span className="spacer" /><span className="tiny muted">{rows.length} realizing / sustained initiatives</span></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Initiative</th><th>Owner</th><th>Band</th><th className="num">Realized</th><th className="num">Expected</th><th className="num">vs plan</th><th>Trend</th><th className="num">Confidence</th>{caps.edit && <th></th>}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => openDrawer(r.id)}>
                  <td><b>{r.title}</b></td>
                  <td className="tiny">{r.owner}</td>
                  <td><span className={`badge ${BAND[r.band]}`} style={{ textTransform: 'capitalize' }}>{r.band}</span></td>
                  <td className="num mono">{money(r.realized)}</td>
                  <td className="num mono muted">{money(r.expected)}</td>
                  <td className="num mono" style={{ color: r.score >= 0.9 ? 'var(--green)' : r.score >= 0.7 ? 'var(--amber)' : 'var(--red)' }}>{pct(r.score)}</td>
                  <td className="tiny" style={{ color: r.trend >= 0.02 ? 'var(--green)' : r.trend <= -0.02 ? 'var(--red)' : 'var(--grey)' }}>{r.trend >= 0.02 ? '▲ improving' : r.trend <= -0.02 ? '▼ worsening' : '— steady'}</td>
                  <td className="num"><ConfBar v={r.confidence} /></td>
                  {caps.edit && <td onClick={(e) => e.stopPropagation()}>{r.erosion && <button className="btn accent sm" onClick={() => recover(r)}>Recover</button>}</td>}
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={caps.edit ? 9 : 8} className="muted">No realizing initiatives in scope.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-h section-gap"><h3>Erosion watch</h3><span className="spacer" /><span className={`badge ${eroding.length ? 'b-red' : 'b-green'}`}>{eroding.length} eroding</span></div>
      {eroding.length === 0 ? (
        <div className="card pad muted">Nothing is eroding in this window — delivered value is holding. 🎯</div>
      ) : (
        <div className="grid cols-2">
          {eroding.map((r) => (
            <div key={r.id} className="card pad">
              <div className="card-h"><h3 style={{ fontSize: 13.5 }}>{r.title}</h3><span className="spacer" /><span className="badge b-red">{pct(r.score)} of plan</span></div>
              <ErosionCurve i={r.i} db={db} />
              <div className="label section-gap">Recovery actions</div>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
                {recoveryActions(r).map((a, k) => <li key={k}>{a}</li>)}
              </ul>
              <div className="btn-row section-gap">
                <button className="btn sm" onClick={() => openDrawer(r.id)}>Open initiative</button>
                {caps.edit && <button className="btn accent sm" onClick={() => recover(r)}>Add recovery task</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="tiny muted section-gap">Confidence blends how far realized value tracks plan with the trailing trend. Recovery actions are rules-based prompts — a real recovery is logged as a task on the initiative and validated by FP&A.</p>
    </>
  )
}

function ConfBar({ v }) {
  const c = v >= 0.66 ? 'var(--green)' : v >= 0.4 ? 'var(--amber)' : 'var(--red)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
      <span style={{ width: 46, height: 6, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: `${v * 100}%`, background: c }} /></span>
      <span className="tiny mono" style={{ color: c }}>{pct(v)}</span>
    </span>
  )
}

// Cumulative realized vs expected across the fiscal year (to date).
function ErosionCurve({ i, db, height = 120 }) {
  const months = monthsUpToNow(db)
  const monthly = rav(i) / 12
  let ce = 0, ca = 0
  const pts = months.map((mk) => { ce += monthly; ca += (i.actuals || []).filter((a) => a.validated && a.period.slice(0, 7) === mk).reduce((s, a) => s + a.realized_amount, 0); return { mk, exp: ce, act: ca } })
  const W = 340, H = height, padL = 6, padR = 6, padT = 10, padB = 20
  const maxY = Math.max(1, ...pts.map((p) => Math.max(p.exp, p.act)))
  const n = pts.length
  const x = (idx) => padL + (idx / Math.max(1, n - 1)) * (W - padL - padR)
  const y = (v) => padT + (1 - v / maxY) * (H - padT - padB)
  const path = (key, color) => <polyline className="line-fade" points={pts.map((p, idx) => `${x(idx)},${y(p[key])}`).join(' ')} fill="none" stroke={color} strokeWidth="2" />
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      <polygon className="line-fade" points={`${pts.map((p, idx) => `${x(idx)},${y(p.exp)}`).join(' ')} ${pts.map((p, idx) => `${x(n - 1 - idx)},${y(pts[n - 1 - idx].act)}`).join(' ')}`} fill="var(--tint-red)" stroke="none" />
      {path('exp', 'var(--grey-2)')}
      {path('act', 'var(--red)')}
      <text x={padL} y={H - 6} fontSize="9" fill="var(--grey)">{monthLabel(pts[0]?.mk)}</text>
      <text x={W - padR} y={H - 6} fontSize="9" fill="var(--grey)" textAnchor="end">{monthLabel(pts[n - 1]?.mk)}</text>
      <text x={W - padR} y={y(pts[n - 1]?.act) - 4} fontSize="9" fill="var(--red)" textAnchor="end">actual</text>
      <text x={W - padR} y={y(pts[n - 1]?.exp) - 4} fontSize="9" fill="var(--grey-2)" textAnchor="end">plan</text>
    </svg>
  )
}
