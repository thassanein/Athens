import { useState } from 'react'
import {
  enterpriseRollup, funnel, rankInitiatives, pendingApprovalsFor,
  STAGE_LABEL, personName, rav,
} from '../lib/engine.js'
import { scenarios, defaultScenario, knowledgeCard, explain } from '../lib/model.js'
import { money, pct } from '../lib/format.js'
import { Tile, StagePip, RagBadge, PillarBadge } from '../components/ui.jsx'

// The Athens Value Office — the MVP operating module for enterprise value
// management. It composes existing engine surfaces (rollup, funnel, ranking,
// approvals) into one value-pipeline command view, adds the Phase 5B forecast-
// scenario lens, and drills through to the existing initiative workspace.
// Presentation only: the scenario lens multiplies FORWARD value for display; it
// never changes the engine, and Realized (validated) value is never adjusted.

const GATE_COLS = ['idea', 'feasibility', 'capability', 'launch']
const REALIZING_COLS = ['realization', 'sustainment']

export default function ValueOffice({ db, user, navigate }) {
  const [scenKey, setScenKey] = useState(defaultScenario(db)?.key || 'base')
  const scen = scenarios(db).find((s) => s.key === scenKey) || defaultScenario(db)
  // effective forward multiplier from the scenario's assumptions (display only)
  const mult = (scen?.assumptions?.realization_multiplier ?? 1) * (scen?.assumptions?.adoption_factor ?? 1)
  const timing = scen?.assumptions?.timing_shift_months ?? 0

  const roll = enterpriseRollup(db)
  const f = funnel(db)
  const ranked = rankInitiatives(db, 'return')
  const pending = pendingApprovalsFor(db, user)
  const proposed = db.initiatives.filter((i) => i.stage === 'proposed')
  const ravCard = knowledgeCard(db, 'RAV')

  // per-stage column data (RAV scenario-adjusted for forward stages)
  const colFor = (stage) => {
    const list = ranked.filter((r) => r.stage === stage)
    const value = list.reduce((a, r) => a + r.rav, 0) * mult
    return { stage, list, count: list.length, value }
  }
  const gateCols = GATE_COLS.map(colFor)
  const realizingCols = REALIZING_COLS.map(colFor)

  return (
    <>
      <p className="page-intro">
        The <b>Athens Value Office</b> — the operating module for enterprise value.
        Every initiative flows through four value gates into realization; value is
        <b> risk-adjusted</b>, never counted at face value. Choose a scenario lens to
        stress the forward book (Realized stays fixed — it's validated fact).
      </p>

      {/* scenario lens */}
      <div className="card pad">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3>Scenario lens</h3>
          <span className="spacer" />
          <div className="seg">
            {scenarios(db).map((s) => (
              <button key={s.key} className={scenKey === s.key ? 'active' : ''} onClick={() => setScenKey(s.key)}>{s.name}</button>
            ))}
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>
          {scen?.description}
          {mult !== 1 && <> <b>Forward value ×{mult.toFixed(2)}</b>.</>}
          {timing !== 0 && <> Timing {timing > 0 ? '+' : ''}{timing} mo.</>}
        </p>
      </div>

      {/* value model KPIs — forward metrics carry the lens; realized does not */}
      <div className="grid cols-4 section-gap">
        <Tile label="Realized YTD (validated)" value={money(roll.realizedYTD)} sub="FP&A-signed only" tone="green" />
        <Tile label="Risk-adjusted pipeline" value={money(roll.raPipeline * mult)} sub={scenKey === 'base' ? 'Plan of record' : scen?.name + ' lens'} />
        <Tile label="Forecast remainder FY" value={money(roll.forecastRemainderFY * mult)} sub="Risk-adjusted" />
        <Tile label="Identified opportunity" value={money(roll.identifiedOpportunity * mult)} sub="Advertised, unclaimed" tone="dark" />
      </div>

      {/* the value pipeline board */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Value pipeline</h3><span className="spacer" /><span className="badge b-grey">{roll.counts.active} active</span></div>
        <div className="vo-board">
          {/* intake / proposed */}
          <PipeCol
            title="Proposed" hint="Awaiting intake approval" accent="var(--grey-2)"
            count={proposed.length} value={null}
            rows={proposed.map((i) => ({ id: i.id, title: i.title, owner_id: i.owner_id, status_rag: i.status_rag, pillar: i.pillar, stage: i.stage, rav: 0 }))}
            db={db} navigate={navigate} note={pending.length ? `${pending.length} you can approve` : null}
          />
          {gateCols.map((c) => (
            <PipeCol key={c.stage} title={STAGE_LABEL[c.stage]} hint="Value gate" accent="var(--navy)"
              count={c.count} value={c.value} rows={c.list} db={db} navigate={navigate} />
          ))}
          {realizingCols.map((c) => (
            <PipeCol key={c.stage} title={STAGE_LABEL[c.stage]} hint="Realizing" accent="var(--green)"
              count={c.count} value={c.value} rows={c.list} db={db} navigate={navigate} />
          ))}
        </div>
        <div className="divider" />
        <div className="chip-row">
          {f.conversions.map((c) => (
            <span key={c.from} className="badge b-grey" style={{ textTransform: 'capitalize' }}>{c.from}→{c.to}: <b style={{ marginLeft: 4 }}>{pct(c.rate)}</b></span>
          ))}
        </div>
      </div>

      {/* how value is counted — Knowledge Layer tie-in */}
      {ravCard && (
        <div className="card pad section-gap vo-explain">
          <div className="card-h"><h3>How value is counted</h3><span className="spacer" /><span className="badge b-navy">Knowledge card</span></div>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: '4px 0 10px' }}>{explain(ravCard, 'executive')}</p>
          {ravCard.formula && <div className="vo-formula mono">{ravCard.formula}</div>}
          {ravCard.example && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Example — {ravCard.example}</p>}
        </div>
      )}
    </>
  )
}

function PipeCol({ title, hint, accent, count, value, rows, db, navigate, note }) {
  const top = [...rows].sort((a, b) => (b.rav || 0) - (a.rav || 0)).slice(0, 5)
  return (
    <div className="vo-col">
      <div className="vo-col-h" style={{ borderTopColor: accent }}>
        <div className="vo-col-t">{title}</div>
        <div className="vo-col-hint">{hint}</div>
        <div className="vo-col-m"><b>{count}</b>{value != null && <span className="mono"> · {money(value)}</span>}</div>
        {note && <div className="vo-col-note">{note}</div>}
      </div>
      <div className="vo-col-body">
        {top.length === 0 && <div className="vo-empty">—</div>}
        {top.map((r) => (
          <button key={r.id} className="vo-card" onClick={() => navigate('initiative', { id: r.id })} title={r.title}>
            <div className="vo-card-t">{r.title}</div>
            <div className="vo-card-m">
              <PillarBadge pillar={r.pillar} />
              <RagBadge rag={r.status_rag} />
              {r.rav > 0 && <span className="mono vo-card-v">{money(r.rav)}</span>}
            </div>
            <div className="vo-card-o">{personName(db, r.owner_id)}</div>
          </button>
        ))}
        {rows.length > top.length && <div className="vo-more">+{rows.length - top.length} more</div>}
      </div>
    </div>
  )
}
