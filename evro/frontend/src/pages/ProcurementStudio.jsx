import { useMemo, useState } from 'react'
import {
  SAVINGS_TYPES, SAVINGS_LIFECYCLE, GOVERNANCE_LADDER, PROC_APPROVER_LABEL,
  savingsType, lifecycleMeta, apprLabel, savingsOpportunities,
} from '../lib/procurement.js'
import { STAGE_LABEL } from '../lib/engine.js'
import { PIPELINE_PHASES } from '../lib/procurement-window.js'
import {
  ENGINE_BASELINE, setTypeField, setStageField, setApproverLabel,
  stagedWeights, stagedMateriality, setStagedWeight, setStagedMateriality,
  PHASE_LADDER_DEFAULT, stagedPhaseLadder, setStagedPhaseLadder,
  hasStagedChanges, hasLiveOverrides, resetStudio, resetStaged,
} from '../lib/studio.js'
import { money, pct } from '../lib/format.js'
import { IconAI } from '../components/Icons.jsx'

// EVRO Studio — the no-code configuration console. Adjust definitions, lifecycle
// labels and approval routing (live, presentation-only), and edit / preview the
// engine-governed scoring so leadership can see the effect before it is promoted.
// The engine stays the single source of truth: label edits apply instantly; math
// edits are staged and previewed, never hot-patched into the calculation core.

const WEIGHT_STAGES = ['proposed', 'idea', 'feasibility', 'capability', 'launch', 'realization', 'sustainment']

