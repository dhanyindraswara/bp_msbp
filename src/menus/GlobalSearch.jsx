// LEAP-STONES › Global Search — search across every document: name, ID, SIPOC rows,
// actors, flows, PPI, template header, and comments. Results open the document.
import { useState, useMemo } from 'react'
import { listDocs, STATUS } from '../lib/store.js'
import { listNodeDocs, entityCodeOf } from '../lib/bpTree.js'

const StatusBadge = ({ status }) => <span className={'stbadge stbadge-' + status}>{STATUS[status] || 'Draft'}</span>

// Gather every searchable field of a document, tagged by category.
function collectFields(d) {
  const out = []
  const push = (cat, text) => {
    const t = (text == null ? '' : '' + text).trim()
    if (t) out.push({ cat, text: t })
  }
  const p = d.project || {}
  const h = p.header || {}
  const t = p.template || {}
  push('Owner', h.processOwner)
  push('Level', t.level)
  push('Title', t.title)
  push('BP No', t.bpNo)
  push('Prepared', t.preparedBy)
  push('Reviewed', t.reviewedBy)
  push('Approved', t.approvedBy)
  ;(p.sipoc || []).forEach((r) => {
    push('Supplier', r.supplier)
    push('Input', r.input)
    push('Process', r.process)
    push('Output', r.output)
    push('Customer', r.customer)
  })
  ;(p.ppi || []).forEach((r) => {
    push('PPI', r.process)
    push('PPI', r.indicator)
  })
  ;(p.flows || []).forEach((f) => push('Flow', f.text))
  ;(d.comments || []).forEach((c) => push('Comment', c.body))
  return out
}

// A ~120-char window around the first match, with the query highlighted.
function Snippet({ text, q }) {
  const tl = text.toLowerCase()
  const ql = q.toLowerCase()
  let i = tl.indexOf(ql)
  if (i < 0) return <>{text.slice(0, 120)}</>
  const start = Math.max(0, i - 40)
  const end = Math.min(text.length, i + q.length + 60)
  const slice = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
  const sl = slice.toLowerCase()
  const parts = []
  let idx = 0
  let pos = sl.indexOf(ql)
  let k = 0
  while (pos >= 0) {
    if (pos > idx) parts.push(slice.slice(idx, pos))
    parts.push(<mark key={k++}>{slice.slice(pos, pos + q.length)}</mark>)
    idx = pos + q.length
    pos = sl.indexOf(ql, idx)
  }
  parts.push(slice.slice(idx))
  return <>{parts}</>
}

