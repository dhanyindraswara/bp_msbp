// App shell — brand, view tabs, project toolbar (New/Save/Load/Import/Export/
// Sample), toast, and the derived-model memo shared with every view.
import { useState, useMemo, useRef, useCallback } from 'react'
import { KEY } from './lib/constants.js'
import { generate, download } from './lib/generate.js'
import { sampleProject, blankProject, loadInitial } from './lib/sample.js'
import SipocEditor from './components/SipocEditor.jsx'
import ProcessMap from './components/ProcessMap.jsx'
import Rasci from './components/Rasci.jsx'

export default function App() {
  const [project, setProject] = useState(loadInitial)
  const [view, setView] = useState('sipoc')
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const notify = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }, [])
  const derived = useMemo(() => generate(project), [project])

  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(project))
      notify('Saved to this browser')
    } catch (e) {
      notify('Save failed')
    }
  }
  const load = () => {
    try {
      const s = localStorage.getItem(KEY)
      if (s) {
        setProject(JSON.parse(s))
        notify('Loaded saved project')
      } else notify('No saved project found')
    } catch (e) {
      notify('Load failed')
    }
  }
  const neu = () => {
    if (window.confirm('Start a new empty project? Unsaved changes will be lost.')) {
      setProject(blankProject())
      setView('sipoc')
      notify('New project')
    }
  }
  const loadSample = () => {
    if (window.confirm('Load the "HSE Marine & Logistic" sample? Current data will be replaced.')) {
      setProject(sampleProject())
      notify('Sample loaded')
    }
  }
  const exportJSON = () => {
    download('itm-sipoc-project.json', new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }))
    notify('JSON exported')
  }
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
  const jsonRef = useRef(null)

  const Tab = (id, label) => (
    <button className={'itm-tab' + (view === id ? ' active' : '')} onClick={() => setView(id)}>
      {label}
    </button>
  )

  return (
    <div id="itm-root">
      <div className="itm-wrap">
        <div className="itm-top">
          <div className="itm-brand">
            <span className="itm-title">ITM SIPOC Studio</span>
            <span className="itm-sub">SIPOC → process map + RASCI</span>
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
            <button className="btn btn-sm" onClick={neu}>
              New
            </button>
            <button className="btn btn-sm" onClick={save}>
              Save
            </button>
            <button className="btn btn-sm" onClick={load}>
              Load
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
        {toast ? <div className="toast">{toast}</div> : null}
      </div>
    </div>
  )
}
