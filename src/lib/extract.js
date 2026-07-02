// Document Import client — sends an uploaded PDF to the extractDoc Cloud
// Function (Gemini reads it) and returns the structured draft for review.
import { functions, firebaseEnabled } from './firebase.js'
import { httpsCallable } from 'firebase/functions'

export const extractEnabled = firebaseEnabled && !!functions

const MAX_BYTES = 7 * 1024 * 1024 // callable payload safety margin

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

export async function extractFromPdf(file) {
  if (!extractEnabled) throw new Error('Document Import butuh Firebase (mode online).')
  if (!file || !/pdf/i.test(file.type || '') ) throw new Error('Pilih file PDF.')
  if (file.size > MAX_BYTES) throw new Error('PDF terlalu besar (maks ±7MB). Kompres dulu atau pecah per bagian.')
  const pdfBase64 = await fileToBase64(file)
  const fn = httpsCallable(functions, 'extractDoc', { timeout: 300000 })
  const res = await fn({ pdfBase64, fileName: file.name })
  return normalizeDraft(res.data && res.data.doc)
}
