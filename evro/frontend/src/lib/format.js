// Display formatters. Money is compact by default ($1.2M, $940K) since the
// platform deals in millions; full currency is available where precision helps.

export function money(n, { compact = true, cents = false } = {}) {
  if (n == null || isNaN(n)) return '—'
  const neg = n < 0
  const v = Math.abs(n)
  let s
  if (compact) {
    if (v >= 1_000_000) s = `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 2)}M`
    else if (v >= 1_000) s = `$${(v / 1_000).toFixed(v >= 100_000 ? 0 : 0)}K`
    else s = `$${v.toFixed(0)}`
  } else {
    s = `$${v.toLocaleString('en-US', { maximumFractionDigits: cents ? 2 : 0 })}`
  }
  return neg ? `(${s})` : s
}

export const pct = (n, dp = 0) => (n == null || isNaN(n) ? '—' : `${(n * 100).toFixed(dp)}%`)
export const num = (n) => (n == null ? '—' : n.toLocaleString('en-US'))

export function monthLabel(period) {
  // period like '2026-03' or '2026-03-01'
  if (!period) return '—'
  const [y, m] = period.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[Number(m) - 1]} ${String(y).slice(2)}`
}

export function dateLabel(iso) {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length <= 10 ? 'T00:00:00' : ''))
  if (isNaN(d)) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const RAG = { green: 'On track', amber: 'Watch', red: 'At risk' }
export const initials = (name) => (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
