import { useEffect, useMemo, useState } from 'react'
import { storyBeats, storyChapters, AUDIENCES, PERIODS } from '../lib/story.js'
import { exportBoardPacket } from '../lib/board-packet.js'
import { AnimatedValue } from './ui.jsx'
import { IconClose } from './Icons.jsx'

// Executive Story Mode 2.0 — a cinematic, full-screen CEO operating-review
// presenter. Deterministic; reads the same engine outputs the cockpit does.
// Audience + period reframe the story; chapters + presenter notes give it an
// operating-review arc; Present auto-plays it; the same beats export to a .pptx
// board packet with section dividers and speaker notes.
// →/Space advance · ← back · P present/pause · N notes · Esc exit.
const TONEV = { green: 'var(--green)', navy: 'var(--navy)', red: 'var(--red)', amber: 'var(--amber)', opp: 'var(--opp)', grey: '#cfd6e0' }
const TONE_TINT = { green: 'rgba(63,201,127,0.16)', navy: 'rgba(79,141,242,0.18)', red: 'rgba(229,36,59,0.17)', amber: 'rgba(242,178,62,0.15)', opp: 'rgba(168,116,245,0.17)', grey: 'rgba(255,255,255,0.06)' }
const STEP_MS = 6500

export default function StoryMode({ db, user, onClose }) {
  const [audience, setAudience] = useState('board')
  const [period, setPeriod] = useState('fy')
  const [k, setK] = useState(0)
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const slides = useMemo(() => storyBeats(db, { audience, period, user }), [db, audience, period, user])
  const chapters = useMemo(() => storyChapters(slides), [slides])
  useEffect(() => { setK(0) }, [audience, period])

  const clamp = Math.min(k, slides.length - 1)
  const next = () => setK((v) => Math.min(slides.length - 1, v + 1))
  const prev = () => setK((v) => Math.max(0, v - 1))

  // cinematic auto-play
  useEffect(() => {
    if (!playing) return undefined
    const t = setInterval(() => setK((v) => (v >= slides.length - 1 ? v : v + 1)), STEP_MS)
    return () => clearInterval(t)
  }, [playing, slides.length])
  useEffect(() => { if (playing && clamp >= slides.length - 1) setPlaying(false) }, [playing, clamp, slides.length])

  useEffect(() => {
    const onKey = (e) => {
      const onCtl = e.target && e.target.closest && e.target.closest('button,select,input')
      if (e.key === 'ArrowRight' || (e.key === ' ' && !onCtl)) { e.preventDefault(); next() }
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') onClose()
      else if (!onCtl && (e.key === 'n' || e.key === 'N')) setShowNotes((s) => !s)
      else if (!onCtl && (e.key === 'p' || e.key === 'P')) setPlaying((p) => !p)
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
  const act = chapters.findIndex((c) => clamp >= c.start && clamp <= c.end)

  return (
    <div className={`story ${playing ? 'presenting' : ''}`} role="dialog" aria-label="Executive story mode"
      style={{ background: `radial-gradient(72% 60% at 50% 22%, ${TONE_TINT[s.tone] || TONE_TINT.grey}, transparent 70%), linear-gradient(160deg, #1a2736, #0f1828)` }}>
      <div className="story-progress"><i style={{ width: `${((clamp + 1) / slides.length) * 100}%` }} /></div>

      <div className="story-top">
        <span className="badge b-red">Story mode 2.0</span>
        <span className="story-sub hide-sm">{s.chapter} · Act {act + 1} of {chapters.length}</span>
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
          <div className="story-chip">{s.chapter}</div>
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

      {showNotes && (
        <div className="story-notes">
          <span className="badge b-grey">Presenter</span>
          <p>{s.note}</p>
        </div>
      )}

      <div className="story-nav">
        <button className="btn sm" onClick={() => setPlaying((p) => !p)} title="Present (P)">{playing ? '⏸ Pause' : '▶ Present'}</button>
        <button className={`btn sm ${showNotes ? 'accent' : ''}`} onClick={() => setShowNotes((v) => !v)} title="Presenter notes (N)">Notes</button>
        <button className="btn" onClick={prev} disabled={clamp === 0}>← Back</button>
        <div className="story-dots">
          {slides.map((_, i) => <button key={i} onClick={() => setK(i)} aria-label={`Slide ${i + 1}`} className="story-dot" style={{ background: i === clamp ? 'var(--red)' : 'rgba(255,255,255,0.28)' }} />)}
        </div>
        <span style={{ flex: 1 }} />
        <span className="story-sub" style={{ marginRight: 6 }}>{clamp + 1} / {slides.length}</span>
        {clamp < slides.length - 1 ? <button className="btn accent" onClick={next}>Next →</button> : <button className="btn accent" onClick={onClose}>Done</button>}
      </div>
    </div>
  )
}
