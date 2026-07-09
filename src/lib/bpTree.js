// Business Process hierarchy (LVL 0–3) + per-LVL3 SIPOC, maintained from the
// "BP Architecture" menu. Realizes the data model in docs/DATABASE_DESIGN.md:
// a self-referencing tree of nodes, where a LVL 3 node (a leaf process) carries
// the SIPOC — supplier/input/process/output/customer rows — plus standalone
// RISK and Performance-Indicator lists.
//
// Storage: each node is a document in the SAME `bp_documents` collection
// (docType 'BPNODE' + a `node` payload), exactly like KNOWLEDGE/SOP/FLOW. So it
// rides the existing Firestore rules, realtime cache and persistence — no new
// collection, no new security rules, nothing extra to deploy.
//
// Supplier & Customer are polymorphic references stored as { type, refId, label }:
//   - PROCESS → refId points at another BP node (a process elsewhere in the tree)
//   - ORG     → refId points at an org unit (org_units, wired later; label used now)
//   - FREE    → refId null, free-text actor typed by the user
// `label` is always filled so the SIPOC renders without any join; `refId` keeps
// the link for traceability.
import { createDoc, saveDoc, getDoc, listDocs, deleteDoc, getOpenId, setOpenId } from './store.js'

export const MAX_LEVEL = 3
export const LEVEL_NAMES = ['Entity (LVL 0)', 'BP LVL 1', 'BP LVL 2', 'BP LVL 3']
export const PARTY_TYPES = [
  { id: 'PROCESS', label: 'Proses' },
  { id: 'ORG', label: 'Organisasi' },
  { id: 'FREE', label: 'Bebas' },
]

// LVL 1 categories in the ITM taxonomy. The letter seeds the numbering
// (Core → C.1, Enabler → E.1, Management → M.1).
export const CATEGORIES = [
  { id: 'CORE', label: 'Core', letter: 'C' },
  { id: 'ENABLER', label: 'Enabler', letter: 'E' },
  { id: 'MANAGEMENT', label: 'Management', letter: 'M' },
]
export const categoryLetter = (id) => (CATEGORIES.find((c) => c.id === id) || {}).letter || 'C'

const nid = (p) => (p || 'r') + Math.random().toString(36).slice(2, 9)

// ---- blank factories ----
export const blankParty = () => ({ type: 'FREE', refId: null, label: '' })
export const blankSipocRow = () => ({
  id: nid('s'),
  supplier: blankParty(),
  input: '',
  process: '',
  output: '',
  customer: blankParty(),
})
export const blankRisk = () => ({ id: nid('k'), description: '' })
export const blankKpi = () => ({ id: nid('p'), indicator: '', target: '' })

export function blankNode(level, parent) {
  return {
    entity: '', // entity code (e.g. ITM); on a LVL0 this IS the entity, children inherit it
    parent: parent || null,
    level: Math.max(0, Math.min(MAX_LEVEL, level | 0)),
    code: '',
    title: '',
    category: '', // LVL1 only: CORE | ENABLER | MANAGEMENT
    isHolding: false, // LVL0 only: mark the holding company
    sortOrder: 0,
    sipoc: [],
    risks: [],
    kpis: [],
  }
}

// A node doc always has a valid project so name/version stay meaningful in the
// generic store; the process name mirrors the node's code + title.
const nodeProject = (n) => ({
  header: {
    processName: [n.code, n.title].filter(Boolean).join(' ').trim() || 'BP node',
    processOwner: n.entity || '',
    version: '1.0',
  },
  template: { level: 'L' + (n.level ?? 0), title: n.title || '' },
})

const normNode = (n) => ({
  entity: '',
  parent: null,
  level: 0,
  code: '',
  title: '',
  category: '',
  isHolding: false,
  sortOrder: 0,
  sipoc: [],
  risks: [],
  kpis: [],
  ...(n || {}),
})

// ---- reads ----
// All node docs (each is a store doc `{ id, node, name, ... }`).
export function listNodeDocs() {
  return listDocs().filter((d) => d.docType === 'BPNODE')
}

