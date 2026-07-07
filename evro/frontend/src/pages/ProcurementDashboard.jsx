import { useMemo } from 'react'
import { procurementModel, lifecycleMeta } from '../lib/procurement.js'
import { forecastCurve } from '../lib/engine.js'
import { money, pct, num, monthLabel, dateLabel } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { LineChart } from '../components/Charts.jsx'

// Procurement Executive Dashboard (Phase One W3) — the five-second read: how
// much value is under management, where it is in the lifecycle, how confident
// we are, what is at risk, and the single next decision that matters. Every
// figure comes from procurementModel(db) — the same value objects the
// opportunity workspace, narrative and evidence views read — so it reconciles
// to the dollar. Deterministic; no fabricated numbers.

const BUCKET_TONE = { potential: 'var(--opp)', committed: 'var(--amber)', realized: 'var(--green)', sustained: 'var(--navy)' }

function PipelineFunnel({ pipeline, navigate }) {
  const max = Math.max(1, ...pipeline.map((s) => s.value))
  const phaseTone = { pipeline: 'var(--opp)', commit: 'var(--amber)', execute: 'var(--brand-value)', realized: 'var(--green)', closed: 'var(--grey)' }
  return (
    <div className="pdash-funnel">
      {pipeline.map((s) => (
        <button key={s.key} className="pdash-stage" onClick={() => navigate('savingspipeline')} title={s.gloss}>
          <span className="pdash-stage-l">{s.label}</span>
          <span className="pdash-stage-bar">
            <span className="pdash-stage-fill" style={{ width: `${Math.max(s.value ? 3 : 0, (s.value / max) * 100)}%`, background: phaseTone[s.phase] || 'var(--navy)' }} />
          </span>
          <span className="pdash-stage-n mono">{s.count}</span>
          <span className="pdash-stage-v mono">{s.value ? money(s.value) : '—'}</span>
        </button>
      ))}
    </div>
  )
}

