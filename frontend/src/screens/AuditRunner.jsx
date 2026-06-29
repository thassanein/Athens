import { useState, useEffect, useMemo, useRef } from 'react'
import {
  AUDIT_TEMPLATES,
  templateKeyForType,
  templateItemCount,
} from '../lib/audit-templates.js'
import { listAudits, getAudit, createAudit, saveAudit } from '../lib/api.js'
import { IconBack, IconCheck, IconClose, IconChevron } from '../components/Icons.jsx'

// Full-screen step-by-step audit. Walks the checklist that matches the site's
// type (auditor can switch template), one section per screen. Each item is
// answered Yes / No / N-A with an optional comment.
//
// Persistence: in live (postgres) mode each audit is a row in the `audits`
// table and answers autosave to the server (resumable across devices). A
// localStorage mirror is always kept so an audit survives offline / demo mode.

const VAL = { yes: { label: 'Yes', tone: 'pass' }, no: { label: 'No', tone: 'fail' }, na: { label: 'N/A', tone: 'open' } }
const lsKey = (site, tpl) => `athens.audit.${site}.${tpl}`

function loadResponses(site, tpl) {
  try {
    const raw = localStorage.getItem(lsKey(site, tpl))
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return {}
}

function ItemRow({ item, resp, onSet }) {
  const [showNote, setShowNote] = useState(!!resp?.note)
  return (
    <div className={`card${resp?.val ? ` bd-${VAL[resp.val].tone}` : ''}`} style={{ padding: '12px 14px' }}>
      <div style={{ fontSize: 14, lineHeight: 1.35 }}>
        {item.ref && <b style={{ color: 'var(--grey)', marginRight: 6 }}>{item.ref}</b>}
        {item.text}
      </div>
      <div className="row gap" style={{ marginTop: 10, gap: 7 }}>
        {Object.entries(VAL).map(([k, v]) => {
          const on = resp?.val === k
          return (
            <button
              key={k}
              onClick={() => onSet({ ...resp, val: on ? undefined : k })}
              className={on ? `pill bg-${v.tone} s-${v.tone}` : 'pill'}
              style={{
                flex: 1,
                padding: '8px 0',
                fontWeight: 700,
                border: on ? 'none' : '1px solid var(--card-border)',
                background: on ? undefined : '#fff',
                cursor: 'pointer',
              }}
            >
              {v.label}
            </button>
          )
        })}
      </div>
      {(showNote || resp?.note) && (
        <textarea
          value={resp?.note || ''}
          onChange={(e) => onSet({ ...resp, note: e.target.value })}
          placeholder="Comment / detail…"
          rows={2}
          style={{ marginTop: 8, width: '100%', fontSize: 13, padding: 8, borderRadius: 8, border: '1px solid var(--card-border)', resize: 'vertical', boxSizing: 'border-box' }}
        />
      )}
      {resp?.photo && (
        <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
          <img src={resp.photo} alt="evidence" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8, display: 'block' }} />
          <button
            onClick={() => onSet({ ...resp, photo: null })}
            className="pill"
            style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}
          >
            Remove
          </button>
        </div>
      )}
      <div className="row gap" style={{ marginTop: 7, gap: 14 }}>
        {!(showNote || resp?.note) && (
          <button onClick={() => setShowNote(true)} className="muted" style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            + Add comment
          </button>
        )}
        <label className="muted" style={{ fontSize: 12, cursor: 'pointer' }}>
          {resp?.photo ? '↻ Replace photo' : '📷 Add photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const reader = new FileReader()
              reader.onload = () => onSet({ ...resp, photo: reader.result })
              reader.readAsDataURL(f)
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}

const SYNC_LABEL = { saved: 'Saved', saving: 'Saving…', offline: 'Saved on device', local: 'On device' }

