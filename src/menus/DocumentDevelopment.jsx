// STONES › Document Development — develop a Business Process (SIPOC → map +
// RASCI) for the currently open document, with approval workflow, version
// history / audit trail, and comments. Edits autosave into the repository.
import { useState, useEffect, useMemo, useRef } from 'react'
import { generate, download } from '../lib/generate.js'
import { blankProject, sampleProject } from '../lib/sample.js'
import {
  getDoc,
  saveDoc,
  createDoc,
  listDocs,
  STATUS,
  saveVersion,
  restoreVersion,
  submitForReview,
  recallReview,
  reviseDoc,
  publishDoc,
  addComment,
  toggleResolveComment,
  deleteComment,
} from '../lib/store.js'
import { subscribeFiles, uploadFile, deleteFile, filesEnabled } from '../lib/files.js'
import SipocEditor from '../components/SipocEditor.jsx'
import ProcessMap from '../components/ProcessMap.jsx'
import Rasci from '../components/Rasci.jsx'

const fmt = (ts) => {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return ''
  }
}
const fmtSize = (b) => {
  if (!b) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return (b / Math.pow(1024, i)).toFixed(i ? 1 : 0) + ' ' + u[i]
}

function StatusBadge({ status }) {
  return <span className={'stbadge stbadge-' + status}>{STATUS[status] || 'Draft'}</span>
}

