// STONES › Repository — stores every BP document with its ID, name, version and
// last-updated time. Open, duplicate or delete documents here.
import { useMemo } from 'react'
import { listDocs, deleteDoc, duplicateDoc, createDoc, STATUS } from '../lib/store.js'
import { blankProject } from '../lib/sample.js'

const StatusBadge = ({ status }) => <span className={'stbadge stbadge-' + status}>{STATUS[status] || 'Draft'}</span>

const fmt = (ts) => {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return '—'
  }
}

export default function Repository({ openDoc, notify, rev }) {
  const docs = useMemo(() => listDocs().filter((d) => d.docType !== 'KNOWLEDGE' && d.docType !== 'BPNODE'), [rev])

  const onNew = () => {
    const d = createDoc(blankProject())
    openDoc(d.id)
  }
  const onDuplicate = (id) => {
    duplicateDoc(id)
    notify('Document duplicated')
  }
  const onDelete = (id, name) => {
    if (window.confirm('Delete "' + name + '" permanently? This cannot be undone.')) {
      deleteDoc(id)
      notify('Document deleted')
    }
  }

  return (
    <div className="stones-page">
      <div className="stones-page-hd stones-page-hd-row">
        <div>
          <h1>Repository</h1>
          <p>All Business Process documents — {docs.length} stored.</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          + New BP
        </button>
      </div>

      {docs.length ? (
        <div className="panel">
          <table className="stones-table">
            <colgroup>
              <col style={{ width: '104px' }} />
              <col />
              <col style={{ width: '70px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '170px' }} />
              <col style={{ width: '270px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>BP name</th>
                <th>Version</th>
                <th>Status</th>
                <th>Last updated</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className="chip chip-id">{d.id}</span>
                  </td>
                  <td className="cell-name" onClick={() => openDoc(d.id)} title="Open">
                    {d.name}
                    {d.docType && d.docType !== 'BP' ? <span className="chip chip-type">{d.docType}</span> : null}
                  </td>
                  <td>v{d.version}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td className="cell-muted">{fmt(d.updatedAt)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-primary" onClick={() => openDoc(d.id)}>
                      Open
                    </button>
                    <button className="btn btn-sm" style={{ marginLeft: 6 }} onClick={() => onDuplicate(d.id)}>
                      Duplicate
                    </button>
                    <button className="btn btn-sm btn-danger" style={{ marginLeft: 6 }} onClick={() => onDelete(d.id, d.name)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-hero">
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2a43', marginBottom: 4 }}>No documents yet</div>
          <div style={{ color: '#8a94a0', marginBottom: 16 }}>Create your first Business Process document.</div>
          <button className="btn btn-primary" onClick={onNew}>
            + New BP
          </button>
        </div>
      )}
    </div>
  )
}
