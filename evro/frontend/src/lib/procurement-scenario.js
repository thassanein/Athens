// Procurement what-if — a deterministic projection model. Move three levers and
// the savings, forecast and confidence recompute from the current book. It never
// changes the record: it projects, clearly labelled, from the live baseline.
import { procurementModel } from './procurement.js'
import { leakageBreakdown } from './engine.js'

export const LEVERS = [
  { key: 'adoption', label: 'On-contract compliance', min: 40, max: 100, base: 70, unit: '%', help: 'Share of committed value that actually flows as a run-rate (higher = less maverick spend / less leakage).' },
  { key: 'win', label: 'Negotiation win', min: -15, max: 20, base: 0, unit: '%', help: 'Change to negotiated savings depth versus the current plan.' },
  { key: 'timing', label: 'Realization speed', min: 0, max: 100, base: 50, unit: '%', help: 'How much of the projected run-rate lands within this fiscal year.' },
]
export const baseLevers = () => Object.fromEntries(LEVERS.map((l) => [l.key, l.base]))

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// Project the book under one lever setting. Pure of any baseline framing so we
// can run it twice — once at the baseline levers (the do-nothing case) and once
// at the operator's levers — and report the difference.
function project(anchor, L) {
  const committed = anchor.committed * (1 + L.win / 100)
  const runRate = (L.adoption / 100) * committed
  const realizedFY = Math.max(anchor.realizedYTD, anchor.realizedYTD + (L.timing / 100) * (runRate - anchor.realizedYTD))
  const leakage = anchor.leakage * (1 - L.adoption / 100)
  const confidence = clamp(anchor.confidence + (L.adoption - 70) / 200 + (L.win / 100) * 0.3, 0, 1)
  return { committed, runRate, realizedFY, leakage, confidence }
}

export function scenario(db, levers = {}) {
  const m = procurementModel(db)
  const leak = leakageBreakdown(db)
  const L = { ...baseLevers(), ...levers }
  const anchor = {
    committed: m.sum.lenses.committed,
    realizedYTD: m.sum.lenses.realized,
    leakage: leak.total,
    confidence: m.sum.confidence,
  }
  // The "now" a what-if compares against is the do-nothing projection (levers at
  // baseline), not the raw record — so moving nothing yields a zero delta and the
  // gain is purely the value of the change. Negotiation win scales committed
  // depth; on-contract compliance converts committed to a run-rate and squeezes
  // leakage; realization speed lands the run-rate within this fiscal year.
  const base = project(anchor, baseLevers())
  const projected = project(anchor, L)
  return {
    base: { ...base, realizedYTD: base.realizedFY, committed: base.runRate },
    levers: L, projected,
    gain: projected.realizedFY - base.realizedFY,
  }
}
