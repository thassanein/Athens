import { useEffect, useMemo, useRef, useState } from 'react'
import { playbackModel } from '../lib/intel.js'
import { money, monthLabel } from '../lib/format.js'

// Enterprise Pulse Playback (5B.7 item 2) — scrub or replay the fiscal year
// like a market replay: value created, value lost to timing, decisions,
// actions and health per period, with pinnable milestones (A/B) for strategic
// reviews. Months beyond today are a labelled forecast preview, not history.

const KIND_DOT = { realized: 'var(--green)', approval: 'var(--navy)', journal: 'var(--amber)', decision: 'var(--grey-2)' }

export default function PulsePlayback({ db }) {
  const model = useMemo(() => playbackModel(db), [db])
  const [idx, setIdx] = useState(model.nowIdx)
  const [playing, setPlaying] = useState(false)
  const [pinA, setPinA] = useState(null)
  const [pinB, setPinB] = useState(null)
  const timer = useRef(null)

  // replay: step one month ~ every 900ms, stop at "now" (history ends there)
  useEffect(() => {
    if (!playing) return undefined
    timer.current = setInterval(() => {
      setIdx((i) => {
        if (i >= model.nowIdx) { setPlaying(false); return i }
        return i + 1
      })
    }, 900)
    return () => clearInterval(timer.current)
  }, [playing, model.nowIdx])

  const f = model.frames[idx]
  const label = (k) => monthLabel(k + '-01')
  const play = () => {
    if (idx >= model.nowIdx) setIdx(0)
    setPlaying((p) => !p)
  }

  // ---- chart geometry -------------------------------------------------------
  const W = 780, H = 170, padL = 8, padR = 8, padT = 12, padB = 22
  const n = model.frames.length
  const X = (i) => padL + (i / (n - 1)) * (W - padL - padR)
  const Y = (v) => padT + (1 - v / Math.max(1, model.maxCum)) * (H - padT - padB)
  const pastFrames = model.frames.filter((x) => x.past)
  const area = pastFrames.map((x, i) => `${i ? 'L' : 'M'} ${X(x.idx)} ${Y(x.cumCreated)}`).join(' ')
  const areaClosed = area + ` L ${X(pastFrames[pastFrames.length - 1]?.idx || 0)} ${Y(0)} L ${X(0)} ${Y(0)} Z`
  const fcast = model.frames.filter((x) => !x.past)
  const fcastPath = [model.frames[model.nowIdx], ...fcast].map((x, i) => `${i ? 'L' : 'M'} ${X(x.idx)} ${Y(x.cumValue)}`).join(' ')

  const cmp = pinA != null && pinB != null ? (() => {
    const [a, b] = pinA <= pinB ? [pinA, pinB] : [pinB, pinA]
    const fa = model.frames[a], fb = model.frames[b]
    const span = model.frames.slice(a + 1, b + 1)
    return {
      a: fa, b: fb,
      created: span.reduce((s, x) => s + x.created, 0),
      lost: span.reduce((s, x) => s + x.lost, 0),
      decisions: span.reduce((s, x) => s + x.decisions, 0),
      actions: span.reduce((s, x) => s + x.actions, 0),
      health: fb.health != null && fa.health != null ? fb.health - fa.health : null,
    }
  })() : null

  return (
    <div className="card pad section-gap">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3>Enterprise Pulse Playback</h3>
        <span className="spacer" />
        <span className="badge b-grey">{model.riskNote.split(' — ')[0]}</span>
      </div>
      <p className="muted vwf-sub">
        Replay the year like a market tape — what landed, what slipped, what was decided,
        month by month. Pin two milestones to compare periods. Months ahead of today are a
        <b> forecast preview</b>, not history.
      </p>

      {/* transport + scrub */}
      <div className="ppb-transport">
        <button className="btn sm" onClick={play} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? '❚❚ Pause' : '▶ Replay'}</button>
        <span className="ppb-month mono">{label(f.key)}</span>
        {!f.past && <span className="badge b-amber">forecast preview</span>}
        <span className="spacer" />
        <button className={`btn sm ghost ${pinA === idx ? 'ppb-pin-on' : ''}`} onClick={() => setPinA(pinA === idx ? null : idx)}>⚑ Pin A{pinA != null ? ` · ${label(model.frames[pinA].key)}` : ''}</button>
        <button className={`btn sm ghost ${pinB === idx ? 'ppb-pin-on' : ''}`} onClick={() => setPinB(pinB === idx ? null : idx)}>⚑ Pin B{pinB != null ? ` · ${label(model.frames[pinB].key)}` : ''}</button>
      </div>
      <input className="ppb-scrub" type="range" min={0} max={n - 1} step={1} value={idx}
        onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)) }} aria-label="Scrub through fiscal-year months" />

      {/* tape chart with playhead */}
      <div className="table-wrap">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 560 }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Cumulative value tape">
          <path d={areaClosed} fill="color-mix(in srgb, var(--green) 16%, transparent)" stroke="none" />
          <path d={area} fill="none" stroke="var(--green)" strokeWidth="2" />
          <path d={fcastPath} fill="none" stroke="var(--navy)" strokeWidth="1.6" strokeDasharray="5 4" />
          {pinA != null && <line x1={X(pinA)} x2={X(pinA)} y1={padT} y2={H - padB} stroke="var(--amber)" strokeWidth="1.4" strokeDasharray="4 3" />}
          {pinB != null && <line x1={X(pinB)} x2={X(pinB)} y1={padT} y2={H - padB} stroke="var(--amber)" strokeWidth="1.4" strokeDasharray="4 3" />}
          {pinA != null && <text x={X(pinA) + 4} y={padT + 9} fontSize="9.5" fontWeight="800" fill="var(--amber)">A</text>}
          {pinB != null && <text x={X(pinB) + 4} y={padT + 9} fontSize="9.5" fontWeight="800" fill="var(--amber)">B</text>}
          <line x1={X(idx)} x2={X(idx)} y1={padT - 4} y2={H - padB + 4} stroke="var(--ink)" strokeWidth="1.6" />
          <circle cx={X(idx)} cy={f.past ? Y(f.cumCreated) : Y(f.cumValue)} r="4" fill={f.past ? 'var(--green)' : 'var(--navy)'} stroke="var(--card)" strokeWidth="1.5" />
          {model.frames.map((x) => (
            <text key={x.key} x={X(x.idx)} y={H - 6} textAnchor="middle" fontSize="8.5" fill={x.idx === idx ? 'var(--ink)' : 'var(--grey-2)'} fontWeight={x.idx === idx ? 800 : 400}>
              {label(x.key).split(' ')[0]}
            </text>
          ))}
        </svg>
      </div>

      {/* the frame read-out */}
      <div className="ppb-kpis">
        <div className="ppb-kpi"><span className="t-label">Value created</span><b className="mono" style={{ color: 'var(--green)' }}>{f.past ? money(f.created) : money(f.forecastMonth)}</b><span className="ppb-kpi-s">{f.past ? `${money(f.cumCreated)} cumulative` : 'expected this month'}</span></div>
        <div className="ppb-kpi"><span className="t-label">Value lost (timing)</span><b className="mono" style={{ color: f.lost > 0 ? 'var(--red)' : 'var(--ink)' }}>{f.past ? money(f.lost) : '—'}</b><span className="ppb-kpi-s">{f.past ? `${money(f.cumLost)} cumulative` : 'not yet history'}</span></div>
        <div className="ppb-kpi"><span className="t-label">Decisions made</span><b className="mono">{f.past ? f.decisions : '—'}</b><span className="ppb-kpi-s">sign-offs + journaled</span></div>
        <div className="ppb-kpi"><span className="t-label">Actions taken</span><b className="mono">{f.past ? f.actions : '—'}</b><span className="ppb-kpi-s">tasks + recorded actions</span></div>
        <div className="ppb-kpi"><span className="t-label">Health score</span><b className="mono">{f.health ?? '—'}</b><span className="ppb-kpi-s">reconstructed</span></div>
      </div>

      {/* month event feed */}
      <div className="ppb-events">
        {f.events.slice(0, 5).map((e, k) => (
          <div key={k} className="ppb-ev">
            <span className="ppb-ev-dot" style={{ background: KIND_DOT[e.kind] || 'var(--grey-2)' }} />
            <span className="ppb-ev-t">{e.label}</span>
            {e.value != null && <span className="mono ppb-ev-v">{money(e.value)}</span>}
          </div>
        ))}
        {f.events.length === 0 && <div className="muted" style={{ fontSize: 12 }}>{f.past ? 'Nothing dated landed this month.' : 'Forecast month — nothing has happened yet.'}</div>}
      </div>

      {/* milestone comparison */}
      {cmp && (
        <div className="ppb-cmp">
          <div className="ppb-cmp-h"><b>Milestone review — {label(cmp.a.key)} → {label(cmp.b.key)}</b>
            <span className="spacer" />
            <button className="btn sm ghost" onClick={() => { setPinA(null); setPinB(null) }}>Clear pins</button>
          </div>
          <div className="ppb-cmp-grid">
            <span>Value created <b className="mono" style={{ color: 'var(--green)' }}>{money(cmp.created)}</b></span>
            <span>Value lost <b className="mono" style={{ color: cmp.lost > 0 ? 'var(--red)' : 'var(--ink)' }}>{money(cmp.lost)}</b></span>
            <span>Decisions <b className="mono">{cmp.decisions}</b></span>
            <span>Actions <b className="mono">{cmp.actions}</b></span>
            {cmp.health != null && <span>Health <b className="mono" style={{ color: cmp.health >= 0 ? 'var(--green)' : 'var(--red)' }}>{cmp.health >= 0 ? '+' : ''}{cmp.health} pts</b></span>}
          </div>
        </div>
      )}
    </div>
  )
}
