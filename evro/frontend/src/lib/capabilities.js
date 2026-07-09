// Procurement Phase One — capability gating. EVRO is one platform, one
// identity, one architecture, one AI, one data model. Capabilities are the
// enterprise domains that platform can run (Procurement, Fleet, Operations,
// CX, HR, Finance). Phase One activates PROCUREMENT ONLY — the others are
// declared, visible in Settings, and switched OFF so the shell reads as a
// focused procurement operating system rather than a sprawling everything-app.
//
// This is a PRESENTATION + navigation switch, exactly like lib/flags.js. It
// never gates value math, the deterministic engine, or the data record — those
// always run. It curates which surfaces the sidebar leads with. Every EVRO
// page remains reachable (the command palette and route guards use the full
// nav in NavBar.jsx); capabilities decide the *front door*, not permissions.
//
// "Refactor, do not rebuild": Phase One reuses existing pages. The procurement
// nav below points every label at a page that already ships.
import {
  IconCockpit, IconExec, IconPortfolio, IconOpportunity, IconReport,
  IconForecast, IconBolt, IconAI, IconBook, IconTeam, IconGraph, IconLeaf,
  IconScenarios,
} from '../components/Icons.jsx'

const KEY = 'evro.capabilities.v1'

// The six enterprise capabilities. Phase One: procurement on, the rest off
// (declared so the roadmap is legible, and admin-toggleable from Settings).
export const CAPABILITIES = [
  { key: 'procurement', label: 'Procurement', desc: 'Savings realization across every dollar of addressable spend — find, decide, deliver, sustain.', default: true, status: 'active' },
  { key: 'fleet', label: 'Fleet', desc: 'Vehicle, maintenance and utilization value.', default: false, status: 'planned' },
  { key: 'operations', label: 'Operations', desc: 'Route, throughput and facility efficiency.', default: false, status: 'planned' },
  { key: 'cx', label: 'Customer Experience', desc: 'Retention, satisfaction and revenue value.', default: false, status: 'planned' },
  { key: 'hr', label: 'People & HR', desc: 'Workforce productivity and talent value.', default: false, status: 'planned' },
  { key: 'finance', label: 'Finance', desc: 'Working-capital and treasury value.', default: false, status: 'planned' },
]
const DEFAULTS = Object.fromEntries(CAPABILITIES.map((c) => [c.key, c.default]))
export const capabilityMeta = (key) => CAPABILITIES.find((c) => c.key === key) || null

function read() {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    const merged = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) }
    // procurement is the anchor capability of Phase One — it can never be the
    // one that leaves nothing on. If everything is off, restore procurement.
    if (!CAPABILITIES.some((c) => merged[c.key])) merged.procurement = true
    return merged
  } catch { return { ...DEFAULTS } }
}
function write(state) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private mode */ }
}

export function readCapabilities() { return read() }
export function capOn(key) { return read()[key] ?? DEFAULTS[key] ?? false }
export function setCapability(key, on) { const s = read(); s[key] = !!on; if (!CAPABILITIES.some((c) => s[c.key])) s.procurement = true; write(s); return s }
export function resetCapabilities() { write({ ...DEFAULTS }); return { ...DEFAULTS } }
export function activeCapabilities() { return CAPABILITIES.filter((c) => read()[c.key]) }

// Phase One is "procurement is the ONLY active capability". When true the
// sidebar leads with the focused procurement nav; when an operator switches on
// a second capability from Settings the shell falls back to the full
// enterprise navigation (NavBar's own NAV).
export function procurementFirst() {
  const s = read()
  return !!s.procurement && CAPABILITIES.filter((c) => s[c.key]).length === 1
}

// ── Module chooser — the front door. The operator picks which EVRO capability
// they are entering before the landing. Procurement is the active Phase One
// module; the others are on the roadmap. "Enterprise" opens the full platform
// (every capability on → the complete enterprise navigation). Picking a module
// simply sets the capability state below, so the chooser and Settings agree.
export const MODULES = [
  { key: 'procurement', label: 'EVRO Procurement', tagline: 'Savings realization across every dollar of addressable spend.', status: 'active', caps: ['procurement'] },
  { key: 'cx', label: 'EVRO Customer Experience', tagline: 'Retention, satisfaction and revenue value.', status: 'soon' },
  { key: 'fleet', label: 'EVRO Fleet & Maintenance', tagline: 'Vehicle, maintenance and utilization value.', status: 'soon' },
  { key: 'operations', label: 'EVRO Operations', tagline: 'Route, throughput and facility efficiency.', status: 'soon' },
  { key: 'enterprise', label: 'EVRO Enterprise', tagline: 'The full platform — every capability, one operating system.', status: 'platform', caps: 'all' },
]
export const moduleMeta = (key) => MODULES.find((m) => m.key === key) || null

// Apply a module choice to the capability state. Returns the new state, or null
// if the module is not yet available (status 'soon').
export function selectModule(key) {
  const m = MODULES.find((x) => x.key === key)
  if (!m || m.status === 'soon') return null
  const state = {}
  if (m.caps === 'all') CAPABILITIES.forEach((c) => { state[c.key] = true })
  else CAPABILITIES.forEach((c) => { state[c.key] = (m.caps || []).includes(c.key) })
  if (!CAPABILITIES.some((c) => state[c.key])) state.procurement = true
  write(state)
  return state
}

const ALL = ['exec', 'admin', 'fpna', 'leader', 'owner', 'procurement']
const ENT = ['exec', 'admin', 'fpna']
const ENTL = ['exec', 'admin', 'fpna', 'leader']

// The Phase One procurement-first navigation. Every key is an existing page —
// this is a curated front door over surfaces that already ship, not new
// screens. Later Procurement waves repoint labels at dedicated procurement
// surfaces as they are built; the structure stays the same.
// [key, label, Icon, roles]
// Minimal, phase-shaped rail (per exec feedback — Juan/Cesar): two places to
// look (Home = what needs you, Executive = the numbers), the four project
// phases as the workflow, one AI door. Everything else stays reachable through
// ⌘K / Ask EVRO — the sidebar just doesn't lead with it.
export const PROCUREMENT_NAV = [
  { group: 'Command', items: [
    ['mission', 'Home', IconCockpit, ALL],
    ['procurement', 'Executive Dashboard', IconExec, ENTL],
  ] },
  { group: 'The four phases', items: [
    ['phase_pipeline', 'Pipeline', IconPortfolio, ENTL],
    ['phase_commit', 'Commit', IconCockpit, ENTL],
    ['phase_execute', 'Execute', IconForecast, ENTL],
    ['phase_realize', 'Realize', IconReport, ENTL],
  ] },
  { group: 'Intelligence', items: [
    ['procai', 'Ask EVRO', IconAI, ALL],
    ['studio', 'EVRO Studio', IconBolt, ENT],
    ['settings', 'Settings', IconCockpit, ENT],
  ] },
]
