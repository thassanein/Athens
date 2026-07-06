import { useMemo, useState } from 'react'
import { RITUALS, runRitual } from '../lib/rituals.js'
import { operatingContexts } from '../lib/mission.js'

// Ritual launcher + runner (6B item 10). The launcher card offers the three
// structured rituals at a chosen scope (enterprise / region / BU — persisted);
// the runner walks the computed steps like a short stand-up: ←/→/Esc.

const LS = 'evro.rituals'

export function RitualsCard({ db, user }) {
  const [scope, setScope] = useState(() => { try { return JSON.parse(localStorage.getItem(LS) || '{}').scope || 'enterprise' } catch { return 'enterprise' } })
  const [running, setRunning] = useState(null)
  const contexts = useMemo(() => operatingContexts(db), [db])
  const scopeOk = contexts.some((c) => c.key === scope) ? scope : 'enterprise'
  const setScopePersist = (s) => { setScope(s); try { localStorage.setItem(LS, JSON.stringify({ scope: s })) } catch { /* ignore */ } }

  return (
    <div className="card pad section-gap">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3>Operating rituals</h3>
        <span className="spacer" />
        <select className="mc-ctx" value={scopeOk} onChange={(e) => setScopePersist(e.target.value)} aria-label="Ritual scope">
          <optgroup label="Enterprise"><option value="enterprise">Enterprise</option></optgroup>
          <optgroup label="Regions">{contexts.filter((c) => c.kind === 'region').map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</optgroup>
          <optgroup label="Business units">{contexts.filter((c) => c.kind === 'business_unit').map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</optgroup>
        </select>
      </div>
      <p className="muted vwf-sub">
        The rhythms that make the operating system a habit. The daily ritual is your
        <b> Morning Briefing</b> (▶ in the top bar); these three run on the longer beats —
        scoped to the selection above.
      </p>
      <div className="rit-grid">
        {RITUALS.map((r) => (
          <button key={r.key} className="rit" onClick={() => setRunning(r.key)}>
            <b>{r.name}</b>
            <span className="rit-c">{r.cadence}</span>
            <span className="rit-b">{r.blurb}</span>
          </button>
        ))}
      </div>
      {running && <RitualRunner db={db} user={user} ritual={running} scope={scopeOk} onClose={() => setRunning(null)} />}
    </div>
  )
}

function RitualRunner({ db, user, ritual, scope, onClose }) {
  const model = useMemo(() => runRitual(db, user, ritual, scope), [db, user, ritual, scope])
  const [step, setStep] = useState(0)
  const s = model.steps[step]

  const key = (e) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowRight') setStep((x) => Math.min(model.steps.length - 1, x + 1))
    if (e.key === 'ArrowLeft') setStep((x) => Math.max(0, x - 1))
  }

  return (
    <div className="rit-scrim" onKeyDown={key} tabIndex={-1} ref={(el) => el?.focus()} role="dialog" aria-label={model.name}>
      <div className="rit-panel fx-expand">
        <div className="rit-h">
          <b>{model.name}</b>
          <span className="spacer" />
          <span className="muted" style={{ fontSize: 12 }}>{step + 1} / {model.steps.length}</span>
          <button className="btn sm ghost" onClick={onClose}>Esc · Close</button>
        </div>
        <div className="rit-step" key={step}>
          <div className="rit-step-t">{s.title}</div>
          {s.lines.map((l, k) => <p key={k} className="rit-line">{l}</p>)}
        </div>
        <div className="rit-nav">
          <button className="btn sm ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
          <span className="rit-dots">{model.steps.map((_, k) => <i key={k} className={k === step ? 'on' : ''} />)}</span>
          {step < model.steps.length - 1
            ? <button className="btn sm" onClick={() => setStep(step + 1)}>Next →</button>
            : <button className="btn sm" onClick={onClose}>Done ✓</button>}
        </div>
      </div>
    </div>
  )
}
