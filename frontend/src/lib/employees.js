// Demo roster. Any listed employee can sign in as a viewer (read-only) with no
// password; signing in as an auditor (edit access) requires the team passcode.
// In a live deploy this is replaced by Microsoft Entra sign-in.
export const EMPLOYEES = [
  { name: 'Dave Marin', initials: 'DM', dept: 'EHS', canAudit: true },
  { name: 'Matt Niklas', initials: 'MN', dept: 'Compliance', canAudit: true },
  { name: 'Priya Shah', initials: 'PS', dept: 'EHS', canAudit: true },
  { name: 'Grace Liu', initials: 'GL', dept: 'Compliance', canAudit: true },
  { name: 'Sam Okafor', initials: 'SO', dept: 'Operations' },
  { name: 'Lupe Ramirez', initials: 'LR', dept: 'Operations' },
  { name: 'Tom Becker', initials: 'TB', dept: 'Maintenance' },
  { name: 'Andre Okonkwo', initials: 'AO', dept: 'Operations' },
  // Test-yard site support (own the findings at their yard).
  { name: 'Jaime Guerra', initials: 'JG', dept: 'Operations' }, // Vincent
  { name: 'Enrique', initials: 'EN', dept: 'Operations' }, // Crown MRF
  // New auditors (Rachel's recent hires). Flagged as trainees — they ride along
  // on the first audits as read-only observers and aren't assigned as owners yet.
  { name: 'Jordan Rubinow', initials: 'JR', dept: 'EHS', canAudit: true, trainee: true },
  { name: 'Kate Downey', initials: 'KD', dept: 'EHS', canAudit: true, trainee: true },
]

// Explicit compliance-owner assignments. Overrides the deterministic hash below
// so the test yards land on the people supporting them.
export const OWNER_OVERRIDES = {
  Vincent: 'Jaime Guerra',
  'Crown MRF': 'Enrique',
}

// Demo auditor passcode (viewers need none).
export const AUDITOR_PASSCODE = 'athens'

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Compliance owner assigned to a facility. An explicit OWNER_OVERRIDES entry
// wins; otherwise it's deterministic (stable per name).
export function ownerFor(name) {
  const override = OWNER_OVERRIDES[name]
  if (override) {
    const emp = EMPLOYEES.find((e) => e.name === override)
    if (emp) return emp
  }
  return EMPLOYEES[hash(`owner:${name}`) % EMPLOYEES.length]
}

export function makeUser(emp, role) {
  return {
    name: emp.name,
    role,
    title: role === 'auditor' ? `Field Auditor · ${emp.dept}` : `${emp.dept} · Read-only`,
    initials: emp.initials,
  }
}
