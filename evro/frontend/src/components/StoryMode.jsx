import { useEffect, useMemo, useState } from 'react'
import { storyBeats, AUDIENCES, PERIODS } from '../lib/story.js'
import { exportBoardPacket } from '../lib/board-packet.js'
import { AnimatedValue } from './ui.jsx'
import { IconClose } from './Icons.jsx'

// Executive Story Mode — a full-screen, keyboard-navigable presenter that walks
// the FY value narrative. Deterministic; reads the same engine outputs the
// cockpit does. Audience + period reframe the story; the same beats export to a
// .pptx board packet. Arrow keys / space advance; Esc exits.
const TONEV = { green: 'var(--green)', navy: 'var(--navy)', red: 'var(--red)', amber: 'var(--amber)', opp: 'var(--opp)', grey: '#cfd6e0' }

export default function StoryMode({ db, user, onClose }) {
  const [audience, setAudience] = useState('board')
  const [period, setPeriod] = useState('fy')
  const [k, setK] = useState(0)
  const [busy, setBusy] = useState(false)
  const slides = useMemo(() => storyBeats(db, { audience, period, user }), [db, audience, period, user])
  useEffect(() => { setK(0) }, [audience, period])

  const clamp = Math.min(k, slides.length - 1)
  const next = () => setK((v) => Math.min(slides.length - 1, v + 1))
  const prev = () => setK((v) => Math.max(0, v - 1))
  useEffect(() => {
    const onKey = (e) => {
      const onCtl = e.target && e.target.closest && e.target.closest('button,select,input')
      if (e.key === 'ArrowRight' || (e.key === ' ' && !onCtl)) { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slides.length])

  const exportPacket = async () => {
    setBusy(true)
    try { await exportBoardPacket(db, { audience, period, user }) }
    catch (e) { alert('Board packet export failed — ' + (e?.message || 'unknown error')) }
    finally { setBusy(false) }
  }

  const s = slides[clamp]
  const color = TONEV[s.tone] || '#fff'
  const al = (i) => (s.table?.align?.[i] === 'r' ? 'num' : '')

  return (
    <div className="story" role="dialog" aria-label="Executive story mode">
      <div className="story-top">
        <span className="badge b-red">Story mode</span>
        <span className="story-sub hide-sm">Value narrative · rules-based</span>
        <span style={{ flex: 1 }} />
        <div className="story-seg" role="group" aria-label="Audience">
          {AUDIENCES.map((a) => <button key={a.key} className={audience === a.key ? 'active' : ''} onClick={() => setAudience(a.key)} title={a.blurb}>{a.label}</button>)}
        </div>
        <div className="story-seg" role="group" aria-label="Period">
          {PERIODS.map((p) => <button key={p.key} className={period === p.key ? 'active' : ''} onClick={() => setPeriod(p.key)} title={p.blurb}>{p.label}</button>)}
        </div>
        <button className="btn sm accent" onClick={exportPacket} disabled={busy} title="Export this narrative as a PowerPoint board packet">{busy ? 'Building…' : '⤓ .pptx'}</button>
        <button className="iconbtn" onClick={onClose} aria-label="Exit story mode" style={{ color: '#fff' }}><IconClose /></button>
      </div>

      <div className="story-body">
        <div key={clamp} className={`story-slide ${s.table ? 'has-table' : ''}`}>
          <div className="story-kicker">{s.lbl}</div>
          <h1>{s.title}</h1>
          {s.big != null && <div className="big" style={{ color, marginTop: 6 }}><AnimatedValue value={s.big} /></div>}
          {s.cap && <div className="lead story-cap">{s.cap}</div>}
          {s.sub && <p className="lead story-narr">{s.sub}</p>}
          {s.bullets?.length > 0 && <ul className="story-bullets">{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
          {s.table && (
            <div className="story-tablewrap">
              <table className="tbl story-tbl">
                <thead><tr>{s.table.cols.map((c, i) => <th key={i} className={al(i)}>{c}</th>)}</tr></thead>
                <tbody>{s.table.rows.map((r, ri) => <tr key={ri}>{r.map((cell, ci) => <td key={ci} className={al(ci) ? 'num mono' : ''}>{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="story-nav">
        <button className="btn" onClick={prev} disabled={clamp === 0}>← Back</button>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {slides.map((_, i) => <button key={i} onClick={() => setK(i)} aria-label={`Slide ${i + 1}`} className="story-dot" style={{ background: i === clamp ? 'var(--red)' : 'rgba(255,255,255,0.28)' }} />)}
        </div>
        <span style={{ flex: 1 }} />
        <span className="story-sub" style={{ marginRight: 6 }}>{clamp + 1} / {slides.length}</span>
        {clamp < slides.length - 1 ? <button className="btn accent" onClick={next}>Next →</button> : <button className="btn accent" onClick={onClose}>Done</button>}
      </div>
    </div>
  )
}
