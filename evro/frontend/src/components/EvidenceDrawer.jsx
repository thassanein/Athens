import { useEffect, useRef } from 'react'
import { IconClose } from './Icons.jsx'

// EvidenceDrawer (6D Wave 3) — the drill target for a narrative claim: the
// claim, its headline metric, the deterministic source it came from, and the
// underlying evidence rows. One click deeper than the story, one click short
// of the system screen (the deep-link, when the claim has one). Reuses the
// app's right-drawer idiom; Esc + scrim close; focus moves in on open.
export default function EvidenceDrawer({ claim, onClose, navigate }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!claim) return undefined
    const opener = document.activeElement // restore focus to the trigger on close
    const focusables = () => [...(ref.current?.querySelectorAll('button, [href], a') || [])].filter((el) => !el.disabled)
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab') { // trap focus inside the dialog
        const f = focusables()
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => { window.removeEventListener('keydown', onKey); if (opener && opener.focus) opener.focus() }
  }, [claim, onClose])
  if (!claim) return null

  const go = () => { if (claim.nav) { navigate(claim.nav.page); onClose() } }
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer evd" role="dialog" aria-modal="true" aria-label="Evidence" tabIndex={-1} ref={ref}>
        <div className="evd-head">
          <div>
            <div className="evd-eyebrow">EVIDENCE</div>
            <div className="evd-metric mono">{claim.metric.value}</div>
            <div className="evd-metric-l">{claim.metric.label}</div>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close evidence"><IconClose /></button>
        </div>
        <p className="evd-claim">{claim.text}</p>
        <div className="evd-source"><span className="evd-source-l">SOURCE</span> {claim.source}</div>
        {claim.evidence.length > 0 ? (
          <div className="evd-rows">
            {claim.evidence.map((r, i) => (
              <div key={i} className="evd-row"><span>{r.label}</span><b className="mono">{r.value}</b></div>
            ))}
          </div>
        ) : (
          <div className="evd-empty">No underlying rows — the claim is a clear/zero state.</div>
        )}
        {claim.nav && (
          <button className="btn accent evd-go" onClick={go}>{claim.nav.label || 'Open the source screen'} →</button>
        )}
        <p className="evd-foot">Deterministic · rules-based · traced to the operating record. No language model.</p>
      </aside>
    </>
  )
}
