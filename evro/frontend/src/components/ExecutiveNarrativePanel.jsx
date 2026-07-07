import { useMemo, useState } from 'react'
import { execNarrative } from '../lib/exec-narrative.js'
import { getPref, setPref } from '../lib/memory.js'
import EvidenceDrawer from './EvidenceDrawer.jsx'
import { IconAI } from './Icons.jsx'

// ExecutiveNarrativePanel (6D Wave 3) — the story is the surface, evidence is
// one click away. Four questions (what happened / why / what it means / what
// next), three audience modes, and every claim drillable to its metric,
// source and underlying rows via the EvidenceDrawer. Reduces cognitive load:
// prose first, numbers on demand. All deterministic; motion reduced-safe.
export default function ExecutiveNarrativePanel({ db, user, navigate }) {
  const [mode, setMode] = useState(() => getPref('narrative') || 'executive')
  const n = useMemo(() => execNarrative(db, user, mode), [db, user, mode])
  const [evidence, setEvidence] = useState(null)
  const pickMode = (k) => { setMode(k); setPref('narrative', k, db.meta.now) } // remembered by Executive Memory

  return (
    <div className="card pad enp">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3><IconAI /> Executive narrative</h3>
        <span className="spacer" />
        <div className="seg enp-modes" role="group" aria-label="Narrative audience">
          {n.modes.map((m) => (
            <button key={m.key} className={mode === m.key ? 'active' : ''} aria-pressed={mode === m.key}
              onClick={() => pickMode(m.key)} title={m.gloss}>{m.label}</button>
          ))}
        </div>
      </div>
      <div className="enp-headline mono">{n.headline}</div>

      <div className="enp-sections">
        {n.sections.map((sec) => (
          <section key={sec.key} className="enp-sec">
            <div className="enp-q">{sec.q}</div>
            {sec.claims.length === 0 && <p className="enp-claim muted">Nothing to report in this period.</p>}
            {sec.claims.map((c, i) => (
              <div key={i} className="enp-claim">
                <p className="enp-text">{c.text}</p>
                <div className="enp-claim-foot">
                  <button className="enp-ev" onClick={() => setEvidence(c)}
                    aria-label={`Show evidence for: ${c.metric.label} ${c.metric.value}`}>
                    <span className="enp-ev-metric mono">{c.metric.value}</span>
                    <span className="enp-ev-l">{c.metric.label} · evidence →</span>
                  </button>
                  {c.nav && navigate && (
                    <button className="enp-go" onClick={() => navigate(c.nav.page)}>{c.nav.label} →</button>
                  )}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>

      <p className="eh-fine">{n.generatedFrom} — every claim traces to its metric, source and records via <b>evidence</b>.</p>
      <EvidenceDrawer claim={evidence} onClose={() => setEvidence(null)} navigate={navigate} />
    </div>
  )
}
