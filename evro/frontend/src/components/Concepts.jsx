import { useMemo } from 'react'
import { MarkPulse, MarkMonogram, MarkCompass } from './Marks.jsx'
import { enterpriseEnergy, enterpriseWeather, valueVelocity } from '../lib/experience.js'
import { enterpriseRollup, controlTower } from '../lib/engine.js'
import { missionQueue } from '../lib/mission.js'
import { momentum } from '../lib/momentum.js'
import { seasonFramework } from '../lib/seasons.js'
import { money } from '../lib/format.js'

// 6C.1A Wave 2 — the three complete logo systems and the five page concepts.
// Concepts are comps, not shipping surfaces — but every number in them is
// computed live from the portfolio, because even a mock must not lie.

// ---------------------------------------------------------------------------
// Three logo systems. Why these three: the shipped production identity (the
// Enterprise Pulse Orbital — see the Brand page) already occupies D2's
// territory, and D5's register is the riskiest fit for the movement side of
// the product — so the lab develops the three genuine alternatives in full.
// ---------------------------------------------------------------------------
const SYSTEMS = [
  { key: 'pulse', name: 'System A — Executive Pulse', Mark: MarkPulse, sub: 'Enterprise Intelligence OS', pairing: 'Wordmark set wide (+0.6 tracking) — the calm authority register. Gold reserved for the inner ring only.' },
  { key: 'monogram', name: 'System B — EV Monogram', Mark: MarkMonogram, sub: 'Enterprise Intelligence OS', pairing: 'Crest logic: the monogram carries ceremony; the wordmark stays quiet and never locks closer than one cap-height.' },
  { key: 'compass', name: 'System C — Enterprise Compass', Mark: MarkCompass, sub: 'Enterprise Intelligence OS', pairing: 'Instrument logic: the dial reads first, the name confirms. Strong at cockpit sizes; the needle is the recall element.' },
]

