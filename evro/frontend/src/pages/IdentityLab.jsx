import { useState } from 'react'
import { DIRECTIONS } from '../components/Marks.jsx'
import { LogoSystems, PageConcepts } from '../components/Concepts.jsx'

// EVRO Identity Lab (6C.1A) — the icon & identity exploration, live. Five
// directions render as real SVG systems with dark/light fields and motion/
// static variants; each carries its rationale AND its risk, because an
// exploration that can't criticise its own options isn't one. Wave 2 adds the
// logo systems and the landing/homepage concepts; Wave 3 adds the panel
// verdict. The shipped mark stays shipped — this lab informs the next call.

export default function IdentityLab({ db, user }) {
  const [light, setLight] = useState(false)
  const [motion, setMotion] = useState(true)

  return (
    <>
      <p className="page-intro">
        The <b>Identity Lab</b> — Phase 6C.1A's exploration, rendered live. The strategic
        question on the table: the Pulse Rings are EVRO's <i>operating language</i>, but are
        they the <i>master brand</i>? Five directions, each with its case and its risk.
      </p>

      <div className="card pad">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3>The brief, in one line</h3>
          <span className="spacer" />
          <div className="seg">
            <button className={!light ? 'active' : ''} aria-pressed={!light} onClick={() => setLight(false)}>Dark field</button>
            <button className={light ? 'active' : ''} aria-pressed={light} onClick={() => setLight(true)}>Light field</button>
          </div>
          <div className="seg">
            <button className={motion ? 'active' : ''} aria-pressed={motion} onClick={() => setMotion(true)}>Motion</button>
            <button className={!motion ? 'active' : ''} aria-pressed={!motion} onClick={() => setMotion(false)}>Static</button>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
          If Bloomberg, Palantir, Apple, Formula 1 strategy, NASA Mission Control and Blackstone
          collaborated on an Enterprise Intelligence Operating System — what would its mark be?
        </p>
      </div>

      <div className="lab-grid section-gap">
        {DIRECTIONS.map((d) => (
          <div key={d.key} className="card pad lab-card">
            <div className="lab-mark">
              <d.Mark size={104} light={light} motion={motion} id={`lab-${d.key}`} />
              <div className="lab-sizes">
                <d.Mark size={40} light={light} decorative id={`lab-s40-${d.key}`} />
                <d.Mark size={24} light={light} decorative id={`lab-s24-${d.key}`} />
                <d.Mark size={16} light={light} decorative id={`lab-s16-${d.key}`} />
              </div>
            </div>
            <div className="lab-body">
              <div className="lab-h">
                <span className="lab-n mono">D{d.n}</span>
                <b>{d.name}</b>
                <span className="spacer" />
                <span className="badge b-grey">{d.refs}</span>
              </div>
              <div className="lab-says">{d.says}</div>
              <p className="lab-rat">{d.rationale}</p>
              <p className="lab-risk"><b>The risk:</b> {d.risk}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="eh-fine">
        Scale row shows 40 / 24 / 16px — the recognizability floor the brief demands. All
        motion honors prefers-reduced-motion. The shipped 6C.1 mark (the Enterprise Pulse
        Orbital) is the production identity; this lab pressure-tests it against alternatives.
      </p>

      {/* three complete logo systems (Wave 2) */}
      <LogoSystems light={light} />

      {/* landing + homepage explorations (Wave 2) — live numbers */}
      <PageConcepts db={db} user={user} />
    </>
  )
}
