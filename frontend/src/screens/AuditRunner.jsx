import { useState, useEffect, useMemo, useRef } from 'react'
import {
  AUDIT_TEMPLATES,
  TEMPLATE_LIST,
  templateKeyForType,
  templateItemCount,
} from '../lib/audit-templates.js'
import { IconBack, IconCheck, IconClose, IconChevron } from '../components/Icons.jsx'

// Full-screen step-by-step audit. Walks the checklist that matches the site's
// type (auditor can switch template), one section per screen. Each item is
// answered Yes / No / N-A with an optional comment. Progress and answers are
// saved to localStorage per (site, template) so an audit can be resumed.

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
      {(showNote || resp?.note) ? (
        <textarea
          value={resp?.note || ''}
          onChange={(e) => onSet({ ...resp, note: e.target.value })}
          placeholder="Comment / detail…"
          rows={2}
          style={{ marginTop: 8, width: '100%', fontSize: 13, padding: 8, borderRadius: 8, border: '1px solid var(--card-border)', resize: 'vertical', boxSizing: 'border-box' }}
        />
      ) : (
        <button onClick={() => setShowNote(true)} className="muted" style={{ marginTop: 7, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          + Add comment
        </button>
      )}
    </div>
  )
}

export default function AuditRunner({ name, site, onClose, onLogDeficiencies, flash }) {
  const [tplKey, setTplKey] = useState(() => templateKeyForType(site.type))
  const [responses, setResponses] = useState(() => loadResponses(name, templateKeyForType(site.type)))
  const [sectionIdx, setSectionIdx] = useState(0)
  const [review, setReview] = useState(false)
  const tpl = AUDIT_TEMPLATES[tplKey]
  const total = templateItemCount(tplKey)
  const topRef = useRef(null)

  // Switch template → load that template's saved answers, reset to first section.
  useEffect(() => {
    setResponses(loadResponses(name, tplKey))
    setSectionIdx(0)
    setReview(false)
  }, [tplKey, name])

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(lsKey(name, tplKey), JSON.stringify(responses))
    } catch {
      /* ignore */
    }
  }, [responses, name, tplKey])

  useEffect(() => {
    if (topRef.current) topRef.current.scrollTop = 0
  }, [sectionIdx, review])

  const answered = useMemo(() => Object.values(responses).filter((r) => r && r.val).length, [responses])
  const counts = useMemo(() => {
    const c = { yes: 0, no: 0, na: 0 }
    for (const r of Object.values(responses)) if (r && r.val) c[r.val]++
    return c
  }, [responses])

  const setItem = (id, resp) =>
    setResponses((prev) => {
      const next = { ...prev }
      if (!resp || (!resp.val && !resp.note)) delete next[id]
      else next[id] = resp
      return next
    })

  // All "No" answers, flattened with their section, for the review screen.
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

  const pct = total ? Math.round((answered / total) * 100) : 0
  const section = tpl.sections[sectionIdx]
  const lastSection = sectionIdx >= tpl.sections.length - 1

  return (
    <div className="app-shell" style={{ position: 'fixed', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 'var(--app-w)', zIndex: 100, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ background: 'var(--navy)', color: '#fff', padding: '14px 16px 12px' }}>
        <div className="row spread">
          <button onClick={onClose} className="pill" style={{ background: 'rgba(255,255,255,.14)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconClose size={15} /> Close
          </button>
          <span className="pill" style={{ background: 'rgba(255,255,255,.14)', color: '#fff' }}>{answered}/{total} answered</span>
        </div>
        <div className="title" style={{ marginTop: 10 }}>Audit · {name}</div>
        <div style={{ color: '#9FB0C4', fontSize: 12.5, marginTop: 2 }}>{site.type} · {site.city}</div>
        {/* template switcher */}
        <div className="row gap" style={{ marginTop: 10, flexWrap: 'wrap' }}>
          {TEMPLATE_LIST.map((t) => (
            <button
              key={t.key}
              onClick={() => setTplKey(t.key)}
              className="pill"
              style={{ fontSize: 11, background: t.key === tplKey ? '#fff' : 'rgba(255,255,255,.12)', color: t.key === tplKey ? 'var(--navy)' : '#fff', cursor: 'pointer' }}
            >
              {t.title.replace(/^Facility (Inspection|Site Check|Compliance) — ?/, '').replace('Facility Compliance Review', 'Facility Review') || t.title}
            </button>
          ))}
        </div>
        {/* progress bar */}
        <div style={{ marginTop: 12, height: 6, background: 'rgba(255,255,255,.16)', borderRadius: 99 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green, #2E9E5B)', borderRadius: 99, transition: 'width .2s' }} />
        </div>
      </div>

      {/* body */}
      <div ref={topRef} style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {!review && (
          <>
            <div className="row spread" style={{ marginBottom: 10 }}>
              <div className="title" style={{ fontSize: 18 }}>{section.title}</div>
              <span className="muted" style={{ fontSize: 12 }}>Section {sectionIdx + 1}/{tpl.sections.length}</span>
            </div>
            <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {section.items.map((it) => (
                <ItemRow key={it.id} item={it} resp={responses[it.id]} onSet={(r) => setItem(it.id, r)} />
              ))}
            </div>
          </>
        )}

        {review && (
          <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              <div className="card" style={{ padding: 20, textAlign: 'center' }}><div className="muted">No "No" answers — site is clear.</div></div>
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

      {/* footer nav */}
      <div className="row spread" style={{ padding: 12, borderTop: '1px solid var(--card-border)', background: '#fff', gap: 10 }}>
        <button
          onClick={() => (review ? setReview(false) : setSectionIdx((i) => Math.max(0, i - 1)))}
          disabled={!review && sectionIdx === 0}
          className="pill"
          style={{ flex: 1, padding: '12px 0', background: '#fff', border: '1px solid var(--card-border)', color: 'var(--navy)', opacity: !review && sectionIdx === 0 ? 0.4 : 1, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <IconBack size={15} /> {review ? 'Back' : 'Prev'}
        </button>
        {!review && !lastSection && (
          <button onClick={() => setSectionIdx((i) => i + 1)} className="pill" style={{ flex: 1, padding: '12px 0', background: 'var(--navy)', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            Next <IconChevron size={15} />
          </button>
        )}
        {!review && lastSection && (
          <button onClick={() => setReview(true)} className="pill" style={{ flex: 1, padding: '12px 0', background: 'var(--green,#2E9E5B)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            Review & finish
          </button>
        )}
        {review && (
          <button onClick={onClose} className="pill" style={{ flex: 1, padding: '12px 0', background: 'var(--navy)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            Done
          </button>
        )}
      </div>
    </div>
  )
}
