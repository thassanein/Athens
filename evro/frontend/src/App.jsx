import { useEffect, useMemo, useState, useCallback } from 'react'
import { loadDB, saveLocal, postAction, resetLocal } from './lib/api.js'
import { MUTATIONS } from './lib/mutations.js'
import { scopedView } from './lib/engine.js'
import NavBar, { allowedKeys, navScreens } from './components/NavBar.jsx'
import Drawer from './components/Drawer.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import Copilot from './components/Copilot.jsx'
import ProcurementCopilot from './components/ProcurementCopilot.jsx'
import IntelligenceBar from './components/IntelligenceBar.jsx'
import Briefing from './components/Briefing.jsx'
import Landing from './components/Landing.jsx'
import ModuleChooser from './components/ModuleChooser.jsx'
import Onboarding from './components/Onboarding.jsx'
import MobileCommandBar from './components/MobileCommandBar.jsx'
import { BrandMark } from './components/Brand.jsx'
import { IconMenu, IconSearch, IconAI } from './components/Icons.jsx'
import { missionQueue } from './lib/mission.js'
import { recordView } from './lib/memory.js'
import { procurementFirst, selectModule } from './lib/capabilities.js'
import { decisionQueue, PROCUREMENT_ROLE_LABEL } from './lib/procurement.js'

import Morning from './pages/Morning.jsx'
import Cockpit from './pages/Cockpit.jsx'
import Exec from './pages/Exec.jsx'
import MyWork from './pages/MyWork.jsx'
import Department from './pages/Department.jsx'
import Hierarchy from './pages/Hierarchy.jsx'
import Portfolio from './pages/Portfolio.jsx'
import Forecast from './pages/Forecast.jsx'
import Timeline from './pages/Timeline.jsx'
import Scenarios from './pages/Scenarios.jsx'
import Optimize from './pages/Optimize.jsx'
import Realization from './pages/Realization.jsx'
import Dependencies from './pages/Dependencies.jsx'
import ValueMap from './pages/ValueMap.jsx'
import ValueGraph from './pages/ValueGraph.jsx'
import Mining from './pages/Mining.jsx'
import Opportunities from './pages/Opportunities.jsx'
import Spend from './pages/Spend.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Movement from './pages/Movement.jsx'
import Summit from './pages/Summit.jsx'
import Sustainment from './pages/Sustainment.jsx'
import Recognition from './pages/Recognition.jsx'
import Reporting from './pages/Reporting.jsx'
import Sustainability from './pages/Sustainability.jsx'
import Methodology from './pages/Methodology.jsx'
import Intake from './pages/Intake.jsx'
import Initiative from './pages/Initiative.jsx'
import ValueOffice from './pages/ValueOffice.jsx'
import Pulse from './pages/Pulse.jsx'
import Knowledge from './pages/Knowledge.jsx'
import ChiefOfStaff from './pages/ChiefOfStaff.jsx'
import Governance from './pages/Governance.jsx'
import Integrations from './pages/Integrations.jsx'
import MissionControl from './pages/MissionControl.jsx'
import MissionQueue from './pages/MissionQueue.jsx'
import Wall from './pages/Wall.jsx'
import Accountability from './pages/Accountability.jsx'
import Intelligence from './pages/Intelligence.jsx'
import Decisions from './pages/Decisions.jsx'
import BrandPage from './pages/BrandPage.jsx'
import IdentityLab from './pages/IdentityLab.jsx'
import IdentityPage from './pages/IdentityPage.jsx'
import Narrative from './pages/Narrative.jsx'
import AITrust from './pages/AITrust.jsx'
import Settings from './pages/Settings.jsx'
import ProcurementDashboard from './pages/ProcurementDashboard.jsx'
import ProcurementHome from './pages/ProcurementHome.jsx'
import PhaseView from './pages/PhaseView.jsx'
import OpportunityWorkspace from './pages/OpportunityWorkspace.jsx'
import SavingsPipeline from './pages/SavingsPipeline.jsx'
import DecisionCenter from './pages/DecisionCenter.jsx'
import ProcurementAI from './pages/ProcurementAI.jsx'
import ProcurementGlossary from './pages/ProcurementGlossary.jsx'
import ProcurementScenario from './pages/ProcurementScenario.jsx'
import ProcurementBrief from './pages/ProcurementBrief.jsx'
import ProcurementStudio from './pages/ProcurementStudio.jsx'
import NextBestRail from './components/NextBestRail.jsx'
import AIPresence from './components/AIPresence.jsx'
import AskEvro from './components/AskEvro.jsx'
import WhyEvro from './components/WhyEvro.jsx'
import Celebration from './components/Celebration.jsx'
import { detectCelebrations } from './lib/celebrations.js'
import { SignatureWelcome } from './components/Signature.jsx'
import { signatureSeen } from './lib/signature.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { track } from './lib/telemetry.js'
import { KnowledgeProvider, defaultLevelFor, LevelToggle } from './components/Explain.jsx'
import { disabledNavKeys } from './lib/model.js'

