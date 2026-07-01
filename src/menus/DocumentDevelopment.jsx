// STONES › Document Development — develop a Business Process (SIPOC → map +
// RASCI) for the currently open document. Edits autosave into the repository.
import { useState, useEffect, useMemo, useRef } from 'react'
import { generate, download } from '../lib/generate.js'
import { blankProject, sampleProject } from '../lib/sample.js'
import { getDoc, saveDoc, createDoc, listDocs } from '../lib/store.js'
import SipocEditor from '../components/SipocEditor.jsx'
import ProcessMap from '../components/ProcessMap.jsx'
import Rasci from '../components/Rasci.jsx'

export default function DocumentDevelopment({ openId, setOpenId, notify, goRepository }) {
  const [view, setView] = useState('sipoc')
  const [project, setProject] = useState(() => (openId ? getDoc(openId)?.project || null : null))

  // Load the document's project whenever the open document changes.
  useEffect(() => {
    setProject(openId ? getDoc(openId)?.project || null : null)
    setView('sipoc')
  }, [openId])

  // Autosave edits back into the repository (debounced).
  useEffect(() => {
    if (!openId || !project) return
    const t = setTimeout(() => saveDoc({ id: openId, project }), 700)
    return () => clearTimeout(t)
  }, [project, openId])

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
  const saveNow = () => {
    if (!openId || !project) return
    saveDoc({ id: openId, project })
    notify('Saved to repository')
  }
  const exportJSON = () => {
    download(
      (openId || 'bp') + '.json',
      new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
    )
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
            <button className="btn btn-primary" onClick={newDoc}>
              + New BP
            </button>
            <button className="btn" onClick={goRepository}>
              Open Repository
            </button>
          </div>
        </div>
        {recent.length ? (
          <div style={{ marginTop: 22 }}>
            <div className="sec-h">
              <h3>Recent</h3>
            </div>
            <div className="cards">
              {recent.map((d) => (
                <button key={d.id} className="doc-card" onClick={() => setOpenId(d.id)}>
                  <div className="doc-card-name">{d.name}</div>
                  <div className="doc-card-meta">
                    <span className="chip">{d.id}</span>
                    <span className="chip">v{d.version}</span>
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
    <button className={'itm-tab' + (view === id ? ' active' : '')} onClick={() => setView(id)}>
      {label}
    </button>
  )

  return (
    <div className="itm-wrap">
      <div className="itm-top">
        <button className="btn btn-sm" onClick={goRepository} title="Back to repository">
          ← Documents
        </button>
        <div className="itm-brand" style={{ marginLeft: 4 }}>
          <span className="itm-title">{project.header.processName || 'Untitled BP'}</span>
          <span className="itm-sub">
            {openId} · v{project.header.version || '1.0'} · Document Development
          </span>
        </div>
        <div className="itm-tabs">
          {Tab('sipoc', 'SIPOC editor')}
          {Tab('map', 'Business process map')}
          {Tab('rasci', 'RASCI matrix')}
        </div>
        <div className="itm-actions">
          <input
            type="file"
            accept=".json"
            ref={jsonRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files[0]
              if (f) importJSON(f)
              e.target.value = ''
            }}
          />
          <button className="btn btn-sm" onClick={newDoc}>
            New
          </button>
          <button className="btn btn-sm" onClick={() => jsonRef.current && jsonRef.current.click()}>
            Import JSON
          </button>
          <button className="btn btn-sm" onClick={exportJSON}>
            Export JSON
          </button>
          <button className="btn btn-sm" onClick={loadSample}>
            Sample
          </button>
          <button className="btn btn-sm btn-primary" onClick={saveNow}>
            Save
          </button>
        </div>
      </div>
      <div className="itm-body">
        {view === 'sipoc' ? (
          <SipocEditor
            project={project}
            setProject={setProject}
            notify={notify}
            goGenerate={() => {
              setView('map')
              notify('Diagram & RASCI regenerated')
            }}
          />
        ) : view === 'map' ? (
          <ProcessMap project={project} setProject={setProject} derived={derived} notify={notify} />
        ) : (
          <Rasci project={project} setProject={setProject} derived={derived} notify={notify} />
        )}
      </div>
    </div>
  )
}
