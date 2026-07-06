// Ritual Engine (6B item 10) — the operating rhythms as guided, repeatable
// flows: Mission Review (weekly), Season Review (quarterly), Enterprise Reset
// (at season close). The Morning Briefing remains the daily ritual (the
// existing Briefing overlay). Rituals are configurable by scope — enterprise,
// business unit, or region — via the same contextView the command surfaces
// use. Every step is computed from the scoped portfolio.
import { contextView } from './mission.js'
import { missionQueue } from './mission.js'
import { seasonFramework } from './seasons.js'
import { enterpriseEnergy, enterpriseWeather, valueVelocity } from './experience.js'
import { enterpriseHealth } from './intel.js'
import { sustainmentBook, isActive } from './engine.js'
import { money, pct } from './format.js'

export const RITUALS = [
  { key: 'mission', name: 'Mission Review', cadence: 'weekly', blurb: 'the queue, the escalations, the commitments' },
  { key: 'season', name: 'Season Review', cadence: 'quarterly', blurb: 'score the season, bank the lessons' },
  { key: 'reset', name: 'Enterprise Reset', cadence: 'at season close', blurb: 'what carries forward, what renews' },
]

export function runRitual(db, user, key, scope = 'enterprise') {
  const sdb = contextView(db, scope)
  const label = scope === 'enterprise' ? 'Enterprise' : scope.split(/:(.+)/)[1]

  if (key === 'mission') {
    const q = missionQueue(sdb, user)
    const esc = q.missions.filter((m) => m.intel?.escalated)
    const done = (sdb.decision_journal || []).filter((d) => d.auto).slice(0, 4)
    return { name: `Mission Review — ${label}`, steps: [
      { title: 'The queue as it stands', lines: [
        `${q.missions.length} open missions · ${money(q.totalValue)} at stake.`,
        `${q.counts.decision} decisions · ${q.counts.risk} risk escalations · ${q.counts.blocked} blocked.`,
      ] },
      { title: 'What has aged past its welcome', lines: esc.length
        ? esc.slice(0, 4).map((m) => `${m.title} — ${m.intel.escalated}.`)
        : ['Nothing escalated — the queue is inside its thresholds.'] },
      { title: 'Decided since last review', lines: done.length
        ? done.map((d) => `${d.decision}: ${d.title}.`)
        : ['No gate decisions journaled yet this cycle.'] },
      { title: 'The commitments', lines: q.missions.slice(0, 3).map((m, k) => `${k + 1}. ${m.title} — ${m.why}.`) },
    ] }
  }

  if (key === 'season') {
    const f = seasonFramework(sdb)
    const s = f.current || f.seasons.filter((x) => x.score != null).slice(-1)[0]
    if (!s) return { name: `Season Review — ${label}`, steps: [{ title: 'No season data', lines: ['Nothing scored yet at this scope.'] }] }
    return { name: `Season Review — ${label} · ${s.name}`, steps: [
      { title: `${s.name} scoreboard`, lines: [
        `Season score ${s.score} — ${money(s.realized)} landed against ${money(s.expected)} expected.`,
        `Record hygiene ${pct(s.hygiene)} · ${s.decisions} decisions on the record.`,
      ] },
      { title: 'Objectives', lines: s.objectives.map((o) => `${o.done ? '✓' : '○'} ${o.label} — ${o.detail}.`) },
      { title: 'What the season produced', lines: s.achievements.length ? s.achievements.map((a) => `${a.icon} ${a.label}${a.value ? ` (${money(a.value)})` : ''}.`) : ['No achievements banked yet.'] },
      { title: 'Season over season', lines: f.compare.length
        ? f.compare.map((c) => `${c.from} → ${c.to}: ${c.realized >= 0 ? '+' : '−'}${money(Math.abs(c.realized))} realized · ${c.score >= 0 ? '+' : ''}${c.score} pts.`)
        : ['First scored season — the baseline is set.'] },
    ] }
  }

  // enterprise reset — what carries forward, what renews
  const e = enterpriseEnergy(sdb)
  const w = enterpriseWeather(sdb)
  const vel = valueVelocity(sdb)
  const h = enterpriseHealth(sdb)
  const sus = sustainmentBook(sdb)
  const active = sdb.initiatives.filter(isActive)
  return { name: `Enterprise Reset — ${label}`, steps: [
    { title: 'The baseline we reset from', lines: [
      `Energy ${e.score} (${e.state.label}) · health ${h.score} (${h.grade}) · weather ${w.label}.`,
      `Net momentum ${money(Math.round(vel.netPerDay))}/day against ${money(Math.round(vel.neededPerDay))}/day needed.`,
    ] },
    { title: 'What carries forward', lines: [
      `${sus.items?.length ?? 0} sustaining engines at ${((sus.avg ?? 0)).toFixed(2)} durability — the run-rate is kept.`,
      `${active.length} active initiatives and every journaled decision stay on the record.`,
    ] },
    { title: 'What renews', lines: [
      'Season scores archive; objectives re-derive from the new quarter’s plan.',
      'Momentum windows roll forward; the weather re-reads from live conditions.',
    ] },
    { title: 'The one thing to protect', lines: [
      w.recommendation,
    ] },
  ] }
}
