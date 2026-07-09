import { useMemo } from 'react'
import { procurementModel, PROCUREMENT_ROLE_LABEL } from '../lib/procurement.js'
import { money, num } from '../lib/format.js'

// Home — one question, answered for whoever is signed in: "what needs me?"
// Executives and Finance see the whole book; the people who run deals (Category
// Lead, Sourcing Manager, Owner) see only THEIR deals. One plain list, no agent
// jargon, no confidence percentages — just the deal, what to do, and the value.

const BOOK_ROLES = ['exec', 'admin', 'fpna']
const ROLE_FOCUS = {
  exec: 'the whole book and what needs a decision',
  admin: 'the whole book and what needs a decision',
  fpna: 'validating delivered value and the forecast',
  leader: 'your categories and moving deals forward',
  owner: 'the deals you own and your next actions',
  procurement: 'the deals you own and your next actions',
}

// Plain, role-neutral "why this needs you" for one deal (no jargon).
function actionFor(o) {
  if (o.ragStatus === 'red') return { kind: 'risk', label: 'At risk — needs attention', rank: 4 }
  if (o.nextDecision?.missing?.length) return { kind: 'provide', label: `${o.nextDecision.label} — ${o.nextDecision.missing.length} thing${o.nextDecision.missing.length === 1 ? '' : 's'} to provide`, rank: 3 }
  if (o._raw.request) return { kind: 'signoff', label: o.nextDecision?.label || 'Waiting for sign-off', rank: 3 }
  if (o.nextDecision) return { kind: 'next', label: o.nextDecision.label, rank: 2 }
  return null
}

export default function ProcurementHome({ db, navigate, user }) {
  const m = useMemo(() => procurementModel(db), [db])
  const firstName = (user?.name || '').split(' ')[0]
  const roleLabel = PROCUREMENT_ROLE_LABEL[user?.role] || 'EVRO'
  const focus = ROLE_FOCUS[user?.role] || 'what needs you today'
  const scope = BOOK_ROLES.includes(user?.role) ? 'book' : 'mine'

  // The deals in scope for this person.
  const inScope = useMemo(() => {
    if (scope === 'book') return m.opportunities
    return m.opportunities.filter((o) => o.ownerId === user?.id)
  }, [m.opportunities, scope, user])

  // The ranked "what needs you" list — plain, top of the to-do.
  const todo = useMemo(() => inScope
    .map((o) => ({ o, act: actionFor(o) }))
    .filter((x) => x.act)
    .sort((a, b) => (b.act.rank - a.act.rank) || (b.o.value.headline - a.o.value.headline)), [inScope])

  const scopeValue = inScope.reduce((s, o) => s + o.value.headline, 0)
  const open = (id) => navigate('opportunity', { id })
  const rowNav = (id) => ({
    className: 'phome-item', role: 'button', tabIndex: 0, onClick: () => open(id),
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(id) } },
  })
  const dot = { risk: 'var(--red)', provide: 'var(--amber)', signoff: 'var(--navy)', next: 'var(--brand-value)' }

  return (
    <>
      <div className="phome-hero card pad">
        <div className="phome-hero-t">{firstName ? `Welcome, ${firstName}` : 'What needs you today'}</div>
        <div className="tiny muted" style={{ marginTop: -2, marginBottom: 8 }}>Signed in as <b>{roleLabel}</b> · focus on {focus}.</div>
        <div className="phome-pulse">
          {scope === 'book' ? (
            <>
              <span><b className="mono" style={{ color: 'var(--green)' }}>{money(m.sum.lenses.realized)}</b> confirmed this year</span>
              <span className="phome-dot" />
              <span><b className="mono">{num(todo.length)}</b> need{todo.length === 1 ? 's' : ''} a step</span>
              <span className="phome-dot" />
              <span><b className="mono" style={{ color: m.sum.atRisk ? 'var(--red)' : 'inherit' }}>{num(inScope.filter((o) => o.ragStatus === 'red').length)}</b> at risk</span>
            </>
          ) : (
            <>
              <span>You own <b className="mono">{num(inScope.length)}</b> deal{inScope.length === 1 ? '' : 's'}</span>
              <span className="phome-dot" />
              <span><b className="mono">{money(scopeValue)}</b>/yr</span>
              <span className="phome-dot" />
              <span><b className="mono" style={{ color: todo.length ? 'var(--amber)' : 'var(--green)' }}>{num(todo.length)}</b> need{todo.length === 1 ? 's' : ''} a step from you</span>
            </>
          )}
        </div>
        <div className="phome-hero-cta">
          <button className="btn sm" onClick={() => navigate('phase_pipeline')}>Open the pipeline →</button>
          {scope === 'book' && <button className="btn sm ghost" onClick={() => navigate('procurement')}>See the numbers →</button>}
        </div>
      </div>

      {/* The one list: what needs you, in plain language */}
      <div className="card pad section-gap">
        <div className="card-h">
          <h3>What needs you</h3>
          <span className="tiny muted" style={{ marginLeft: 8 }}>{scope === 'book' ? 'across the book' : 'on the deals you own'} · most important first</span>
        </div>
        {todo.length === 0 ? (
          <p className="muted" style={{ padding: '12px 2px' }}>You’re all clear — nothing needs a step right now.</p>
        ) : (
          <div className="phome-list">
            {todo.slice(0, 8).map(({ o, act }) => (
              <div key={o.id} {...rowNav(o.id)}>
                <span className="phome-item-dot" style={{ background: dot[act.kind] || 'var(--grey)' }} />
                <div className="phome-item-main">
                  <div className="phome-item-t"><b>{o.name}</b></div>
                  <div className="phome-item-need">{act.label}</div>
                </div>
                <div className="phome-item-right">
                  <span className="mono phome-item-v">{money(o.value.headline)}</span>
                  <span className="tiny muted">{o.stageLabel}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
