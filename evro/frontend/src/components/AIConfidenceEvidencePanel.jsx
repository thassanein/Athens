import { useState } from 'react'
import { recTrust } from '../lib/ai-trust.js'
import { pct } from '../lib/format.js'

// AIConfidenceEvidencePanel (6D Wave 4) — the trust contract on a single
// recommendation. The brief's rule: every AI claim exposes confidence,
// evidence, assumptions, dependencies, risks and expected value. Collapsed to
// the headline (agent · confidence · expected value); one tap opens the full
// breakdown. All grounded by recTrust; the AI is transparent, never a black box.
export default function AIConfidenceEvidencePanel({ db, rec, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const t = recTrust(db, rec)
  const confTone = t.confidence >= 0.8 ? 'var(--green)' : t.confidence >= 0.6 ? 'var(--amber)' : 'var(--red)'
  return (
    <div className={`acep ${open ? 'open' : ''}`}>
      <button className="acep-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="acep-agent">{t.agent}{t.rulesBased && <span className="acep-rb">rules-based</span>}</span>
        <span className="acep-title">{t.title}</span>
        <span className="spacer" />
        <span className="acep-conf" style={{ color: confTone }} title="Confidence">{pct(t.confidence)}</span>
        <span className="acep-exp mono" title="Expected value (risk-adjusted)">{t.expected.value}</span>
        <span className="acep-caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="acep-body fx-collapse-in">
          <p className="acep-rec">{t.recommendation}</p>
          <div className="acep-bar" role="img" aria-label={`Confidence ${pct(t.confidence)}`}>
            <span style={{ width: `${Math.round(t.confidence * 100)}%`, background: confTone }} />
          </div>
          <div className="acep-grid">
            <TrustField label="Confidence" tone={confTone}>{pct(t.confidence)} — rules-based signal</TrustField>
            <TrustField label="Expected value">{t.expected.value}<span className="acep-note"> · {t.expected.note}</span></TrustField>
            <TrustField label="Evidence" full>
              <ul>{t.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </TrustField>
            <TrustField label="Assumptions" full>
              <ul>{t.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </TrustField>
            <TrustField label="Dependencies" full>
              <ul>{t.dependencies.map((d, i) => <li key={i}><b>{d.label}:</b> {d.value}</li>)}</ul>
            </TrustField>
            <TrustField label="Risks" full>
              <ul>{t.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </TrustField>
          </div>
        </div>
      )}
    </div>
  )
}

function TrustField({ label, children, tone, full }) {
  return (
    <div className={`acep-field ${full ? 'full' : ''}`}>
      <div className="acep-field-l" style={tone ? { color: tone } : undefined}>{label}</div>
      <div className="acep-field-v">{children}</div>
    </div>
  )
}
