import { useEffect, useMemo, useRef, useState } from 'react'
import { missionReplay } from '../lib/orchestration.js'
import { money, pct } from '../lib/format.js'
import TrustBadge from './Evidence.jsx'
import { IconAI } from './Icons.jsx'

// Chief of Staff mission animation (5B.7 item 3) — the orchestration run
// replayed as a mission-control sequence: a phase rail (Analyst → Advisor →
// Simulator → Memory → Chief of Staff) and a live console log of what each
// phase gathered, disagreed on, and finally issued. Every line is computed
// from portfolio state; the theatre is presentation only.

export default function MissionReplay({ db, user, navigate }) {
  const model = useMemo(() => missionReplay(db, user), [db, user])
  const [phase, setPhase] = useState(-1) // -1 = idle, 0..4 = running, 4 = complete
  const [playing, setPlaying] = useState(false)
  const logRef = useRef(null)

  useEffect(() => {
    if (!playing) return undefined
    const t = setInterval(() => {
      setPhase((p) => {
        if (p >= model.phases.length - 1) { setPlaying(false); return p }
        return p + 1
      })
    }, 1700)
    return () => clearInterval(t)
  }, [playing, model.phases.length])

  // keep the console scrolled to the newest lines
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [phase])

  const run = () => { setPhase(0); setPlaying(true) }
  const step = () => { setPlaying(false); setPhase((p) => Math.min(model.phases.length - 1, p + 1)) }
  const done = phase >= model.phases.length - 1
  let clock = 0

  return (
    <div className="card pad section-gap">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3>Mission replay</h3>
        <span className="badge b-navy"><IconAI /> deterministic run · presentation only</span>
        <span className="spacer" />
        {phase === -1
          ? <button className="btn sm" onClick={run}>▶ Run mission</button>
          : <>
            <button className="btn sm ghost" onClick={() => { setPlaying(false); setPhase(-1) }}>↺ Reset</button>
            {!done && <button className="btn sm ghost" onClick={step}>Step ›</button>}
            {!done && <button className="btn sm" onClick={() => setPlaying(!playing)}>{playing ? '❚❚ Pause' : '▶ Resume'}</button>}
          </>}
      </div>
      <p className="muted vwf-sub">
        Watch how the agent team reaches a recommendation — evidence swept, advice drafted,
        the plan stress-tested, precedent recalled, disagreements resolved, the call issued.
      </p>

      {/* phase rail */}
      <div className="mr-rail" role="list" aria-label="Mission phases">
        {model.phases.map((ph, i) => (
          <div key={ph.key} className="mr-seg" role="listitem">
            <div className={`mr-node ${i < phase || (done && i === phase) ? 'done' : ''} ${i === phase && !done ? 'live' : ''}`}>
              <span className="mr-node-i">{i < phase || (done && i === phase) ? '✓' : i + 1}</span>
              <span className="mr-node-n">{ph.name}</span>
            </div>
            {i < model.phases.length - 1 && <span className={`mr-wire ${i < phase ? 'done' : ''}`} aria-hidden="true">{i === phase - 0 && playing ? <span className="mr-pulse" /> : null}</span>}
          </div>
        ))}
      </div>

      {/* console */}
      {phase >= 0 && (
        <div className="mr-console" ref={logRef} aria-live="polite">
          {model.phases.slice(0, phase + 1).map((ph, pi) => (
            <div key={ph.key} className="mr-block">
              <div className="mr-ph mono">T+{String(pi * 4).padStart(2, '0')}s — {ph.name.toUpperCase()} · {ph.title}</div>
              {ph.lines.map((l, li) => {
                clock += 1
                return <div key={li} className="mr-line mono" style={{ animationDelay: pi === phase ? `${li * 160}ms` : '0ms' }}>{l}</div>
              })}
            </div>
          ))}
          {done && <div className="mr-ph mono mr-end">MISSION COMPLETE — {clock} log entries · recommendation on deck</div>}
        </div>
      )}

      {/* the issued call */}
      {done && model.finalRec && (
        <div className="mr-final">
          <div className="mr-final-h">
            <span className="badge b-green">Final recommendation</span>
            <TrustBadge db={db} rec={model.finalRec} align="right" />
            {model.finalRec.value_impact ? <span className="mono" style={{ fontWeight: 800 }}>{money(model.finalRec.value_impact)}</span> : null}
          </div>
          <div className="mr-final-t">{model.finalRec.title}</div>
          <div className="muted" style={{ fontSize: 12.5 }}>{model.finalRec.recommendation}</div>
          <div className="mr-final-f">
            <span className="muted" style={{ fontSize: 11.5 }}>{pct(model.finalRec.confidence)} confidence · {model.tensions.length} disagreement{model.tensions.length === 1 ? '' : 's'} resolved · dissent retained as evidence</span>
            <span className="spacer" />
            {model.finalRec.linked_id && String(model.finalRec.linked_id).startsWith('i-') && (
              <button className="btn sm" onClick={() => navigate('initiative', { id: model.finalRec.linked_id })}>Open →</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
