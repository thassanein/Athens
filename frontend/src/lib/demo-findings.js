import { templateKeyForType } from './audit-templates.js'
import { ownerFor } from './employees.js'
import { TODAY } from './derive.js'

// Deterministic, varied demo findings so each site tells a different story and
// every feature has data to show (Tasks, the map's Findings lens, Compliance
// open actions, photo evidence, risk tiers, unowned-finding alerts). Demo /
// snapshot mode only — never touches the live database.

// Finding areas use the exact facility-map zone labels per type, so findings
// light up the right zones on the map.
const ZONES = {
  hauling: ['Stormwater', 'Truck Yard', 'Maint. Shop', 'Wash / Clarifier', 'Scale / Entrance', 'HazMat / CUPA', 'Fuel / CNG'],
  mrf: ['Stormwater', 'Tipping Floor', 'Sort Line', 'HazMat / CUPA', 'Wash / Clarifier', 'Baler / Bunkers', 'Scale / Entrance'],
  ts: ['Stormwater', 'Tipping Floor', 'Transfer / Load-out', 'HazMat / CUPA', 'Fuel / SPCC', 'Scale / Entrance', 'Maint. Shop'],
  landfill: ['Stormwater', 'Working Face', 'Leachate / Ponds', 'LFG / Flare', 'Equipment Yard', 'HazMat / CUPA', 'Scale / Entrance'],
  organics: ['Receiving', 'Windrows / ASP', 'Ponds / Stormwater', 'Air / Biofilter', 'HazMat / CUPA', 'Scale / Entrance', 'Curing / Screen'],
  facility: ['Parking / Yard', 'Building', 'HazMat / CUPA', 'Entrance', 'Storage / Tanks', 'Air / Engines'],
}

const ISSUES = [
  { dept: 'ENV', title: 'BMP logbook missing recent entries', note: 'No stormwater inspection logged for the last rain event.' },
  { dept: 'ENV', title: 'Secondary containment seal cracked', note: 'Hairline crack along the south berm — re-seal needed.' },
  { dept: 'ENV', title: 'Used oil drum unlabeled', note: 'Drum staged without a hazardous-waste label or accumulation date.' },
  { dept: 'ENV', title: 'Spill kit not restocked', note: 'Absorbent pads depleted after the last cleanup.' },
  { dept: 'ENV', title: 'Stormwater sample missed this quarter', note: 'A qualifying storm event was not sampled per the IGP.' },
  { dept: 'Facility', title: 'Fire extinguisher tag expired', note: 'Monthly inspection tag is past due.' },
  { dept: 'Facility', title: 'Eyewash station access blocked', note: 'Pallets staged in front of the eyewash — clear immediately.' },
  { dept: 'Facility', title: 'Exit sign not illuminated', note: 'Backup battery failed on the east exit sign.' },
  { dept: 'Facility', title: 'Ladder missing safety feet', note: 'Rubber feet worn through — tag out of service.' },
  { dept: 'Facility', title: 'Machine guard not reinstalled', note: 'Guard left off after maintenance on the baler.' },
]

const PHOTO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect width='320' height='180' fill='#e7ecf2'/><rect x='0' y='150' width='320' height='30' fill='#d5172a' opacity='.14'/><text x='160' y='96' font-size='15' fill='#46566b' text-anchor='middle' font-family='sans-serif'>Field photo (demo)</text></svg>"
  )

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
const dayStr = (offset) => new Date(TODAY.getTime() + offset * 86400000).toISOString().slice(0, 10)

// Story per site, chosen deterministically from the name:
//   0 → clean (no findings)         3 → 3 findings, one unassigned
//   1 → 1 open finding, on schedule 4 → 2 failing + overdue (non-compliant)
//   2 → 2 findings incl. one overdue with photo evidence
export function demoFindingsFor(name, site) {
  const zones = ZONES[templateKeyForType(site.type)] || ZONES.hauling
  const h = hash(name)
  const bucket = h % 5
  const count = [0, 1, 2, 3, 2][bucket]
  if (!count) return []
  const owner = ownerFor(name).name
  const out = []
  for (let i = 0; i < count; i++) {
    const issue = ISSUES[(h + i * 7) % ISSUES.length]
    const area = zones[(h + i * 3) % zones.length]
    const fail = bucket === 4 || (h + i) % 4 === 0
    const overdue = bucket === 4 || ((h >> (i + 1)) & 1) === 0
    out.push({
      id: `demo-f-${h}-${i}`,
      dept: issue.dept,
      area,
      title: issue.title,
      status: fail ? 'fail' : 'open',
      owner: bucket === 3 && i === 1 ? null : owner, // one unassigned to exercise the alert/filter
      due: overdue ? dayStr(-(2 + ((h + i) % 9))) : dayStr(5 + ((h + i) % 20)),
      note: issue.note,
      photo: bucket === 2 && i === 0 ? PHOTO : null,
      source: 'field',
      lat: null,
      lng: null,
    })
  }
  return out
}

// Inject demo findings into any site with an empty checklist (demo/snapshot
// mode). Idempotent: a site that already has findings (e.g. the user's own
// edits persisted to localStorage) is left untouched.
export function withDemoFindings(data) {
  for (const name of Object.keys(data)) {
    const s = data[name]
    if (!s.checklist || s.checklist.length === 0) s.checklist = demoFindingsFor(name, s)
  }
  return data
}