const PAGES = { morning: Morning, mission: MissionControl, missions: MissionQueue, wall: Wall, accountability: Accountability, intelligence: Intelligence, decisions: Decisions, narrative: Narrative, aitrust: AITrust, brand: BrandPage, identity: IdentityPage, identitylab: IdentityLab, valueoffice: ValueOffice, pulse: Pulse, chief: ChiefOfStaff, cockpit: Cockpit, exec: Exec, mywork: MyWork, department: Department, hierarchy: Hierarchy, portfolio: Portfolio, forecast: Forecast, timeline: Timeline, scenarios: Scenarios, optimize: Optimize, realization: Realization, sustainment: Sustainment, dependencies: Dependencies, valuemap: ValueMap, valuegraph: ValueGraph, mining: Mining, opportunities: Opportunities, spend: Spend, leaderboard: Leaderboard, movement: Movement, summit: Summit, recognition: Recognition, reporting: Reporting, sustainability: Sustainability, methodology: Methodology, knowledge: Knowledge, governance: Governance, integrations: Integrations, intake: Intake, initiative: Initiative, settings: Settings, procurement: ProcurementDashboard, opportunity: OpportunityWorkspace, savingspipeline: SavingsPipeline, decisioncenter: DecisionCenter, procai: ProcurementAI, glossary: ProcurementGlossary, whatif: ProcurementScenario, brief: ProcurementBrief, studio: ProcurementStudio }
const TITLES = { morning: 'Morning operating screen', mission: 'Enterprise Mission Control', missions: 'Mission Queue', wall: 'Opportunity & Risk Wall', accountability: 'Ownership & Accountability', intelligence: 'Enterprise Intelligence', decisions: 'Executive Decision Workspace', narrative: 'Executive Narrative', aitrust: 'AI Trust & Memory', brand: 'EVRO Brand', identity: 'Identity Architecture', identitylab: 'Identity Lab — 6C.1A Exploration', valueoffice: 'Athens Value Office', pulse: 'Enterprise Pulse', chief: 'Chief of Staff', cockpit: 'Decision cockpit', exec: 'Executive dashboard', mywork: 'My initiatives', department: 'My department', hierarchy: 'Portfolio hierarchy', portfolio: 'Initiatives', forecast: 'Forecast workbench', timeline: 'Enterprise timeline', scenarios: 'Forecast simulator', optimize: 'Capital allocation', realization: 'Value realization', sustainment: 'Sustainment command center', dependencies: 'Dependency network', valuemap: 'Value map', valuegraph: 'Enterprise value graph', mining: 'AI opportunity mining', opportunities: 'Opportunity board', spend: 'Spend explorer', leaderboard: 'Savings leaderboard', movement: 'Value movement', summit: 'AVCM Value Summit', recognition: 'Recognition center', reporting: 'Reporting workspace', sustainability: 'Sustainability', methodology: 'Methodology', knowledge: 'Knowledge Layer', governance: 'Workflow & Governance', integrations: 'Integration & Assembly Readiness', intake: 'New initiative', initiative: 'Initiative', settings: 'Settings — capabilities & experience', procurement: 'Procurement — Executive Dashboard', opportunity: 'Opportunity Workspace', savingspipeline: 'Savings Pipeline', decisioncenter: 'Decision Center', procai: 'Enterprise AI — Procurement Intelligence', glossary: 'Procurement Glossary — definitions & phases', whatif: 'What-If — scenario projection', brief: 'Auto-Drafted Briefs & Narratives', studio: 'EVRO Studio — configuration console' }

