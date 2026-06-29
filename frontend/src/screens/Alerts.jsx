import { buildAlerts } from '../lib/derive.js'
import { IconAlerts, IconDoc, IconPin, IconChevron } from '../components/Icons.jsx'
import BackButton from '../components/BackButton.jsx'

const KIND_ICON = {
  unowned: <IconProfileless />,
  verify: <IconDoc />,
  renew: <IconPin />,
}

function IconProfileless() {
  return <IconAlerts size={18} />
}

export default function Alerts({ data, onOpenSite, onBack }) {
  const alerts = buildAlerts(data)

  return (
    <div className="screen">
      <div className="header">
        <BackButton onClick={onBack} label="Home" />
        <div className="title">Alerts</div>
        <div style={{ color: '#9FB0C4', fontSize: 13, marginTop: 4 }}>
          {alerts.length} item{alerts.length === 1 ? '' : 's'} need attention
        </div>
      </div>

      <div className="pad">
        {alerts.length === 0 ? (
          <div className="card" style={{ padding: 28, textAlign: 'center' }}>
            <div className="h2">All caught up</div>
            <div className="muted" style={{ marginTop: 6 }}>
              No verifications or unowned findings.
            </div>
          </div>
        ) : (
          <div className="stack">
            {alerts.map((a) => {
              const tone = a.tone // fail | open
              return (
                <button
                  key={a.id}
                  className={`card lrow bd-${tone}`}
                  onClick={() => onOpenSite(a.site, { tab: a.kind === 'verify' || a.kind === 'renew' ? 'permits' : 'findings' })}
                  style={{ width: '100%', textAlign: 'left', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span
                    className={`s-${tone}`}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: tone === 'fail' ? 'var(--tint-fail)' : 'var(--tint-open)',
                      display: 'grid',
                      placeItems: 'center',
                      flex: '0 0 auto',
                    }}
                  >
                    {KIND_ICON[a.kind]}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="h2" style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.title}
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {a.detail}
                    </div>
                  </div>
                  <span className={`pill bg-${tone} s-${tone}`} style={{ fontSize: 10.5 }}>
                    {a.tag}
                  </span>
                  <span className="muted">
                    <IconChevron size={18} />
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
