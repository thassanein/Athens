import { IconMicrosoft } from '../components/Icons.jsx'
import { authLoginUrl } from '../lib/api.js'

// Full-bleed navy gradient, centered logo + tagline, bottom CTA block.
//  - mode 'sso'  → live deploy: only "Sign in with Microsoft" (Entra).
//  - mode 'demo' → no backend (e.g. GitHub Pages): the two demo logins.
export default function Login({ source, onEnter, mode = 'demo' }) {
  const sso = mode === 'sso'
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
        <div style={{ color: '#9FB0C4', marginTop: 8, fontSize: 14.5, textAlign: 'center', maxWidth: 280 }}>
          Permits, leases & inspection findings across the Athens portfolio.
        </div>
      </div>

      <div style={{ width: '100%' }}>
        <button
          className="btn"
          style={{ background: '#fff', color: '#1A2736' }}
          onClick={() => (sso ? (window.location.href = authLoginUrl) : onEnter('auditor'))}
        >
          <IconMicrosoft size={18} />
          Sign in with Microsoft
        </button>

        {sso ? (
          <div style={{ color: '#6E8198', fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
            Use your Athens Microsoft account.<br />Your access level (auditor / viewer) is set by IT.
          </div>
        ) : (
          <>
            <div style={{ color: '#6E8198', fontSize: 11, fontWeight: 700, textAlign: 'center', letterSpacing: '.6px', margin: '20px 0 10px' }}>
              OR CONTINUE AS · DEMO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => onEnter('auditor')}
                style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, padding: '12px 8px', color: '#fff', textAlign: 'center' }}
              >
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>Auditor</div>
                <div style={{ fontSize: 11, color: '#9FB0C4', marginTop: 3 }}>Dave Marin · can edit</div>
              </button>
              <button
                onClick={() => onEnter('viewer')}
                style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, padding: '12px 8px', color: '#fff', textAlign: 'center' }}
              >
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>Viewer</div>
                <div style={{ fontSize: 11, color: '#9FB0C4', marginTop: 3 }}>Read-only</div>
              </button>
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 30,
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
