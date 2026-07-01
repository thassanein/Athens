import { executiveBriefing } from '../lib/briefing.js'
import { money } from '../lib/format.js'
import { IconAI, IconClose, IconBolt } from './Icons.jsx'

const TONEV = { green: 'var(--green)', navy: 'var(--navy)', red: 'var(--red)', amber: 'var(--amber)', opp: 'var(--opp)' }
const KIND = { summary: 'b-navy', approval: 'b-amber', leakage: 'b-red', opportunity: 'b-green', sustainment: 'b-red' }

// Executive Morning Briefing 2.0 — an auto-generated, structured deterministic
// briefing with one-click action execution. Mobile-first side panel.
export default function Briefing({ open, onClose, db, user, openDrawer, dispatch, flash, navigate }) {
  if (!open) return null
  const b = executiveBriefing(db, user)
  const go = (id) => { if (id) { openDrawer(id); onClose() } }
  const approve = async (d) => {
    const r = await dispatch?.('approveRequest', d.id, user.id)
    if (r && !r.error) flash?.(`Approved: ${d.title}`)
  }

  return (
    <div className="brief-scrim" onClick={onClose}>
      <div className="brief" role="dialog" aria-label="Executive briefing" onClick={(e) => e.stopPropagation()}>
        <div className="brief-head">
          <span className="copilot-logo"><IconAI /></span>
          <div>
            <b style={{ fontSize: 16 }}>{b.greeting}</b>
            <div className="tiny muted">{b.roleTitle} briefing · AI · rules-based · {b.decisions} decision{b.decisions === 1 ? '' : 's'} in view</div>
          </div>
          <span className="spacer" />
          <button className="iconbtn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <div className="brief-body">
          <p className="brief-headline">{b.headline}</p>

          {/* marquee blocks: value realized · driver · risk · leakage */}
          <div className="brief-blocks">
            {b.blocks.map((bl) => (
              <button key={bl.key} className="brief-block" onClick={() => go(bl.id)} style={{ cursor: bl.id ? 'pointer' : 'default' }}>
                <div className="tiny label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span>{bl.icon}</span>{bl.title}</div>
                <div className="brief-block-val mono" style={{ color: TONEV[bl.tone] || 'var(--ink)' }}>{bl.value}</div>
                <div className="tiny muted brief-block-sub">{bl.sub}</div>
              </button>
            ))}
          </div>

          {/* approvals — one-click execution */}
          <div className="brief-section">
            <div className="card-h" style={{ marginBottom: 6 }}><span className="badge b-amber">{b.approvals.length}</span><b style={{ fontSize: 13 }}>Awaiting your sign-off</b></div>
            {b.approvals.length === 0 ? <p className="tiny muted" style={{ margin: 0 }}>Nothing needs your approval.</p> : (
              <div className="brief-list">
                {b.approvals.map((d) => (
                  <div key={d.id} className="brief-item" style={{ gap: 8 }}>
                    <button className="link" onClick={() => go(d.id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', cursor: 'pointer' }}>
                      <div style={{ fontSize: 13 }}>{d.title}</div><div className="tiny muted">{d.detail}</div>
                    </button>
                    <span className="mono small" style={{ fontWeight: 700 }}>{money(d.value)}</span>
                    {d.roles.length > 0
                      ? <button className="btn go sm" onClick={() => approve(d)}>Approve</button>
                      : <button className="btn sm" onClick={() => go(d.id)}>Open</button>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* opportunities */}
          {b.opportunities.length > 0 && (
            <div className="brief-section">
              <div className="card-h" style={{ marginBottom: 6 }}><span className="badge b-opp">{b.opportunities.length}</span><b style={{ fontSize: 13 }}>Opportunities to explore</b></div>
              <div className="brief-list">
                {b.opportunities.map((o, i) => (
                  <button key={i} className="brief-item" onClick={() => { navigate?.('mining'); onClose() }} style={{ cursor: 'pointer' }}>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}><div style={{ fontSize: 13 }}>{o.label}</div><div className="tiny muted">{o.hint}</div></div>
                    <span className="mono small" style={{ fontWeight: 700, color: 'var(--opp)' }}>{money(o.value)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* recommended actions */}
          {b.actions.length > 0 && (
            <div className="brief-section">
              <div className="card-h" style={{ marginBottom: 6 }}><span className="badge b-navy">{b.actions.length}</span><b style={{ fontSize: 13 }}>Recommended actions</b></div>
              <div className="brief-list">
                {b.actions.map((a, i) => (
                  <button key={i} className="brief-item" onClick={() => (a.id ? go(a.id) : (navigate?.('mining'), onClose()))} style={{ cursor: 'pointer' }}>
                    <span className={`badge ${KIND[a.kind] || 'b-grey'}`} style={{ flex: 'none' }}>{a.kind}</span>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}><b style={{ fontSize: 12.5 }}>{a.title}</b><div className="tiny muted">{a.body}</div></div>
                    <span style={{ color: 'var(--navy)' }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card-h section-gap">
            <button className="btn sm" onClick={() => { navigate?.('morning'); onClose() }}>Open Morning screen →</button>
          </div>
          <p className="tiny muted section-gap"><IconBolt /> Auto-generated for your role and scope · computed from the live portfolio, not a language model.</p>
        </div>
      </div>
    </div>
  )
}
