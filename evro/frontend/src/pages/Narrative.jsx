import ExecutiveNarrativePanel from '../components/ExecutiveNarrativePanel.jsx'

// Executive Narrative page (6D Wave 3) — the story layer, full width. The same
// ExecutiveNarrativePanel also embeds in Mission Control; here it stands alone
// for the "read the enterprise in prose" workflow.
export default function Narrative({ db, user, navigate }) {
  return (
    <>
      <p className="page-intro">
        The <b>executive narrative</b> — the enterprise explained in four questions: what happened,
        why, what it means, and what to do next. Switch the audience mode to reframe the emphasis;
        click any claim's <b>evidence</b> to drill from story to metric to system source.
      </p>
      <ExecutiveNarrativePanel db={db} user={user} navigate={navigate} />
    </>
  )
}
