import { useMemo, useState } from 'react'
import { scenario, LEVERS, baseLevers } from '../lib/procurement-scenario.js'
import { money, pct } from '../lib/format.js'
import Term from '../components/Term.jsx'
import { IconAI } from '../components/Icons.jsx'

// Procurement What-If — three levers, live projection. Move on-contract
// compliance, negotiation depth and realization speed and watch the book's
// realized value, run-rate, leakage and confidence recompute from the current
// baseline. Deterministic: it never edits the record, it projects from it.
// Clearly labelled a projection, not a commitment — the honest-register rule.

function Delta({ base, next, invert = false }) {
  const d = next - base
  if (Math.abs(d) < 1) return <span className="wf-d flat">no change</span>
  const good = invert ? d < 0 : d > 0
  return <span className={`wf-d ${good ? 'up' : 'down'}`}>{d > 0 ? '+' : ''}{money(d)}</span>
}

export default function ProcurementScenario({ db, navigate }) {
  const [levers, setLevers] = useState(baseLevers)
  const s = useMemo(() => scenario(db, levers), [db, levers])
  const dirty = LEVERS.some((l) => levers[l.key] !== l.base)
  const set = (k, v) => setLevers((p) => ({ ...p, [k]: Number(v) }))
  const reset = () => setLevers(baseLevers())

  const cards = [
    { label: 'Realized this FY', base: s.base.realizedYTD, next: s.projected.realizedFY, help: 'realized' },
    { label: 'Committed run-rate', base: s.base.committed, next: s.projected.runRate, help: 'run-rate' },
    { label: 'Value leakage', base: s.base.leakage, next: s.projected.leakage, invert: true, help: 'leakage' },
  ]

  return (
    <>
      <p className="page-intro">
        A what-if projection, not a commitment. Move the three levers below and the book recomputes live from today's
        baseline — realized value, run-rate, <Term name="leakage">leakage</Term> and <Term name="confidence">confidence</Term>.
        Nothing here is saved to the record; it's a way to size a move before you make it.
      </p>

      <div className="wf-grid">
        <div className="card pad wf-levers">
          <div className="card-h">
            <h3><span className="agx-ic"><IconAI /></span> Levers</h3>
            <span className="spacer" />
            {dirty && <button className="linkbtn tiny" onClick={reset}>Reset to baseline</button>}
          </div>
          {LEVERS.map((l) => (
            <div key={l.key} className="wf-lever">
              <div className="wf-lever-h">
                <label htmlFor={`wf-${l.key}`}>{l.label}</label>
                <b className="mono">{levers[l.key] > 0 && l.min < 0 ? '+' : ''}{levers[l.key]}{l.unit}</b>
              </div>
              <input
                id={`wf-${l.key}`} type="range" min={l.min} max={l.max} step="1"
                value={levers[l.key]} onChange={(e) => set(l.key, e.target.value)}
                aria-label={l.label}
              />
              <div className="wf-lever-help tiny muted">{l.help}</div>
            </div>
          ))}
        </div>

        <div className="wf-out">
          <div className="wf-headline card pad">
            <div className="tiny muted">Projected change to realized value this fiscal year</div>
            <div className={`wf-gain mono ${s.gain >= 0 ? 'up' : 'down'}`}>{s.gain >= 0 ? '+' : ''}{money(s.gain)}</div>
            <div className="tiny muted">
              {dirty
                ? `from ${money(s.base.realizedYTD)} on the current trajectory to a projected ${money(s.projected.realizedFY)}`
                : 'levers at baseline — move a slider to project a change'}
            </div>
          </div>

          <div className="wf-cards">
            {cards.map((c) => {
              const max = Math.max(c.base, c.next, 1)
              return (
                <div key={c.label} className="card pad wf-card">
                  <div className="wf-card-l">{c.help ? <Term name={c.help}>{c.label}</Term> : c.label}</div>
                  <div className="wf-bars">
                    <div className="wf-bar-row">
                      <span className="tiny muted">now</span>
                      <div className="wf-track"><div className="wf-fill base" style={{ width: `${(c.base / max) * 100}%` }} /></div>
                      <b className="mono">{money(c.base)}</b>
                    </div>
                    <div className="wf-bar-row">
                      <span className="tiny muted">projected</span>
                      <div className="wf-track"><div className={`wf-fill proj ${c.invert ? 'inv' : ''}`} style={{ width: `${(c.next / max) * 100}%` }} /></div>
                      <b className="mono">{money(c.next)}</b>
                    </div>
                  </div>
                  <div className="wf-card-d"><Delta base={c.base} next={c.next} invert={c.invert} /></div>
                </div>
              )
            })}
            <div className="card pad wf-card wf-conf">
              <div className="wf-card-l"><Term name="confidence">Book confidence</Term></div>
              <div className="wf-conf-row">
                <div className="wf-conf-v mono">{pct(s.projected.confidence)}</div>
                <div className="tiny muted">from {pct(s.base.confidence)} today</div>
              </div>
              <div className="wf-track"><div className="wf-fill proj" style={{ width: `${s.projected.confidence * 100}%` }} /></div>
            </div>
          </div>

          <div className="wf-note tiny muted">
            Projection method — negotiation win scales committed depth; on-contract compliance converts committed value to a
            run-rate and squeezes leakage; realization speed lands the run-rate within this fiscal year. A projection for
            sizing a decision, not a forecast of record.
          </div>
          <div className="wf-cta">
            <button className="btn" onClick={() => navigate('savingspipeline')}>Open the Savings Pipeline →</button>
            <button className="btn ghost" onClick={() => navigate('decisioncenter')}>Where these levers get pulled →</button>
          </div>
        </div>
      </div>
    </>
  )
}
