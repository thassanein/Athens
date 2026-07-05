import { useMemo, useState } from 'react'
import { enterpriseHealth, healthTrend, pulseNarrative, GRADE_BANDS } from '../lib/intel.js'
import { enterprisePulse, axisNote } from '../lib/pulse.js'
import { decisionsRequired, controlTower } from '../lib/engine.js'
import { money, pct } from '../lib/format.js'
import { Radar } from '../components/Charts.jsx'
import ValueWaterfall from '../components/ValueWaterfall.jsx'
import PulsePlayback from '../components/PulsePlayback.jsx'
import ExecScenario from '../components/ExecScenario.jsx'
import StrategicMap from '../components/StrategicMap.jsx'
import ConfidenceHeatmap from '../components/ConfidenceHeatmap.jsx'
import { IconAI } from '../components/Icons.jsx'

// Enterprise Intelligence (5B.7) — the flagship intelligence experience. Wave 1
// ships the Enterprise Health Score (the "credit score of the enterprise":
// unified index, category drill-downs, trend, benchmark bands) and the
// Enterprise Pulse Narrative (what changed / why / what matters / what next).
// Later 5B.7 waves add playback, the value waterfall, confidence and scenario
// panels. Deterministic + rules-based throughout; view-only.

const scoreTone = (s01) => (s01 >= 0.7 ? 'var(--green)' : s01 >= 0.5 ? 'var(--amber)' : 'var(--red)')

// Semicircular score gauge — grade-band track + progress arc + needle.
function HealthGauge({ score, grade, gradeLabel }) {
  const W = 260, H = 150, cx = W / 2, cy = H - 12, r = 104
  const angle = (v) => Math.PI * (1 - v / 100) // 100 → 0 rad (right), 0 → π (left)
  const px = (v, rad = r) => [cx + rad * Math.cos(angle(v)), cy - rad * Math.sin(angle(v))]
  const arc = (from, to, rad = r) => {
    const [x1, y1] = px(from, rad); const [x2, y2] = px(to, rad)
    // half-circle gauge → the swept angle never reaches 180°, so large-arc is always 0
    return `M ${x1} ${y1} A ${rad} ${rad} 0 0 1 ${x2} ${y2}`
  }
  const bands = GRADE_BANDS.map((b, i) => ({ ...b, max: i === 0 ? 100 : GRADE_BANDS[i - 1].min }))
  const tone = scoreTone(score / 100)
  const [nx, ny] = px(score, r - 16)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="eh-gauge" role="img" aria-label={`Enterprise health ${score} of 100, grade ${grade}`}>
      {bands.map((b) => (
        <path key={b.grade} d={arc(Math.max(b.min, 0.5), Math.min(b.max, 99.5))} fill="none" stroke="var(--line)" strokeWidth="9" strokeLinecap="butt" opacity="0.7" />
      ))}
      <path d={arc(0.5, Math.max(1, score))} pathLength="600" fill="none" stroke={tone} strokeWidth="9" strokeLinecap="round" className="eh-gauge-arc" />
      {bands.slice(0, -1).map((b) => {
        const [tx, ty] = px(b.min, r + 10)
        return <text key={b.grade} x={tx} y={ty} textAnchor="middle" className="eh-gauge-tick">{b.min}</text>
      })}
      <circle cx={nx} cy={ny} r="4" fill={tone} />
      <text x={cx} y={cy - 34} textAnchor="middle" className="eh-gauge-score mono">{score}</text>
      <text x={cx} y={cy - 12} textAnchor="middle" className="eh-gauge-grade" fill={tone}>{grade} · {gradeLabel}</text>
    </svg>
  )
}

function TrendSpark({ trend }) {
  if (!trend.series.length) return null
  const min = Math.min(...trend.series) - 3, max = Math.max(...trend.series) + 3
  const X = (i) => (trend.series.length < 2 ? 60 : (i / (trend.series.length - 1)) * 116 + 2)
  const Y = (v) => 30 - ((v - min) / Math.max(1, max - min)) * 26 - 2
  const pts = trend.series.map((v, i) => `${X(i)},${Y(v)}`).join(' ')
  return (
    <svg viewBox="0 0 120 32" preserveAspectRatio="none" className="eh-spark" aria-label="Health score by month (reconstructed)">
      <polyline points={pts} fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={X(trend.series.length - 1)} cy={Y(trend.series[trend.series.length - 1])} r="2.5" fill="var(--navy)" />
    </svg>
  )
}

