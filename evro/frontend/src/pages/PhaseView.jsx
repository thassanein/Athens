import { useMemo } from 'react'
import { savingsOpportunities, savingsType, lifecycleMeta } from '../lib/procurement.js'
import { savingsWindow, MEASUREMENT_MONTHS } from '../lib/procurement-window.js'
import { money, pct, num } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import ExportMenu from '../components/ExportMenu.jsx'

// Phase view — ONE standardized screen for every project phase (Pipeline →
// Commit → Execute → Realize). Same header, same stepper, same four KPIs, same
// deal table on all four; only the phase's data and the one phase-specific
// emphasis change. Learn it once, read any phase. Every row opens the workspace.

// The four phases as the procurement team walks them. `stages` are the engine
// lifecycle phases each nav-phase rolls up (Realize covers realizing + banked).
export const PHASES = [
  { key: 'pipeline', label: 'Pipeline', stages: ['pipeline'], tone: 'var(--opp)',
    plain: 'Find and size the opportunity.',
    detail: 'Ideas are surfaced from spend analytics, qualified against the Finance baseline, and built into a business case.',
    next: 'Qualify the baseline and get a category owner on it.', extra: 'evidence' },
  { key: 'commit', label: 'Commit', stages: ['commit'], tone: 'var(--brand-value)',
    plain: 'Lock in the deal and the supplier.',
    detail: 'The business case is approved, the win-room negotiates rate and terms, and the supplier is awarded.',
    next: 'Clear the sign-off ladder and award the contract.', extra: 'decision' },
  { key: 'execute', label: 'Execute', stages: ['execute'], tone: 'var(--navy)',
    plain: 'Make the change real and prove it.',
    detail: 'The new contract rolls into operations and spend, and Finance validates the delivered value against the baseline.',
    next: 'Drive adoption and get the actuals validated.', extra: 'window' },
  { key: 'realize', label: 'Realize', stages: ['realized', 'closed'], tone: 'var(--green)',
    plain: 'Bank the savings and protect them.',
    detail: 'Validated value flows through the P&L for a 12-month window from first reporting, then banks to protected run-rate.',
    next: 'Hold the run-rate and guard against erosion.', extra: 'window' },
]
export const phaseMeta = (key) => PHASES.find((p) => p.key === key) || PHASES[0]

