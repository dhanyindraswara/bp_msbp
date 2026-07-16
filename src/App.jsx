// LEAP-STONES — Business Process suite shell. Signed out: landing page → login.
// Signed in: grouped sidebar + command palette (Ctrl/⌘+K) switch between the
// modules; Document Development hosts the SIPOC → map + RASCI studio.
import { useState, useRef, useCallback, useEffect } from 'react'
import { ensureSeed, getOpenId, getDoc, setOpenId as storeSetOpenId, initStore, subscribe, setCurrentUser, createDoc } from './lib/store.js'
import { blankProject } from './lib/sample.js'
import { watchAuth, signInGoogle, signOutUser, firebaseEnabled } from './lib/auth.js'
import Landing from './Landing.jsx'
import Login from './Login.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import BrandMark from './components/BrandMark.jsx'
import { listEntities } from './lib/bpTree.js'
import DocumentDevelopment from './menus/DocumentDevelopment.jsx'
import Repository from './menus/Repository.jsx'
import Home from './menus/Home.jsx'
import DocumentActionRequest from './menus/DocumentActionRequest.jsx'
import GlobalSearch from './menus/GlobalSearch.jsx'
import AskAI from './menus/AskAI.jsx'
import DocumentImport from './menus/DocumentImport.jsx'
import AutoFlow from './menus/AutoFlow.jsx'
import KnowledgeBase from './menus/KnowledgeBase.jsx'
import BpArchitecture from './menus/BpArchitecture.jsx'
import TaxonomyBuilder from './menus/TaxonomyBuilder.jsx'
import HighLevelProcess from './menus/HighLevelProcess.jsx'
import TaxonomyDescription from './menus/TaxonomyDescription.jsx'

