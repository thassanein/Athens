import { useMemo } from 'react'
import { seasonFramework } from '../lib/seasons.js'
import { money } from '../lib/format.js'
import { Bar } from './ui.jsx'

// Season Board (6B item 4) — the fiscal year as four seasons with computed
// objectives, a score, and achievements. Replaces the simple value-seasons
// strip on the Summit.

const STATUS = {
  complete: { label: 'Complete', badge: 'b-grey' },
  current: { label: 'In season', badge: 'b-green' },
  upcoming: { label: 'Upcoming', badge: 'b-navy' },
}
const scoreTone = (s) => (s >= 75 ? 'var(--green)' : s >= 50 ? 'var(--navy)' : s >= 30 ? 'var(--amber)' : 'var(--red)')

export default function SeasonBoard({ db }) {
  const f = useMemo(() => seasonFramework(db), [db])

  return (
    <div className="card pad section-gap">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3>Value seasons</h3>
        <span className="spacer" />
        {f.compare.map((c) => (
          <span key={c.to} className="badge b-grey" title={`${c.from} → ${c.to}`}>
            {c.from}→{c.to}: {c.realized >= 0 ? '+' : '−'}{money(Math.abs(c.realized))} · {c.score >= 0 ? '+' : ''}{c.score} pts
          </span>
        ))}
        <span className="badge b-grey" title={f.resetNote}>quarterly resets</span>
      </div>
      <div className="ssn-grid">
        {f.seasons.map((s) => (
          <div key={s.key} className={`ssn ${s.status}`}>
            <div className="ssn-h">
              <b>{s.name} <span className="ssn-range">{s.label}</span></b>
              <span className="spacer" />
              <span className={`badge ${STATUS[s.status].badge}`}>{STATUS[s.status].label}</span>
            </div>
            {s.score != null ? (
              <>
                <div className="ssn-score">
                  <span className="mono" style={{ color: scoreTone(s.score), fontSize: 26, fontWeight: 800 }}>{s.score}</span>
                  <span className="ssn-sub">season score · 70% delivery + 30% record hygiene</span>
                </div>
                <div className="ssn-obj">
                  {s.objectives.map((o) => (
                    <div key={o.label} className="ssn-o">
                      <span className={`ssn-o-dot ${o.done ? 'done' : ''}`}>{o.done ? '✓' : ''}</span>
                      <div className="ssn-o-main">
                        <span>{o.label}</span>
                        <Bar value={o.progress} max={1} color={o.done ? 'var(--green)' : 'var(--navy)'} height={5} />
                        <span className="ssn-sub">{o.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {s.achievements.length > 0 && (
                  <div className="ssn-ach">
                    {s.achievements.map((a, k) => (
                      <span key={k} className="ssn-a">{a.icon} {a.label}{a.value ? ` (${money(a.value)})` : ''}</span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="ssn-upcoming">
                <span className="ssn-sub">Season opens at the quarter boundary — objectives renew, the score resets, the record stays.</span>
                <div className="ssn-sub" style={{ marginTop: 6 }}>Planned landing: <b className="mono">{money(s.expected)}</b></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
