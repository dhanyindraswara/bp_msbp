// Generate diagram payloads (HLP / Taxonomy / Taxonomy Description) straight
// from the Process Explorer tree (BPNODE docs), so the three diagram menus can
// "select an entity / process → auto-draw" instead of retyping the hierarchy.
// The generated payload is a plain starting point — the user keeps full manual
// control afterwards (edit, highlight, save).
import { listNodeDocs, entityCodeOf } from './bpTree.js'
import { hlpBox } from './hlp.js'
import { taxBox } from './taxonomy.js'
import { taxdescProc } from './taxdesc.js'
import { uid } from './constants.js'

// Sorted index over the node docs: byId + children lookup (same ordering as
// the Explorer tree: sortOrder, then code).
function indexNodes() {
  const docs = listNodeDocs()
  const byId = {}
  docs.forEach((d) => (byId[d.id] = d))
  const childrenOf = (pid) =>
    docs
      .filter((d) => (d.node?.parent || null) === pid)
      .sort(
        (a, b) =>
          ((a.node?.sortOrder ?? 0) - (b.node?.sortOrder ?? 0)) ||
          String(a.node?.code || '').localeCompare(String(b.node?.code || '')),
      )
  return { docs, byId, childrenOf }
}

const label = (d) => [d.node?.code, d.node?.title].filter(Boolean).join(' ').trim() || d.name || d.id

// Band order + display names follow the governance guideline (Enterprise /
// Core / Support); legacy category ids keep sensible names.
const BAND_ORDER = ['ENTERPRISE', 'CORE', 'SUPPORT', 'MANAGEMENT', 'ENABLER', '']
const BAND_NAMES = {
  ENTERPRISE: 'Enterprise Process',
  CORE: 'Core Process',
  SUPPORT: 'Support Process',
  MANAGEMENT: 'Management Process',
  ENABLER: 'Enabler Process',
  '': 'Other Process',
}

/* ---------------- pickers (dropdown options) ---------------- */
// Entities (LVL 0) that have at least one LVL 1 child.
export function hlpSourceOptions() {
  const { docs, childrenOf } = indexNodes()
  return docs
    .filter((d) => (d.node?.level ?? 0) === 0)
    .map((d) => ({ id: d.id, label: (d.node.code || d.node.entity || '?') + (d.node.title ? ' — ' + d.node.title : ''), kids: childrenOf(d.id).length }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
// LVL 1 process groups (taxonomy = one L1 with its L2 columns + L3 stacks).
export function taxonomySourceOptions() {
  const { docs, byId } = indexNodes()
  return docs
    .filter((d) => (d.node?.level ?? 0) === 1)
    .map((d) => ({ id: d.id, label: (entityCodeOf(d, byId) || '?') + ' · ' + label(d) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
// Parents whose children become description columns (LVL 1 or LVL 2).
export function taxdescSourceOptions() {
  const { docs, byId, childrenOf } = indexNodes()
  return docs
    .filter((d) => {
      const lv = d.node?.level ?? 0
      return (lv === 1 || lv === 2) && childrenOf(d.id).length > 0
    })
    .map((d) => ({ id: d.id, label: (entityCodeOf(d, byId) || '?') + ' · ' + label(d) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/* ---------------- generators ---------------- */
// Entity (LVL 0) → High Level Process: one band per LVL 1 category.
export function genHlpFromEntity(entityDocId) {
  const { byId, childrenOf } = indexNodes()
  const root = byId[entityDocId]
  if (!root) return null
  const l1 = childrenOf(entityDocId)
  const groups = {}
  l1.forEach((d) => {
    const cat = BAND_NAMES[d.node?.category] !== undefined ? d.node.category : ''
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(d)
  })
  const bands = BAND_ORDER.filter((cat) => groups[cat]?.length).map((cat) => ({
    id: uid(),
    name: BAND_NAMES[cat],
    items: groups[cat].map((d) => hlpBox(d.node.code || '', d.node.title || '', false)),
  }))
  const code = root.node.code || root.node.entity || ''
  return {
    title: `${root.node.title || code} High Level Business Process`,
    subtitle: `Business Process Level 0 · ${code}`,
    footnote: 'Generated from the Process Explorer — edit freely, then save to the Repository.',
    bands: bands.length ? bands : [{ id: uid(), name: 'Core Process', items: [] }],
  }
}

// LVL 1 group → Taxonomy diagram: columns = LVL 2 children, stacks = LVL 3.
export function genTaxonomyFromNode(l1DocId) {
  const { byId, childrenOf } = indexNodes()
  const n1 = byId[l1DocId]
  if (!n1) return null
  const root = n1.node?.parent ? byId[n1.node.parent] : null
  const cat = n1.node?.category || ''
  const columns = childrenOf(l1DocId).map((l2) => ({
    id: uid(),
    l2: taxBox(l2.node.code || '', l2.node.title || '', false),
    l3: childrenOf(l2.id).map((l3) => taxBox(l3.node.code || '', l3.node.title || '', false)),
  }))
  return {
    title: `${label(n1)} (Taxonomy)`,
    l0: (BAND_NAMES[cat] || 'Core Process') + (root ? ` — ${root.node.title || root.node.code || ''}` : ''),
    l1: label(n1),
    columns: columns.length ? columns : [{ id: uid(), l2: taxBox(), l3: [] }],
  }
}

// LVL 1/2 parent → Taxonomy Description: one column per child, KPI list
// prefilled from the child's performance indicators.
export function genTaxdescFromNode(parentDocId) {
  const { byId, childrenOf } = indexNodes()
  const parent = byId[parentDocId]
  if (!parent) return null
  const processes = childrenOf(parentDocId).map((c) => {
    const p = taxdescProc(c.node.code || '', c.node.title || '')
    p.kpi = (c.node.kpis || [])
      .map((k) => (k.indicator || '') + (k.target ? ` (target ${k.target})` : ''))
      .filter(Boolean)
      .join('\n')
    return p
  })
  return {
    title: `${label(parent)} — Taxonomy Description`,
    subtitle: `Business Process Level ${(parent.node?.level ?? 0) + 1} · ${entityCodeOf(parent, byId) || ''}`,
    processes: processes.length ? processes : [taxdescProc()],
  }
}
