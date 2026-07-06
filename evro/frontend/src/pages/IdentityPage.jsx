import { useMemo, useState } from 'react'
import { MasterMark } from '../components/Identity.jsx'
import { CompassSymbol, PulseRings, PulseCompact, SignalGlyph } from '../components/IdentitySystems.jsx'
import { pulseIdentity, compassIdentity, signalIdentity, COMPASS_STATES, SIGNAL_STATES, HIERARCHY, COEXISTENCE, TRANSITIONS } from '../lib/identity-systems.js'
import { MOTION_IDENTITY, MOTION_LAWS } from '../lib/brand.js'

// The Identity Architecture page (6C.1B Wave 2) — the four coordinated
// identity layers, live. Every mark on this page is the production component
// in its real state: the compass reads the actual mission queue, the rings
// sweep the actual scores, the signal mirrors the actual agent presence. The
// state switchers exist to SHOW the other states — the "live now" line always
// says which one the enterprise is actually in.

export default function IdentityPage({ db, user }) {
  const pulse = useMemo(() => pulseIdentity(db), [db])
  const compass = useMemo(() => compassIdentity(db, user), [db, user])
  const signal = useMemo(() => signalIdentity(db, user), [db, user])
  const [cState, setCState] = useState(null) // null → live state
  const [sState, setSState] = useState(null)
  const compassShown = cState || compass.state
  const signalShown = sState || signal.state

  return (
    <>
      <p className="page-intro">
        The <b>EVRO identity architecture</b> — four coordinated systems, one identity. The
        master brand signs, the compass orients, the rings gauge, the signal senses. Every
        mark below is live: real states from the real portfolio, right now.
      </p>

      {/* the four layers, at a glance */}
      <div className="card pad">
        <div className="card-h"><h3>Four layers, one identity</h3><span className="spacer" /><span className="badge b-grey">all live · 6C.1B</span></div>
        <div className="idp-strip">
          <div className="idp-cell">
            <MasterMark size={64} id="idpm" decorative />
            <b>Master Brand</b><span>signs</span>
          </div>
          <div className="idp-cell">
            <CompassSymbol size={64} state={compass.state} id="idpc0" />
            <b>Compass</b><span>orients</span>
          </div>
          <div className="idp-cell">
            <PulseRings dims={pulse.dims} size={64} id="idpp0" />
            <b>Pulse Rings</b><span>gauge</span>
          </div>
          <div className="idp-cell">
            <SignalGlyph size={64} state={signal.state} id="idps0" />
            <b>Signal</b><span>senses</span>
          </div>
        </div>
      </div>

      {/* layer 2 — the compass */}
      <div className="card pad section-gap">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3>Layer 2 — the Enterprise Compass</h3>
          <span className="spacer" />
          <div className="seg">
            {COMPASS_STATES.map((s) => (
              <button key={s.key} className={compassShown === s.key ? 'active' : ''} aria-pressed={compassShown === s.key}
                onClick={() => setCState(s.key === compass.state ? null : s.key)}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className="idp-sys">
          <CompassSymbol size={148} state={compassShown} id="idpc1" label={`Enterprise Compass — ${compassShown}`} />
          <div className="idp-sys-body">
            <div className="idp-live"><i style={{ background: compassShown === compass.state ? 'var(--green)' : 'var(--grey-2)' }} />
              {compassShown === compass.state ? <><b>Live now:</b> {compass.line}</> : <><b>Preview.</b> Live state is “{COMPASS_STATES.find((s) => s.key === compass.state).label}” — {compass.line}</>}
            </div>
            <div className="idp-states">
              {COMPASS_STATES.map((s) => (
                <div key={s.key} className={`idp-state ${compassShown === s.key ? 'on' : ''}`}><b>{s.label}</b><span>{s.means}</span></div>
              ))}
            </div>
            <p className="idp-rule">The operating symbol: mission control, navigation, strategic heading. It moves only when
            the decision state moves — a compass that dances is a compass nobody trusts. The needle is the recall element;
            gold means a heading is in play.</p>
          </div>
        </div>
      </div>

      {/* layer 3 — the pulse rings */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>Layer 3 — the Pulse Rings</h3><span className="spacer" /><span className="badge b-grey">the operating language · live scores</span></div>
        <div className="idp-sys">
          <PulseRings dims={pulse.dims} size={192} id="idpp1" label="Enterprise Pulse Rings — live" />
          <div className="idp-sys-body">
            <div className="idp-dims">
              {pulse.dims.map((d) => (
                <div key={d.key} className="idp-dim">
                  <i style={{ background: d.color }} />
                  <b>{d.label}</b>
                  <span className="mono idp-score">{d.score}</span>
                  <span className="idp-detail">{d.detail}</span>
                  <span className="idp-formula">{d.formula}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="idp-behaviors">
          <div className="idp-beh">
            <div className="idp-beh-h">Desktop behavior</div>
            <PulseRings dims={pulse.dims} size={96} id="idpp2" />
            <span>The full stack: five gauges, sweep = score, state colours only. Lives in vitals, pulse and mission surfaces.</span>
          </div>
          <div className="idp-beh">
            <div className="idp-beh-h">Mobile behavior</div>
            <div className="idp-beh-row">
              <PulseCompact dims={pulse.dims} size={64} id="idpp3" />
              <div className="idp-chips">
                {pulse.dims.slice(1).map((d) => (
                  <span key={d.key} className="idp-chip" style={{ color: d.color }}>{d.label} {d.score}</span>
                ))}
              </div>
            </div>
            <span>The stack compacts: the Energy gauge carries the core score; the other four collapse to chips.</span>
          </div>
        </div>
      </div>

      {/* layer 4 — the signal */}
      <div className="card pad section-gap">
        <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          <h3>Layer 4 — the Enterprise Signal</h3>
          <span className="spacer" />
          <div className="seg">
            {SIGNAL_STATES.map((s) => (
              <button key={s.key} className={signalShown === s.key ? 'active' : ''} aria-pressed={signalShown === s.key}
                onClick={() => setSState(s.key === signal.state ? null : s.key)}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className="idp-sys">
          <SignalGlyph size={148} state={signalShown} id="idps1" label={`Enterprise Signal — ${signalShown}`} />
          <div className="idp-sys-body">
            <div className="idp-live"><i style={{ background: signalShown === signal.state ? 'var(--green)' : 'var(--grey-2)' }} />
              {signalShown === signal.state ? <><b>Live now:</b> {signal.line}</> : <><b>Preview.</b> Live state is “{SIGNAL_STATES.find((s) => s.key === signal.state).label}” — {signal.line}</>}
            </div>
            <div className="idp-agents">
              {signal.agents.map((a) => (
                <div key={a.key} className="idp-agent">
                  <i style={{ background: a.state === 'active' ? 'var(--green)' : a.state === 'watching' ? 'var(--navy)' : 'var(--grey-2)' }} />
                  <b>{a.name}</b>
                  <span className="idp-agent-st">{a.state}</span>
                  <span className="mono">{Math.round(a.confidence * 100)}%</span>
                  <span className="idp-agent-note">{a.confNote}</span>
                </div>
              ))}
            </div>
            <p className="idp-rule">The AI's own language: presence, sensing, prediction, orchestration — deterministic and
            rules-based, and the identity says so. The signal may annotate any surface; it never replaces the layer it
            annotates, and it never carries state colour — the gold contact is its only accent.</p>
          </div>
        </div>
      </div>

      {/* the interaction rules */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>How four systems stay one identity</h3><span className="spacer" /><span className="badge b-grey">hierarchy · coexistence · transitions</span></div>
        <div className="idp-rules">
          <div>
            <div className="idp-rules-h">Hierarchy</div>
            {HIERARCHY.map((h) => (
              <div key={h.n} className="idp-h"><span className="mono idp-hn">{h.n}</span><div><b>{h.name}</b><span>{h.rule}</span></div></div>
            ))}
          </div>
          <div>
            <div className="idp-rules-h">Coexistence</div>
            {COEXISTENCE.map((c, i) => <div key={i} className="idp-co">◈ {c}</div>)}
          </div>
        </div>
        <div className="idp-rules-h" style={{ marginTop: 14 }}>Transitions — the loop</div>
        <div className="idp-trans">
          {TRANSITIONS.map((t) => (
            <div key={t.from} className="idp-t"><b>{t.from}</b><span className="idp-t-arrow">{t.to !== '—' ? `→ ${t.to}` : '∅'}</span><span>{t.when}</span></div>
          ))}
        </div>
      </div>

      {/* the motion identity (Wave 4) — each layer owns its verbs */}
      <div className="card pad section-gap">
        <div className="card-h"><h3>The motion identity</h3><span className="spacer" /><span className="badge b-grey">breathe · sweep · orient · glint · propagate</span></div>
        <div className="idp-motion">
          {MOTION_IDENTITY.map((m, i) => (
            <div key={m.layer} className="idp-mo">
              <div className="idp-mo-mark">
                {i === 0 && <MasterMark size={56} motion id="mo-m" decorative />}
                {i === 1 && <CompassSymbol size={56} state="orient" motion id="mo-c" />}
                {i === 2 && <PulseRings dims={pulse.dims} size={56} motion id="mo-p" />}
                {i === 3 && <SignalGlyph size={56} state="sensing" motion id="mo-s" />}
              </div>
              <b>{m.layer}</b>
              <span className="idp-mo-verb mono">{m.verbs}</span>
              <span className="idp-mo-means">{m.means}</span>
              <span className="idp-mo-law">{m.law}</span>
            </div>
          ))}
        </div>
        <div className="idp-laws">
          {MOTION_LAWS.map((l, i) => <div key={i} className="idp-co">◈ {l}</div>)}
        </div>
      </div>

      <p className="eh-fine">
        Everything on this page is computed from the live portfolio — ring sweeps, compass state and agent presence
        included; formulas are carried on the rings. State switchers preview the other states; the green dot marks the
        one the enterprise is actually in. All motion honors prefers-reduced-motion.
      </p>
    </>
  )
}
