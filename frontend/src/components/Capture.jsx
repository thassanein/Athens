import { useState, useEffect, useRef } from 'react'
import { AREAS } from '../lib/derive.js'
import { IconClose, IconCamera, IconCheck } from './Icons.jsx'

// Capture bottom sheet — log a new finding from the field.
// Slides up (transform-based) over a dimmed backdrop. Tap backdrop or ✕ to
// dismiss. On save → status:open, source:field, appears in Tasks/Alerts/Record.
export default function Capture({ draft, setDraft, sites, cameraDefault, onClose, onSave }) {
  const [closing, setClosing] = useState(false)
  const fileRef = useRef(null)

  const set = (patch) => setDraft({ ...draft, ...patch })

  // Animate out, then unmount.
  const dismiss = () => {
    setClosing(true)
    setTimeout(onClose, 260)
  }

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && dismiss()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set({ photo: reader.result })
    reader.readAsDataURL(file)
  }

  const canSave = draft.site && draft.area && draft.note.trim().length > 2

  const submit = () => {
    if (!canSave) return
    onSave(draft) // parent handles toast + close
  }

  return (
    <>
      <div className="backdrop" onClick={dismiss} />
      <div className={`sheet ${closing ? 'closing' : ''}`} role="dialog" aria-label="Log finding">
        <div className="sheet-grip" />
        <div className="row spread" style={{ marginBottom: 6 }}>
          <div className="title">Log finding</div>
          <button onClick={dismiss} aria-label="Close" className="muted">
            <IconClose />
          </button>
        </div>

        <label className="field">
          <span className="label">Site</span>
          <select className="select" value={draft.site} onChange={(e) => set({ site: e.target.value })}>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span className="label">Checklist</span>
          <div className="segmented">
            <button className={draft.dept === 'ENV' ? 'active' : ''} onClick={() => set({ dept: 'ENV' })}>
              ENV
            </button>
            <button className={draft.dept === 'Facility' ? 'active' : ''} onClick={() => set({ dept: 'Facility' })}>
              Facility
            </button>
          </div>
        </div>

        <label className="field">
          <span className="label">Area</span>
          <select className="select" value={draft.area} onChange={(e) => set({ area: e.target.value })}>
            <option value="">Select area…</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">What's wrong</span>
          <textarea
            className="textarea"
            placeholder="Describe the finding…"
            value={draft.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </label>

        <div className="row gap" style={{ alignItems: 'flex-start' }}>
          <label className="field" style={{ flex: 1 }}>
            <span className="label">Owner</span>
            <input
              className="input"
              placeholder="Unassigned"
              value={draft.owner}
              onChange={(e) => set({ owner: e.target.value })}
            />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span className="label">Due</span>
            <input type="date" className="input" value={draft.due} onChange={(e) => set({ due: e.target.value })} />
          </label>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture={cameraDefault ? 'environment' : undefined}
          onChange={onPhoto}
          style={{ display: 'none' }}
        />
        <button className="btn btn-light" style={{ marginBottom: 14 }} onClick={() => fileRef.current?.click()}>
          <IconCamera />
          {draft.photo ? 'Photo attached — retake' : 'Add photo evidence'}
        </button>

        {draft.photo && (
          <img
            src={draft.photo}
            alt="Evidence"
            style={{ width: '100%', borderRadius: 12, marginBottom: 14, display: 'block' }}
          />
        )}

        <button className="btn btn-primary" disabled={!canSave} onClick={submit}>
          <IconCheck size={18} />
          Log finding
        </button>
      </div>
    </>
  )
}