// Executives / leadership land on Enterprise Mission Control; operators
// (owner / procurement) keep the Morning operating screen.
const HOME = { exec: 'mission', admin: 'mission', fpna: 'mission', leader: 'mission', owner: 'morning', procurement: 'morning' }
const ALWAYS_OK = ['initiative', 'intake', 'opportunity', 'phase_pipeline', 'phase_commit', 'phase_execute', 'phase_realize']
// The four standardized phase views — one component, one layout, per phase.
const PHASE_ROUTES = { phase_pipeline: 'pipeline', phase_commit: 'commit', phase_execute: 'execute', phase_realize: 'realize' }
const PHASE_TITLE = { phase_pipeline: 'Pipeline', phase_commit: 'Commit', phase_execute: 'Execute', phase_realize: 'Realize' }
const SCOPED_PAGES = new Set(['portfolio', 'forecast', 'sustainability', 'sustainment', 'realization'])
// Operating screens that carry the persistent "Do next" rail (5B.6 item 7).
const RAIL_PAGES = new Set(['mission', 'intelligence', 'valueoffice', 'pulse', 'wall', 'chief', 'governance'])
const ROLE_LABEL = { admin: 'EVRO Lead', fpna: 'FP&A', leader: 'Function leader', owner: 'Initiative owner', procurement: 'Procurement', exec: 'Executive' }
// In the Procurement module the same six roles read in procurement language.
const roleLabelOf = (r) => (procurementFirst() ? (PROCUREMENT_ROLE_LABEL[r] || ROLE_LABEL[r]) : ROLE_LABEL[r]) || 'EVRO'

function capsFor(role) {
  switch (role) {
    case 'admin': return { edit: true, validate: true, steering: true, admin: true }
    case 'fpna': return { edit: false, validate: true, steering: false, admin: false }
    case 'leader': return { edit: true, validate: false, steering: true, admin: false }
    case 'owner': return { edit: true, validate: false, steering: false, admin: false }
    case 'procurement': return { edit: true, validate: false, steering: false, admin: false }
    default: return { edit: false, validate: false, steering: false, admin: false }
  }
}

