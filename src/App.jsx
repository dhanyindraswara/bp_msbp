// STONES — Business Process suite shell. Left-hand menu switches between the
// four modules; Document Development hosts the SIPOC → map + RASCI studio.
import { useState, useRef, useCallback, useEffect } from 'react'
import { ensureSeed, getOpenId, getDoc, setOpenId as storeSetOpenId, initStore, subscribe, setCurrentUser } from './lib/store.js'
import { watchAuth, signInGoogle, signOutUser, firebaseEnabled } from './lib/auth.js'
import DocumentDevelopment from './menus/DocumentDevelopment.jsx'
import Repository from './menus/Repository.jsx'
import Dashboard from './menus/Dashboard.jsx'
import DocumentActionRequest from './menus/DocumentActionRequest.jsx'
import GlobalSearch from './menus/GlobalSearch.jsx'
import AskAI from './menus/AskAI.jsx'
import DocumentImport from './menus/DocumentImport.jsx'
import AutoFlow from './menus/AutoFlow.jsx'

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
)

function LoginScreen({ onSignIn, err }) {
  return (
    <div className="login">
      <div className="login-hero">
        <div className="login-hero-inner">
          <div className="login-mark">S</div>
          <div className="login-brand">STONES</div>
          <div className="login-brand-sub">Business Process Suite</div>
          <p className="login-tag">Kembangkan, kelola, dan simpan Business Process, SOP, dan dokumen perusahaan — dalam satu platform.</p>
          <ul className="login-feats">
            <li>Business process map &amp; RASCI otomatis dari SIPOC</li>
            <li>Approval workflow, versi &amp; audit trail</li>
            <li>Realtime &amp; tersimpan aman di cloud</li>
          </ul>
        </div>
      </div>
      <div className="login-panel">
        <div className="login-card">
          <div className="login-card-title">Sign in</div>
          <div className="login-card-sub">Masuk untuk melanjutkan ke STONES</div>
          <button className="login-btn" onClick={onSignIn}>
            <GoogleIcon />
            Continue with Google
          </button>
          {err ? <div className="login-err">{err}</div> : null}
          <div className="login-note">Akses dibatasi untuk akun yang diizinkan.</div>
        </div>
      </div>
    </div>
  )
}

