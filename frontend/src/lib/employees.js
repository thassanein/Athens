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
]

// Demo auditor passcode (viewers need none).
export const AUDITOR_PASSCODE = 'athens'

export function makeUser(emp, role) {
  return {
    name: emp.name,
    role,
    title: role === 'auditor' ? `Field Auditor · ${emp.dept}` : `${emp.dept} · Read-only`,
    initials: emp.initials,
  }
}
