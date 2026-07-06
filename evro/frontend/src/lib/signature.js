// Signature Experience Layer (6B item 12) — the moments that give EVRO a
// recognizable feel: the first-login welcome, the AI discovery moment, and
// synergy detection. One-time moments are tracked per device (localStorage);
// synergies are DETECTED from real structure (enables-dependencies, shared
// sourcing groups, repeatable wins) — never staged. View-only.
import { isActive, REALIZING_STAGES, rav, personName, groupName, depEdges } from './engine.js'

const LS = 'evro.signature'
const load = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') } catch { return {} } }
export const signatureSeen = (key) => !!load()[key]
export const markSignature = (key) => { try { localStorage.setItem(LS, JSON.stringify({ ...load(), [key]: true })) } catch { /* ignore */ } }
export const resetSignature = () => { try { localStorage.removeItem(LS) } catch { /* ignore */ } }

// ---------------------------------------------------------------------------
// Synergy detection — three grounded patterns, strongest first:
//  1) an 'enables' dependency between two ACTIVE initiatives (explicit),
//  2) a realizing win whose sourcing group holds an open opportunity
//     ("the win is repeatable"),
//  3) two active initiatives in one sourcing group under different owners
//     ("these move together — coordinate").
// ---------------------------------------------------------------------------
export function detectSynergies(db) {
  const active = db.initiatives.filter(isActive)
  const byId = Object.fromEntries(db.initiatives.map((i) => [i.id, i]))
  const out = []

  for (const e of depEdges(db).filter((d) => d.type === 'enables')) {
    const a = byId[e.from], b = byId[e.to]
    if (!a || !b || !isActive(a) || !isActive(b)) continue
    const sameTitle = a.title === b.title
    const sameOwner = a.owner_id === b.owner_id
    out.push({
      key: `syn:en:${a.id}:${b.id}`, kind: 'enables', value: rav(a) + rav(b),
      title: sameTitle ? `Two "${a.title}" initiatives compound each other` : `"${a.title}" powers "${b.title}"`,
      detail: `An enables-link connects them — landing the first compounds the second. ${sameOwner ? `${personName(db, a.owner_id)} carries both.` : `Owners: ${personName(db, a.owner_id)} + ${personName(db, b.owner_id)}.`}`,
      ids: [a.id, b.id],
    })
  }

  for (const o of (db.opportunities || []).filter((x) => x.status === 'open')) {
    const wins = active.filter((i) => i.group_id === o.group_id && REALIZING_STAGES.includes(i.stage))
    if (!wins.length) continue
    const w = wins.sort((x, y) => rav(y) - rav(x))[0]
    out.push({
      key: `syn:rep:${w.id}:${o.id}`, kind: 'repeatable', value: (o.est_low + o.est_high) / 2,
      title: `The "${groupName(db, o.group_id)}" win is repeatable`,
      detail: `"${w.title}" is already realizing in this group while "${o.title}" sits unclaimed — the playbook exists.`,
      ids: [w.id],
    })
  }

  const byGroup = {}
  for (const i of active) (byGroup[i.group_id] ||= []).push(i)
  for (const [gid, list] of Object.entries(byGroup)) {
    const owners = new Set(list.map((i) => i.owner_id))
    if (list.length >= 2 && owners.size >= 2) {
      const [a, b] = [...list].sort((x, y) => rav(y) - rav(x))
      if (out.some((s) => s.ids?.includes(a.id) && s.ids?.includes(b.id))) continue
      out.push({
        key: `syn:grp:${gid}`, kind: 'coordinate', value: rav(a) + rav(b),
        title: `${groupName(db, gid)}: two initiatives, ${owners.size} owners`,
        detail: `"${a.title}" and "${b.title}" negotiate with the same market — coordinating ${personName(db, a.owner_id)} and ${personName(db, b.owner_id)} avoids leaving leverage on the table.`,
        ids: [a.id, b.id],
      })
    }
  }

  return out.sort((x, y) => y.value - x.value)
}

// The three-beat first-login welcome, computed live so the numbers are real.
export function welcomeBeats(db, user, extras) {
  const { energy, weather, agents } = extras
  return [
    { title: 'This is your enterprise, alive.', lines: [
      `Enterprise Energy is ${energy.score} — ${energy.state.label}. Weather: ${weather.label}.`,
      'Every number on every screen traces to the operating record. Nothing is staged.',
    ] },
    { title: `${agents.length} agents are already on duty.`, lines: [
      'Analyst, Advisor, Simulator, Memory, Chief of Staff and Operator — deterministic, rules-based, visible in the rail at the bottom-left.',
      'They surface what needs a human. The decisions stay yours.',
    ] },
    { title: 'The rhythm makes it a habit.', lines: [
      'Your Morning Briefing is one click away, the Mission Queue keeps the biggest dollar on top, and every gate decision journals itself.',
      `Welcome, ${user?.name?.split(' ')[0] || 'there'}. The record is live.`,
    ] },
  ]
}