const Icon = ({ d }) => (
  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

// Sidebar navigation, grouped by what the user is doing rather than by module
// history: Proses (memahami arsitektur), Studio (membuat & mengimpor), Library
// (menemukan & meminta), Intelligence (bertanya & memberi konteks AI).
// Global Search punya rumah baru: command palette (Ctrl/⌘+K) + pill di sidebar.
const NAV = [
  { id: 'home', label: 'Home', d: 'M3 10.5L12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5' },
  {
    group: 'Processes',
    items: [
      { id: 'architecture', label: 'Process Explorer', d: 'M12 3v6M12 15v6M5 9h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2zM8 3h8M8 21h8' },
      { id: 'taxonomy', label: 'Process Taxonomy', d: 'M12 3v4M6 21v-6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6M4 21h4M16 21h4M10 3h4v4h-4z' },
      { id: 'hlp', label: 'High Level Process', d: 'M3 5h18M3 12h18M3 19h18M7 3v18' },
      { id: 'taxdesc', label: 'Taxonomy Description', d: 'M4 5h16v14H4zM4 9h16M9 9v10M4 13h5M4 16h5' },
    ],
  },
  {
    group: 'Studio',
    items: [
      { id: 'develop', label: 'Document Development', d: 'M12 20h9M4 20l1-4l9.5-9.5a2.1 2.1 0 0 1 3 3L8 19l-4 1' },
      { id: 'import', label: 'Document Import', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' },
      { id: 'flow', label: 'Auto Flow Process', d: 'M4 5h6v4H4zM14 5h6v4h-6zM9 15h6v4H9zM7 9v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9' },
    ],
  },
  {
    group: 'Library',
    items: [
      { id: 'repository', label: 'Repository', d: 'M4 7c0-1.1 3.6-2 8-2s8 .9 8 2s-3.6 2-8 2s-8-.9-8-2zM4 7v10c0 1.1 3.6 2 8 2s8-.9 8-2V7M4 12c0 1.1 3.6 2 8 2s8-.9 8-2' },
      { id: 'search', label: 'Global Search', d: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5' },
      { id: 'request', label: 'Action Request', d: 'M9 11l3 3l8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9' },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { id: 'ai', label: 'Ask AI', d: 'M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2zM9 10h.01M13 10h.01M17 10h.01' },
      { id: 'knowledge', label: 'AI Knowledge Base', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5z' },
    ],
  },
]

// Flat list of every nav target — feeds the command palette.
const NAV_FLAT = NAV.flatMap((e) => (e.group ? e.items.map((m) => ({ ...m, group: e.group })) : [{ ...e, group: '' }]))

export default function App() {
  const [menu, setMenu] = useState('home')
  const [ready, setReady] = useState(false)
  const [rev, setRev] = useState(0)
  const [user, setUser] = useState(undefined) // undefined = checking, null = signed out, object = signed in
  const [authErr, setAuthErr] = useState('')
  const [gate, setGate] = useState('landing') // signed-out flow: landing → login
  const [palette, setPalette] = useState(false)
  const [createOpen, setCreateOpen] = useState(false) // top-bar "+ Create" menu
  const [searchQ, setSearchQ] = useState('') // seed query handed to Global Search
  // Enterprise context: which entity (LVL 0 company) the user is working in.
  const [sideCollapsed, setSideCollapsed] = useState(() => localStorage.getItem('stones-side-collapsed') === '1')
  const toggleSide = () => setSideCollapsed((c) => {
    const n = !c
    try { localStorage.setItem('stones-side-collapsed', n ? '1' : '0') } catch (e) { /* ignore */ }
    return n
  })
  const [entity, setEntity] = useState(() => localStorage.getItem('stones-entity') || '')
  const [focusNodeId, setFocusNodeId] = useState(null) // process node to focus in the Explorer
  const [genReq, setGenReq] = useState(null) // {kind:'hlp'|'taxonomy'|'taxdesc', id, n} — auto-generate request
  const setEntityCtx = (code) => {
    setEntity(code)
    try { localStorage.setItem('stones-entity', code || '') } catch (e) { /* ignore */ }
  }
  const [openId, setOpenIdState] = useState(null)
  const [flowOpenId, setFlowOpenId] = useState(null)
  const [taxOpenId, setTaxOpenId] = useState(null)
  const [hlpOpenId, setHlpOpenId] = useState(null)
  const [descOpenId, setDescOpenId] = useState(null)
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

  // Ctrl/⌘+K opens the command palette anywhere in the app.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setPalette((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
    const dt = getDoc(id)?.docType
    if (dt === 'FLOW') {
      setFlowOpenId(id)
      setMenu('flow')
      return
    }
    if (dt === 'TAXONOMY') {
      setTaxOpenId(id)
      setMenu('taxonomy')
      return
    }
    if (dt === 'HLP') {
      setHlpOpenId(id)
      setMenu('hlp')
      return
    }
    if (dt === 'TAXDESC') {
      setDescOpenId(id)
      setMenu('taxdesc')
      return
    }
    storeSetOpenId(id)
    setOpenIdState(id)
    setMenu('develop')
    syncUrl(id)
  }, [])
  // Jump to a process node inside the Process Explorer (from search, Home, Repository).
  const openProcess = useCallback((nodeId) => {
    setFocusNodeId(nodeId)
    setMenu('architecture')
  }, [])
  // "View as diagram" from the Explorer: open a diagram menu pre-generated
  // from that node/entity (HLP for LVL 0, Taxonomy for LVL 1, description
  // table for LVL 1–2).
  const openDiagram = useCallback((kind, nodeId) => {
    setGenReq({ kind, id: nodeId, n: Date.now() })
    setMenu(kind)
  }, [])

  // Top-bar context: entities for the switcher + breadcrumb of the active menu.
  const entities = ready ? listEntities() : []
  const navCurrent = NAV_FLAT.find((m) => m.id === menu)
  const crumbGroup = navCurrent?.group || ''
  const crumbLabel = navCurrent?.label || 'Home'

  // Firebase configured but still checking sign-in state.
  if (firebaseEnabled && user === undefined) {
    return (
      <div className="stones" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="rf-loading" style={{ color: '#8a94a0' }}>Checking sign-in…</div>
      </div>
    )
  }
  // Signed out → landing page, lalu login.
  if (firebaseEnabled && user === null) {
    if (gate === 'login') return <Login onSignIn={doSignIn} onBack={() => setGate('landing')} err={authErr} />
    return <Landing onEnter={() => setGate('login')} />
  }
  // Signed in (or local mode) but store not ready yet.
  if (!ready) {
    return (
      <div className="stones" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="rf-loading" style={{ color: '#8a94a0' }}>
          Loading LEAP-STONES{firebaseEnabled ? ' · connecting to cloud…' : '…'}
        </div>
      </div>
    )
  }

  return (
    <div className="stones">
      <aside className={'stones-side' + (sideCollapsed ? ' collapsed' : '')}>
        <div className="stones-brand">
          <div className="stones-mark"><BrandMark /></div>
          <div className="stones-brand-txt">
            <div className="stones-logo">LEAP-STONES</div>
            <div className="stones-tag">Business Process Suite</div>
          </div>
          <button className="side-collapse" onClick={toggleSide} title={sideCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={sideCollapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} />
            </svg>
          </button>
        </div>
        <nav className="stones-nav">
          {NAV.map((entry, i) => {
            const NavItem = (m) => (
              <button
                key={m.id}
                className={'stones-navitem' + (menu === m.id ? ' active' : '')}
                onClick={() => setMenu(m.id)}
                title={sideCollapsed ? m.label : undefined}
              >
                <Icon d={m.d} />
                <span className="stones-navitem-lb">{m.label}</span>
              </button>
            )
            if (entry.group) {
              return (
                <div key={'g' + i} className="stones-navgroup">
                  <div className="stones-navgroup-label">{entry.group}</div>
                  {entry.items.map((m) => NavItem(m))}
                </div>
              )
            }
            return NavItem(entry)
          })}
        </nav>
        <div className="stones-side-foot">
          <div className="stones-foot-txt">
            <div style={{ fontWeight: 700, color: '#aebfd0' }}>
              {firebaseEnabled ? user?.displayName || 'Signed in' : 'Local mode'}
            </div>
            <div style={{ wordBreak: 'break-all' }}>{firebaseEnabled ? user?.email || '' : 'localStorage'}</div>
          </div>
          {firebaseEnabled ? (
            <button className="stones-signout" onClick={doSignOut} title="Sign out">
              <svg className="stones-signout-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span className="stones-signout-lb">Sign out</span>
            </button>
          ) : null}
        </div>
      </aside>

      <main className="stones-main">
        {/* ---- enterprise top bar: where am I + entity context + search + user ---- */}
        <header className="stones-top">
          <div className="top-crumb">
            {crumbGroup ? <span className="top-crumb-group">{crumbGroup}</span> : null}
            {crumbGroup ? <span className="top-crumb-sep">/</span> : null}
            <span className="top-crumb-here">{crumbLabel}</span>
          </div>
          <div className="top-entity" title="Entity context — scopes Home and the Process Explorer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M5 21V7l7-4l7 4v14M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01" />
            </svg>
            <select value={entity} onChange={(e) => setEntityCtx(e.target.value)}>
              <option value="">All entities</option>
              {entities.map((e) => {
                const code = e.node?.entity || e.node?.code
                return (
                  <option key={e.id} value={code}>
                    {code}{e.node?.isHolding ? ' · Holding' : ''}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="top-new-wrap">
            <button className="top-new" onClick={() => setCreateOpen((o) => !o)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create
            </button>
            {createOpen ? (
              <>
                <div className="more-backdrop" onClick={() => setCreateOpen(false)} />
                <div className="top-new-menu">
                  {[
                    { l: 'Business Process', s: 'SIPOC → map + RASCI', d: 'M12 20h9M4 20l1-4l9.5-9.5a2.1 2.1 0 0 1 3 3L8 19l-4 1', act: () => { const d = createDoc(blankProject()); openDoc(d.id) } },
                    { l: 'Import document', s: 'PDF → structured SOP (AI)', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12', act: () => setMenu('import') },
                    { l: 'Flow chart', s: 'Swimlane SOP flowchart', d: 'M4 5h6v4H4zM14 5h6v4h-6zM9 15h6v4H9zM7 9v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9', act: () => setMenu('flow') },
                    { l: 'Process node / entity', s: 'Grow the architecture', d: 'M12 3v6M12 15v6M5 9h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z', act: () => setMenu('architecture') },
                    { l: 'Taxonomy diagram', s: 'L0→L3 hierarchy chart', d: 'M12 3v4M6 21v-6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6M4 21h4M16 21h4M10 3h4v4h-4z', act: () => setMenu('taxonomy') },
                    { l: 'High Level Process', s: 'Company value chain', d: 'M3 5h18M3 12h18M3 19h18M7 3v18', act: () => setMenu('hlp') },
                  ].map((it) => (
                    <button
                      key={it.l}
                      className="top-new-item"
                      onClick={() => {
                        setCreateOpen(false)
                        it.act()
                      }}
                    >
                      <span className="top-new-ic"><Icon d={it.d} /></span>
                      <span className="top-new-main">
                        <b>{it.l}</b>
                        <small>{it.s}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
          <button className="top-search" onClick={() => setPalette(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5" />
            </svg>
            <span>Search anything…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="top-user" title={firebaseEnabled ? user?.email || '' : 'Local mode'}>
            {(firebaseEnabled ? user?.displayName || user?.email || 'U' : 'L').trim().charAt(0).toUpperCase()}
          </div>
        </header>

        <div className="stones-content">
          {menu === 'home' && <Home rev={rev} entity={entity} goTo={setMenu} openDoc={openDoc} openProcess={openProcess} />}
          {menu === 'architecture' && (
            <BpArchitecture
              notify={notify}
              rev={rev}
              openDoc={openDoc}
              entity={entity}
              focusId={focusNodeId}
              onFocusHandled={() => setFocusNodeId(null)}
              openDiagram={openDiagram}
            />
          )}
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
          {menu === 'taxonomy' && (
            <TaxonomyBuilder openId={taxOpenId} setOpenId={setTaxOpenId} notify={notify} genFrom={genReq?.kind === 'taxonomy' ? genReq : null} onGenHandled={() => setGenReq(null)} />
          )}
          {menu === 'hlp' && (
            <HighLevelProcess openId={hlpOpenId} setOpenId={setHlpOpenId} notify={notify} genFrom={genReq?.kind === 'hlp' ? genReq : null} onGenHandled={() => setGenReq(null)} />
          )}
          {menu === 'taxdesc' && (
            <TaxonomyDescription openId={descOpenId} setOpenId={setDescOpenId} notify={notify} genFrom={genReq?.kind === 'taxdesc' ? genReq : null} onGenHandled={() => setGenReq(null)} />
          )}
          {menu === 'repository' && <Repository openDoc={openDoc} openProcess={openProcess} notify={notify} rev={rev} />}
          {menu === 'search' && (
            <GlobalSearch key={'gs-' + searchQ} openDoc={openDoc} openProcess={openProcess} rev={rev} initialQuery={searchQ} />
          )}
          {menu === 'ai' && <AskAI rev={rev} />}
          {menu === 'knowledge' && <KnowledgeBase notify={notify} rev={rev} />}
        </div>
      </main>

      <CommandPalette
        open={palette}
        onClose={() => setPalette(false)}
        menus={NAV_FLAT}
        onNav={(id) => {
          if (id === 'search') setSearchQ('')
          setMenu(id)
        }}
        onOpenDoc={openDoc}
        onOpenNode={openProcess}
        onDeepSearch={(q) => {
          setSearchQ(q)
          setMenu('search')
        }}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}
