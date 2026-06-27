import { useState } from 'react'

function Toggle({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 46,
        height: 28,
        borderRadius: 16,
        background: on ? 'var(--green)' : '#cfd6df',
        position: 'relative',
        transition: 'background .15s',
        flex: '0 0 auto',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 21 : 3,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .15s',
          boxShadow: '0 1px 3px rgba(0,0,0,.25)',
        }}
      />
    </button>
  )
}

function SettingRow({ label, sub, on, toggle }) {
  return (
    <div className="row spread" style={{ padding: '13px 14px' }}>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{label}</div>
        {sub && (
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      <Toggle on={on} onClick={toggle} />
    </div>
  )
}

export default function Profile({ user, source, settings, setSettings, onSignOut }) {
  const [installed, setInstalled] = useState(false)
  const set = (k) => setSettings({ ...settings, [k]: !settings[k] })
  const live = source === 'postgres'

  return (
    <div className="screen">
      <div className="header">
        <div className="title">Profile</div>
      </div>

      <div className="pad stack">
        {/* user card */}
        <div className="card row gap" style={{ padding: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--navy)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: 19,
              fontWeight: 700,
              flex: '0 0 auto',
            }}
          >
            {user.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div className="row spread">
              <div className="h2" style={{ fontSize: 16 }}>
                {user.name}
              </div>
              <span
                className="pill"
                style={{
                  background: user.role === 'auditor' ? 'var(--tint-pass)' : 'var(--tint-na)',
                  color: user.role === 'auditor' ? 'var(--green)' : 'var(--grey)',
                  fontSize: 10,
                }}
              >
                {user.role === 'auditor' ? 'Can edit' : 'Read-only'}
              </span>
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              {user.title}
            </div>
          </div>
        </div>

        <button className="btn btn-light" onClick={() => setInstalled(true)}>
          {installed ? 'Added to Home Screen ✓' : 'Add to Home Screen'}
        </button>

        {/* settings */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="label" style={{ padding: '12px 14px 2px' }}>
            Settings
          </div>
          <SettingRow label="Push notifications" sub="Permit & finding alerts" on={settings.push} toggle={() => set('push')} />
          <div style={{ borderTop: '1px solid var(--card-border)' }} />
          <SettingRow label="Offline sync" sub="Cache portfolio for the yard" on={settings.offline} toggle={() => set('offline')} />
          <div style={{ borderTop: '1px solid var(--card-border)' }} />
          <SettingRow label="Open camera on capture" sub="Jump straight to photo evidence" on={settings.camera} toggle={() => set('camera')} />
        </div>

        {/* data source */}
        <div className="card row spread" style={{ padding: '13px 14px' }}>
          <div>
            <div className="label">Data source</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {live ? 'PostgreSQL (local)' : 'Local (demo)'}
            </div>
          </div>
          <span
            className="pill"
            style={{
              background: live ? 'var(--tint-pass)' : 'var(--tint-open)',
              color: live ? 'var(--green)' : 'var(--amber)',
            }}
          >
            <span className={`dot ${live ? 'dot-pg' : 'dot-local'}`} />
            {live ? 'Live' : 'Snapshot'}
          </span>
        </div>

        <button className="btn btn-light" style={{ color: 'var(--red)' }} onClick={onSignOut}>
          Sign out
        </button>

        <div className="muted" style={{ textAlign: 'center', fontSize: 11.5, padding: '6px 0 4px' }}>
          Athens Services · Facility Compliance · v0.4 POC
        </div>
      </div>
    </div>
  )
}