export default function AuditRunner({ name, site, source, openId, openTemplate, onClose, onLogDeficiencies, flash }) {
  const [tplKey, setTplKey] = useState(() => openTemplate || templateKeyForType(site.type))
  const [responses, setResponses] = useState({})
  const [sectionIdx, setSectionIdx] = useState(0)
  const [view, setView] = useState('menu') // 'menu' (area picker) | 'section' | 'review'
  const [sync, setSync] = useState(source === 'postgres' ? 'saving' : 'local')
  const tpl = AUDIT_TEMPLATES[tplKey]
  const total = templateItemCount(tplKey)
  const topRef = useRef(null)

  const aliveRef = useRef(true)
  const auditIdRef = useRef(null)
  const skipSaveRef = useRef(false) // suppress autosave for programmatic loads
  const saveTimer = useRef(null)
  const pendingOpenRef = useRef(openId || null) // a specific past audit to reopen

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      clearTimeout(saveTimer.current)
    }
  }, [])

  // Establish the audit (create or resume) whenever the site/template changes.
  useEffect(() => {
    setSectionIdx(0)
    setView('menu')
    auditIdRef.current = null
    const local = loadResponses(name, tplKey)
    let cancelled = false

    async function ensure() {
      // Reopen a specific past audit (from the site's history list).
      if (pendingOpenRef.current && source === 'postgres') {
        const id = pendingOpenRef.current
        pendingOpenRef.current = null
        setSync('saving')
        try {
          const audit = await getAudit(id)
          if (cancelled || !aliveRef.current) return
          auditIdRef.current = audit.id
          skipSaveRef.current = true
          setResponses(audit.responses || {})
          setSync('saved')
          return
        } catch {
          /* fall through to create/resume by template */
        }
      }
      if (source !== 'postgres') {
        skipSaveRef.current = true
        setResponses(local)
        setSync('local')
        return
      }
      setSync('saving')
      try {
        const open = await listAudits({ site: name, template: tplKey, status: 'in_progress' })
        let audit
        if (open && open.length) audit = await getAudit(open[0].id)
        else audit = await createAudit(name, tplKey)
        if (cancelled || !aliveRef.current) return
        auditIdRef.current = audit.id
        const serverResp = audit.responses || {}
        let resp = serverResp
        if (Object.keys(serverResp).length === 0 && Object.keys(local).length > 0) {
          resp = local // freshly created but we have local answers → push them up
          saveAudit(audit.id, { responses: local }).catch(() => {})
        }
        skipSaveRef.current = true
        setResponses(resp)
        setSync('saved')
      } catch {
        if (cancelled || !aliveRef.current) return
        auditIdRef.current = null
        skipSaveRef.current = true
        setResponses(local)
        setSync('offline')
      }
    }
    ensure()
    return () => {
      cancelled = true
    }
  }, [name, tplKey, source])

  // Mirror to localStorage always; autosave to the server (debounced) in live mode.
  useEffect(() => {
    try {
      localStorage.setItem(lsKey(name, tplKey), JSON.stringify(responses))
    } catch {
      /* ignore */
    }
    if (skipSaveRef.current) {
      skipSaveRef.current = false
      return
    }
    if (source !== 'postgres' || !auditIdRef.current) return
    setSync('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await saveAudit(auditIdRef.current, { responses })
        if (aliveRef.current) setSync('saved')
      } catch {
        if (aliveRef.current) setSync('offline')
      }
    }, 900)
  }, [responses, name, tplKey, source])

  useEffect(() => {
    if (topRef.current) topRef.current.scrollTop = 0
  }, [sectionIdx, view])

  const answered = useMemo(() => Object.values(responses).filter((r) => r && r.val).length, [responses])
  const counts = useMemo(() => {
    const c = { yes: 0, no: 0, na: 0 }
    for (const r of Object.values(responses)) if (r && r.val) c[r.val]++
    return c
  }, [responses])

  const setItem = (id, resp) =>
    setResponses((prev) => {
      const next = { ...prev }
      if (!resp || (!resp.val && !resp.note && !resp.photo)) delete next[id]
      else next[id] = resp
      return next
    })

  const deficiencies = useMemo(() => {
    const out = []
    tpl.sections.forEach((s) => {
      s.items.forEach((it) => {
        const r = responses[it.id]
        if (r && r.val === 'no') out.push({ section: s.title, ref: it.ref, text: it.text, note: r.note || '' })
      })
    })
    return out
  }, [responses, tpl])

  // Per-area progress + overall completeness (every item answered; N/A counts).
  const sectionAnswered = (s) => s.items.filter((it) => responses[it.id]?.val).length
  const complete = answered === total
  const remaining = total - answered
  const incompleteCount = tpl.sections.filter((s) => sectionAnswered(s) < s.items.length).length

  async function submit() {
    if (!complete) {
      flash('Answer every item in all areas (N/A is fine) before submitting')
      setView('menu')
      return
    }
    if (source === 'postgres' && auditIdRef.current) {
      try {
        await saveAudit(auditIdRef.current, { responses, status: 'complete' })
      } catch {
        /* mirror remains on device */
      }
    }
    flash('Audit submitted')
    onClose()
  }

  async function saveDraftAndClose() {
    if (source === 'postgres' && auditIdRef.current) {
      try {
        await saveAudit(auditIdRef.current, { responses })
      } catch {
        /* mirror remains on device */
      }
    }
    flash('Draft saved')
    onClose()
  }

  const pct = total ? Math.round((answered / total) * 100) : 0
  const section = tpl.sections[sectionIdx]
  const lastSection = sectionIdx >= tpl.sections.length - 1

  return (
    <div className="app-shell" style={{ position: 'fixed', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 'min(1040px, 100vw)', zIndex: 100, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ background: 'var(--navy)', color: '#fff', padding: '14px 16px 12px' }}>
        <div className="row spread">
          <button onClick={saveDraftAndClose} className="pill" style={{ background: 'rgba(255,255,255,.14)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconClose size={15} /> Save &amp; close
          </button>
          <span className="row gap" style={{ gap: 8, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 11, color: '#9FB0C4' }}>{SYNC_LABEL[sync]}</span>
            <span className="pill" style={{ background: 'rgba(255,255,255,.14)', color: '#fff' }}>{answered}/{total}</span>
          </span>
        </div>
        <div className="title" style={{ marginTop: 10 }}>Audit · {name}</div>
        <div style={{ color: '#9FB0C4', fontSize: 12.5, marginTop: 2 }}>{site.type} · {site.city}</div>
        {/* The form is fixed to the one that matches this facility type. */}
        <div className="row gap" style={{ marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="pill" style={{ fontSize: 11, background: '#fff', color: 'var(--navy)', fontWeight: 700 }}>
            {tpl.title}
          </span>
          <span className="muted" style={{ fontSize: 11, color: '#9FB0C4' }}>matched to {site.type}</span>
        </div>
        <div style={{ marginTop: 12, height: 6, background: 'rgba(255,255,255,.16)', borderRadius: 99 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green, #2E9E5B)', borderRadius: 99, transition: 'width .2s' }} />
        </div>
      </div>

      {/* body */}
      <div ref={topRef} style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {view === 'menu' && (
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div className="title" style={{ fontSize: 18 }}>Areas to audit</div>
            <div className="muted" style={{ fontSize: 12.5, margin: '4px 0 12px' }}>
              Pick any area to begin — in any order. Every item in all areas must be answered (N/A is fine) to submit.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {tpl.sections.map((s, i) => {
                const a = sectionAnswered(s)
                const t = s.items.length
                const done = a === t
                return (
                  <button
                    key={i}
                    onClick={() => { setSectionIdx(i); setView('section') }}
                    className={`card ${done ? 'bd-pass' : ''}`}
                    style={{ padding: '12px 14px', textAlign: 'left', cursor: 'pointer', display: 'block', width: '100%' }}
                  >
                    <div className="row spread" style={{ alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700 }}>{s.title}</span>
                      {done ? (
                        <span className="pill bg-pass s-pass" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconCheck size={12} /> Done
                        </span>
                      ) : (
                        <span className="pill" style={{ fontSize: 10, background: 'rgba(0,0,0,.05)', color: 'var(--navy)' }}>{a}/{t}</span>
                      )}
                    </div>
                    <div style={{ marginTop: 8, height: 5, background: 'var(--card-border)', borderRadius: 99 }}>
                      <div style={{ width: `${t ? Math.round((a / t) * 100) : 0}%`, height: '100%', background: done ? 'var(--green,#2E9E5B)' : 'var(--amber)', borderRadius: 99 }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {view === 'section' && (
          <>
            <div className="row spread" style={{ marginBottom: 10 }}>
              <div className="title" style={{ fontSize: 18 }}>{section.title}</div>
              <span className="muted" style={{ fontSize: 12 }}>Area {sectionIdx + 1}/{tpl.sections.length} · {sectionAnswered(section)}/{section.items.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 10, alignItems: 'start' }}>
              {section.items.map((it) => (
                <ItemRow key={it.id} item={it} resp={responses[it.id]} onSet={(r) => setItem(it.id, r)} />
              ))}
            </div>
          </>
        )}

        {view === 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760, margin: '0 auto' }}>
            <div className="title" style={{ fontSize: 18 }}>Audit summary</div>
            <div className="row gap">
              {[['Yes', counts.yes, 'pass'], ['No', counts.no, 'fail'], ['N/A', counts.na, 'open'], ['Left', total - answered, '']].map(([l, n, tone]) => (
                <div key={l} className="card" style={{ flex: 1, padding: '12px 8px', textAlign: 'center' }}>
                  <div className="stat-num" style={{ color: tone === 'fail' ? 'var(--red)' : tone === 'pass' ? 'var(--green,#2E9E5B)' : tone === 'open' ? 'var(--amber)' : 'var(--navy)' }}>{n}</div>
                  <div className="label" style={{ marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>

            <div className="title" style={{ fontSize: 15, marginTop: 4 }}>Deficiencies ({deficiencies.length})</div>
            {deficiencies.length === 0 && (
              <div className="card" style={{ padding: 20, textAlign: 'center' }}><div className="muted">No &quot;No&quot; answers — site is clear.</div></div>
            )}
            {deficiencies.map((d, i) => (
              <div key={i} className="card bd-fail" style={{ padding: '11px 14px' }}>
                <div className="label" style={{ color: 'var(--grey)' }}>{d.section}</div>
                <div style={{ fontSize: 13.5, marginTop: 3 }}>{d.ref ? `${d.ref}. ` : ''}{d.text}</div>
                {d.note && <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>“{d.note}”</div>}
              </div>
            ))}
            {deficiencies.length > 0 && onLogDeficiencies && (
              <button
                onClick={() => { onLogDeficiencies(name, deficiencies); flash(`Logged ${deficiencies.length} finding${deficiencies.length > 1 ? 's' : ''}`) }}
                className="pill"
                style={{ background: 'var(--red)', color: '#fff', padding: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <IconCheck size={16} /> Log {deficiencies.length} deficienc{deficiencies.length > 1 ? 'ies' : 'y'} as findings
              </button>
            )}
          </div>
        )}
      </div>

      {/* footer nav — depends on the current view */}
      <div className="row spread" style={{ padding: 12, borderTop: '1px solid var(--card-border)', background: '#fff', gap: 10, alignItems: 'center' }}>
        {view === 'menu' && (
          <>
            <span className="muted" style={{ fontSize: 12, flex: 1 }}>
              {complete ? 'All areas complete — ready to submit.' : `${remaining} item${remaining === 1 ? '' : 's'} left in ${incompleteCount} area${incompleteCount === 1 ? '' : 's'}.`}
            </span>
            <button
              onClick={() => setView('review')}
              disabled={!complete}
              className="pill"
              style={{ flex: '0 0 auto', padding: '12px 18px', background: complete ? 'var(--green,#2E9E5B)' : '#cdd5df', color: '#fff', fontWeight: 700, cursor: complete ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Review &amp; submit
            </button>
          </>
        )}

        {view === 'section' && (
          <>
            <button onClick={() => setView('menu')} className="pill" style={{ flex: 1, padding: '12px 0', background: '#fff', border: '1px solid var(--card-border)', color: 'var(--navy)', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconBack size={15} /> Areas
            </button>
            {lastSection ? (
              <button onClick={() => setView('menu')} className="pill" style={{ flex: 1, padding: '12px 0', background: 'var(--navy)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                Done <IconCheck size={15} />
              </button>
            ) : (
              <button onClick={() => setSectionIdx((i) => i + 1)} className="pill" style={{ flex: 1, padding: '12px 0', background: 'var(--navy)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                Next area <IconChevron size={15} />
              </button>
            )}
          </>
        )}

        {view === 'review' && (
          <>
            <button onClick={() => setView('menu')} className="pill" style={{ flex: 1, padding: '12px 0', background: '#fff', border: '1px solid var(--card-border)', color: 'var(--navy)', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconBack size={15} /> Areas
            </button>
            <button onClick={submit} disabled={!complete} className="pill" style={{ flex: 1.3, padding: '12px 0', background: complete ? 'var(--green,#2E9E5B)' : '#cdd5df', color: '#fff', fontWeight: 700, cursor: complete ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <IconCheck size={16} /> Submit audit
            </button>
          </>
        )}
      </div>
    </div>
  )
}
