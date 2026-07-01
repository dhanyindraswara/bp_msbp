// STONES › Document Action Request — placeholder module (no requirements yet).
// Shows a dummy request queue to convey the intended shape.
const DUMMY = [
  { id: 'DAR-0007', title: 'Approve C3.1 HSE Marine & Logistic v1.0', type: 'Approval', status: 'Pending', requester: 'M. Rizky' },
  { id: 'DAR-0006', title: 'Review Management System risk register', type: 'Review', status: 'In progress', requester: 'A. Putri' },
  { id: 'DAR-0005', title: 'Publish Mine Closure Governance', type: 'Publish', status: 'Approved', requester: 'D. Indraswara' },
]

const statusClass = (s) =>
  s === 'Approved' ? 'st st-ok' : s === 'Pending' ? 'st st-warn' : 'st st-info'

export default function DocumentActionRequest() {
  return (
    <div className="stones-page">
      <div className="stones-page-hd stones-page-hd-row">
        <div>
          <h1>Document Action Request</h1>
          <p>Requests to review, approve or publish Business Process documents.</p>
        </div>
        <button className="btn btn-primary" disabled title="Coming soon">
          + New request
        </button>
      </div>

      <div className="coming-inline">
        <span className="coming-badge">Preview</span> This module is a placeholder — the data below is dummy content
        until the workflow requirements are defined.
      </div>

      <div className="panel">
        <table className="stones-table">
          <colgroup>
            <col style={{ width: '110px' }} />
            <col />
            <col style={{ width: '120px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '150px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Request</th>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Requester</th>
            </tr>
          </thead>
          <tbody>
            {DUMMY.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="chip chip-id">{r.id}</span>
                </td>
                <td>{r.title}</td>
                <td className="cell-muted">{r.type}</td>
                <td>
                  <span className={statusClass(r.status)}>{r.status}</span>
                </td>
                <td className="cell-muted">{r.requester}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
