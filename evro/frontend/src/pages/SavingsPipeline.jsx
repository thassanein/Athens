import { useMemo, useState } from 'react'
import { savingsOpportunities, SAVINGS_LIFECYCLE, savingsType, savingsUnderManagement } from '../lib/procurement.js'
import { pipelineBoard, windowSummary, savingsWindow, MEASUREMENT_MONTHS } from '../lib/procurement-window.js'
import { money, pct, num } from '../lib/format.js'
import ExportMenu from '../components/ExportMenu.jsx'

// Savings Pipeline (Phase One W4) — the whole procurement book in one view. Two
// lenses on the same reconciled data: a dense LIST grouped by lifecycle stage,
// and a real PIPELINE BOARD where opportunities flow left-to-right through the
// five phases. The 12-month measurement window rides on every realizing card, so
// the cap is visible where the value lives. One value object behind every figure.

// The 12-month window meter — month N of 12 from first financial reporting.
function WindowMeter({ w, compact = false }) {
  if (!w.launched) return <span className="tiny muted">pre-launch · not yet reporting</span>
  if (w.graduated) return <span className="swin-badge banked">Banked · 12-mo window complete</span>
  return (
    <div className={`swin ${compact ? 'compact' : ''}`} title={`Month ${w.monthsElapsed} of ${MEASUREMENT_MONTHS} · window ends ${w.windowEnd}`}>
      <div className="swin-track"><div className="swin-fill" style={{ width: `${w.pct * 100}%` }} /></div>
      <span className="swin-lbl tiny">mo {w.monthsElapsed}/{MEASUREMENT_MONTHS}{w.monthsRemaining <= 3 ? ` · ${w.monthsRemaining} left` : ''}</span>
    </div>
  )
}

