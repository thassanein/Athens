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
import { ownerFor } from './lib/employees.js'

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

  // Bootstrap: load the portfolio in the background and ALWAYS land on the
  // Auditor/Viewer chooser. This is an open-access app — the role is a
  // deliberate client-side choice, so we never auto-enter (even if the server
  // reports a session). The chooser is mandatory; each role carries its own
  // access (auditor = edit, viewer = read-only).
  useEffect(() => {
    let alive = true
    ;(async () => {
      // Probe the server, retrying through a free-tier cold start (~30-60s) so a
      // sleeping service wakes before we read its data. We only use this to pick
      // live vs snapshot data — never to skip the chooser.
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

  // Batch-create findings from an audit's deficiencies ("No" answers). Each
  // becomes an open, action-driven finding: assigned to the site's compliance
  // owner with a 2-week due date, carrying the auditor's note + photo evidence.
  const logAuditFindings = useCallback(
    async (siteName, defs) => {
      const owner = ownerFor(siteName).name
      const due = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
      const next = structuredClone(data)
      const created = []
      defs.forEach((d, i) => {
        const localId = `f-${Date.now()}-${Math.floor(Math.random() * 1e4)}-${i}`
        const finding = {
          id: localId,
          dept: 'Facility',
          area: (d.zone || d.section || 'Audit').slice(0, 40),
          title: (d.text || 'Audit finding').slice(0, 80),
          status: 'open',
          owner: d.owner || owner,
          due: d.due || due,
          note: `[Audit${d.section ? ` · ${d.section}` : ''}] ${d.ref ? d.ref + ': ' : ''}${d.text}${d.note ? ` — ${d.note}` : ''}`,
          photo: d.photo || null,
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

  // Landing page: show the Auditor/Viewer chooser immediately on open, while the
  // portfolio loads in the background — so a cold start never blocks the role
  // choice behind a spinner.
  if (screen === 'login') {
    return (
      <div className="app-shell">
        <Login
          source={source}
          mode={authMode}
          onEnter={(u) => {
            // The user explicitly picked a profile (Auditor or Viewer); each
            // carries its own access (auditor = edit, viewer = read-only) and
            // identity. This is the only way into the app — no auto-enter.
            setUser(u && typeof u === 'object' ? u : USERS[u] || USERS.auditor)
            setScreen('map')
          }}
        />
      </div>
    )
  }

  // Past the chooser: wait for the portfolio before rendering the app shell.
  if (loading || !data) return Loading

  const badge = alertCount(data)
  const canEdit = user.role === 'auditor'

  return (
    <div className="app-shell">
      {screen === 'map' && <MapScreen data={data} user={user} onOpenSite={openSite} onNav={setScreen} onBack={() => setScreen('login')} />}
      {screen === 'tasks' && (
        <Tasks
          data={data}
          filter={taskFilter}
          setFilter={setTaskFilter}
          onOpenFinding={(site, id) => openSite(site, { tab: 'findings', focus: id })}
          onBack={() => setScreen('map')}
        />
      )}
      {screen === 'alerts' && <Alerts data={data} onOpenSite={openSite} onBack={() => setScreen('map')} />}
      {screen === 'profile' && (
        <Profile
          user={user}
          source={source}
          settings={settings}
          setSettings={setSettings}
          onBack={() => setScreen('map')}
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
          onLogDeficiencies={logAuditFindings}
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
