// Initiative health — 6-dimension execution health scored from existing engine
// signals (derived proxies, labeled as such in the UI). Current + a forecast
// overlay (projected as the initiative matures). No engine change.
import { confidence, roi, sustainmentScore, realizedYTD, expectedToDate } from './engine.js'

export const HEALTH_DIMS = ['Financial', 'Implementation', 'Technology', 'Adoption', 'Governance', 'Sustainment']

const clamp = (x) => Math.max(0.03, Math.min(1, x))
const riskSev = (i, cats) => {
  const rs = (i.risks || []).filter((r) => cats.includes(r.category))
  return rs.length ? Math.min(1, Math.max(...rs.map((r) => r.score)) / 25) : 0
}

export function initiativeHealth(i, db) {
  const c = confidence(i.stage)
  const rf = i.realization_factor ?? 1
  const realizing = ['launch', 'realization', 'sustainment', 'retired'].includes(i.stage)
  const exp = realizing ? expectedToDate(i, db) : 0
  const delivery = realizing && exp ? Math.min(1, realizedYTD(i, db) / exp) : c * 0.9
  const ss = sustainmentScore(i, db)

  const cur = {
    Financial: clamp(i.implementation_cost > 0 ? 0.4 + 0.6 * Math.min(1, roi(i) / 3) : 0.72),
    Implementation: clamp(c),
    Technology: clamp(0.9 - riskSev(i, ['data', 'external'])),
    Adoption: clamp((realizing ? delivery : c * rf) * (1 - 0.4 * riskSev(i, ['adoption']))),
    Governance: clamp((i.baseline?.validated_by ? 0.5 : 0.15) + (i.request ? 0.15 : 0.35) + (i.contributions?.length ? 0.15 : 0)),
    Sustainment: clamp(ss ? ss.score : c * 0.9),
  }
  // Forecast — projected health as the initiative matures (more upside earlier).
  const headroom = (1 - c) * 0.45
  const forecast = {}
  for (const k of HEALTH_DIMS) forecast[k] = clamp(cur[k] + headroom * (1 - cur[k]))

  const overall = HEALTH_DIMS.reduce((s, k) => s + cur[k], 0) / HEALTH_DIMS.length
  return { current: cur, forecast, overall }
}

// Enterprise rollup for the health heatmap (worst-first).
export function portfolioHealth(db) {
  return db.initiatives.filter((i) => i.stage !== 'proposed')
    .map((i) => ({ id: i.id, title: i.title, stage: i.stage, ...initiativeHealth(i, db) }))
    .sort((a, b) => a.overall - b.overall)
}
