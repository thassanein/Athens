// AVCM expansion — Value Champions, Million Dollar Club, awards, gamification
// and the Value Summit. View-only orchestration over existing engine outputs
// (recognition / leaderboard / points / streaks) and the movement helpers.
// Deterministic / rules-based; does NOT touch the engine or any logic.
import { recognition, POINT_LEVELS, rankInitiatives } from './engine.js'
import { movementStats, valueAwards, geoLeaderboard } from './movement.js'

const LEVELS_ASC = [...POINT_LEVELS].sort((a, b) => a.min - b.min) // Bronze → Platinum
const MDC = 1_000_000

// Champions with tier progress + rank — the gamification ladder.
export function championList(db) {
  return recognition(db).people.map((p, i) => {
    const cur = LEVELS_ASC.filter((l) => l.min <= p.points).pop() || LEVELS_ASC[0]
    const next = LEVELS_ASC.find((l) => l.min > p.points) || null
    const progress = next ? (p.points - cur.min) / (next.min - cur.min) : 1
    return { ...p, rank: i + 1, next, toNext: next ? next.min - p.points : 0, progress: Math.max(0, Math.min(1, progress)) }
  })
}

// Million Dollar Club — inducted members (medal by total FY) + those approaching.
export function millionClub(db) {
  const rec = recognition(db)
  const members = rec.millionClub
    .map((p) => ({ ...p, medal: p.totalFY >= 3e6 ? 'gold' : p.totalFY >= 2e6 ? 'silver' : 'bronze' }))
    .sort((a, b) => b.totalFY - a.totalFY)
  const approaching = rec.people
    .filter((p) => p.totalFY >= 750_000 && p.totalFY < MDC)
    .map((p) => ({ ...p, progress: p.totalFY / MDC }))
    .sort((a, b) => b.totalFY - a.totalFY)
  return { members, approaching, count: members.length }
}

// Awards gallery — the movement's six + recognition-driven honours.
export function awardsGallery(db) {
  const base = valueAwards(db)
  const people = recognition(db).people
  const streaker = [...people].sort((a, b) => b.streak - a.streak)[0]
  const recurring = [...people].filter((p) => p.totalFY > 0).sort((a, b) => b.recurringRatio - a.recurringRatio)[0]
  const riser = [...people].sort((a, b) => b.realized - a.realized)[0]
  const extra = [
    streaker && streaker.streak > 0 && { icon: '🔥', award: 'Streak Leader', winner: streaker.name, value: null, sub: `${streaker.streak}-month validated streak` },
    recurring && recurring.recurringRatio > 0 && { icon: '♻️', award: 'Recurring Hero', winner: recurring.name, value: recurring.totalFY, sub: `${Math.round(recurring.recurringRatio * 100)}% recurring value` },
    riser && riser.realized > 0 && { icon: '📈', award: 'Top Realizer', winner: riser.name, value: riser.realized, sub: 'most FP&A-validated value' },
  ].filter(Boolean)
  return [...base, ...extra]
}

// Gamification snapshot — levels, points, streaks, badges.
export function gamificationStats(db) {
  const rec = recognition(db)
  const people = rec.people
  const badges = {}
  for (const p of people) for (const bdg of p.badges || []) badges[bdg] = (badges[bdg] || 0) + 1
  return {
    byLevel: rec.byLevel,
    totalPoints: people.reduce((s, p) => s + p.points, 0),
    players: people.filter((p) => p.points > 0).length,
    streakers: people.filter((p) => p.streak > 0).length,
    longestStreak: Math.max(0, ...people.map((p) => p.streak)),
    badges: Object.entries(badges).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    millionClub: rec.millionClub.length,
  }
}

// The Value Summit headline — the celebration's marquee facts.
export function summitHighlights(db) {
  const rec = recognition(db)
  const ms = movementStats(db)
  const top = rankInitiatives(db, 'return')[0]
  return {
    fiscalYear: db.meta.fiscalYear,
    champion: rec.people[0] || null,
    valueCreated: ms.valueCreated,
    totalFY: ms.totalFY,
    participants: ms.participants,
    totalPeople: ms.totalPeople,
    record: top ? { title: top.title, value: top.rav, id: top.id } : null,
    topRegion: geoLeaderboard(db, 'region')[0] || null,
    topBU: geoLeaderboard(db, 'business_unit')[0] || null,
  }
}

export const LEVEL_TONE = { Platinum: 'b-navy', Gold: 'b-amber', Silver: 'b-grey', Bronze: 'b-red' }
export const MEDAL = { gold: '🥇', silver: '🥈', bronze: '🥉' }
