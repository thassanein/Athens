import { useState, useRef, useEffect, useMemo } from 'react'
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
  IconCheck,
} from '../components/Icons.jsx'
import { listAudits, getAudit, deleteAudit } from '../lib/api.js'
import { AUDIT_TEMPLATES, templateItemCount, TYPE_TEMPLATE } from '../lib/audit-templates.js'
import { demoAuditFor } from '../lib/demo-audits.js'
import FacilityMap from './FacilityMap.jsx'

const TPL_NAME = { hauling: 'Hauling Division', mrf: 'MRF Master Form', facility: 'Facility Review', ts: 'Transfer Station', organics: 'American Organics / Compost', landfill: 'Landfill' }
const fmtWhen = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

// Deficiencies (the "No" answers) of a fetched audit detail, with their area.
function auditDeficiencies(audit) {
  if (!audit) return []
  const tpl = AUDIT_TEMPLATES[audit.template]
  if (!tpl) return []
  const out = []
  tpl.sections.forEach((s) =>
    s.items.forEach((it) => {
      const r = audit.responses?.[it.id]
      if (r && r.val === 'no') out.push({ section: s.title, ref: it.ref, text: it.text, note: r.note || '' })
    })
  )
  return out
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Build a standalone, print-ready HTML report and open it for Print / Save-as-PDF.
function openReport(name, site, latestAudit, userName) {
  const now = new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
  const c = site.compliance
  const findings = site.checklist || []
  const defs = auditDeficiencies(latestAudit)
  const permitsAttn = (site.permits || []).filter((p) => p.status !== 'active')

  const compBlock = c
    ? `<div class="kpi ${c.missing ? 'bad' : 'ok'}"><b>${c.missing ? `${c.missing} compliance gap${c.missing > 1 ? 's' : ''}` : 'Compliant'}</b> · ${c.present} of ${c.present + c.missing} required items present${c.note ? ` · <i>${esc(c.note)}</i>` : ''}</div>
       <p>${c.categories.map((x) => `<span class="chip ${x.status === 'missing' ? 'bad' : 'ok'}">${x.status === 'missing' ? '✗' : '✓'} ${esc(x.key)}</span>`).join(' ')}</p>`
    : '<p class="muted">No compliance requirements on file.</p>'

  const auditBlock = latestAudit
    ? `<p><b>${esc(TPL_NAME[latestAudit.template] || latestAudit.template)}</b> · ${esc(latestAudit.status)} · ${fmtWhen(latestAudit.updated)} · by ${esc(latestAudit.auditor || '—')}</p>
       ${defs.length ? `<table><thead><tr><th>Area</th><th>Deficiency</th><th>Note</th></tr></thead><tbody>${defs.map((d) => `<tr><td>${esc(d.section)}</td><td>${esc((d.ref ? d.ref + '. ' : '') + d.text)}</td><td>${esc(d.note)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No deficiencies recorded.</p>'}`
    : '<p class="muted">No completed audit on file.</p>'

  const findingsBlock = findings.length
    ? `<table><thead><tr><th>Area</th><th>Finding</th><th>Status</th><th>Owner</th><th>Due</th></tr></thead><tbody>${findings
        .map((f) => `<tr><td>${esc(f.area)}</td><td>${esc(f.title)}${f.note ? `<br><span class="muted">${esc(f.note)}</span>` : ''}</td><td>${esc(f.status)}</td><td>${esc(f.owner || 'Unassigned')}</td><td>${esc(fmtDate(f.due))}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p class="muted">No findings logged.</p>'

  const permitsBlock = permitsAttn.length
    ? `<table><thead><tr><th>Permit</th><th>Agency</th><th>Number</th><th>Status</th><th>Expires</th></tr></thead><tbody>${permitsAttn
        .map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.agency)}</td><td>${esc(p.number)}</td><td>${esc(p.status)}</td><td>${esc(fmtDate(p.expires))}</td></tr>`)
        .join('')}</tbody></table>`
    : '<p class="muted">All permits active.</p>'

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Report — ${esc(name)}</title>
  <style>
    body{font:14px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1A2736;margin:32px;max-width:900px}
    h1{font-size:22px;margin:0 0 2px} h2{font-size:15px;border-bottom:2px solid #1A2736;padding-bottom:4px;margin:26px 0 10px}
    .sub{color:#667;margin-bottom:4px}.muted{color:#889}
    table{border-collapse:collapse;width:100%;font-size:12.5px} th,td{border:1px solid #d7dde5;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#f2f5f8} .kpi{padding:10px 12px;border-radius:8px;margin:6px 0} .kpi.bad{background:#fdecee;border:1px solid #f3b8bf} .kpi.ok{background:#eaf6ee;border:1px solid #b6e2c5}
    .chip{display:inline-block;border:1px solid #d7dde5;border-radius:20px;padding:2px 9px;margin:2px;font-size:12px} .chip.bad{color:#D5172A;border-color:#f3b8bf} .chip.ok{color:#1A5632;border-color:#b6e2c5}
    .toolbar{position:fixed;top:10px;right:10px} button{font:14px sans-serif;padding:8px 14px;border-radius:8px;border:0;background:#1A2736;color:#fff;cursor:pointer}
    @media print{.toolbar{display:none}}
  </style></head><body>
  <div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div>
  <h1>Facility Compliance Report</h1>
  <div class="sub"><b>${esc(name)}</b> · ${esc(site.type)} · ${esc(site.city)}${site.swis ? ` · SWIS ${esc(site.swis)}` : ''}</div>
  <div class="muted">Generated ${esc(now)}${userName ? ` · by ${esc(userName)}` : ''}</div>
  <h2>Compliance</h2>${compBlock}
  <h2>Latest audit</h2>${auditBlock}
  <h2>Findings (${findings.length})</h2>${findingsBlock}
  <h2>Permits needing attention</h2>${permitsBlock}
  </body></html>`

  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
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
function RenewalTimeline({ site, onOpenItem }) {
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
            <button
              key={it.id}
              title={`${it.name} · ${fmtShort(it.expires)}`}
              onClick={() => onOpenItem?.(it)}
              style={{ position: 'absolute', left: `${pct}%`, top: 6, transform: 'translateX(-50%)', textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div className={`dot dot-${it.status === 'renew' ? 'local' : 'pg'}`} style={{ width: 12, height: 12, border: '2px solid #fff', boxShadow: '0 0 0 1px var(--card-border)' }} />
              <div style={{ fontSize: 9, fontWeight: 700, marginTop: 3, color: 'var(--amber)' }}>{it.d}d</div>
            </button>
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
            <button
              key={it.id}
              onClick={() => onOpenItem?.(it)}
              className="row spread"
              style={{ marginTop: 6, width: '100%', background: 'none', border: 'none', padding: '3px 0', cursor: 'pointer', textAlign: 'left', alignItems: 'center' }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{it.name}</span>
              <span className="pill bg-fail s-fail" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Verify <IconChevron size={12} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
const TABS = [
  { id: 'findings', label: 'Findings' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'permits', label: 'Permits' },
  { id: 'documents', label: 'Docs' },
  { id: 'audits', label: 'Audits' },
  { id: 'reports', label: 'Report' },
  { id: 'leases', label: 'Leases' },
  { id: 'facility', label: 'Facility' },
  { id: 'env', label: 'ENV' },
]

// Tappable read-only card for permits & leases (no field entry per the brief —
// taps just expand a detail panel). When `docUrl` is set, the expanded panel
// shows a "View document" link that opens the source file/folder in SharePoint.
function ReadOnlyCard({ toneKey, area, label, title, subtitle, rows, docUrl, defaultOpen, highlight, onVerify, innerRef }) {
  const [open, setOpen] = useState(!!defaultOpen)
  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])
  return (
    <div
      ref={innerRef}
      className={`card lrow bd-${toneKey}`}
      role="button"
      tabIndex={0}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen((o) => !o))}
      style={{ padding: '12px 14px', width: '100%', textAlign: 'left', display: 'block', cursor: 'pointer', boxShadow: highlight ? '0 0 0 2px var(--navy)' : undefined }}
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
          <div className="row gap" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
            {docUrl && (
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="pill"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--navy)', color: '#fff', textDecoration: 'none' }}
              >
                <IconDoc size={14} /> View document
              </a>
            )}
            {onVerify && (
              <button
                onClick={(e) => { e.stopPropagation(); onVerify() }}
                className="pill"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--green,#2E9E5B)', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                <IconCheck size={14} /> Mark verified
              </button>
            )}
          </div>
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
  source,
  onClose,
  onUpdateFinding,
  onUpdatePermit,
  onCapture,
  onStartAudit,
  auditOpen = false,
  userName,
  flash,
}) {
  const [tab, setTab] = useState(initialTab || 'findings')
  const [audits, setAudits] = useState(null) // null = loading, [] = none (live)
  const [reportAudit, setReportAudit] = useState(null) // latest completed audit detail (for the report)
  const [resultAudit, setResultAudit] = useState(null) // an audit detail to show inline ("results")
  const [resultLoading, setResultLoading] = useState(false)
  const [auditsReload, setAuditsReload] = useState(0) // bump to refetch the audit list
  const [focusItem, setFocusItem] = useState(null) // a permit/lease id to expand + highlight
  const focusRef = useRef(null)
  const tabsRef = useRef(null)
  const permitRef = useRef(null)
  const didMountRef = useRef(false)

  // Bring the tab strip (and the content under it) into view on tab change.
  const scrollToTabs = () => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Open a permit/lease from the map zone panel or the renewal timeline:
  // jump to its tab, expand + highlight it, and scroll it into view.
  const openItem = (it) => {
    setTab(it.kind === 'lease' ? 'leases' : 'permits')
    setFocusItem(it.id)
    scrollToTabs()
    setTimeout(() => permitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 260)
  }
  const verifyPermit = (id) => {
    onUpdatePermit?.(name, id, 'active')
    setFocusItem(null)
  }
  const removeAudit = async (a) => {
    if (!a?.id) return
    if (typeof window !== 'undefined' && !window.confirm(`Delete this audit (${TPL_NAME[a.template] || a.template})? This cannot be undone.`)) return
    try {
      await deleteAudit(a.id)
      flash('Audit deleted')
    } catch {
      flash('Could not delete audit')
    }
    setResultAudit(null)
    setAuditsReload((n) => n + 1)
  }

  const isLive = source === 'postgres'
  // In demo mode (no backend) synthesize one completed audit so last-audit
  // results and the printable report are populated; live mode uses the DB.
  const demoAudit = useMemo(() => (isLive ? null : demoAuditFor(name, site)), [isLive, name, site])
  const effectiveAudits = isLive ? audits : demoAudit ? [demoAudit] : []
  const latestComplete = (effectiveAudits || []).find((a) => a.status === 'complete') || (effectiveAudits || [])[0] || null
  const latestDetail = isLive ? reportAudit : demoAudit

  // Open an audit's full results inline (read-only). Demo audits carry their
  // responses; live audits are fetched on demand.
  const openResult = (a) => {
    if (!a) return
    scrollToTabs()
    if (a.responses) {
      setResultAudit(a)
      return
    }
    setResultLoading(true)
    setResultAudit({ ...a }) // show header immediately
    getAudit(a.id)
      .then((d) => setResultAudit(d))
      .catch(() => {})
      .finally(() => setResultLoading(false))
  }

  // scroll to top on open
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Load this site's saved audits when the Audits tab is opened (live mode).
  useEffect(() => {
    if ((tab !== 'audits' && tab !== 'reports') || source !== 'postgres' || auditOpen) return
    let alive = true
    setAudits(null)
    listAudits({ site: name })
      .then((r) => alive && setAudits(Array.isArray(r) ? r : []))
      .catch(() => alive && setAudits([]))
    return () => {
      alive = false
    }
  }, [tab, source, name, auditOpen, auditsReload])

  // For the report: pull the latest completed audit's full detail (deficiencies).
  useEffect(() => {
    if (tab !== 'reports' || source !== 'postgres') {
      setReportAudit(null)
      return
    }
    let alive = true
    listAudits({ site: name, status: 'complete' })
      .then((list) => (list && list[0] ? getAudit(list[0].id) : null))
      .then((detail) => alive && setReportAudit(detail))
      .catch(() => alive && setReportAudit(null))
    return () => {
      alive = false
    }
  }, [tab, source, name])

  // Close the inline results view when navigating away from the Audits tab,
  // and scroll the content into view on every tab switch (but not first mount).
  useEffect(() => {
    if (tab !== 'audits') setResultAudit(null)
    if (tab !== 'permits' && tab !== 'leases') setFocusItem(null)
    if (didMountRef.current) scrollToTabs()
    else didMountRef.current = true
  }, [tab])

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
      <div className="header" style={{ zIndex: 5 }}>
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
            <button onClick={() => openReport(name, site, latestDetail, userName)} className="pill" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', cursor: 'pointer' }}>
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
        {onStartAudit && (
          <button
            onClick={onStartAudit}
            className="pill"
            style={{ marginTop: 12, width: '100%', padding: '12px', background: '#fff', color: 'var(--navy)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
          >
            <IconCheck size={16} /> Start audit
          </button>
        )}
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

      {/* live, data-driven facility plan (zones = real cert/permit areas) */}
      <div className="pad">
        <FacilityMap
          site={{ ...site, name }}
          type={site.type}
          onCapture={onCapture}
          onOpenPermit={(id) => openItem({ id, kind: 'permit' })}
        />

        {/* renewal timeline */}
        <div style={{ marginTop: 12 }}>
          <RenewalTimeline site={site} onOpenItem={openItem} />
        </div>
      </div>

      {/* tabs (sticky so content is always reachable as you scroll) */}
      <div ref={tabsRef} className="pad" style={{ background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 6, paddingTop: 14, paddingBottom: 6, boxShadow: '0 6px 10px -8px rgba(0,0,0,.25)' }}>
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
                innerRef={p.id === focusItem ? permitRef : null}
                defaultOpen={p.id === focusItem}
                highlight={p.id === focusItem}
                toneKey={tone(p.status)}
                area={p.area}
                label={PERMIT_LABEL[p.status]}
                title={p.name}
                subtitle={`${p.agency} · ${p.number}`}
                docUrl={p.doc}
                onVerify={canEdit && p.status === 'verify' ? () => verifyPermit(p.id) : null}
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

        {tab === 'reports' && (
          <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => openReport(name, site, latestDetail, userName)}
              className="pill"
              style={{ padding: '12px', background: 'var(--navy)', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
            >
              <IconExport size={16} /> Open / print full report
            </button>
            <div className="muted" style={{ fontSize: 12, marginTop: -4 }}>
              Compiles compliance, the latest audit, all findings, and permit status into a printable report (Save as PDF from the print dialog).
            </div>

            {site.compliance && (
              <div className={`card ${site.compliance.missing ? 'bd-fail' : 'bd-pass'}`} style={{ padding: '12px 14px' }}>
                <div className="label" style={{ color: 'var(--grey)' }}>Compliance</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 3 }}>
                  {site.compliance.missing ? `${site.compliance.missing} gap${site.compliance.missing > 1 ? 's' : ''}` : 'Compliant'} · {site.compliance.present} of {site.compliance.present + site.compliance.missing} present
                </div>
              </div>
            )}

            <div className="card" style={{ padding: '12px 14px' }}>
              <div className="label" style={{ color: 'var(--grey)' }}>Latest audit</div>
              {latestDetail ? (
                <div style={{ fontSize: 13.5, marginTop: 3 }}>
                  {TPL_NAME[latestDetail.template] || latestDetail.template} · {fmtWhen(latestDetail.updated)} · {auditDeficiencies(latestDetail).length} deficienc{auditDeficiencies(latestDetail).length === 1 ? 'y' : 'ies'}
                </div>
              ) : (
                <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>No completed audit yet.</div>
              )}
            </div>

            <div className="card" style={{ padding: '12px 14px' }}>
              <div className="label" style={{ color: 'var(--grey)' }}>Contents</div>
              <div style={{ fontSize: 13.5, marginTop: 3 }}>{(site.checklist || []).length} finding{(site.checklist || []).length === 1 ? '' : 's'} · {(site.permits || []).filter((p) => p.status !== 'active').length} permit{(site.permits || []).filter((p) => p.status !== 'active').length === 1 ? '' : 's'} needing attention</div>
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
                innerRef={l.id === focusItem ? permitRef : null}
                defaultOpen={l.id === focusItem}
                highlight={l.id === focusItem}
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

        {tab === 'compliance' && (
          <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!site.compliance ? (
              <div className="card" style={{ padding: 22, textAlign: 'center' }}><div className="muted">No compliance requirements on file for this site.</div></div>
            ) : (
              <>
                {(() => {
                  const c = site.compliance
                  const gaps = c.missing || 0
                  const ok = gaps === 0
                  return (
                    <div className={`card ${ok ? 'bd-pass' : 'bd-fail'}`} style={{ padding: '14px 16px' }}>
                      <div className="row spread" style={{ alignItems: 'center' }}>
                        <div>
                          <div className="stat-num" style={{ color: ok ? 'var(--green,#2E9E5B)' : 'var(--red)', fontSize: 30 }}>{ok ? 'Compliant' : `${gaps} gap${gaps > 1 ? 's' : ''}`}</div>
                          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{c.present} of {c.present + c.missing} required items present</div>
                        </div>
                        <span className={`pill ${ok ? 'bg-pass s-pass' : 'bg-fail s-fail'}`} style={{ fontSize: 12, fontWeight: 700 }}>{ok ? 'PASS' : 'ACTION'}</span>
                      </div>
                      {c.note && <div className="muted" style={{ fontSize: 12.5, marginTop: 8, fontStyle: 'italic' }}>“{c.note}”</div>}
                    </div>
                  )
                })()}
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Core requirement areas</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
                    {[...site.compliance.categories]
                      .sort((a, b) => (a.status === b.status ? 0 : a.status === 'missing' ? -1 : 1))
                      .map((cat) => {
                        const miss = cat.status === 'missing'
                        return (
                          <div key={cat.key} className={`card ${miss ? 'bd-fail' : 'bd-pass'}`} style={{ padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, color: miss ? 'var(--red)' : 'var(--green,#2E9E5B)' }}>{miss ? '✗' : '✓'}</span>
                            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{cat.key}</span>
                          </div>
                        )
                      })}
                  </div>
                </div>
                {/* Open actions: pending findings, who is tasked, on schedule / behind */}
                <div>
                  <div className="label" style={{ marginBottom: 6 }}>Open actions</div>
                  {(() => {
                    const open = (site.checklist || []).filter(isOpenWork)
                    if (open.length === 0) return <div className="card" style={{ padding: 16, textAlign: 'center' }}><div className="muted">No open actions.</div></div>
                    return open
                      .slice()
                      .sort((a, b) => daysUntil(a.due) - daysUntil(b.due))
                      .map((f) => {
                        const behind = f.due && daysUntil(f.due) < 0
                        return (
                          <div key={f.id} className="card" style={{ padding: '10px 13px', marginBottom: 8 }}>
                            <div className="row spread">
                              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{f.title}</span>
                              <span className={`pill ${behind ? 'bg-fail s-fail' : 'bg-open s-open'}`} style={{ fontSize: 10 }}>{behind ? 'Behind' : 'On schedule'}</span>
                            </div>
                            <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                              {f.owner || 'Unassigned'}{f.due ? ` · due ${fmtDate(f.due)}` : ' · no due date'} · {f.area}
                            </div>
                          </div>
                        )
                      })
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'audits' && resultAudit && (
          <AuditResults
            audit={resultAudit}
            loading={resultLoading}
            canEdit={canEdit}
            onBack={() => setResultAudit(null)}
            onResume={onStartAudit && resultAudit.status !== 'complete' ? () => onStartAudit({ openId: resultAudit.id, template: resultAudit.template }) : null}
            onDelete={canEdit && isLive ? () => removeAudit(resultAudit) : null}
          />
        )}

        {tab === 'audits' && !resultAudit && (
          <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {latestComplete && (
              <button
                onClick={() => openResult(latestComplete)}
                className="card bd-pass"
                style={{ padding: '12px 14px', width: '100%', textAlign: 'left', display: 'block', cursor: 'pointer' }}
              >
                <div className="row spread">
                  <span className="label" style={{ color: 'var(--grey)' }}>Last audit result</span>
                  <span className="label" style={{ color: 'var(--blue)' }}>View results →</span>
                </div>
                <div className="row spread" style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{TPL_NAME[latestComplete.template] || latestComplete.template}</span>
                  <span className={`pill ${latestComplete.status === 'complete' ? 'bg-pass s-pass' : 'bg-open s-open'}`} style={{ fontSize: 10 }}>
                    {latestComplete.status === 'complete' ? 'Complete' : 'In progress'}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{fmtWhen(latestComplete.updated)} · {latestComplete.auditor || '—'}</div>
                <div className="row gap" style={{ marginTop: 7, gap: 6 }}>
                  <span className="pill" style={{ fontSize: 10, background: 'rgba(0,0,0,.05)', color: 'var(--navy)' }}>{latestComplete.answered ?? 0}/{templateItemCount(latestComplete.template)} answered</span>
                  <span className={`pill ${latestComplete.deficiencies > 0 ? 'bg-fail s-fail' : 'bg-pass s-pass'}`} style={{ fontSize: 10 }}>{latestComplete.deficiencies || 0} deficienc{latestComplete.deficiencies === 1 ? 'y' : 'ies'}</span>
                </div>
              </button>
            )}
            {onStartAudit && (
              <button
                onClick={() => onStartAudit()}
                className="pill"
                style={{ padding: '12px', background: 'var(--navy)', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
              >
                <IconCheck size={16} /> Start new audit
              </button>
            )}
            {!isLive && (
              <div className="muted" style={{ fontSize: 12.5, padding: '4px 2px' }}>
                Showing a demo audit. In the live app every saved audit appears here.
              </div>
            )}
            {isLive && audits === null && (
              <div className="muted" style={{ fontSize: 13, padding: '8px 2px' }}>Loading audits…</div>
            )}
            {isLive && audits && audits.length === 0 && (
              <div className="card" style={{ padding: 20, textAlign: 'center' }}><div className="muted">No audits yet for this site.</div></div>
            )}
            {isLive &&
              (audits || []).map((a) => {
                const total = templateItemCount(a.template)
                const mismatch = TYPE_TEMPLATE[site.type] && a.template && TYPE_TEMPLATE[site.type] !== a.template
                return (
                  <div key={a.id} className="card lrow" style={{ padding: '12px 14px' }}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => (a.status === 'complete' ? openResult(a) : onStartAudit && onStartAudit({ openId: a.id, template: a.template }))}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="row spread">
                        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{TPL_NAME[a.template] || a.template || 'Audit'}</span>
                        <span className={`pill ${a.status === 'complete' ? 'bg-pass s-pass' : 'bg-open s-open'}`} style={{ fontSize: 10 }}>
                          {a.status === 'complete' ? 'Complete' : 'In progress'}
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {fmtWhen(a.updated)} · {a.auditor || '—'}
                      </div>
                      <div className="row gap" style={{ marginTop: 7, gap: 6, flexWrap: 'wrap' }}>
                        <span className="pill" style={{ fontSize: 10, background: 'rgba(0,0,0,.05)', color: 'var(--navy)' }}>
                          {a.answered ?? 0}/{total} answered
                        </span>
                        {a.deficiencies > 0 && (
                          <span className="pill bg-fail s-fail" style={{ fontSize: 10 }}>
                            {a.deficiencies} deficienc{a.deficiencies > 1 ? 'ies' : 'y'}
                          </span>
                        )}
                        {mismatch && (
                          <span className="pill bg-open s-open" style={{ fontSize: 10 }} title={`This form doesn't match a ${site.type}`}>
                            Wrong form for {site.type}
                          </span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <div style={{ borderTop: '1px solid var(--card-border)', marginTop: 8, paddingTop: 8, textAlign: 'right' }}>
                        <button onClick={() => removeAudit(a)} className="label" style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          Delete audit
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
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

// Read-only results for a single audit: counts + the list of deficiencies.
function AuditResults({ audit, loading, canEdit, onBack, onResume, onDelete }) {
  const total = templateItemCount(audit.template)
  const responses = audit.responses || {}
  const counts = { yes: 0, no: 0, na: 0 }
  for (const r of Object.values(responses)) if (r && r.val) counts[r.val]++
  const answered = counts.yes + counts.no + counts.na
  const defs = auditDeficiencies(audit)
  return (
    <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row spread" style={{ alignItems: 'center' }}>
        <button onClick={onBack} className="label" style={{ color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
          ← Back to audits
        </button>
        {onDelete && (
          <button onClick={onDelete} className="label" style={{ color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Delete audit
          </button>
        )}
      </div>
      <div className="card" style={{ padding: '12px 14px' }}>
        <div className="row spread">
          <span style={{ fontSize: 15.5, fontWeight: 700 }}>{TPL_NAME[audit.template] || audit.template}</span>
          <span className={`pill ${audit.status === 'complete' ? 'bg-pass s-pass' : 'bg-open s-open'}`} style={{ fontSize: 10 }}>
            {audit.status === 'complete' ? 'Complete' : 'In progress'}
          </span>
        </div>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>{fmtWhen(audit.updated)} · {audit.auditor || '—'}</div>
      </div>

      {loading ? (
        <div className="muted" style={{ fontSize: 13, padding: '4px 2px' }}>Loading results…</div>
      ) : (
        <>
          <div className="row gap">
            {[['Yes', counts.yes, 'pass'], ['No', counts.no, 'fail'], ['N/A', counts.na, 'open'], ['Left', Math.max(0, total - answered), '']].map(([l, n, t]) => (
              <div key={l} className="card" style={{ flex: 1, padding: '12px 8px', textAlign: 'center' }}>
                <div className="stat-num" style={{ color: t === 'fail' ? 'var(--red)' : t === 'pass' ? 'var(--green,#2E9E5B)' : t === 'open' ? 'var(--amber)' : 'var(--navy)' }}>{n}</div>
                <div className="label" style={{ marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>

          <div className="label">Deficiencies ({defs.length})</div>
          {defs.length === 0 ? (
            <div className="card" style={{ padding: 18, textAlign: 'center' }}><div className="muted">No “No” answers — site is clear.</div></div>
          ) : (
            defs.map((d, i) => (
              <div key={i} className="card bd-fail" style={{ padding: '11px 14px' }}>
                <div className="label" style={{ color: 'var(--grey)' }}>{d.section}</div>
                <div style={{ fontSize: 13.5, marginTop: 3 }}>{d.ref ? `${d.ref}. ` : ''}{d.text}</div>
                {d.note && <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>“{d.note}”</div>}
              </div>
            ))
          )}

          {onResume && canEdit && (
            <button onClick={onResume} className="pill" style={{ padding: '12px', background: 'var(--navy)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <IconCheck size={16} /> Resume audit
            </button>
          )}
        </>
      )}
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
