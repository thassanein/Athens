import { useState } from 'react'
import { IconMicrosoft } from '../components/Icons.jsx'
import { authLoginUrl, submitPasscode } from '../lib/api.js'
import { EMPLOYEES, AUDITOR_PASSCODE, makeUser } from '../lib/employees.js'

// A password field with a show/hide (eye) toggle.
function PasswordField({ value, onChange, onEnter, placeholder, autoFocus }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        inputMode="text"
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        style={{ textAlign: 'center', fontSize: 16, paddingRight: 44 }}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: 6,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          color: '#1A2736',
          display: 'inline-flex',
        }}
      >
        <EyeIcon off={show} />
      </button>
    </div>
  )
}

function EyeIcon({ off }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  )
}

// Full-bleed navy gradient, centered logo + tagline, bottom CTA block.
//  - mode 'sso'      → live deploy: only "Sign in with Microsoft" (Entra).
//  - mode 'passcode' → live deploy: a shared team passcode.
//  - mode 'demo'     → no backend: pick any employee (viewer) or sign in as
//                      an auditor with the team passcode.
export default function Login({ source, onEnter, mode = 'demo' }) {
  const sso = mode === 'sso'
  const passcode = mode === 'passcode'
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  // demo: auditor sign-in
  const auditors = EMPLOYEES.filter((e) => e.canAudit)
  const [authOpen, setAuthOpen] = useState(false)
  const [auditorName, setAuditorName] = useState(auditors[0]?.name || '')
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')

  const enterPasscode = async () => {
    if (!code || busy) return
    setBusy(true)
    setErr('')
    const ok = await submitPasscode(code)
    if (ok) window.location.reload() // re-bootstraps as the signed-in user
    else {
      setErr('Incorrect passcode. Try again.')
      setBusy(false)
    }
  }

  const enterAsAuditor = () => {
    if (pw.trim().toLowerCase() !== AUDITOR_PASSCODE) {
      setPwErr('Incorrect passcode. Ask your team lead.')
      return
    }
    const emp = auditors.find((e) => e.name === auditorName) || auditors[0]
    onEnter(makeUser(emp, 'auditor'))
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #243549 0%, #1A2736 55%, #141e2b 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top,0px) + 48px) 26px calc(env(safe-area-inset-bottom,0px) + 30px)',
      }}
    >
      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: 18,
            background: 'var(--red)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 40,
            fontWeight: 700,
            boxShadow: '0 10px 30px rgba(213,23,42,.45)',
          }}
        >
          A
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 18 }}>Facility Compliance</div>
        <div style={{ color: '#9FB0C4', marginTop: 6, fontSize: 13.5, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
          Track facility compliance status, open gaps, due dates, owners, and audit readiness.
        </div>
      </div>

      <div style={{ width: '100%' }}>
        {passcode ? (
          <>
            <PasswordField value={code} onChange={setCode} onEnter={enterPasscode} placeholder="Team passcode" autoFocus />
            {err && <div style={{ color: '#ff9aa6', fontSize: 12.5, textAlign: 'center', margin: '10px 0' }}>{err}</div>}
            <button className="btn btn-primary" disabled={busy || !code} onClick={enterPasscode} style={{ marginTop: 10 }}>
              {busy ? 'Checking…' : 'Enter'}
            </button>
            <div style={{ color: '#6E8198', fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
              Enter your team passcode. Auditor and viewer access use different passcodes — ask your team lead.
            </div>
          </>
        ) : sso ? (
          <>
            <button
              className="btn"
              style={{ background: '#fff', color: '#1A2736' }}
              onClick={() => (window.location.href = authLoginUrl)}
            >
              <IconMicrosoft size={18} />
              Sign in with Microsoft
            </button>
            <div style={{ color: '#6E8198', fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
              Use your Athens Microsoft account.<br />Your access level (auditor / viewer) is set by IT.
            </div>
          </>
        ) : (
          // ---- demo: employee roster (viewer) + auditor passcode ----
          <>
            <div style={{ color: '#6E8198', fontSize: 11, fontWeight: 700, textAlign: 'center', letterSpacing: '.6px', marginBottom: 10 }}>
              TAP YOUR NAME TO VIEW
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {EMPLOYEES.map((emp) => (
                <button
                  key={emp.name}
                  onClick={() => onEnter(makeUser(emp, 'viewer'))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    background: 'rgba(255,255,255,.07)',
                    border: '1px solid rgba(255,255,255,.14)',
                    borderRadius: 12,
                    padding: '9px 10px',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center', fontSize: 11.5, fontWeight: 700, flex: '0 0 auto' }}>
                    {emp.initials}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</span>
                    <span style={{ fontSize: 10.5, color: '#9FB0C4' }}>{emp.dept}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* auditor sign-in (password required) */}
            <div style={{ marginTop: 16 }}>
              {!authOpen ? (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="btn"
                  style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.14)', color: '#fff' }}
                >
                  Sign in as auditor (edit access)
                </button>
              ) : (
                <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, padding: 14 }}>
                  <div style={{ color: '#9FB0C4', fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>AUDITOR SIGN-IN</div>
                  <select
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    className="input"
                    style={{ marginBottom: 10, fontSize: 15 }}
                  >
                    {auditors.map((e) => (
                      <option key={e.name} value={e.name}>
                        {e.name} · {e.dept}
                      </option>
                    ))}
                  </select>
                  <PasswordField value={pw} onChange={(v) => { setPw(v); setPwErr('') }} onEnter={enterAsAuditor} placeholder="Auditor passcode" autoFocus />
                  {pwErr && <div style={{ color: '#ff9aa6', fontSize: 12.5, textAlign: 'center', margin: '10px 0 0' }}>{pwErr}</div>}
                  <button className="btn btn-primary" onClick={enterAsAuditor} disabled={!pw} style={{ marginTop: 10 }}>
                    Sign in as auditor
                  </button>
                  <div style={{ color: '#6E8198', fontSize: 11, textAlign: 'center', marginTop: 8 }}>Demo passcode: athens</div>
                </div>
              )}
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 24,
            color: '#6E8198',
            fontSize: 11.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          Athens Services · v0.4 POC
          <span className={`dot ${source === 'postgres' ? 'dot-pg' : 'dot-local'}`} />
        </div>
      </div>
    </div>
  )
}
