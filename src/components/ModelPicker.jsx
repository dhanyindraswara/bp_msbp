// Model picker — fetches the model catalogue live from the ACTIVE provider and
// lets the user search and pick one. For providers that expose pricing
// (OpenRouter) a "free only" filter is shown. Falls back to a curated list if
// the catalogue can't be fetched. Pass `providerId` so it refetches on switch.
import { useState, useEffect, useRef, useMemo } from 'react'
import { fetchModels, isFreeModel, fallbackModels, getActiveProvider } from '../lib/providers.js'

const fmtCtx = (n) => (n >= 1000 ? Math.round(n / 1000) + 'K' : n || '')

export default function ModelPicker({ kind = 'chat', value, onChange, providerId }) {
  const prov = getActiveProvider()
  const hasPricing = !!prov.hasPricing
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [freeOnly, setFreeOnly] = useState(hasPricing)
  const [q, setQ] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setFreeOnly(hasPricing)
    fetchModels()
      .then((list) => alive && (setModels(list), setErr(''), setLoading(false)))
      .catch((e) => alive && (setModels(fallbackModels(kind)), setErr(e.message || 'Gagal memuat'), setLoading(false)))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId])

  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const list = useMemo(() => {
    let l = models
    if (hasPricing && freeOnly) l = l.filter(isFreeModel)
    if (q.trim()) {
      const s = q.toLowerCase()
      l = l.filter((m) => (m.name + ' ' + m.id).toLowerCase().includes(s))
    }
    return [...l].sort((a, b) => Number(isFreeModel(b)) - Number(isFreeModel(a)) || a.name.localeCompare(b.name))
  }, [models, freeOnly, q, hasPricing])

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
          <input className="mp-search" placeholder="Cari model…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className="mp-bar">
            {hasPricing ? (
              <label className="mp-free">
                <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} /> Gratis saja
              </label>
            ) : (
              <span className="mp-free">{prov.label}</span>
            )}
            <span className="mp-count">
              {loading ? 'memuat…' : `${list.length} model${hasPricing && freeOnly ? ` · ${freeCount} gratis` : ''}`}
            </span>
          </div>
          {err ? <div className="mp-note mp-err">{err} (pakai daftar cadangan)</div> : null}
          <div className="mp-list">
            {q.trim() && !models.some((m) => m.id === q.trim()) ? (
              <button className="mp-item mp-item-custom" onClick={() => { onChange(q.trim()); setOpen(false) }}>
                <span className="mp-item-name">Pakai model id: “{q.trim()}”</span>
                <span className="mp-tag">manual</span>
              </button>
            ) : null}
            {list.map((m) => (
              <button key={m.id} className={'mp-item' + (m.id === value ? ' on' : '')} onClick={() => { onChange(m.id); setOpen(false) }}>
                <span className="mp-item-name">{m.name}</span>
                <span className="mp-item-meta">
                  {m.context_length ? <span className="mp-ctx">{fmtCtx(m.context_length)}</span> : null}
                  {hasPricing ? <span className={'mp-tag' + (isFreeModel(m) ? ' free' : '')}>{isFreeModel(m) ? 'FREE' : 'paid'}</span> : null}
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
