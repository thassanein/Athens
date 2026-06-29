// Open, credential-free sign-in. Two roles only:
//   - Auditor → can edit findings, run audits, verify permits.
//   - Viewer  → read-only.
// No passwords / passcodes / SSO — the app and its API are public so other
// apps and AI tools can reach it.
const USERS = {
  auditor: { name: 'Dave Marin', role: 'auditor', title: 'Field Auditor · EHS', initials: 'DM' },
  viewer: { name: 'Site Viewer', role: 'viewer', title: 'Read-only', initials: 'SV' },
}

export default function Login({ source, onEnter }) {
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
        padding: 'calc(env(safe-area-inset-top,0px) + 64px) 26px calc(env(safe-area-inset-bottom,0px) + 30px)',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 78,
            height: 78,
            borderRadius: 18,
            background: 'var(--red)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 44,
            fontWeight: 700,
            boxShadow: '0 10px 30px rgba(213,23,42,.45)',
          }}
        >
          A
        </div>
        <div style={{ fontSize: 25, fontWeight: 700, marginTop: 22 }}>Facility Compliance</div>
        <div style={{ color: '#9FB0C4', marginTop: 8, fontSize: 13.5, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
          Track facility compliance status, open gaps, due dates, owners, and audit readiness.
        </div>
      </div>

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

        <div
          style={{
            marginTop: 28,
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
