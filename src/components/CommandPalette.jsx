// STONES — command palette (Ctrl/⌘+K). One box to jump anywhere: menus,
// documents by name/ID/type, or hand the query off to Global Search for a
// deep full-text pass. Keyboard-first: ↑↓ to move, Enter to go, Esc to close.
import { useState, useMemo, useEffect, useRef } from 'react'
import { listDocs, STATUS } from '../lib/store.js'

const TYPE_LABEL = { FLOW: 'Flow', TAXONOMY: 'Taxonomy', HLP: 'HLP', TAXDESC: 'Tax Desc', SOP: 'SOP', KNOWLEDGE: 'Knowledge' }

const Ico = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export default function CommandPalette({ open, onClose, menus, onNav, onOpenDoc, onDeepSearch }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  // Build the flat, ranked result list: menus first, then documents.
  const rows = useMemo(() => {
    if (!open) return []
    const ql = q.trim().toLowerCase()
    const out = []
    menus
      .filter((m) => !ql || m.label.toLowerCase().includes(ql) || (m.group || '').toLowerCase().includes(ql))
      .slice(0, ql ? 6 : 12)
      .forEach((m) => out.push({ kind: 'menu', id: m.id, label: m.label, sub: m.group || 'Menu', d: m.d }))
    if (ql) {
      listDocs()
        .filter((doc) => doc.docType !== 'KNOWLEDGE')
        .filter((doc) => (doc.name || '').toLowerCase().includes(ql) || (doc.id || '').toLowerCase().includes(ql))
        .slice(0, 8)
        .forEach((doc) =>
          out.push({
            kind: 'doc',
            id: doc.id,
            label: doc.name || doc.id,
            sub: doc.id + ' · ' + (TYPE_LABEL[doc.docType] || 'BP') + ' · ' + (STATUS[doc.status] || 'Draft'),
            d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
          })
        )
      out.push({ kind: 'deep', id: '__deep', label: `Cari "${q.trim()}" di semua isi dokumen`, sub: 'Global Search — full text', d: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5' })
    }
    return out
  }, [open, q, menus])

  useEffect(() => setSel(0), [q])
  useEffect(() => {
    const el = listRef.current?.children[sel]
    el?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null

  const go = (row) => {
    if (!row) return
    if (row.kind === 'menu') onNav(row.id)
    else if (row.kind === 'doc') onOpenDoc(row.id)
    else onDeepSearch(q.trim())
    onClose()
  }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, rows.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); go(rows[sel]) }
    else if (e.key === 'Escape') onClose()
  }

  return (
    <div className="cp-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cp" role="dialog" aria-label="Command palette">
        <div className="cp-inputrow">
          <svg className="cp-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Cari dokumen, proses, atau menu…"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="cp-list" ref={listRef}>
          {rows.map((r, i) => (
            <button
              key={r.kind + r.id}
              className={'cp-row' + (i === sel ? ' on' : '')}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(r)}
            >
              <span className="cp-row-ic"><Ico d={r.d} /></span>
              <span className="cp-row-main">
                <span className="cp-row-label">{r.label}</span>
                <span className="cp-row-sub">{r.sub}</span>
              </span>
              {i === sel ? <kbd>↵</kbd> : null}
            </button>
          ))}
          {rows.length === 0 ? <div className="cp-empty">Ketik untuk mencari…</div> : null}
        </div>
        <div className="cp-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigasi</span>
          <span><kbd>↵</kbd> buka</span>
          <span><kbd>Esc</kbd> tutup</span>
        </div>
      </div>
    </div>
  )
}
