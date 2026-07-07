// AI assistant client — builds a compact context from all BP documents and calls
// OpenRouter directly from the browser (the user provides their own API key,
// stored only in their browser — see openrouter.js). No Cloud Function involved.
import { listDocs } from './store.js'
import { buildKnowledgeContext } from './knowledge.js'
import { orChat, hasApiKey } from './openrouter.js'

// AI works whenever the user has set an OpenRouter key (independent of Firebase).
export const aiEnabled = true
export { hasApiKey, getApiKey, setApiKey } from './openrouter.js'

// ── model catalogues (edit freely) — IDs are OpenRouter slugs ──
// Chat models for Ask AI. ":free" = no-cost tier, handy when a quota runs out.
export const AI_MODELS = [
  { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3 — free' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B — free' },
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash — free' },
  { id: 'deepseek/deepseek-r1:free', label: 'DeepSeek R1 (reasoning) — free' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini — murah' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet — bagus' },
]
export const DEFAULT_MODEL = AI_MODELS[0].id

// Extract models for Document Import — must accept file/PDF input. Gemini free
// handles scans (native vision) and costs nothing.
export const EXTRACT_MODELS = [
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash — free (scan OK)' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini 1.5 Flash — murah' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
]
export const DEFAULT_EXTRACT_MODEL = EXTRACT_MODELS[0].id

const MODEL_KEY = 'stones-ai-model'
const EXTRACT_MODEL_KEY = 'stones-ai-extract-model'
const read = (k, list, def) => {
  try {
    const m = localStorage.getItem(k)
    return m && list.some((x) => x.id === m) ? m : def
  } catch (e) {
    return def
  }
}
const write = (k, v) => {
  try {
    localStorage.setItem(k, v)
  } catch (e) {
    /* ignore */
  }
}
export const getModel = () => read(MODEL_KEY, AI_MODELS, DEFAULT_MODEL)
export const setModel = (m) => write(MODEL_KEY, m)
export const getExtractModel = () => read(EXTRACT_MODEL_KEY, EXTRACT_MODELS, DEFAULT_EXTRACT_MODEL)
export const setExtractModel = (m) => write(EXTRACT_MODEL_KEY, m)

const SYSTEM_PROMPT = [
  'You are a senior business-process analyst and consultant inside STONES, a business-process management app.',
  "You are given the company's documented business processes below as context: BP documents, each with SIPOC rows",
  '(Supplier, Input, Process, Output, Customer), process flows, and PPI (process performance indicators). You may also',
  'be given REFERENCE DOCUMENTS (an uploaded knowledge base) — treat those as authoritative source material.',
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
  if (text.length > 52000) text = text.slice(0, 52000) + '\n...(truncated)'
  const bp = text || '(no documents yet)'
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
