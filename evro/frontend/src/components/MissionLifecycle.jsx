import { missionLifecycle } from '../lib/mission-focus.js'
import { money, pct } from '../lib/format.js'

// MissionLifecycle (6D Wave 5) — a mission on the create→retrospect track,
// with its deterministic profile (difficulty, probability, strategic weight,
// owner, progression) and its value-anchored completion. Every value comes
// from the mission and its linked initiative; nothing invented. Completion
// celebrates enterprise value UNLOCKED, never a click.
export default function MissionLifecycle({ db, m }) {
  const lc = missionLifecycle(db, m)
  const p = lc.profile
  return (
    <div className="mlc">
      <ol className="mlc-track" aria-label="Mission lifecycle">
        {lc.phases.map((ph) => (
          <li key={ph.key} className={`mlc-phase ${ph.done ? 'done' : ''} ${ph.current ? 'current' : ''}`}>
            <span className="mlc-dot" aria-hidden="true" />
            <span className="mlc-plabel">{ph.label}</span>
          </li>
        ))}
        {lc.risk && <li className="mlc-risk" title="At risk — a red status or blocked/escalated state overlays the track">⚠ at risk</li>}
      </ol>
      <div className="mlc-profile">
        <span className="mlc-chip" style={{ color: p.difficulty.tone }} title={p.difficulty.why.join(' · ')}>{p.difficulty.label}</span>
        <span className="mlc-chip" title="Deterministic completion estimate — confidence × risk × dependencies">{pct(p.probability)} likely</span>
        <span className="mlc-chip" title={p.weightWhy.join(' · ')}>{'★'.repeat(p.weight)}<i className="mlc-star-off">{'★'.repeat(5 - p.weight)}</i> weight</span>
        <span className="mlc-chip" style={{ color: p.progression.tone }}>{p.progression.label}</span>
        <span className="mlc-chip">Owner: {lc.owner}</span>
        {lc.linkedTitle && <span className="mlc-chip mlc-link">↳ {lc.linkedTitle} ({lc.stageLabel})</span>}
      </div>
      <div className="mlc-complete">
        {lc.value > 0
          ? <>Completing this mission unlocks <b className="mono">{money(lc.value)}</b> of enterprise value into the credible pipeline — the completion celebrates the value, not the click.</>
          : <>A governance / signal mission — completion clears the path rather than unlocking a scored dollar.</>}
      </div>
    </div>
  )
}
