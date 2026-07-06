// EVRO brand system (6C.1) — the manifesto, positioning and signature-moment
// registry, in one place so the in-app Brand page and the written guidelines
// never drift. Copy only; no logic.

export const MANIFESTO = {
  opening: 'The enterprise is alive. EVRO exists to make that visible — and to help the people who run it act on what they see.',
  beliefs: [
    'Value is created, not reported. Software should move it, not merely describe it.',
    'Nothing is staged. Every number on every screen traces to the operating record.',
    'The preparation belongs to the system; the decision belongs to the human.',
    'Momentum compounds — and so does leakage. Both deserve to be seen every day.',
    'Trust is earned by showing your work: confidence stated, evidence attached, dissent retained.',
  ],
  philosophy: [
    'An operating system, not an application — rhythms, rituals, presence, memory.',
    'Calm instruments over loud dashboards: Bloomberg’s discipline, Mission Control’s focus.',
    'Motion has meaning. Things breathe because they are alive; they pulse because they need you.',
    'Executive-grade restraint: one refined card, a quiet glow, never confetti.',
  ],
  principles: [
    'Everything communicates state.',
    'Everything communicates momentum.',
    'Progress must be visible.',
    'Enterprise health must be intuitive.',
    'Performance and accessibility are mandatory.',
    'Honesty is the brand: proxies are labelled, projections say so, gaps are stated.',
  ],
  voice: [
    'Declarative and concrete: "the record", "on the books", "the decision is yours".',
    'Numerate — a claim without its number is not finished.',
    'Never hypes, never invents; a coverage gap is stated, not scored.',
    'Warm at the moments that deserve it — a welcome, a milestone, a lesson learned.',
  ],
}

export const EVRO_IS = [
  'Enterprise Intelligence Operating System',
  'Enterprise Mission Control',
  'Enterprise Value Platform',
  'AI Chief of Staff Platform',
  'Behavioral Enterprise Operating System',
  'Digital Enterprise Twin',
]
export const EVRO_IS_NOT = [
  'ERP software',
  'Business-intelligence dashboards',
  'Project management software',
  'Traditional enterprise applications',
  'Consumer gamification products',
]

export const SIGNATURE_MOMENTS = [
  { key: 'welcome', name: 'First login', line: 'Three beats over the live numbers — "this is your enterprise, alive." Once per device, skippable, never staged.' },
  { key: 'briefing', name: 'Morning briefing', line: 'The daily ritual, opened under the COMMAND BRIEFING stamp with live energy and weather.' },
  { key: 'completion', name: 'Mission completion', line: 'The ceremony: what was unblocked, the dollar, and the note that the journal wrote itself.' },
  { key: 'discovery', name: 'AI discovery', line: 'First visit to the Chief of Staff points at the mission replay — once seen, never doubted.' },
  { key: 'synergy', name: 'Synergy detection', line: 'The system reads the structure of the portfolio — enables-links, shared markets, repeatable wins.' },
  { key: 'season', name: 'Season close', line: 'Scores archive, objectives renew, the record stays — reviewed as a ritual, celebrated when earned.' },
]

export const MOTION_PRINCIPLES = [
  { fx: 'fx-breathe', name: 'Breathe', use: 'The living state — the energy ring, the mark. Slow, subtle, never on data.' },
  { fx: 'fx-pulse', name: 'Pulse', use: 'Needs attention — the active agent, an executive alert.' },
  { fx: 'fx-glow', name: 'Glow', use: 'A moment being honoured — ceremonies and celebrations only.' },
  { fx: 'fx-float', name: 'Float', use: 'Ambient life on ornamental elements — never on numbers.' },
  { fx: 'fx-rotate', name: 'Rotate', use: 'Continuous processes, sparingly.' },
  { fx: 'fx-expand', name: 'Expand', use: 'Every entrance — content arrives, it does not just appear.' },
]

// ---------------------------------------------------------------------------
// 6C.1B Wave 4 — the motion identity and the finalized manifesto.

// Motion relationships across the four identity layers. Each layer owns its
// verbs; the laws below keep four moving systems feeling like one identity.
export const MOTION_IDENTITY = [
  { layer: 'Master Brand', verbs: 'glint', means: 'The gold apex catches light — 3.6s, the apex only.', law: 'The signature never breathes and never travels. A master brand that dances is a mascot.' },
  { layer: 'Enterprise Compass', verbs: 'orient · lock', means: 'The needle searches while decisions are open; the lock ring settles when a heading is held.', law: 'Moves only when the decision state moves — a compass that dances is a compass nobody trusts.' },
  { layer: 'Pulse Rings', verbs: 'breathe · sweep', means: 'The living gauge breathes; sweeps move when scores move.', law: 'Ambient only where the enterprise is live — vitals, pulse, mission surfaces.' },
  { layer: 'Enterprise Signal', verbs: 'propagate · contact', means: 'Fronts propagate from the origin; the gold contact pings on a confirmed detection.', law: 'Event-driven: the AI moves when it senses, never to look busy.' },
]

export const MOTION_LAWS = [
  'One moving layer per surface — motion hierarchy follows identity hierarchy.',
  'Transform and opacity only, with the one honoured exception: glow animates box-shadow at low frequency, for ceremonies.',
  'prefers-reduced-motion is mandatory. Under reduce, every state rests in its final pose — nothing is lost but the movement.',
  'Motion must mean something: a state change, a detection, a living gauge. Never decoration.',
]

// The emotional language — what the identity is allowed to make you feel,
// and the surfaces responsible for it. Five registers; nothing outside them.
export const EMOTIONAL_REGISTER = [
  { feeling: 'Calm authority', lives: 'the master brand, the boardroom lockup, the type hierarchy' },
  { feeling: 'Earned confidence', lives: 'numbers that reconcile, provenance on every claim, formulas on every ring' },
  { feeling: 'Quiet urgency', lives: 'weather, the risk ring, the alert line — felt, never shouted' },
  { feeling: 'Momentum', lives: 'velocity telemetry, the momentum chips, the breathing gauge' },
  { feeling: 'Ceremony', lives: 'seasons, celebrations, the vertical lockup — rare by design, so it stays worth feeling' },
]

// The convergence, closed.
export const MANIFESTO_CLOSE = 'Four systems, one identity: the monogram signs, the compass orients, the rings gauge, the signal senses. Nothing decorative, nothing borrowed, nothing that lies.'
