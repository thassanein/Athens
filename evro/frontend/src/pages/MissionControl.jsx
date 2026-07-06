import { useEffect, useMemo, useState } from 'react'
import { missionHealth, operatingContexts, contextView, ringDrill, ringExplain, ringTrend } from '../lib/mission.js'
import { narrative, NARRATIVE_FORMATS } from '../lib/narrative.js'
import { OPERATING_MODES, defaultModeFor, companionBrief, strategicNarratives } from '../lib/companion.js'
import { decisionsRequired, canApproveRoles, ROLE_APPROVE_LABEL, personName } from '../lib/engine.js'
import { aiRecommendations } from '../lib/model.js'
import { money, pct } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { ActivityRings } from '../components/Charts.jsx'
import EnterpriseVitals from '../components/EnterpriseVitals.jsx'
import { InfoDot } from '../components/Explain.jsx'
import { IconAI } from '../components/Icons.jsx'

// Enterprise Mission Control (5B.5) — the flagship executive landing. Answers,
// in one screen: what happened, why it matters, what to do next. 5B.6 makes it
// the DEFAULT operating experience: lens/format/context persist per user, a
// context selector scopes the whole screen (enterprise / region / business
// unit), and named views can be saved and recalled. View-only: one-click
// actions call the existing approveRequest mutation.

const BAND_TONE = { strong: 'var(--green)', steady: 'var(--navy)', fragile: 'var(--red)' }
const SIG_TONE = { green: 'var(--green)', red: 'var(--red)', navy: 'var(--navy)', amber: 'var(--amber)' }
const LS_PREFS = 'evro.mc.prefs'
const LS_VIEWS = 'evro.mc.views'
const loadJson = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb } catch { return fb } }

