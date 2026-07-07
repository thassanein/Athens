import { IconAI } from './Icons.jsx'

// Ask EVRO — the always-there floating action button. It is position:fixed, so it
// rides the viewport on every page as you scroll up and down, and opens the EVRO
// copilot (Ask EVRO) from wherever you are. Hidden while an overlay is already up
// so it never paints over the copilot, a modal or the mobile sidebar. Raised above
// the "Do next" rail on rail pages and above the mobile command bar on phones.
export default function AskEvro({ onClick, railPage = false, hidden = false }) {
  if (hidden) return null
  return (
    <button
      type="button"
      className={`ask-evro ${railPage ? 'raised' : ''}`}
      onClick={onClick}
      aria-label="Ask EVRO — open the copilot"
      title="Ask EVRO — your procurement copilot"
    >
      <span className="ask-evro-ic"><IconAI /></span>
      <span className="ask-evro-t">Ask EVRO</span>
    </button>
  )
}
