// STONES › AI Knowledge Base — upload reference documents (PDF) or paste text
// that Ask AI will use as source material. PDFs are read by the already-deployed
// extractDoc function; the extracted text is shown for review/edit before it is
// saved. Each reference can be toggled on/off so the user controls what feeds AI.
import { useState, useMemo, useRef } from 'react'
import { listKnowledge, addKnowledge, updateKnowledge, deleteKnowledge, draftToKnowledgeText } from '../lib/knowledge.js'
import { extractFromPdf, extractEnabled } from '../lib/extract.js'

const fmtDate = (ts) => {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return ''
  }
}

export default function KnowledgeBase({ notify, rev }) {
  const items = useMemo(() => listKnowledge(), [rev])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [kind, setKind] = useState('text')
  const [editingId, setEditingId] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | extracting | saving
  const [err, setErr] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef(null)

  const resetForm = () => {
    setTitle('')
    setContent('')
    setKind('text')
    setEditingId(null)
    setFileName('')
    setErr('')
  }

  const onPickPdf = async (file) => {
    if (!file) return
    setErr('')
    setFileName(file.name)
    setPhase('extracting')
    try {
      const draft = await extractFromPdf(file)
      const text = draftToKnowledgeText(draft)
      setContent((c) => (c.trim() ? c + '\n\n' + text : text))
      if (!title.trim()) setTitle(draft.title || file.name.replace(/\.pdf$/i, ''))
      setKind('pdf')
      notify && notify('PDF diekstrak — review teksnya lalu simpan')
    } catch (e) {
      setErr(e && e.message ? e.message : 'Ekstraksi gagal')
    }
    setPhase('idle')
  }

  const save = () => {
    if (!content.trim()) {
      setErr('Isi teks referensi dulu (upload PDF atau ketik/paste).')
      return
    }
    setPhase('saving')
    setErr('')
    try {
      if (editingId) {
        updateKnowledge(editingId, { title: title.trim() || 'Referensi tanpa judul', content, kind })
        notify && notify('Referensi diperbarui')
      } else {
        addKnowledge({ title, content, kind })
        notify && notify('Referensi ditambahkan')
      }
      resetForm()
    } catch (e) {
      setErr(e && e.message ? e.message : 'Gagal menyimpan')
    }
    setPhase('idle')
  }

  const editItem = (d) => {
    setEditingId(d.id)
    setTitle(d.knowledge?.title || d.name || '')
    setContent(d.knowledge?.content || '')
    setKind(d.knowledge?.kind || 'text')
    setFileName('')
    setErr('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggle = (d) => updateKnowledge(d.id, { enabled: d.knowledge?.enabled === false })
  const remove = (d) => {
    if (window.confirm('Hapus referensi "' + (d.knowledge?.title || d.name) + '"?')) {
      if (editingId === d.id) resetForm()
      deleteKnowledge(d.id)
      notify && notify('Referensi dihapus')
    }
  }

  const activeCount = items.filter((d) => d.knowledge?.enabled !== false && (d.knowledge?.content || '').trim()).length

  return (
    <div className="stones-page kb-page">
      <div className="stones-page-hd">
        <h1>AI Knowledge Base</h1>
        <p>
          Upload dokumen referensi atau tempel teks — Ask AI akan memakainya sebagai sumber pengetahuan saat menjawab.
          {items.length ? ` ${activeCount} dari ${items.length} referensi aktif.` : ''}
        </p>
      </div>

      {/* ---- add / edit form ---- */}
      <div className="panel kb-form">
        <div className="kb-form-hd">{editingId ? 'Edit referensi' : 'Tambah referensi'}</div>
        <label className="imp-field imp-field-wide">
          <span>Judul referensi</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Kebijakan Pengadaan 2026 / SOP Bunkering" />
        </label>
        <label className="imp-field imp-field-wide">
          <span>Isi / teks referensi</span>
          <textarea
            rows={10}
            value={content}
            onChange={(e) => { setContent(e.target.value); if (kind === 'pdf') setKind('text') }}
            placeholder="Ketik atau paste teks referensi di sini, atau upload PDF untuk diekstrak otomatis…"
          />
        </label>
        <div className="kb-form-actions">
          {extractEnabled ? (
            <>
              <button className="btn" onClick={() => fileRef.current && fileRef.current.click()} disabled={phase !== 'idle'}>
                {phase === 'extracting' ? 'Mengekstrak PDF…' : '⇪ Upload PDF & ekstrak'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => { onPickPdf(e.target.files && e.target.files[0]); e.target.value = '' }}
              />
            </>
          ) : (
            <span className="kb-hint">Upload PDF butuh mode online (Firebase). Kamu tetap bisa paste teks manual.</span>
          )}
          {fileName ? <span className="kb-hint">📄 {fileName}</span> : null}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {editingId || content || title ? (
              <button className="btn" onClick={resetForm} disabled={phase === 'saving'}>Batal</button>
            ) : null}
            <button className="btn btn-primary" onClick={save} disabled={phase !== 'idle' || !content.trim()}>
              {editingId ? 'Simpan perubahan' : 'Tambah ke knowledge base'}
            </button>
          </div>
        </div>
        {err ? <div className="ai-err" style={{ marginTop: 10 }}>{err}</div> : null}
      </div>

      {/* ---- list ---- */}
      {items.length ? (
        <div className="kb-list">
          {items.map((d) => {
            const k = d.knowledge || {}
            const on = k.enabled !== false
            return (
              <div key={d.id} className={'kb-item' + (on ? '' : ' kb-item-off')}>
                <label className="kb-switch" title={on ? 'Aktif untuk AI — klik untuk nonaktifkan' : 'Nonaktif — klik untuk aktifkan'}>
                  <input type="checkbox" checked={on} onChange={() => toggle(d)} />
                  <span className="kb-switch-track"><span className="kb-switch-thumb" /></span>
                </label>
                <div className="kb-item-main" onClick={() => editItem(d)}>
                  <div className="kb-item-title">
                    {k.title || d.name}
                    <span className={'chip chip-type kb-kind kb-kind-' + (k.kind || 'text')}>{(k.kind || 'text').toUpperCase()}</span>
                  </div>
                  <div className="kb-item-meta">
                    {(k.chars || (k.content || '').length).toLocaleString()} karakter · {fmtDate(d.updatedAt)}
                  </div>
                  <div className="kb-item-snip">{(k.content || '').slice(0, 160).replace(/\s+/g, ' ')}</div>
                </div>
                <div className="kb-item-actions">
                  <button className="btn btn-sm" onClick={() => editItem(d)}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(d)}>Hapus</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-hero" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2a43', marginBottom: 4 }}>Belum ada referensi</div>
          <div style={{ color: '#8a94a0' }}>Tambahkan dokumen atau teks di atas agar Ask AI punya sumber pengetahuan.</div>
        </div>
      )}
    </div>
  )
}
