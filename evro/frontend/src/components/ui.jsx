// Shared UI atoms used across screens.
import { useEffect, useRef, useState } from 'react'
import { STAGE_LABEL, BENEFIT_LABEL, PILLAR_LABEL } from '../lib/engine.js'
import { initials } from '../lib/format.js'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// AnimatedValue — count-up for an already-formatted display string. Parses the
// numeric core out of strings like '$1.58M', '$779K', '50%', '1,234', '12.3×',
// negative '($4K)', or a bare number, animates it from the previous value with
// requestAnimationFrame, and re-emits with the original prefix/suffix + decimals.
// Non-numeric values ('—', dates) render as-is. Honors prefers-reduced-motion.
export function AnimatedValue({ value, duration = 650 }) {
  const str = value == null ? '' : String(value)
  const m = str.match(/-?[\d,]+(\.\d+)?/)
  const prev = useRef(0)
  const [n, setN] = useState(0) // start at 0 and count up on mount (set to target under reduced-motion)

  // Only strings/numbers with a numeric run animate; everything else passes through.
  const target = m ? parseFloat(m[0].replace(/,/g, '')) : null
  const decimals = m && m[0].includes('.') ? m[0].split('.')[1].length : 0
  const hasComma = !!m && m[0].includes(',')

  useEffect(() => {
    if (target == null) return
    if (reducedMotion()) { prev.current = target; setN(target); return }
    const from = prev.current
    const delta = target - from
    if (delta === 0) { setN(target); return }
    const t0 = performance.now()
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setN(from + delta * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else prev.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  if (target == null) return <>{value}</>
  const shown = hasComma
    ? n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
    : n.toFixed(decimals)
  return <>{str.slice(0, m.index)}{shown}{str.slice(m.index + m[0].length)}</>
}

export function Tile({ label, value, sub, tone = 'dark', animate = true }) {
  return (
    <div className={`tile ${tone}`}>
      <div className="t-accent" />
      <div className="t-label">{label}</div>
      <div className="t-value mono">{animate ? <AnimatedValue value={value} /> : value}</div>
      {sub != null && <div className="t-sub">{sub}</div>}
    </div>
  )
}

const RAG_CLASS = { green: 'b-green', amber: 'b-amber', red: 'b-red' }
const RAG_TXT = { green: 'On track', amber: 'Watch', red: 'At risk' }
export function RagBadge({ rag }) {
  return (
    <span className={`badge ${RAG_CLASS[rag] || 'b-grey'}`}>
      <span className="dot" style={{ background: 'currentColor' }} /> {RAG_TXT[rag] || rag}
    </span>
  )
}

const STAGE_PCT = { idea: 25, feasibility: 50, capability: 75, launch: 100, closed: 100 }
export function StagePip({ stage }) {
  return (
    <span className="stage-pip">
      <span className="bar"><i style={{ width: `${STAGE_PCT[stage] || 0}%` }} /></span>
      {STAGE_LABEL[stage] || stage}
    </span>
  )
}

const PILLAR_CLASS = { savings: 'b-green', avoidance: 'b-navy' }
export function PillarBadge({ pillar, benefit }) {
  const txt = benefit ? BENEFIT_LABEL[benefit] : PILLAR_LABEL[pillar]
  return <span className={`badge ${PILLAR_CLASS[pillar] || 'b-grey'}`}>{txt}</span>
}

const PRIO_CLASS = { Hot: 'b-red', High: 'b-amber', Medium: 'b-navy', Low: 'b-grey' }
export function PriorityBadge({ priority }) {
  return <span className={`badge ${PRIO_CLASS[priority] || 'b-grey'}`}>{priority}</span>
}

export function Avatar({ name }) {
  return <div className="avatar" title={name}>{initials(name)}</div>
}

export function Bar({ value, max, color = 'var(--navy)', height = 9 }) {
  const w = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="barline" style={{ height }}>
      <i style={{ width: `${w}%`, background: color }} />
    </div>
  )
}

// Progressive disclosure — render the first `limit` items, reveal the rest on
// demand. Keeps dense lists calm without hiding anything.
export function MoreList({ items, limit = 4, children }) {
  const [open, setOpen] = useState(false)
  const shown = open ? items : items.slice(0, limit)
  return (
    <>
      {shown.map((it, i) => children(it, i))}
      {items.length > limit && (
        <button className="btn sm more-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Show less' : `Show all ${items.length}`}
        </button>
      )}
    </>
  )
}
