// Searchable select (combobox) — replaces native <select> wherever the option
// list is long: click opens a popover with a filter box; type to narrow, ↑↓ to
// move, Enter to pick, Esc to close. Options: [{ value, label, sub? }].
import { useEffect, useMemo, useRef, useState } from 'react'

export default function SearchSelect({ value, options, onChange, placeholder = 'Select…', emptyLabel, compact, disabled }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const current = options.find((o) => o.value === value)
  const shown = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const base = emptyLabel ? [{ value: '', label: emptyLabel, isEmpty: true }, ...options] : options
    if (!ql) return base
    return base.filter((o) => (o.label + ' ' + (o.sub || '')).toLowerCase().includes(ql))
  }, [q, options, emptyLabel])

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(Math.max(0, shown.findIndex((o) => o.value === value)))
      setTimeout(() => inputRef.current?.focus(), 10)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  useEffect(() => setSel(0), [q])
  useEffect(() => {
    listRef.current?.children[sel]?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  const pick = (o) => {
    if (!o) return
    onChange(o.isEmpty ? '' : o.value)
    setOpen(false)
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, shown.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(shown[sel]) }
    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) }
  }

  return (
    <div className={'ss' + (compact ? ' ss-compact' : '') + (disabled ? ' ss-off' : '')}>
      <button
        type="button"
        className={'ss-btn' + (current ? '' : ' ss-empty')}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        title={current ? current.label : placeholder}
      >
        <span className="ss-val">{current ? current.label : placeholder}</span>
        <span className="ss-caret">▾</span>
      </button>
      {open ? (
        <>
          <div className="more-backdrop" onClick={() => setOpen(false)} />
          <div className="ss-pop">
            <div className="ss-searchrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5" />
              </svg>
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search…" />
            </div>
            <div className="ss-list" ref={listRef}>
              {shown.map((o, i) => (
                <button
                  key={(o.isEmpty ? '∅' : o.value) + i}
                  type="button"
                  className={'ss-item' + (i === sel ? ' on' : '') + (o.value === value && !o.isEmpty ? ' picked' : '')}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => pick(o)}
                >
                  <span className="ss-item-main">
                    <span className="ss-item-label">{o.label}</span>
                    {o.sub ? <span className="ss-item-sub">{o.sub}</span> : null}
                  </span>
                  {o.value === value && !o.isEmpty ? <span className="ss-check">✓</span> : null}
                </button>
              ))}
              {shown.length === 0 ? <div className="ss-none">No matches.</div> : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