export default function DocumentDevelopment({ openId, setOpenId, notify, goRepository }) {
  const [view, setView] = useState('sipoc')
  const [project, setProject] = useState(() => (openId ? getDoc(openId)?.project || null : null))
  const [meta, setMeta] = useState(() => loadMeta(openId))
  const [drawer, setDrawer] = useState(null) // 'comments' | 'history' | 'files' | null
  const [commentText, setCommentText] = useState('')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const fileUpRef = useRef(null)

  function loadMeta(id) {
    const d = id ? getDoc(id) : null
    return d
      ? { status: d.status, versions: d.versions, comments: d.comments, audit: d.audit }
      : { status: 'draft', versions: [], comments: [], audit: [] }
  }
  const refreshMeta = () => setMeta(loadMeta(openId))

  useEffect(() => {
    setProject(openId ? getDoc(openId)?.project || null : null)
    setMeta(loadMeta(openId))
    setView('sipoc')
    setDrawer(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  // Autosave the working draft (debounced).
  useEffect(() => {
    if (!openId || !project) return
    const t = setTimeout(() => saveDoc({ id: openId, project }), 700)
    return () => clearTimeout(t)
  }, [project, openId])

  // Live-subscribe to the document's attached files.
  useEffect(() => {
    if (!openId) {
      setFiles([])
      return
    }
    return subscribeFiles(openId, setFiles)
  }, [openId])

  const onUpload = async (file) => {
    if (!file || !openId) return
    setUploading(true)
    try {
      await uploadFile(openId, file)
      notify('File uploaded')
    } catch (e) {
      notify('Upload failed: ' + (e.message || e))
    }
    setUploading(false)
  }

  const derived = useMemo(() => (project ? generate(project) : null), [project])

  const newDoc = () => {
    const d = createDoc(blankProject())
    setOpenId(d.id)
    notify('New BP created (' + d.id + ')')
  }
  const loadSample = () => {
    const d = createDoc(sampleProject())
    setOpenId(d.id)
    notify('Sample BP created (' + d.id + ')')
  }
  const exportJSON = () => {
    download((openId || 'bp') + '.json', new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }))
    notify('JSON exported')
  }
  const jsonRef = useRef(null)
  const importJSON = (file) => {
    const rd = new FileReader()
    rd.onload = () => {
      try {
        setProject(JSON.parse(rd.result))
        notify('Project loaded from JSON')
      } catch (e) {
        notify('Invalid JSON')
      }
    }
    rd.readAsText(file)
  }

  // ---- version + workflow actions ----
  const doSaveVersion = () => {
    if (!openId) return
    saveDoc({ id: openId, project })
    const note = window.prompt('Version note (optional):', '')
    if (note === null) return
    saveVersion(openId, note)
    refreshMeta()
    notify('Version snapshot saved')
  }
  const doRestore = (verId, snapNo) => {
    if (!window.confirm('Restore snapshot #' + snapNo + '? Your current draft will be replaced.')) return
    const d = restoreVersion(openId, verId)
    if (d) {
      setProject(d.project)
      refreshMeta()
      notify('Restored snapshot #' + snapNo)
    }
  }
  const workflow = () => {
    if (meta.status === 'draft') {
      saveDoc({ id: openId, project })
      submitForReview(openId)
      notify('Submitted for review')
    } else if (meta.status === 'in_review') {
      recallReview(openId)
      notify('Recalled from review')
    } else if (meta.status === 'approved') {
      publishDoc(openId, '')
      notify('Published')
    } else if (meta.status === 'published') {
      reviseDoc(openId)
      notify('New revision started (Draft)')
    }
    refreshMeta()
  }
  const workflowLabel = {
    draft: 'Submit for review',
    in_review: 'Recall',
    approved: 'Publish',
    published: 'New revision',
  }[meta.status]

  // ---- comments ----
  const postComment = () => {
    if (!commentText.trim()) return
    addComment(openId, commentText)
    setCommentText('')
    refreshMeta()
  }
  const openComments = meta.comments.filter((c) => !c.resolved).length

  // No document open — quick-start chooser.
  if (!openId || !project) {
    const recent = listDocs().slice(0, 6)
    return (
      <div className="stones-page">
        <div className="stones-page-hd">
          <h1>Document Development</h1>
          <p>Develop a Business Process from a single SIPOC table — the map and RASCI are generated for you.</p>
        </div>
        <div className="empty-hero">
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2a43', marginBottom: 4 }}>No document open</div>
          <div style={{ color: '#8a94a0', marginBottom: 16 }}>Create a new Business Process or open one from the repository.</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={newDoc}>+ New BP</button>
            <button className="btn" onClick={goRepository}>Open Repository</button>
          </div>
        </div>
        {recent.length ? (
          <div style={{ marginTop: 22 }}>
            <div className="sec-h"><h3>Recent</h3></div>
            <div className="cards">
              {recent.map((d) => (
                <button key={d.id} className="doc-card" onClick={() => setOpenId(d.id)}>
                  <div className="doc-card-name">{d.name}</div>
                  <div className="doc-card-meta">
                    <span className="chip">{d.id}</span>
                    <span className="chip">v{d.version}</span>
                    <StatusBadge status={d.status} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const Tab = (id, label) => (
    <button className={'itm-tab' + (view === id ? ' active' : '')} onClick={() => setView(id)}>{label}</button>
  )

  return (
    <div className="itm-wrap">
      <div className="itm-top">
        <button className="btn btn-sm" onClick={goRepository} title="Back to repository">← Documents</button>
        <div className="itm-brand" style={{ marginLeft: 4 }}>
          <span className="itm-title">{project.header.processName || 'Untitled BP'}</span>
          <span className="itm-sub">{openId} · v{project.header.version || '1.0'}</span>
        </div>
        <StatusBadge status={meta.status} />
        <div className="itm-tabs">
          {Tab('sipoc', 'SIPOC editor')}
          {Tab('map', 'Business process map')}
          {Tab('rasci', 'RASCI matrix')}
        </div>
        <div className="itm-actions">
          <input type="file" accept=".json" ref={jsonRef} style={{ display: 'none' }} onChange={(e) => { const f = e.target.files[0]; if (f) importJSON(f); e.target.value = '' }} />
          <button className={'btn btn-sm' + (drawer === 'comments' ? ' btn-on' : '')} onClick={() => setDrawer(drawer === 'comments' ? null : 'comments')}>
            Comments{openComments ? ' (' + openComments + ')' : ''}
          </button>
          <button className={'btn btn-sm' + (drawer === 'history' ? ' btn-on' : '')} onClick={() => setDrawer(drawer === 'history' ? null : 'history')}>History</button>
          <button className={'btn btn-sm' + (drawer === 'files' ? ' btn-on' : '')} onClick={() => setDrawer(drawer === 'files' ? null : 'files')}>
            Files{files.length ? ' (' + files.length + ')' : ''}
          </button>
          <button className="btn btn-sm" onClick={doSaveVersion}>Save version</button>
          <button className="btn btn-sm btn-primary" onClick={workflow}>{workflowLabel}</button>
          <span className="itm-divider" />
          <button className="btn btn-sm" onClick={newDoc}>New</button>
          <div className="more-wrap">
            <button className="btn btn-sm" onClick={() => setMoreOpen((v) => !v)} title="More actions">⋯</button>
            {moreOpen ? (
              <>
                <div className="more-backdrop" onClick={() => setMoreOpen(false)} />
                <div className="more-menu">
                  <button onClick={() => { setMoreOpen(false); jsonRef.current && jsonRef.current.click() }}>Import JSON</button>
                  <button onClick={() => { setMoreOpen(false); exportJSON() }}>Export JSON</button>
                  <button onClick={() => { setMoreOpen(false); loadSample() }}>Load sample BP</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="doc-work">
        <div className="itm-body">
          {view === 'sipoc' ? (
            <SipocEditor project={project} setProject={setProject} notify={notify} goGenerate={() => { setView('map'); notify('Diagram & RASCI regenerated') }} />
          ) : view === 'map' ? (
            <ProcessMap project={project} setProject={setProject} derived={derived} notify={notify} />
          ) : (
            <Rasci project={project} setProject={setProject} derived={derived} notify={notify} />
          )}
        </div>

        {drawer === 'comments' ? (
          <aside className="stones-drawer">
            <div className="drawer-hd">Comments<button className="drawer-x" onClick={() => setDrawer(null)}>✕</button></div>
            <div className="drawer-body">
              {meta.comments.length ? (
                meta.comments.map((c) => (
                  <div key={c.id} className={'cmt' + (c.resolved ? ' cmt-resolved' : '')}>
                    <div className="cmt-top">
                      <span className="cmt-author">{c.author}</span>
                      <span className="cmt-time">{fmt(c.createdAt)}</span>
                    </div>
                    <div className="cmt-body">{c.body}</div>
                    <div className="cmt-actions">
                      <button onClick={() => { toggleResolveComment(openId, c.id); refreshMeta() }}>{c.resolved ? 'Reopen' : 'Resolve'}</button>
                      <button onClick={() => { deleteComment(openId, c.id); refreshMeta() }}>Delete</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="drawer-empty">No comments yet. Start the discussion below.</div>
              )}
            </div>
            <div className="drawer-foot">
              <textarea
                className="cmt-input"
                placeholder="Write a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment() }}
              />
              <button className="btn btn-sm btn-primary" onClick={postComment}>Comment</button>
            </div>
          </aside>
        ) : null}

        {drawer === 'history' ? (
          <aside className="stones-drawer">
            <div className="drawer-hd">History<button className="drawer-x" onClick={() => setDrawer(null)}>✕</button></div>
            <div className="drawer-body">
              <div className="drawer-sec">Version snapshots</div>
              {meta.versions.length ? (
                meta.versions.map((v) => (
                  <div key={v.id} className="ver">
                    <div className="ver-top">
                      <span className="chip chip-id">#{v.snapNo}</span>
                      <span style={{ fontWeight: 700 }}>v{v.bpVersion}</span>
                      <button className="ver-restore" onClick={() => doRestore(v.id, v.snapNo)}>Restore</button>
                    </div>
                    {v.note ? <div className="ver-note">{v.note}</div> : null}
                    <div className="ver-meta">{v.author} · {fmt(v.createdAt)}</div>
                  </div>
                ))
              ) : (
                <div className="drawer-empty">No snapshots yet. Click “Save version”.</div>
              )}
              <div className="drawer-sec" style={{ marginTop: 14 }}>Activity log</div>
              {meta.audit.length ? (
                meta.audit.map((a) => (
                  <div key={a.id} className="act">
                    <div className="act-dot" data-a={a.action} />
                    <div>
                      <div className="act-detail">{a.detail}</div>
                      <div className="act-meta">{a.actor} · {fmt(a.ts)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="drawer-empty">No activity.</div>
              )}
            </div>
          </aside>
        ) : null}

        {drawer === 'files' ? (
          <aside className="stones-drawer">
            <div className="drawer-hd">Files<button className="drawer-x" onClick={() => setDrawer(null)}>✕</button></div>
            <div className="drawer-body">
              {!filesEnabled ? (
                <div className="drawer-empty">File attachments need Firebase Storage (not available in local mode).</div>
              ) : files.length ? (
                files.map((f) => (
                  <div key={f.id} className="filerow">
                    {f.kind === 'png' ? (
                      <a href={f.url} target="_blank" rel="noreferrer" className="file-thumb-wrap">
                        <img className="file-thumb" src={f.url} alt="" />
                      </a>
                    ) : (
                      <div className={'file-ic file-ic-' + f.kind}>{f.kind === 'pdf' ? 'PDF' : 'FILE'}</div>
                    )}
                    <div className="file-main">
                      <a className="file-name" href={f.url} target="_blank" rel="noreferrer">{f.name}</a>
                      <div className="file-meta">{fmtSize(f.size)} · {f.uploadedBy} · {fmt(f.createdAt)}</div>
                      <div className="file-actions">
                        <a href={f.url} target="_blank" rel="noreferrer">Open</a>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete "' + f.name + '"?')) {
                              deleteFile(openId, f)
                              notify('File deleted')
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="drawer-empty">No files yet. Upload a PDF or PNG below.</div>
              )}
            </div>
            <div className="drawer-foot">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf"
                ref={fileUpRef}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files[0]
                  if (f) onUpload(f)
                  e.target.value = ''
                }}
              />
              <button
                className="btn btn-sm btn-primary"
                disabled={!filesEnabled || uploading}
                onClick={() => fileUpRef.current && fileUpRef.current.click()}
              >
                {uploading ? 'Uploading…' : '+ Upload PDF / PNG'}
              </button>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
