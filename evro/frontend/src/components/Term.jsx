import { expressionOf } from '../lib/procurement-glossary.js'

// <Term> — wrap any procurement expression to explain it on hover/focus with a
// definition and a concrete example, pulled from the shared glossary. Falls back
// to plain text if the term isn't in the glossary. Keyboard-accessible (the
// popover shows on focus too); the whole app already honours :focus-visible.
export default function Term({ name, children, className = '' }) {
  const e = expressionOf(name || (typeof children === 'string' ? children : ''))
  if (!e) return <>{children}</>
  return (
    <span className={`term ${className}`} tabIndex={0} role="note" aria-label={`${e.term}. ${e.definition}`}>
      {children}
      <span className="term-pop" role="tooltip">
        <b className="term-pop-t">{e.term}{e.aka ? ` · ${e.aka}` : ''}</b>
        <span className="term-pop-d">{e.definition}</span>
        <span className="term-pop-e"><i>e.g.</i> {e.example}</span>
      </span>
    </span>
  )
}
