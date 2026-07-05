import { useMemo, useState } from 'react'
import { confidenceHeatmap, HEATMAP_CAPS } from '../lib/evidence.js'
import { pct } from '../lib/format.js'
import { IconAI } from './Icons.jsx'

// AI Confidence Heatmap (5B.7 item 5) — recommendation confidence and quality
// by executive domain × capability. Cells show avg confidence; a ⚠ marks weak
// evidence (low explainability or thin evidence lists). Domains without agent
// coverage read as gaps — governance sees where NOT to trust yet.

const heat = (conf) => `color-mix(in srgb, ${conf >= 0.85 ? 'var(--green)' : conf >= 0.7 ? 'var(--navy)' : 'var(--amber)'} ${Math.round(18 + conf * 40)}%, var(--card))`

export default function ConfidenceHeatmap({ db }) {
  const hm = useMemo(() => confidenceHeatmap(db), [db])
  const [pick, setPick] = useState(null) // {domain, cap}
  const pickedRecs = pick ? hm.rows.find((r) => r.domain === pick.domain)?.cells.find((c) => c.cap === pick.cap)?.recs || [] : []

  return (
    <div className="card pad section-gap">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3>AI Confidence Heatmap</h3>
        <span className="spacer" />
        <span className="badge b-navy"><IconAI /> {hm.total} open signals · rules-based</span>
      </div>
      <p className="muted vwf-sub">
        Where the agent team is confident — and where the evidence is thin. ⚠ flags weak
        evidence; an empty row is a genuine coverage gap, not a good score.
      </p>
      <div className="table-wrap">
        <table className="tbl chm-tbl">
          <thead>
            <tr><th>Domain</th>{HEATMAP_CAPS.map((c) => <th key={c.key}>{c.label}</th>)}<th>Domain read</th></tr>
          </thead>
          <tbody>
            {hm.rows.map((r) => (
              <tr key={r.domain} className={r.covered ? '' : 'chm-gap'}>
                <td className="chm-dom">{r.domain}</td>
                {r.cells.map((c) => (
                  <td key={c.cap}>
                    {c.empty
                      ? <span className="chm-empty">—</span>
                      : (
                        <button className={`chm-cell ${pick && pick.domain === r.domain && pick.cap === c.cap ? 'on' : ''}`} style={{ background: heat(c.conf) }}
                          onClick={() => setPick(pick && pick.domain === r.domain && pick.cap === c.cap ? null : { domain: r.domain, cap: c.cap })}>
                          <b className="mono">{pct(c.conf)}</b>
                          <span>{c.count} rec{c.count === 1 ? '' : 's'}{c.weak ? ' ⚠' : ''}</span>
                        </button>
                      )}
                  </td>
                ))}
                <td className="chm-read">
                  {r.covered
                    ? <>avg <b className="mono">{pct(r.conf)}</b>{r.weak && <span className="chm-weak"> · weak evidence</span>}</>
                    : <span className="chm-weak">{r.note}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pickedRecs.length > 0 && (
        <div className="vwf-drill">
          <div className="vwf-drill-h">
            <b>{pick.domain} · {HEATMAP_CAPS.find((c) => c.key === pick.cap)?.label}</b>
            <span className="spacer" />
            <button className="btn sm ghost" onClick={() => setPick(null)}>Close</button>
          </div>
          {pickedRecs.map((r) => (
            <div key={r.id} className="chm-rec">
              <span className="badge b-navy">{r.agent}</span>
              <span className="chm-rec-t">{r.title}</span>
              <span className="mono" style={{ fontWeight: 700 }}>{pct(r.confidence)}</span>
              <span className="muted" style={{ fontSize: 11 }}>{(r.evidence || []).length} evidence item{(r.evidence || []).length === 1 ? '' : 's'}</span>
            </div>
          ))}
        </div>
      )}
      {hm.gaps.length > 0 && (
        <div className="eh-fine" style={{ marginTop: 8 }}>
          Coverage gaps: {hm.gaps.join(', ')} — no deterministic agent watches these yet. That is a
          roadmap item, not a judgement.
        </div>
      )}
    </div>
  )
}
