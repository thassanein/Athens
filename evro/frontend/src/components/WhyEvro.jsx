import { IconClose } from './Icons.jsx'
import { EvroMark } from './Brand.jsx'

// Why EVRO — the plain-English elevator pitch. No jargon, no metrics to decode.
// It answers the only questions an executive sponsor actually asks: what problem
// are we solving, why does it matter, and what does this do about it. Shown once
// on first entry and re-openable from the "Why EVRO?" button.
const BEFORE_AFTER = [
  { before: 'Savings live in a dozen spreadsheets', after: 'One number everyone trusts' },
  { before: 'The same saving gets counted twice — or forgotten', after: 'Every saving tracked to the finish' },
  { before: 'Surprises show up at year-end', after: 'See what needs a decision today' },
]

export default function WhyEvro({ onClose, onTour }) {
  return (
    <>
      <div className="why-scrim" onClick={onClose} />
      <section className="why" role="dialog" aria-modal="true" aria-label="Why EVRO">
        <button className="iconbtn why-x" onClick={onClose} aria-label="Close"><IconClose /></button>
        <div className="why-head">
          <span className="why-mark"><EvroMark size={30} id="why" /></span>
          <div>
            <div className="why-eyebrow">WHY EVRO</div>
            <h2 className="why-title">Save more, argue less.</h2>
          </div>
        </div>

        <p className="why-lead">
          Athens saves millions by buying smarter. But today those savings live in a dozen spreadsheets — teams count them
          differently, some get counted twice, and good deals stall because no one is tracking them to the finish.
        </p>
        <p className="why-lead why-cost">
          That’s real money left on the table, and hours of leadership time lost arguing about whose number is right.
        </p>

        <div className="why-what">
          <b>EVRO is one place for every saving.</b> One number everyone agrees on, tracked from first idea to money in the
          bank, with a clear owner and a clear next step for each deal.
        </div>

        <div className="why-ba">
          {BEFORE_AFTER.map((r, i) => (
            <div key={i} className="why-ba-row">
              <span className="why-ba-before">{r.before}</span>
              <span className="why-ba-arrow">→</span>
              <span className="why-ba-after">{r.after}</span>
            </div>
          ))}
        </div>

        <div className="why-payoff">
          At any moment, you can answer three questions:
          <span className="why-q3"><span>How much are we saving?</span><span>What’s confirmed?</span><span>What needs a decision today?</span></span>
        </div>

        <div className="why-foot">
          <button className="btn accent" onClick={onClose}>Show me the dashboard →</button>
          {onTour && <button className="btn ghost" onClick={() => { onClose(); onTour() }}>Take the 5-minute tour</button>}
        </div>
      </section>
    </>
  )
}
