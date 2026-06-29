import { useEffect, useState, useCallback } from 'react'
import {
  loadPortfolio,
  saveLocal,
  patchChecklist,
  postFinding,
  patchPermit,
  fetchMe,
  authLogoutUrl,
} from './lib/api.js'
import { alertCount } from './lib/derive.js'

import Login from './screens/Login.jsx'
import MapScreen from './screens/MapScreen.jsx'
import Tasks from './screens/Tasks.jsx'
import Alerts from './screens/Alerts.jsx'
import Profile from './screens/Profile.jsx'
import SiteRecord from './screens/SiteRecord.jsx'
import AuditRunner from './screens/AuditRunner.jsx'
import TabBar from './components/TabBar.jsx'
import Capture from './components/Capture.jsx'
import Toast from './components/Toast.jsx'

// Two roles / two demo logins. Auditors can edit findings (comments, photos,
// details, status); viewers are read-only on existing findings (but may still
// capture new ones).
const USERS = {
  auditor: { name: 'Dave Marin', role: 'auditor', title: 'Field Auditor · EHS', initials: 'DM' },
  viewer: { name: 'Sam Okafor', role: 'viewer', title: 'Site Viewer · Read-only', initials: 'SO' },
}

export default function App() {
  // ---- global state (see README "State management") ----
  const [screen, setScreen] = useState('login') // login|map|tasks|alerts|profile
  const [data, setData] = useState(null)
  const [source, setSource] = useState('local') // postgres|local
  const [capture, setCapture] = useState(null) // draft finding or null
  const [siteView, setSiteView] = useState(null) // {site, tab?, focus?} or null
  const [auditTarget, setAuditTarget] = useState(null) // { site, openId?, template? } or null
  const [taskFilter, setTaskFilter] = useState('all')
  const [settings, setSettings] = useState({ push: true, offline: true, camera: true })
  const [user, setUser] = useState(USERS.auditor)
  const [authMode, setAuthMode] = useState('demo') // 'demo' (no server) | 'sso' (Microsoft)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [waking, setWaking] = useState(false) // server cold-starting (free tier)

  // Bootstrap: ask the server who we are, then load the portfolio.
  //  - authed  → set the signed-in user and go straight to the app.
  //  - login   → server requires Microsoft sign-in → show the SSO login screen.
  //  - demo    → no server (e.g. Pages) → snapshot + the two demo logins.
  useEffect(() => {
    let alive = true
    ;(async () => {
      // Reach the server, retrying through a free-tier cold start (~30-60s).
      // A timed-out /auth/me means the service is waking; keep trying (with a
      // "waking up" message) until it answers or the window closes, then fall
      // back to the bundled snapshot so the app is never stuck on a spinner.
      const deadline = Date.now() + 75000
      let me = await fetchMe()
      while (alive && me.state === 'demo' && me.timedOut && Date.now() < deadline) {
        setWaking(true)
        await new Promise((r) => setTimeout(r, 2500))
        if (!alive) return
        me = await fetchMe()
      }
      setWaking(false)
      if (!alive) return

      if (me.state === 'login') {
        setAuthMode(me.mode === 'passcode' ? 'passcode' : 'sso')
        setLoading(false) // show the login screen (passcode or Microsoft)
        return
      }

      if (me.state === 'authed') {
        const u = me.user
        setAuthMode(u.mode === 'open' ? 'demo' : u.mode === 'passcode' ? 'passcode' : 'sso')
        setUser({
          name: u.name,
          role: u.role,
          title: u.role === 'auditor' ? 'Field Auditor · EHS' : 'Site Viewer · Read-only',
          initials: u.initials || 'A',
          email: u.email,
        })
        const portfolio = await loadPortfolio()
        if (!alive) return
        setData(portfolio.data)
        setSource(portfolio.source)
        setScreen('map') // already signed in — skip the login screen
        setLoading(false)
        return
      }

      // demo: no server reachable
      setAuthMode('demo')
      const portfolio = await loadPortfolio()
      if (!alive) return
      setData(portfolio.data)
      setSource(portfolio.source)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const flash = useCallback((msg) => setToast(msg), [])

  // Persist to localStorage whenever data changes in demo mode.
  const persist = useCallback(
    (next) => {
      setData(next)
      if (source !== 'postgres') saveLocal(next)
    },
    [source]
  )

  const openSite = useCallback((site, opts = {}) => {
    setSiteView({ site, tab: opts.tab || 'findings', focus: opts.focus || null })
  }, [])

  // ---- write handlers ----
  const updateFinding = useCallback(
    async (siteName, id, patch) => {
      const next = structuredClone(data)
      const item = next[siteName].checklist.find((c) => c.id === id)
      if (item) Object.assign(item, patch)
      persist(next)
      try {
        await patchChecklist(id, patch, source)
      } catch {
        flash('Saved locally — sync pending')
      }
    },
    [data, source, persist, flash]
  )

  const updatePermit = useCallback(
    async (siteName, id, status) => {
      const next = structuredClone(data)
      const p = next[siteName].permits.find((x) => x.id === id)
      if (p) p.status = status
      persist(next)
      try {
        await patchPermit(id, status, source)
      } catch {
        flash('Saved locally — sync pending')
      }
    },
    [data, source, persist, flash]
  )

  // Batch-create findings from an audit's deficiencies ("No" answers).
  const logAuditFindings = useCallback(
    async (siteName, defs) => {
      const next = structuredClone(data)
      const created = []
      defs.forEach((d, i) => {
        const localId = `f-${Date.now()}-${Math.floor(Math.random() * 1e4)}-${i}`
        const finding = {
          id: localId,
          dept: 'Facility',
          area: (d.section || 'Audit').slice(0, 40),
          title: (d.text || 'Audit finding').slice(0, 80),
          status: 'open',
          owner: null,
          due: null,
          note: `[Audit] ${d.ref ? d.ref + ': ' : ''}${d.text}${d.note ? ` — ${d.note}` : ''}`,
          photo: null,
          source: 'field',
          lat: null,
          lng: null,
        }
        next[siteName].checklist.unshift(finding)
        created.push(finding)
      })
      persist(next)
      for (const f of created) {
        try {
          const row = await postFinding({ ...f, site: siteName }, source)
          if (row?.id && row.id !== f.id) {
            const sync = structuredClone(next)
            const c = sync[siteName].checklist.find((x) => x.id === f.id)
            if (c) c.id = row.id
            persist(sync)
          }
        } catch {
          /* already persisted locally */
        }
      }
    },
    [data, source, persist]
  )

  const saveCapture = useCallback(
    async (draft) => {
      const localId = `f-${Date.now()}-${Math.floor(Math.random() * 1e4)}`
      const finding = {
        id: localId,
        dept: draft.dept,
        area: draft.area,
        title: draft.note?.slice(0, 80) || 'Field finding',
        status: 'open',
        owner: draft.owner || null,
        due: draft.due || null,
        note: draft.note || '',
        photo: draft.photo || null,
        source: 'field',
        lat: draft.lat ?? null,
        lng: draft.lng ?? null,
      }
      const next = structuredClone(data)
      next[draft.site].checklist.unshift(finding)
      persist(next)
      setCapture(null)
      flash('Finding logged')
      try {
        const row = await postFinding({ ...finding, site: draft.site }, source)
        if (row?.id && row.id !== localId) {
          // reconcile server id
          const sync = structuredClone(next)
          const created = sync[draft.site].checklist.find((c) => c.id === localId)
          if (created) created.id = row.id
          persist(sync)
        }
      } catch {
        /* already persisted locally */
      }
    },
    [data, source, persist, flash]
  )

  const Loading = (
    <div className="app-shell">
      <div className="screen" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 280 }}>
          <div className="muted">{waking ? 'Waking up the server…' : 'Loading…'}</div>
          {waking && (
            <div className="muted" style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>
              First load after a quiet period can take up to a minute.
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) return Loading

  if (screen === 'login') {
    return (
      <div className="app-shell">
        <Login
          source={source}
          mode={authMode}
          onEnter={(u) => {
            // Demo mode only — SSO mode redirects to Microsoft instead.
            // Login passes a full user object (chosen employee + role).
            setUser(u && typeof u === 'object' ? u : USERS[u] || USERS.auditor)
            setScreen('map')
          }}
        />
      </div>
    )
  }

  if (!data) return Loading

  const badge = alertCount(data)
  const canEdit = user.role === 'auditor'

  return (
    <div className="app-shell">
      {screen === 'map' && <MapScreen data={data} user={user} onOpenSite={openSite} onNav={setScreen} />}
      {screen === 'tasks' && (
        <Tasks
          data={data}
          filter={taskFilter}
          setFilter={setTaskFilter}
          onOpenFinding={(site, id) => openSite(site, { tab: 'findings', focus: id })}
        />
      )}
      {screen === 'alerts' && <Alerts data={data} onOpenSite={openSite} />}
      {screen === 'profile' && (
        <Profile
          user={user}
          source={source}
          settings={settings}
          setSettings={setSettings}
          onSignOut={() => {
            if (authMode === 'sso' || authMode === 'passcode') window.location.href = authLogoutUrl
            else setScreen('login')
          }}
        />
      )}

      <TabBar
        screen={screen}
        setScreen={setScreen}
        onCapture={() => setCapture({ site: Object.keys(data)[0], dept: 'ENV', area: '', note: '', owner: '', due: '', photo: null })}
        alertBadge={badge}
      />

      {capture && (
        <Capture
          draft={capture}
          setDraft={setCapture}
          sites={Object.keys(data)}
          cameraDefault={settings.camera}
          onClose={() => setCapture(null)}
          onSave={saveCapture}
        />
      )}

      {siteView && (
        <SiteRecord
          name={siteView.site}
          site={data[siteView.site]}
          initialTab={siteView.tab}
          focusId={siteView.focus}
          source={source}
          canEdit={canEdit}
          onClose={() => setSiteView(null)}
          onUpdateFinding={updateFinding}
          onUpdatePermit={updatePermit}
          onCapture={(area) =>
            setCapture({ site: siteView.site, dept: 'ENV', area: area || '', note: '', owner: '', due: '', photo: null })
          }
          onStartAudit={(opts) => setAuditTarget({ site: siteView.site, openId: opts?.openId || null, template: opts?.template || null })}
          auditOpen={!!auditTarget}
          userName={user.name}
          flash={flash}
        />
      )}

      {auditTarget && data[auditTarget.site] && (
        <AuditRunner
          name={auditTarget.site}
          site={data[auditTarget.site]}
          source={source}
          openId={auditTarget.openId}
          openTemplate={auditTarget.template}
          onClose={() => setAuditTarget(null)}
          onLogDeficiencies={logAuditFindings}
          flash={flash}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
