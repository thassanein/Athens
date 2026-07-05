import { useState } from 'react'
import { integrationSources, featureFlags } from '../lib/model.js'
import { dateLabel, num } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'

// Integration & Assembly Readiness (5B.7). Two managed surfaces:
//  1) a source-system registry (ERP mapping + sync status; the /api/integration
//     stub and per-source `mappings` show where real connectors attach), and
//  2) module flags — enable/disable optional modules for phased, modular rollout.
// Presentation + additive: toggling calls the toggleModule mutation; core
// modules can't be disabled. No engine/business-logic change.

const STATUS = {
  connected: { label: 'Connected', tone: 'var(--green)', badge: 'b-green' },
  stubbed: { label: 'Stubbed', tone: 'var(--amber)', badge: 'b-amber' },
  planned: { label: 'Planned', tone: 'var(--grey-2)', badge: 'b-grey' },
}
const CAT_LABEL = { operations: 'Operations', crm: 'CRM', finance: 'Finance', hr: 'HR', contact_center: 'Contact center', procurement: 'Procurement' }

export default function Integrations({ db, user, dispatch, flash }) {
  const [open, setOpen] = useState(null)
  const sources = integrationSources(db)
  const flags = featureFlags(db)
  const connected = sources.filter((s) => s.status === 'connected').length

  const flagGroups = flags.reduce((o, f) => { (o[f.group] ||= []).push(f); return o }, {})
  const toggle = async (f) => {
    if (f.core) return flash('Core modules cannot be disabled.')
    const r = await dispatch('toggleModule', f.id, user.id)
    if (!r?.error) flash(`Module "${f.label}" ${f.enabled ? 'disabled' : 'enabled'}.`)
  }

  return (
    <>
      <p className="page-intro">
        <b>Integration & Assembly Readiness</b> — the source systems Athens OS maps to, and
        the modules you can activate for a phased rollout. Only the AP register feeds real
        data today; the rest are stubs whose field mappings show exactly where a live ERP
        connector attaches. Read the same registry at <span className="mono">/api/integration</span>.
      </p>

      <div className="grid cols-4">
        <Tile label="Source systems" value={String(sources.length)} sub="in the registry" />
        <Tile label="Connected" value={String(connected)} sub="feeding real data" tone="green" />
        <Tile label="Modules" value={String(flags.length)} sub="in the assembly" tone="dark" />
        <Tile label="Active modules" value={String(flags.filter((f) => f.enabled).length)} sub="enabled now" tone="navy" />
      </div>

      {/* source-system registry */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Source-system registry</h3><span className="spacer" /><span className="badge b-grey">ERP mapping · sync status</span></div>
        <div className="int-list">
          {sources.map((s) => {
            const st = STATUS[s.status] || STATUS.planned
            const isOpen = open === s.id
            return (
              <div key={s.id} className={`int-src ${isOpen ? 'open' : ''}`}>
                <button className="int-src-h" onClick={() => setOpen(isOpen ? null : s.id)}>
                  <span className="int-dot" style={{ background: st.tone }} />
                  <div className="int-src-main">
                    <div className="int-src-t">{s.name} <span className="int-src-cat">{CAT_LABEL[s.category] || s.category}</span></div>
                    <div className="int-src-note">{s.note}</div>
                  </div>
                  <div className="int-src-meta">
                    <span className={`badge ${st.badge}`}>{st.label}</span>
                    <span className="int-src-sync">{s.last_sync ? `synced ${dateLabel(s.last_sync)}` : 'never synced'} · {s.cadence}</span>
                    {s.record_count > 0 && <span className="int-src-recs">{num(s.record_count)} records</span>}
                  </div>
                </button>
                {isOpen && (
                  <div className="int-src-body">
                    <div className="int-feeds"><span className="int-lbl">Feeds</span>
                      {s.feeds.length ? s.feeds.map((f) => <span key={f} className="badge b-navy mono">{f}</span>) : <span className="muted">— none yet</span>}
                    </div>
                    <div className="int-map">
                      <div className="int-lbl">Field mapping</div>
                      <table className="tbl">
                        <thead><tr><th>Source field</th><th></th><th>EVRO target</th><th>Transform</th></tr></thead>
                        <tbody>
                          {s.mappings.map((m, k) => (
                            <tr key={k}>
                              <td className="mono">{m.source_field}</td>
                              <td className="muted">→</td>
                              <td className="mono">{m.target}</td>
                              <td className="muted">{m.transform}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* module assembly — feature flags */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Module assembly</h3><span className="spacer" /><span className="badge b-grey">phased activation</span></div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: -2, marginBottom: 10 }}>Toggle optional modules on or off for a phased rollout. Core modules are always on; disabling a module removes it from the nav immediately.</p>
        {Object.entries(flagGroups).map(([group, fs]) => (
          <div key={group} className="int-flag-group">
            <div className="int-flag-gl">{group}</div>
            <div className="int-flags">
              {fs.map((f) => (
                <div key={f.id} className={`int-flag ${f.enabled ? 'on' : 'off'}`}>
                  <div className="int-flag-main">
                    <div className="int-flag-t">{f.label} {f.core && <span className="badge b-grey">core</span>} {f.phase === 'future' && <span className="badge b-amber">future</span>}</div>
                    <div className="int-flag-d">{f.description}</div>
                  </div>
                  <button className={`int-switch ${f.enabled ? 'on' : ''} ${f.core ? 'locked' : ''}`} onClick={() => toggle(f)} disabled={f.core} aria-label={`Toggle ${f.label}`} title={f.core ? 'Core module — always on' : f.enabled ? 'Disable' : 'Enable'}>
                    <span className="int-knob" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
