// Shared UI atoms used across screens.
import { STAGE_LABEL, BENEFIT_LABEL, PILLAR_LABEL } from '../lib/engine.js'
import { initials } from '../lib/format.js'

export function Tile({ label, value, sub, tone = 'dark' }) {
  return (
    <div className={`tile ${tone}`}>
      <div className="t-accent" />
      <div className="t-label">{label}</div>
      <div className="t-value mono">{value}</div>
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