export default function SavingsPipeline({ db, navigate, flash }) {
  const opps = useMemo(() => savingsOpportunities(db), [db])
  const sum = useMemo(() => savingsUnderManagement(db), [db])
  const board = useMemo(() => pipelineBoard(db), [db])
  const win = useMemo(() => windowSummary(db), [db])
  const [type, setType] = useState('all')
  const [view, setView] = useState('board')

  const match = (o) => type === 'all' || o.savingsType === type
  const shown = opps.filter(match)
  const byStage = SAVINGS_LIFECYCLE.map((s) => ({ stage: s, rows: shown.filter((o) => o.stage === s.key) })).filter((g) => g.rows.length)
  const types = [{ key: 'all', label: 'All types' }, ...[...new Set(opps.map((o) => o.savingsType))].map((k) => ({ key: k, label: savingsType(k).label }))]

  return (
    <>
      <p className="page-intro">
        The procurement book — {num(sum.count)} savings opportunities, {money(sum.total)} under management, flowing through one
        shared lifecycle. Athens counts each saving for {MEASUREMENT_MONTHS} months from first financial reporting; the window rides
        on every realizing card below. Select any opportunity for its full workspace.
      </p>

      {/* 12-month window summary — the cap philosophy, made visible. Every value
          is an annual (per-year) impact — one saving = one 12-month run-rate. */}
      <div className="swin-summary card pad">
        <div className="swin-sum-h">
          <b>12-month measurement window · annual impact</b>
          <span className="tiny muted">Each saving counts for {MEASUREMENT_MONTHS} months from launch (first FP&amp;A-validated reporting) — one year of impact — then banks to protected run-rate.</span>
        </div>
        <div className="swin-sum-grid">
          <div className="swin-sum-cell"><b className="mono">{num(win.inWindow.count)}</b><span>in window · {money(win.inWindow.value)}/yr</span></div>
          <div className="swin-sum-cell"><b className="mono">{num(win.graduated.count)}</b><span>banked · {money(win.graduated.value)}/yr</span></div>
          <div className="swin-sum-cell"><b className="mono">{num(win.preLaunch.count)}</b><span>pre-launch · {money(win.preLaunch.value)}/yr</span></div>
          <div className="swin-sum-cell"><b className="mono">{num(win.expiring.length)}</b><span>expiring ≤3 mo</span></div>
        </div>
      </div>

      <div className="svp-filters">
        <div className="svp-viewtoggle" role="tablist" aria-label="Pipeline view">
          <button role="tab" aria-selected={view === 'board'} className={`chip ${view === 'board' ? 'on' : ''}`} onClick={() => setView('board')}>Pipeline board</button>
          <button role="tab" aria-selected={view === 'list'} className={`chip ${view === 'list' ? 'on' : ''}`} onClick={() => setView('list')}>List</button>
        </div>
        <span className="svp-sep" />
        {types.map((t) => (
          <button key={t.key} className={`chip ${type === t.key ? 'on' : ''}`} onClick={() => setType(t.key)}>{t.label}</button>
        ))}
        <span className="spacer" />
        <ExportMenu db={db} flash={flash} label="Export book" />
      </div>

      {view === 'board' ? (
        <div className="pboard">
          {board.map((col) => {
            const cards = col.cards.filter(match)
            return (
              <div key={col.key} className="pboard-col">
                <div className="pboard-h" style={{ borderTopColor: col.tone }}>
                  <div className="pboard-h-t"><b>{col.label}</b><span className="badge b-grey">{cards.length}</span></div>
                  <div className="tiny muted">{col.gloss}</div>
                  <div className="mono pboard-val" style={{ color: col.tone }}>{money(cards.reduce((s, o) => s + o.value.headline, 0))}<span className="pboard-yr">/yr</span></div>
                </div>
                <div className="pboard-cards">
                  {cards.length === 0 && <div className="pboard-empty tiny muted">—</div>}
                  {cards.map((o) => {
                    const st = savingsType(o.savingsType)
                    return (
                      <button key={o.id} className="pboard-card" onClick={() => navigate('opportunity', { id: o.id })}>
                        <div className="pboard-card-t">
                          <b>{o.name}</b>
                          {o.ragStatus === 'red' && <span className="badge b-red">risk</span>}
                        </div>
                        <div className="pboard-card-m">
                          <span className="badge" style={{ background: 'color-mix(in srgb, ' + st.accent + ' 20%, transparent)', color: st.accent }}>{st.short}</span>
                          <span className="tiny muted">{o.owner}</span>
                          <span className="spacer" />
                          <b className="mono">{money(o.value.headline)}<span className="pboard-yr">/yr</span></b>
                        </div>
                        {(col.key === 'realized' || col.key === 'execute' || col.key === 'closed') && <WindowMeter w={o.window} compact />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        byStage.map(({ stage, rows }) => (
          <div key={stage.key} className="card pad section-gap svp-stage">
            <div className="card-h">
              <h3>{stage.label}</h3>
              <span className="tiny muted" style={{ marginLeft: 8 }}>{stage.gloss}</span>
              <span className="spacer" />
              <span className="badge b-grey">{rows.length} · {money(rows.reduce((s, o) => s + o.value.headline, 0))}</span>
            </div>
            {/* desktop: dense table */}
            <div className="table-wrap svp-tablewrap">
              <table className="tbl">
                <thead><tr><th>Opportunity</th><th>Type</th><th>Owner</th><th>12-mo window</th><th className="num">Confidence</th><th className="num">Value</th></tr></thead>
                <tbody>
                  {rows.map((o) => {
                    const st = savingsType(o.savingsType)
                    const open = () => navigate('opportunity', { id: o.id })
                    return (
                      <tr key={o.id} className="clickable" role="button" tabIndex={0} onClick={open}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}>
                        <td><b>{o.name}</b> {o.ragStatus === 'red' && <span className="badge b-red" style={{ marginLeft: 4 }}>risk</span>}<div className="tiny muted">{o.supplier}</div></td>
                        <td><span className="badge" style={{ background: 'color-mix(in srgb, ' + st.accent + ' 20%, transparent)', color: st.accent }}>{st.short}</span></td>
                        <td>{o.owner}</td>
                        <td style={{ minWidth: 120 }}><WindowMeter w={savingsWindow(db, o)} compact /></td>
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
                    <WindowMeter w={savingsWindow(db, o)} compact />
                  </button>
                )
              })}
            </div>
          </div>
        ))
      )}
    </>
  )
}
