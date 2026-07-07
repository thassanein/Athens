import { useState } from 'react'
import { CAPABILITIES, readCapabilities, setCapability, resetCapabilities } from '../lib/capabilities.js'
import { EXPERIENCE_FLAGS, readFlags, setFlag, resetFlags } from '../lib/flags.js'

// Settings — the control surface for EVRO's capability model and experience
// flags. Phase One ships with Procurement active and the other capabilities
// declared-but-off; an admin can switch capabilities and dark-launched
// experiences here. Nothing on this page touches value math or the record —
// it curates the front door and presentation only.
const STATUS_TAG = { active: { label: 'Active', cls: 'b-green' }, planned: { label: 'Planned', cls: 'b-grey' } }

function Toggle({ on, disabled, onChange, label }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} disabled={disabled}
      className={`set-toggle ${on ? 'on' : ''}`} onClick={() => !disabled && onChange(!on)}>
      <span className="set-toggle-knob" />
    </button>
  )
}

export default function Settings({ user, caps, flash, refreshShell }) {
  const admin = !!caps?.admin
  const [capState, setCapState] = useState(() => readCapabilities())
  const [flagState, setFlagState] = useState(() => readFlags())

  const toggleCap = (key, on) => {
    if (!admin) return
    const next = setCapability(key, on)
    setCapState({ ...next })
    refreshShell?.()
    flash?.(on ? `${key} capability enabled` : `${key} capability disabled`)
  }
  const toggleFlag = (key, on) => {
    if (!admin) return
    const next = setFlag(key, on)
    setFlagState({ ...next })
  }
  const resetAll = () => {
    if (!admin) return
    setCapState({ ...resetCapabilities() })
    setFlagState({ ...resetFlags() })
    refreshShell?.()
    flash?.('Settings reset to Phase One defaults')
  }

  const activeCount = CAPABILITIES.filter((c) => capState[c.key]).length

  return (
    <div className="page settings-page">
      <div className="set-head card pad">
        <div>
          <div className="set-eyebrow">EVRO · one platform, one identity, one engine</div>
          <h2 style={{ margin: '4px 0 6px' }}>Capabilities &amp; experience</h2>
          <p className="muted" style={{ maxWidth: 560, fontSize: 13 }}>
            EVRO runs the enterprise as a set of value capabilities. Phase One activates
            <b> Procurement</b> — the first active capability. The others are declared on the
            roadmap and switched off, so the operating system stays focused. Toggling a
            second capability restores the full enterprise navigation.
          </p>
        </div>
        <div className="set-summary">
          <div className="set-summary-n mono">{activeCount}</div>
          <div className="tiny muted">active capabilit{activeCount === 1 ? 'y' : 'ies'}</div>
        </div>
      </div>

      {!admin && (
        <div className="set-note card pad" role="note">
          You are viewing as <b>{user?.name || 'a non-admin user'}</b>. Capability and experience
          controls are admin-configurable — switch to an EVRO Lead / Executive persona to change them.
        </div>
      )}

      <section className="set-section">
        <div className="set-section-head">
          <h3>Enterprise capabilities</h3>
          <span className="tiny muted">what EVRO runs</span>
        </div>
        <div className="set-grid">
          {CAPABILITIES.map((c) => {
            const on = !!capState[c.key]
            const anchor = c.key === 'procurement'
            const tag = STATUS_TAG[c.status] || STATUS_TAG.planned
            return (
              <div key={c.key} className={`set-cap card pad ${on ? 'on' : ''}`}>
                <div className="set-cap-top">
                  <div>
                    <b>{c.label}</b>
                    <span className={`badge ${tag.cls}`} style={{ marginLeft: 8 }}>{on ? 'On' : tag.label}</span>
                  </div>
                  <Toggle on={on} disabled={!admin || (anchor && on && activeCount === 1)}
                    onChange={(v) => toggleCap(c.key, v)} label={`Toggle ${c.label} capability`} />
                </div>
                <p className="muted tiny" style={{ margin: '6px 0 0' }}>{c.desc}</p>
                {anchor && <p className="tiny" style={{ margin: '6px 0 0', color: 'var(--brand-energy)' }}>Anchor capability — Phase One keeps this on.</p>}
              </div>
            )
          })}
        </div>
      </section>

      <section className="set-section">
        <div className="set-section-head">
          <h3>Experience flags</h3>
          <span className="tiny muted">reversible presentation switches — never value math</span>
        </div>
        <div className="set-list card">
          {EXPERIENCE_FLAGS.map((f) => {
            const on = !!flagState[f.key]
            return (
              <div key={f.key} className="set-row">
                <div>
                  <b>{f.label}</b>
                  {f.default === false && <span className="badge b-grey" style={{ marginLeft: 8 }}>dark-launch</span>}
                  <div className="muted tiny" style={{ marginTop: 3 }}>{f.desc}</div>
                </div>
                <Toggle on={on} disabled={!admin} onChange={(v) => toggleFlag(f.key, v)} label={`Toggle ${f.label}`} />
              </div>
            )
          })}
        </div>
      </section>

      {admin && (
        <div className="set-actions">
          <button className="btn ghost" onClick={resetAll}>Reset to Phase One defaults</button>
          <span className="tiny muted">Procurement on · other capabilities off · experience flags at default.</span>
        </div>
      )}
    </div>
  )
}
