import { BrandMark } from '../components/Brand.jsx'
import { IconExec, IconReport, IconPortfolio, IconBolt } from '../components/Icons.jsx'

// Role login — after choosing EVRO Procurement, the operator picks who they are.
// Each path signs in as that role, lands on the view that fits their day, and
// carries that role's capabilities. Four paths, plain language, one tap in.
export const ROLE_PATHS = [
  { key: 'exec', role: 'exec', title: 'Executive Sponsor', who: 'CPO, VP or business sponsor', land: 'procurement', tone: 'var(--brand-value)', Icon: IconExec,
    sees: ['The one number and the value story', 'Spend bridge and impact by year', 'What needs a decision now'] },
  { key: 'fpna', role: 'fpna', title: 'FP&A / Finance', who: 'Signs off delivered savings', land: 'procurement', tone: 'var(--navy)', Icon: IconReport,
    sees: ['The book and the forecast', 'Confirmed vs committed vs at-risk', 'Validate value against actuals'] },
  { key: 'leader', role: 'leader', title: 'Category Lead', who: 'Runs sourcing categories', land: 'phase_pipeline', tone: 'var(--opp)', Icon: IconPortfolio,
    sees: ['Your deals across the four phases', 'Move them commit → execute → realize', 'Owner, value and next step per deal'] },
  { key: 'sourcing', role: 'procurement', title: 'Sourcing Manager', who: 'Works the deals day to day', land: 'mission', tone: 'var(--green)', Icon: IconBolt,
    sees: ['What needs you today', 'The deals you own', 'Next best actions'] },
]
export const rolePath = (key) => ROLE_PATHS.find((r) => r.key === key) || ROLE_PATHS[0]

export default function ProcurementLogin({ onPick, onBack }) {
  return (
    <div className="plogin">
      <div className="plogin-inner">
        <div className="plogin-head">
          <BrandMark size={44} id="plg" />
          <div>
            <div className="plogin-kicker">EVRO Procurement</div>
            <h1 className="plogin-title">Who’s signing in?</h1>
            <p className="plogin-sub">Pick your role — you’ll land on the view built for your day. You can switch anytime from the top bar.</p>
          </div>
        </div>

        <div className="plogin-grid">
          {ROLE_PATHS.map((r, i) => (
            <button key={r.key} className="plogin-card" style={{ animationDelay: `${i * 70}ms`, ['--rt']: r.tone }} onClick={() => onPick(r.key)}>
              <span className="plogin-card-ic" style={{ color: r.tone }}><r.Icon /></span>
              <div className="plogin-card-t">{r.title}</div>
              <div className="plogin-card-who">{r.who}</div>
              <ul className="plogin-card-sees">
                {r.sees.map((s, k) => <li key={k}>{s}</li>)}
              </ul>
              <span className="plogin-card-cta">Continue as {r.title} →</span>
            </button>
          ))}
        </div>

        <button className="plogin-back linkbtn" onClick={onBack}>← Back to capabilities</button>
      </div>
    </div>
  )
}
