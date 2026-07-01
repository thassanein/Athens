// Enterprise Value Graph — view-only relationship model. Groups active
// initiatives by a chosen dimension (region / business unit / department /
// owner), each with total FY value, at-risk share and initiative leaves, plus
// portfolio concentration stats (HHI). Composes engine outputs; deterministic;
// no engine, schema, or logic change.
import { isActive, rav, realizedYTD, forecastRemainderFY, personName } from './engine.js'

export const GRAPH_DIMS = [
  { key: 'region', label: 'Region' },
  { key: 'business_unit', label: 'Business unit' },
  { key: 'department', label: 'Department' },
  { key: 'owner_id', label: 'Owner' },
]

const initTotalFY = (i, db) => realizedYTD(i, db) + forecastRemainderFY(i, db)

export function buildValueGraph(db, { dimension = 'region', pillar = 'all' } = {}) {
  let inits = db.initiatives.filter(isActive)
  if (pillar !== 'all') inits = inits.filter((i) => i.pillar === pillar)

  const groups = {}
  for (const i of inits) {
    const key = String(dimension === 'owner_id' ? i.owner_id : (i[dimension] || '—'))
    ;(groups[key] ||= []).push(i)
  }

  const groupList = Object.entries(groups).map(([key, list]) => ({
    id: 'g:' + key, key,
    label: dimension === 'owner_id' ? personName(db, key) : key,
    value: list.reduce((s, i) => s + initTotalFY(i, db), 0),
    count: list.length,
    atRisk: list.filter((i) => i.status_rag === 'red').length,
    nodes: list
      .map((i) => ({ id: i.id, title: i.title, rav: rav(i), rag: i.status_rag, stage: i.stage }))
      .sort((a, b) => b.rav - a.rav),
  })).sort((a, b) => b.value - a.value)

  const total = groupList.reduce((s, g) => s + g.value, 0) || 1
  const shares = groupList.map((g) => g.value / total)
  return {
    dimension, total, groupList, initiatives: inits.length,
    concentration: {
      hhi: shares.reduce((s, x) => s + x * x, 0), // 0..1 (Herfindahl)
      topShare: shares[0] || 0,
      top3Share: shares.slice(0, 3).reduce((a, b) => a + b, 0),
      groups: groupList.length,
      topGroup: groupList[0] || null,
    },
  }
}
