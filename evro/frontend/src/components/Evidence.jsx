import { explainability } from '../lib/evidence.js'

// Trust indicator (5B.6 item 9) — a badge with a hover/focus panel showing the
// full explainability breakdown: score parts, evidence, assumptions, and any
// blocking dependencies on the linked record. Reuses the Knowledge-popover
// visual language (.kpop) so explainability feels like one system.

const TIER_TONE = { High: 'var(--green)', Medium: 'var(--amber)', Basic: 'var(--grey-2)' }

export default function TrustBadge({ db, rec, align = 'left' }) {
  const x = explainability(db, rec)
  return (
    <span className="trust" tabIndex={0} aria-label={`Explainability ${x.score} of 100 (${x.tier})`}>
      <span className="trust-b" style={{ color: TIER_TONE[x.tier], borderColor: TIER_TONE[x.tier] }}>
        ⛨ {x.score} · {x.tier}
      </span>
      <span className={`kpop ${align === 'right' ? 'kpop-r' : ''} trust-pop`} role="tooltip">
        <span className="kpop-t">Why trust this?</span>
        <span className="trust-parts">
          {x.parts.map((p) => (
            <span key={p.key} className={`trust-part ${p.ok ? 'ok' : 'miss'}`}>{p.ok ? '✓' : '—'} {p.label}</span>
          ))}
        </span>
        {x.evidence.length > 0 && (
          <span className="trust-sec"><b>Evidence</b>{x.evidence.map((e, k) => <span key={k} className="trust-line">· {e}</span>)}</span>
        )}
        {x.assumptions.length > 0 && (
          <span className="trust-sec"><b>Assumptions</b>{x.assumptions.map((a, k) => <span key={k} className="trust-line">· {a}</span>)}</span>
        )}
        {x.dependencies.length > 0 && (
          <span className="trust-sec"><b>Dependencies</b>{x.dependencies.map((d, k) => <span key={k} className="trust-line">· {d}</span>)}</span>
        )}
        <span className="kpop-e">Deterministic score: confidence + evidence + linked record + assumptions, 25 points each.</span>
      </span>
    </span>
  )
}
