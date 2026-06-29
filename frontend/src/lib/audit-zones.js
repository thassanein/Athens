// Group a template's sections into logical site-plan zones, ordered as an
// auditor would physically walk the facility (gate → yard → processing →
// equipment → shop → fuel → environmental → safety → office). Many forms
// (MRF, Hauling) have a long flat list of "Shop: …" and equipment sections;
// grouping them under zones turns the area menu into a walkthrough.

// First match wins. Order here is match PRIORITY, not display order.
const RULES = [
  { zone: 'Maintenance Shop', test: (t) => /\bshop\b/i.test(t) || /mainten/i.test(t) },
  { zone: 'Heavy Equipment & Vehicles', test: (t) => /forklift|industrial truck|heavy equipment|\boperator\b|\bvehicle/i.test(t) },
  { zone: 'Receiving & Processing', test: (t) => /tipping|receiving|working face|active face|\bsort|baler|compost|windrow|curing|finished product|transfer area/i.test(t) },
  { zone: 'Environmental & Permits', test: (t) => /environ|permit|stormwater|leachate|groundwater|\bpond|\bair\b|odor|dust|\blfg\b|landfill gas|hazmat|cupa|spill|spcc|\bwdr\b/i.test(t) },
  { zone: 'Exterior & Yard', test: (t) => /exterior|\byard\b|grounds|cover.*grad|\broads?\b/i.test(t) },
  { zone: 'Fuel & Tanks', test: (t) => /fuel|storage tank|\btank\b/i.test(t) },
  { zone: 'Entrance & Scale', test: (t) => /entrance|\bscale\b|\bgate\b|weighmaster/i.test(t) },
  { zone: 'Safety & PPE', test: (t) => /personal protective|\bppe\b|first aid|\bsafety\b|emergency|life,? ?safety|fire protection/i.test(t) },
  { zone: 'Office & Records', test: (t) => /office|dispatch|posting|records|housekeep|programs|training|\bdot\b|administ/i.test(t) },
]

// Logical walkthrough order for display.
const WALK_ORDER = [
  'Entrance & Scale',
  'Exterior & Yard',
  'Receiving & Processing',
  'Heavy Equipment & Vehicles',
  'Maintenance Shop',
  'Fuel & Tanks',
  'Environmental & Permits',
  'Safety & PPE',
  'Office & Records',
  'Other',
]

export function zoneForSection(title) {
  for (const r of RULES) if (r.test(title)) return r.zone
  return 'Other'
}

// Returns ordered groups: [{ zone, entries: [{ section, index }] }], where
// `index` is the section's position in the original template (so responses and
// item ids are untouched).
export function groupSectionsByZone(sections) {
  const byZone = {}
  sections.forEach((section, index) => {
    const z = zoneForSection(section.title)
    ;(byZone[z] ||= []).push({ section, index })
  })
  return WALK_ORDER.filter((z) => byZone[z]).map((z) => ({ zone: z, entries: byZone[z] }))
}
