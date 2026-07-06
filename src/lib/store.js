// STONES document store. Backend-agnostic: uses Firestore when configured
// (with realtime sync across devices), otherwise falls back to localStorage.
// Reads are synchronous from an in-memory cache; writes update the cache and
// persist to the active backend, then notify subscribers.
import { sampleProject, blankProject } from './sample.js'
import { db, firebaseEnabled } from './firebase.js'
import { collection, doc, onSnapshot, setDoc, deleteDoc as fsDeleteDoc, getDoc as fsGetDoc } from 'firebase/firestore'

const LOCAL_KEY = 'stones-bp-docs-v1'
const OLD_KEY = 'itm-sipoc-studio-v1'
const OPEN_KEY = 'stones-openid'
const USER_KEY = 'stones-user'
const COL = 'bp_documents'

const rid = (p) => p + Math.random().toString(36).slice(2, 9)
export const STATUS = { draft: 'Draft', in_review: 'In Review', approved: 'Approved', published: 'Published' }

// ---- in-memory state + subscribers ----
let state = { docs: {}, seq: 0 }
let ready = false
let backend = firebaseEnabled && db ? 'firebase' : 'local'
const listeners = new Set()
function emit() {
  listeners.forEach((l) => {
    try {
      l()
    } catch (e) {
      /* ignore */
    }
  })
}
export function subscribe(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function isReady() {
  return ready
}
export function backendName() {
  return backend
}

// ---- current user + open document (per browser) ----
export function getCurrentUser() {
  try {
    return localStorage.getItem(USER_KEY) || 'dhany indraswara'
  } catch (e) {
    return 'dhany indraswara'
  }
}
export function setCurrentUser(n) {
  try {
    localStorage.setItem(USER_KEY, n)
  } catch (e) {
    /* ignore */
  }
}
export function getOpenId() {
  try {
    return localStorage.getItem(OPEN_KEY) || null
  } catch (e) {
    return null
  }
}
export function setOpenId(id) {
  try {
    if (id) localStorage.setItem(OPEN_KEY, id)
    else localStorage.removeItem(OPEN_KEY)
  } catch (e) {
    /* ignore */
  }
}

// ---- local persistence ----
function readLocal() {
  try {
    const s = localStorage.getItem(LOCAL_KEY)
    if (s) {
      const o = JSON.parse(s)
      return { docs: o.docs || {}, seq: o.seq || 0 }
    }
  } catch (e) {
    /* ignore */
  }
  return { docs: {}, seq: 0 }
}
function writeLocal() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ docs: state.docs, seq: state.seq }))
  } catch (e) {
    /* ignore */
  }
}

// ---- persistence dispatch ----
function persistDoc(id) {
  if (backend === 'firebase') {
    if (state.docs[id]) setDoc(doc(db, COL, id), state.docs[id]).catch((e) => console.error('save failed', e))
    setDoc(doc(db, 'app', 'meta'), { seq: state.seq }, { merge: true }).catch(() => {})
  } else {
    writeLocal()
  }
}
function persistDelete(id) {
  if (backend === 'firebase') {
    fsDeleteDoc(doc(db, COL, id)).catch((e) => console.error('delete failed', e))
  } else {
    writeLocal()
  }
}

// ---- init ----
export async function initStore() {
  if (ready) return
  if (backend === 'firebase') {
    try {
      const m = await fsGetDoc(doc(db, 'app', 'meta'))
      if (m.exists()) state.seq = m.data().seq || 0
    } catch (e) {
      /* ignore */
    }
    await new Promise((resolve) => {
      let first = true
      const finish = () => {
        if (first) {
          first = false
          ready = true
          resolve()
        }
      }
      onSnapshot(
        collection(db, COL),
        (snap) => {
          const docs = {}
          snap.forEach((d) => {
            docs[d.id] = d.data()
          })
          state.docs = docs
          finish()
          emit()
        },
        (err) => {
          console.error('Firestore error — falling back to localStorage.', err)
          backend = 'local'
          state = readLocal()
          finish()
          emit()
        },
      )
    })
  } else {
    state = readLocal()
    ready = true
  }
  emit()
}

// ---- helpers ----
function nextId() {
  state.seq = (state.seq || 0) + 1
  return 'BP-' + String(state.seq).padStart(4, '0')
}
const nameOf = (project) => (project.header?.processName || '').trim() || 'Untitled BP'
const versionOf = (project) => (project.header?.version || '').trim() || '1.0'
function normalize(d) {
  if (!d) return d
  return { status: 'draft', versions: [], comments: [], audit: [], ...d }
}
function pushAudit(d, action, detail) {
  d.audit = d.audit || []
  d.audit.unshift({ id: rid('a'), ts: Date.now(), actor: getCurrentUser(), action, detail: detail || '' })
}

// ---- reads ----
export function listDocs() {
  return Object.values(state.docs)
    .map(normalize)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}
export function getDoc(id) {
  return normalize(state.docs[id] || null)
}

// ---- writes ----
export function saveDoc({ id, project, extra }) {
  const prev = state.docs[id]
  if (!prev) return null
  state.docs[id] = {
    ...normalize(prev),
    project,
    name: nameOf(project),
    version: versionOf(project),
    updatedAt: Date.now(),
    ...(extra || {}), // e.g. { flow: {...} } from Auto Flow Process
  }
  persistDoc(id)
  emit()
  return state.docs[id]
}

