import { useRef } from 'react'
import { IconBack, IconExport } from './Icons.jsx'

// Renders a standalone report HTML document inside the app (via an iframe) with
// a Back button and a Print/Save-PDF action. Replaces window.open(), which on
// an installed iOS PWA opens a detached page with no way back to the app.
export default function ReportOverlay({ html, title = 'Report', onClose }) {
  const ref = useRef(null)
  const print = () => {
    try {
      ref.current?.contentWindow?.focus()
      ref.current?.contentWindow?.print()
    } catch {
      /* ignore */
    }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          background: 'var(--navy)',
          color: '#fff',
          padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 14px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flex: '0 0 auto',
        }}
      >
        <button onClick={onClose} className="pill" style={{ background: 'rgba(255,255,255,.16)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <IconBack size={15} /> Back
        </button>
        <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <button onClick={print} className="pill" style={{ background: '#fff', color: 'var(--navy)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <IconExport size={14} /> Print
        </button>
      </div>
      <iframe ref={ref} title={title} srcDoc={html} style={{ flex: 1, width: '100%', border: 0, background: '#fff' }} />
    </div>
  )
}