export default function Intelligence({ db, user, navigate }) {
  const h = useMemo(() => enterpriseHealth(db), [db])
  const trend = useMemo(() => healthTrend(db), [db])
  const nar = useMemo(() => pulseNarrative(db, user), [db, user])
  const [dimKey, setDimKey] = useState(null)
  const dim = h.dims.find((d) => d.key === dimKey)
  const first = trend.series[0]
  const last = trend.series[trend.series.length - 1]
  const pulse = useMemo(() => enterprisePulse(db), [db])
  const ct = useMemo(() => controlTower(db), [db])
  const decisions = useMemo(() => decisionsRequired(db, user).filter((d) => d.kind === 'approval'), [db, user])

  return (
    <>
      <p className="page-intro">
        <b>Enterprise Intelligence</b> — the flagship operating environment: enterprise health
        as one credit-score number, the value radar, the year on replay, the value waterfall,
        strategic what-ifs, AI confidence, the strategic map, and the narrative — every panel
        deterministic and traceable to the operating data behind it.
      </p>

      {/* command strip — the mission-control summary + one-click routes */}
      <div className="intel-strip">
        <span className="eis-chip"><b className="mono" style={{ color: 'var(--green)' }}>{money(pulse.roll.realizedYTD)}</b> created</span>
        <span className="eis-chip"><b className="mono" style={{ color: 'var(--amber)' }}>{money(ct.leakage)}</b> leaking</span>
        <span className="eis-chip"><b className="mono" style={{ color: 'var(--red)' }}>{money(ct.valueAtRisk)}</b> at risk</span>
        <span className="eis-chip">{decisions.length ? <><b className="mono" style={{ color: 'var(--amber)' }}>{decisions.length}</b> decision{decisions.length === 1 ? '' : 's'} on you</> : 'no approvals pending'}</span>
        <span className="spacer" />
        <button className="btn sm ghost" onClick={() => navigate('mission')}>Mission Control</button>
        <button className="btn sm ghost" onClick={() => navigate('missions')}>Queue</button>
        <button className="btn sm" onClick={() => navigate('decisions')}>Decision Workspace →</button>
      </div>

      {/* hero — health score + value radar, the 30-second read */}
      <div className="intel-hero-grid">
      <div className="card pad eh-hero">
        <div className="eh-hero-gauge">
          <HealthGauge score={h.score} grade={h.grade} gradeLabel={h.gradeLabel} />
          <div className="eh-hero-note">Enterprise Health Score · 0–100 · weighted blend of six dimensions</div>
        </div>
        <div className="eh-hero-side">
          <div className="t-label">Trend this fiscal year</div>
          <TrendSpark trend={trend} />
          {trend.series.length > 1 && (
            <div className="eh-trend-d mono" style={{ color: last >= first ? 'var(--green)' : 'var(--red)' }}>
              {last >= first ? '▲' : '▼'} {Math.abs(last - first)} pts since {trend.months[0]}
            </div>
          )}
          <div className="eh-fine">{trend.note}</div>
          <div className="eh-fine">{h.benchNote}</div>
          <span className="badge b-navy" style={{ alignSelf: 'flex-start' }}><IconAI /> deterministic · rules-based</span>
        </div>
      </div>
      <div className="card pad intel-radar">
        <div className="card-h"><h3>Value Radar</h3><span className="spacer" /><span className="badge b-grey">pulse {pulse.index}</span></div>
        <Radar axes={pulse.axes} size={200} color="var(--navy)" />
        <div className="intel-radar-axes">
          {pulse.axes.map((a) => (
            <span key={a.key} className="intel-axis" title={axisNote(a.key)}>{a.label} <b className="mono">{pct(a.value)}</b></span>
          ))}
        </div>
      </div>
      </div>

      {/* six dimensions */}
      <div className="eh-dims section-gap">
        {h.dims.map((d) => {
          const active = dimKey === d.key
          return (
            <button key={d.key} className={`eh-dim ${active ? 'active' : ''}`} onClick={() => setDimKey(active ? null : d.key)} aria-expanded={active}>
              <div className="eh-dim-h">
                <span className="eh-dim-l">{d.label}</span>
                {d.proxy && <span className="badge b-grey" title={d.proxy}>proxy</span>}
                <span className="spacer" />
                <span className="eh-dim-s mono" style={{ color: scoreTone(d.score) }}>{Math.round(d.score * 100)}</span>
              </div>
              <div className="eh-dim-bar">
                <span className="eh-dim-bench" style={{ left: `${d.bench[0] * 100}%`, width: `${(d.bench[1] - d.bench[0]) * 100}%` }} />
                <span className="eh-dim-fill" style={{ width: `${d.score * 100}%`, background: scoreTone(d.score) }} />
              </div>
              <div className="eh-dim-w">weight {pct(d.weight)}{d.score >= d.bench[0] ? d.score >= d.bench[1] ? ' · above band' : ' · in band' : ' · below band'}</div>
            </button>
          )
        })}
      </div>

      {/* dimension drill-down */}
      {dim && (
        <div className="card pad eh-drill">
          <div className="card-h">
            <h3>{dim.label} — {Math.round(dim.score * 100)} / 100</h3>
            <span className="spacer" />
            <button className="btn sm ghost" onClick={() => setDimKey(null)}>Close</button>
          </div>
          <div className="eh-drill-f mono">{dim.formula}</div>
          <ul className="eh-drill-list">
            {dim.drivers.map((x, k) => <li key={k}>{x}</li>)}
          </ul>
          <div className="eh-fine">
            Benchmark band {Math.round(dim.bench[0] * 100)}–{Math.round(dim.bench[1] * 100)} (illustrative).
            {dim.proxy && <> Scored from a <b>{dim.proxy}</b>.</>}
          </div>
        </div>
      )}

      {/* enterprise pulse playback (5B.7 item 2) */}
      <PulsePlayback db={db} />

      {/* enterprise value waterfall (5B.7 item 4) */}
      <ValueWaterfall db={db} navigate={navigate} />

      {/* executive scenario mode (5B.7 item 6) */}
      <ExecScenario db={db} />

      {/* AI confidence heatmap (5B.7 item 5 — shared with Chief of Staff) */}
      <ConfidenceHeatmap db={db} />

      {/* strategic value map (5B.7 item 8) */}
      <StrategicMap db={db} navigate={navigate} />

      {/* enterprise pulse narrative */}
      <div className="card pad section-gap">
        <div className="card-h">
          <h3>Enterprise Pulse Narrative</h3>
          <span className="spacer" />
          <span className="badge b-navy"><IconAI /> rules-based narrative · as of {nar.asOf}</span>
        </div>
        <div className="pn-grid">
          {nar.sections.map((s) => (
            <div key={s.q} className="pn-sec">
              <div className="pn-q">{s.q}</div>
              {s.a.map((line, k) => <p key={k} className="pn-a">{line}</p>)}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
