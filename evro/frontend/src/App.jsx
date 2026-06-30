import { useEffect, useMemo, useState, useCallback } from 'react'
import { loadDB, saveLocal, postAction, resetLocal } from './lib/api.js'
import { MUTATIONS } from './lib/mutations.js'
import { scopedView } from './lib/engine.js'
import NavBar, { allowedKeys, navScreens } from './components/NavBar.jsx'
import Drawer from './components/Drawer.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import Copilot from './components/Copilot.jsx'
import { IconMenu, IconSearch, IconAI } from './components/Icons.jsx'

import Cockpit from './pages/Cockpit.jsx'
import Exec from './pages/Exec.jsx'
import MyWork from './pages/MyWork.jsx'
import Department from './pages/Department.jsx'
import Hierarchy from './pages/Hierarchy.jsx'
import Portfolio from './pages/Portfolio.jsx'
import Forecast from './pages/Forecast.jsx'
import Scenarios from './pages/Scenarios.jsx'
import Optimize from './pages/Optimize.jsx'
import Dependencies from './pages/Dependencies.jsx'
import ValueMap from './pages/ValueMap.jsx'
import Mining from './pages/Mining.jsx'
import Opportunities from './pages/Opportunities.jsx'
import Spend from './pages/Spend.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Recognition from './pages/Recognition.jsx'
import Reporting from './pages/Reporting.jsx'
import Sustainability from './pages/Sustainability.jsx'
import Methodology from './pages/Methodology.jsx'
import Intake from './pages/Intake.jsx'
import Initiative from './pages/Initiative.jsx'

const PAGES = { cockpit: Cockpit, exec: Exec, mywork: MyWork, department: Department, hierarchy: Hierarchy, portfolio: Portfolio, forecast: Forecast, scenarios: Scenarios, optimize: Optimize, dependencies: Dependencies, valuemap: ValueMap, mining: Mining, opportunities: Opportunities, spend: Spend, leaderboard: Leaderboard, recognition: Recognition, reporting: Reporting, sustainability: Sustainability, methodology: Methodology, intake: Intake, initiative: Initiative }
const TITLES = { cockpit: 'Decision cockpit', exec: 'Executive dashboard', mywork: 'My initiatives', department: 'My department', hierarchy: 'Portfolio hierarchy', portfolio: 'Initiatives', forecast: 'Forecast workbench', scenarios: 'Forecast simulator', optimize: 'Capital allocation', dependencies: 'Dependency network', valuemap: 'Value map', mining: 'AI opportunity mining', opportunities: 'Opportunity board', spend: 'Spend explorer', leaderboard: 'Savings leaderboard', recognition: 'Recognition center', reporting: 'Reporting workspace', sustainability: 'Sustainability', methodology: 'Methodology', intake: 'New initiative', initiative: 'Initiative' }

const HOME = { exec: 'cockpit', admin: 'cockpit', fpna: 'cockpit', leader: 'department', owner: 'mywork', procurement: 'mywork' }
const ALWAYS_OK = ['initiative', 'intake']
const SCOPED_PAGES = new Set(['portfolio', 'forecast', 'sustainability'])
const ROLE_LABEL = { admin: 'EVRO Lead', fpna: 'FP&A', leader: 'Function leader', owner: 'Initiative owner', procurement: 'Procurement', exec: 'Executive' }

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
  const [drawer, setDrawer] = useState(false)
  const [toast, setToast] = useState(null)
  const [userId, setUserId] = useState(null)

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
      else if (e.key === 'Escape') { setPalette(false); setCopilot(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const flash = useCallback((m) => setToast(m), [])
  const navigate = useCallback((p, opts = {}) => {
    if (p === 'initiative') setSelId(opts.id)
    setPage(p); setDrawer(false); window.scrollTo(0, 0)
  }, [])
  const openDrawer = useCallback((id) => setDrawerId(id), [])

  const dispatch = useCallback(async (action, ...args) => {
    const fn = MUTATIONS[action]
    if (!fn) return {}
    const res = fn(db, ...args)
    if (res.error) { flash(res.error); return res }
    setDb(res.db)
    if (source === 'postgres') {
      try { const out = await postAction(action, args); setDb(out.db); return { ...res, ...out } }
      catch { flash('Saved locally — server sync pending') }
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

  if (!db || !user) return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }} className="muted">Loading EVRO…</div>

  const Page = PAGES[page] || Cockpit
  const pageDb = SCOPED_PAGES.has(page) ? scopedView(db, user) : db
  const ctx = { db, source, user, caps, dispatch, navigate, flash, openDrawer, home: HOME[user.role] || 'cockpit' }

  return (
    <div className="layout">
      <aside className={`sidebar ${drawer ? 'open' : ''}`}>
        <NavBar page={page} navigate={navigate} onNew={() => navigate('intake')} showNew={caps.edit} role={user.role} roleLabel={ROLE_LABEL[user.role] || 'EVRO'} />
      </aside>
      <div className={`scrim ${drawer ? 'show' : ''}`} onClick={() => setDrawer(false)} />

      <div className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setDrawer((d) => !d)} aria-label="Menu"><IconMenu /></button>
          <div className="page-title">{TITLES[page]}</div>
          <div className="spacer" />
          <button className="copilot-btn hide-sm" onClick={() => setCopilot(true)} title="Ask EVRO (AI copilot)"><IconAI /> Ask EVRO</button>
          <button className="cmdk" onClick={() => setPalette(true)} title="Command palette (⌘K)"><IconSearch /> <span className="kbd">⌘K</span></button>
          <PersonaSwitch db={db} userId={userId} setUserId={setUserId} />
          <DataBadge source={source} />
        </header>
        <main className="content">
          <Page {...ctx} db={pageDb} id={selId} />
        </main>
      </div>

      <Drawer id={drawerId} ctx={ctx} onClose={() => setDrawerId(null)} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} screens={navScreens(user.role)} db={db} navigate={navigate} openDrawer={openDrawer} />
      <Copilot open={copilot} onClose={() => setCopilot(false)} db={db} user={user} openDrawer={openDrawer} />
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

function PersonaSwitch({ db, userId, setUserId }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7 }} title="Switch persona (RBAC + scope demo)">
      <span className="label hide-sm" style={{ marginBottom: 0 }}>Acting as</span>
      <select value={userId} onChange={(e) => setUserId(e.target.value)} style={{ padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 8, maxWidth: 200 }}>
        {db.people.map((p) => <option key={p.id} value={p.id}>{p.name} · {ROLE_LABEL[p.role] || p.role}</option>)}
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
  return <div className="toast">{msg}</div>
}
