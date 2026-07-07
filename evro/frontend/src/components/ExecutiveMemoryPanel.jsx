import { useState } from 'react'
import { memoryEntries, clearMemory, resetMemory } from '../lib/memory.js'

// ExecutiveMemoryPanel (6D Wave 4) — Executive Memory, made visible. Every
// remembered fact shows WHAT is remembered and WHY ("remembered because…"),
// and can be forgotten one item at a time or wiped entirely. Transparent,
// editable, respectful: it holds only how you use EVRO, never anything
// personal and never any portfolio value. labelFor maps page keys to labels.
export default function ExecutiveMemoryPanel({ labelFor }) {
  const [, force] = useState(0)
  const entries = memoryEntries(labelFor)
  const rerender = () => force((n) => n + 1)

  return (
    <div className="card pad emp">
      <div className="card-h" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <h3>What EVRO remembers</h3>
        <span className="spacer" />
        <span className="badge b-grey">transparent · editable · local to this browser</span>
      </div>
      {entries.length === 0 ? (
        <p className="emp-empty">Nothing remembered yet. As you use EVRO, it will note which views you open
        and your preferred modes — always shown here, always editable.</p>
      ) : (
        <div className="emp-rows">
          {entries.map((e) => (
            <div key={e.id} className="emp-row">
              <div className="emp-main">
                <div className="emp-label">{e.label}</div>
                <div className="emp-value">{e.value}</div>
                <div className="emp-because"><span className="emp-because-l">EVRO remembered this because</span> {e.because}</div>
              </div>
              <button className="emp-forget" onClick={() => { clearMemory(e.id); rerender() }}
                aria-label={`Forget: ${e.label}`}>Forget</button>
            </div>
          ))}
        </div>
      )}
      <div className="emp-foot">
        <p className="emp-privacy">Executive Memory stores only usage preferences in this browser — no personal
        data, no portfolio value, nothing leaves the device. It never influences the value math.</p>
        {entries.length > 0 && (
          <button className="btn ghost sm" onClick={() => { resetMemory(); rerender() }}>Reset all memory</button>
        )}
      </div>
    </div>
  )
}