export default function ProcurementStudio({ db, flash, refreshShell }) {
  const [tab, setTab] = useState('definitions')
  const [, force] = useState(0)
  const opps = useMemo(() => savingsOpportunities(db), [db])
  const bump = () => { force((n) => n + 1); refreshShell?.() }

  const tabs = [
    ['definitions', 'Definitions'],
    ['lifecycle', 'Lifecycle & gates'],
    ['routing', 'Approval routing'],
    ['weights', 'Scoring weights'],
  ]

  return (
    <>
      <p className="page-intro">
        The no-code configuration console. Label and definition edits apply <b>live</b> across every screen — they change wording,
        never a number, so the book still reconciles to the dollar. Engine-governed scoring (stage confidence, materiality) is
        <b> staged and previewed</b> here; the deterministic engine remains the single source of truth until a change is promoted.
      </p>

      <div className="stu-banner card pad">
        <span className="agx-ic"><IconAI /></span>
        <div>
          <b>Two kinds of setting, kept honest.</b>
          <div className="tiny muted">Presentation overrides are live. Engine parameters are staged — Studio previews the effect but never rewrites the calculation core.</div>
        </div>
        <span className="spacer" />
        <div className="stu-flags">
          <span className={`badge ${hasLiveOverrides() ? 'b-green' : 'b-grey'}`}>{hasLiveOverrides() ? 'Live overrides active' : 'No live overrides'}</span>
          <span className={`badge ${hasStagedChanges() ? 'b-amber' : 'b-grey'}`}>{hasStagedChanges() ? 'Staged changes pending' : 'No staged changes'}</span>
        </div>
      </div>

      <div className="stu-tabs">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
        <span className="spacer" />
        <button className="linkbtn tiny" onClick={() => { resetStudio(); bump(); flash?.('Studio reset to defaults') }}>Reset all</button>
      </div>

      {tab === 'definitions' && (
        <div className="card pad section-gap">
          <div className="card-h"><h3>Savings taxonomy</h3><span className="tiny muted" style={{ marginLeft: 8 }}>Live · edits apply everywhere the type is named</span></div>
          <div className="stu-defs">
            {SAVINGS_TYPES.map((t) => {
              const cur = savingsType(t.key)
              return (
                <div key={t.key} className="stu-def">
                  <span className="stu-swatch" style={{ background: t.accent }} />
                  <div className="stu-def-body">
                    <input className="stu-in stu-in-lg" defaultValue={cur.label} onBlur={(e) => { if (e.target.value !== cur.label) { setTypeField(t.key, 'label', e.target.value); bump() } }} aria-label={`${t.label} label`} />
                    <textarea className="stu-in stu-ta" defaultValue={cur.definition} onBlur={(e) => { if (e.target.value !== cur.definition) { setTypeField(t.key, 'definition', e.target.value); bump() } }} aria-label={`${t.label} definition`} rows={2} />
                    <span className="tiny muted">P&amp;L impact: {t.pnl ? 'yes — moves the run-rate' : 'no — tracked separately'} · engine key <code>{t.key}</code></span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'lifecycle' && (
        <div className="card pad section-gap">
          <div className="card-h"><h3>Lifecycle stages</h3><span className="tiny muted" style={{ marginLeft: 8 }}>Live labels · gate model is engine-governed (shown read-only)</span></div>
          <div className="stu-stages">
            {SAVINGS_LIFECYCLE.map((s) => {
              const cur = lifecycleMeta(s.key)
              return (
                <div key={s.key} className="stu-stage">
                  <span className="badge b-grey">{cur.phase}</span>
                  <input className="stu-in" defaultValue={cur.label} onBlur={(e) => { if (e.target.value !== cur.label) { setStageField(s.key, 'label', e.target.value); bump() } }} aria-label={`${s.label} label`} />
                  <input className="stu-in stu-in-flex" defaultValue={cur.gloss} onBlur={(e) => { if (e.target.value !== cur.gloss) { setStageField(s.key, 'gloss', e.target.value); bump() } }} aria-label={`${s.label} description`} />
                  <span className="badge" style={{ background: 'color-mix(in srgb, var(--brand-value) 16%, transparent)', color: 'var(--brand-value)' }}>{cur.bucket}</span>
                </div>
              )
            })}
          </div>
          <div className="stu-note tiny muted">Gate requirements (evidence, approvals, pass/fail) are enforced by the deterministic engine and cannot be edited here — that guarantees every screen agrees. Studio changes the stage's <i>name and description</i>, not the gate it must clear.</div>
        </div>
      )}

      {tab === 'routing' && (
        <div className="card pad section-gap">
          <div className="card-h"><h3>Approval routing</h3><span className="tiny muted" style={{ marginLeft: 8 }}>Role labels are live · the materiality threshold is engine-governed</span></div>
          <div className="stu-routing">
            {GOVERNANCE_LADDER.map((r) => (
              <div key={r.role} className="stu-route">
                <input className="stu-in stu-in-lg" defaultValue={apprLabel(r.role)} onBlur={(e) => { if (e.target.value !== apprLabel(r.role)) { setApproverLabel(r.role, e.target.value); bump() } }} aria-label={`${r.label} label`} />
                <span className="tiny muted">{r.gate}</span>
              </div>
            ))}
          </div>
          <div className="stu-materiality">
            <div className="stu-mat-h"><b>Materiality threshold</b> <span className="badge b-amber">staged</span></div>
            <div className="tiny muted">Awards at or above this gross annual value escalate to the CPO / Steering Committee before Launch.</div>
            <div className="stu-mat-row">
              <input type="number" className="stu-in stu-num" step="10000" defaultValue={stagedMateriality()} onBlur={(e) => { setStagedMateriality(Number(e.target.value)); bump() }} aria-label="Materiality threshold" />
              <span className="tiny muted">engine baseline {money(ENGINE_BASELINE.materiality)} · {opps.filter((o) => (o._raw.gross_annual_value || 0) >= stagedMateriality()).length} of {opps.length} opportunities would escalate</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'weights' && <WeightsTab opps={opps} onChange={bump} flash={flash} />}
    </>
  )
}

// Scoring weights — edit the per-stage confidence and preview the effect on the
// book's value-weighted confidence, live and without touching the engine.
function WeightsTab({ opps, onChange, flash }) {
  const [, tick] = useState(0)
  const w = stagedWeights()
  // Preview: value-weighted confidence under the staged weights vs the engine's.
  const preview = useMemo(() => {
    let wv = 0, sv = 0, base = 0
    for (const o of opps) {
      const val = o.value.headline
      wv += (w[o._raw.stage] ?? 0) * val
      base += (ENGINE_BASELINE.weights[o._raw.stage] ?? 0) * val
      sv += val
    }
    return { staged: sv ? wv / sv : 0, engine: sv ? base / sv : 0 }
  }, [opps, w])
  const changed = hasStagedChanges()

  // The proposed PHASE-based ladder (25/50/75/100), previewed against the engine.
  const ladder = stagedPhaseLadder()
  const phasePreview = useMemo(() => {
    let wv = 0, ev = 0, sv = 0
    for (const o of opps) {
      const ph = lifecycleMeta(o.stage).phase
      wv += (ladder[ph] ?? 1) * o.value.headline
      ev += o.confidence * o.value.headline
      sv += o.value.headline
    }
    return { ladder: sv ? wv / sv : 0, engine: sv ? ev / sv : 0 }
  }, [opps, ladder])

  return (
    <>
    <div className="card pad section-gap">
      <div className="card-h">
        <h3>Phase confidence ladder</h3><span className="badge b-green" style={{ marginLeft: 8 }}>live</span>
        <span className="spacer" />
        <button className="linkbtn tiny" onClick={() => { PIPELINE_PHASES.forEach((p) => setStagedPhaseLadder(p.key, PHASE_LADDER_DEFAULT[p.key])); tick((n) => n + 1); onChange(); flash?.('Phase ladder set to 25 / 50 / 75 / 100') }}>Reset to 25/50/75/100</button>
      </div>
      <p className="tiny muted" style={{ marginTop: -4, marginBottom: 10 }}>The sourcing-funnel curve (pipeline 25% · commit 50% · execute 75% · realizing & sustained 100%) is <b>now the live scoring model</b> — the engine risk-adjusts every figure on this ladder. The sliders below let you model an alternative and see the book-confidence effect before proposing a change.</p>
      <div className="stu-preview">
        <div className="stu-prev-box"><div className="tiny muted">Engine (live, by stage)</div><div className="stu-prev-v mono">{pct(phasePreview.engine)}</div></div>
        <div className="stu-prev-arrow">→</div>
        <div className="stu-prev-box"><div className="tiny muted">Under this phase ladder</div><div className="stu-prev-v mono" style={{ color: 'var(--brand-value)' }}>{pct(phasePreview.ladder)}</div></div>
        <div className="tiny muted stu-prev-note">Value-weighted book confidence. Lowering commit and execute makes the book read more conservatively until value is actually realizing.</div>
      </div>
      <div className="stu-weights">
        {PIPELINE_PHASES.map((p) => {
          const val = ladder[p.key] ?? 1
          return (
            <div key={p.key} className="stu-weight">
              <div className="stu-weight-h"><label htmlFor={`pl-${p.key}`}>{p.label}</label><b className="mono stu-diff">{pct(val)}</b></div>
              <input id={`pl-${p.key}`} type="range" min="0" max="100" step="5" value={Math.round(val * 100)} onChange={(e) => { setStagedPhaseLadder(p.key, Number(e.target.value) / 100); tick((n) => n + 1); onChange() }} aria-label={`${p.label} phase confidence`} />
              <span className="tiny muted">{p.gloss}</span>
            </div>
          )
        })}
      </div>
    </div>

    <div className="card pad section-gap">
      <div className="card-h">
        <h3>Stage confidence weights</h3><span className="badge b-amber" style={{ marginLeft: 8 }}>staged & previewed</span>
        <span className="spacer" />
        {changed && <button className="linkbtn tiny" onClick={() => { resetStaged(); tick((n) => n + 1); onChange(); flash?.('Weights reset to engine baseline') }}>Reset to engine</button>}
      </div>
      <div className="stu-preview">
        <div className="stu-prev-box"><div className="tiny muted">Engine (live)</div><div className="stu-prev-v mono">{pct(preview.engine)}</div></div>
        <div className="stu-prev-arrow">→</div>
        <div className="stu-prev-box"><div className="tiny muted">Under staged weights</div><div className="stu-prev-v mono" style={{ color: 'var(--brand-value)' }}>{pct(preview.staged)}</div></div>
        <div className="tiny muted stu-prev-note">Value-weighted book confidence. A preview only — the executive dashboard keeps showing the engine figure until a change is promoted.</div>
      </div>
      <div className="stu-weights">
        {WEIGHT_STAGES.map((st) => {
          const val = w[st] ?? 0
          const baseV = ENGINE_BASELINE.weights[st] ?? 0
          const diff = Math.abs(val - baseV) > 0.001
          return (
            <div key={st} className="stu-weight">
              <div className="stu-weight-h"><label htmlFor={`w-${st}`}>{STAGE_LABEL[st] || st}</label><b className={`mono ${diff ? 'stu-diff' : ''}`}>{pct(val)}</b></div>
              <input id={`w-${st}`} type="range" min="0" max="100" step="5" value={Math.round(val * 100)} onChange={(e) => { setStagedWeight(st, Number(e.target.value) / 100); tick((n) => n + 1); onChange() }} aria-label={`${STAGE_LABEL[st] || st} confidence weight`} />
              {diff && <span className="tiny muted">engine {pct(baseV)}</span>}
            </div>
          )
        })}
      </div>
      <div className="stu-note tiny muted">These weights drive how much each lifecycle stage counts toward confidence and risk-adjusted value. In production, promoting them is a governed change to the engine config service — Studio lets leadership size the impact first.</div>
    </div>
    </>
  )
}
