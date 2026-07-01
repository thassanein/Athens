import { AUDIT_TEMPLATES, templateKeyForType } from './audit-templates.js'

// Deterministic demo audit so the app shows a realistic "last audit result"
// (and printable report) even with no backend. Live mode uses the database
// instead. Keyed off the site name so each site reads consistently across loads.
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const AUDITORS = ['Dave Marin', 'Matt Niklas', 'Priya Shah', 'Grace Liu']
const NOTES = [
  'Logbook gap noted at last walk-through.',
  'Signage faded — schedule replacement.',
  'Spill kit not fully restocked.',
  'Minor housekeeping needed in this area.',
  'Secondary containment needs re-seal.',
  'BMP inspection record missing for last storm.',
]

export function demoAuditFor(name, site) {
  const tplKey = templateKeyForType(site?.type)
  const tpl = AUDIT_TEMPLATES[tplKey]
  if (!tpl) return null
  const h = hash(name)
  const items = tpl.sections.flatMap((s) => s.items.map((it) => ({ id: it.id })))
  const total = items.length
  if (!total) return null

  const defCount = (h % 3) + 1 // 1–3 deficiencies
  const step = Math.max(2, Math.floor(total / (defCount + 1)))
  const responses = {}
  let made = 0
  items.forEach((it, idx) => {
    if (made < defCount && idx > 0 && idx % step === 0) {
      responses[it.id] = { val: 'no', note: NOTES[(h + made) % NOTES.length] }
      made++
    } else {
      responses[it.id] = { val: idx % 9 === 0 ? 'na' : 'yes' }
    }
  })

  const deficiencies = Object.values(responses).filter((r) => r.val === 'no').length
  const daysAgo = (h % 38) + 6
  const updated = new Date(Date.now() - daysAgo * 86400000).toISOString()
  return {
    id: `demo-${tplKey}-${h}`,
    site: name,
    template: tplKey,
    status: 'complete',
    auditor: AUDITORS[h % AUDITORS.length],
    updated,
    answered: total,
    deficiencies,
    responses,
    demo: true,
  }
}
