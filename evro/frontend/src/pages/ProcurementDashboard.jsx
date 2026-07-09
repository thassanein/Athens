import { useMemo, useState } from 'react'
import { procurementModel, spendCoverage } from '../lib/procurement.js'
import { impactByYear, pipelineBoard } from '../lib/procurement-window.js'
import { money, pct, num } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import Term from '../components/Term.jsx'
import ExportMenu from '../components/ExportMenu.jsx'

// Procurement Executive Dashboard (Phase One W3) — the five-second read: how
// much value is under management, where it is in the lifecycle, how confident
// we are, what is at risk, and the single next decision that matters. Every
// figure comes from procurementModel(db) — the same value objects the
// opportunity workspace, narrative and evidence views read — so it reconciles
// to the dollar. Deterministic; no fabricated numbers.

const BUCKET_TONE = { potential: 'var(--opp)', committed: 'var(--amber)', realized: 'var(--green)', sustained: 'var(--navy)' }

// Spend coverage — of everything Athens buys, how much Procurement can touch and
// how much we're actually working, plus how the savings split hard vs avoidance.
function SpendCoverage({ db }) {
  const c = useMemo(() => spendCoverage(db), [db])
  if (!c.totalSpend) return null
  const bn = (n) => `$${(n / 1e6).toFixed(1)}M`
  const passthrough = c.totalSpend - c.addressable
  const notWorked = c.addressable - c.addressed
  const w = (n) => `${(n / c.totalSpend) * 100}%`   // one 0→total scale for every bar & step
  return (
    <div className="spc card pad section-gap">
      <div className="card-h">
        <h3>From everything we buy to what we’re working</h3>
        <span className="tiny muted" style={{ marginLeft: 8 }}>third-party spend → addressable → actively addressed</span>
      </div>

      {/* Bridge: each anchor is a bar on the same scale; each step shows the chunk that falls away and why */}
      <div className="spc-bridge">
        <div className="spc-br-row">
          <div className="spc-br-head"><b>Third-party spend</b><span className="spc-br-num mono">{bn(c.totalSpend)}</span></div>
          <div className="spc-br-note">everything Athens buys outside</div>
          <div className="spc-br-track"><div className="spc-br-fill total" style={{ width: w(c.totalSpend) }} /></div>
        </div>

        <div className="spc-br-step">
          <div className="spc-br-steptrack"><div className="spc-br-drop" style={{ left: w(c.addressable), width: w(passthrough) }} /></div>
          <div className="spc-br-steptag">− <b className="mono">{bn(passthrough)}</b> pass-throughs we can’t influence <span className="tiny muted">taxes · disposal · franchise fees · pension</span></div>
        </div>

        <div className="spc-br-row">
          <div className="spc-br-head"><b style={{ color: 'var(--brand-value)' }}>Addressable spend</b><span className="spc-br-num mono">{bn(c.addressable)}</span></div>
          <div className="spc-br-note">{pct(c.addressablePct)} of what we buy — spend Procurement can actually move</div>
          <div className="spc-br-track"><div className="spc-br-fill addr" style={{ width: w(c.addressable) }} /></div>
        </div>

        <div className="spc-br-step">
          <div className="spc-br-steptrack"><div className="spc-br-drop" style={{ left: w(c.addressed), width: w(notWorked) }} /></div>
          <div className="spc-br-steptag">− <b className="mono">{bn(notWorked)}</b> addressable but not on it yet <span className="tiny muted">{c.categoriesTotal - c.categoriesWorked} of {c.categoriesTotal} categories still on the shelf</span></div>
        </div>

        <div className="spc-br-row">
          <div className="spc-br-head"><b style={{ color: 'var(--green)' }}>Actively addressed</b><span className="spc-br-num mono">{bn(c.addressed)}</span></div>
          <div className="spc-br-note">{pct(c.addressed / c.totalSpend)} of what we buy · {pct(c.addressedPct)} of addressable · {c.categoriesWorked} of {c.categoriesTotal} categories under way</div>
          <div className="spc-br-track"><div className="spc-br-fill done" style={{ width: w(c.addressed) }} /></div>
        </div>
      </div>
      {/* savings split + savings rate */}
      <div className="spc-split">
        <div className="spc-split-h">
          Savings we’re getting — <b className="mono">${(c.savings / 1e6).toFixed(1)}M/yr</b> ·
          <b style={{ color: 'var(--brand-value)' }}> {pct(c.savings / c.addressable, 1)} of addressable spend</b>
          <span className="tiny muted"> ({pct(c.savings / c.addressed, 1)} of what we’re actively on)</span>
        </div>
        <div className="spc-split-bar">
          <div className="spc-seg hard" style={{ width: `${c.hardPct * 100}%` }} title={`Cost savings ${pct(c.hardPct)}`}>{c.hardPct > 0.12 ? pct(c.hardPct) : ''}</div>
          <div className="spc-seg soft" style={{ width: `${c.softPct * 100}%` }} title={`Cost avoidance ${pct(c.softPct)}`}>{c.softPct > 0.12 ? pct(c.softPct) : ''}</div>
        </div>
        <div className="spc-split-key tiny"><span><i className="spc-sw hard" /> Cost savings {pct(c.hardPct)} · ${(c.hard / 1e6).toFixed(1)}M · {pct(c.hard / c.addressable, 1)} of addressable</span><span><i className="spc-sw soft" /> Cost avoidance {pct(c.softPct)} · ${(c.soft / 1e6).toFixed(1)}M · {pct(c.soft / c.addressable, 1)} of addressable</span></div>
      </div>
    </div>
  )
}

