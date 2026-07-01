import { useEffect, useState } from 'react'
import { companionBrief, OPERATING_MODES, defaultModeFor } from '../lib/companion.js'
import { money, dateLabel } from '../lib/format.js'
import { Tile, MoreList } from '../components/ui.jsx'
import { IconAI } from '../components/Icons.jsx'

// Executive Morning Operating Screen — the default post-login experience.
// "Today, at a glance": value under management, what needs you, risks,
// opportunities and recommendations, framed by an operating lens. View-only.
export default function Morning({ db, user, navigate, openDrawer, onCompanion }) {
  const [mode, setMode] = useState(defaultModeFor(user.role))
  useEffect(() => { setMode(defaultModeFor(user.role)) }, [user.role])
  const b = companionBrief(db, user, mode)
  const vum = b.vum

  return (
    <>
      <div className="morning-hero">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tiny" style={{ opacity: 0.85, fontWeight: 700, letterSpacing: 0.6 }}>{dateLabel(db.meta.now).toUpperCase()} · {b.mode.label} OPERATING VIEW</div>
          <h2 className="morning-greet">{b.greeting}</h2>
          <div className="morning-metric">
            <span className="morning-big mono">{b.metric.value}</span>
            <div>
              <div className="tiny" style={{ opacity: 0.85, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{b.metric.label}</div>
              <div className="tiny" style={{ opacity: 0.9 }}>{b.metric.sub}</div>
            </div>
          </div>
        </div>
        <div className="morning-actions">
          <button className="btn sm" onClick={() => onCompanion && onCompanion()} style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', borderColor: 'transparent' }}><IconAI /> Ask the companion</button>
          <button className="btn sm" onClick={() => navigate('cockpit')} style={{ background: 'rgba(255,255,255,0.16)', color: '#fff', borderColor: 'transparent' }}>Open cockpit →</button>
        </div>
      </div>

      <div className="card-h section-gap">
        <h3>Operating lens</h3>
        <span className="tiny muted" style={{ marginLeft: 8 }}>reframes emphasis · does not change permissions</span>
        <span className="spacer" />
        <div className="seg">
          {OPERATING_MODES.map((m) => <button key={m.key} className={mode === m.key ? 'active' : ''} onClick={() => setMode(m.key)} title={m.blurb}>{m.label}</button>)}
        </div>
      </div>

      <div className="tiles section-gap">
        <Tile tone="green" label="Realized (YTD)" value={money(vum.realized)} sub="FP&A-validated" />
        <Tile tone="navy" label="Risk-adjusted forecast" value={money(vum.forecast)} sub="rest of FY" />
        <Tile tone="opp" label="Identified opportunity" value={money(vum.opportunity)} sub="not yet in plan" />
        <Tile tone="dark" label="Value under management" value={money(vum.total)} sub={`${vum.initiatives} active initiatives`} />
      </div>

      <div className="grid cols-2 section-gap">
        {b.sections.map((sec) => (
          <div key={sec.kind} className="card pad">
            <div className="card-h">
              <h3 style={{ fontSize: 15 }}>{sec.title}</h3>
              <span className="spacer" />
              <span className={`badge ${sec.badge}`}>{sec.items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <MoreList items={sec.items} limit={4}>
                {(it, i) => (
                  <button key={i} className="op-row" onClick={() => (it.id ? openDrawer(it.id) : navigate(sec.nav))}>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <b style={{ fontSize: 13 }}>{it.label}</b>
                      {it.hint && <div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.hint}</div>}
                    </div>
                    {it.value != null && <span className="mono small" style={{ fontWeight: 700 }}>{money(it.value)}</span>}
                    <span style={{ color: 'var(--navy)' }}>→</span>
                  </button>
                )}
              </MoreList>
            </div>
            <button className="btn sm section-gap" onClick={() => navigate(sec.nav)}>Open {sec.nav === 'cockpit' ? 'cockpit' : sec.nav} →</button>
          </div>
        ))}
      </div>

      <p className="tiny muted section-gap">
        <span className="badge b-grey"><IconAI /> AI · rules-based</span>&nbsp; Deterministic executive intelligence, computed from the live portfolio — no language model.
        Operating lenses reframe emphasis for the current user; they never change what you can see or the underlying numbers.
      </p>
    </>
  )
}
