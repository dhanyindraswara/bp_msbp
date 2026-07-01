// STONES document store — persists many Business Process documents in
// localStorage, each identified by a stable ID plus its BP name and version.
import { sampleProject, blankProject } from './sample.js'

const DOCS_KEY = 'stones-bp-docs-v1'
const OLD_KEY = 'itm-sipoc-studio-v1' // single-project storage from before STONES

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

export function listDocs() {
  const { docs } = read()
  return Object.values(docs).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function getDoc(id) {
  return read().docs[id] || null
}

export function getOpenId() {
  return read().openId
}

export function setOpenId(id) {
  const s = read()
  s.openId = id
  write(s)
}

// Persist the current project into an existing document, refreshing its
// derived name/version from the header.
export function saveDoc({ id, project }) {
  const s = read()
  const prev = s.docs[id]
  s.docs[id] = {
    id,
    name: nameOf(project),
    version: versionOf(project),
    project,
    createdAt: prev?.createdAt || Date.now(),
    updatedAt: Date.now(),
  }
  write(s)
  return s.docs[id]
}

export function createDoc(project) {
  const s = read()
  const id = nextId(s)
  s.docs[id] = {
    id,
    name: nameOf(project),
    version: versionOf(project),
    project,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  s.openId = id
  write(s)
  return s.docs[id]
}

export function deleteDoc(id) {
  const s = read()
  delete s.docs[id]
  if (s.openId === id) s.openId = null
  write(s)
}

export function duplicateDoc(id) {
  const s = read()
  const src = s.docs[id]
  if (!src) return null
  const nid = nextId(s)
  const project = JSON.parse(JSON.stringify(src.project))
  project.header = { ...project.header, processName: (src.name || 'BP') + ' (copy)' }
  s.docs[nid] = {
    id: nid,
    name: nameOf(project),
    version: versionOf(project),
    project,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  write(s)
  return s.docs[nid]
}

// Make sure there is at least one document to open. Migrates a pre-STONES
// single project if present, otherwise seeds the HSE Marine & Logistic sample.
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