// Impact by year — risk-adjusted savings phased into the calendar years they
// land in, each bar split into cost savings (hard, hits the P&L) and cost
// avoidance (soft). 2026 is the focus year. Toggle to gross (un-adjusted).
function ImpactByYear({ db, focusYear }) {
  const [mode, setMode] = useState('rav')
  const years = useMemo(() => impactByYear(db, mode), [db, mode])
  if (!years.length) return null
  const max = Math.max(...years.map((y) => y.value), 1)
  const focus = years.find((y) => y.year === focusYear) || { hard: 0, soft: 0, value: 0 }
  const totHard = years.reduce((s, y) => s + y.hard, 0)
  const totSoft = years.reduce((s, y) => s + y.soft, 0)
  return (
    <div className="pyr card pad section-gap">
      <div className="card-h">
        <h3>Impact by year</h3>
        <span className="tiny muted" style={{ marginLeft: 8 }}>{mode === 'rav' ? 'risk-adjusted' : 'gross'} run-rate, phased into the year it lands</span>
        <span className="spacer" />
        <div className="pyr-toggle" role="tablist" aria-label="Value basis">
          <button role="tab" aria-selected={mode === 'rav'} className={`chip sm ${mode === 'rav' ? 'on' : ''}`} onClick={() => setMode('rav')}>Risk-adjusted</button>
          <button role="tab" aria-selected={mode === 'gross'} className={`chip sm ${mode === 'gross' ? 'on' : ''}`} onClick={() => setMode('gross')}>Gross</button>
        </div>
      </div>
      {/* header — the split, stated in numbers */}
      <div className="pyr-legend">
        <span className="pyr-key"><span className="pyr-sw hard" /> <Term name="Cost savings">Cost savings</Term> · <b className="mono">{money(totHard)}</b></span>
        <span className="pyr-key"><span className="pyr-sw soft" /> <Term name="Cost avoidance">Cost avoidance</Term> · <b className="mono">{money(totSoft)}</b></span>
        <span className="spacer" />
        <span className="tiny muted"><b>{focusYear}:</b> <span className="mono">{money(focus.hard)}</span> savings + <span className="mono">{money(focus.soft)}</span> avoidance = <b className="mono">{money(focus.value)}</b></span>
      </div>
      <div className="pyr-bars">
        {years.map((y) => {
          const isFocus = y.year === focusYear
          return (
            <div key={y.year} className={`pyr-col ${isFocus ? 'focus' : 'filler'}`}>
              <div className="pyr-v mono">{money(y.value)}</div>
              <div className="pyr-stack" style={{ height: `${Math.max(4, (y.value / max) * 100)}%` }}>
                {y.soft > 0 && <div className="pyr-seg soft" style={{ flex: y.soft }} title={`Cost avoidance ${money(y.soft)}`} />}
                {y.hard > 0 && <div className="pyr-seg hard" style={{ flex: y.hard }} title={`Cost savings ${money(y.hard)}`} />}
              </div>
              <div className="pyr-yr">{y.year}{isFocus ? ' · focus' : ''}</div>
            </div>
          )
        })}
      </div>
      <p className="tiny muted" style={{ marginTop: 8 }}>A phasing cut, not the book total — each saving’s {mode === 'rav' ? 'risk-adjusted' : 'gross'} annual run-rate allocated month-by-month across its 12-month window, split by ledger.</p>
    </div>
  )
}

