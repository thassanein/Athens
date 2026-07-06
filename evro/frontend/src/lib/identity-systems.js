// EVRO identity architecture, layers 2–4 (Phase 6C.1B Wave 2) — the data
// behind the operating systems. View-helpers only: everything here composes
// existing engine and 6B-engine exports; nothing is invented for the visuals.
//
//  Layer 2 · Enterprise Compass — command, navigation, strategy
//  Layer 3 · Pulse Rings        — the enterprise-state operating language
//  Layer 4 · Enterprise Signal  — the AI's own visual language
import { enterpriseEnergy } from './experience.js'
import { momentum } from './momentum.js'
import { enterpriseHealth } from './intel.js'
import { missionHealth, missionQueue } from './mission.js'
import { aiPresence } from './presence.js'

// ---------------------------------------------------------------------------
// Layer 3 — the Pulse Rings, formalized. The brief's five named dimensions,
// each fed by the engine that already owns it (formula carried on the ring):
export function pulseIdentity(db) {
  const e = enterpriseEnergy(db)
  const h = enterpriseHealth(db)
  const m = momentum(db, 'business_unit')
  const mh = missionHealth(db)
  const moving = m.counts.accelerating + m.counts.steady
  const units = Math.max(1, moving + m.counts.decelerating + m.counts.stagnant)
  const risk = mh.rings.find((r) => r.key === 'risk')
  const tf = mh.rings.find((r) => r.key === 'transformation')
  const dims = [
    { key: 'energy', label: 'Energy', score: e.score, color: 'var(--brand-energy)',
      formula: e.formula, detail: e.state.label },
    { key: 'momentum', label: 'Momentum', score: Math.round((moving / units) * 100), color: 'var(--brand-momentum)',
      formula: 'business units accelerating or steady ÷ all units (last 2 months vs the 2 before)',
      detail: `${m.counts.accelerating} accelerating · ${m.counts.decelerating} decelerating` },
    { key: 'health', label: 'Health', score: h.score, color: 'var(--brand-value)',
      formula: 'weighted blend of the six enterprise-health dimensions', detail: `grade ${h.grade}` },
    { key: 'risk', label: 'Risk containment', score: Math.round(risk.value * 100), color: 'var(--brand-risk)',
      formula: '1 − value at risk ÷ (risk-adjusted pipeline + value at risk)', detail: risk.detail },
    { key: 'transformation', label: 'Transformation', score: Math.round(tf.value * 100), color: 'var(--brand-ai)',
      formula: 'risk-adjusted value in realizing stages ÷ active risk-adjusted value', detail: tf.detail },
  ]
  return { dims }
}

// ---------------------------------------------------------------------------
// Layer 2 — the Compass. Its state is not theatre: it reads the mission queue.
//  orient — decisions are open: the enterprise is choosing its heading
//  locked — no open decisions, a ranked mission leads: heading held
//  idle   — the queue is clear: the compass rests
export function compassIdentity(db, user) {
  const q = user ? missionQueue(db, user) : { missions: [], counts: {} }
  const decisions = q.counts.decision || 0
  const top = q.missions[0]
  const state = decisions > 0 ? 'orient' : top ? 'locked' : 'idle'
  const line = decisions > 0
    ? `${decisions} decision${decisions === 1 ? '' : 's'} open — the enterprise is choosing its heading.`
    : top
      ? `Heading held: "${top.title}" leads the queue.`
      : 'Queue clear — the compass rests.'
  return { state, decisions, top: top ? { title: top.title, value: top.value } : null, line }
}

export const COMPASS_STATES = [
  { key: 'idle', label: 'Idle', means: 'nothing to orient — the needle rests at NE, quiet' },
  { key: 'orient', label: 'Orienting', means: 'decisions open — the needle searches until a heading is chosen' },
  { key: 'locked', label: 'Locked', means: 'heading held — the gold needle commits to the ranked mission' },
]

// ---------------------------------------------------------------------------
// Layer 4 — the Signal. State from the real presence layer + mission queue:
//  sensing       — agents watching the record (the rules layer always is)
//  orchestrating — missions ranked and moving through the queue
//  idle          — documented for completeness; a live enterprise rarely rests
export function signalIdentity(db, user, page = 'mission') {
  const p = aiPresence(db, user, page)
  const q = user ? missionQueue(db, user) : { missions: [] }
  const counts = { active: 0, watching: 0, standby: 0 }
  for (const a of p.agents) counts[a.state] += 1
  const state = q.missions.length ? 'orchestrating' : counts.watching ? 'sensing' : 'idle'
  const line = q.missions.length
    ? `${p.lead.name} leads · ${counts.watching} watching · ${q.missions.length} missions under orchestration.`
    : `${p.lead.name} leads · ${counts.watching} agents watching the record.`
  return { state, agents: p.agents, lead: p.lead, counts, missions: q.missions.length, line }
}

export const SIGNAL_STATES = [
  { key: 'idle', label: 'Idle', means: 'fronts at rest — shown for completeness; the rules layer rarely is' },
  { key: 'sensing', label: 'Sensing', means: 'fronts propagate — agents sweeping the live record' },
  { key: 'orchestrating', label: 'Orchestrating', means: 'sensing plus the gold contact — missions ranked and moving' },
]

// ---------------------------------------------------------------------------
// The interaction rules — how four systems stay one identity.
export const HIERARCHY = [
  { n: 1, name: 'The master signs', rule: 'The EV Monogram owns chrome corners, covers and ceremony. It never gauges, never reacts, never animates beyond the apex glint.' },
  { n: 2, name: 'The compass orients', rule: 'The Compass owns direction: mission control, navigation, strategic heading. It moves only when the decision state moves.' },
  { n: 3, name: 'The rings gauge', rule: 'The Pulse Rings own state: energy, momentum, health, risk, transformation. They are the product’s operating language — never a logo.' },
  { n: 4, name: 'The signal senses', rule: 'The Signal owns the AI: presence, sensing, prediction, orchestration. It may annotate any surface; it never replaces the layer it annotates.' },
]

export const COEXISTENCE = [
  'One layer leads per surface — the others may attend, none may compete.',
  'The master brand and the rings never merge: the mark that signs is not the mark that gauges (the 6C.1 lesson, made law).',
  'Gold is the shared grammar and the only crossing token: the master’s apex, the compass’s needle, the signal’s confirmed contact — one value spark, three jobs.',
  'The compass never sits inside a ring stack; the signal never carries state colour — state belongs to the rings alone.',
  'On mobile the layers stack by rank: signature in chrome, compass at the helm, rings compact to one gauge plus chips, signal collapses to its dot.',
]

export const TRANSITIONS = [
  { from: 'Signal', to: 'Compass', when: 'a sensed risk or opportunity becomes a ranked mission — sensing hands to orientation' },
  { from: 'Compass', to: 'Rings', when: 'a decision journals — the heading held becomes state the rings can gauge' },
  { from: 'Rings', to: 'Signal', when: 'a gauge crosses a threshold — state hands back to sensing for the next sweep' },
  { from: 'Master', to: '—', when: 'never. The signature does not participate in the loop; it presides over it.' },
]
