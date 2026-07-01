// STONES › Document Action Request — approval queue. Documents submitted for
// review land here; a reviewer approves or sends them back.
import { useState } from 'react'
import { listDocs, approveDoc, rejectDoc, createDoc, STATUS } from '../lib/store.js'
import { blankProject } from '../lib/sample.js'

const fmt = (ts) => {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return '—'
  }
}
const submittedInfo = (d) => {
  const a = (d.audit || []).find((x) => x.action === 'submit')
  return a ? { by: a.actor, at: a.ts } : { by: '—', at: d.updatedAt }
}
const StatusBadge = ({ status }) => <span className={'stbadge stbadge-' + status}>{STATUS[status] || 'Draft'}</span>

export default function DocumentActionRequest({ openDoc, notify }) {
  const [docs, setDocs] = useState(() => listDocs())
  const refresh = () => setDocs(listDocs())
  const pending = docs.filter((d) => d.status === 'in_review')

  const onApprove = (id, name) => {
    const note = window.prompt('Approve "' + name + '"? Add a note (optional):', '')
    if (note === null) return
    approveDoc(id, note)
    refresh()
    notify('Approved — ready to publish')
  }
  const onReject = (id, name) => {
    const note = window.prompt('Send "' + name + '" back to draft. Reason (optional):', '')
    if (note === null) return
    rejectDoc(id, note)
    refresh()
    notify('Sent back to draft')
  }
  const onNew = () => {
    const d = createDoc(blankProject())
    openDoc(d.id)
  }

  return (
    <div className="stones-page">
      <div className="stones-page-hd stones-page-hd-row">
        <div>
          <h1>Document Action Request</h1>
          <p>Business Processes awaiting review &amp; approval before they can be published.</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}>+ New BP</button>
      </div>

      <div className="sec-h"><h3>Awaiting review</h3><span className="hint">{pending.length} pending</span></div>
      {pending.length ? (
        <div className="panel">
          <table className="stones-table">
            <colgroup>
              <col style={{ width: '110px' }} />
              <col />
              <col style={{ width: '80px' }} />
              <col style={{ width: '210px' }} />
              <col style={{ width: '240px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>BP name</th>
                <th>Version</th>
                <th>Submitted</th>
                <th style={{ textAlign: 'right' }}>Decision</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((d) => {
                const si = submittedInfo(d)
                return (
                  <tr key={d.id}>
                    <td><span className="chip chip-id">{d.id}</span></td>
                    <td className="cell-name" onClick={() => openDoc(d.id)} title="Open">{d.name}</td>
                    <td>v{d.version}</td>
                    <td className="cell-muted">{si.by} · {fmt(si.at)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm" onClick={() => openDoc(d.id)}>Open</button>
                      <button className="btn btn-sm btn-primary" style={{ marginLeft: 6 }} onClick={() => onApprove(d.id, d.name)}>Approve</button>
                      <button className="btn btn-sm btn-danger" style={{ marginLeft: 6 }} onClick={() => onReject(d.id, d.name)}>Reject</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-hero">
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2a43', marginBottom: 4 }}>Nothing to review</div>
          <div style={{ color: '#8a94a0' }}>When someone submits a Business Process for review, it appears here.</div>
        </div>
      )}

      <div className="sec-h" style={{ marginTop: 26 }}><h3>All documents</h3></div>
      <div className="panel">
        <table className="stones-table">
          <colgroup>
            <col style={{ width: '110px' }} />
            <col />
            <col style={{ width: '80px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '200px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>ID</th>
              <th>BP name</th>
              <th>Version</th>
              <th>Status</th>
              <th>Last updated</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td><span className="chip chip-id">{d.id}</span></td>
                <td className="cell-name" onClick={() => openDoc(d.id)} title="Open">{d.name}</td>
                <td>v{d.version}</td>
                <td><StatusBadge status={d.status} /></td>
                <td className="cell-muted">{fmt(d.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
