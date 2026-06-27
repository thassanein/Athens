import { IconMicrosoft } from '../components/Icons.jsx'

// Full-bleed navy gradient, centered logo + tagline, bottom CTA block.
// Both buttons enter the app. Production: replace with Microsoft Entra SSO.
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
        <div style={{ color: '#9FB0C4', marginTop: 8, fontSize: 14.5, textAlign: 'center', maxWidth: 280 }}>
          Permits, leases & inspection findings across the Athens portfolio.
        </div>
      </div>

      <div style={{ width: '100%' }}>
        <button
          className="btn"
          style={{ background: '#fff', color: '#1A2736' }}
          onClick={onEnter}
        >
          <IconMicrosoft size={18} />
          Sign in with Microsoft
        </button>
        <button
          onClick={onEnter}
          style={{
            display: 'block',
            margin: '18px auto 0',
            color: '#9FB0C4',
            fontSize: 13.5,
            fontWeight: 600,
            background: 'none',
          }}
        >
          Continue as Dave Marin · demo
        </button>

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