// The pipeline as the FOUR project phases (not the 11 fine-grained stages):
// pipeline → commit → execute → realize, plus banked. One click opens the board.
function PipelineFunnel({ phases, navigate }) {
  const max = Math.max(1, ...phases.map((s) => s.value))
  return (
    <div className="pdash-funnel">
      {phases.map((s) => (
        <button key={s.key} className="pdash-stage" onClick={() => navigate('savingspipeline')} title={s.gloss}>
          <span className="pdash-stage-l">{s.label}</span>
          <span className="pdash-stage-bar">
            <span className="pdash-stage-fill" style={{ width: `${Math.max(s.value ? 3 : 0, (s.value / max) * 100)}%`, background: s.tone || 'var(--navy)' }} />
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

export default function ProcurementDashboard({ db, navigate, flash }) {
  const m = useMemo(() => procurementModel(db), [db])
  const { sum, byType, velocity, opportunities } = m
  const fy = db.meta.fiscalYear
  const focusYear = Number(String(db.meta.now).slice(0, 4))
  const yearImpact = useMemo(() => impactByYear(db, 'rav'), [db])
  const impactFocus = yearImpact.find((y) => y.year === focusYear)?.value || 0
  // The pipeline as the four project phases (not 11 stages).
  const phases = useMemo(() => pipelineBoard(db), [db])
  const redCount = opportunities.filter((o) => o.ragStatus === 'red').length

  // This screen is the NUMBERS — the value story. The action lists (decisions
  // waiting, at-risk, next best) live on Home so the two never overlap.
  return (
    <>
      <div className="pdash-toolbar">
        <p className="page-intro" style={{ margin: 0 }}>
          <b>The value story.</b> What we’re on track to save this year, how it splits, and where it lands.
          Head to <button className="linkbtn" onClick={() => navigate('mission')}>Home</button> for what needs a decision today.
        </p>
        <ExportMenu db={db} flash={flash} label="Export board pack" />
      </div>

      {/* Headline — this year's risk-adjusted impact + the four progress lenses */}
      <div className="pdash-sum card pad">
        <div className="pdash-sum-hero">
          <div className="pdash-sum-label">The one number to watch · what we’re on track to save in {focusYear}</div>
          <div className="pdash-sum-big mono">{money(impactFocus)}</div>
          <div className="pdash-sum-sub">
            <b style={{ color: 'var(--green)' }}>{money(sum.lenses.realized)} is already confirmed</b> and banked this year.
            The headline is adjusted for how likely each deal is to actually land (what we call <Term name="Risk-adjusted value">risk-adjusted</Term>).
          </div>
        </div>
        <div className="pdash-lenses">
          {[
            { k: 'potential', term: 'Identified', label: 'Identified', v: sum.lenses.identified, note: 'ideas we’ve found' },
            { k: 'committed', term: 'Committed', label: 'Committed', v: sum.lenses.committed, note: 'approved, being worked' },
            { k: 'realized', term: 'Realized', label: 'Realized', v: sum.lenses.realized, note: 'confirmed & banked' },
            { k: 'sustained', term: 'Sustained', label: 'Sustained', v: sum.lenses.sustained, note: 'locked in, protected' },
          ].map((l) => (
            <div key={l.k} className="pdash-lens">
              <span className="pdash-lens-bar" style={{ background: BUCKET_TONE[l.k] }} />
              <div className="pdash-lens-v mono">{money(l.v)}</div>
              <div className="pdash-lens-l"><Term name={l.term}>{l.label}</Term></div>
              <div className="pdash-lens-n tiny muted">{l.note}</div>
            </div>
          ))}
        </div>
      </div>

      <SpendCoverage db={db} />

      <ImpactByYear db={db} focusYear={focusYear} />

      <div className="pdash-kpihdr">
        <h3>The four numbers that matter</h3>
        <span className="tiny muted">FY{fy}, all savings — money we’ve confirmed, money we’ve committed to, money at risk, and how sure we are.</span>
      </div>
      <div className="tiles">
        <Tile tone="green" label={`Confirmed & banked (FY${fy})`} value={money(sum.lenses.realized)} sub={`checked by Finance · ${velocity.elapsedMonths} months in`} />
        <Tile tone="amber" label="Committed, not yet all delivered" value={money(sum.lenses.committed)} sub="deals we’ve approved and are working" />
        <Tile tone="red" label="At risk" value={money(sum.atRisk)} sub={`${num(redCount)} deal${redCount === 1 ? '' : 's'} flagged red`} />
        <Tile tone="navy" label="How likely the plan is to land" value={pct(sum.confidence)} sub="higher = more of it is nearly done" />
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Pipeline by phase</h3><span className="spacer" /><button className="btn sm" onClick={() => navigate('savingspipeline')}>Open pipeline →</button></div>
          <PipelineFunnel phases={phases} navigate={navigate} />
          <p className="tiny muted" style={{ marginTop: 6 }}>Each deal counted once at its phase; the phases sum to {money(sum.total)} under management.</p>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Savings by type</h3><span className="spacer" /><span className="badge b-grey">shared definitions</span></div>
          <TypeBars byType={byType} />
          <p className="tiny muted" style={{ marginTop: 6 }}>One standardized language — hover a type for its governance definition.</p>
        </div>
      </div>
    </>
  )
}
