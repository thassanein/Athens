import { useMemo, useState } from 'react'
import { procurementBriefs } from '../lib/procurement.js'
import { pct } from '../lib/format.js'
import { IconAI } from '../components/Icons.jsx'
import EvidenceDrawer from '../components/EvidenceDrawer.jsx'

// Enterprise AI — Procurement Decision Intelligence (Phase One W6). Not a
// chatbot: five deterministic executive briefs (pipeline, risk, forecast
// variance, approvals, realization), each written as what happened / why it
// matters / what to do next, and each carrying the full EVRO trust contract —
// confidence, expected value, evidence, assumptions, risks, dependencies. The
// evidence rows drill through the shared Evidence Drawer. No language model,
// no fabricated numbers; every figure traces to the operating record.

export default function ProcurementAI({ db, navigate }) {
  const briefs = useMemo(() => procurementBriefs(db), [db])
  const [evClaim, setEvClaim] = useState(null)

  const openEvidence = (brief) => setEvClaim({
    metric: { value: brief.headline, label: `${brief.title} · ${brief.sub}` },
    text: brief.claims.map((c) => c.text).join(' '),
    source: 'EVRO deterministic engine · the operating record',
    evidence: brief.trust.evidence,
    nav: brief.nav,
  })

  return (
    <>
      <p className="page-intro">
        <b>Enterprise AI</b> — decision intelligence for the procurement book, not a chatbot. Five executive briefs, each written as
        what happened, why it matters and what to decide next, every one carrying its confidence, evidence, assumptions, risks and
        dependencies. Deterministic and rules-based — no language model, no fabricated numbers.
      </p>

      <div className="pai-grid">
        {briefs.map((b) => (
          <div key={b.key} className="pai-brief card pad" style={{ '--pai-tone': b.tone }}>
            <div className="pai-brief-h">
              <div>
                <div className="pai-brief-tag"><span className="ows-ai-ic"><IconAI /></span> {b.title.toUpperCase()}</div>
                <div className="pai-brief-headline mono" style={{ color: b.tone }}>{b.headline}</div>
                <div className="tiny muted">{b.sub}</div>
              </div>
              <span className="badge b-grey">rules-based · {pct(b.trust.confidence)}</span>
            </div>

            <div className="pai-claims">
              {b.claims.map((c) => (
                <div key={c.label} className="pai-claim"><span className="pai-claim-l">{c.label}.</span> {c.text}</div>
              ))}
            </div>

            <div className="pai-trust">
              <div className="pai-trust-ev">
                <span className="pai-trust-k">Expected value</span>
                <b className="mono" style={{ color: 'var(--green)' }}>{b.trust.expected.value}</b>
                <span className="tiny muted">{b.trust.expected.note}</span>
              </div>
              <div className="pai-trust-cols">
                <div>
                  <div className="pai-trust-k">Assumptions</div>
                  <ul className="pai-ul">{b.trust.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </div>
                <div>
                  <div className="pai-trust-k">Risks</div>
                  <ul className="pai-ul">{b.trust.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
                <div>
                  <div className="pai-trust-k">Dependencies</div>
                  <ul className="pai-ul">{b.trust.dependencies.length ? b.trust.dependencies.map((d, i) => <li key={i}>{typeof d === 'string' ? d : `${d.label}: ${d.value}`}</li>) : <li>none</li>}</ul>
                </div>
              </div>
            </div>

            <div className="pai-actions">
              <button className="btn sm" onClick={() => openEvidence(b)}>Evidence ({b.trust.evidence.length}) →</button>
              <button className="btn sm ghost" onClick={() => navigate(b.nav.page)}>{b.nav.label} →</button>
            </div>
          </div>
        ))}
      </div>

      <EvidenceDrawer claim={evClaim} onClose={() => setEvClaim(null)} navigate={navigate} />
    </>
  )
}
