import { useMemo, useState } from 'react'
import { orgMilestones, maturityModel, transformationAchievements, MATURITY_LEVELS } from '../lib/achievements.js'
import { money } from '../lib/format.js'
import { Bar } from './ui.jsx'

// Enterprise Achievement Board (6B item 7) — the ORGANIZATION's trophy case:
// value milestones dated from the validated record, a five-level maturity
// model with computed criteria, and transformation achievements. Nothing is
// awarded the data can't prove.

export default function AchievementBoard({ db }) {
  const ms = useMemo(() => orgMilestones(db), [db])
  const mat = useMemo(() => maturityModel(db), [db])
  const tr = useMemo(() => transformationAchievements(db), [db])
  const [showNext, setShowNext] = useState(false)
  const earned = ms.milestones.filter((m) => m.achieved).length + tr.filter((t) => t.achieved).length

  return (
    <div className="card pad section-gap">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3>Enterprise achievements</h3>
        <span className="spacer" />
        <span className="badge b-green">{earned} earned</span>
        <span className="badge b-grey">computed from the validated record</span>
      </div>

      {/* maturity level */}
      <div className="ach-mat">
        <div className="ach-mat-l">
          <span className="t-label">Operating maturity</span>
          <b className="ach-mat-n">Level {mat.level} · {mat.name}</b>
          <div className="ach-mat-track">
            {MATURITY_LEVELS.map((l, k) => (
              <span key={l} className={`ach-mat-pip ${k < mat.level ? 'done' : ''} ${k === mat.level ? 'next' : ''}`} title={l}>{k + 1}</span>
            ))}
          </div>
        </div>
        {mat.next && (
          <div className="ach-mat-next">
            <button className="btn sm ghost" onClick={() => setShowNext(!showNext)} aria-expanded={showNext}>
              Next: {mat.next.name} — {Math.round(mat.next.progress * 100)}% there {showNext ? '▴' : '▾'}
            </button>
            {showNext && (
              <div className="ach-crit">
                {mat.next.criteria.map((c) => (
                  <div key={c.label} className={`ach-c ${c.ok ? 'ok' : ''}`}>
                    <span>{c.ok ? '✓' : '○'}</span> {c.label}{c.note ? <i> — {c.note}</i> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* milestones */}
      <div className="ach-grid">
        {ms.milestones.map((m) => (
          <div key={m.title} className={`ach ${m.achieved ? 'earned' : ''}`}>
            <span className="ach-i">{m.icon}</span>
            <div className="ach-main">
              <b>{m.title}</b>
              {!m.achieved && <Bar value={m.progress} max={1} color="var(--navy)" height={5} />}
              <span className="ach-d">{m.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {/* transformation achievements */}
      <div className="ach-tr">
        {tr.map((t) => (
          <span key={t.title} className={`ach-tr-chip ${t.achieved ? 'earned' : ''}`} title={t.detail}>
            {t.icon} {t.title}{t.achieved ? '' : ' · in progress'}
          </span>
        ))}
      </div>
      <div className="eh-fine">Total validated to date: {money(ms.totalRealized)} · {ms.decisions} governance decisions on the record.</div>
    </div>
  )
}
