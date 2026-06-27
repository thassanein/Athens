// Derived selectors + status helpers shared across screens.
// All portfolio math lives here so the screens stay declarative.

export const TODAY = new Date('2026-06-27') // demo "now" — matches seed dates

// ---- Status label maps -----------------------------------------------------
export const PERMIT_LABEL = { active: 'Active', renew: 'Renewing', verify: 'Verify' }
export const FINDING_LABEL = { pass: 'Pass', fail: 'Fail', open: 'Open', na: 'N/A' }

// Areas offered in Capture (and used as map zones on the site record)
export const AREAS = [
  'Scale/Entrance',
  'Admin',
  'Processing',
  'Compost/Working',
  'Ponds/Stormwater',
  'Maint. Shop',
  'HazMat Storage',
  'Fuel/CNG',
]

// ---- Date helpers ----------------------------------------------------------
export function daysUntil(dateStr, from = TODAY) {
  if (!dateStr) return Infinity
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d - from) / 86400000)
}

export function fmtDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtShort(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ---- Per-site rollups ------------------------------------------------------
// A finding is "open work" when it is fail or open (na/pass are settled).
export const isOpenWork = (c) => c.status === 'fail' || c.status === 'open'

export function siteStats(site) {
  const checklist = site.checklist || []
  const permits = site.permits || []
  const open = checklist.filter(isOpenWork).length
  const failing = checklist.filter((c) => c.status === 'fail').length
  const verify = permits.filter((p) => p.status === 'verify').length
  const renew = permits.filter((p) => p.status === 'renew').length
  const settled = checklist.filter((c) => c.status === 'pass' || c.status === 'na').length
  const total = checklist.length
  const due30 = permits.filter((p) => {
    const d = daysUntil(p.expires)
    return d >= 0 && d <= 30
  }).length
  return { open, failing, verify, renew, settled, total, due30 }
}

// Pin color rule (Map): red if >=10 open OR any verify, else amber if any
// open, else green. Returns 'verify' | 'open' | 'pass' tone keys.
export function siteTone(site) {
  const s = siteStats(site)
  if (s.open >= 10 || s.verify > 0) return 'fail'
  if (s.open > 0) return 'open'
  return 'pass'
}

// ---- Portfolio rollups -----------------------------------------------------
export function portfolioStats(data) {
  let openFindings = 0
  let toVerify = 0
  let due30 = 0
  for (const name of Object.keys(data)) {
    const s = siteStats(data[name])
    openFindings += s.open
    toVerify += s.verify
    due30 += s.due30
  }
  return { openFindings, toVerify, due30 }
}

// Flat list of open findings across all sites, each tagged with its site.
export function allOpenFindings(data) {
  const out = []
  for (const name of Object.keys(data)) {
    for (const c of data[name].checklist || []) {
      if (isOpenWork(c)) out.push({ ...c, site: name })
    }
  }
  // Failing first, then by due date ascending.
  return out.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'fail' ? -1 : 1
    return daysUntil(a.due) - daysUntil(b.due)
  })
}

// Resolve-progress across the whole portfolio (settled / total of actionable).
export function resolveProgress(data) {
  let done = 0
  let total = 0
  for (const name of Object.keys(data)) {
    for (const c of data[name].checklist || []) {
      if (c.status === 'na') continue
      total += 1
      if (c.status === 'pass') done += 1
    }
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
}

// ---- Alerts ----------------------------------------------------------------
// Unowned findings, permits needing verification, and renewal-cycle permits
// within 90 days (routine — read as "Renewing", not overdue).
export function buildAlerts(data) {
  const alerts = []
  for (const name of Object.keys(data)) {
    const site = data[name]
    const unowned = (site.checklist || []).filter((c) => isOpenWork(c) && !c.owner)
    if (unowned.length) {
      alerts.push({
        id: `al-unowned-${name}`,
        kind: 'unowned',
        site: name,
        title: `${unowned.length} finding${unowned.length > 1 ? 's have' : ' has'} no owner`,
        detail: `${unowned.length} open · needs assignment`,
        tag: 'Assign',
        tone: 'open',
      })
    }
    for (const p of site.permits || []) {
      if (p.status === 'verify') {
        alerts.push({
          id: `al-verify-${p.id}`,
          kind: 'verify',
          site: name,
          title: p.name,
          detail: `${name} · ${p.agency}`,
          tag: 'Verify',
          tone: 'fail',
        })
      } else if (p.status === 'renew') {
        const d = daysUntil(p.expires)
        if (d <= 90) {
          alerts.push({
            id: `al-renew-${p.id}`,
            kind: 'renew',
            site: name,
            title: p.name,
            detail: `${name} · cycle ${fmtShort(p.expires)}`,
            tag: 'Renewing',
            tone: 'open',
          })
        }
      }
    }
  }
  // Verify first, then unowned, then renewals.
  const order = { verify: 0, unowned: 1, renew: 2 }
  return alerts.sort((a, b) => order[a.kind] - order[b.kind])
}

export function alertCount(data) {
  return buildAlerts(data).length
}