function TypeBars({ byType }) {
  const shown = byType.filter((t) => t.count > 0)
  const max = Math.max(1, ...shown.map((t) => t.value))
  return (
    <div className="pdash-types">
      {shown.map((t) => (
        <div key={t.key} className="pdash-type" title={t.definition}>
          <span className="pdash-type-l">{t.label}<span className="pdash-type-c">{t.count}</span></span>
          <span className="pdash-type-bar"><span className="pdash-type-fill" style={{ width: `${(t.value / max) * 100}%`, background: t.accent }} /></span>
          <span className="pdash-type-v mono">{money(t.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function ProcurementDashboard({ db, navigate }) {
  const m = useMemo(() => procurementModel(db), [db])
  const { sum, pipeline, byType, velocity, blockers, opportunities } = m
  const fy = db.meta.fiscalYear

  // Decision queue — opportunities whose next move needs a human decision
  // (pending sign-off or missing gate evidence), ranked by expected value.
  const decisionQueue = useMemo(() => opportunities
    .filter((o) => o.nextDecision && (o._raw.request || o.nextDecision.missing.length > 0))
    .sort((a, b) => b.nextDecision.expectedValue - a.nextDecision.expectedValue)
    .slice(0, 6), [opportunities])

  const atRisk = useMemo(() => opportunities
    .filter((o) => o.ragStatus === 'red')
    .sort((a, b) => b.value.headline - a.value.headline)
    .slice(0, 6), [opportunities])

  // Forecast impact by period — realized run-rate to date, then risk-adjusted
  // projection for the remaining fiscal months (engine forecastCurve).
  const curve = useMemo(() => forecastCurve(db), [db])
  const xLabels = curve.map((c) => monthLabel(c.month))
  const elapsedIdx = curve.findIndex((c) => !c.past)
  const anchor = elapsedIdx > 0 ? curve[elapsedIdx - 1].actual : null
  const fut = (sel) => curve.map((c, idx) => (idx === elapsedIdx - 1 ? anchor : c.past ? null : sel(c)))
  const series = [
    { key: 'actual', label: 'Realized (validated)', color: 'var(--green)', points: curve.map((c) => (c.past ? c.actual : null)) },
    { key: 'expected', label: 'Risk-adjusted forecast', color: 'var(--navy)', dashed: true, points: fut((c) => c.expected) },
    { key: 'committed', label: 'Committed', color: 'var(--amber)', dashed: true, points: fut((c) => c.committed) },
  ]

  const top = decisionQueue[0]
  const redCount = opportunities.filter((o) => o.ragStatus === 'red').length
  // keyboard-operable table rows (WCAG 2.1.1) — Enter/Space open the workspace
  const rowNav = (id) => ({
    className: 'clickable', role: 'button', tabIndex: 0,
    onClick: () => navigate('opportunity', { id }),
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('opportunity', { id }) } },
  })

  return (
    <>
      <p className="page-intro">
        <b>Procurement</b> — the first active capability of EVRO. Enterprise savings under management across {num(sum.count)} opportunities,
        staged through one shared lifecycle. Every figure is deterministic and reconciles across the workspace, narrative and evidence views —
        no savings target, value ranked by return.
      </p>

      {/* Savings Under Management — the headline + the four progress lenses */}
      <div className="pdash-sum card pad">
        <div className="pdash-sum-hero">
          <div className="pdash-sum-label">Enterprise Savings Under Management · FY{fy}</div>
          <div className="pdash-sum-big mono">{money(sum.total)}</div>
          <div className="pdash-sum-sub">{num(sum.count)} opportunities · {pct(sum.confidence)} value-weighted confidence · {money(velocity.perMonth)}/mo velocity</div>
        </div>
        <div className="pdash-lenses">
          {[
            { k: 'potential', label: 'Identified', v: sum.lenses.identified, note: 'not yet committed' },
            { k: 'committed', label: 'Committed', v: sum.lenses.committed, note: 'in the plan' },
            { k: 'realized', label: 'Realized YTD', v: sum.lenses.realized, note: 'FP&A-validated' },
            { k: 'sustained', label: 'Sustained', v: sum.lenses.sustained, note: 'run-rate protected' },
          ].map((l) => (
            <div key={l.k} className="pdash-lens">
              <span className="pdash-lens-bar" style={{ background: BUCKET_TONE[l.k] }} />
              <div className="pdash-lens-v mono">{money(l.v)}</div>
              <div className="pdash-lens-l">{l.label}</div>
              <div className="pdash-lens-n tiny muted">{l.note}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="tiles">
        <Tile tone="green" label="Realized YTD" value={money(sum.lenses.realized)} sub="validated actuals only" />
        <Tile tone="amber" label="Committed to plan" value={money(sum.lenses.committed)} sub="approved & beyond" />
        <Tile tone="red" label="At-risk value" value={money(sum.atRisk)} sub={`${num(redCount)} red opportunit${redCount === 1 ? 'y' : 'ies'}`} />
        <Tile tone="navy" label="Savings confidence" value={pct(sum.confidence)} sub="value-weighted across the book" />
      </div>

      {/* Executive narrative — what happened, why it matters, what next */}
      <div className="pdash-narr card pad section-gap">
        <div className="pdash-narr-tag">Executive narrative · deterministic</div>
        <div className="pdash-narr-row"><b>What happened.</b> {money(sum.lenses.realized)} of validated savings landed year-to-date at {money(velocity.perMonth)}/month, with {money(sum.total)} now under active management across {num(sum.count)} opportunities.</div>
        <div className="pdash-narr-row"><b>Why it matters.</b> {money(sum.lenses.committed)} is committed to the plan and {money(sum.atRisk)} sits at risk across {num(redCount)} red opportunit{redCount === 1 ? 'y' : 'ies'}; the book is running at {pct(sum.confidence)} value-weighted confidence.</div>
        <div className="pdash-narr-row"><b>What next.</b> {top
          ? <>The highest-value decision waiting is <button className="linkbtn" onClick={() => navigate('opportunity', { id: top.id })}>{top.name}</button> — {top.nextDecision.label.toLowerCase()} ({money(top.nextDecision.expectedValue)} expected value{top.nextDecision.dueBy ? `, due ${dateLabel(top.nextDecision.dueBy)}` : ''}).</>
          : 'No decisions are blocked — every opportunity has what it needs to advance.'}</div>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Savings pipeline by stage</h3><span className="spacer" /><button className="btn sm" onClick={() => navigate('savingspipeline')}>Opportunities →</button></div>
          <PipelineFunnel pipeline={pipeline} navigate={navigate} />
          <p className="tiny muted" style={{ marginTop: 6 }}>Each opportunity counted once at its lifecycle stage; the eleven stages sum to {money(sum.total)} under management.</p>
        </div>
        <div className="card pad pdash-forecast">
          <div className="card-h"><h3>Forecast impact by period</h3></div>
          <LineChart xLabels={xLabels} series={series} />
          <p className="tiny muted">Realized run-rate to date, then risk-adjusted / committed projection for the remainder of FY{fy}.</p>
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Decision queue</h3><span className="spacer" /><button className="btn sm" onClick={() => navigate('decisioncenter')}>Decision Center →</button></div>
          {decisionQueue.length === 0 ? (
            <p className="muted" style={{ padding: '10px 2px' }}>Clear — no opportunity is waiting on a decision.</p>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Opportunity</th><th>Next decision</th><th className="num">Expected</th></tr></thead>
                <tbody>
                  {decisionQueue.map((o) => (
                    <tr key={o.id} {...rowNav(o.id)}>
                      <td><b>{o.name}</b><div className="tiny muted">{o.owner} · {o.stageLabel}</div></td>
                      <td>{o.nextDecision.label}{o.nextDecision.missing.length > 0 && <div className="tiny" style={{ color: 'var(--brand-energy)' }}>{o.nextDecision.missing.length} evidence gap{o.nextDecision.missing.length === 1 ? '' : 's'}</div>}</td>
                      <td className="num mono">{money(o.nextDecision.expectedValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card pad pdash-atrisk">
          <div className="card-h"><h3>Opportunities at risk</h3><span className="badge b-red">{num(redCount)}</span></div>
          {atRisk.length === 0 ? (
            <p className="muted" style={{ padding: '10px 2px' }}>No red opportunities — the book is on track.</p>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Opportunity</th><th>Stage</th><th className="num">Value</th></tr></thead>
                <tbody>
                  {atRisk.map((o) => (
                    <tr key={o.id} {...rowNav(o.id)}>
                      <td><b>{o.name}</b><div className="tiny muted">{o.owner} · worst risk {o.worstRisk}</div></td>
                      <td>{o.stageLabel}</td>
                      <td className="num mono">{money(o.value.headline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Savings by type</h3><span className="spacer" /><span className="badge b-grey">shared definitions</span></div>
          <TypeBars byType={byType} />
          <p className="tiny muted" style={{ marginTop: 6 }}>One standardized language — hover a type for its governance definition.</p>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Top blockers &amp; dependencies</h3></div>
          {blockers.length === 0 ? (
            <p className="muted" style={{ padding: '10px 2px' }}>No cross-opportunity blockers on the critical path.</p>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Opportunity</th><th className="num">Blocks</th><th className="num">Value</th></tr></thead>
                <tbody>
                  {blockers.map((b) => (
                    <tr key={b.id} {...rowNav(b.id)}>
                      <td><b>{b.name}</b></td>
                      <td className="num"><span className="badge b-amber">{b.blocks}</span></td>
                      <td className="num mono">{money(b.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="tiny muted" style={{ marginTop: 6 }}>Opportunities that gate the most downstream value — clear these first.</p>
        </div>
      </div>
    </>
  )
}