export default function PhaseView({ db, navigate, flash, phase = 'pipeline' }) {
  const meta = phaseMeta(phase)
  const opps = useMemo(() => savingsOpportunities(db), [db])

  // Counts across ALL four phases, for the shared stepper.
  const counts = useMemo(() => {
    const byPhase = {}
    for (const o of opps) { const ph = lifecycleMeta(o.stage).phase; byPhase[ph] = (byPhase[ph] || 0) + 1 }
    return PHASES.map((p) => ({ ...p, count: p.stages.reduce((s, st) => s + (byPhase[st] || 0), 0) }))
  }, [opps])

  // Deals in THIS phase.
  const rows = useMemo(() => opps
    .filter((o) => meta.stages.includes(lifecycleMeta(o.stage).phase))
    .map((o) => ({ ...o, window: savingsWindow(db, o) }))
    .sort((a, b) => b.value.headline - a.value.headline), [opps, db, meta])

  const total = rows.reduce((s, o) => s + o.value.headline, 0)
  const redCount = rows.filter((o) => o.ragStatus === 'red').length
  const avgConf = rows.length ? rows.reduce((s, o) => s + o.confidence * o.value.headline, 0) / (total || 1) : 0

  const win = (w) => {
    if (!w || !w.launched) return <span className="tiny muted">pre-launch</span>
    if (w.graduated) return <span className="pv-badge banked">banked</span>
    return (
      <div className="pv-win" title={`Month ${w.monthsElapsed} of ${MEASUREMENT_MONTHS}`}>
        <div className="pv-win-track"><div className="pv-win-fill" style={{ width: `${w.pct * 100}%` }} /></div>
        <span className="tiny muted">mo {w.monthsElapsed}/{MEASUREMENT_MONTHS}</span>
      </div>
    )
  }
  const nextStep = (o) => (o.nextDecision?.label) || lifecycleMeta(o.stage).label
  const open = (id) => navigate('opportunity', { id })
  const rowNav = (id) => ({
    className: 'clickable', role: 'button', tabIndex: 0, onClick: () => open(id),
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(id) } },
  })

  return (
    <>
      <div className="pdash-toolbar">
        <p className="page-intro" style={{ margin: 0 }}>
          <b>{meta.label} — {meta.plain}</b> {meta.detail} <span className="tiny muted">{num(rows.length)} deal{rows.length === 1 ? '' : 's'} here · {money(total)}/yr.</span>
        </p>
        <ExportMenu db={db} flash={flash} label="Export book pack" />
      </div>

      {/* Shared phase stepper — the same on every phase view, current one lit */}
      <div className="pv-stepper card pad">
        {counts.map((p, i) => (
          <button key={p.key} className={`pv-step ${p.key === meta.key ? 'on' : ''}`} onClick={() => navigate(`phase_${p.key}`)} title={p.plain}>
            <span className="pv-step-dot" style={{ background: p.tone }} />
            <span className="pv-step-l">{p.label}</span>
            <span className="pv-step-n mono">{num(p.count)}</span>
            {i < counts.length - 1 && <span className="pv-step-arrow" aria-hidden="true">→</span>}
          </button>
        ))}
      </div>

      {/* Standardized KPI row — identical structure on all four phases */}
      <div className="tiles">
        <Tile tone="navy" label="Deals in this phase" value={num(rows.length)} sub={meta.next} />
        <Tile tone="green" label="Annual value here" value={money(total)} sub="combined run-rate at full delivery" />
        <Tile tone="amber" label="Avg confidence" value={pct(avgConf)} sub="value-weighted, how likely to land" />
        <Tile tone="red" label="At risk" value={num(redCount)} sub={redCount ? 'flagged red — need attention' : 'none flagged'} />
      </div>

      {/* Standardized deal table */}
      <div className="card pad section-gap">
        <div className="card-h">
          <h3>Deals in {meta.label}</h3>
          <span className="tiny muted" style={{ marginLeft: 8 }}>ranked by annual value · open any for its full workspace</span>
        </div>
        {rows.length === 0 ? (
          <p className="muted" style={{ padding: '10px 2px' }}>No deals in this phase right now.</p>
        ) : (
          <>
            <div className="table-wrap pv-tablewrap">
              <table className="tbl">
                <thead><tr>
                  <th>Opportunity</th><th>Owner</th><th>Type</th><th>Next step</th>
                  <th>12-mo window</th><th className="num">Confidence</th><th className="num">Value/yr</th>
                </tr></thead>
                <tbody>
                  {rows.map((o) => {
                    const st = savingsType(o.savingsType)
                    return (
                      <tr key={o.id} {...rowNav(o.id)}>
                        <td><b>{o.name}</b>{o.ragStatus === 'red' && <span className="badge b-red" style={{ marginLeft: 4 }}>risk</span>}<div className="tiny muted">{o.supplier || o.category}</div></td>
                        <td>{o.owner}</td>
                        <td><span className="badge" style={{ background: `color-mix(in srgb, ${st.accent} 20%, transparent)`, color: st.accent }}>{st.short}</span></td>
                        <td>{nextStep(o)}{o.nextDecision?.missing?.length > 0 && <div className="tiny" style={{ color: 'var(--brand-energy)' }}>{o.nextDecision.missing.length} to provide</div>}</td>
                        <td style={{ minWidth: 116 }}>{win(o.window)}</td>
                        <td className="num mono">{pct(o.confidence)}</td>
                        <td className="num mono">{money(o.value.headline)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* mobile cards — same fields, thumb-friendly */}
            <div className="pv-cards">
              {rows.map((o) => {
                const st = savingsType(o.savingsType)
                return (
                  <button key={o.id} className="pv-card" onClick={() => open(o.id)}>
                    <div className="pv-card-top"><b>{o.name}</b>{o.ragStatus === 'red' && <span className="badge b-red">risk</span>}</div>
                    <div className="pv-card-meta">
                      <span className="badge" style={{ background: `color-mix(in srgb, ${st.accent} 20%, transparent)`, color: st.accent }}>{st.short}</span>
                      <span className="tiny muted">{o.owner}</span>
                      <span className="spacer" />
                      <span className="mono tiny">{pct(o.confidence)}</span>
                      <b className="mono pv-card-v">{money(o.value.headline)}</b>
                    </div>
                    <div className="pv-card-next tiny muted">{nextStep(o)}</div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}
