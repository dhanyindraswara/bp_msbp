// Document Import client — reads an uploaded PDF into a structured draft, using
// the active AI provider (OpenRouter's file-parser, or Google Gemini's native
// PDF support). Called directly from the browser with the user's key.
import { chat, hasApiKey, getExtractModel, getActiveProvider, getApiKey } from './providers.js'

// Extraction is always available client-side; the actual call needs an API key.
export const extractEnabled = true

const MAX_BYTES = 7 * 1024 * 1024 // keep request payloads sane

const EXTRACT_PROMPT = [
  'You are a document-digitization engine for LEAP-STONES, a business-process management app.',
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

function parseJsonLoose(content) {
  try {
    return JSON.parse(content)
  } catch (e) {
    const s = content.indexOf('{')
    const t = content.lastIndexOf('}')
    if (s >= 0 && t > s) return JSON.parse(content.slice(s, t + 1))
    throw new Error('Ekstraksi tidak mengembalikan JSON yang valid. Coba ganti Model.')
  }
}

// Gemini reads PDFs natively (incl. scans) via its own generateContent endpoint.
async function geminiExtract(pdfBase64, fileName, model) {
  const key = getApiKey('gemini')
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + (model || 'gemini-2.0-flash') + ':generateContent'
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: 'application/pdf', data: pdfBase64 } }, { text: EXTRACT_PROMPT }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    }),
  })
  if (!resp.ok) throw new Error('Gemini ' + resp.status + ': ' + (await resp.text().catch(() => '')).slice(0, 300))
  const data = await resp.json()
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// OpenRouter reads PDFs via the file-parser plugin (pdf-text engine, free).
async function openrouterExtract(pdfBase64, fileName, model) {
  return chat({
    model: model || getExtractModel(),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACT_PROMPT },
          { type: 'file', file: { filename: fileName || 'document.pdf', file_data: 'data:application/pdf;base64,' + pdfBase64 } },
        ],
      },
    ],
    plugins: [{ id: 'file-parser', pdf: { engine: 'pdf-text' } }],
    temperature: 0.1,
  })
}

export async function extractFromPdf(file, model) {
  const prov = getActiveProvider()
  if (!prov.supportsPdf) {
    throw new Error('Import PDF belum didukung untuk provider "' + prov.label + '". Pilih OpenRouter atau Google Gemini di Set API key.')
  }
  if (!hasApiKey()) throw new Error('Belum ada API key untuk ' + prov.label + '. Isi dulu di "Set API key".')
  if (!file || !/pdf/i.test(file.type || '')) throw new Error('Pilih file PDF.')
  if (file.size > MAX_BYTES) throw new Error('PDF terlalu besar (maks ±7MB). Kompres dulu atau pecah per bagian.')
  const pdfBase64 = await fileToBase64(file)
  const content =
    prov.id === 'gemini' ? await geminiExtract(pdfBase64, file.name, model) : await openrouterExtract(pdfBase64, file.name, model)
  return normalizeDraft(parseJsonLoose(content))
}