export function createDoc(project, extra = {}) {
  const id = nextId()
  const now = Date.now()
  const d = {
    id,
    name: nameOf(project),
    version: versionOf(project),
    project,
    status: 'draft',
    versions: [],
    comments: [],
    audit: [{ id: rid('a'), ts: now, actor: getCurrentUser(), action: 'created', detail: 'Document created' }],
    createdAt: now,
    updatedAt: now,
    ...extra, // e.g. { docType: 'SOP', sop: {...} } from Document Import
  }
  state.docs[id] = d
  setOpenId(id)
  persistDoc(id)
  emit()
  return d
}

export function deleteDoc(id) {
  delete state.docs[id]
  if (getOpenId() === id) setOpenId(null)
  persistDelete(id)
  emit()
}

export function duplicateDoc(id) {
  const src = normalize(state.docs[id])
  if (!src) return null
  const project = JSON.parse(JSON.stringify(src.project))
  project.header = { ...project.header, processName: (src.name || 'BP') + ' (copy)' }
  return createDoc(project)
}

// ---- version snapshots ----
function snapshot(d, note) {
  d.versions = d.versions || []
  const snapNo = d.versions.length + 1
  const ver = {
    id: rid('v'),
    snapNo,
    bpVersion: versionOf(d.project),
    note: note || '',
    author: getCurrentUser(),
    createdAt: Date.now(),
    data: JSON.parse(JSON.stringify(d.project)),
  }
  d.versions.unshift(ver)
  return ver
}
export function saveVersion(id, note) {
  const d = state.docs[id]
  if (!d) return null
  const ver = snapshot(d, note)
  pushAudit(d, 'version', 'Saved snapshot #' + ver.snapNo + ' (v' + ver.bpVersion + ')' + (note ? ' — ' + note : ''))
  d.updatedAt = Date.now()
  persistDoc(id)
  emit()
  return ver
}
export function restoreVersion(id, verId) {
  const d = state.docs[id]
  if (!d) return null
  const v = (d.versions || []).find((x) => x.id === verId)
  if (!v) return null
  d.project = JSON.parse(JSON.stringify(v.data))
  d.name = nameOf(d.project)
  d.version = versionOf(d.project)
  d.updatedAt = Date.now()
  pushAudit(d, 'restore', 'Restored snapshot #' + v.snapNo)
  persistDoc(id)
  emit()
  return normalize(d)
}

// ---- approval workflow ----
function transition(id, status, action, detail) {
  const d = state.docs[id]
  if (!d) return null
  d.status = status
  d.updatedAt = Date.now()
  pushAudit(d, action, detail)
  persistDoc(id)
  emit()
  return normalize(d)
}
export const submitForReview = (id, note) => transition(id, 'in_review', 'submit', 'Submitted for review' + (note ? ' — ' + note : ''))
export const recallReview = (id) => transition(id, 'draft', 'recall', 'Recalled from review')
export const approveDoc = (id, note) => transition(id, 'approved', 'approve', 'Approved' + (note ? ' — ' + note : ''))
export const rejectDoc = (id, note) => transition(id, 'draft', 'reject', 'Sent back to draft' + (note ? ' — ' + note : ''))
export const reviseDoc = (id) => transition(id, 'draft', 'revise', 'Started a new revision')
export function publishDoc(id, note) {
  const d = state.docs[id]
  if (!d) return null
  d.status = 'published'
  d.updatedAt = Date.now()
  const ver = snapshot(d, 'Published' + (note ? ' — ' + note : ''))
  pushAudit(d, 'publish', 'Published v' + ver.bpVersion + ' (snapshot #' + ver.snapNo + ')')
  persistDoc(id)
  emit()
  return normalize(d)
}

// ---- comments ----
export function addComment(id, body) {
  const d = state.docs[id]
  if (!d || !(body || '').trim()) return null
  d.comments = d.comments || []
  const c = { id: rid('c'), author: getCurrentUser(), body: body.trim(), createdAt: Date.now(), resolved: false }
  d.comments.unshift(c)
  pushAudit(d, 'comment', 'Added a comment')
  d.updatedAt = Date.now()
  persistDoc(id)
  emit()
  return c
}
export function toggleResolveComment(id, cid) {
  const d = state.docs[id]
  if (!d) return
  ;(d.comments || []).forEach((c) => {
    if (c.id === cid) c.resolved = !c.resolved
  })
  persistDoc(id)
  emit()
}
export function deleteComment(id, cid) {
  const d = state.docs[id]
  if (!d) return
  d.comments = (d.comments || []).filter((c) => c.id !== cid)
  persistDoc(id)
  emit()
}

// Seed a first document if the store is empty (migrates the pre-STONES project).
export function ensureSeed() {
  if (Object.keys(state.docs).length) {
    if (!getOpenId() || !state.docs[getOpenId()]) setOpenId(Object.keys(state.docs)[0])
    return
  }
  let project = null
  try {
    const old = localStorage.getItem(OLD_KEY)
    if (old) project = JSON.parse(old)
  } catch (e) {
    /* ignore */
  }
  createDoc(project || sampleProject())
}

export { blankProject, sampleProject }
