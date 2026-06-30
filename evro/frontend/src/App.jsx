import { useEffect, useMemo, useState, useCallback } from 'react'
import { loadDB, saveLocal, postAction, resetLocal } from './lib/api.js'
import { MUTATIONS } from './lib/mutations.js'
import { scopedView } from './lib/engine.js'
import NavBar from './components/NavBar.jsx'
import { IconMenu } from './components/Icons.jsx'

import Exec from './pages/Exec.jsx'
import MyWork from './pages/MyWork.jsx'
import Department from './pages/Department.jsx'
import Portfolio from './pages/Portfolio.jsx'
import Forecast from './pages/Forecast.jsx'
import Opportunities from './pages/Opportunities.jsx'
import Spend from './pages/Spend.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Reporting from './pages/Reporting.jsx'
import Sustainability from './pages/Sustainability.jsx'
import Methodology from './pages/Methodology.jsx'
import Intake from './pages/Intake.jsx'
import Initiative from './pages/Initiative.jsx'

const PAGES = { exec: Exec, mywork: MyWork, department: Department, portfolio: Portfolio, forecast: Forecast, opportunities: Opportunities, spend: Spend, leaderboard: Leaderboard, reporting: Reporting, sustainability: Sustainability, methodology: Methodology, intake: Intake, initiative: Initiative }
const TITLES = { exec: 'Executive dashboard', mywork: 'My initiatives', department: 'My department', portfolio: 'Portfolio', forecast: 'Forecast workbench', opportunities: 'Opportunity board', spend: 'Spend explorer', leaderboard: 'Savings leaderboard', reporting: 'Reporting workspace', sustainability: 'Sustainability', methodology: 'Methodology', intake: 'New initiative', initiative: 'Initiative' }

// Nav + page visibility per role. Opportunities and Reporting are limited to the
// enterprise roles (exec / EVRO lead / FP&A). Leaders and owners get a scoped
// home (My Department / My Initiatives) instead of the enterprise dashboard.
const NAV_ITEMS = [
  { key: 'exec', label: 'Executive', roles: ['exec', 'admin', 'fpna'] },
  { key: 'department', label: 'My Department', roles: ['leader'] },
  { key: 'mywork', label: 'My Initiatives', roles: ['owner'] },
  { key: 'portfolio', label: 'Portfolio', roles: ['exec', 'admin', 'fpna', 'leader'] },
  { key: 'forecast', label: 'Forecast', roles: ['exec', 'admin', 'fpna', 'leader', 'owner'] },
  { key: 'reporting', label: 'Reporting', roles: ['exec', 'admin', 'fpna'] },
  { key: 'opportunities', label: 'Opportunities', roles: ['exec', 'admin', 'fpna'] },
  { key: 'spend', label: 'Spend Explorer', roles: ['exec', 'admin', 'fpna', 'leader', 'owner'] },
  { key: 'leaderboard', label: 'Leaderboard', roles: ['exec', 'admin', 'fpna', 'leader', 'owner'] },
  { key: 'sustainability', label: 'Sustainability', roles: ['exec', 'admin', 'fpna', 'leader', 'owner'] },
  { key: 'methodology', label: 'Methodology', roles: ['exec', 'admin', 'fpna', 'leader', 'owner'] },
]
const HOME = { exec: 'exec', admin: 'exec', fpna: 'exec', leader: 'department', owner: 'mywork' }
const ALWAYS_OK = ['initiative', 'intake'] // reachable by drill-down / action, not in the nav
const SCOPED_PAGES = new Set(['portfolio', 'forecast', 'sustainability'])
const ROLE_LABEL = { admin: 'EVRO Lead', fpna: 'FP&A', leader: 'Function leader', owner: 'Initiative owner', exec: 'Executive' }
const allowedKeys = (role) => NAV_ITEMS.filter((n) => n.roles.includes(role)).map((n) => n.key)

// Role → capabilities (PoC RBAC). Exec is read-only; FP&A validates; owners and
// leaders edit; leaders + admin can give Steering approval; admin edits config.
function capsFor(role) {
  switch (role) {
    case 'admin': return { edit: true, validate: true, steering: true, admin: true }
    case 'fpna': return { edit: false, validate: true, steering: false, admin: false }
    case 'leader': return { edit: true, validate: false, steering: true, admin: false }
    case 'owner': return { edit: true, validate: false, steering: false, admin: false }
    default: return { edit: false, validate: false, steering: false, admin: false } // exec / viewer
  }
}

