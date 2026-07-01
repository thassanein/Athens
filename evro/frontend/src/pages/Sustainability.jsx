import { rav, isActive, personName } from '../lib/engine.js'
import { money, num } from '../lib/format.js'
import { Tile } from '../components/ui.jsx'
import { HBars } from '../components/Charts.jsx'

// Light sustainability lens (PoC): cost initiatives that also advance diversion.
// Tons diverted / contamination reduction are ILLUSTRATIVE, derived from value
// for facilities-linked groups — they would be entered per-initiative in production.
const GREEN_GROUPS = { 'g-disposal': 1, 'g-containers': 1, 'g-maint': 0.5 }
function greenTag(i) {
  const factor = GREEN_GROUPS[i.group_id] || (/MRF|Organics|Post/i.test(i.department || '') ? 1 : 0)
  if (!factor) return null
  return {
    tons: Math.round((rav(i) / 45) * factor),
    contaminationPts: Math.max(0.2, ((rav(i) / 1e6) * 1.5 * factor)).toFixed(1),
  }
}

export default function Sustainability({ db, navigate }) {
  const tagged = db.initiatives.filter(isActive).map((i) => ({ i, g: greenTag(i) })).filter((x) => x.g)
  const totalTons = tagged.reduce((a, x) => a + x.g.tons, 0)
  const totalValue = tagged.reduce((a, x) => a + rav(x.i), 0)

  return (
    <>
      <p className="page-intro">A first-class lens linking financial value to environmental outcomes — which cost initiatives also advance diversion, organics and three-stream goals. <i>Tons diverted and contamination figures below are illustrative for the PoC.</i></p>

      <div className="tiles">
        <Tile tone="green" label="Diversion-linked value (RAV)" value={money(totalValue)} sub={`${tagged.length} initiatives`} />
        <Tile tone="navy" label="Tons diverted (illustrative)" value={num(totalTons)} sub="per year, from tagged initiatives" />
        <Tile tone="dark" label="Cost & sustainability aligned" value={`${tagged.length}`} sub="initiatives advancing both" />
      </div>

      <div className="grid cols-2 section-gap">
        <div className="card pad">
          <div className="card-h"><h3>Cost-to-serve vs diversion</h3></div>
          <HBars data={tagged.slice(0, 8).map((x) => ({ label: x.i.title.length > 24 ? x.i.title.slice(0, 23) + '…' : x.i.title, value: x.g.tons, color: 'var(--green)' }))} fmt={(v) => `${num(v)} t`} />
          <p className="tiny muted section-gap">Initiatives where savings and diversion reinforce each other (Disposal, Containers, MRF/Organics).</p>
        </div>
        <div className="card pad">
          <div className="card-h"><h3>Tagged initiatives</h3></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Initiative</th><th>Owner</th><th className="num">RAV</th><th className="num">Tons</th><th className="num">Contam. ↓</th></tr></thead>
              <tbody>
                {tagged.map((x) => (
                  <tr key={x.i.id} className="clickable" onClick={() => navigate('initiative', { id: x.i.id })}>
                    <td><b>{x.i.title}</b></td><td>{personName(db, x.i.owner_id)}</td>
                    <td className="num mono">{money(rav(x.i))}</td><td className="num mono">{num(x.g.tons)}</td><td className="num mono">{x.g.contaminationPts} pts</td>
                  </tr>
                ))}
                {tagged.length === 0 && <tr><td colSpan="5" className="muted">No diversion-linked initiatives.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
