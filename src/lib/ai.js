// AI assistant client — builds a compact context from all BP documents and calls
// OpenRouter directly from the browser (the user provides their own API key,
// stored only in their browser — see openrouter.js). No Cloud Function involved.
import { listDocs } from './store.js'
import { buildKnowledgeContext } from './knowledge.js'
import { orChat, hasApiKey } from './openrouter.js'

// AI works whenever the user has set an OpenRouter key (independent of Firebase).
export const aiEnabled = true
export { hasApiKey, getApiKey, setApiKey } from './openrouter.js'

// ── fallback model list (dipakai kalau fetch katalog OpenRouter gagal) ──
// IDs = slug OpenRouter. Gemini di atas biar sama seperti setup Google AI dulu.
// Catatan: model `:free` di OpenRouter itu shared-pool & sering kena rate limit
// ("Provider returned error"/429). Yang paling stabil = `google/gemini-2.5-flash`
// (berbayar, murah) ATAU pasang Google API key sendiri di OpenRouter (BYOK) supaya
// pakai kuota Google gratis kamu.
export const AI_MODELS = [
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash — free' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash — stabil (sama kayak dulu, berbayar)' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini 1.5 Flash — murah' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 — free' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B — free' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini — murah' },
]
export const DEFAULT_MODEL = AI_MODELS[0].id

// Baca PDF pakai engine 'pdf-text' (teks diekstrak server-side) → model apa pun bisa.
export const EXTRACT_MODELS = [
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash — free' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash — stabil (berbayar)' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini 1.5 Flash — murah' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 — free' },
]
export const DEFAULT_EXTRACT_MODEL = EXTRACT_MODELS[0].id

const MODEL_KEY = 'stones-ai-model'
const EXTRACT_MODEL_KEY = 'stones-ai-extract-model'
// Any model id the user picks is kept as-is (the full catalogue is fetched live
// from OpenRouter — see openrouter.fetchModels), falling back to a sane default.
const read = (k, def) => {
  try {
    return localStorage.getItem(k) || def
  } catch (e) {
    return def
  }
}
const write = (k, v) => {
  try {
    if (v) localStorage.setItem(k, v)
  } catch (e) {
    /* ignore */
  }
}
export const getModel = () => read(MODEL_KEY, DEFAULT_MODEL)
export const setModel = (m) => write(MODEL_KEY, m)
export const getExtractModel = () => read(EXTRACT_MODEL_KEY, DEFAULT_EXTRACT_MODEL)
export const setExtractModel = (m) => write(EXTRACT_MODEL_KEY, m)

const SYSTEM_PROMPT = [
  'You are a senior business-process analyst and consultant inside STONES, a business-process management app.',
  "You are given EVERY document stored in this app below as context. It starts with a repository inventory (id, name,",
  'type, status, version) followed by full details of each document. Documents come in several types: BP (SIPOC rows —',
  'Supplier, Input, Process, Output, Customer — plus flows and PPI), imported SOPs (step-by-step procedures with PIC and',
  'RASCI), and Flow Process swimlane flowcharts (steps across responsible-party lanes). You may also be given REFERENCE',
  'DOCUMENTS (an uploaded knowledge base) — treat those as authoritative source material. Use whichever documents are',
  'relevant, and answer questions about any of them (including "what documents exist" / "list the SOPs" type questions).',
  'Your job is to help the user UNDERSTAND, ANALYZE, and IMPROVE these processes. Depending on the question you can:',
  '(1) Answer factual/lookup questions — where a flow lives, who the actors are, describe it as supplier -> process -> output -> customer, naming the BP (id + name).',
  '(2) Analyze processes — identify bottlenecks, redundant or missing steps, unclear ownership/handoffs, gaps in the SIPOC, and weak or missing PPIs.',
  '(3) Recommend improvements — concrete, prioritized, actionable suggestions grounded in business-process best practice.',
  'Ground your analysis in the provided data and reference specific BPs, processes, and steps. You MAY apply general business-process knowledge to reason and suggest improvements even when something is not literally written in the data.',
  'Only if there are genuinely no documents (empty context) should you say there is no BP data yet and ask the user to add or select a business process.',
  'FORMATTING RULES (follow strictly): Reply in clean PLAIN TEXT. Do NOT use Markdown at all — no asterisks for bold or bullets, no underscores, no # headings, no backticks. For a list, number main points "1." "2." "3."; for sub-points, start the line with two spaces then a bullet dot "• ". Keep paragraphs short.',
  'FLOW DIAGRAM: When the question is about a flow/alur/process, ALSO include a simple plain-text flow diagram under a heading line "Alur:" (Indonesian) or "Flow:" (English). One path per line: Supplier -> [Process] -> Output -> Customer (use the arrow ->). Show only the 3 to 6 most relevant paths.',
  'Be concise, concrete, and practical. Reply in the same language as the question (Indonesian or English).',
].join(' ')

