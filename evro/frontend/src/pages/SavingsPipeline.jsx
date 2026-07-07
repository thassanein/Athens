import { useMemo, useState } from 'react'
import { savingsOpportunities, SAVINGS_LIFECYCLE, savingsType, savingsUnderManagement } from '../lib/procurement.js'
import { money, pct, num } from '../lib/format.js'

// Savings Pipeline (Phase One W4) — the whole procurement book in one list,
// grouped by lifecycle stage, every row opening the Opportunity Workspace.
// The nav entry point that the dashboard, decision queue and blockers all drill
// into. One reusable value object (savingsOpportunity) behind every figure.

export default function SavingsPipeline({ db, navigate }) {
  const opps = useMemo(() => savingsOpportunities(db), [db])
  const sum = useMemo(() => savingsUnderManagement(db), [db])
  const [type, setType] = useState('all')

  const shown = type === 'all' ? opps : opps.filter((o) => o.savingsType === type)
  const byStage = SAVINGS_LIFECYCLE.map((s) => ({ stage: s, rows: shown.filter((o) => o.stage === s.key) })).filter((g) => g.rows.length)
  const types = [{ key: 'all', label: 'All types' }, ...[...new Set(opps.map((o) => o.savingsType))].map((k) => ({ key: k, label: savingsType(k).label }))]

  return (
    <>
      <p className="page-intro">
        The procurement book — {num(sum.count)} savings opportunities, {money(sum.total)} under management, staged through one shared
        lifecycle. Select any opportunity for its full workspace: business case, evidence, risks, decision trail and the recommended next move.
      </p>

      <div className="svp-filters">
        {types.map((t) => (
          <button key={t.key} className={`chip ${type === t.key ? 'on' : ''}`} onClick={() => setType(t.key)}>{t.label}</button>
        ))}
      </div>

      {byStage.map(({ stage, rows }) => (
        <div key={stage.key} className="card pad section-gap">
          <div className="card-h">
            <h3>{stage.label}</h3>
            <span className="tiny muted" style={{ marginLeft: 8 }}>{stage.gloss}</span>
            <span className="spacer" />
            <span className="badge b-grey">{rows.length} · {money(rows.reduce((s, o) => s + o.value.headline, 0))}</span>
          </div>
          {/* desktop: dense table */}
          <div className="table-wrap svp-tablewrap">
            <table className="tbl">
              <thead><tr><th>Opportunity</th><th>Type</th><th>Owner</th><th className="num">Confidence</th><th className="num">Value</th></tr></thead>
              <tbody>
                {rows.map((o) => {
                  const st = savingsType(o.savingsType)
                  return (
                    <tr key={o.id} className="clickable" onClick={() => navigate('opportunity', { id: o.id })}>
                      <td><b>{o.name}</b> {o.ragStatus === 'red' && <span className="badge b-red" style={{ marginLeft: 4 }}>risk</span>}<div className="tiny muted">{o.supplier}</div></td>
                      <td><span className="badge" style={{ background: 'color-mix(in srgb, ' + st.accent + ' 20%, transparent)', color: st.accent }}>{st.short}</span></td>
                      <td>{o.owner}</td>
                      <td className="num mono">{pct(o.confidence)}</td>
                      <td className="num mono">{money(o.value.headline)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* mobile: thumb-friendly opportunity summary cards */}
          <div className="svp-cards">
            {rows.map((o) => {
              const st = savingsType(o.savingsType)
              return (
                <button key={o.id} className="svp-card" onClick={() => navigate('opportunity', { id: o.id })}>
                  <div className="svp-card-top">
                    <b>{o.name}</b>
                    {o.ragStatus === 'red' && <span className="badge b-red">risk</span>}
                  </div>
                  <div className="svp-card-meta">
                    <span className="badge" style={{ background: 'color-mix(in srgb, ' + st.accent + ' 20%, transparent)', color: st.accent }}>{st.short}</span>
                    <span className="tiny muted">{o.owner}</span>
                    <span className="spacer" />
                    <span className="mono tiny">{pct(o.confidence)}</span>
                    <b className="mono svp-card-v">{money(o.value.headline)}</b>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}
