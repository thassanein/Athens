// Explainability & Knowledge Layer (Phase 5B Wave 4). Reusable, view-only:
// a knowledge context (db + explanation level), inline hover definitions, an
// "Explain This" info dot, and a beginner/practitioner/executive level toggle.
// All content comes from the Phase 5B knowledge_cards entity via model.js.
import { createContext, useContext } from 'react'
import { knowledgeIndex, knowledgeCard, explain } from '../lib/model.js'

export const LEVELS = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'practitioner', label: 'Practitioner' },
  { key: 'executive', label: 'Executive' },
]

// Default explanation level by role — beginners get the plainest text, execs the
// punchiest. A presentation default only; the user can override and it persists.
export const defaultLevelFor = (role) =>
  ({ owner: 'beginner', procurement: 'practitioner', leader: 'practitioner', fpna: 'practitioner', admin: 'practitioner', exec: 'executive' }[role] || 'practitioner')

const KnowledgeContext = createContext({ db: null, level: 'practitioner', setLevel: () => {} })
export const KnowledgeProvider = KnowledgeContext.Provider
export const useKnowledge = () => useContext(KnowledgeContext)

// Inline term with a dotted underline and a hover/focus definition popover.
// Usage: <Term k="RAV">risk-adjusted value</Term>  (children optional).
export function Term({ k, children }) {
  const { db, level } = useKnowledge()
  const card = knowledgeCard(db, k)
  const label = children ?? card?.term ?? k
  if (!card) return <>{label}</>
  return (
    <span className="kterm" tabIndex={0}>
      {label}
      <span className="kpop" role="tooltip">
        <span className="kpop-t">{card.term}</span>
        <span className="kpop-d">{explain(card, level)}</span>
        {card.formula && <span className="kpop-f mono">{card.formula}</span>}
      </span>
    </span>
  )
}

// "Explain This" affordance — a small ⓘ that reveals the card on hover/focus.
export function InfoDot({ k, term }) {
  const { db, level } = useKnowledge()
  const card = knowledgeCard(db, k || term)
  if (!card) return null
  return (
    <span className="kinfo" tabIndex={0} aria-label={`Explain ${card.term}`}>
      <span className="kinfo-i">i</span>
      <span className="kpop kpop-r" role="tooltip">
        <span className="kpop-t">{card.term}</span>
        <span className="kpop-d">{explain(card, level)}</span>
        {card.formula && <span className="kpop-f mono">{card.formula}</span>}
        {card.example && <span className="kpop-e">e.g. {card.example}</span>}
      </span>
    </span>
  )
}

// Beginner / Practitioner / Executive segmented control.
export function LevelToggle({ compact }) {
  const { level, setLevel } = useKnowledge()
  return (
    <div className={`seg ${compact ? 'seg-sm' : ''}`} title="Explanation depth">
      {LEVELS.map((l) => (
        <button key={l.key} className={level === l.key ? 'active' : ''} onClick={() => setLevel(l.key)}>{compact ? l.label[0] : l.label}</button>
      ))}
    </div>
  )
}

// Convenience for pages that already have db: build a lookup index once.
export { knowledgeIndex }
