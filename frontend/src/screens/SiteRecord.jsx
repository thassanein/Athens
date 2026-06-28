import { useState, useRef, useEffect } from 'react'
import {
  siteStats,
  daysUntil,
  fmtDate,
  fmtShort,
  isOpenWork,
  FINDING_LABEL,
  PERMIT_LABEL,
} from '../lib/derive.js'
import {
  IconBack,
  IconExport,
  IconChevron,
  IconCamera,
  IconLeaf,
  IconDoc,
  IconPin,
} from '../components/Icons.jsx'

// Scaled site-plan zone layout (viewBox 360×300). Each of the eight areas is a
// rectangle in a plausible yard layout; pins drop onto a zone's centroid.
const ZONES = {
  'Compost/Working': { x: 24, y: 30, w: 150, h: 92, label: 'Compost / Working' },
  'Ponds/Stormwater': { x: 196, y: 30, w: 140, h: 72, label: 'Ponds / Stormwater' },
  'HazMat Storage': { x: 24, y: 138, w: 84, h: 86, label: 'HazMat' },
  Processing: { x: 122, y: 138, w: 116, h: 86, label: 'Processing' },
  'Maint. Shop': { x: 252, y: 120, w: 84, h: 60, label: 'Maint. Shop' },
  'Fuel/CNG': { x: 252, y: 196, w: 84, h: 72, label: 'Fuel / CNG' },
  Admin: { x: 24, y: 240, w: 96, h: 40, label: 'Admin' },
  'Scale/Entrance': { x: 134, y: 240, w: 104, h: 40, label: 'Scale / Entrance' },
}
// Pin anchor: horizontally centered, biased toward the lower part of the zone
// so pins clear the top-left zone label (esp. in short zones like Scale/Admin).
const centroid = (area) => {
  const z = ZONES[area]
  if (!z) return { x: 180, y: 150 }
  const y = z.h <= 50 ? z.y + z.h - 13 : z.y + z.h * 0.58
  return { x: z.x + z.w / 2, y }
}

const RAG_HEX = { active: '#1A5632', renew: '#B7791F', verify: '#D5172A' }
const FIND_HEX = { pass: '#1A5632', fail: '#D5172A', open: '#B7791F', na: '#939598' }

const STYLES = {
  plan: { bg: '#F4F6F9', zone: '#E7ECF2', zoneStroke: '#D2DAE4', text: '#46566B', line: '#D2DAE4' },
  blueprint: { bg: '#13233B', zone: 'rgba(120,190,255,.08)', zoneStroke: '#3E72A8', text: '#9FD0FF', line: '#2E5A86' },
  terrain: { bg: '#EAE5DA', zone: '#DCE3D4', zoneStroke: '#C3CDB6', text: '#5A5340', line: '#C7CEB8' },
}

// ----------------------------------------------------------------------------
function tone(status) {
  if (status === 'fail' || status === 'verify') return 'fail'
  if (status === 'open' || status === 'renew') return 'open'
  if (status === 'pass' || status === 'active') return 'pass'
  return 'na'
}

