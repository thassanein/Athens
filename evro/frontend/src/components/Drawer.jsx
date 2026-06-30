import Initiative from '../pages/Initiative.jsx'
import { IconClose } from './Icons.jsx'

// Right-side contextual panel — drill into any initiative without leaving the
// current screen ("the dashboard IS the application").
export default function Drawer({ id, ctx, onClose }) {
  if (!id) return null
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Initiative detail">
        <div className="drawer-head">
          <b>Initiative</b>
          <span className="spacer" />
          <button className="btn sm" onClick={() => { ctx.navigate('initiative', { id }); onClose() }}>Full page ↗</button>
          <button className="iconbtn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>
        <div className="drawer-body">
          <Initiative {...ctx} id={id} embedded home={ctx.home} />
        </div>
      </aside>
    </>
  )
}