const Icon = ({ d }) => (
  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const MENUS = [
  { id: 'request', label: 'Document Action Request', d: 'M9 11l3 3l8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9' },
  { id: 'develop', label: 'Document Development', d: 'M12 20h9M4 20l1-4l9.5-9.5a2.1 2.1 0 0 1 3 3L8 19l-4 1' },
  { id: 'import', label: 'Document Import', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' },
  { id: 'flow', label: 'Auto Flow Process', d: 'M4 5h6v4H4zM14 5h6v4h-6zM9 15h6v4H9zM7 9v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9' },
  { id: 'repository', label: 'Repository', d: 'M4 7c0-1.1 3.6-2 8-2s8 .9 8 2s-3.6 2-8 2s-8-.9-8-2zM4 7v10c0 1.1 3.6 2 8 2s8-.9 8-2V7M4 12c0 1.1 3.6 2 8 2s8-.9 8-2' },
  { id: 'search', label: 'Global Search', d: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5' },
  { id: 'ai', label: 'Ask AI', d: 'M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2zM9 10h.01M13 10h.01M17 10h.01' },
  { id: 'dashboard', label: 'Dashboard', d: 'M4 13h6V4H4v9zm10 7h6V10h-6v10zM4 20h6v-4H4v4zM14 4v3h6V4h-6z' },
]

export default function App() {
  const [menu, setMenu] = useState('develop')
  const [ready, setReady] = useState(false)
  const [rev, setRev] = useState(0)
  const [user, setUser] = useState(undefined) // undefined = checking, null = signed out, object = signed in
  const [authErr, setAuthErr] = useState('')
  const [openId, setOpenIdState] = useState(null)
  const [flowOpenId, setFlowOpenId] = useState(null)
  const [toast, setToast] = useState('')
  const tt = useRef(null)
  const bootedRef = useRef(false)
  const notify = useCallback((m) => {
    setToast(m)
    clearTimeout(tt.current)
    tt.current = setTimeout(() => setToast(''), 2200)
  }, [])

  // Watch auth, then (once signed in, or in local mode) boot the store and
  // subscribe for realtime re-renders.
  useEffect(() => {
    const unsubStore = subscribe(() => setRev((r) => r + 1))
    const boot = () => {
      if (bootedRef.current) return
      bootedRef.current = true
      initStore().then(() => {
        ensureSeed()
        // Deep link: ?doc=BP-0001 opens that document directly.
        const urlDoc = new URLSearchParams(window.location.search).get('doc')
        if (urlDoc && getDoc(urlDoc)) {
          storeSetOpenId(urlDoc)
          setOpenIdState(urlDoc)
          setMenu('develop')
        } else {
          setOpenIdState(getOpenId())
        }
        setReady(true)
      })
    }
    const unsubAuth = watchAuth((u) => {
      if (!firebaseEnabled) {
        setUser({ local: true })
        boot()
        return
      }
      setUser(u)
      if (u) {
        setCurrentUser(u.displayName || u.email || 'User')
        boot()
      } else {
        setReady(false)
      }
    })
    return () => {
      unsubStore()
      unsubAuth()
    }
  }, [])

  const doSignIn = () => {
    setAuthErr('')
    signInGoogle().catch((e) => setAuthErr(e && e.message ? e.message : 'Sign-in failed'))
  }
  const doSignOut = () => {
    signOutUser().finally(() => window.location.reload())
  }

  // Reflect the open document in the URL so it can be shared as a deep link.
  const syncUrl = (id) => {
    try {
      window.history.replaceState(null, '', window.location.pathname + (id ? '?doc=' + encodeURIComponent(id) : ''))
    } catch (e) {
      /* ignore */
    }
  }
  // Update the open document (keeps store + React + URL in sync).
  const setOpenId = useCallback((id) => {
    storeSetOpenId(id)
    setOpenIdState(id)
    syncUrl(id)
  }, [])
  // Open a document. FLOW-type documents open in Auto Flow Process; everything
  // else opens the SIPOC studio in Document Development.
  const openDoc = useCallback((id) => {
    if (getDoc(id)?.docType === 'FLOW') {
      setFlowOpenId(id)
      setMenu('flow')
      return
    }
    storeSetOpenId(id)
    setOpenIdState(id)
    setMenu('develop')
    syncUrl(id)
  }, [])

  // Firebase configured but still checking sign-in state.
  if (firebaseEnabled && user === undefined) {
    return (
      <div className="stones" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="rf-loading" style={{ color: '#8a94a0' }}>Checking sign-in…</div>
      </div>
    )
  }
  // Signed out → login screen.
  if (firebaseEnabled && user === null) {
    return <LoginScreen onSignIn={doSignIn} err={authErr} />
  }
  // Signed in (or local mode) but store not ready yet.
  if (!ready) {
    return (
      <div className="stones" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="rf-loading" style={{ color: '#8a94a0' }}>
          Loading STONES{firebaseEnabled ? ' · connecting to Firebase…' : '…'}
        </div>
      </div>
    )
  }

  return (
    <div className="stones">
      <aside className="stones-side">
        <div className="stones-brand">
          <div className="stones-mark">S</div>
          <div>
            <div className="stones-logo">STONES</div>
            <div className="stones-tag">Business Process Suite</div>
          </div>
        </div>
        <nav className="stones-nav">
          <div className="stones-navlabel">Workspace</div>
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
          <div style={{ fontWeight: 700, color: '#aebfd0' }}>
            {firebaseEnabled ? user?.displayName || 'Signed in' : 'Local mode'}
          </div>
          <div style={{ wordBreak: 'break-all' }}>{firebaseEnabled ? user?.email || '' : 'localStorage'}</div>
          {firebaseEnabled ? (
            <button className="stones-signout" onClick={doSignOut}>
              Sign out
            </button>
          ) : null}
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
        {menu === 'import' && <DocumentImport notify={notify} goRepository={() => setMenu('repository')} />}
        {menu === 'flow' && <AutoFlow openId={flowOpenId} setOpenId={setFlowOpenId} notify={notify} />}
        {menu === 'repository' && <Repository openDoc={openDoc} notify={notify} rev={rev} />}
        {menu === 'search' && <GlobalSearch openDoc={openDoc} rev={rev} />}
        {menu === 'ai' && <AskAI />}
        {menu === 'dashboard' && <Dashboard goRepository={() => setMenu('repository')} rev={rev} />}
      </main>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
