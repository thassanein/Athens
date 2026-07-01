// Athens Value Creation Movement (AVCM) — view-only orchestration for the
// enterprise adoption hub: geo/org leaderboards (from the seed region/yard/BU
// tags), value awards, and engagement analytics. Composes engine outputs; no
// engine change.
import { realizedYTD, forecastRemainderFY, rav, recognition, streakFor } from './engine.js'

export const GEO_DIMS = [
  { key: 'region', label: 'Region' },
  { key: 'yard', label: 'Yard' },
  { key: 'business_unit', label: 'Business unit' },
]

const initTotalFY = (i, db) => realizedYTD(i, db) + forecastRemainderFY(i, db)
const activeSet = (db) => db.initiatives.filter((i) => i.stage !== 'proposed')

// Ranked value by a geographic / org dimension.
export function geoLeaderboard(db, dimension = 'region') {
  const groups = {}
  for (const i of activeSet(db)) { const k = i[dimension] || '—'; (groups[k] ||= []).push(i) }
  return Object.entries(groups).map(([name, list]) => ({
    name,
    realized: list.reduce((s, i) => s + realizedYTD(i, db), 0),
    totalFY: list.reduce((s, i) => s + initTotalFY(i, db), 0),
    count: list.length,
    people: new Set(list.map((i) => i.owner_id)).size,
  })).sort((a, b) => b.totalFY - a.totalFY)
}

export function movementStats(db) {
  const active = activeSet(db)
  const contributors = new Set()
  for (const i of active) { contributors.add(i.owner_id); (i.contributions || []).forEach((c) => contributors.add(c.user_id)) }
  return {
    participants: contributors.size,
    totalPeople: db.people.length,
    valueCreated: active.reduce((s, i) => s + realizedYTD(i, db), 0),
    totalFY: active.reduce((s, i) => s + initTotalFY(i, db), 0),
    activeInitiatives: active.length,
  }
}

// Adoption / engagement ratios (0..1) — the health of the movement itself.
export function engagement(db) {
  const active = activeSet(db)
  const n = active.length || 1
  const owners = new Set(active.map((i) => i.owner_id))
  const withCollab = active.filter((i) => (i.comments || []).length || (i.tasks || []).length).length
  const validated = active.filter((i) => i.baseline?.validated_by).length
  const streakers = db.people.filter((p) => streakFor(db, p.id) > 0).length
  return [
    { key: 'participation', label: 'Participation', value: owners.size / db.people.length, hint: `${owners.size} of ${db.people.length} people own value` },
    { key: 'collab', label: 'Collaboration adoption', value: withCollab / n, hint: `${withCollab} of ${n} initiatives have comments or tasks` },
    { key: 'validation', label: 'FP&A validation coverage', value: validated / n, hint: `${validated} of ${n} baselines validated` },
    { key: 'streak', label: 'Streak participation', value: streakers / db.people.length, hint: `${streakers} people on an active streak` },
  ]
}

// Value awards — deterministic "hall of fame" for the current fiscal period.
export function valueAwards(db) {
  const rec = recognition(db)
  const champ = rec.people[0]
  const active = activeSet(db)
  const biggest = [...active].sort((a, b) => rav(b) - rav(a))[0]
  const topRegion = geoLeaderboard(db, 'region')[0]
  const topYard = geoLeaderboard(db, 'yard')[0]
  const topBU = geoLeaderboard(db, 'business_unit')[0]
  const club = rec.millionClub[0]
  return [
    champ && { icon: '🏆', award: 'Value Champion', winner: champ.name, value: champ.totalFY, sub: `${champ.level} · ${champ.fn}` },
    biggest && { icon: '🚀', award: 'Biggest Return', winner: biggest.title, value: rav(biggest), sub: 'risk-adjusted value', id: biggest.id },
    topRegion && { icon: '📍', award: 'Top Region', winner: topRegion.name, value: topRegion.totalFY, sub: `${topRegion.count} initiatives` },
    topYard && { icon: '🏭', award: 'Top Yard', winner: topYard.name, value: topYard.totalFY, sub: `${topYard.count} initiatives` },
    topBU && { icon: '⚙️', award: 'Top Business Unit', winner: topBU.name, value: topBU.totalFY, sub: `${topBU.count} initiatives` },
    club && { icon: '💎', award: 'Million Dollar Club', winner: club.name, value: club.totalFY, sub: `${club.level} · $1M+ total FY` },
  ].filter(Boolean)
}
