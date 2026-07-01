// STONES — Business Process suite shell. Left-hand menu switches between the
// four modules; Document Development hosts the SIPOC → map + RASCI studio.
import { useState, useRef, useCallback, useEffect } from 'react'
import { ensureSeed, getOpenId, setOpenId as storeSetOpenId, initStore, subscribe, backendName } from './lib/store.js'
import DocumentDevelopment from './menus/DocumentDevelopment.jsx'
import Repository from './menus/Repository.jsx'
import Dashboard from './menus/Dashboard.jsx'
import DocumentActionRequest from './menus/DocumentActionRequest.jsx'
import GlobalSearch from './menus/GlobalSearch.jsx'

const Icon = ({ d }) => (
  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const MENUS = [
  { id: 'request', label: 'Document Action Request', d: 'M9 11l3 3l8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9' },
  { id: 'develop', label: 'Document Development', d: 'M12 20h9M4 20l1-4l9.5-9.5a2.1 2.1 0 0 1 3 3L8 19l-4 1' },
  { id: 'repository', label: 'Repository', d: 'M4 7c0-1.1 3.6-2 8-2s8 .9 8 2s-3.6 2-8 2s-8-.9-8-2zM4 7v10c0 1.1 3.6 2 8 2s8-.9 8-2V7M4 12c0 1.1 3.6 2 8 2s8-.9 8-2' },
  { id: 'search', label: 'Global Search', d: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5' },
  { id: 'dashboard', label: 'Dashboard', d: 'M4 13h6V4H4v9zm10 7h6V10h-6v10zM4 20h6v-4H4v4zM14 4v3h6V4h-6z' },
]

export default function App() {
  const [menu, setMenu] = useState('develop')
  const [ready, setReady] = useState(false)
  const [rev, setRev] = useState(0)
  const [openId, setOpenIdState] = useState(null)
  const [toast, setToast] = useState('')
  const tt = useRef(null)
  const notify = useCallback((m) => {
    setToast(m)
    clearTimeout(tt.current)
    tt.current = setTimeout(() => setToast(''), 2200)
  }, [])

  // Boot the store (Firestore or localStorage), then seed + subscribe for
  // realtime re-renders.
  useEffect(() => {
    const unsub = subscribe(() => setRev((r) => r + 1))
    initStore().then(() => {
      ensureSeed()
      setOpenIdState(getOpenId())
      setReady(true)
    })
    return unsub
  }, [])

  // Update the open document (keeps store + React in sync).
  const setOpenId = useCallback((id) => {
    storeSetOpenId(id)
    setOpenIdState(id)
  }, [])
  // Open a document and jump to Document Development.
  const openDoc = useCallback((id) => {
    storeSetOpenId(id)
    setOpenIdState(id)
    setMenu('develop')
  }, [])

  if (!ready) {
    return (
      <div className="stones" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="rf-loading" style={{ color: '#8a94a0' }}>
          Loading STONES{backendName() === 'firebase' ? ' · connecting to Firebase…' : '…'}
        </div>
      </div>
    )
  }

  return (
    <div className="stones">
      <aside className="stones-side">
        <div className="stones-brand">
          <div className="stones-logo">STONES</div>
          <div className="stones-tag">Business Process Suite</div>
        </div>
        <nav className="stones-nav">
          {MENUS.map((m) => (
            <button
              key={m.id}
              className={'stones-navitem' + (menu === m.id ? ' active' : '')}
              onClick={() => setMenu(m.id)}
            >
              <Icon d={m.d} />
              {m.label}
            </button>
          ))}
        </nav>
        <div className="stones-side-foot">
          <div style={{ fontWeight: 700, color: '#aebfd0' }}>Signed in</div>
          <div>dhanyindraswara</div>
        </div>
      </aside>

      <main className="stones-main">
        {menu === 'request' && <DocumentActionRequest openDoc={openDoc} notify={notify} rev={rev} />}
        {menu === 'develop' && (
          <DocumentDevelopment
            openId={openId}
            setOpenId={setOpenId}
            notify={notify}
            goRepository={() => setMenu('repository')}
          />
        )}
        {menu === 'repository' && <Repository openDoc={openDoc} notify={notify} rev={rev} />}
        {menu === 'search' && <GlobalSearch openDoc={openDoc} rev={rev} />}
        {menu === 'dashboard' && <Dashboard goRepository={() => setMenu('repository')} rev={rev} />}
      </main>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
