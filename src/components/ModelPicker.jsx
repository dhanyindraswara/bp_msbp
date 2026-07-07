// Model picker — fetches the FULL model catalogue live from OpenRouter and lets
// the user search, filter to free models, and pick one. `kind="extract"` limits
// the list to models that can read a PDF/image. Falls back to a small curated
// list if the catalogue can't be fetched.
import { useState, useEffect, useRef, useMemo } from 'react'
import { fetchModels, isFreeModel } from '../lib/openrouter.js'
import { AI_MODELS, EXTRACT_MODELS } from '../lib/ai.js'

const fallbackFor = (kind) =>
  (kind === 'extract' ? EXTRACT_MODELS : AI_MODELS).map((m) => ({
    id: m.id,
    name: m.label || m.id,
    pricing: m.id.endsWith(':free') ? { prompt: '0', completion: '0' } : {},
    input_modalities: ['text', 'image', 'file'],
    context_length: 0,
  }))

const fmtCtx = (n) => (n >= 1000 ? Math.round(n / 1000) + 'K' : n || '')

export default function ModelPicker({ kind = 'chat', value, onChange }) {
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [freeOnly, setFreeOnly] = useState(true)
  const [q, setQ] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchModels()
      .then((list) => alive && (setModels(list), setErr(''), setLoading(false)))
      .catch((e) => alive && (setModels(fallbackFor(kind)), setErr(e.message || 'Gagal memuat'), setLoading(false)))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const list = useMemo(() => {
    // PDF reading uses OpenRouter's 'pdf-text' engine (text extracted server-side),
    // so any model works for extraction — no vision-only filter needed.
    let l = models
    if (freeOnly) l = l.filter(isFreeModel)
    if (q.trim()) {
      const s = q.toLowerCase()
      l = l.filter((m) => (m.name + ' ' + m.id).toLowerCase().includes(s))
    }
    return [...l].sort((a, b) => Number(isFreeModel(b)) - Number(isFreeModel(a)) || a.name.localeCompare(b.name))
  }, [models, freeOnly, q])

  const current = models.find((m) => m.id === value)
  const label = current ? current.name : value || 'pilih model…'
  const freeCount = useMemo(() => models.filter(isFreeModel).length, [models])

  return (
    <div className="mp" ref={ref}>
      <button className="mp-btn" onClick={() => setOpen((o) => !o)} title="Pilih model AI">
        <span className="mp-btn-lb">Model</span>
        <span className="mp-btn-val">{label}</span>
        <span className="mp-caret">▾</span>
      </button>
      {open ? (
        <div className="mp-panel">
          <input className="mp-search" placeholder="Cari model… (mis. gemini, llama, deepseek)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className="mp-bar">
            <label className="mp-free">
              <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} /> Gratis saja
            </label>
            <span className="mp-count">
              {loading ? 'memuat…' : `${list.length} model${freeOnly ? ` · ${freeCount} gratis` : ''}`}
            </span>
          </div>
          {err ? <div className="mp-note mp-err">{err} (pakai daftar cadangan)</div> : null}
          <div className="mp-list">
            {list.map((m) => (
              <button key={m.id} className={'mp-item' + (m.id === value ? ' on' : '')} onClick={() => { onChange(m.id); setOpen(false) }}>
                <span className="mp-item-name">{m.name}</span>
                <span className="mp-item-meta">
                  {m.context_length ? <span className="mp-ctx">{fmtCtx(m.context_length)}</span> : null}
                  <span className={'mp-tag' + (isFreeModel(m) ? ' free' : '')}>{isFreeModel(m) ? 'FREE' : 'paid'}</span>
                </span>
              </button>
            ))}
            {!loading && !list.length ? <div className="mp-note">Tidak ada model cocok.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
