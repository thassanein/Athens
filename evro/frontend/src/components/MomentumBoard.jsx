import { useMemo, useState } from 'react'
import { momentum, MOMENTUM_SCOPES, MOMENTUM_STATES } from '../lib/momentum.js'
import { SymMomentum } from './Symbols.jsx'
import { money } from '../lib/format.js'

// Momentum Board (6B item 2) — acceleration, deceleration and stagnation at
// every altitude. One glance answers "where is the energy going?".

function Spark({ series, tone }) {
  if (!series.length) return null
  const max = Math.max(1, ...series)
  const X = (i) => (series.length < 2 ? 40 : (i / (series.length - 1)) * 76 + 2)
  const Y = (v) => 26 - (v / max) * 20 - 3
  return (
    <svg viewBox="0 0 80 26" className="mom-spark" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={series.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke={tone} strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx={X(series.length - 1)} cy={Y(series[series.length - 1])} r="2.2" fill={tone} />
    </svg>
  )
}

export default function MomentumBoard({ db }) {
  const [scope, setScope] = useState('business_unit')
  const m = useMemo(() => momentum(db, scope), [db, scope])

  return (
    <div className="card pad section-gap">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3><span className="sym" style={{ color: 'var(--brand-momentum)', marginRight: 6 }}><SymMomentum size={15} /></span>Momentum</h3>
        <div className="mom-legend">
          {Object.entries(MOMENTUM_STATES).map(([k, s]) => (
            <span key={k} className="mom-leg" style={{ color: s.tone }}>{s.arrow} {m.counts[k]}</span>
          ))}
        </div>
        <span className="spacer" />
        <div className="seg">
          {MOMENTUM_SCOPES.map((s) => (
            <button key={s.key} className={scope === s.key ? 'active' : ''} onClick={() => setScope(s.key)}>{s.label}</button>
          ))}
        </div>
      </div>
      <p className="muted vwf-sub">Window: {m.window}. Sorted by FY value at stake.</p>
      <div className="mom-rows">
        {m.rows.slice(0, 10).map((r) => {
          const st = MOMENTUM_STATES[r.state]
          return (
            <div key={r.label} className="mom-row">
              <span className="mom-arrow" style={{ color: st.tone }}>{st.arrow}</span>
              <div className="mom-main">
                <span className="mom-l">{r.label}</span>
                <span className="mom-sub">{r.count} initiative{r.count === 1 ? '' : 's'} · {money(r.weight)} FY value</span>
              </div>
              <Spark series={r.series} tone={st.tone} />
              <div className="mom-nums">
                <b className="mono">{money(r.recent)}/mo</b>
                <span className="mom-sub" style={{ color: st.tone }}>{st.label}{r.prior > 1000 ? ` · ${r.delta >= 0 ? '+' : ''}${Math.round(r.delta * 100)}%` : ''}</span>
              </div>
            </div>
          )
        })}
        {m.rows.length > 10 && <div className="muted" style={{ fontSize: 11.5, padding: '2px 4px' }}>{m.rows.length - 10} more, below the value cut — switch scope to narrow.</div>}
        {m.rows.length === 0 && <div className="muted" style={{ padding: 8 }}>Nothing realizing at this altitude yet.</div>}
      </div>
    </div>
  )
}