// Nodes that can serve as a Supplier/Customer of type PROCESS: every process
// node except the one being edited, labelled by code + title, tagged with the
// entity it belongs to (so cross-entity links read clearly).
export function processOptions(excludeId) {
  const docs = listNodeDocs()
  const byId = {}
  docs.forEach((d) => (byId[d.id] = d))
  return docs
    .filter((d) => d.id !== excludeId && (d.node?.code || d.node?.title))
    .map((d) => ({
      id: d.id,
      level: d.node?.level ?? 0,
      entity: entityCodeOf(d, byId),
      label: [d.node?.code, d.node?.title].filter(Boolean).join(' ').trim() || d.name || d.id,
    }))
    .sort((a, b) => (a.entity || '').localeCompare(b.entity || '') || a.label.localeCompare(b.label))
}

// Build the forest (roots → children), each entry `{ id, node, name, children }`,
// sorted by sortOrder then code at every level.
export function buildForest(docs) {
  const list = (docs || listNodeDocs()).map((d) => ({ ...d, node: normNode(d.node), children: [] }))
  const byId = {}
  list.forEach((d) => (byId[d.id] = d))
  const roots = []
  list.forEach((d) => {
    const p = d.node.parent
    if (p && byId[p]) byId[p].children.push(d)
    else roots.push(d)
  })
  const sortRec = (arr) => {
    arr.sort((a, b) => (a.node.sortOrder - b.node.sortOrder) || String(a.node.code).localeCompare(String(b.node.code)))
    arr.forEach((x) => sortRec(x.children))
    return arr
  }
  return sortRec(roots)
}

// Walk up the parent chain to the LVL0 root and return its entity code.
export function entityCodeOf(doc, byId) {
  let cur = doc
  let guard = 0
  while (cur && guard++ < 20) {
    const n = cur.node || {}
    if ((n.level ?? 0) === 0) return n.entity || n.code || ''
    const pid = n.parent
    if (!pid || !byId[pid]) break
    cur = byId[pid]
  }
  return (doc.node && (doc.node.entity || '')) || ''
}

// All LVL0 entity nodes (each a separate corporation), holding first then A→Z.
export function listEntities() {
  return listNodeDocs()
    .filter((d) => (d.node?.level ?? 0) === 0)
    .sort(
      (a, b) =>
        (b.node?.isHolding ? 1 : 0) - (a.node?.isHolding ? 1 : 0) ||
        String(a.node?.code || a.node?.entity).localeCompare(String(b.node?.code || b.node?.entity)),
    )
}

// Suggest the next code for a child, following the ITM numbering scheme. LVL1
// seeds from the chosen category letter (C/E/M); deeper levels extend the parent
// code with the next sequential index. Always editable by the user afterwards.
export function suggestChildCode(parentNode, level, siblingsCount, category) {
  const n = siblingsCount + 1
  if (level === 1) return categoryLetter(category) + '.' + n
  const base = String((parentNode && parentNode.code) || '').replace(/\.+$/, '')
  return base ? base + '.' + n : String(n)
}

// Every place a node is referenced as a Supplier or Customer elsewhere — the
// "used by" / inbound side of the connections.
export function inboundRefs(nodeId) {
  const out = []
  listNodeDocs().forEach((d) => {
    ;(d.node?.sipoc || []).forEach((r) => {
      const label = [d.node?.code, d.node?.title].filter(Boolean).join(' ').trim() || d.name || d.id
      if (r.supplier?.type === 'PROCESS' && r.supplier?.refId === nodeId)
        out.push({ nodeId: d.id, label, role: 'supplier' })
      if (r.customer?.type === 'PROCESS' && r.customer?.refId === nodeId)
        out.push({ nodeId: d.id, label, role: 'customer' })
    })
  })
  return out
}

// ---- writes ----
// createDoc sets the "open document"; restore it so managing the hierarchy never
// hijacks whatever BP the user has open in Document Development.
export function createNode(level, parent) {
  const prev = getOpenId()
  const docs = listNodeDocs()
  const byId = {}
  docs.forEach((d) => (byId[d.id] = d))
  const parentDoc = parent ? byId[parent] : null
  const siblings = docs.filter((d) => (d.node?.parent || null) === (parent || null))
  const inheritedEntity = parentDoc ? entityCodeOf(parentDoc, byId) : ''
  const node = {
    ...blankNode(level, parent),
    entity: inheritedEntity,
    code: level === 0 ? '' : suggestChildCode(parentDoc?.node, level, siblings.length, ''),
    sortOrder: siblings.length,
  }
  const d = createDoc(nodeProject(node), { docType: 'BPNODE', node })
  setOpenId(prev || null)
  return d
}

