// LEAP-STONES › AI Knowledge Base — upload reference documents (PDF) or paste text
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
      notify && notify('PDF extracted — review the text, then save')
    } catch (e) {
      setErr(e && e.message ? e.message : 'Ekstraksi gagal')
    }
    setPhase('idle')
  }

  const save = () => {
    if (!content.trim()) {
      setErr('Add the reference text first (upload a PDF or type/paste it).')
      return
    }
    setPhase('saving')
    setErr('')
    try {
      if (editingId) {
        updateKnowledge(editingId, { title: title.trim() || 'Referensi tanpa judul', content, kind })
        notify && notify('Reference updated')
      } else {
        addKnowledge({ title, content, kind })
        notify && notify('Referensi ditambahkan')
      }
      resetForm()
    } catch (e) {
      setErr(e && e.message ? e.message : 'Saving failed')
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
    if (window.confirm('Delete reference "' + (d.knowledge?.title || d.name) + '"?')) {
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
          Upload reference documents or paste text — Ask AI uses them as its source of knowledge when answering.
          {items.length ? ` ${activeCount} of ${items.length} references active.` : ''}
        </p>
      </div>

      {/* ---- add / edit form ---- */}
      <div className="panel kb-form">
        <div className="kb-form-hd">{editingId ? 'Edit reference' : 'Add a reference'}</div>
        <label className="imp-field imp-field-wide">
          <span>Reference title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Procurement Policy 2026 / SOP Bunkering" />
        </label>
        <label className="imp-field imp-field-wide">
          <span>Reference text</span>
          <textarea
            rows={10}
            value={content}
            onChange={(e) => { setContent(e.target.value); if (kind === 'pdf') setKind('text') }}
            placeholder="Type or paste the reference text here, or upload a PDF to extract it automatically…"
          />
        </label>
        <div className="kb-form-actions">
          {extractEnabled ? (
            <>
              <button className="btn" onClick={() => fileRef.current && fileRef.current.click()} disabled={phase !== 'idle'}>
                {phase === 'extracting' ? 'Extracting PDF…' : '⇪ Upload PDF & extract'}
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
            <span className="kb-hint">PDF upload needs online mode (Firebase). You can still paste text manually.</span>
          )}
          {fileName ? <span className="kb-hint">📄 {fileName}</span> : null}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {editingId || content || title ? (
              <button className="btn" onClick={resetForm} disabled={phase === 'saving'}>Cancel</button>
            ) : null}
            <button className="btn btn-primary" onClick={save} disabled={phase !== 'idle' || !content.trim()}>
              {editingId ? 'Save changes' : 'Add to knowledge base'}
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
                <label className="kb-switch" title={on ? 'Active for AI — click to disable' : 'Disabled — click to enable'}>
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
                  <button className="btn btn-sm btn-danger" onClick={() => remove(d)}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-hero" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2a43', marginBottom: 4 }}>No references yet</div>
          <div style={{ color: '#8a94a0' }}>Add a document or text above so Ask AI has a source of knowledge.</div>
        </div>
      )}
    </div>
  )
}
