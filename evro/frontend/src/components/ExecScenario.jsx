import { useMemo, useState } from 'react'
import { EXEC_LEVERS, ZERO_LEVERS, execScenario, leverFeeds } from '../lib/exec-scenario.js'
import { money, pct } from '../lib/format.js'

// Executive Scenario Mode (5B.7 item 6) — strategic levers an executive
// actually pulls (macro, productivity, workforce, demand, capital), read out
// as EBITDA / cash / risk / capacity / enterprise value. Each lever names the
// integration feed a live digital twin would drive it from.

const FEED_TONE = { connected: 'b-green', stubbed: 'b-amber', planned: 'b-grey' }

export default function ExecScenario({ db }) {
  const [lv, setLv] = useState(ZERO_LEVERS)
  const model = useMemo(() => execScenario(db, lv), [db, lv])
  const feeds = useMemo(() => leverFeeds(db), [db])
  const touched = EXEC_LEVERS.some((l) => lv[l.key] !== 0)
  const fmt = (v, kind) => (kind === 'pct' ? pct(v) : money(v))

  return (
    <div className="card pad section-gap">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3>Executive Scenario Mode</h3>
        <span className="spacer" />
        {touched && <button className="btn sm ghost" onClick={() => setLv(ZERO_LEVERS)}>Reset levers</button>}
        <span className="badge b-grey">digital-twin ready · deterministic math</span>
      </div>
      <p className="muted vwf-sub">
        Pull the levers a strategy discussion actually turns on and watch the read-outs move.
        The feed badge on each lever is the live system a digital twin would drive it from —
        today's math runs on the portfolio model.
      </p>

      <div className="exs-grid">
        <div className="exs-levers">
          {EXEC_LEVERS.map((l) => {
            const feed = feeds[l.key]
            return (
              <div key={l.key} className="exs-lever">
                <div className="exs-lever-h">
                  <span className="exs-lever-l">{l.label}</span>
                  <span className="spacer" />
                  {feed && <span className={`badge ${FEED_TONE[feed.status] || 'b-grey'}`} title={`Feed: ${feed.name} (${feed.status})`}>{feed.name}</span>}
                  <b className="mono exs-lever-v" style={{ color: lv[l.key] !== 0 ? 'var(--navy)' : 'var(--grey-2)' }}>
                    {lv[l.key] > 0 ? '+' : ''}{lv[l.key]}{l.unit === 'pts' ? 'pt' : l.unit}
                  </b>
                </div>
                <input type="range" min={l.min} max={l.max} step={l.step} value={lv[l.key]}
                  onChange={(e) => setLv({ ...lv, [l.key]: Number(e.target.value) })}
                  aria-label={l.label} className="exs-range" />
                <div className="exs-lever-help">{l.help}{model.notes[l.key] ? ` — ${model.notes[l.key]}` : ''}</div>
              </div>
            )
          })}
        </div>

        <div className="exs-impacts">
          {model.impacts.map((im) => {
            const good = im.key === 'risk' || im.key === 'capacity' ? im.delta <= 0 : im.delta >= 0
            const show = Math.abs(im.delta) > (im.fmt === 'pct' ? 0.002 : 1000)
            return (
              <div key={im.key} className="exs-impact">
                <div className="t-label">{im.label}</div>
                <div className="exs-imp-v mono">{fmt(im.now, im.fmt)}</div>
                <div className="exs-imp-d mono" style={{ color: show ? (good ? 'var(--green)' : 'var(--red)') : 'var(--grey-2)' }}>
                  {show ? `${im.delta >= 0 ? '▲' : '▼'} ${fmt(Math.abs(im.delta), im.fmt)} vs base` : '— at base'}
                </div>
                <div className="exs-imp-n">{im.note}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
