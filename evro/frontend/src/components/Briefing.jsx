import { morningBriefing } from '../lib/briefing.js'
import { money } from '../lib/format.js'
import { IconAI, IconClose, IconBolt } from './Icons.jsx'

const KIND = { approval: 'b-amber', leakage: 'b-red', opportunity: 'b-green', sustainment: 'b-red' }

// Role-personalized morning briefing — the proactive "here's your day" view.
export default function Briefing({ open, onClose, db, user, openDrawer }) {
  if (!open) return null
  const b = morningBriefing(db, user)
  const go = (id) => { if (id) { openDrawer(id); onClose() } }

  return (
    <div className="brief-scrim" onClick={onClose}>
      <div className="brief" role="dialog" aria-label="Morning briefing" onClick={(e) => e.stopPropagation()}>
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

          {b.rec && (
            <div className="brief-rec" onClick={() => go(b.rec.target)} style={{ cursor: b.rec.target ? 'pointer' : 'default' }}>
              <span className={`badge ${KIND[b.rec.kind] || 'b-grey'}`} style={{ textTransform: 'capitalize' }}>{b.rec.kind}</span>
              <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 13 }}>Recommended: {b.rec.title}</b><div className="tiny muted">{b.rec.body}</div></div>
              {b.rec.target && <span style={{ color: 'var(--navy)' }}>→</span>}
            </div>
          )}

          {b.sections.map((s) => (
            <div key={s.kind} className="brief-section">
              <div className="card-h" style={{ marginBottom: 6 }}>
                <span className={`badge ${s.badge}`}>{s.items.length}</span>
                <b style={{ fontSize: 13 }}>{s.title}</b>
              </div>
              {s.items.length === 0 ? <p className="tiny muted" style={{ margin: 0 }}>{s.empty}</p> : (
                <div className="brief-list">
                  {s.items.map((it, k) => (
                    <button key={k} className="brief-item" onClick={() => go(it.id)} style={{ cursor: it.id ? 'pointer' : 'default' }}>
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <div style={{ fontSize: 13 }}>{it.label}</div>
                        {it.hint && <div className="tiny muted">{it.hint}</div>}
                      </div>
                      {it.value != null && <span className="mono small" style={{ fontWeight: 700 }}>{money(it.value)}</span>}
                      {it.id && <span className="tiny" style={{ color: 'var(--navy)' }}>→</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <p className="tiny muted section-gap"><IconBolt /> Personalized to your role and scope · computed from the live portfolio, not a language model.</p>
        </div>
      </div>
    </div>
  )
}
