import { useState, useEffect, useReducer } from 'react'
import { isStandalone, isIOS, canPrompt, promptInstall } from '../lib/pwa.js'

// "Add to Home Screen" — real PWA install. Native prompt on Android/desktop
// Chrome; step-by-step instructions on iOS (no install API there).
function IconShareIOS({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px' }}>
      <path d="M12 15V3" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </svg>
  )
}

function InstallApp() {
  const [, force] = useReducer((x) => x + 1, 0)
  const [iosOpen, setIosOpen] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => {
    const on = () => force()
    window.addEventListener('pwa-changed', on)
    return () => window.removeEventListener('pwa-changed', on)
  }, [])

  if (isStandalone()) {
    return (
      <div className="card bd-pass" style={{ padding: '12px 14px' }}>
        <div className="label" style={{ color: 'var(--grey)' }}>Installed</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>✓ Running as an installed app</div>
      </div>
    )
  }

  const ios = isIOS()
  const onInstall = async () => {
    const outcome = await promptInstall()
    if (outcome === 'unavailable') setMsg('Use your browser menu → "Install app" / "Add to Home Screen".')
    else if (outcome === 'dismissed') setMsg('Install dismissed — you can add it any time from here.')
  }

  return (
    <div className="card" style={{ padding: '12px 14px' }}>
      <div className="label" style={{ color: 'var(--grey)' }}>Install app</div>
      <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
        Add Athens Compliance to your home screen for a full-screen, app-like experience on iPhone and Android.
      </div>

      {ios ? (
        <>
          <button className="btn btn-light" style={{ marginTop: 10 }} onClick={() => setIosOpen((o) => !o)}>
            <IconShareIOS /> Add to Home Screen
          </button>
          {iosOpen && (
            <ol style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
              <li>In <b>Safari</b>, tap the <b>Share</b> icon <IconShareIOS size={13} /> (bottom bar).</li>
              <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
              <li>Tap <b>Add</b> — the app icon appears on your home screen.</li>
            </ol>
          )}
        </>
      ) : canPrompt() ? (
        <button className="btn" style={{ marginTop: 10, background: 'var(--navy)', color: '#fff' }} onClick={onInstall}>
          Add to Home Screen
        </button>
      ) : (
        <div className="muted" style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.5 }}>
          Open your browser menu and choose <b>Install app</b> / <b>Add to Home Screen</b>. On iPhone, use Safari’s
          <b> Share <IconShareIOS size={13} /> → Add to Home Screen</b>.
        </div>
      )}
      {msg && <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{msg}</div>}
    </div>
  )
}

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

        <InstallApp />

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