export default function MissionControl({ db, user, dispatch, navigate, flash }) {
  const prefs = useMemo(() => loadJson(LS_PREFS, {}), [])
  const [mode, setMode] = useState(prefs.mode || defaultModeFor(user.role))
  const [nfmt, setNfmt] = useState(prefs.nfmt || 'executive')
  const [ctx, setCtx] = useState(prefs.ctx || 'enterprise')
  const [views, setViews] = useState(() => loadJson(LS_VIEWS, []))
  useEffect(() => { try { localStorage.setItem(LS_PREFS, JSON.stringify({ mode, nfmt, ctx })) } catch { /* ignore */ } }, [mode, nfmt, ctx])

  const contexts = useMemo(() => operatingContexts(db), [db])
  // If the stored context no longer exists (stale cache), fall back safely.
  const ctxOk = contexts.some((c) => c.key === ctx) ? ctx : 'enterprise'
  const cdb = useMemo(() => contextView(db, ctxOk), [db, ctxOk])

  const h = useMemo(() => missionHealth(cdb), [cdb])
  const brief = companionBrief(cdb, user, mode)
  const headline = strategicNarratives(cdb)[0]
  const story = useMemo(() => narrative(cdb, user, nfmt), [cdb, user, nfmt])

  const saveView = () => {
    const label = contexts.find((c) => c.key === ctxOk)?.label || 'Enterprise'
    const name = `${OPERATING_MODES.find((m) => m.key === mode)?.label || mode} · ${label}`
    const v = { name, mode, nfmt, ctx: ctxOk }
    const next = [...views.filter((x) => x.name !== name), v].slice(-4)
    setViews(next)
    try { localStorage.setItem(LS_VIEWS, JSON.stringify(next)) } catch { /* ignore */ }
    flash(`View saved — "${name}"`)
  }
  const applyView = (v) => { setMode(v.mode); setNfmt(v.nfmt); setCtx(v.ctx) }
  const dropView = (v) => {
    const next = views.filter((x) => x.name !== v.name)
    setViews(next)
    try { localStorage.setItem(LS_VIEWS, JSON.stringify(next)) } catch { /* ignore */ }
  }

  // Interactive Pulse Ring (5B.6 item 2) — segment drill + score explainability.
  const [ringKey, setRingKey] = useState(null)
  const drill = ringKey ? ringDrill(cdb, ringKey) : null
  const trend = useMemo(() => ringTrend(cdb), [cdb])

  // "What to do next" — decisions ranked by value, then top AI recommendations.
  const decisions = decisionsRequired(cdb, user).slice(0, 3)
  const recs = aiRecommendations(cdb, { status: 'open' }).slice(0, 3)

  const act = async (d) => {
    if (d.action === 'approve') {
      const r = await dispatch('approveRequest', d.id, user.id)
      if (!r?.error) flash('Approved')
    } else navigate('initiative', { id: d.id })
  }

  return (
    <>
      <p className="page-intro">
        <b>Enterprise Mission Control</b> — the state of enterprise value in one read. What
        happened, why it matters, and what to do next, framed for your seat. Switch the lens
        to reweight the view.
      </p>

      {/* lens + operating context + saved views */}
      <div className="mc-lens">
        <div className="seg">
          {OPERATING_MODES.map((m) => (
            <button key={m.key} className={mode === m.key ? 'active' : ''} onClick={() => setMode(m.key)}>{m.label}</button>
          ))}
        </div>
        <select className="mc-ctx" value={ctxOk} onChange={(e) => setCtx(e.target.value)} title="Operating context — scope the whole screen" aria-label="Operating context">
          <optgroup label="Enterprise"><option value="enterprise">Enterprise</option></optgroup>
          <optgroup label="Regions">{contexts.filter((c) => c.kind === 'region').map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</optgroup>
          <optgroup label="Business units">{contexts.filter((c) => c.kind === 'business_unit').map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</optgroup>
        </select>
        <button className="btn sm ghost" onClick={saveView} title="Save the current lens + format + context as a view">☆ Save view</button>
        <button className="btn sm ghost" onClick={() => navigate('intelligence')} title="The flagship intelligence dashboard — health score, replay, waterfall, scenarios">◈ Intelligence</button>
        <span className="mc-lens-blurb">{OPERATING_MODES.find((m) => m.key === mode)?.blurb}{ctxOk !== 'enterprise' && <b> · scoped to {contexts.find((c) => c.key === ctxOk)?.label}</b>}</span>
      </div>
      {views.length > 0 && (
        <div className="mc-views">
          <span className="mc-views-l">Saved views</span>
          {views.map((v) => (
            <span key={v.name} className={`mc-view ${v.mode === mode && v.ctx === ctxOk && v.nfmt === nfmt ? 'active' : ''}`}>
              <button className="mc-view-b" onClick={() => applyView(v)}>{v.name}</button>
              <button className="mc-view-x" onClick={() => dropView(v)} aria-label={`Delete view ${v.name}`}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* enterprise vitals — energy · weather · velocity (6B) */}
      <EnterpriseVitals db={cdb} />

      {/* the 30-second triad */}
      <div className="grid cols-3">
        <div className="card pad mc-triad"><div className="mc-triad-l">What happened</div>
          <div className="mc-triad-v">{money(h.roll.realizedYTD)} created</div>
          <div className="mc-triad-s">{money(h.roll.leakage)} leaking · {money(h.ct.valueAtRisk)} at risk</div></div>
        <div className="card pad mc-triad"><div className="mc-triad-l">Why it matters</div>
          <div className="mc-triad-n">{headline}</div></div>
        <div className="card pad mc-triad"><div className="mc-triad-l">What to do next</div>
          <div className="mc-triad-v mc-next">{(decisions[0]?.title) || brief.rec?.title || 'Portfolio is settled'}</div>
          <div className="mc-triad-s">{decisions.length ? `${decisions.length} decisions waiting on you` : 'No approvals pending'}</div></div>
      </div>

      {/* pulse ring + health signals */}
      <div className="grid cols-2 section-gap">
        <div className="card pad mc-ring-card">
          <div className="card-h"><h3>Enterprise Pulse Ring</h3><span className="spacer" /><span className="badge" style={{ background: 'var(--tint-navy)', color: BAND_TONE[h.pulse.band] }}>Pulse {h.pulse.index}</span></div>
          <div className="mc-ring">
            <ActivityRings rings={h.rings} size={230} />
            <div className="mc-ring-legend">
              {h.rings.map((r) => {
                const ex = ringExplain(cdb, r.key)
                const above = r.value >= ex.benchmark
                return (
                  <button key={r.key} className={`mc-ring-row ${ringKey === r.key ? 'active' : ''}`} onClick={() => setRingKey(ringKey === r.key ? null : r.key)} aria-expanded={ringKey === r.key}>
                    <span className="mc-ring-dot" style={{ background: r.color }} />
                    <span className="mc-ring-l">{r.label}</span>
                    <span className="mc-ring-v mono">{pct(r.value)}</span>
                    <span className={`mc-bench ${above ? 'ok' : 'lag'}`} title={ex.benchNote}>{above ? '▲' : '▼'} {pct(ex.benchmark)}</span>
                    <span className="kinfo" tabIndex={0} onClick={(e) => e.stopPropagation()} aria-label={`How ${r.label} is scored`}>
                      <span className="kinfo-i">i</span>
                      <span className="kpop kpop-r" role="tooltip">
                        <span className="kpop-t">{r.label} — how it's scored</span>
                        <span className="kpop-f mono">{ex.formula}</span>
                        <span className="kpop-d">{ex.inputs.join(' · ')}</span>
                        <span className="kpop-e">Benchmark {pct(ex.benchmark)} — {ex.benchNote}.</span>
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          {drill && (
            <div className="vr-drill">
              <div className="vr-drill-h"><b>{drill.title}</b><span className="spacer" /><button className="btn sm ghost" onClick={() => setRingKey(null)}>Close</button></div>
              {ringKey === 'created' && trend.series.length > 1 && (
                <div className="mc-trend">
                  <svg viewBox={`0 0 120 30`} preserveAspectRatio="none" className="mc-spark" aria-label="Cumulative realized by month">
                    <polyline fill="none" stroke="var(--green)" strokeWidth="2"
                      points={trend.series.map((v, i) => `${(i / (trend.series.length - 1)) * 118 + 1},${29 - (v / Math.max(1, trend.total)) * 27}`).join(' ')} />
                  </svg>
                  <span className="muted" style={{ fontSize: 11 }}>cumulative validated realized, {trend.months[0]} → {trend.months[trend.series.length - 1]}. Other rings are as-of-now facts — history isn't tracked for them yet.</span>
                </div>
              )}
              {drill.rows.map((r, k) => (
                <div key={k} className="vr-row clickable" onClick={() => navigate('initiative', { id: r.id })}>
                  <span className="vr-row-l">{r.label}</span>
                  <span className="mono vr-row-v">{money(r.value)}</span>
                </div>
              ))}
              {drill.rows.length === 0 && <div className="muted" style={{ fontSize: 12, padding: 6 }}>Nothing behind this ring in the current context.</div>}
            </div>
          )}
        </div>

        <div className="card pad">
          <div className="card-h"><h3>Enterprise health</h3><span className="spacer" /><button className="btn sm ghost" onClick={() => navigate('pulse')}>Value radar →</button></div>
          <div className="mc-signals">
            {h.signals.map((s) => (
              <div key={s.key} className="mc-sig" style={{ borderLeftColor: SIG_TONE[s.tone] }}>
                <div className="mc-sig-v mono" style={{ color: SIG_TONE[s.tone] }}>{s.value}</div>
                <div className="mc-sig-l">{s.label}{s.key === 'ai' && <InfoDot k="RAV" />}</div>
                <div className="mc-sig-n">{s.note}</div>
              </div>
            ))}
          </div>
          <div className="mc-ai">
            <span className="badge b-navy"><IconAI /> AI confidence {pct(h.aiConfidence)}</span>
            <span className="muted" style={{ fontSize: 12 }}>across {(db.ai_recommendations || []).length} deterministic agent signals</span>
          </div>
        </div>
      </div>

      {/* next best actions */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>What to do next</h3><span className="spacer" /><button className="btn sm ghost" onClick={() => navigate('missions')}>Mission queue →</button><span className="badge b-amber">{decisions.length + recs.length}</span></div>
        <div className="mc-actions">
          {decisions.map((d) => (
            <div key={d.id} className="mc-action">
              <div className="mc-action-main" onClick={() => navigate('initiative', { id: d.id })}>
                <div className="mc-action-t">{d.title}</div>
                <div className="mc-action-m">{d.detail}{d.value ? ` · ${money(d.value)}` : ''}</div>
              </div>
              <button className="btn sm" onClick={() => act(d)}>{d.action === 'approve' ? 'Approve' : 'Open'}</button>
            </div>
          ))}
          {recs.map((r) => (
            <div key={r.id} className="mc-action">
              <div className="mc-action-main" onClick={() => navigate(r.category === 'opportunity' ? 'opportunities' : r.category === 'risk' ? 'sustainment' : 'valueoffice')}>
                <div className="mc-action-t">{r.title}</div>
                <div className="mc-action-m">{r.agent} · {pct(r.confidence)} confidence{r.value_impact ? ` · ${money(r.value_impact)}` : ''}</div>
              </div>
              <span className="badge b-navy" style={{ alignSelf: 'center' }}><IconAI /> AI</span>
            </div>
          ))}
          {decisions.length + recs.length === 0 && <div className="muted" style={{ padding: 8 }}>Nothing needs you right now.</div>}
        </div>
        <div className="mc-jump">
          <button className="btn sm ghost" onClick={() => navigate('chief')}>Chief of Staff →</button>
          <button className="btn sm ghost" onClick={() => navigate('valueoffice')}>Value Office →</button>
          <button className="btn sm ghost" onClick={() => navigate('governance')}>Governance →</button>
          <button className="btn sm ghost" onClick={() => navigate('timeline')}>Timeline →</button>
        </div>
      </div>

      {/* Executive Narrative Engine (5B.5 item 8) — deterministic, rules-based */}
      <div className="card pad section-gap">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3>The narrative</h3>
          <span className="badge b-navy"><IconAI /> rules-based</span>
          <span className="spacer" />
          <div className="seg seg-sm">
            {NARRATIVE_FORMATS.map((f) => (
              <button key={f.key} className={nfmt === f.key ? 'active' : ''} onClick={() => setNfmt(f.key)} title={f.blurb}>{f.label}</button>
            ))}
          </div>
        </div>

        {nfmt === 'board' && (
          <div className="nar-board">
            <div className="nar-headline">{story.headline}</div>
            <ul className="nar-bullets">{story.bullets.map((b, k) => <li key={k}>{b}</li>)}</ul>
            <div className="nar-ask">{story.ask}</div>
          </div>
        )}

        {nfmt === 'executive' && (
          <div className="nar-exec">
            <div className="nar-col">
              <div className="nar-col-h">What changed</div>
              {story.changed.map((c, k) => (
                <div key={k} className="nar-item"><span className={`gov-log-tag cos-a-${c.action}`}>{c.action}</span><span className="nar-item-t">{c.text}</span></div>
              ))}
            </div>
            <div className="nar-col">
              <div className="nar-col-h">Why it matters</div>
              {story.why.map((w, k) => <div key={k} className="nar-item nar-why">{w}</div>)}
            </div>
            <div className="nar-col">
              <div className="nar-col-h">What should happen next</div>
              {story.next.map((n, k) => {
                const nid = n.id ? String(n.id) : ''
                const target = nid.startsWith('i-') ? 'initiative' : nid.startsWith('o-') ? 'opportunities' : null
                return (
                  <div key={k} className={`nar-item nar-next ${target ? 'clickable' : ''}`} onClick={() => target && navigate(target, target === 'initiative' ? { id: n.id } : {})}>→ {n.text}</div>
                )
              })}
            </div>
          </div>
        )}

        {nfmt === 'operational' && (
          <div className="nar-ops">
            <div className="nar-headline" style={{ fontSize: 14 }}>{story.headline}</div>
            {story.actions.length > 0 && <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Who</th><th>Action</th><th>Why now</th></tr></thead>
                <tbody>
                  {story.actions.map((a, k) => (
                    <tr key={k} className="clickable" onClick={() => a.id && navigate('initiative', { id: a.id })}>
                      <td className="nowrap"><b>{a.who}</b></td>
                      <td>{a.what}</td>
                      <td className="muted">{a.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
          </div>
        )}
      </div>
    </>
  )
}
