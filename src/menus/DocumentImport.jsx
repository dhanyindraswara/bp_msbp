// STONES › Document Import — upload a company PDF (SOP/BP/policy), let AI
// extract it into structured data, review & correct it side-by-side with the
// original, then save it into the repository. The AI drafts, a human approves.
import { useState, useRef, useEffect } from 'react'
import { extractFromPdf, extractEnabled } from '../lib/extract.js'
import { createDoc, blankProject } from '../lib/store.js'
import { uploadFile, filesEnabled } from '../lib/files.js'

const TYPES = ['SOP', 'BP', 'POLICY', 'OTHER']

const Field = ({ label, value, onChange, placeholder, wide }) => (
  <label className={'imp-field' + (wide ? ' imp-field-wide' : '')}>
    <span>{label}</span>
    <input value={value} placeholder={placeholder || ''} onChange={(e) => onChange(e.target.value)} />
  </label>
)

const Area = ({ label, value, onChange, rows = 3 }) => (
  <label className="imp-field imp-field-wide">
    <span>{label}</span>
    <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
  </label>
)

export default function DocumentImport({ notify, goRepository }) {
  const [phase, setPhase] = useState('idle') // idle | extracting | review | saving | done
  const [file, setFile] = useState(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [draft, setDraft] = useState(null)
  const [err, setErr] = useState('')
  const [savedId, setSavedId] = useState('')
  const [drag, setDrag] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => () => pdfUrl && URL.revokeObjectURL(pdfUrl), [pdfUrl])

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const setApproval = (k, v) => setDraft((d) => ({ ...d, approvals: { ...d.approvals, [k]: v } }))
  const setStep = (i, k, v) =>
    setDraft((d) => ({ ...d, steps: d.steps.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }))
  const addStep = () =>
    setDraft((d) => ({ ...d, steps: [...d.steps, { no: d.steps.length + 1, activity: '', pic: '', input: '', output: '', docRef: '' }] }))
  const delStep = (i) => setDraft((d) => ({ ...d, steps: d.steps.filter((_, j) => j !== i) }))
  const setRasci = (i, k, v) =>
    setDraft((d) => ({
      ...d,
      rasci: d.rasci.map((r, j) => (j === i ? { ...r, [k]: k === 'activity' ? v : v.split(',').map((x) => x.trim()).filter(Boolean) } : r)),
    }))
  const addRasci = () => setDraft((d) => ({ ...d, rasci: [...d.rasci, { activity: '', R: [], A: [], S: [], C: [], I: [] }] }))
  const delRasci = (i) => setDraft((d) => ({ ...d, rasci: d.rasci.filter((_, j) => j !== i) }))

  const pick = async (f) => {
    if (!f) return
    setErr('')
    setFile(f)
    const url = URL.createObjectURL(f)
    setPdfUrl(url)
    setPhase('extracting')
    try {
      const doc = await extractFromPdf(f)
      setDraft(doc)
      setPhase('review')
    } catch (e) {
      setErr(e && e.message ? e.message : 'Ekstraksi gagal')
      setPhase('idle')
    }
  }

  const reset = () => {
    setPhase('idle')
    setFile(null)
    setDraft(null)
    setErr('')
    setSavedId('')
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl('')
  }

  const save = async () => {
    setPhase('saving')
    setErr('')
    try {
      const project = blankProject()
      project.header.processName = draft.title || (file ? file.name.replace(/\.pdf$/i, '') : 'Imported document')
      project.header.processOwner = draft.owner
      project.header.version = draft.revision || '1.0'
      project.template.title = draft.title
      project.template.bpNo = draft.docNo
      project.template.effectiveDate = draft.effectiveDate
      project.template.revision = draft.revision || '01'
      project.template.preparedBy = draft.approvals.preparedBy
      project.template.reviewedBy = draft.approvals.reviewedBy
      project.template.approvedBy = draft.approvals.approvedBy
      if (draft.type === 'SOP') project.template.level = 'STANDARD OPERATING PROCEDURE'
      const d = createDoc(project, { docType: draft.type, sop: draft })
      if (filesEnabled && file) {
        try {
          await uploadFile(d.id, file) // keep the original PDF attached for traceability
        } catch (e) {
          console.error('PDF attach failed', e)
        }
      }
      setSavedId(d.id)
      setPhase('done')
      notify('Dokumen diimpor sebagai ' + d.id)
    } catch (e) {
      setErr(e && e.message ? e.message : 'Gagal menyimpan')
      setPhase('review')
    }
  }

  // ---- screens ----
  if (!extractEnabled) {
    return (
      <div className="stones-page">
        <div className="stones-page-hd">
          <h1>Document Import</h1>
          <p>Ubah PDF SOP/BP/policy jadi data terstruktur.</p>
        </div>
        <div className="imp-note">Document Import butuh Firebase (mode online) — fitur ini nonaktif di mode lokal.</div>
      </div>
    )
  }

  if (phase === 'idle' || phase === 'extracting') {
    return (
      <div className="stones-page">
        <div className="stones-page-hd">
          <h1>Document Import</h1>
          <p>Upload PDF (SOP, BP, policy) — AI mengekstrak isinya jadi data terstruktur, kamu review sebelum disimpan.</p>
        </div>
        {phase === 'extracting' ? (
          <div className="imp-drop imp-busy">
            <div className="imp-spinner" />
            <div className="imp-drop-title">Membaca &amp; mengekstrak “{file?.name}”…</div>
            <div className="imp-drop-sub">Biasanya 20–60 detik tergantung jumlah halaman.</div>
          </div>
        ) : (
          <div
            className={'imp-drop' + (drag ? ' imp-drag' : '')}
            onClick={() => inputRef.current && inputRef.current.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              pick(e.dataTransfer.files && e.dataTransfer.files[0])
            }}
          >
            <div className="imp-drop-ico">⇪</div>
            <div className="imp-drop-title">Klik untuk pilih PDF, atau drag &amp; drop ke sini</div>
            <div className="imp-drop-sub">Maks ±7MB per file · hasil scan juga bisa · PDF asli ikut tersimpan sebagai lampiran</div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => pick(e.target.files && e.target.files[0])}
            />
          </div>
        )}
        {err ? <div className="ai-err" style={{ marginTop: 14 }}>{err}</div> : null}
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="stones-page">
        <div className="stones-page-hd">
          <h1>Document Import</h1>
        </div>
        <div className="imp-done">
          <div className="imp-done-mark">✓</div>
          <div className="imp-done-title">Tersimpan sebagai {savedId}</div>
          <div className="imp-done-sub">Data terstruktur masuk repository; PDF asli terlampir di dokumen.</div>
          <div className="imp-done-actions">
            <button className="btn btn-primary" onClick={goRepository}>Lihat di Repository</button>
            <button className="btn" onClick={reset}>Impor dokumen lain</button>
          </div>
        </div>
      </div>
    )
  }

  // review / saving
  return (
    <div className="imp-review">
      <div className="imp-review-hd">
        <div>
          <div className="imp-review-title">Review hasil ekstraksi</div>
          <div className="imp-review-sub">{file?.name} — koreksi yang salah, lalu simpan.</div>
        </div>
        <div className="imp-review-actions">
          <button className="btn" onClick={reset} disabled={phase === 'saving'}>Buang</button>
          <button className="btn btn-primary" onClick={save} disabled={phase === 'saving'}>
            {phase === 'saving' ? 'Menyimpan…' : 'Simpan ke Repository'}
          </button>
        </div>
      </div>
      {err ? <div className="ai-err" style={{ margin: '0 22px 10px' }}>{err}</div> : null}

      <div className="imp-split">
        <div className="imp-pdf">
          <iframe title="PDF" src={pdfUrl} />
        </div>

        <div className="imp-form">
          {draft.notes ? (
            <div className="imp-note">
              <b>Catatan AI:</b> {draft.notes}
            </div>
          ) : null}

          <div className="imp-sec">Info dokumen</div>
          <div className="imp-grid">
            <label className="imp-field">
              <span>Tipe</span>
              <select value={draft.type} onChange={(e) => set({ type: e.target.value })}>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <Field label="No. dokumen" value={draft.docNo} onChange={(v) => set({ docNo: v })} placeholder="ITM/SOP/…/…" />
            <Field label="Judul" value={draft.title} onChange={(v) => set({ title: v })} wide />
            <Field label="Revisi" value={draft.revision} onChange={(v) => set({ revision: v })} />
            <Field label="Tanggal efektif" value={draft.effectiveDate} onChange={(v) => set({ effectiveDate: v })} />
            <Field label="Pemilik proses" value={draft.owner} onChange={(v) => set({ owner: v })} wide />
            <Field label="Prepared by" value={draft.approvals.preparedBy} onChange={(v) => setApproval('preparedBy', v)} />
            <Field label="Reviewed by" value={draft.approvals.reviewedBy} onChange={(v) => setApproval('reviewedBy', v)} />
            <Field label="Approved by" value={draft.approvals.approvedBy} onChange={(v) => setApproval('approvedBy', v)} />
          </div>

          <div className="imp-sec">Tujuan &amp; ruang lingkup</div>
          <div className="imp-grid">
            <Area label="Tujuan" value={draft.purpose} onChange={(v) => set({ purpose: v })} />
            <Area label="Ruang lingkup" value={draft.scope} onChange={(v) => set({ scope: v })} />
          </div>

          <div className="imp-sec">Aktor / PIC</div>
          <div className="imp-grid">
            <Area
              label="Satu aktor per baris"
              rows={Math.min(6, Math.max(3, draft.actors.length))}
              value={draft.actors.join('\n')}
              onChange={(v) => set({ actors: v.split('\n').map((x) => x.trim()).filter(Boolean) })}
            />
          </div>

          <div className="imp-sec">
            Langkah prosedur ({draft.steps.length})
            <button className="btn btn-sm" onClick={addStep}>+ Langkah</button>
          </div>
          <table className="imp-table">
            <colgroup>
              <col style={{ width: 34 }} />
              <col />
              <col style={{ width: '18%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: 30 }} />
            </colgroup>
            <thead>
              <tr><th>No</th><th>Aktivitas</th><th>PIC</th><th>Input</th><th>Output</th><th /></tr>
            </thead>
            <tbody>
              {draft.steps.map((s, i) => (
                <tr key={i}>
                  <td><input value={s.no} onChange={(e) => setStep(i, 'no', e.target.value)} /></td>
                  <td><input value={s.activity} onChange={(e) => setStep(i, 'activity', e.target.value)} /></td>
                  <td><input value={s.pic} onChange={(e) => setStep(i, 'pic', e.target.value)} /></td>
                  <td><input value={s.input} onChange={(e) => setStep(i, 'input', e.target.value)} /></td>
                  <td><input value={s.output} onChange={(e) => setStep(i, 'output', e.target.value)} /></td>
                  <td><button className="imp-x" onClick={() => delStep(i)} title="Hapus">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="imp-sec">
            RASCI ({draft.rasci.length}) <span className="imp-hint">isi role dipisah koma</span>
            <button className="btn btn-sm" onClick={addRasci}>+ Baris</button>
          </div>
          <table className="imp-table">
            <colgroup>
              <col />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: 30 }} />
            </colgroup>
            <thead>
              <tr><th>Aktivitas</th><th>R</th><th>A</th><th>S</th><th>C</th><th>I</th><th /></tr>
            </thead>
            <tbody>
              {draft.rasci.map((r, i) => (
                <tr key={i}>
                  <td><input value={r.activity} onChange={(e) => setRasci(i, 'activity', e.target.value)} /></td>
                  {['R', 'A', 'S', 'C', 'I'].map((k) => (
                    <td key={k}><input value={r[k].join(', ')} onChange={(e) => setRasci(i, k, e.target.value)} /></td>
                  ))}
                  <td><button className="imp-x" onClick={() => delRasci(i)} title="Hapus">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="imp-sec">PPI / KPI</div>
          <div className="imp-grid">
            <Area
              label="Satu indikator per baris"
              rows={Math.min(6, Math.max(2, draft.ppi.length))}
              value={draft.ppi.join('\n')}
              onChange={(v) => set({ ppi: v.split('\n').map((x) => x.trim()).filter(Boolean) })}
            />
          </div>
          <div style={{ height: 30 }} />
        </div>
      </div>
    </div>
  )
}
