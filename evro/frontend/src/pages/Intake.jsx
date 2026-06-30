import { useState } from 'react'
import { money } from '../lib/format.js'

export default function Intake({ db, user, caps, dispatch, navigate, flash, home = 'exec' }) {
  const owners = db.people.filter((p) => ['owner', 'leader', 'admin'].includes(p.role))
  const [f, setF] = useState({
    title: '', description: '', pillar: 'savings', benefit_type: 'reduction', approach: 'Cleansheet / should-cost',
    owner_id: (owners[0] || db.people[0]).id, spend_category_id: '', gross_annual_value: '', effort_score: 3,
    kr_link: db.krs[0]?.id || '', target_close: '',
  })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const addrCats = db.spend_categories.filter((c) => c.addressable)
  const groups = db.sourcing_groups

  const valid = f.title.trim() && f.owner_id && f.gross_annual_value && f.spend_category_id

  const submit = async () => {
    if (!valid) return flash('Title, owner, category and rough value are required.')
    const owner = db.people.find((p) => p.id === f.owner_id)
    const res = await dispatch('createInitiative', { ...f, department: owner?.fn }, user.id)
    if (res.id) { flash('Initiative submitted as Idea (25%)'); navigate('initiative', { id: res.id }) }
  }

  if (!caps.edit) {
    return <div className="note"><span>ℹ︎</span><span>The current persona is read-only. Switch to an Initiative owner, Function leader or EVRO Lead to submit an initiative.</span></div>
  }

  return (
    <>
      <p className="page-intro">Capture an idea. Required fields are enforced before it enters the pipeline as an <b>Idea (25% confidence)</b>. It earns value as it advances through the gates and is validated.</p>
      <div className="card pad" style={{ maxWidth: 760 }}>
        <div className="field"><label>Title</label><input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Tire program renegotiation — Maintenance Parts & Tires" /></div>
        <div className="field"><label>Problem statement / approach</label><textarea rows="3" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What is the lever, and how does it create value?" /></div>

        <div className="grid cols-3">
          <div className="field"><label>Pillar</label>
            <select value={f.pillar} onChange={(e) => { const p = e.target.value; set('pillar', p); set('benefit_type', p === 'avoidance' ? 'avoidance' : 'reduction') }}>
              <option value="savings">Cost Savings</option><option value="avoidance">Cost Avoidance</option>
            </select>
          </div>
          <div className="field"><label>Benefit type</label>
            <select value={f.benefit_type} onChange={(e) => set('benefit_type', e.target.value)}>
              {f.pillar === 'avoidance' ? <option value="avoidance">Cost Avoidance</option> : <><option value="reduction">Cost Reduction</option><option value="savings">Cost Savings</option></>}
            </select>
          </div>
          <div className="field"><label>Approach (McKinsey lever)</label>
            <select value={f.approach} onChange={(e) => set('approach', e.target.value)}>
              {['Cleansheet / should-cost', 'Negotiation win-room', 'Volume leverage / tiering', 'Supplier-base redesign', 'On-contract / maverick capture', 'Demand management', 'Index cap / price lock'].map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="grid cols-2">
          <div className="field"><label>Owner (accountable)</label>
            <select value={f.owner_id} onChange={(e) => set('owner_id', e.target.value)}>
              {owners.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.fn}</option>)}
            </select>
          </div>
          <div className="field"><label>Linked Company KR</label>
            <select value={f.kr_link} onChange={(e) => set('kr_link', e.target.value)}>
              {db.krs.map((k) => <option key={k.id} value={k.id}>{k.id} — {k.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field"><label>Spend category (baseline source)</label>
          <select value={f.spend_category_id} onChange={(e) => set('spend_category_id', e.target.value)}>
            <option value="">Select a category…</option>
            {groups.map((g) => (
              <optgroup key={g.id} label={g.name}>
                {addrCats.filter((c) => c.group_id === g.id).map((c) => <option key={c.id} value={c.id}>{c.name} ({money(c.spend)})</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid cols-2">
          <div className="field"><label>Rough annual value ($)</label><input value={f.gross_annual_value} onChange={(e) => set('gross_annual_value', e.target.value)} placeholder="e.g. 250000" /></div>
          <div className="field"><label>Effort score (1 easy – 5 hard)</label>
            <select value={f.effort_score} onChange={(e) => set('effort_score', e.target.value)}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
          </div>
        </div>
        <div className="field" style={{ maxWidth: 240 }}><label>Target close</label><input type="date" value={f.target_close} onChange={(e) => set('target_close', e.target.value)} /></div>

        <div className="btn-row section-gap">
          <button className="btn primary" disabled={!valid} onClick={submit}>Submit to pipeline</button>
          <button className="btn" onClick={() => navigate(home)}>Cancel</button>
        </div>
      </div>
    </>
  )
}