export default function GlobalSearch({ openDoc, openProcess, rev, initialQuery }) {
  const [q, setQ] = useState(initialQuery || '')
  const docs = useMemo(() => listDocs().filter((d) => d.docType !== 'KNOWLEDGE' && d.docType !== 'BPNODE'), [rev])
  const nodeDocs = useMemo(() => listNodeDocs(), [rev])
  const nodeById = useMemo(() => {
    const m = {}
    nodeDocs.forEach((d) => (m[d.id] = d))
    return m
  }, [nodeDocs])
  const query = q.trim()

  // Business-process (architecture) matches: code, title, SIPOC parties/activities,
  // risks, KPIs — each hit tagged so the user sees WHY it matched.
  const procResults = useMemo(() => {
    if (query.length < 2) return []
    const ql = query.toLowerCase()
    const has = (t) => (t || '').toLowerCase().includes(ql)
    return nodeDocs
      .map((d) => {
        const n = d.node || {}
        const hits = []
        if (has(n.code) || has(n.title)) hits.push({ cat: 'Process', text: [n.code, n.title].filter(Boolean).join(' ') })
        ;(n.sipoc || []).forEach((r) => {
          if (has(r.supplier?.label)) hits.push({ cat: 'Supplier', text: r.supplier.label })
          if (has(r.input)) hits.push({ cat: 'Input', text: r.input })
          if (has(r.process)) hits.push({ cat: 'Activity', text: r.process })
          if (has(r.output)) hits.push({ cat: 'Output', text: r.output })
          if (has(r.customer?.label)) hits.push({ cat: 'Customer', text: r.customer.label })
        })
        ;(n.risks || []).forEach((r) => has(r.description) && hits.push({ cat: 'Risk', text: r.description }))
        ;(n.kpis || []).forEach((k) => has(k.indicator) && hits.push({ cat: 'KPI', text: k.indicator }))
        return { d, n, hits }
      })
      .filter((r) => r.hits.length)
      .slice(0, 8)
  }, [nodeDocs, query])

  const results = useMemo(() => {
    if (query.length < 2) return []
    const ql = query.toLowerCase()
    return docs
      .map((d) => {
        const hits = []
        const seen = new Set()
        // headline fields first
        if ((d.id || '').toLowerCase().includes(ql)) hits.push({ cat: 'ID', text: d.id })
        if ((d.name || '').toLowerCase().includes(ql)) hits.push({ cat: 'Name', text: d.name })
        collectFields(d).forEach((f) => {
          if (f.text.toLowerCase().includes(ql)) {
            const key = f.cat + '|' + f.text.toLowerCase()
            if (!seen.has(key)) {
              seen.add(key)
              hits.push(f)
            }
          }
        })
        return { d, hits }
      })
      .filter((r) => r.hits.length)
  }, [docs, query])

  return (
    <div className="stones-page">
      <div className="stones-page-hd">
        <h1>Global Search</h1>
        <p>Search across every Business Process — names, SIPOC content, actors, flows, PPI and comments.</p>
      </div>

      <div className="search-bar">
        <svg viewBox="0 0 24 24" className="search-ic" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents, processes, actors, comments…" />
        {q ? (
          <button className="search-clear" onClick={() => setQ('')} title="Clear">✕</button>
        ) : null}
      </div>

      {query.length >= 2 && procResults.length ? (
        <>
          <div className="search-count">{procResults.length} business process{procResults.length === 1 ? '' : 'es'} match “{query}”</div>
          <div className="search-list" style={{ marginBottom: 18 }}>
            {procResults.map(({ d, n, hits }) => (
              <button key={d.id} className="search-result" onClick={() => openProcess && openProcess(d.id)}>
                <div className="sr-top">
                  <span className={'bpa-lv bpa-lv-' + (n.level ?? 0)}>{(n.level ?? 0) === 0 ? n.entity || n.code : 'L' + n.level}</span>
                  <span className="sr-name"><Snippet text={[n.code, n.title].filter(Boolean).join(' ') || 'Process'} q={query} /></span>
                  <span className="sr-ver">{entityCodeOf(d, nodeById) || ''}</span>
                  <span className="chip">Process</span>
                </div>
                <div className="sr-snips">
                  {hits.slice(0, 3).map((m, i) => (
                    <div key={i} className="sr-snip">
                      <span className="sr-cat">{m.cat}</span>
                      <span><Snippet text={m.text} q={query} /></span>
                    </div>
                  ))}
                  {hits.length > 3 ? <div className="sr-more">+{hits.length - 3} more match{hits.length - 3 === 1 ? '' : 'es'}</div> : null}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {query.length < 2 ? (
        <div className="drawer-empty" style={{ padding: '18px 2px' }}>Type at least 2 characters to search {docs.length} document{docs.length === 1 ? '' : 's'} and {nodeDocs.length} process node{nodeDocs.length === 1 ? '' : 's'}.</div>
      ) : results.length ? (
        <>
          <div className="search-count">{results.length} document{results.length === 1 ? '' : 's'} match “{query}”</div>
          <div className="search-list">
            {results.map(({ d, hits }) => (
              <button key={d.id} className="search-result" onClick={() => openDoc(d.id)}>
                <div className="sr-top">
                  <span className="chip chip-id">{d.id}</span>
                  <span className="sr-name"><Snippet text={d.name} q={query} /></span>
                  <span className="sr-ver">v{d.version}</span>
                  <StatusBadge status={d.status} />
                </div>
                <div className="sr-snips">
                  {hits.slice(0, 4).map((m, i) => (
                    <div key={i} className="sr-snip">
                      <span className="sr-cat">{m.cat}</span>
                      <span><Snippet text={m.text} q={query} /></span>
                    </div>
                  ))}
                  {hits.length > 4 ? <div className="sr-more">+{hits.length - 4} more match{hits.length - 4 === 1 ? '' : 'es'}</div> : null}
                </div>
              </button>
            ))}
          </div>
        </>
      ) : procResults.length === 0 ? (
        <div className="empty-hero">
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2a43', marginBottom: 4 }}>No matches</div>
          <div style={{ color: '#8a94a0' }}>Nothing found for “{query}”. Try a different keyword.</div>
        </div>
      ) : null}
    </div>
  )
}
