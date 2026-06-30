import { useEffect, useMemo, useState, useCallback } from 'react'
import { loadDB, saveLocal, postAction, resetLocal } from './lib/api.js'
import { MUTATIONS } from './lib/mutations.js'
import NavBar from './components/NavBar.jsx'
import { IconMenu } from './components/Icons.jsx'

import Exec from './pages/Exec.jsx'
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

const PAGES = { exec: Exec, portfolio: Portfolio, forecast: Forecast, opportunities: Opportunities, spend: Spend, leaderboard: Leaderboard, reporting: Reporting, sustainability: Sustainability, methodology: Methodology, intake: Intake, initiative: Initiative }
const TITLES = { exec: 'Executive dashboard', portfolio: 'Portfolio', forecast: 'Forecast workbench', opportunities: 'Opportunity board', spend: 'Spend explorer', leaderboard: 'Savings leaderboard', reporting: 'Reporting workspace', sustainability: 'Sustainability', methodology: 'Methodology', intake: 'New initiative', initiative: 'Initiative' }

// Role → capabilities (PoC RBAC). Exec is read-only; FP&A validates; owners and
// leaders edit; leaders + admin can give Steering approval; admin edits config.
function capsFor(role) {
  switch (role) {
    case 'admin': return { edit: true, validate: true, steering: true, admin: true }
    case 'fpna': return { edit: true, validate: true, steering: false, admin: false }
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
      // default persona: the EVRO Lead (admin) so a walkthrough has full powers
      setUserId(db.people.find((p) => p.role === 'admin')?.id || db.people[0].id)
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

  // Dispatch a write: apply the pure reducer locally (optimistic) and, in
  // postgres mode, persist server-side then adopt the server's authoritative db.
  const dispatch = useCallback(async (action, ...args) => {
    const fn = MUTATIONS[action]
    if (!fn) return {}
    const res = fn(db, ...args)
    if (res.error) { flash(res.error); return res }
    setDb(res.db)
    if (source === 'postgres') {
      try {
        const out = await postAction(action, args) // { db, id? } authoritative
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

  if (!db || !user) {
    return <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }} className="muted">Loading EVRO…</div>
  }

  const Page = PAGES[page] || Exec
  const ctx = { db, source, user, caps, dispatch, navigate, flash,
    onReset: () => { resetLocal(); window.location.reload() } }

  return (
    <div className="layout">
      <aside className={`sidebar ${drawer ? 'open' : ''}`}>
        <NavBar page={page} navigate={navigate} onNew={() => navigate('intake')} />
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
          <Page {...ctx} id={selId} />
        </main>
      </div>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

function PersonaSwitch({ db, userId, setUserId }) {
  const ROLE_LABEL = { admin: 'EVRO Lead', fpna: 'FP&A', leader: 'Function leader', owner: 'Initiative owner', exec: 'Executive (read-only)' }
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7 }} title="Switch persona (RBAC demo)">
      <span className="label" style={{ marginBottom: 0 }}>Acting as</span>
      <select value={userId} onChange={(e) => setUserId(e.target.value)} style={{ padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 8, maxWidth: 200 }}>
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