// Strip any Markdown the model still emits so the plain-text chat bubble stays clean.
function cleanText(text) {
  return String(text)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^(\s*)[\*\-]\s+/gm, '$1• ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`/g, '')
    .replace(/\*/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Summarize every document into text the model can reason over. Reference
// documents (docType KNOWLEDGE) are handled separately below.
export function buildContext() {
  const docs = listDocs().filter((d) => d.docType !== 'KNOWLEDGE')

  // A directory of every document in the app, so the model knows the full set.
  const typeName = (d) => (d.docType === 'FLOW' ? 'Flow Process' : d.docType === 'SOP' ? 'SOP' : d.docType || 'BP')
  const inventory = docs.length
    ? docs.map((d) => `- [${d.id}] ${d.name} — type: ${typeName(d)}, status: ${d.status}, v${d.version}`).join('\n')
    : '(none)'

  const blocks = docs.map((d) => {
    const p = d.project || {}
    const t = p.template || {}
    const lines = [`### ${d.name} [${d.id}] — type: ${typeName(d)}, status: ${d.status}, v${d.version}`]

    // Document header / title block.
    const meta = []
    if (t.title) meta.push('Title: ' + t.title)
    if (t.level) meta.push('Level: ' + t.level)
    if (t.bpNo) meta.push('Doc No: ' + t.bpNo)
    if (t.effectiveDate) meta.push('Effective: ' + t.effectiveDate)
    if (t.revision) meta.push('Rev: ' + t.revision)
    if (p.header?.processOwner) meta.push('Owner: ' + p.header.processOwner)
    if (meta.length) lines.push(meta.join(' | '))
    const appr = [
      t.preparedBy && 'Prepared by: ' + t.preparedBy,
      t.reviewedBy && 'Reviewed by: ' + t.reviewedBy,
      t.approvedBy && 'Approved by: ' + t.approvedBy,
    ].filter(Boolean)
    if (appr.length) lines.push(appr.join(' | '))

    // SIPOC + PPI (Document Development).
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

    // Imported SOP payload (Document Import).
    if (d.sop) {
      const s = d.sop
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

    // Flow Process payload (Auto Flow Process swimlane flowchart).
    if (d.flow) {
      const f = d.flow
      if (f.section) lines.push('Flow section: ' + f.section)
      const lanes = (f.lanes || []).map((x) => (x || '').trim()).filter(Boolean)
      if (lanes.length) lines.push('Swimlanes (responsible parties): ' + lanes.join(' | '))
      ;(f.steps || []).forEach((st) => {
        const seg = []
        if (st.no) seg.push('#' + st.no)
        if (st.lane) seg.push('[' + st.lane + ']')
        if (st.type && st.type !== 'process') seg.push('(' + st.type + ')')
        if (st.activity) seg.push(st.activity)
        if (st.rasci) seg.push('RASCI:' + st.rasci)
        if (st.ref) seg.push('ref:' + st.ref)
        if ((st.next || '').trim()) seg.push('next→ ' + st.next)
        if (seg.length) lines.push('Flow step ' + seg.join(' '))
      })
    }

    // Discussion (comments) attached to the document.
    const cmts = (d.comments || []).filter((c) => (c.body || '').trim()).slice(0, 5)
    cmts.forEach((c) => lines.push(`Comment (${c.author || '-'}): ${c.body}`))

    return lines.join('\n')
  })

  let text = blocks.join('\n\n')
  if (text.length > 60000) text = text.slice(0, 60000) + '\n...(truncated)'
  const bp =
    'DOCUMENTS IN THIS APP (repository inventory):\n' +
    inventory +
    '\n\n--- FULL DOCUMENT DETAILS ---\n' +
    (text || '(no documents yet)')

  const kb = buildKnowledgeContext()
  return kb ? bp + '\n\n=== REFERENCE DOCUMENTS (uploaded knowledge base) ===\n' + kb : bp
}

export async function askAI(question, model) {
  const content = await orChat({
    model: model || getModel(),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: 'BUSINESS PROCESS DATA:\n' + buildContext() + '\n\n---\nQUESTION: ' + question },
    ],
    temperature: 0.4,
  })
  return cleanText(content) || '(no answer)'
}