// Create a new LVL0 entity (a separate corporation).
export function createEntity(code, name, isHolding) {
  const prev = getOpenId()
  const siblings = listNodeDocs().filter((d) => (d.node?.level ?? 0) === 0)
  const c = (code || '').trim()
  const node = {
    ...blankNode(0, null),
    entity: c,
    code: c,
    title: (name || '').trim(),
    isHolding: !!isHolding,
    sortOrder: siblings.length,
  }
  const d = createDoc(nodeProject(node), { docType: 'BPNODE', node })
  setOpenId(prev || null)
  return d
}

export function saveNode(id, node) {
  const d = getDoc(id)
  if (!d) return null
  const n = normNode(node)
  return saveDoc({ id, project: nodeProject(n), extra: { docType: 'BPNODE', node: n } })
}

// Delete a node and its whole subtree.
export function deleteNodeCascade(id) {
  const docs = listNodeDocs()
  const childrenOf = (pid) => docs.filter((d) => (d.node?.parent || null) === pid)
  const doomed = []
  const walk = (pid) => {
    doomed.push(pid)
    childrenOf(pid).forEach((c) => walk(c.id))
  }
  walk(id)
  doomed.forEach((x) => deleteDoc(x))
  return doomed.length
}

// A readable label for a stored party (used when we only have the value).
export const partyText = (p) => (p && p.label ? p.label : '')

// ---- sample tree (ITM holding + a second entity) so the tree isn't empty ----
export function seedSampleTree() {
  const prev = getOpenId()
  const mk = (level, parent, code, title, entity, extra) => {
    const siblings = listNodeDocs().filter((d) => (d.node?.parent || null) === (parent || null))
    const node = { ...blankNode(level, parent), code, title, entity, sortOrder: siblings.length, ...(extra || {}) }
    return createDoc(nodeProject(node), { docType: 'BPNODE', node }).id
  }
  // Holding entity
  const itm = mk(0, null, 'ITM', 'Indo Tambangraya Megah', 'ITM', { isHolding: true })
  // LVL1 categories (Core / Enabler / Management)
  const c4 = mk(1, itm, 'C.4', 'Marine & Logistic', 'ITM', { category: 'CORE' })
  mk(1, itm, 'E.1', 'Human Capital', 'ITM', { category: 'ENABLER' })
  mk(1, itm, 'M.1', 'Strategic Planning', 'ITM', { category: 'MANAGEMENT' })
  // LVL2 under Marine & Logistic
  const c41 = mk(2, c4, 'C4.1', 'Marine & Logistics Planning', 'ITM')
  const c42 = mk(2, c4, 'C4.2', 'Marine & Logistic Operation', 'ITM')
  const c43 = mk(2, c4, 'C4.3', 'Quality Assurance', 'ITM')
  // LVL3 leaves (SIPOC on the first)
  mk(3, c41, 'C4.1.1', 'Barge & Shipment Planning', 'ITM', {
    sipoc: [
      {
        ...blankSipocRow(),
        supplier: { type: 'FREE', refId: null, label: 'Marketing / Sales' },
        input: 'Rencana muat & kontrak penjualan',
        process: 'Susun rencana barge & shipment',
        output: 'Draft shipment schedule',
        customer: { type: 'FREE', refId: null, label: 'Marine Operation' },
      },
    ],
    risks: [{ ...blankRisk(), description: 'Cuaca ekstrem menunda jadwal barge' }],
    kpis: [{ ...blankKpi(), indicator: '% shipment on-time', target: '≥ 95%' }],
  })
  mk(3, c41, 'C4.1.2', 'Data Management', 'ITM')
  mk(3, c42, 'C4.2.1', 'Barge Operation', 'ITM')
  mk(3, c42, 'C4.2.2', 'Shipment Operation', 'ITM')
  mk(3, c42, 'C4.2.3', 'Compliance & Document', 'ITM')
  mk(3, c43, 'C4.3.1', 'Marine & Logistic System Development', 'ITM')
  // A second, separate corporation (starts empty) to show multi-entity
  mk(0, null, 'TCM', 'Trubaindo Coal Mining', 'TCM')
  setOpenId(prev || null)
  return itm
}
