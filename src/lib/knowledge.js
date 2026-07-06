// AI Knowledge Base — reference documents the user uploads so Ask AI can ground
// its answers in them. Stored as documents in the existing `bp_documents`
// collection (docType 'KNOWLEDGE' + a `knowledge` payload), so they ride the
// same Firestore rules, realtime cache and persistence as everything else — no
// new backend, no new security rules. The extracted text is injected into the
// Ask AI context; PDFs reuse the already-deployed extractDoc function.
import { createDoc, saveDoc, getDoc, listDocs, deleteDoc, getOpenId, setOpenId } from './store.js'

const blankKProject = (title) => ({
  header: { processName: title || 'Referensi', processOwner: '', version: '1.0' },
  template: { level: 'REFERENCE', title: title || '' },
})

// All reference entries, newest first (listDocs is already sorted).
export function listKnowledge() {
  return listDocs().filter((d) => d.docType === 'KNOWLEDGE')
}

// Create a new reference. createDoc sets the "open document"; we restore it so
// adding a reference never hijacks the BP the user has open in Development.
export function addKnowledge({ title, content, kind }) {
  const prev = getOpenId()
  const t = (title || '').trim() || 'Referensi tanpa judul'
  const clean = String(content || '')
  const d = createDoc(blankKProject(t), {
    docType: 'KNOWLEDGE',
    knowledge: { title: t, content: clean, kind: kind || 'text', enabled: true, chars: clean.length },
  })
  setOpenId(prev || null)
  return d
}

export function updateKnowledge(id, patch) {
  const d = getDoc(id)
  if (!d) return
  const knowledge = { ...(d.knowledge || {}), ...patch }
  if (patch.content != null) knowledge.chars = String(patch.content).length
  const project = {
    ...(d.project || blankKProject(knowledge.title)),
    header: { ...(d.project?.header || {}), processName: knowledge.title || 'Referensi' },
  }
  saveDoc({ id, project, extra: { knowledge } })
}

export function deleteKnowledge(id) {
  deleteDoc(id)
}

// The reference section injected into the AI context (only enabled entries).
export function buildKnowledgeContext(limit = 24000) {
  const items = listKnowledge().filter(
    (d) => d.knowledge && d.knowledge.enabled !== false && (d.knowledge.content || '').trim(),
  )
  if (!items.length) return ''
  const blocks = items.map((d) => `### Referensi: ${d.knowledge.title || d.name}\n${d.knowledge.content.trim()}`)
  let text = blocks.join('\n\n')
  if (text.length > limit) text = text.slice(0, limit) + '\n...(dipotong)'
  return text
}

// Count of enabled references — shown in the Ask AI header.
export function activeKnowledgeCount() {
  return listKnowledge().filter((d) => d.knowledge && d.knowledge.enabled !== false && (d.knowledge.content || '').trim()).length
}

// Turn an extractDoc draft (SOP schema) into readable reference text.
export function draftToKnowledgeText(d) {
  if (!d || typeof d !== 'object') return ''
  const L = []
  const add = (label, v) => v && L.push(label + ': ' + v)
  add('Judul', d.title)
  add('No. dokumen', d.docNo)
  add('Revisi', d.revision)
  add('Tanggal efektif', d.effectiveDate)
  add('Pemilik', d.owner)
  if (d.purpose) L.push('\nTujuan:\n' + d.purpose)
  if (d.scope) L.push('\nRuang lingkup:\n' + d.scope)
  if ((d.definitions || []).length) {
    L.push('\nDefinisi:')
    d.definitions.forEach((x) => x && x.term && L.push('- ' + x.term + (x.meaning ? ': ' + x.meaning : '')))
  }
  if ((d.actors || []).length) L.push('\nAktor/PIC: ' + d.actors.join('; '))
  if ((d.steps || []).length) {
    L.push('\nLangkah prosedur:')
    d.steps.forEach((s) =>
      L.push(
        `${s.no}. [${s.pic || '-'}] ${s.activity}` +
          (s.input ? ' | input: ' + s.input : '') +
          (s.output ? ' | output: ' + s.output : '') +
          (s.docRef ? ' | ref: ' + s.docRef : ''),
      ),
    )
  }
  if ((d.rasci || []).length) {
    L.push('\nRASCI:')
    d.rasci.forEach((r) =>
      L.push(
        `${r.activity}: R=${(r.R || []).join(',') || '-'} A=${(r.A || []).join(',') || '-'} S=${(r.S || []).join(',') || '-'} C=${(r.C || []).join(',') || '-'} I=${(r.I || []).join(',') || '-'}`,
      ),
    )
  }
  if ((d.ppi || []).length) {
    L.push('\nPPI/SLA:')
    d.ppi.forEach((x) => L.push('- ' + x))
  }
  if (d.notes) L.push('\nCatatan: ' + d.notes)
  return L.join('\n').trim()
}
