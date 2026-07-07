// Signature Moments + Motion catalog (6D Wave 6) — the audit made explicit.
//
// The brief names eight signature moments and ten motion verbs. This registry
// maps each moment to the REAL trigger that fires it and the code that owns
// it, and each verb to its meaning and reduced-motion behaviour — so coverage
// is auditable, not asserted. No moment is staged; every one is grounded in an
// actual event or threshold. No confetti, no points — elegant motion, honest
// language, value evidence.

// status: 'live' = wired and firing today · every moment here is live.
export const SIGNATURE_MOMENTS = [
  {
    key: 'first-login', name: 'First login', motion: 'expand + glow',
    trigger: 'First entry on a device (signature not yet marked "welcomed").',
    source: 'Signature.jsx · welcomeBeats() · signatureSeen("welcomed")',
    expression: 'Three beats over the live numbers — "this is your enterprise, alive." Skippable, once per device.',
  },
  {
    key: 'morning-briefing', name: 'Morning briefing', motion: 'expand',
    trigger: 'Opening the briefing (My briefing / the daily ritual).',
    source: 'Briefing.jsx · briefing.js',
    expression: 'Opened under the COMMAND BRIEFING stamp with live energy and weather — a ritual, not a modal.',
  },
  {
    key: 'ai-discovery', name: 'AI discovery', motion: 'signal',
    trigger: 'First visit to Chief of Staff (signature not yet marked "aiDiscovered").',
    source: 'signature.js · markSignature("aiDiscovered")',
    expression: 'The mission replay points itself out once — the moment the AI becomes legible.',
  },
  {
    key: 'synergy', name: 'Synergy detected', motion: 'flow',
    trigger: 'The portfolio structure yields an enables-link, shared market, or repeatable win.',
    source: 'signature.js · detectSynergies()',
    expression: 'The system reads real structure — two initiatives that compound, drawn as a flow.',
  },
  {
    key: 'mission-complete', name: 'Mission complete', motion: 'glow',
    trigger: 'A mission closes / a gate clears.',
    source: 'mission-engine.js · missionCeremony() → celebrations pipeline',
    expression: 'What was unblocked, the dollar unlocked, and the note that the journal wrote itself — the value, not the click.',
  },
  {
    key: 'value-realized', name: 'Value realized', motion: 'glow',
    trigger: 'Realized value crosses a milestone band ($500K / $1M / $1.5M …).',
    source: 'achievements.js · orgMilestones() → detectCelebrations()',
    expression: 'An enterprise milestone — crossed on a real date, evidenced by the bridge, never a vanity badge.',
  },
  {
    key: 'health-recovered', name: 'Health recovered', motion: 'breathe',
    trigger: 'Enterprise-health grade band steps UP (e.g. BB → BBB).',
    source: 'intel.js · enterpriseHealth() → detectCelebrations() [6D Wave 6]',
    expression: 'The rings breathe steadier — a recovery across a grade boundary the record can prove.',
  },
  {
    key: 'season-close', name: 'Season close', motion: 'breathe',
    trigger: 'A season ends / a perfect season is earned.',
    source: 'seasons.js · seasonFramework() · orgMilestones (perfect season)',
    expression: 'Scores archive, objectives renew, the record stays — reviewed as a ritual, celebrated when earned.',
  },
]

// The ten motion verbs the brief names — meaning, where they live, and what
// reduced-motion leaves behind. Every animated class sits inside a
// prefers-reduced-motion: no-preference guard; under reduce it rests here.
export const MOTION_CATALOG = [
  { verb: 'breathe', means: 'alive — a living gauge or health', where: '.fx-breathe (energy ring, pulse rings)', reduced: 'rests at full size' },
  { verb: 'pulse', means: 'needs attention — an alert or ask', where: '.fx-pulse (weather alert, urgent chips)', reduced: 'rests at full opacity' },
  { verb: 'flow', means: 'value moving between things', where: '.fx-flow (value graph, synergy links)', reduced: 'static gradient' },
  { verb: 'drift', means: 'ambient settle — nothing urgent', where: '.fx-drift (ornamental depth)', reduced: 'no translation' },
  { verb: 'expand', means: 'arrival — content enters, never blinks in', where: '.fx-expand / .fx-collapse-in (drawers, panels)', reduced: 'appears in place' },
  { verb: 'collapse', means: 'leaving — a section closing', where: '.fx-collapse-in reverse (evidence, shadow note)', reduced: 'hides in place' },
  { verb: 'orbit', means: 'a continuous process running', where: '.fx-orbit (process indicators)', reduced: 'holds position' },
  { verb: 'signal', means: 'AI sensing — a detection propagating', where: '.fx-signal / the Signal glyph', reduced: 'holds at full opacity' },
  { verb: 'orient', means: 'decision direction — a heading sought', where: '.fx-orient / the Compass needle', reduced: 'holds its heading' },
  { verb: 'glow', means: 'an earned moment — ceremony only', where: '.fx-glow (celebrations, milestones)', reduced: 'steady highlight, no pulse' },
]
