// LEAP-STONES › Repository — the controlled-document hub. Every BP/SOP/Flow/
// diagram document with its ID, type, version, status, business-process links
// (from the Process Architecture) and last-updated time. Filter by type,
// status or text; jump straight from a document to the processes that use it.
import { useMemo, useState } from 'react'
import { listDocs, deleteDoc, duplicateDoc, createDoc, STATUS } from '../lib/store.js'
import { blankProject } from '../lib/sample.js'
import { listNodeDocs } from '../lib/bpTree.js'

const StatusBadge = ({ status }) => <span className={'stbadge stbadge-' + status}>{STATUS[status] || 'Draft'}</span>
const TYPE_LABEL = { BP: 'BP', SOP: 'SOP', WI: 'WI', POLICY: 'Policy', MANUAL: 'Manual', MS: 'Mgmt Std', GD: 'Guideline', SP: 'Std Param', FORM: 'Form', CHARTER: 'Charter', COC: 'CoC', FLOW: 'Flow', TAXONOMY: 'Taxonomy', HLP: 'HLP', TAXDESC: 'Tax Desc', SOPDETAIL: 'SOP Detail' }

const fmt = (ts) => {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return '—'
  }
}

export default function Repository({ openDoc, openProcess, notify, rev }) {
  const docs = useMemo(() => listDocs().filter((d) => d.docType !== 'KNOWLEDGE' && d.docType !== 'BPNODE'), [rev])
  const [q, setQ] = useState('')
  const [typeF, setTypeF] = useState('') // '' = all
  const [statusF, setStatusF] = useState('')

  // Reverse index: document id → business processes that link it (node.docs).
  const procLinks = useMemo(() => {
    const map = {}
    listNodeDocs().forEach((nd) => {
      const n = nd.node || {}
      ;(n.docs || []).forEach((docId) => {
        if (!map[docId]) map[docId] = []
        map[docId].push({ nodeId: nd.id, code: n.code || n.title || '?' })
      })
    })
    return map
  }, [rev])

  const types = useMemo(() => {
    const s = new Set(docs.map((d) => d.docType || 'BP'))
    return ['BP', 'SOP', 'WI', 'POLICY', 'MANUAL', 'MS', 'GD', 'SP', 'FORM', 'CHARTER', 'COC', 'FLOW', 'TAXONOMY', 'HLP', 'TAXDESC'].filter((t) => s.has(t))
  }, [docs])

  const shown = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return docs.filter((d) => {
      if (typeF && (d.docType || 'BP') !== typeF) return false
      if (statusF && d.status !== statusF) return false
      if (ql && !((d.name || '').toLowerCase().includes(ql) || (d.id || '').toLowerCase().includes(ql))) return false
      return true
    })
  }, [docs, q, typeF, statusF])

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
          <p>All controlled documents — {docs.length} stored{shown.length !== docs.length ? `, ${shown.length} shown` : ''}.</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}>
          + New BP
        </button>
      </div>

      {docs.length ? (
        <div className="repo-filters">
          <div className="repo-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or ID…" />
          </div>
          <div className="repo-chips">
            <button className={'repo-chip' + (!typeF ? ' on' : '')} onClick={() => setTypeF('')}>All types</button>
            {types.map((t) => (
              <button key={t} className={'repo-chip' + (typeF === t ? ' on' : '')} onClick={() => setTypeF(typeF === t ? '' : t)}>
                {TYPE_LABEL[t] || t}
              </button>
            ))}
          </div>
          <select className="repo-status" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
            <option value="">Any status</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      ) : null}

      {shown.length ? (
        <div className="panel">
          <table className="stones-table">
            <colgroup>
              <col style={{ width: '104px' }} />
              <col />
              <col style={{ width: '160px' }} />
              <col style={{ width: '64px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '250px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
                <th>Document</th>
                <th>Processes</th>
                <th>Ver</th>
                <th>Status</th>
                <th>Last updated</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className="chip chip-id">{d.id}</span>
                  </td>
                  <td className="cell-name" onClick={() => openDoc(d.id)} title="Open">
                    {d.name}
                    {d.docType && d.docType !== 'BP' ? <span className="chip chip-type">{TYPE_LABEL[d.docType] || d.docType}</span> : null}
                  </td>
                  <td>
                    {(procLinks[d.id] || []).length ? (
                      <span className="repo-procs">
                        {(procLinks[d.id] || []).slice(0, 3).map((p) => (
                          <button
                            key={p.nodeId}
                            className="repo-proc"
                            title="Open in Process Explorer"
                            onClick={() => openProcess && openProcess(p.nodeId)}
                          >
                            {p.code}
                          </button>
                        ))}
                        {(procLinks[d.id] || []).length > 3 ? <span className="cell-muted">+{procLinks[d.id].length - 3}</span> : null}
                      </span>
                    ) : (
                      <span className="cell-muted">—</span>
                    )}
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
      ) : docs.length ? (
        <div className="empty-hero">
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2a43', marginBottom: 4 }}>No documents match</div>
          <div style={{ color: '#8a94a0' }}>Try a different filter or clear the search.</div>
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
