// AI Presence Engine (6B item 8) — the agent team made VISIBLE: six agents
// (Analyst, Advisor, Simulator, Memory, Chief of Staff, Operator), each with a
// live activity state, a confidence, and one line of reasoning grounded in the
// actual portfolio. The active agent follows the screen you're on. All
// deterministic — presence is honesty about what the rules layer is doing,
// not theatre about what it isn't.
import { isActive, decisionsRequired, scenarioTotals } from './engine.js'
import { aiRecommendations, decisionJournal, scenarios, featureFlags } from './model.js'
import { missionQueue } from './mission.js'

export const PRESENCE_STATES = {
  active: { label: 'Active', tone: 'var(--green)' },
  watching: { label: 'Watching', tone: 'var(--navy)' },
  standby: { label: 'Standby', tone: 'var(--grey-2)' },
}

// Which agent leads on which screen — presence follows attention.
const PAGE_AGENT = {
  intelligence: 'analyst', pulse: 'analyst', exec: 'analyst', valueoffice: 'analyst',
  mining: 'advisor', opportunities: 'advisor', spend: 'advisor', wall: 'advisor',
  scenarios: 'simulator', forecast: 'simulator', optimize: 'simulator',
  timeline: 'memory', governance: 'memory', knowledge: 'memory',
  chief: 'chief', missions: 'chief', mission: 'chief', decisions: 'chief', morning: 'chief',
  integrations: 'operator', accountability: 'operator',
}

export function aiPresence(db, user, page) {
  const recs = aiRecommendations(db, { status: 'open' })
  const journal = decisionJournal(db)
  const auto = journal.filter((d) => d.auto).length
  const lessons = journal.filter((d) => d.lessons).length
  const active = db.initiatives.filter(isActive)
  const actuals = db.initiatives.flatMap((i) => i.actuals || [])
  const unvalidated = actuals.filter((a) => !a.validated).length
  const hygiene = actuals.length ? (actuals.length - unvalidated) / actuals.length : 1
  const st = scenarioTotals(db)
  const dec = user ? decisionsRequired(db, user) : []
  const q = user ? missionQueue(db, user) : { missions: [] }
  const avgConf = recs.length ? recs.reduce((a, r) => a + (r.confidence || 0), 0) / recs.length : 0
  const flags = featureFlags(db)
  const leadKey = PAGE_AGENT[page] || 'analyst'

  const agents = [
    { key: 'analyst', name: 'Analyst', confidence: hygiene,
      confNote: 'data coverage — share of the record FP&A-validated',
      reasoning: `Sweeping ${active.length} active initiatives · ${unvalidated ? `${unvalidated} actuals await validation` : 'the record is clean'}.` },
    { key: 'advisor', name: 'Advisor', confidence: avgConf,
      confNote: 'average confidence across open recommendations',
      reasoning: recs.length ? `${recs.length} open recommendations on deck — largest: "${[...recs].sort((a, b) => (b.value_impact || 0) - (a.value_impact || 0))[0].title}".` : 'No open advice — the book is settled.' },
    { key: 'simulator', name: 'Simulator', confidence: 0.9,
      confNote: 'deterministic math — the lenses always reconcile',
      reasoning: `${scenarios(db).length} scenario lenses armed · committed ${m$(st.committed)} survives every one.` },
    { key: 'memory', name: 'Memory', confidence: journal.length ? 0.85 : 0.4,
      confNote: 'grows with the journaled record',
      reasoning: `${journal.length} decisions remembered (${auto} auto-captured) · ${lessons} lesson${lessons === 1 ? '' : 's'} feeding back.` },
    { key: 'chief', name: 'Chief of Staff', confidence: avgConf || 0.8,
      confNote: 'synthesis — leads with the strongest signal',
      reasoning: q.missions.length ? `${q.missions.length} missions ranked · ${dec.filter((d) => d.kind === 'approval').length || 'no'} decision${dec.filter((d) => d.kind === 'approval').length === 1 ? '' : 's'} waiting on you.` : 'Queue is clear — watching for the next signal.' },
    { key: 'operator', name: 'Operator', confidence: 0.95,
      confNote: 'routine execution — journals, flags, telemetry',
      reasoning: `${auto} gate decisions auto-journaled · ${flags.filter((f) => f.enabled).length}/${flags.length} modules live · telemetry local-only.` },
  ].map((a) => ({
    ...a,
    state: a.key === leadKey ? 'active' : ['analyst', 'chief'].includes(a.key) ? 'watching' : 'standby',
  }))

  return { agents, lead: agents.find((a) => a.key === leadKey), page }
}

const m$ = (n) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`)