export default function App() {
  const [db, setDb] = useState(null)
  const [source, setSource] = useState('local')
  const [page, setPage] = useState('cockpit')
  const [selId, setSelId] = useState(null)
  const [drawerId, setDrawerId] = useState(null)
  const [palette, setPalette] = useState(false)
  const [copilot, setCopilot] = useState(false)
  const [briefing, setBriefing] = useState(false)
  const [tour, setTour] = useState(false)
  const [why, setWhy] = useState(false)
  const [celebrations, setCelebrations] = useState([])
  const [welcome, setWelcome] = useState(() => !signatureSeen('welcomed'))
  const [intelHidden, setIntelHidden] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [toast, setToast] = useState(null)
  const [userId, setUserId] = useState(null)
  const [theme, setTheme] = useState(() => (typeof localStorage !== 'undefined' && localStorage.getItem('evro.theme')) || 'dark')
  const [level, setLevel] = useState(() => (typeof localStorage !== 'undefined' && localStorage.getItem('evro.explain')) || null)
  const [entered, setEntered] = useState(() => { try { return sessionStorage.getItem('evro.entered') === '1' } catch { return false } })
  // bumped when Settings toggles a capability/experience flag, so the sidebar
  // (NavBar reads capabilities at render) re-evaluates its procurement-first mode.
  const [shellRev, setShellRev] = useState(0)
  const refreshShell = useCallback(() => setShellRev((n) => n + 1), [])
  // module chooser (front door): the operator picks a capability before the
  // landing. The choice sets the capability state; persists for the session.
  const [moduleKey, setModuleKey] = useState(() => { try { return sessionStorage.getItem('evro.module') || null } catch { return null } })
  const pickModule = useCallback((key) => {
    selectModule(key)
    try { sessionStorage.setItem('evro.module', key) } catch { /* ignore */ }
    setModuleKey(key); setShellRev((n) => n + 1)
    // enter straight into Procurement — the guided walkthrough does NOT auto-open;
    // the user starts it from the "▶ Tour" button in the top bar when ready.
    // (inline the enter logic to avoid depending on `enter`, declared below)
    if (key === 'procurement') {
      setWelcome(false)
      setEntered(true); try { sessionStorage.setItem('evro.entered', '1') } catch { /* ignore */ }
      // First time in, show the plain-English "Why EVRO" once (not the tour).
      try { if (!localStorage.getItem('evro.why.seen')) setWhy(true) } catch { setWhy(true) }
    }
  }, [])
  const changeModule = useCallback(() => {
    try { sessionStorage.removeItem('evro.module'); sessionStorage.removeItem('evro.entered') } catch { /* ignore */ }
    setModuleKey(null); setEntered(false)
  }, [])
  const enter = useCallback(() => { setEntered(true); try { sessionStorage.setItem('evro.entered', '1') } catch { /* ignore */ } }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('evro.theme', theme) } catch { /* ignore */ }
  }, [theme])

  // Explanation depth (Knowledge Layer): persist, and default by role on first run.
  useEffect(() => { if (level) { try { localStorage.setItem('evro.explain', level) } catch { /* ignore */ } } }, [level])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { db, source } = await loadDB()
      if (!alive) return
      setDb(db); setSource(source)
      const u = db.people.find((p) => p.role === 'admin') || db.people[0]
      setUserId(u.id); setPage(HOME[u.role] || 'cockpit')
    })()
    return () => { alive = false }
  }, [])

  // ⌘K / Ctrl-K command palette
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) }
      else if (e.key === 'Escape') { setPalette(false); setCopilot(false); setBriefing(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const flash = useCallback((m) => setToast(m), [])
  const navigate = useCallback((p, opts = {}) => {
    if (p === 'initiative' || p === 'opportunity') setSelId(opts.id)
    setPage(p); setDrawer(false); window.scrollTo(0, 0)
    track('page', p)
  }, [])
  const openDrawer = useCallback((id) => setDrawerId(id), [])

  // Decision-journal auto-capture (5B.6 item 8): consequential mutations are
  // journaled with rationale + evidence. Composed BEFORE the mutation runs
  // (the request state is gone after commit); approvals journal only when the
  // gate actually commits, not on partial sign-offs.
  const composeJournal = (action, args, before) => {
    const [id, actorId] = args
    if (action === 'toggleModule') {
      const f = (before.feature_flags || []).find((x) => x.id === id)
      return f && { actorId, always: true, entry: {
        title: `${f.enabled ? 'Disable' : 'Enable'} module "${f.label}"`, decision: f.enabled ? 'Disabled' : 'Enabled',
        rationale: 'Assembly change — phased module activation.', evidence: ['Feature-flag registry state'], linked_initiative_id: null,
      } }
    }
    const i = before.initiatives.find((x) => x.id === id)
    if (!i?.request) return null
    const kind = i.request.kind
    const title = kind === 'intake' ? `Approve "${i.title}" into the pipeline` : `Advance "${i.title}" → ${i.request.to_stage}`
    const evidence = [`Approval request state (${(i.request.approvals || []).length}/${i.request.need.length} roles signed pre-decision)`, `${(before.ai_recommendations || []).filter((r) => r.status === 'open').length} AI signals open at decision time`]
    if (action === 'approveRequest') return { actorId, commitOnly: true, entry: { title, decision: 'Approved', rationale: `${kind === 'intake' ? 'Intake' : 'Stage gate'} sign-off — required ${i.request.need.join(' + ')}.`, evidence, linked_initiative_id: id } }
    if (action === 'rejectRequest') return { actorId, always: true, entry: { title, decision: 'Returned for rework', rationale: args[2] || 'Returned for rework.', evidence, linked_initiative_id: id } }
    return null
  }

  const dispatch = useCallback(async (action, ...args) => {
    const fn = MUTATIONS[action]
    if (!fn) return {}
    track('action', action)
    const journal = ['approveRequest', 'rejectRequest', 'toggleModule'].includes(action) ? composeJournal(action, args, db) : null
    let res = fn(db, ...args)
    if (res.error) { flash(res.error); return res }
    // journal only when the decision actually happened (gate committed / always)
    const committed = journal && (journal.always || !res.db.initiatives.find((x) => x.id === args[0])?.request)
    if (committed) res = { ...res, db: MUTATIONS.journalDecision(res.db, journal.entry, journal.actorId).db }
    // celebration detection (6B item 11) — diff the provable state; never
    // allowed to break the mutation path
    const cels = detectCelebrations(db, res.db, action)
    if (cels.length) setCelebrations((q) => [...q, ...cels])
    setDb(res.db)
    if (source === 'postgres') {
      try {
        const out = await postAction(action, args)
        const fin = committed ? await postAction('journalDecision', [journal.entry, journal.actorId]) : out
        setDb(fin.db)
        return { ...res, ...out }
      } catch { flash('Saved locally — server sync pending') }
    } else saveLocal(res.db)
    return res
  }, [db, source, flash])

  const user = useMemo(() => db?.people.find((p) => p.id === userId) || null, [db, userId])
  const caps = useMemo(() => capsFor(user?.role), [user])

  useEffect(() => {
    if (!user) return
    if (!allowedKeys(user.role).includes(page) && !ALWAYS_OK.includes(page)) { setPage(HOME[user.role] || 'cockpit'); setSelId(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Assembly readiness: if the active page's module was just disabled, leave it.
  useEffect(() => {
    if (db && user && disabledNavKeys(db).has(page)) { setPage(HOME[user.role] || 'morning'); setSelId(null) }
  }, [db, user, page])

  // Executive Memory: note which views get opened (deterministic stamp).
  useEffect(() => {
    if (db && page) recordView(page, db.meta.now)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  if (!db || !user) return (
    <div className="app-loading">
      <div className="app-loading-mark"><BrandMark size={64} id="ldg" /></div>
      <div className="tiny muted">Loading the operating system…</div>
    </div>
  )
  if (!moduleKey) return <ModuleChooser onPick={pickModule} />
  if (!entered) return <Landing db={db} user={user} onEnter={enter} onBack={changeModule} onTour={() => { enter(); setWelcome(false); setTour(true) }} />

  // In procurement-first mode, "Home" (the mission key) is the minimal daily
  // action screen, not the heavy enterprise Mission Control.
  const procHome = procurementFirst() && page === 'mission'
  const phaseKey = PHASE_ROUTES[page]
  const Page = procHome ? ProcurementHome : (PAGES[page] || Cockpit)
  const pageDb = SCOPED_PAGES.has(page) ? scopedView(db, user) : db
  const ctx = { db, source, user, caps, dispatch, navigate, flash, openDrawer, onCompanion: () => setCopilot(true), home: HOME[user.role] || 'morning', refreshShell }
  void shellRev // referenced so a capability toggle re-renders the shell/NavBar
  const effLevel = level || defaultLevelFor(user.role)
  // plain call (not useMemo): this is below the early returns, so a hook here
  // would violate hook ordering. missionQueue is cheap enough at this scale.
  const mq = missionQueue(db, user)
  // procurement-first mobile bar shows live decision + approval badges; the
  // queue is cheap at this scale (both are plain calls below the early returns).
  const pdq = decisionQueue(db)
  const barCounts = {
    decisions: procurementFirst() ? pdq.length : (mq.counts?.decision || 0),
    missions: mq.missions.length,
    approvals: pdq.filter((o) => o._raw.request).length,
  }

  return (
   <KnowledgeProvider value={{ db, level: effLevel, setLevel }}>
    <div className="layout">
      <aside className={`sidebar ${drawer ? 'open' : ''}`}>
        <NavBar page={page} navigate={navigate} onNew={() => navigate('intake')} showNew={caps.edit} role={user.role} roleLabel={roleLabelOf(user.role)} onBrand={() => setEntered(false)} disabled={disabledNavKeys(db)} />
      </aside>
      <div className={`scrim ${drawer ? 'show' : ''}`} onClick={() => setDrawer(false)} />

      <div className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setDrawer((d) => !d)} aria-label="Menu"><IconMenu /></button>
          <div className="page-title">{procHome ? 'Home' : (PHASE_TITLE[page] || TITLES[page])}</div>
          <div className="spacer" />
          <button className="copilot-btn why-btn" onClick={() => setWhy(true)} title="Why EVRO? — the plain-English overview">Why EVRO?</button>
          <button className="copilot-btn hide-sm" onClick={() => setTour(true)} title="EVRO Procurement — 5-minute guided walkthrough">▶ Tour</button>
          <button className="copilot-btn hide-md" onClick={() => setCopilot(true)} title="EVRO Companion (executive intelligence)"><IconAI /> Companion</button>
          <button className="cmdk" onClick={() => setPalette(true)} title="Command palette (⌘K)"><IconSearch /> <span className="kbd">⌘K</span></button>
          <span className="hide-md" title="Explanation depth (Knowledge Layer)"><LevelToggle compact /></span>
          <button className="theme-btn" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-label="Toggle theme">{theme === 'dark' ? '☀' : '☾'}</button>
          <PersonaSwitch db={db} userId={userId} setUserId={setUserId} />
          <DataBadge source={source} />
        </header>
        <IntelligenceBar db={db} user={user} collapsed={intelHidden} onToggle={() => setIntelHidden((h) => !h)}
          onBriefing={() => setBriefing(true)} onCopilot={() => setCopilot(true)} openDrawer={openDrawer} />
        <main className="content">
          <ErrorBoundary page={page} resetKey={page} onHome={() => navigate(HOME[user.role] || 'morning')}>
            {phaseKey
              ? <PhaseView key={page} {...ctx} db={pageDb} phase={phaseKey} />
              : <Page key={`${page}:${selId || ''}`} {...ctx} db={pageDb} id={selId} />}
          </ErrorBoundary>
        </main>
        {RAIL_PAGES.has(page) && !procHome && <NextBestRail db={db} user={user} dispatch={dispatch} navigate={navigate} flash={flash} />}
        <AIPresence db={db} user={user} page={page} navigate={navigate} />
        <AskEvro onClick={() => setCopilot(true)} railPage={RAIL_PAGES.has(page)}
          hidden={copilot || briefing || palette || welcome || tour || drawer || !!drawerId || celebrations.length > 0} />
        <Celebration queue={celebrations} onDismiss={() => setCelebrations((q) => q.slice(1))} />
        {welcome && !tour && <SignatureWelcome db={db} user={user} onDone={() => setWelcome(false)} />}
        <MobileCommandBar page={page} homeKey={HOME[user.role] || 'morning'} role={user.role} counts={barCounts}
          hidden={drawer || !!drawerId || palette || copilot || briefing || welcome || celebrations.length > 0}
          onNavigate={navigate} onBrief={() => setBriefing(true)} onMore={() => setDrawer(true)} />
      </div>

      <Drawer id={drawerId} ctx={ctx} onClose={() => setDrawerId(null)} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} screens={navScreens(user.role)} db={db} user={user} caps={caps} navigate={navigate} openDrawer={openDrawer} dispatch={dispatch} flash={flash} onCompanion={() => setCopilot(true)} onBriefing={() => setBriefing(true)} toggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
      {procurementFirst()
        ? <ProcurementCopilot open={copilot} onClose={() => setCopilot(false)} db={db} navigate={navigate} />
        : <Copilot open={copilot} onClose={() => setCopilot(false)} db={db} user={user} openDrawer={openDrawer} navigate={navigate} />}
      <Briefing open={briefing} onClose={() => setBriefing(false)} db={db} user={user} openDrawer={openDrawer} dispatch={dispatch} flash={flash} navigate={navigate} />
      {why && <WhyEvro onClose={() => { setWhy(false); try { localStorage.setItem('evro.why.seen', '1') } catch { /* ignore */ } }} onTour={() => setTour(true)} />}
      {tour && <Onboarding db={db} navigate={navigate} onClose={() => setTour(false)} />}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
   </KnowledgeProvider>
  )
}

function PersonaSwitch({ db, userId, setUserId }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7 }} title="Switch persona (RBAC + scope demo)">
      <span className="label hide-sm" style={{ marginBottom: 0 }}>Acting as</span>
      <select value={userId} onChange={(e) => setUserId(e.target.value)} style={{ padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 8, maxWidth: 200 }}>
        {db.people.map((p) => <option key={p.id} value={p.id}>{p.name} · {roleLabelOf(p.role)}</option>)}
      </select>
    </label>
  )
}

function DataBadge({ source }) {
  return (
    <span className={`badge ${source === 'postgres' ? 'b-green' : 'b-grey'} hide-sm`} title={source === 'postgres' ? 'Live PostgreSQL' : 'Demo snapshot'}>
      <span className="dot" style={{ background: 'currentColor' }} /> {source === 'postgres' ? 'Live DB' : 'Demo'}
    </span>
  )
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t) }, [msg, onDone])
  return <div className="toast" role="status" aria-live="polite">{msg}</div>
}
