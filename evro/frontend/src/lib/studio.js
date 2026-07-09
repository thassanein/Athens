// EVRO Studio — the configuration layer. It lets an administrator adjust how the
// platform reads and routes value WITHOUT editing code. Two classes of setting,
// kept honestly separate:
//
//   • PRESENTATION overrides (savings-type + lifecycle-stage + approver labels
//     and definitions) apply LIVE across every screen. They change wording, never
//     a number — so the book still reconciles to the dollar.
//
//   • ENGINE-GOVERNED parameters (stage confidence weights, the materiality
//     threshold, gate requirements) are owned by the deterministic engine, which
//     is the single source of truth. Studio lets you edit and PREVIEW them, and
//     stages the change — it never silently rewrites the engine. Promoting a
//     staged change to runtime is a governed, separate step.
//
// This mirrors real enterprise software: config is edited in a console, versioned,
// and promoted — not hot-patched into the calculation core.
import { STAGE_CONFIDENCE, MATERIALITY } from './engine.js'

const KEY = 'evro.studio.v1'

// Engine values, surfaced read-only as the baseline every staged edit starts from.
export const ENGINE_BASELINE = {
  weights: { ...STAGE_CONFIDENCE },
  materiality: MATERIALITY,
}

const EMPTY = { types: {}, stages: {}, approvers: {}, staged: {}, typeOrder: null }
let _cache = null

function read() {
  if (_cache) return _cache
  if (typeof localStorage === 'undefined') { _cache = { ...EMPTY }; return _cache }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    _cache = { ...EMPTY, ...(raw && typeof raw === 'object' ? raw : {}), types: { ...(raw.types || {}) }, stages: { ...(raw.stages || {}) }, approvers: { ...(raw.approvers || {}) }, staged: { ...(raw.staged || {}) } }
  } catch { _cache = { ...EMPTY } }
  return _cache
}
function write(cfg) {
  _cache = cfg
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(cfg)) } catch { /* private mode */ }
}

export function studioConfig() { return read() }

// ── Live presentation overrides (merged by the procurement accessors).
export const typeOverride = (key) => read().types[key] || null
export const stageOverride = (key) => read().stages[key] || null
export const approverOverride = (role) => read().approvers[role] || null

export function setTypeField(key, field, value) {
  const c = read(); c.types = { ...c.types, [key]: { ...(c.types[key] || {}), [field]: value } }; write({ ...c }); return c
}
export function setStageField(key, field, value) {
  const c = read(); c.stages = { ...c.stages, [key]: { ...(c.stages[key] || {}), [field]: value } }; write({ ...c }); return c
}
export function setApproverLabel(role, value) {
  const c = read(); c.approvers = { ...c.approvers, [role]: value }; write({ ...c }); return c
}

// Savings-type display order — a presentation-only priority (drag-to-reorder in
// Studio). It changes the ORDER types appear in the by-type view and legends,
// never a value, so every total still reconciles. `orderTypes` sorts any list of
// {key,…} by the saved order, appending any keys the saved order doesn't mention.
export const typeOrder = () => read().typeOrder || null
export function setTypeOrder(keys) {
  const c = read(); c.typeOrder = Array.isArray(keys) ? [...keys] : null; write({ ...c }); return c
}
export function orderTypes(list) {
  const ord = read().typeOrder
  if (!ord || !ord.length) return list
  const rank = new Map(ord.map((k, i) => [k, i]))
  return [...list].sort((a, b) => (rank.has(a.key) ? rank.get(a.key) : 999) - (rank.has(b.key) ? rank.get(b.key) : 999))
}

// ── Staged engine-governed edits (previewed, never applied to the engine).
export function stagedWeights() { return { ...ENGINE_BASELINE.weights, ...(read().staged.weights || {}) } }
export function stagedMateriality() { const s = read().staged.materiality; return s == null ? ENGINE_BASELINE.materiality : s }
export function setStagedWeight(stage, value) {
  const c = read(); const w = { ...(c.staged.weights || {}), [stage]: value }; c.staged = { ...c.staged, weights: w }; write({ ...c }); return c
}
export function setStagedMateriality(value) {
  const c = read(); c.staged = { ...c.staged, materiality: value }; write({ ...c }); return c
}

// A proposed PHASE-based confidence ladder — the sourcing-funnel curve keyed to
// the five lifecycle phases (not the eight engine stages). Default is the
// 25 / 50 / 75 / 100 structure: pipeline 25%, commit 50%, execute 75%, and the
// rest (realizing, banked) at 100%. Staged and previewed; never applied to the
// engine (which stays keyed by stage and remains the source of truth).
export const PHASE_LADDER_DEFAULT = { pipeline: 0.25, commit: 0.5, execute: 0.75, realized: 1.0, closed: 1.0 }
export function stagedPhaseLadder() { return { ...PHASE_LADDER_DEFAULT, ...(read().staged.phaseLadder || {}) } }
export function setStagedPhaseLadder(phase, value) {
  const c = read(); const pl = { ...(c.staged.phaseLadder || {}), [phase]: value }; c.staged = { ...c.staged, phaseLadder: pl }; write({ ...c }); return c
}

// Is anything different from the engine baseline / defaults?
export function hasStagedChanges() {
  const s = read().staged
  const wChanged = s.weights && Object.entries(s.weights).some(([k, v]) => v !== ENGINE_BASELINE.weights[k])
  const mChanged = s.materiality != null && s.materiality !== ENGINE_BASELINE.materiality
  const plChanged = s.phaseLadder && Object.entries(s.phaseLadder).some(([k, v]) => v !== PHASE_LADDER_DEFAULT[k])
  return !!(wChanged || mChanged || plChanged)
}
export function hasLiveOverrides() {
  const c = read()
  return Object.keys(c.types).length > 0 || Object.keys(c.stages).length > 0 || Object.keys(c.approvers).length > 0 || (Array.isArray(c.typeOrder) && c.typeOrder.length > 0)
}

export function resetStudio() { write({ ...EMPTY, types: {}, stages: {}, approvers: {}, staged: {}, typeOrder: null }); return read() }
export function resetStaged() { const c = read(); c.staged = {}; write({ ...c }); return c }
