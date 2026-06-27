import { useEffect, useState, useCallback } from 'react'
import { loadPortfolio, saveLocal, patchChecklist, postFinding, patchPermit } from './lib/api.js'
import { alertCount } from './lib/derive.js'

import Login from './screens/Login.jsx'
import MapScreen from './screens/MapScreen.jsx'
import Tasks from './screens/Tasks.jsx'
import Alerts from './screens/Alerts.jsx'
import Profile from './screens/Profile.jsx'
import SiteRecord from './screens/SiteRecord.jsx'
import TabBar from './components/TabBar.jsx'
import Capture from './components/Capture.jsx'
import Toast from './components/Toast.jsx'

const DEFAULT_USER = { name: 'Dave Marin', role: 'Field Auditor · EHS', initials: 'DM' }

export default function App() {
  // ---- global state (see README "State management") ----
  const [screen, setScreen] = useState('login') // login|map|tasks|alerts|profile
  const [data, setData] = useState(null)
  const [source, setSource] = useState('local') // postgres|local
  const [capture, setCapture] = useState(null) // draft finding or null
  const [siteView, setSiteView] = useState(null) // {site, tab?, focus?} or null
  const [taskFilter, setTaskFilter] = useState('all')
  const [settings, setSettings] = useState({ push: true, offline: true, camera: true })
  const [user] = useState(DEFAULT_USER)
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load the portfolio on mount (API with 700ms timeout → snapshot fallback).
  useEffect(() => {
    let alive = true
    loadPortfolio().then(({ data, source }) => {
      if (!alive) return
      setData(data)
      setSource(source)
      setLoading(false)
    })
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

  if (loading || !data) {
    return (
      <div className="app-shell">
        <div className="screen" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
          <div className="muted">Loading portfolio…</div>
        </div>
      </div>
    )
  }

  if (screen === 'login') {
    return (
      <div className="app-shell">
        <Login source={source} onEnter={() => setScreen('map')} />
      </div>
    )
  }

  const badge = alertCount(data)

  return (
    <div className="app-shell">
      {screen === 'map' && <MapScreen data={data} onOpenSite={openSite} />}
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
          onSignOut={() => setScreen('login')}
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
          onClose={() => setSiteView(null)}
          onUpdateFinding={updateFinding}
          onUpdatePermit={updatePermit}
          onCapture={(area) =>
            setCapture({ site: siteView.site, dept: 'ENV', area: area || '', note: '', owner: '', due: '', photo: null })
          }
          flash={flash}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
