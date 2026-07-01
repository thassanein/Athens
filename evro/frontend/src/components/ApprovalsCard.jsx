import { canApproveRoles, approvalState, ROLE_APPROVE_LABEL, personName, STAGE_LABEL } from '../lib/engine.js'
import { money } from '../lib/format.js'

// Pending approval requests this user is entitled to act on. Renders nothing for
// users who can't approve anything (e.g. read-only exec, owners).
export default function ApprovalsCard({ db, user, navigate }) {
  const items = db.initiatives.filter((i) => i.request && canApproveRoles(user, i).length > 0)
  if (items.length === 0) return null
  return (
    <div className="card pad section-gap">
      <div className="card-h"><h3>Approvals awaiting you</h3><span className="spacer" /><span className="badge b-amber">{items.length}</span></div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Initiative</th><th>Request</th><th>Owner</th><th className="num">Value</th><th>Your sign-off</th></tr></thead>
          <tbody>
            {items.map((i) => {
              const st = approvalState(i)
              return (
                <tr key={i.id} className="clickable" onClick={() => navigate('initiative', { id: i.id })}>
                  <td><b>{i.title}</b></td>
                  <td>{st.kind === 'intake' ? 'New project' : `Advance → ${STAGE_LABEL[st.to_stage]}`}</td>
                  <td className="nowrap">{personName(db, i.request.requested_by)}</td>
                  <td className="num mono">{money(i.gross_annual_value)}</td>
                  <td><span className="badge b-amber">{canApproveRoles(user, i).map((r) => ROLE_APPROVE_LABEL[r]).join(' + ')}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
