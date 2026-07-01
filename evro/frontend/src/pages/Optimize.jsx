import { useMemo, useState } from 'react'
import { optimize } from '../lib/engine.js'
import { money, pct } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'

// Capital allocation — an interactive planning board. Drag initiatives between
// "Funded" and "Available" (or use the optimizer to auto-fill), and watch the
// budget meter, funded value and capital efficiency recompute live. The greedy
// knapsack (optimize()) is the baseline; the planner lets a human override it.
export default function Optimize({ db, openDrawer }) {
  const [mode, setMode] = useState('roi')

  // Full candidate universe (all pre-Launch investments) + total capital demand.
  const baseO = useMemo(() => optimize(db, 1e12, 'roi'), [db])
  const candidateCost = baseO.candidateCost
  // Default the new-investment envelope below total demand so the board opens
  // with a real funding decision (some funded, some on the bench).
  const initBudget = Math.max(500_000, Math.round((candidateCost * 0.6) / 250_000) * 250_000)
  const [budget, setBudget] = useState(initBudget)

  const candidates = useMemo(
    () => [...baseO.selected, ...baseO.deferred].sort((a, b) => (mode === 'roi' ? b.eff - a.eff : b.value - a.value)),
    [baseO, mode],
  )
  const byId = useMemo(() => Object.fromEntries(candidates.map((c) => [c.id, c])), [candidates])

  // Funded set — seeded from the optimizer at the default envelope, then editable.
  const [funded, setFunded] = useState(() => new Set(optimize(db, initBudget, 'roi').selected.map((s) => s.id)))
  const [dragId, setDragId] = useState(null)
  const [over, setOver] = useState(null)

  const fundedItems = candidates.filter((c) => funded.has(c.id))
  const availItems = candidates.filter((c) => !funded.has(c.id))
  const deployed = fundedItems.reduce((s, c) => s + c.cost, 0)
  const fundedValue = fundedItems.reduce((s, c) => s + c.value, 0)
  const overBudget = deployed > budget
  const efficiency = deployed ? fundedValue / (deployed / 1_000_000) : 0
  const meterPct = Math.min(100, (deployed / budget) * 100)

  const set = (id, into) => setFunded((prev) => {
    const next = new Set(prev)
    if (into) next.add(id); else next.delete(id)
    return next
  })
  const autoOptimize = () => setFunded(new Set(optimize(db, budget, mode).selected.map((s) => s.id)))
  const clear = () => setFunded(new Set())

  const onDrop = (into) => (e) => { e.preventDefault(); const id = dragId || e.dataTransfer.getData('text/plain'); if (id && byId[id]) set(id, into); setDragId(null); setOver(null) }

  return (
    <>
      <p className="page-intro">Capital allocation planning board — this cycle's <b>new-investment envelope</b> against the pre-Launch pipeline. Drag initiatives between <b>Funded</b> and <b>Available</b>, or let the optimizer auto-fill the highest-return set within the envelope. The meter, funded value and capital efficiency update live.</p>

      <div className="card pad">
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <div className="card-h" style={{ marginBottom: 6 }}><span className="label" style={{ marginBottom: 0 }}>New-investment envelope</span><span className="spacer" /><b className="mono">{money(budget)}</b></div>
            <input type="range" min={500000} max={Math.max(8_000_000, candidateCost)} step={250000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: '100%' }} />
            <div className="tiny muted">Total capital requested by the {candidates.length} pre-Launch candidates: {money(candidateCost)}</div>
          </div>
          <div className="seg">
            <button className={mode === 'roi' ? 'active' : ''} onClick={() => setMode('roi')}>Best ROI</button>
            <button className={mode === 'value' ? 'active' : ''} onClick={() => setMode('value')}>Biggest Return</button>
          </div>
          <div className="btn-row">
            <button className="btn primary sm" onClick={autoOptimize}>⚡ Auto-optimize</button>
            <button className="btn sm" onClick={clear}>Clear</button>
          </div>
        </div>

        {/* budget meter */}
        <div className="section-gap">
          <div className="meter" title={`${money(deployed)} of ${money(budget)}`}>
            <i style={{ width: `${meterPct}%`, background: overBudget ? 'var(--red)' : 'var(--green)' }} />
          </div>
          <div className="tiny" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span className={overBudget ? '' : 'muted'} style={{ color: overBudget ? 'var(--red)' : undefined, fontWeight: overBudget ? 700 : 400 }}>
              {money(deployed)} deployed {overBudget ? `· ${money(deployed - budget)} over budget` : `· ${money(budget - deployed)} headroom`}
            </span>
            <span className="muted">{pct(meterPct / 100)} of budget</span>
          </div>
        </div>
      </div>

      <div className="tiles section-gap">
        <Tile tone="dark" label="Capital deployed" value={money(deployed)} sub={overBudget ? 'over budget' : `${money(budget - deployed)} headroom`} />
        <Tile tone="green" label="Risk-adjusted value funded" value={money(fundedValue)} sub={`${fundedItems.length} initiatives`} />
        <Tile tone="navy" label="Capital efficiency" value={deployed ? money(efficiency) : '—'} sub="RAV per $1M deployed" />
        <Tile tone="red" label="Available, unfunded" value={availItems.length} sub={`${money(availItems.reduce((s, c) => s + c.value, 0))} RAV on the bench`} />
      </div>

      {overBudget && <div className="note section-gap" style={{ borderColor: 'var(--line)', background: 'var(--tint-red)' }}><span>⚑</span><span>Funded set is <b>{money(deployed - budget)}</b> over the capital budget. Drop something back to Available, or raise the budget.</span></div>}

      <div className="grid cols-2 section-gap alloc-grid">
        <div className={`card pad dropzone ${over === 'funded' ? 'over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver('funded') }} onDragLeave={() => setOver(null)} onDrop={onDrop(true)}>
          <div className="card-h"><h3>Funded</h3><span className="spacer" /><span className={`badge ${overBudget ? 'b-red' : 'b-green'}`}>{fundedItems.length} · {money(deployed)}</span></div>
          <div className="alloc-list">
            {fundedItems.length === 0 ? <div className="alloc-empty">Drag initiatives here to fund them.</div> : fundedItems.map((c) => (
              <AllocCard key={c.id} c={c} funded onDragStart={() => setDragId(c.id)} onMove={() => set(c.id, false)} onOpen={() => openDrawer(c.id)} />
            ))}
          </div>
        </div>

        <div className={`card pad dropzone ${over === 'avail' ? 'over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver('avail') }} onDragLeave={() => setOver(null)} onDrop={onDrop(false)}>
          <div className="card-h"><h3>Available</h3><span className="spacer" /><span className="badge b-grey">{availItems.length}</span></div>
          <div className="alloc-list">
            {availItems.length === 0 ? <div className="alloc-empty">Everything is funded.</div> : availItems.map((c) => (
              <AllocCard key={c.id} c={c} onDragStart={() => setDragId(c.id)} onMove={() => set(c.id, true)} onOpen={() => openDrawer(c.id)} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function AllocCard({ c, funded, onDragStart, onMove, onOpen }) {
  return (
    <div className="alloc-card" draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move'; onDragStart() }}>
      <span className="grip" aria-hidden>⠿</span>
      <button className="link alloc-title" onClick={onOpen} title="Open initiative">{c.title}</button>
      <div className="alloc-meta">
        <span className="mono" title="Risk-adjusted value">{money(c.value)}</span>
        <span className="mono muted" title="Capital required">{money(c.cost)}</span>
        <span className="badge b-grey" title="RAV per $ of capital">{c.eff.toFixed(2)}×</span>
      </div>
      <button className={`btn sm ${funded ? '' : 'go'}`} onClick={onMove} title={funded ? 'Move to Available' : 'Fund this'}>{funded ? '−' : '+'}</button>
    </div>
  )
}
