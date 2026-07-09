import { useMemo, useState } from 'react'
import { savingsOpportunities, lifecycleMeta, savingsType, savingsUnderManagement } from '../lib/procurement.js'
import { pipelineBoard, PIPELINE_PHASES, windowSummary, savingsWindow, opportunityYearValue, pipelineYears, MEASUREMENT_MONTHS } from '../lib/procurement-window.js'
import { money, pct, num } from '../lib/format.js'
import Term from '../components/Term.jsx'
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

// Horizontal process funnel — five solid, colour-per-phase segments that taper
// left→right into one continuous funnel (clip-path trapezoids share boundary
// heights, so the neck flows). Opportunities are bubbles sitting INSIDE each
// segment, sized by annual run-rate and coloured by savings type. Click to open.
const FUNNEL_H = [100, 82, 64, 48, 36, 28] // 6 boundary heights %, tapering neck
function FunnelView({ board, match, navigate, valueOf, valueLabel = '/yr' }) {
  const cols = board.map((c) => ({ ...c, cards: c.cards.filter((o) => match(o) && valueOf(o) > 0) }))
  const maxV = Math.max(1, ...cols.flatMap((c) => c.cards.map((o) => valueOf(o))))
  const dot = (v) => Math.round(11 + 28 * Math.sqrt(Math.min(v, maxV) / maxV)) // px
  const [hover, setHover] = useState(null) // { o, x, y }
  const show = (o) => (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const p = e.currentTarget.closest('.pfun').getBoundingClientRect()
    setHover({ o, x: r.left - p.left + r.width / 2, y: r.top - p.top })
  }
  return (
    <div className="pfun pfun2" onMouseLeave={() => setHover(null)}>
      <div className="pfun2-cols">
        {cols.map((col, i) => {
          const hL = FUNNEL_H[i], hR = FUNNEL_H[i + 1]
          const clip = `polygon(0 ${(100 - hL) / 2}%, 100% ${(100 - hR) / 2}%, 100% ${(100 + hR) / 2}%, 0 ${(100 + hL) / 2}%)`
          const total = col.cards.reduce((s, o) => s + valueOf(o), 0)
          return (
            <div key={col.key} className="pfun2-col">
              <div className="pfun2-head">
                <span className="pfun2-tick" style={{ background: col.tone }} />
                <b>{col.label}</b>
                <span className="pfun2-count" style={{ color: col.tone }}>{col.cards.length}</span>
              </div>
              <div className="pfun2-seg-wrap">
                <div className="pfun2-seg" style={{ clipPath: clip, background: `linear-gradient(180deg, color-mix(in srgb, ${col.tone} 34%, transparent), color-mix(in srgb, ${col.tone} 14%, transparent))` }} />
                <div className="pfun2-seg-edge" style={{ clipPath: clip, boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${col.tone} 55%, transparent)` }} />
                <div className="pfun2-dots">
                  {col.cards.map((o) => {
                    const st = savingsType(o.savingsType)
                    const d = dot(valueOf(o))
                    const active = hover && hover.o.id === o.id
                    return (
                      <button key={o.id} className={`pfun-dot ${active ? 'active' : ''} ${hover && !active ? 'dim' : ''}`} onClick={() => navigate('opportunity', { id: o.id })}
                        onMouseEnter={show(o)} onFocus={show(o)} onMouseLeave={() => setHover(null)} onBlur={() => setHover(null)}
                        style={{ width: d, height: d, background: st.accent, borderColor: o.ragStatus === 'red' ? 'var(--red)' : 'transparent' }}
                        aria-label={`${o.name}, ${money(o.value.headline)} per year`} />
                    )
                  })}
                  {col.cards.length === 0 && <span className="pfun2-empty">—</span>}
                </div>
              </div>
              <div className="pfun2-foot">
                <div className="mono pfun2-foot-v" style={{ color: col.tone }}>{money(total)}<span className="pboard-yr">{valueLabel}</span></div>
                <div className="tiny muted">{col.gloss}</div>
              </div>
            </div>
          )
        })}
      </div>
      {hover && (() => {
        const o = hover.o; const st = savingsType(o.savingsType)
        return (
          <div className="pfun-tip" style={{ left: hover.x, top: hover.y }} role="tooltip">
            <div className="pfun-tip-h"><span className="pfun-tip-dot" style={{ background: st.accent }} /><b>{o.name}</b>{o.ragStatus === 'red' && <span className="badge b-red">at risk</span>}</div>
            <div className="pfun-tip-v mono">{money(valueOf(o))}<span className="pboard-yr">{valueLabel}</span></div>
            <div className="pfun-tip-rows">
              <div><span>Type</span><b style={{ color: st.accent }}>{st.label}</b></div>
              <div><span>Stage</span><b>{o.stageLabel}</b></div>
              <div><span>Confidence</span><b className="mono">{pct(o.confidence)}</b></div>
              <div><span>Owner</span><b>{o.owner}</b></div>
              {o.window && <div><span>Window</span><b>{o.window.launched ? (o.window.graduated ? 'banked' : `mo ${o.window.monthsElapsed}/${MEASUREMENT_MONTHS}`) : 'pre-launch'}</b></div>}
            </div>
            <div className="pfun-tip-cta tiny">Click to open workspace →</div>
          </div>
        )
      })()}
    </div>
  )
}

export default function SavingsPipeline({ db, navigate, flash }) {
  const opps = useMemo(() => savingsOpportunities(db), [db])
  const sum = useMemo(() => savingsUnderManagement(db), [db])
  const board = useMemo(() => pipelineBoard(db), [db])
  const win = useMemo(() => windowSummary(db), [db])
  const [type, setType] = useState('all')
  const [view, setView] = useState('funnel')
  const [year, setYear] = useState('all')
  const years = useMemo(() => pipelineYears(db), [db])

  // Time phasing: 'all years' shows each saving's annual run-rate (headline);
  // a specific year shows the risk-adjusted impact that lands in that year.
  const valueOf = (o) => (year === 'all' ? o.value.headline : opportunityYearValue(db, o, year, 'rav'))
  const valueLabel = year === 'all' ? '/yr' : ` ${year}`
  const match = (o) => (type === 'all' || o.savingsType === type)
  const inScope = (o) => match(o) && valueOf(o) > 0
  const shown = opps.filter(inScope)
  // List groups by the four project phases (not the 11 fine-grained stages).
  const byPhase = PIPELINE_PHASES.map((ph) => ({ phase: ph, rows: shown.filter((o) => lifecycleMeta(o.stage).phase === ph.key) })).filter((g) => g.rows.length)
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
          <b><Term name="Measurement window">12-month measurement window</Term> · <Term name="Annual impact">annualized run-rate</Term></b>
          <span className="tiny muted">Values are each saving's annual run-rate (one 12-month window from launch, then banked). Totals are run-rate at full delivery — only FP&amp;A-validated actuals count as realized.</span>
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
          <button role="tab" aria-selected={view === 'funnel'} className={`chip ${view === 'funnel' ? 'on' : ''}`} onClick={() => setView('funnel')}>Funnel</button>
          <button role="tab" aria-selected={view === 'board'} className={`chip ${view === 'board' ? 'on' : ''}`} onClick={() => setView('board')}>Board</button>
          <button role="tab" aria-selected={view === 'list'} className={`chip ${view === 'list' ? 'on' : ''}`} onClick={() => setView('list')}>List</button>
        </div>
        <span className="svp-sep" />
        <div className="svp-yeartoggle" role="tablist" aria-label="Impact year">
          <button role="tab" aria-selected={year === 'all'} className={`chip ${year === 'all' ? 'on' : ''}`} onClick={() => setYear('all')}>All yrs</button>
          {years.map((y) => (
            <button key={y} role="tab" aria-selected={year === y} className={`chip ${year === y ? 'on' : ''}`} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
        <span className="spacer" />
        <ExportMenu db={db} flash={flash} label="Export book" />
      </div>
      {year !== 'all' && (
        <p className="tiny muted" style={{ margin: '-6px 0 12px' }}>Showing <b>{year} risk-adjusted impact</b> — each saving's annual run-rate phased into {year}. Switch to “All yrs” for full annual run-rate.</p>
      )}

      {/* Savings-type toggle — doubles as the colour legend for the funnel/board */}
      <div className="svp-typebar" role="tablist" aria-label="Filter by savings type">
        {types.map((t) => {
          const st = t.key === 'all' ? null : savingsType(t.key)
          return (
            <button key={t.key} role="tab" aria-selected={type === t.key} className={`svp-typechip ${type === t.key ? 'on' : ''}`} onClick={() => setType(t.key)}>
              <span className="svp-typedot" style={{ background: st ? st.accent : 'var(--grey)' }} />
              {t.label}
              {t.key !== 'all' && <span className="svp-typen">{opps.filter((o) => o.savingsType === t.key).length}</span>}
            </button>
          )
        })}
      </div>

      {view === 'funnel' ? (
        <div className="card pad section-gap">
          <FunnelView board={board} match={match} navigate={navigate} valueOf={valueOf} valueLabel={valueLabel} />
        </div>
      ) : view === 'board' ? (
        <div className="pboard">
          {board.map((col) => {
            const cards = col.cards.filter(inScope)
            return (
              <div key={col.key} className="pboard-col">
                <div className="pboard-h" style={{ borderTopColor: col.tone }}>
                  <div className="pboard-h-t"><b>{col.label}</b><span className="badge b-grey">{cards.length}</span></div>
                  <div className="tiny muted">{col.gloss}</div>
                  <div className="mono pboard-val" style={{ color: col.tone }}>{money(cards.reduce((s, o) => s + valueOf(o), 0))}<span className="pboard-yr">{valueLabel}</span></div>
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
                          <b className="mono">{money(valueOf(o))}{(year !== 'all' || o.value.bucket !== 'realized') && <span className="pboard-yr">{valueLabel}</span>}</b>
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
        byPhase.map(({ phase, rows }) => (
          <div key={phase.key} className="card pad section-gap svp-stage">
            <div className="card-h">
              <h3><span className="svp-phdot" style={{ background: phase.tone }} />{phase.label}</h3>
              <span className="tiny muted" style={{ marginLeft: 8 }}>{phase.gloss}</span>
              <span className="spacer" />
              <span className="badge b-grey">{rows.length} · {money(rows.reduce((s, o) => s + valueOf(o), 0))}{year !== 'all' ? ` (${year})` : ''}</span>
            </div>
            {/* desktop: dense table */}
            <div className="table-wrap svp-tablewrap">
              <table className="tbl">
                <thead><tr><th>Opportunity</th><th>Type</th><th>Owner</th><th>12-mo window</th><th className="num">Confidence</th><th className="num">{year === 'all' ? 'Annual value' : `${year} impact`}</th></tr></thead>
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
                        <td className="num mono">{money(valueOf(o))}</td>
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
                      <b className="mono svp-card-v">{money(valueOf(o))}</b>
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
