import { useState } from 'react'
import { dependencyGraph, criticalPath, downstreamImpact, prerequisites, rav } from '../lib/engine.js'
import { money } from '../lib/format.js'
import { Graph } from '../components/Charts.jsx'

export default function Dependencies({ db, openDrawer }) {
  const [sel, setSel] = useState(null)
  const g = dependencyGraph(db)
  const cp = criticalPath(db)
  const impact = sel ? downstreamImpact(db, sel) : null
  const byId = Object.fromEntries(db.initiatives.map((i) => [i.id, i]))
  const selInit = sel ? byId[sel] : null
  const highlight = sel ? [sel, ...(impact?.ids || [])] : cp.path.map((i) => i.id)

  return (
    <>
      <p className="page-intro">Dependency network — how initiatives enable or block each other, the critical path, and the value at risk if a node slips. Click a node to trace its downstream impact.</p>

      <div className="card pad">
        <div className="card-h"><h3>Initiative dependency graph</h3><span className="spacer" />
          <span className="tiny muted">{g.nodes.length} initiatives · {g.edges.length} links · left→right by stage</span>
        </div>
        <Graph nodes={g.nodes} edges={g.edges} highlight={highlight} onPick={(n) => setSel(n.id === sel ? null : n.id)} />
        <div className="chip-row">
          <span className="badge b-green">● On track</span><span className="badge b-amber">● Watch</span><span className="badge b-red">● At risk</span>
          <span className="tiny muted" style={{ alignSelf: 'center' }}>{sel ? 'Highlighting downstream impact of the selected node.' : 'Highlighting the critical path.'}</span>
        </div>
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Critical path</h3><span className="spacer" /><span className="badge b-navy">{cp.length} initiatives · {money(cp.value)}</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {cp.path.map((i, k) => (
              <button key={i.id} className="kv" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none' }} onClick={() => openDrawer(i.id)}>
                <span className="k" style={{ color: 'var(--dark)' }}>{k + 1}. {i.title}</span><span className="v tiny muted" style={{ textTransform: 'capitalize' }}>{i.stage}</span>
              </button>
            ))}
          </div>
          <p className="tiny muted section-gap">The longest chain of dependent initiatives — a slip anywhere here cascades.</p>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>{selInit ? 'Impact of selected node' : 'Select a node'}</h3></div>
          {selInit ? (
            <>
              <div className="kv"><span className="k">Initiative</span><span className="v"><b>{selInit.title}</b></span></div>
              <div className="kv"><span className="k">Prerequisites</span><span className="v">{prerequisites(db, sel).length}</span></div>
              <div className="kv"><span className="k">Downstream initiatives</span><span className="v">{impact.count}</span></div>
              <div className="kv"><span className="k">Risk-adjusted value at risk</span><span className="v mono" style={{ color: 'var(--red)' }}>{money(impact.ravAtRisk)}</span></div>
              <button className="btn sm section-gap" onClick={() => openDrawer(sel)}>Open initiative →</button>
              {impact.initiatives.length > 0 && (
                <div className="section-gap">
                  <div className="label">Cascade</div>
                  {impact.initiatives.slice(0, 6).map((i) => (
                    <button key={i.id} className="kv" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none' }} onClick={() => openDrawer(i.id)}>
                      <span className="k" style={{ color: 'var(--dark)' }}>{i.title}</span><span className="v tiny mono muted">{money(rav(i))}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : <div className="muted">Click a node in the graph to see its prerequisites, downstream cascade, and value at risk.</div>}
        </div>
      </div>
    </>
  )
}
