// Enterprise Seasons Engine (6B item 4) — the fiscal year as four quarterly
// seasons, each with deterministic objectives, a score, achievements, and a
// reset at the quarter boundary. Expected value per quarter comes from the
// same profile weights the leakage/playback math uses; objectives are computed
// facts, never aspirations invented for the UI. View-only.
import { frame, personName, rav, REALIZING_STAGES, profileWeights } from './engine.js'

const Q = [
  { key: 'q1', name: 'Q1', label: 'Jan–Mar', months: ['01', '02', '03'] },
  { key: 'q2', name: 'Q2', label: 'Apr–Jun', months: ['04', '05', '06'] },
  { key: 'q3', name: 'Q3', label: 'Jul–Sep', months: ['07', '08', '09'] },
  { key: 'q4', name: 'Q4', label: 'Oct–Dec', months: ['10', '11', '12'] },
]

export function seasonFramework(db) {
  const fy = String(db.meta.fiscalYear)
  const { nowMonth } = frame(db)
  const nowMM = nowMonth.slice(5, 7)
  const realizing = db.initiatives.filter((i) => REALIZING_STAGES.includes(i.stage))

  const seasons = Q.map((q) => {
    const status = q.months[0] > nowMM ? 'upcoming' : q.months.includes(nowMM) ? 'current' : 'complete'

    // landings + hygiene inside the quarter
    let realized = 0, validated = 0, unvalidated = 0
    const landings = []
    const byPerson = {}
    for (const i of db.initiatives) for (const a of i.actuals || []) {
      if (!(a.period || '').startsWith(fy) || !q.months.includes((a.period || '').slice(5, 7))) continue
      if (a.validated) {
        realized += a.realized_amount || 0
        validated++
        landings.push({ title: i.title, value: a.realized_amount || 0, owner: personName(db, i.owner_id) })
        for (const c of i.contributions || []) byPerson[c.user_id] = (byPerson[c.user_id] || 0) + (a.realized_amount || 0) * (c.credit_pct / 100)
      } else unvalidated++
    }
    // plan for the quarter — profile-weighted slice of the realizing book
    const qIdx = Q.indexOf(q)
    const expected = realizing.reduce((s, i) => {
      const w = profileWeights(i.profile || 'linear', 12)
      return s + rav(i) * (w[qIdx * 3] + w[qIdx * 3 + 1] + w[qIdx * 3 + 2])
    }, 0)
    // decisions inside the quarter (validations + journal)
    let decisions = (db.decision_journal || []).filter((d) => q.months.includes((d.at || '').slice(5, 7)) && (d.at || '').startsWith(fy)).length
    for (const i of db.initiatives) for (const v of i.validations || [])
      if ((v.decided_at || '').startsWith(fy) && q.months.includes((v.decided_at || '').slice(5, 7))) decisions++

    const delivery = expected > 0 ? Math.min(1.2, realized / expected) : 0
    const hygiene = validated + unvalidated > 0 ? validated / (validated + unvalidated) : 1
    const score = status === 'upcoming' ? null : Math.round(Math.min(100, (0.7 * Math.min(1, delivery) + 0.3 * hygiene) * 100))

    const objectives = status === 'upcoming' ? [] : [
      { label: 'Land the quarter plan', progress: Math.min(1, delivery), detail: `${money0(realized)} of ${money0(expected)} expected`, done: realized >= expected && expected > 0 },
      { label: 'Keep the record clean', progress: hygiene, detail: `${validated} validated · ${unvalidated} pending FP&A`, done: unvalidated === 0 && validated > 0 },
      { label: 'Keep deciding', progress: Math.min(1, decisions / 8), detail: `${decisions} decisions on the record`, done: decisions >= 8 },
    ]

    landings.sort((a, b) => b.value - a.value)
    const top = Object.entries(byPerson).sort((a, b) => b[1] - a[1])[0]
    const achievements = status === 'upcoming' ? [] : [
      landings[0] && { icon: '◆', label: `Biggest landing: ${landings[0].title}`, value: landings[0].value },
      top && { icon: '★', label: `Season MVP: ${personName(db, top[0])}`, value: top[1] },
      decisions >= 8 && { icon: '⚑', label: `${decisions} decisions — governance held its rhythm` },
    ].filter(Boolean)

    return { ...q, status, realized, expected, score, delivery, hygiene, decisions, objectives, achievements, landings: landings.slice(0, 3) }
  })

  // comparisons across scored seasons
  const scored = seasons.filter((s) => s.score != null)
  const compare = scored.length > 1 ? scored.slice(1).map((s, i) => ({
    from: scored[i].name, to: s.name,
    realized: s.realized - scored[i].realized,
    score: s.score - scored[i].score,
  })) : []

  const current = seasons.find((s) => s.status === 'current') || null
  return { seasons, compare, current, resetNote: 'seasons reset at each quarter close — scores are archived, objectives renew' }
}

const money0 = (n) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`)
