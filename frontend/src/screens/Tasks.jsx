import { allOpenFindings, resolveProgress, fmtShort, daysUntil, FINDING_LABEL } from '../lib/derive.js'
import { IconChevron } from '../components/Icons.jsx'
import BackButton from '../components/BackButton.jsx'

const FILTERS = [
  { id: 'all', label: 'All open' },
  { id: 'fail', label: 'Failing' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'ao', label: 'American Organics' },
]

function dueTag(c) {
  if (c.status === 'fail') return { text: 'Needs fix', cls: 's-fail' }
  const d = daysUntil(c.due)
  if (d === Infinity) return { text: 'No due date', cls: 'muted' }
  if (d < 0) return { text: `${-d}d overdue`, cls: 's-fail' }
  if (d === 0) return { text: 'Due today', cls: 's-open' }
  return { text: `Due ${fmtShort(c.due)}`, cls: 's-open' }
}

export default function Tasks({ data, filter, setFilter, onOpenFinding, onBack }) {
  const all = allOpenFindings(data)
  const prog = resolveProgress(data)

  const shown = all.filter((c) => {
    if (filter === 'fail') return c.status === 'fail'
    if (filter === 'unassigned') return !c.owner
    if (filter === 'ao') return c.site === 'American Organics'
    return true
  })

  return (
    <div className="screen">
      <div className="header">
        <BackButton onClick={onBack} label="Home" />
        <div className="row spread">
          <div>
            <div className="title">{all.length} open findings</div>
            <div style={{ color: '#9FB0C4', fontSize: 13, marginTop: 4 }}>
              {prog.done} of {prog.total} items cleared
            </div>
          </div>
          <div className="ring" style={{ '--pct': prog.pct }}>
            <span>{prog.pct}%</span>
          </div>
        </div>
      </div>

      <div className="pad">
        <div className="chips">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`chip ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pad">
        {shown.length === 0 ? (
          <div className="card" style={{ padding: 28, textAlign: 'center' }}>
            <div className="h2">Nothing open here</div>
            <div className="muted" style={{ marginTop: 6 }}>
              All clear.
            </div>
          </div>
        ) : (
          <div className="stack">
            {shown.map((c) => {
              const tag = dueTag(c)
              const tone = c.status === 'fail' ? 'fail' : 'open'
              return (
                <button
                  key={c.site + c.id}
                  className={`card lrow bd-${tone}`}
                  onClick={() => onOpenFinding(c.site, c.id)}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 14px' }}
                >
                  <div className="row spread" style={{ marginBottom: 6 }}>
                    <span className="label" style={{ color: c.dept === 'ENV' ? 'var(--green)' : 'var(--blue)' }}>
                      {c.dept === 'ENV' ? 'ENV' : 'Facility'}
                    </span>
                    <span className={`label ${tag.cls}`}>{tag.text}</span>
                  </div>
                  <div className="h2" style={{ fontSize: 14.5, fontWeight: 600 }}>
                    {c.title}
                  </div>
                  <div className="row spread" style={{ marginTop: 6 }}>
                    <span className="muted" style={{ fontSize: 12.5 }}>
                      {c.site} · {c.owner || 'Unassigned'}
                    </span>
                    <span className={`pill bg-${tone} s-${tone}`} style={{ fontSize: 10.5 }}>
                      {FINDING_LABEL[c.status]}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