function CompletionRing({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 100
  return (
    <div className="ring light" style={{ '--pct': pct, '--size': '46px' }}>
      <span style={{ fontSize: 11 }}>{pct}%</span>
    </div>
  )
}

// Expandable finding card. Collapsed shows title + status. Expanded:
//  - Auditors (canEdit) get editable comment, photo evidence, owner, due, and
//    the action-driving status pills.
//  - Viewers get a read-only view of the same information.
function FindingCard({ c, defaultOpen, canEdit, onChange }) {
  const [open, setOpen] = useState(defaultOpen || false)
  const [note, setNote] = useState(c.note || '')
  const [owner, setOwner] = useState(c.owner || '')
  const fileRef = useRef(null)
  const t = tone(c.status)

  // keep local edits in sync if the finding changes underneath us
  useEffect(() => {
    setNote(c.note || '')
    setOwner(c.owner || '')
  }, [c.id, c.note, c.owner])

  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange({ photo: reader.result })
    reader.readAsDataURL(file)
  }

  return (
    <div className={`card lrow bd-${t}`} style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', textAlign: 'left', padding: '12px 14px', display: 'block' }}
      >
        <div className="row spread" style={{ marginBottom: 5 }}>
          <span className="label" style={{ color: c.dept === 'ENV' ? 'var(--green)' : 'var(--blue)' }}>
            {c.dept} · {c.area}
          </span>
          <span className={`pill bg-${t} s-${t}`} style={{ fontSize: 10.5 }}>
            {FINDING_LABEL[c.status]}
          </span>
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{c.title}</div>
        <div className="row spread" style={{ marginTop: 5 }}>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {c.owner || 'Unassigned'}
            {c.source === 'field' && ' · field'}
          </span>
          <span className="muted" style={{ fontSize: 12 }}>
            {c.due ? `Due ${fmtShort(c.due)}` : 'No due date'}
          </span>
        </div>
      </button>

      {open && !canEdit && (
        // ---- Viewer: read-only ----
        <div style={{ padding: '0 14px 14px' }}>
          {c.note ? (
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 10, color: '#36465a' }}>
              {c.note}
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>No comment recorded.</div>
          )}
          {c.photo && (
            <img src={c.photo} alt="Evidence" style={{ width: '100%', borderRadius: 10, marginBottom: 10, display: 'block' }} />
          )}
          <span className="label" style={{ color: 'var(--grey)' }}>Read-only · viewer</span>
        </div>
      )}

      {open && canEdit && (
        // ---- Auditor: editable ----
        <div style={{ padding: '0 14px 14px' }}>
          <div className="label" style={{ marginBottom: 6 }}>Comment</div>
          <textarea
            className="textarea"
            style={{ minHeight: 60, marginBottom: 12 }}
            placeholder="Add the auditor's comment…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (c.note || '') && onChange({ note })}
          />

          {c.photo && (
            <img src={c.photo} alt="Evidence" style={{ width: '100%', borderRadius: 10, marginBottom: 10, display: 'block' }} />
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPhoto} style={{ display: 'none' }} />
          <button className="btn btn-light" style={{ marginBottom: 12 }} onClick={() => fileRef.current?.click()}>
            <IconCamera /> {c.photo ? 'Replace photo' : 'Add photo evidence'}
          </button>

          <div className="row gap" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
            <label className="field" style={{ flex: 1, marginBottom: 0 }}>
              <span className="label" style={{ display: 'block', marginBottom: 6 }}>Owner</span>
              <input
                className="input"
                placeholder="Unassigned"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                onBlur={() => owner !== (c.owner || '') && onChange({ owner: owner || null })}
              />
            </label>
            <label className="field" style={{ flex: 1, marginBottom: 0 }}>
              <span className="label" style={{ display: 'block', marginBottom: 6 }}>Due</span>
              <input
                type="date"
                className="input"
                value={c.due || ''}
                onChange={(e) => onChange({ due: e.target.value || null })}
              />
            </label>
          </div>

          <div className="label" style={{ marginBottom: 6 }}>Set status</div>
          <div className="row gap" style={{ flexWrap: 'wrap' }}>
            {['pass', 'open', 'fail', 'na'].map((s) => (
              <button
                key={s}
                onClick={() => onChange({ status: s })}
                className={`pill bg-${tone(s)} s-${tone(s)}`}
                style={{
                  fontSize: 11.5,
                  border: c.status === s ? '2px solid currentColor' : '2px solid transparent',
                  opacity: c.status === s ? 1 : 0.72,
                }}
              >
                {FINDING_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
function SitePlan({ site, styleKey, selected, onSelect }) {
  const S = STYLES[styleKey]
  const W = 360,
    H = 300
  const permits = site.permits || []
  const findings = (site.checklist || []).filter(isOpenWork)

  // group pins per zone to fan them out
  const byZonePermit = {}
  permits.forEach((p) => ((byZonePermit[p.area] ||= []).push(p)))
  const byZoneFind = {}
  findings.forEach((f) => ((byZoneFind[f.area] ||= []).push(f)))

  const fan = (center, i, n) => {
    if (n <= 1) return center
    const spread = Math.min(18, 8 + n * 2)
    return { x: center.x + (i - (n - 1) / 2) * spread, y: center.y }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <rect width={W} height={H} fill={S.bg} />
      {styleKey === 'blueprint' &&
        Array.from({ length: 19 }).map((_, i) => (
          <g key={i} stroke="rgba(120,190,255,.10)" strokeWidth="1">
            <line x1={i * 20} y1="0" x2={i * 20} y2={H} />
            <line x1="0" y1={i * 16} x2={W} y2={i * 16} />
          </g>
        ))}
      {/* zones */}
      {Object.entries(ZONES).map(([area, z]) => {
        const isSel = selected === area
        return (
          <g key={area} onClick={() => onSelect(isSel ? null : area)} style={{ cursor: 'pointer' }}>
            <rect
              x={z.x}
              y={z.y}
              width={z.w}
              height={z.h}
              rx="8"
              fill={isSel ? 'rgba(213,23,42,.10)' : S.zone}
              stroke={isSel ? 'var(--red)' : S.zoneStroke}
              strokeWidth={isSel ? 2 : 1.25}
            />
            <text x={z.x + 8} y={z.y + 16} fontSize="9.5" fontWeight="700" fill={S.text}>
              {z.label}
            </text>
          </g>
        )
      })}
      {/* permit pins (round, RAG) */}
      {Object.entries(byZonePermit).flatMap(([area, list]) =>
        list.map((p, i) => {
          const c = fan(centroid(area), i, list.length)
          return (
            <g key={p.id} onClick={() => onSelect(area)} style={{ cursor: 'pointer' }}>
              <circle cx={c.x} cy={c.y - 6} r="7" fill="#fff" stroke={RAG_HEX[p.status]} strokeWidth="2.5" />
              <circle cx={c.x} cy={c.y - 6} r="3" fill={RAG_HEX[p.status]} />
            </g>
          )
        })
      )}
      {/* finding pins (rounded square) */}
      {Object.entries(byZoneFind).flatMap(([area, list]) =>
        list.map((f, i) => {
          const c = fan(centroid(area), i, list.length)
          return (
            <rect
              key={f.id}
              x={c.x - 5}
              y={c.y + 6}
              width="10"
              height="10"
              rx="3"
              fill={FIND_HEX[f.status]}
              stroke="#fff"
              strokeWidth="1.5"
              onClick={() => onSelect(area)}
              style={{ cursor: 'pointer' }}
            />
          )
        })
      )}
    </svg>
  )
}

// ----------------------------------------------------------------------------
function RenewalTimeline({ site }) {
  const items = []
  for (const p of site.permits || []) {
    const d = daysUntil(p.expires)
    if (p.status === 'verify') items.push({ ...p, kind: 'permit', d, overdue: true })
    else if (d <= 90) items.push({ ...p, kind: 'permit', d, overdue: d < 0 })
  }
  for (const l of site.leases || []) {
    const d = daysUntil(l.expires)
    if (l.status === 'renew' || d <= 90) items.push({ ...l, kind: 'lease', d, overdue: d < 0 })
  }
  const upcoming = items.filter((i) => !i.overdue).sort((a, b) => a.d - b.d)
  const overdue = items.filter((i) => i.overdue)

  return (
    <div className="card" style={{ padding: '12px 14px' }}>
      <div className="row spread" style={{ marginBottom: 10 }}>
        <span className="label">Next 90 days</span>
        <span className="muted" style={{ fontSize: 11.5 }}>
          renewals read as routine
        </span>
      </div>
      {/* axis */}
      <div style={{ position: 'relative', height: 38, marginBottom: upcoming.length ? 2 : 0 }}>
        <div style={{ position: 'absolute', top: 16, left: 0, right: 0, height: 3, background: 'var(--card-border)', borderRadius: 2 }} />
        {upcoming.map((it) => {
          const pct = Math.max(2, Math.min(98, (Math.max(it.d, 0) / 90) * 100))
          return (
            <div
              key={it.id}
              title={`${it.name} · ${fmtShort(it.expires)}`}
              style={{ position: 'absolute', left: `${pct}%`, top: 6, transform: 'translateX(-50%)', textAlign: 'center' }}
            >
              <div className={`dot dot-${it.status === 'renew' ? 'local' : 'pg'}`} style={{ width: 12, height: 12, border: '2px solid #fff', boxShadow: '0 0 0 1px var(--card-border)' }} />
              <div style={{ fontSize: 9, fontWeight: 700, marginTop: 3, color: 'var(--amber)' }}>{it.d}d</div>
            </div>
          )
        })}
        {upcoming.length === 0 && (
          <div className="muted" style={{ position: 'absolute', top: 24, fontSize: 12 }}>
            No renewals in the next 90 days.
          </div>
        )}
      </div>
      {overdue.length > 0 && (
        <div style={{ borderTop: '1px solid var(--card-border)', marginTop: 8, paddingTop: 8 }}>
          <span className="label s-fail">Overdue / unconfirmed</span>
          {overdue.map((it) => (
            <div key={it.id} className="row spread" style={{ marginTop: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{it.name}</span>
              <span className="pill bg-fail s-fail" style={{ fontSize: 10 }}>
                Verify
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
const TABS = [
  { id: 'findings', label: 'Findings' },
  { id: 'permits', label: 'Permits' },
  { id: 'documents', label: 'Docs' },
  { id: 'leases', label: 'Leases' },
  { id: 'facility', label: 'Facility' },
  { id: 'env', label: 'ENV' },
]

// Tappable read-only card for permits & leases (no field entry per the brief —
// taps just expand a detail panel). When `docUrl` is set, the expanded panel
// shows a "View document" link that opens the source file/folder in SharePoint.
function ReadOnlyCard({ toneKey, area, label, title, subtitle, rows, docUrl }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`card lrow bd-${toneKey}`}
      role="button"
      tabIndex={0}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen((o) => !o))}
      style={{ padding: '12px 14px', width: '100%', textAlign: 'left', display: 'block', cursor: 'pointer' }}
    >
      <div className="row spread">
        <span className="label" style={{ color: 'var(--grey)' }}>{area}</span>
        <span className={`pill bg-${toneKey} s-${toneKey}`} style={{ fontSize: 10.5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 4 }}>{title}</div>
      {subtitle && <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>{subtitle}</div>}
      {open && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--card-border)', paddingTop: 8 }}>
          {rows.map((r) => (
            <div key={r.k} className="row spread" style={{ padding: '3px 0' }}>
              <span className="label" style={{ color: 'var(--grey)' }}>{r.k}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>{r.v}</span>
            </div>
          ))}
          {docUrl && (
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="pill"
              style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--navy)', color: '#fff', textDecoration: 'none' }}
            >
              <IconDoc size={14} /> View document
            </a>
          )}
        </div>
      )}
      <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{open ? 'Tap to collapse' : 'Tap for details'}</div>
    </div>
  )
}

export default function SiteRecord({
  name,
  site,
  initialTab,
  focusId,
  canEdit = false,
  onClose,
  onUpdateFinding,
  onCapture,
  flash,
}) {
  const [tab, setTab] = useState(initialTab || 'findings')
  const [mapStyle, setMapStyle] = useState('plan')
  const [zone, setZone] = useState(null)
  const focusRef = useRef(null)

  // scroll to top on open
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const s = siteStats(site)
  const checklist = site.checklist || []
  const change = (id, patch) => {
    onUpdateFinding(name, id, patch)
    if (patch.status === 'pass') flash('Finding cleared')
    else if ('status' in patch) flash('Status updated')
    else if ('photo' in patch) flash('Photo attached')
    else flash('Saved')
  }

  // tab datasets
  const findings = checklist.filter(isOpenWork)
  const facility = checklist.filter((c) => c.dept === 'Facility')
  const env = checklist.filter((c) => c.dept === 'ENV')
  const zoneItems = zone
    ? {
        permits: (site.permits || []).filter((p) => p.area === zone),
        findings: checklist.filter((c) => c.area === zone && isOpenWork(c)),
      }
    : null

  // per-area permit rollup
  const areaRollup = {}
  for (const p of site.permits || []) {
    const a = (areaRollup[p.area] ||= { active: 0, renew: 0, verify: 0 })
    a[p.status] += 1
  }

  const ringDone = (list) => list.filter((c) => c.status === 'pass').length
  const ringTotal = (list) => list.filter((c) => c.status !== 'na').length

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 'var(--app-w)',
        background: 'var(--bg)',
        zIndex: 80,
        overflowY: 'auto',
      }}
    >
      {/* header */}
      <div className="header" style={{ position: 'sticky', top: 0, zIndex: 5 }}>
        <div className="row spread">
          <button onClick={onClose} aria-label="Back" style={{ color: '#fff', marginLeft: -6 }}>
            <IconBack />
          </button>
          <div className="row gap" style={{ gap: 8 }}>
            <span
              className="pill"
              style={{
                background: canEdit ? 'rgba(26,86,50,.5)' : 'rgba(255,255,255,.12)',
                color: canEdit ? '#9be8b6' : '#9FB0C4',
                fontSize: 10.5,
              }}
            >
              {canEdit ? 'Auditor · editing' : 'View only'}
            </span>
            <button onClick={() => flash('Audit packet exported (PDF)')} className="pill" style={{ background: 'rgba(255,255,255,.12)', color: '#fff' }}>
              <IconExport size={15} />
              Site packet
            </button>
          </div>
        </div>
        <div className="title" style={{ marginTop: 8 }}>
          {name}
          {site.anchor && (
            <span className="pill" style={{ background: 'rgba(255,255,255,.14)', color: '#9FD0FF', fontSize: 10, marginLeft: 8, verticalAlign: 'middle' }}>
              Anchor
            </span>
          )}
        </div>
        <div style={{ color: '#9FB0C4', fontSize: 12.5, marginTop: 3 }}>
          {site.type} · {site.city}{site.swis ? ` · SWIS ${site.swis}` : ''}
        </div>
        <div className="row gap" style={{ marginTop: 12 }}>
          <span className="pill bg-fail s-fail">{s.open} open</span>
          {s.verify > 0 && <span className="pill bg-fail s-fail">{s.verify} verify</span>}
          {s.renew > 0 && <span className="pill bg-open s-open">{s.renew} renewing</span>}
        </div>
        {(site.siteMap || site.folder) && (
          <div className="row gap" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            {site.siteMap && (
              <a
                href={site.siteMap}
                target="_blank"
                rel="noopener noreferrer"
                className="pill"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.14)', color: '#fff', textDecoration: 'none' }}
              >
                <IconPin size={14} /> Site map
              </a>
            )}
            {site.folder && (
              <a
                href={site.folder}
                target="_blank"
                rel="noopener noreferrer"
                className="pill"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.14)', color: '#fff', textDecoration: 'none' }}
              >
                <IconDoc size={14} /> Documents
              </a>
            )}
          </div>
        )}
      </div>

      {/* map-led site plan */}
      <div className="pad">
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ aspectRatio: '360 / 300' }}>
            <SitePlan site={site} styleKey={mapStyle} selected={zone} onSelect={setZone} />
          </div>
          {/* mapStyle selector */}
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 5 }}>
            {['plan', 'blueprint', 'terrain'].map((m) => (
              <button
                key={m}
                onClick={() => setMapStyle(m)}
                className="pill"
                style={{
                  fontSize: 10,
                  textTransform: 'capitalize',
                  background: mapStyle === m ? 'var(--navy)' : 'rgba(255,255,255,.92)',
                  color: mapStyle === m ? '#fff' : 'var(--navy)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* selected-zone obligations panel */}
        {zoneItems && (
          <div className="card" style={{ marginTop: 12, padding: '12px 14px' }}>
            <div className="row spread" style={{ marginBottom: 8 }}>
              <span className="h2" style={{ fontSize: 15 }}>
                {ZONES[zone]?.label || zone}
              </span>
              <button className="label" onClick={() => onCapture(zone)} style={{ color: 'var(--blue)' }}>
                + Log here
              </button>
            </div>
            {zoneItems.permits.length === 0 && zoneItems.findings.length === 0 && (
              <div className="muted" style={{ fontSize: 12.5 }}>
                No obligations or open findings in this zone.
              </div>
            )}
            {zoneItems.permits.map((p) => (
              <div key={p.id} className="row spread" style={{ padding: '5px 0' }}>
                <span style={{ fontSize: 12.5 }}>
                  <span className={`dot dot-${p.status === 'active' ? 'pg' : 'local'}`} style={{ marginRight: 7 }} />
                  {p.name}
                </span>
                <span className={`s-${tone(p.status)}`} style={{ fontSize: 11.5, fontWeight: 700 }}>
                  {PERMIT_LABEL[p.status]}
                </span>
              </div>
            ))}
            {zoneItems.findings.map((f) => (
              <div key={f.id} className="row spread" style={{ padding: '5px 0' }}>
                <span style={{ fontSize: 12.5 }}>
                  <span className={`dot`} style={{ background: FIND_HEX[f.status], marginRight: 7 }} />
                  {f.title}
                </span>
                <span className={`s-${tone(f.status)}`} style={{ fontSize: 11.5, fontWeight: 700 }}>
                  {FINDING_LABEL[f.status]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* renewal timeline */}
        <div style={{ marginTop: 12 }}>
          <RenewalTimeline site={site} />
        </div>
      </div>

      {/* tabs */}
      <div className="pad" style={{ background: 'var(--bg)', zIndex: 4, paddingTop: 14 }}>
        <div className="chips">
          {TABS.map((t) => (
            <button key={t.id} className={`chip ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pad" style={{ paddingBottom: 40 }}>
        {tab === 'findings' && (
          <div className="stack">
            {findings.length === 0 ? (
              <div className="card" style={{ padding: 24, textAlign: 'center' }} >
                <div className="h2">No open findings</div>
                <div className="muted" style={{ marginTop: 5 }}>This site is clear.</div>
              </div>
            ) : (
              findings.map((c) => (
                <div key={c.id} ref={c.id === focusId ? focusRef : null}>
                  <FindingCard c={c} defaultOpen={c.id === focusId} canEdit={canEdit} onChange={(p) => change(c.id, p)} />
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'permits' && (
          <div className="stack">
            {/* per-area rollup */}
            <div className="card" style={{ padding: '12px 14px' }}>
              <div className="label" style={{ marginBottom: 8 }}>Per-area rollup</div>
              {Object.entries(areaRollup).map(([area, r]) => (
                <div key={area} className="row spread" style={{ padding: '4px 0' }}>
                  <span style={{ fontSize: 12.5 }}>{area}</span>
                  <span className="row gap" style={{ gap: 6 }}>
                    {r.active > 0 && <span className="pill bg-pass s-pass" style={{ fontSize: 10 }}>{r.active} active</span>}
                    {r.renew > 0 && <span className="pill bg-open s-open" style={{ fontSize: 10 }}>{r.renew} renew</span>}
                    {r.verify > 0 && <span className="pill bg-fail s-fail" style={{ fontSize: 10 }}>{r.verify} verify</span>}
                  </span>
                </div>
              ))}
            </div>
            {(site.permits || []).map((p) => (
              <ReadOnlyCard
                key={p.id}
                toneKey={tone(p.status)}
                area={p.area}
                label={PERMIT_LABEL[p.status]}
                title={p.name}
                subtitle={`${p.agency} · ${p.number}`}
                docUrl={p.doc}
                rows={[
                  { k: 'Agency', v: p.agency },
                  { k: 'Number', v: p.number },
                  { k: 'Cycle', v: p.cycle },
                  { k: 'Expires', v: fmtDate(p.expires) },
                ]}
              />
            ))}
            <div className="muted" style={{ fontSize: 11.5, textAlign: 'center', padding: '4px 0' }}>
              Permits are read-only RAG reference — status is payment/cycle-driven, not date-driven.
            </div>
          </div>
        )}

        {tab === 'leases' && (
          <div className="stack">
            {(site.leases || []).length === 0 && (
              <div className="card" style={{ padding: 22, textAlign: 'center' }}><div className="muted">No leases on file.</div></div>
            )}
            {(site.leases || []).map((l) => (
              <ReadOnlyCard
                key={l.id}
                toneKey={tone(l.status)}
                area={l.area}
                label={PERMIT_LABEL[l.status]}
                title={l.name}
                subtitle={`Lessor: ${l.lessor}`}
                rows={[
                  { k: 'Lessor', v: l.lessor },
                  { k: 'Expires', v: fmtDate(l.expires) },
                ]}
              />
            ))}
          </div>
        )}

        {tab === 'documents' && (
          <div className="stack">
            <div className="muted" style={{ fontSize: 12, padding: '2px 2px 4px' }}>
              Document folders open in SharePoint (uses your Microsoft sign-in).
            </div>
            {site.siteMap && (
              <a
                href={site.siteMap}
                target="_blank"
                rel="noopener noreferrer"
                className="card lrow bd-pass"
                style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textDecoration: 'none', color: 'inherit' }}
              >
                <span className="row gap" style={{ alignItems: 'center', gap: 8 }}>
                  <IconPin size={16} />
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>Site map / site plan</span>
                </span>
                <IconChevron size={16} />
              </a>
            )}
            {(site.documents || []).map((d) => (
              <a
                key={d.url}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card lrow"
                style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textDecoration: 'none', color: 'inherit' }}
              >
                <span className="row gap" style={{ alignItems: 'center', gap: 8 }}>
                  <IconDoc size={16} />
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{d.name}</span>
                </span>
                <IconChevron size={16} />
              </a>
            ))}
            {site.folder && (
              <a
                href={site.folder}
                target="_blank"
                rel="noopener noreferrer"
                className="card lrow"
                style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textDecoration: 'none', color: 'inherit' }}
              >
                <span className="row gap" style={{ alignItems: 'center', gap: 8 }}>
                  <IconDoc size={16} />
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>All documents (facility folder)</span>
                </span>
                <IconChevron size={16} />
              </a>
            )}
            {!site.folder && !site.siteMap && (site.documents || []).length === 0 && (
              <div className="card" style={{ padding: 22, textAlign: 'center' }}><div className="muted">No linked documents.</div></div>
            )}
          </div>
        )}

        {(tab === 'facility' || tab === 'env') && (
          <ChecklistTab
            list={tab === 'facility' ? facility : env}
            title={tab === 'facility' ? 'Facility Inspection' : 'ENV Compliance'}
            icon={tab === 'facility' ? <IconDoc /> : <IconLeaf />}
            done={ringDone(tab === 'facility' ? facility : env)}
            total={ringTotal(tab === 'facility' ? facility : env)}
            canEdit={canEdit}
            onChange={change}
            onCapture={() => onCapture('')}
          />
        )}
      </div>
    </div>
  )
}

function ChecklistTab({ list, title, icon, done, total, canEdit, onChange, onCapture }) {
  return (
    <div className="stack">
      <div className="card row spread" style={{ padding: '12px 14px' }}>
        <div className="row gap">
          <span style={{ color: 'var(--navy)' }}>{icon}</span>
          <div>
            <div className="h2" style={{ fontSize: 15 }}>{title}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {done} of {total} passing{canEdit ? ' · tap a card to edit' : ' · read-only'}
            </div>
          </div>
        </div>
        <CompletionRing done={done} total={total} />
      </div>
      {list.length === 0 ? (
        <div className="card" style={{ padding: 22, textAlign: 'center' }}><div className="muted">No items on this checklist.</div></div>
      ) : (
        list.map((c) => <FindingCard key={c.id} c={c} defaultOpen={isOpenWork(c)} canEdit={canEdit} onChange={(p) => onChange(c.id, p)} />)
      )}
      <button className="btn btn-light" onClick={onCapture}>
        <IconCamera /> Log finding on this checklist
      </button>
    </div>
  )
}
