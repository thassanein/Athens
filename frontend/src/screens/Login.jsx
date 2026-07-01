// Sign-in screen. Two shapes depending on the server's auth mode:
//   - passcode : a passcode is required (the app is locked down). Entering the
//                Auditor or Viewer passcode signs you in with that role.
//   - open/demo: no passcode — pick an Auditor/Viewer role (public mode).
import { useState } from 'react'

const USERS = {
  auditor: { name: 'Dave Marin', role: 'auditor', title: 'Field Auditor · EHS', initials: 'DM' },
  viewer: { name: 'Site Viewer', role: 'viewer', title: 'Read-only', initials: 'SV' },
}

const SHELL = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #243549 0%, #1A2736 55%, #141e2b 100%)',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'calc(env(safe-area-inset-top,0px) + 64px) 26px calc(env(safe-area-inset-bottom,0px) + 30px)',
}

function Brand() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 78, height: 78, borderRadius: 18, background: 'var(--red)', display: 'grid', placeItems: 'center', fontSize: 44, fontWeight: 700, boxShadow: '0 10px 30px rgba(213,23,42,.45)' }}>
        A
      </div>
      <div style={{ fontSize: 25, fontWeight: 700, marginTop: 22 }}>Facility Compliance</div>
      <div style={{ color: '#9FB0C4', marginTop: 8, fontSize: 13.5, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
        Track facility compliance status, open gaps, due dates, owners, and audit readiness.
      </div>
    </div>
  )
}

function Footer({ source }) {
  return (
    <div style={{ marginTop: 28, color: '#6E8198', fontSize: 11.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      Athens Services · v0.4 POC
      <span className={`dot ${source === 'postgres' ? 'dot-pg' : 'dot-local'}`} />
    </div>
  )
}

export default function Login({ source, mode, onEnter, onPasscode }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Locked-down (passcode) mode: require the shared passcode. The role is
  // decided server-side by which passcode is entered.
  if (mode === 'passcode') {
    const submit = async (e) => {
      e.preventDefault()
      if (!code || busy) return
      setBusy(true)
      setError('')
      const ok = await onPasscode?.(code)
      if (!ok) {
        setError('Incorrect passcode. Check with your administrator.')
        setBusy(false)
        setCode('')
      }
      // on success the app navigates away; nothing to reset
    }
    return (
      <div style={SHELL}>
        <Brand />
        <form onSubmit={submit} style={{ width: '100%' }}>
          <div style={{ color: '#6E8198', fontSize: 11, fontWeight: 700, textAlign: 'center', letterSpacing: '.6px', marginBottom: 10 }}>
            ENTER PASSCODE
          </div>
          <input
            type="password"
            value={code}
            autoFocus
            onChange={(e) => { setCode(e.target.value); setError('') }}
            placeholder="Team passcode"
            className="input"
            style={{ textAlign: 'center', fontSize: 16, letterSpacing: '1px' }}
          />
          {error && (
            <div style={{ color: '#FF8C99', fontSize: 12.5, textAlign: 'center', marginTop: 8 }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={busy || !code}
            className="btn btn-primary"
            style={{ marginTop: 12, background: 'var(--red)', opacity: busy || !code ? 0.6 : 1 }}
          >
            {busy ? 'Checking…' : 'Enter'}
          </button>
          <div style={{ color: '#6E8198', fontSize: 11.5, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
            Auditor passcode = full edit · Viewer passcode = read-only. Access depends on which you enter.
          </div>
          <Footer source={source} />
        </form>
      </div>
    )
  }

  // Open / public mode: credential-free role chooser.
  return (
    <div style={SHELL}>
      <Brand />
      <div style={{ width: '100%' }}>
        <div style={{ color: '#6E8198', fontSize: 11, fontWeight: 700, textAlign: 'center', letterSpacing: '.6px', marginBottom: 10 }}>
          CHOOSE ACCESS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={() => onEnter(USERS.auditor)}
            style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 14, padding: '16px 10px', color: '#fff', textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: 16, fontWeight: 700 }}>Auditor</div>
            <div style={{ fontSize: 11.5, color: '#9FB0C4', marginTop: 4 }}>Full edit access</div>
          </button>
          <button
            onClick={() => onEnter(USERS.viewer)}
            style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 14, padding: '16px 10px', color: '#fff', textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: 16, fontWeight: 700 }}>Viewer</div>
            <div style={{ fontSize: 11.5, color: '#9FB0C4', marginTop: 4 }}>Read-only</div>
          </button>
        </div>
        <Footer source={source} />
      </div>
    </div>
  )
}
