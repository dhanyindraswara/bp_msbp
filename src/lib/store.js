// STONES document store — persists many Business Process documents in
// localStorage, each with its working project, version snapshots, an audit
// trail, an approval status, and comments.
import { sampleProject, blankProject } from './sample.js'

const DOCS_KEY = 'stones-bp-docs-v1'
const OLD_KEY = 'itm-sipoc-studio-v1' // single-project storage from before STONES
const USER_KEY = 'stones-user'

const rid = (p) => p + Math.random().toString(36).slice(2, 9)

// Approval lifecycle.
export const STATUS = { draft: 'Draft', in_review: 'In Review', approved: 'Approved', published: 'Published' }

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

function read() {
  try {
    const s = localStorage.getItem(DOCS_KEY)
    if (s) return JSON.parse(s)
  } catch (e) {
    /* ignore */
  }
  return { docs: {}, openId: null, seq: 0 }
}
function write(state) {
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(state))
  } catch (e) {
    /* ignore */
  }
}

function nextId(state) {
  state.seq = (state.seq || 0) + 1
  return 'BP-' + String(state.seq).padStart(4, '0')
}

const nameOf = (project) => (project.header?.processName || '').trim() || 'Untitled BP'
const versionOf = (project) => (project.header?.version || '').trim() || '1.0'

// Backfill fields on docs created before document-control existed.
function normalize(d) {
  if (!d) return d
  return { status: 'draft', versions: [], comments: [], audit: [], ...d }
}

function newDoc(state, project) {
  const id = nextId(state)
  const now = Date.now()
  const doc = {
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
  }
  state.docs[id] = doc
  return doc
}

function pushAudit(state, id, action, detail) {
  const d = state.docs[id]
  if (!d) return
  d.audit = d.audit || []
  d.audit.unshift({ id: rid('a'), ts: Date.now(), actor: getCurrentUser(), action, detail: detail || '' })
}

export function listDocs() {
  const { docs } = read()
  return Object.values(docs)
    .map(normalize)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function getDoc(id) {
  return normalize(read().docs[id] || null)
}

export function getOpenId() {
  return read().openId
}
export function setOpenId(id) {
  const s = read()
  s.openId = id
  write(s)
}

// Persist the working project (autosave). Preserves versions/audit/comments/status.
export function saveDoc({ id, project }) {
  const s = read()
  const prev = s.docs[id]
  if (!prev) return null
  s.docs[id] = { ...normalize(prev), project, name: nameOf(project), version: versionOf(project), updatedAt: Date.now() }
  write(s)
  return s.docs[id]
}

export function createDoc(project) {
  const s = read()
  const d = newDoc(s, project)
  s.openId = d.id
  write(s)
  return d
}

export function deleteDoc(id) {
  const s = read()
  delete s.docs[id]
  if (s.openId === id) s.openId = null
  write(s)
}

export function duplicateDoc(id) {
  const s = read()
  const src = normalize(s.docs[id])
  if (!src) return null
  const project = JSON.parse(JSON.stringify(src.project))
  project.header = { ...project.header, processName: (src.name || 'BP') + ' (copy)' }
  const d = newDoc(s, project)
  write(s)
  return d
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
  const s = read()
  const d = s.docs[id]
  if (!d) return null
  const ver = snapshot(d, note)
  pushAudit(s, id, 'version', 'Saved snapshot #' + ver.snapNo + ' (v' + ver.bpVersion + ')' + (note ? ' — ' + note : ''))
  d.updatedAt = Date.now()
  write(s)
  return ver
}

export function restoreVersion(id, verId) {
  const s = read()
  const d = s.docs[id]
  if (!d) return null
  const v = (d.versions || []).find((x) => x.id === verId)
  if (!v) return null
  d.project = JSON.parse(JSON.stringify(v.data))
  d.name = nameOf(d.project)
  d.version = versionOf(d.project)
  d.updatedAt = Date.now()
  pushAudit(s, id, 'restore', 'Restored snapshot #' + v.snapNo)
  write(s)
  return normalize(d)
}

// ---- approval workflow ----
function transition(id, status, action, detail) {
  const s = read()
  const d = s.docs[id]
  if (!d) return null
  d.status = status
  d.updatedAt = Date.now()
  pushAudit(s, id, action, detail)
  write(s)
  return normalize(d)
}

export function submitForReview(id, note) {
  return transition(id, 'in_review', 'submit', 'Submitted for review' + (note ? ' — ' + note : ''))
}
export function recallReview(id) {
  return transition(id, 'draft', 'recall', 'Recalled from review')
}
export function approveDoc(id, note) {
  return transition(id, 'approved', 'approve', 'Approved' + (note ? ' — ' + note : ''))
}
export function rejectDoc(id, note) {
  return transition(id, 'draft', 'reject', 'Sent back to draft' + (note ? ' — ' + note : ''))
}
export function reviseDoc(id) {
  return transition(id, 'draft', 'revise', 'Started a new revision')
}

export function publishDoc(id, note) {
  const s = read()
  const d = s.docs[id]
  if (!d) return null
  d.status = 'published'
  d.updatedAt = Date.now()
  const ver = snapshot(d, 'Published' + (note ? ' — ' + note : ''))
  pushAudit(s, id, 'publish', 'Published v' + ver.bpVersion + ' (snapshot #' + ver.snapNo + ')')
  write(s)
  return normalize(d)
}

// ---- comments ----
export function addComment(id, body) {
  const s = read()
  const d = s.docs[id]
  if (!d || !(body || '').trim()) return null
  d.comments = d.comments || []
  const c = { id: rid('c'), author: getCurrentUser(), body: body.trim(), createdAt: Date.now(), resolved: false }
  d.comments.unshift(c)
  pushAudit(s, id, 'comment', 'Added a comment')
  write(s)
  return c
}
export function toggleResolveComment(id, cid) {
  const s = read()
  const d = s.docs[id]
  if (!d) return
  ;(d.comments || []).forEach((c) => {
    if (c.id === cid) c.resolved = !c.resolved
  })
  write(s)
}
export function deleteComment(id, cid) {
  const s = read()
  const d = s.docs[id]
  if (!d) return
  d.comments = (d.comments || []).filter((c) => c.id !== cid)
  write(s)
}

export function ensureSeed() {
  const s = read()
  if (Object.keys(s.docs).length) {
    if (!s.openId || !s.docs[s.openId]) {
      s.openId = Object.keys(s.docs)[0]
      write(s)
    }
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
