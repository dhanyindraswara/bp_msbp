// Document Import client — reads an uploaded PDF via OpenRouter (called directly
// from the browser with the user's API key + the file-parser plugin) and returns
// the structured draft for review. No Cloud Function involved.
import { orChat, hasApiKey } from './openrouter.js'
import { getExtractModel } from './ai.js'

// Extraction is always available client-side; the actual call needs an API key.
export const extractEnabled = true

const MAX_BYTES = 7 * 1024 * 1024 // keep request payloads sane

const EXTRACT_PROMPT = [
  'You are a document-digitization engine for STONES, a business-process management app.',
  'Read the attached company document (usually an SOP, business process, or policy — often Indonesian and/or English, sometimes scanned) and extract it into JSON matching EXACTLY this schema:',
  '{',
  '  "type": "SOP" | "BP" | "POLICY" | "OTHER",',
  '  "docNo": string, "title": string, "revision": string, "effectiveDate": string, "owner": string,',
  '  "approvals": { "preparedBy": string, "reviewedBy": string, "approvedBy": string },',
  '  "purpose": string, "scope": string,',
  '  "definitions": [ { "term": string, "meaning": string } ],',
  '  "actors": [ string ],',
  '  "steps": [ { "no": number, "activity": string, "pic": string, "input": string, "output": string, "docRef": string } ],',
  '  "rasci": [ { "activity": string, "R": [string], "A": [string], "S": [string], "C": [string], "I": [string] } ],',
  '  "ppi": [ string ], "notes": string',
  '}',
  'Rules: steps follow the procedure in order (activity = concise action, pic = role doing it, input/output = doc/info consumed/produced or empty, docRef = referenced form code).',
  'rasci: transcribe an explicit matrix if present; otherwise derive a draft (step PIC = R; approver/verifier = A; input providers = C; output receivers = I; leave S empty) and say so in notes.',
  'Keep original language of names/roles/titles. Do not invent data; use empty strings/arrays for anything absent.',
  'Output ONLY the JSON object, nothing else.',
].join('\n')

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const s = String(r.result || '')
      resolve(s.slice(s.indexOf(',') + 1)) // strip the data:...;base64, prefix
    }
    r.onerror = () => reject(new Error('Gagal membaca file.'))
    r.readAsDataURL(file)
  })
}

// Normalize the model output so the review UI never hits undefined.
function normalizeDraft(d) {
  const o = d && typeof d === 'object' ? d : {}
  const s = (v) => (v == null ? '' : String(v))
  const arr = (v) => (Array.isArray(v) ? v : [])
  const sarr = (v) => arr(v).map(s).filter(Boolean)
  return {
    type: ['SOP', 'BP', 'POLICY', 'OTHER'].includes(o.type) ? o.type : 'SOP',
    docNo: s(o.docNo),
    title: s(o.title),
    revision: s(o.revision),
    effectiveDate: s(o.effectiveDate),
    owner: s(o.owner),
    approvals: {
      preparedBy: s(o.approvals?.preparedBy),
      reviewedBy: s(o.approvals?.reviewedBy),
      approvedBy: s(o.approvals?.approvedBy),
    },
    purpose: s(o.purpose),
    scope: s(o.scope),
    definitions: arr(o.definitions).map((x) => ({ term: s(x?.term), meaning: s(x?.meaning) })),
    actors: sarr(o.actors),
    steps: arr(o.steps).map((x, i) => ({
      no: Number(x?.no) || i + 1,
      activity: s(x?.activity),
      pic: s(x?.pic),
      input: s(x?.input),
      output: s(x?.output),
      docRef: s(x?.docRef),
    })),
    rasci: arr(o.rasci).map((x) => ({
      activity: s(x?.activity),
      R: sarr(x?.R),
      A: sarr(x?.A),
      S: sarr(x?.S),
      C: sarr(x?.C),
      I: sarr(x?.I),
    })),
    ppi: sarr(o.ppi),
    notes: s(o.notes),
  }
}

export async function extractFromPdf(file, model) {
  if (!hasApiKey()) throw new Error('Belum ada OpenRouter API key. Isi dulu di "Set API key".')
  if (!file || !/pdf/i.test(file.type || '')) throw new Error('Pilih file PDF.')
  if (file.size > MAX_BYTES) throw new Error('PDF terlalu besar (maks ±7MB). Kompres dulu atau pecah per bagian.')
  const pdfBase64 = await fileToBase64(file)
  const content = await orChat({
    model: model || getExtractModel(),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACT_PROMPT },
          { type: 'file', file: { filename: file.name || 'document.pdf', file_data: 'data:application/pdf;base64,' + pdfBase64 } },
        ],
      },
    ],
    // 'pdf-text' = OpenRouter extracts the PDF text first, then sends it as text
    // to the model — free and works with any model (no native file support needed).
    plugins: [{ id: 'file-parser', pdf: { engine: 'pdf-text' } }],
    temperature: 0.1,
  })
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (e) {
    const sIdx = content.indexOf('{')
    const eIdx = content.lastIndexOf('}')
    if (sIdx >= 0 && eIdx > sIdx) parsed = JSON.parse(content.slice(sIdx, eIdx + 1))
    else throw new Error('Ekstraksi tidak mengembalikan JSON yang valid. Coba ganti Model.')
  }
  return normalizeDraft(parsed)
}