export function LogoSystems({ light }) {
  return (
    <div className="card pad section-gap">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3>Three complete logo systems</h3>
        <span className="spacer" />
        <span className="badge b-grey">horizontal · vertical · icon</span>
      </div>
      <p className="muted vwf-sub">
        The shipped Pulse Orbital already covers D2's territory (see Brand); D5's register is the
        riskiest fit for the movement side — so the lab develops the three genuine alternatives in full.
      </p>
      <div className="con-systems">
        {SYSTEMS.map((s) => (
          <div key={s.key} className={`con-sys ${light ? 'lightfield' : ''}`}>
            <div className="con-sys-n">{s.name}</div>
            <div className="con-lock-h">
              <s.Mark size={40} light={light} id={`sys-h-${s.key}`} decorative />
              <div>
                <div className="con-word">Athens EVRO</div>
                <div className="con-sub">{s.sub}</div>
              </div>
            </div>
            <div className="con-lock-v">
              <s.Mark size={54} light={light} id={`sys-v-${s.key}`} decorative />
              <div className="con-word" style={{ fontSize: 13 }}>Athens EVRO</div>
              <div className="con-sub">{s.sub}</div>
            </div>
            <div className="con-icons">
              <s.Mark size={28} light={light} id={`sys-i28-${s.key}`} decorative />
              <s.Mark size={20} light={light} id={`sys-i20-${s.key}`} decorative />
              <s.Mark size={16} light={light} id={`sys-i16-${s.key}`} decorative />
            </div>
            <div className="con-pair">{s.pairing}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page concepts — three landings, two executive homepages, desktop + mobile.
// ---------------------------------------------------------------------------
function Desk({ children, title }) {
  return (
    <div className="con-desk" role="img" aria-label={`${title} — desktop concept`}>
      <div className="con-desk-bar"><i /><i /><i /></div>
      <div className="con-desk-body">{children}</div>
    </div>
  )
}
function Phone({ children, title }) {
  return (
    <div className="con-phone" role="img" aria-label={`${title} — mobile concept`}>
      <div className="con-phone-notch" />
      <div className="con-phone-body">{children}</div>
    </div>
  )
}
const Chip = ({ tone, children }) => <span className="con-chip" style={{ color: tone }}>{children}</span>

export function PageConcepts({ db, user }) {
  const d = useMemo(() => {
    const roll = enterpriseRollup(db)
    const e = enterpriseEnergy(db)
    const w = enterpriseWeather(db)
    const vel = valueVelocity(db)
    const q = missionQueue(db, user)
    const ct = controlTower(db)
    const mom = momentum(db, 'business_unit').counts
    const season = seasonFramework(db).current
    return {
      evum: roll.bridgeTotal, realized: roll.realizedYTD, forecast: roll.forecastRemainderFY, opp: roll.identifiedOpportunity,
      energy: e.score, state: e.state, weather: w, netDay: vel.netPerDay,
      missions: q.missions.length, decisions: q.counts.decision, atStake: q.totalValue,
      valueAtRisk: ct.valueAtRisk, topOpp: q.missions.find((m) => m.cls === 'opportunity')?.value || 0,
      mom, season,
      // bar heights scaled from the real value bridge — even a comp chart must not lie
      bridgeBars: (() => { const vals = roll.bridge.map((s) => s.value); const max = Math.max(...vals); return vals.map((v) => Math.max(4, Math.round((v / max) * 34))) })(),
    }
  }, [db, user])

  const LANDINGS = [
    {
      key: 'status', name: 'Landing L1 — Enterprise Status First',
      why: 'The first read is the enterprise itself: energy, weather, the one-line state. For the executive who asks "how are we?" before "how much?".',
      desk: (
        <>
          <div className="con-row" style={{ justifyContent: 'center', marginTop: 10 }}>
            <span className="con-ring" style={{ borderColor: d.state.tone, color: d.state.tone }}>{d.energy}</span>
          </div>
          <div className="con-big" style={{ textAlign: 'center', fontSize: 11 }}>{d.state.label} · {d.weather.icon} {d.weather.label}</div>
          <div className="con-line" style={{ textAlign: 'center' }}>net momentum {money(Math.round(d.netDay))}/day</div>
          <div className="con-cta">Enter the operating system →</div>
        </>
      ),
      phone: (
        <>
          <span className="con-ring sm" style={{ borderColor: d.state.tone, color: d.state.tone }}>{d.energy}</span>
          <div className="con-line">{d.state.label} · {d.weather.label}</div>
          <div className="con-cta sm">Enter →</div>
        </>
      ),
    },
    {
      key: 'command', name: 'Landing L2 — Mission Control First',
      why: 'The first read is the work: missions ranked, decisions waiting, one click to command. For the operator-executive who opens EVRO to act.',
      desk: (
        <>
          <div className="con-big" style={{ marginTop: 8 }}>{d.missions} missions · {money(d.atStake)} at stake</div>
          <div className="con-rows">
            <div className="con-mrow"><i style={{ background: 'var(--amber)' }} />Decisions on you<b>{d.decisions}</b></div>
            <div className="con-mrow"><i style={{ background: 'var(--red)' }} />Value at risk<b>{money(d.valueAtRisk)}</b></div>
            <div className="con-mrow"><i style={{ background: 'var(--green)' }} />Top opportunity<b>{money(d.topOpp)}</b></div>
          </div>
          <div className="con-cta">Take command →</div>
        </>
      ),
      phone: (
        <>
          <div className="con-line"><b>{d.missions}</b> missions</div>
          <div className="con-line"><b>{d.decisions}</b> decisions on you</div>
          <div className="con-cta sm">Command →</div>
        </>
      ),
    },
    {
      key: 'value', name: 'Landing L3 — Enterprise Value First',
      why: 'The first read is the number: value under management, then its decomposition. The shipped landing\'s lineage — Bloomberg with a front door.',
      desk: (
        <>
          <div className="con-hero mono">{money(d.evum)}</div>
          <div className="con-line" style={{ textAlign: 'center' }}>ENTERPRISE VALUE UNDER MANAGEMENT</div>
          <div className="con-row" style={{ justifyContent: 'center', gap: 8 }}>
            <Chip tone="var(--green)">{money(d.realized)} realized</Chip>
            <Chip tone="var(--navy)">{money(d.forecast)} forecast</Chip>
            <Chip tone="var(--brand-ai)">{money(d.opp)} identified</Chip>
          </div>
          <div className="con-cta">Enter the operating system →</div>
        </>
      ),
      phone: (
        <>
          <div className="con-hero mono" style={{ fontSize: 15 }}>{money(d.evum)}</div>
          <div className="con-line">under management</div>
          <div className="con-cta sm">Enter →</div>
        </>
      ),
    },
  ]

  const HOMES = [
    {
      key: 'cc', name: 'Homepage H1 — Executive Command Center',
      why: 'Bloomberg density: vitals, the queue, the decisions — every panel actionable, nothing ornamental. The seat of command.',
      desk: (
        <>
          <div className="con-strip"><span style={{ color: d.state.tone }}>◉ {d.energy}</span><span>{d.weather.icon}</span><span className="mono">{money(Math.round(d.netDay))}/d</span><span className="mono">{d.decisions} dec</span></div>
          <div className="con-grid">
            <div className="con-panel"><b>Queue</b>{[...Array(3)].map((_, i) => <div key={i} className="con-skel" />)}</div>
            <div className="con-panel"><b>Decisions</b>{[...Array(2)].map((_, i) => <div key={i} className="con-skel" />)}<div className="con-skel btn" /></div>
            <div className="con-panel wide"><b>Value bridge</b><div className="con-bars">{d.bridgeBars.map((h, i) => <i key={i} style={{ height: h }} />)}</div></div>
          </div>
        </>
      ),
      phone: (
        <>
          <div className="con-strip sm"><span style={{ color: d.state.tone }}>◉ {d.energy}</span><span className="mono">{d.decisions}</span></div>
          <div className="con-panel"><b>Queue</b><div className="con-skel" /><div className="con-skel" /></div>
        </>
      ),
    },
    {
      key: 'living', name: 'Homepage H2 — Living Enterprise Dashboard',
      why: 'The enterprise as an organism: the breathing energy hero, weather, momentum arrows — state before tasks. Calm, ambient, alive.',
      desk: (
        <>
          <div className="con-row" style={{ justifyContent: 'center', marginTop: 6 }}>
            <span className="con-ring lg fx-breathe" style={{ borderColor: d.state.tone, color: d.state.tone }}>{d.energy}</span>
          </div>
          <div className="con-line" style={{ textAlign: 'center' }}>{d.state.label} · {d.weather.icon} {d.weather.label} · {money(Math.round(d.netDay))}/day net</div>
          <div className="con-row" style={{ justifyContent: 'center', gap: 10 }}>
            <Chip tone="var(--green)">▲ {d.mom.accelerating} accelerating</Chip>
            <Chip tone="var(--amber)">▼ {d.mom.decelerating} decelerating</Chip>
            {d.season && <Chip tone="var(--navy)">{d.season.name} in season · {d.season.score}</Chip>}
          </div>
        </>
      ),
      phone: (
        <>
          <span className="con-ring fx-breathe" style={{ borderColor: d.state.tone, color: d.state.tone }}>{d.energy}</span>
          <div className="con-line">{d.weather.label}</div>
          <div className="con-line mono">{money(Math.round(d.netDay))}/day</div>
        </>
      ),
    },
  ]

  return (
    <>
      <div className="card pad section-gap">
        <div className="card-h"><h3>Landing explorations</h3><span className="spacer" /><span className="badge b-grey">live numbers · desktop + mobile</span></div>
        <div className="con-concepts">
          {LANDINGS.map((c) => (
            <div key={c.key} className="con-concept">
              <b className="con-c-n">{c.name}</b>
              <div className="con-frames">
                <Desk title={c.name}>{c.desk}</Desk>
                <Phone title={c.name}>{c.phone}</Phone>
              </div>
              <p className="con-why">{c.why}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card pad section-gap">
        <div className="card-h"><h3>Executive homepage explorations</h3><span className="spacer" /><span className="badge b-grey">two operating registers</span></div>
        <div className="con-concepts two">
          {HOMES.map((c) => (
            <div key={c.key} className="con-concept">
              <b className="con-c-n">{c.name}</b>
              <div className="con-frames">
                <Desk title={c.name}>{c.desk}</Desk>
                <Phone title={c.name}>{c.phone}</Phone>
              </div>
              <p className="con-why">{c.why}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
