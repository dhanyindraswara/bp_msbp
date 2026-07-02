// AI assistant client — builds a compact context from all BP documents and calls
// the askAI Cloud Function (which proxies to Grok/xAI).
import { functions, firebaseEnabled } from './firebase.js'
import { httpsCallable } from 'firebase/functions'
import { listDocs } from './store.js'

export const aiEnabled = firebaseEnabled && !!functions

// Summarize every document into text the model can reason over.
export function buildContext() {
  const docs = listDocs()
  const blocks = docs.map((d) => {
    const p = d.project || {}
    const lines = [`### ${d.name} [${d.id}] — status: ${d.status}, v${d.version}`]
    if (p.header?.processOwner) lines.push('Process owner: ' + p.header.processOwner)
    const procs = [...new Set((p.sipoc || []).map((r) => (r.process || '').trim()).filter(Boolean))]
    if (procs.length) lines.push('Processes: ' + procs.join('; '))
    ;(p.sipoc || []).forEach((r) => {
      if (r.supplier || r.input || r.process || r.output || r.customer) {
        lines.push(
          `- Supplier: ${r.supplier || '-'} | Input: ${r.input || '-'} | Process: ${r.process || '-'} | Output: ${r.output || '-'} | Customer: ${r.customer || '-'}`,
        )
      }
    })
    ;(p.ppi || []).forEach((r) => {
      if ((r.indicator || '').trim()) lines.push(`PPI (${r.process || '—'}): ${r.indicator}`)
    })
    // Imported SOP payload (from Document Import) — expose the procedure to the AI.
    if (d.sop) {
      const s = d.sop
      lines.push(`Document type: ${s.type || 'SOP'}${s.docNo ? ' — ' + s.docNo : ''}${s.revision ? ' rev ' + s.revision : ''}`)
      if (s.owner) lines.push('Owner: ' + s.owner)
      if (s.purpose) lines.push('Purpose: ' + s.purpose)
      if (s.scope) lines.push('Scope: ' + s.scope)
      if ((s.actors || []).length) lines.push('Actors: ' + s.actors.join('; '))
      ;(s.steps || []).forEach((st) => {
        lines.push(`Step ${st.no}. [${st.pic || '-'}] ${st.activity}${st.input ? ' | in: ' + st.input : ''}${st.output ? ' | out: ' + st.output : ''}`)
      })
      ;(s.rasci || []).forEach((r) => {
        lines.push(`RASCI "${r.activity}": R=${(r.R || []).join(',') || '-'} A=${(r.A || []).join(',') || '-'} S=${(r.S || []).join(',') || '-'} C=${(r.C || []).join(',') || '-'} I=${(r.I || []).join(',') || '-'}`)
      })
      ;(s.ppi || []).forEach((x) => lines.push('PPI/SLA: ' + x))
    }
    return lines.join('\n')
  })
  let text = blocks.join('\n\n')
  if (text.length > 70000) text = text.slice(0, 70000) + '\n...(truncated)'
  return text || '(no documents yet)'
}

export async function askAI(question) {
  if (!aiEnabled) throw new Error('AI is not available (Firebase not configured).')
  const fn = httpsCallable(functions, 'askAI')
  const res = await fn({ question, context: buildContext() })
  return (res.data && res.data.answer) || '(no answer)'
}
