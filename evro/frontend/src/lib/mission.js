// Enterprise Mission Control (Phase 5B.5) — deterministic executive health
// signals composed for the flagship command center. View-only: builds on the
// existing pulse + rollup + controlTower engines; no engine/business change.
import { enterprisePulse } from './pulse.js'
import { controlTower, isActive, rav, REALIZING_STAGES } from './engine.js'
import { money, pct } from './format.js'

const clamp01 = (v) => Math.max(0, Math.min(1, isFinite(v) ? v : 0))

// The Enterprise Pulse Ring — five concentric "activity rings", each a 0..1
// progress value with a colour and a plain-language detail. Reuses the pulse
// axes plus value-created and a transformation-progress measure.
export function missionHealth(db) {
  const pulse = enterprisePulse(db)
  const roll = pulse.roll
  const ct = controlTower(db)
  const recs = db.ai_recommendations || []
  const aiConfidence = recs.length ? recs.reduce((a, r) => a + (r.confidence || 0), 0) / recs.length : 0
  const axis = (k) => pulse.axes.find((a) => a.key === k)?.value ?? 0

  const active = db.initiatives.filter(isActive)
  const activeRav = active.reduce((a, i) => a + rav(i), 0)
  const realizingRav = active.filter((i) => REALIZING_STAGES.includes(i.stage)).reduce((a, i) => a + rav(i), 0)
  const transformation = clamp01(activeRav ? realizingRav / activeRav : 0)
  const riskControl = clamp01(1 - ct.valueAtRisk / Math.max(1, ct.raPipeline + ct.valueAtRisk))

  const rings = [
    { key: 'created', label: 'Value Created', value: axis('realization'), color: '#3FC97F', detail: `${money(roll.realizedYTD)} realized` },
    { key: 'risk', label: 'Value at Risk', value: riskControl, color: '#E5484D', detail: `${money(ct.valueAtRisk)} exposed`, invert: true },
    { key: 'velocity', label: 'Execution Velocity', value: axis('momentum'), color: '#4F8DF2', detail: 'pipeline maturing' },
    { key: 'adoption', label: 'Adoption', value: axis('durability'), color: '#8B5CF6', detail: 'recurring value share' },
    { key: 'transformation', label: 'Transformation', value: transformation, color: '#F5A524', detail: 'value reaching realization' },
  ]

  // Enterprise health signals — each answers "what happened", framed for the
  // 30-second read.
  const signals = [
    { key: 'created', label: 'Value created (YTD)', value: money(roll.realizedYTD), tone: 'green', note: 'FP&A-validated, booked' },
    { key: 'leakage', label: 'Value leakage', value: money(roll.leakage), tone: 'red', note: 'negotiated, not yet implemented' },
    { key: 'atrisk', label: 'Value at risk', value: money(ct.valueAtRisk), tone: 'red', note: `${pulse.redCount} initiatives red` },
    { key: 'velocity', label: 'Execution velocity', value: pct(axis('momentum')), tone: 'navy', note: 'share at Capability+' },
    { key: 'transformation', label: 'Transformation progress', value: pct(transformation), tone: 'amber', note: 'value reaching realization' },
    { key: 'ai', label: 'AI confidence', value: pct(aiConfidence), tone: 'navy', note: `${recs.length} agent signals` },
  ]

  return { pulse, rings, signals, aiConfidence, ct, roll }
}