export default function App() {
  const [db, setDb] = useState(null)
  const [source, setSource] = useState('local')
  const [page, setPage] = useState('exec')
  const [selId, setSelId] = useState(null)
  const [drawer, setDrawer] = useState(false)
  const [toast, setToast] = useState(null)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { db, source } = await loadDB()
      if (!alive) return
      setDb(db)
      setSource(source)
      const u = db.people.find((p) => p.role === 'admin') || db.people[0]
      setUserId(u.id)
      setPage(HOME[u.role] || 'exec')
    })()
    return () => { alive = false }
  }, [])

  const flash = useCallback((m) => setToast(m), [])
  const navigate = useCallback((p, opts = {}) => {
    if (p === 'initiative') setSelId(opts.id)
    setPage(p)
    setDrawer(false)
    window.scrollTo(0, 0)
  }, [])

  const dispatch = useCallback(async (action, ...args) => {
    const fn = MUTATIONS[action]
    if (!fn) return {}
    const res = fn(db, ...args)
    if (res.error) { flash(res.error); return res }
    setDb(res.db)
    if (source === 'postgres') {
      try {
        const out = await postAction(action, args)
        setDb(out.db)
        return { ...res, ...out }
      } catch { flash('Saved locally — server sync pending') }
    } else {
      saveLocal(res.db)
    }
    return res
  }, [db, source, flash])

  const user = useMemo(() => db?.people.find((p) => p.id === userId) || null, [db, userId])
  const caps = useMemo(() => capsFor(user?.role), [user])

  // When the persona changes, snap to that role's home if the current page is
  // no longer permitted (e.g. switching to an owner while on Opportunities).
  useEffect(() => {
    if (!user) return
    if (!allowedKeys(user.role).includes(page) && !ALWAYS_OK.includes(page)) {
      setPage(HOME[user.role] || 'exec')
      setSelId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!db || !user) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }} className="muted">Loading EVRO…</div>
  }

  const Page = PAGES[page] || Exec
  const navItems = NAV_ITEMS.filter((n) => n.roles.includes(user.role)).map((n) => ({ key: n.key, label: n.label }))
  const pageDb = SCOPED_PAGES.has(page) ? scopedView(db, user) : db
  const ctx = { db, source, user, caps, dispatch, navigate, flash, home: HOME[user.role] || 'exec' }

  return (
    <div className="layout">
      <aside className={`sidebar ${drawer ? 'open' : ''}`}>
        <NavBar page={page} navigate={navigate} onNew={() => navigate('intake')} showNew={caps.edit} items={navItems} roleLabel={ROLE_LABEL[user.role] || 'EVRO'} />
      </aside>
      <div className={`scrim ${drawer ? 'show' : ''}`} onClick={() => setDrawer(false)} />

      <div className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setDrawer((d) => !d)} aria-label="Menu"><IconMenu /></button>
          <div className="page-title">{TITLES[page]}</div>
          <div className="spacer" />
          <PersonaSwitch db={db} userId={userId} setUserId={setUserId} />
          <DataBadge source={source} />
        </header>
        <main className="content">
          <Page {...ctx} db={pageDb} id={selId} />
        </main>
      </div>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

function PersonaSwitch({ db, userId, setUserId }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7 }} title="Switch persona (RBAC + scope demo)">
      <span className="label" style={{ marginBottom: 0 }}>Acting as</span>
      <select value={userId} onChange={(e) => setUserId(e.target.value)} style={{ padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 8, maxWidth: 210 }}>
        {db.people.map((p) => (
          <option key={p.id} value={p.id}>{p.name} · {ROLE_LABEL[p.role] || p.role}</option>
        ))}
      </select>
    </label>
  )
}

function DataBadge({ source }) {
  return (
    <span className={`badge ${source === 'postgres' ? 'b-green' : 'b-grey'}`} title={source === 'postgres' ? 'Live PostgreSQL' : 'Demo snapshot (no backend) — changes persist in this browser'}>
      <span className="dot" style={{ background: 'currentColor' }} /> {source === 'postgres' ? 'Live DB' : 'Demo'}
    </span>
  )
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t) }, [msg, onDone])
  return <div className="toast">{msg}</div>
}
