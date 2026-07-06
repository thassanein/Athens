import { useMemo, useState } from 'react'
import { welcomeBeats, detectSynergies, signatureSeen, markSignature } from '../lib/signature.js'
import { enterpriseEnergy, enterpriseWeather } from '../lib/experience.js'
import { aiPresence } from '../lib/presence.js'
import { money } from '../lib/format.js'
import { IconAI } from './Icons.jsx'
import { BrandMark } from './Brand.jsx'

// Signature experiences (6B item 12): the one-time first-login welcome and
// the synergy-detection moment. Executive-grade, computed live, per-device.

export function SignatureWelcome({ db, user, onDone }) {
  const [beat, setBeat] = useState(0)
  const beats = useMemo(() => welcomeBeats(db, user, {
    energy: enterpriseEnergy(db), weather: enterpriseWeather(db), agents: aiPresence(db, user, 'morning').agents,
  }), [db, user])
  const b = beats[beat]
  const done = () => { markSignature('welcomed'); onDone() }

  return (
    <div className="sig-scrim" role="dialog" aria-label="Welcome to Athens OS">
      <div className="sig-card fx-expand">
        <div className="sig-brand"><BrandMark size={44} id="sgb" /><span>Athens OS</span></div>
        <div className="sig-beat" key={beat}>
          <div className="sig-t">{b.title}</div>
          {b.lines.map((l, k) => <p key={k} className="sig-l">{l}</p>)}
        </div>
        <div className="sig-nav">
          <button className="btn sm ghost" onClick={done}>Skip</button>
          <span className="rit-dots">{beats.map((_, k) => <i key={k} className={k === beat ? 'on' : ''} />)}</span>
          {beat < beats.length - 1
            ? <button className="btn sm" onClick={() => setBeat(beat + 1)}>Next →</button>
            : <button className="btn sm" onClick={done}>Begin →</button>}
        </div>
      </div>
    </div>
  )
}

// AI discovery moment — first visit to the Chief of Staff.
export function DiscoveryMoment({ onDismiss }) {
  return (
    <div className="sig-disc fx-expand" style={{ '--fx-accent': 'var(--navy)' }}>
      <span className="sig-disc-i fx-glow"><IconAI /></span>
      <div className="sig-disc-m">
        <b>Meet your agent team.</b>
        <span>Run the <b>mission replay</b> below to watch how a recommendation is actually made — evidence, disagreement, resolution. Once seen, never doubted.</span>
      </div>
      <button className="btn sm ghost" onClick={onDismiss}>Got it</button>
    </div>
  )
}

// Synergy detection moment + the full list behind it.
export function SynergyMoments({ db, navigate }) {
  const all = useMemo(() => detectSynergies(db), [db])
  const [dismissed, setDismissed] = useState(() => signatureSeen('synergyIntro'))
  const [showAll, setShowAll] = useState(false)
  if (!all.length) return null
  const top = all[0]

  return (
    <div className="card pad section-gap">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3>Synergies detected</h3>
        <span className="badge b-navy"><IconAI /> {all.length} found · structural, not staged</span>
        <span className="spacer" />
        <button className="btn sm ghost" onClick={() => setShowAll(!showAll)}>{showAll ? 'Top only' : 'Show all'}</button>
      </div>
      {!dismissed && (
        <div className="sig-disc" style={{ '--fx-accent': 'var(--green)', marginBottom: 10 }}>
          <span className="sig-disc-i fx-glow">◈</span>
          <div className="sig-disc-m">
            <b>The system reads the structure of the portfolio.</b>
            <span>Enables-links, shared markets and repeatable wins — surfaced so the owners connect before the leverage is gone.</span>
          </div>
          <button className="btn sm ghost" onClick={() => { markSignature('synergyIntro'); setDismissed(true) }}>Got it</button>
        </div>
      )}
      {(showAll ? all : [top]).map((s) => (
        <div key={s.key} className="sig-syn">
          <span className="sig-syn-k">{s.kind === 'enables' ? '⛓' : s.kind === 'repeatable' ? '↻' : '⇄'}</span>
          <div className="sig-syn-m">
            <b>{s.title}</b>
            <span>{s.detail}</span>
          </div>
          <span className="mono sig-syn-v">{money(s.value)}</span>
          {s.ids?.[0] && <button className="btn sm" onClick={() => navigate('initiative', { id: s.ids[0] })}>Open →</button>}
        </div>
      ))}
    </div>
  )
}
