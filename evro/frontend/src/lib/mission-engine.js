// Mission Engine (6B item 5) — mission lifecycle intelligence layered onto
// the existing Mission Queue: difficulty, completion probability, strategic
// weight, and a progression state for every mission, plus the completion-
// ceremony payload the Celebration Framework consumes. All deterministic
// composition; the queue's classes, ranking and actions are unchanged.
import { STAGES, REALIZING_STAGES, isActive, rav, worstRisk, prerequisites, criticalPath } from './engine.js'

const clamp01 = (v) => Math.max(0, Math.min(1, isFinite(v) ? v : 0))

export const DIFFICULTY = [
  { min: 0.8, label: 'Expedition', tone: 'var(--red)' },
  { min: 0.6, label: 'Hard', tone: 'var(--amber)' },
  { min: 0.4, label: 'Demanding', tone: 'var(--navy)' },
  { min: 0.2, label: 'Standard', tone: 'var(--grey-2)' },
  { min: 0, label: 'Routine', tone: 'var(--grey-2)' },
]
const diffBand = (s) => DIFFICULTY.find((d) => s >= d.min)

export const PROGRESSION = {
  open: { label: 'Open', tone: 'var(--grey-2)' },
  moving: { label: 'In motion', tone: 'var(--navy)' },
  blocked: { label: 'Blocked', tone: 'var(--red)' },
  escalated: { label: 'Escalated', tone: 'var(--amber)' },
}

// Strategic weight ★1–5: value share of the credible pipeline, critical-path
// membership, and realizing-stage leverage.
export function missionProfile(db, m) {
  const i = m.refId && String(m.refId).startsWith('i-') ? db.initiatives.find((x) => x.id === m.refId) : null
  const active = db.initiatives.filter(isActive)
  const pipeline = Math.max(1, active.reduce((a, x) => a + rav(x), 0))
  const cp = new Set(criticalPath(db).path.map((x) => x.id))

  // --- difficulty ---
  let diffScore, diffWhy
  if (i) {
    const risk = clamp01(worstRisk(i) / 25)
    const deps = prerequisites(db, i.id).length
    const effort = clamp01((i.effort_score || 0) / 10)
    const stageDist = clamp01((STAGES.indexOf('realization') - STAGES.indexOf(i.stage)) / 5)
    diffScore = 0.35 * risk + 0.25 * clamp01(deps / 3) + 0.2 * effort + 0.2 * stageDist
    diffWhy = [`worst risk ${worstRisk(i)}/25`, deps ? `${deps} prerequisite${deps === 1 ? '' : 's'}` : 'no prerequisites', `effort ${i.effort_score ?? '—'}/10`, `${Math.max(0, STAGES.indexOf('realization') - STAGES.indexOf(i.stage))} stages to realization`]
  } else {
    diffScore = m.cls === 'opportunity' ? 0.45 : 0.3
    diffWhy = [m.cls === 'opportunity' ? 'unclaimed pool — needs an owner and a plan' : 'signal-level work — no delivery risk attached yet']
  }
  const difficulty = { score: diffScore, ...diffBand(diffScore), why: diffWhy }

  // --- completion probability (deterministic estimate, labelled) ---
  const conf = m.intel?.confidence ?? 0.7
  const riskCut = i ? clamp01(worstRisk(i) / 25) : 0
  const depCut = (m.intel?.deps || []).length > 0 ? 0.75 : 1
  const probability = clamp01(conf * (1 - 0.4 * riskCut) * depCut)

  // --- strategic weight ---
  const share = i ? rav(i) / pipeline : (m.value || 0) / pipeline
  let w = 1 + Math.min(2, share * 12)
  if (i && cp.has(i.id)) w += 1
  if (i && REALIZING_STAGES.includes(i.stage)) w += 0.5
  const weight = Math.min(5, Math.round(w))
  const weightWhy = [`${Math.round(share * 100)}% of the credible pipeline`, i && cp.has(i.id) ? 'on the critical path' : null, i && REALIZING_STAGES.includes(i.stage) ? 'protects realizing value' : null].filter(Boolean)

  // --- progression ---
  const state = m.intel?.escalated ? 'escalated'
    : m.cls === 'blocked' ? 'blocked'
    : i && (i.tasks || []).some((t) => t.status === 'open') ? 'moving'
    : 'open'

  return { difficulty, probability, weight, weightWhy, progression: { key: state, ...PROGRESSION[state] } }
}

// Completion ceremony payload — consumed by the Celebration Framework; the
// numbers come from the mission itself, never invented.
export function missionCeremony(db, m) {
  return {
    kind: 'mission-complete',
    title: m.title,
    headline: m.cls === 'decision' ? 'Decision made — value unblocked' : 'Mission complete',
    value: m.value || 0,
    detail: m.cls === 'decision'
      ? 'The gate is cleared and the journal wrote itself. The value moves into the credible pipeline.'
      : 'Closed and on the record.',
  }
}
