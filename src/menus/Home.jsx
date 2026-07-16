// LEAP-STONES › Home — the daily starting point. Answers "what needs my
// attention, what was I working on, and where do I go next" at a glance:
// review queue, recent documents, quick actions, and an architecture overview
// per entity. Absorbs the old Dashboard's counters.
import { useMemo } from 'react'
import { listDocs, createDoc, STATUS, getCurrentUser } from '../lib/store.js'
import { blankProject } from '../lib/sample.js'
import { listEntities, listNodeDocs, entityCodeOf } from '../lib/bpTree.js'

const StatusBadge = ({ status }) => <span className={'stbadge stbadge-' + status}>{STATUS[status] || 'Draft'}</span>
const TYPE_LABEL = { FLOW: 'Flow', TAXONOMY: 'Taxonomy', HLP: 'HLP', TAXDESC: 'Tax Desc', SOP: 'SOP' }

const fmtAgo = (ts) => {
  if (!ts) return ''
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000))
  if (m < 60) return m + 'm ago'
  const h = Math.round(m / 60)
  if (h < 24) return h + 'h ago'
  const d = Math.round(h / 24)
  return d + 'd ago'
}

const QIcon = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export default function Home({ rev, entity, goTo, openDoc, openProcess }) {
  const docs = useMemo(() => listDocs().filter((d) => d.docType !== 'KNOWLEDGE' && d.docType !== 'BPNODE'), [rev])
  const nodeDocs = useMemo(() => listNodeDocs(), [rev])
  const entities = useMemo(() => listEntities(), [rev])
  const byId = useMemo(() => {
    const m = {}
    nodeDocs.forEach((d) => (m[d.id] = d))
    return m
  }, [nodeDocs])

  const inReview = docs.filter((d) => d.status === 'in_review')
  const drafts = docs.filter((d) => d.status === 'draft')
  const recent = docs.slice(0, 6)
  const user = getCurrentUser()
  const firstName = (user || 'there').split(/[\s@.]/)[0]
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Good morning' : hour < 15 ? 'Good afternoon' : 'Good evening'

  // Architecture overview per entity: processes, leaves, linked documents.
  const entStats = entities.map((e) => {
    const code = e.node.entity || e.node.code
    const members = nodeDocs.filter((d) => entityCodeOf(d, byId) === code)
    const leaves = members.filter((d) => (d.node?.level ?? 0) >= 3)
    const linkedDocs = new Set()
    members.forEach((d) => (d.node?.docs || []).forEach((x) => linkedDocs.add(x)))
    return { id: e.id, code, name: e.node.title || code, holding: !!e.node.isHolding, processes: members.length - 1, leaves: leaves.length, docs: linkedDocs.size }
  })
  const shown = entity ? entStats.filter((s) => s.code === entity) : entStats

  const QUICK = [
    { label: 'New Business Process', sub: 'SIPOC → map + RASCI', d: 'M12 20h9M4 20l1-4l9.5-9.5a2.1 2.1 0 0 1 3 3L8 19l-4 1', act: () => { const d = createDoc(blankProject()); openDoc(d.id) } },
    { label: 'Import a document', sub: 'PDF → structured SOP', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12', act: () => goTo('import') },
    { label: 'Explore processes', sub: 'ITM Group architecture', d: 'M12 3v6M12 15v6M5 9h14a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2zM8 3h8M8 21h8', act: () => goTo('architecture') },
    { label: 'Ask AI', sub: 'Answers from your BPs', d: 'M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2zM9 10h.01M13 10h.01M17 10h.01', act: () => goTo('ai') },
  ]

  return (
    <div className="stones-page">
      <div className="stones-page-hd">
        <h1>{greet}, {firstName}</h1>
        <p>
          {entity ? `Working in ${entity}. ` : entities.length ? `${entities.length} entities in the group. ` : ''}
          {inReview.length ? `${inReview.length} document${inReview.length === 1 ? '' : 's'} waiting for review.` : 'Nothing is waiting for your review.'}
        </p>
      </div>

      {/* quick actions */}
      <div className="hm-quick">
        {QUICK.map((qa) => (
          <button key={qa.label} className="hm-qa" onClick={qa.act}>
            <span className="hm-qa-ic"><QIcon d={qa.d} /></span>
            <span className="hm-qa-main">
              <b>{qa.label}</b>
              <small>{qa.sub}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="hm-grid">
        {/* needs attention */}
        <div className="panel hm-panel">
          <div className="hm-panel-hd">
            <span>Needs attention</span>
            <button className="hm-link" onClick={() => goTo('request')}>Action requests →</button>
          </div>
          {inReview.length === 0 ? (
            <div className="hm-empty">No documents in review. Drafts in progress: {drafts.length}.</div>
          ) : (
            inReview.slice(0, 5).map((d) => (
              <button key={d.id} className="hm-row" onClick={() => openDoc(d.id)}>
                <span className="chip chip-id">{d.id}</span>
                <span className="hm-row-name">{d.name}</span>
                <StatusBadge status={d.status} />
              </button>
            ))
          )}
        </div>

        {/* recent documents */}
        <div className="panel hm-panel">
          <div className="hm-panel-hd">
            <span>Recent documents</span>
            <button className="hm-link" onClick={() => goTo('repository')}>Repository →</button>
          </div>
          {recent.length === 0 ? (
            <div className="hm-empty">No documents yet — create or import one to get started.</div>
          ) : (
            recent.map((d) => (
              <button key={d.id} className="hm-row" onClick={() => openDoc(d.id)}>
                <span className="chip chip-id">{d.id}</span>
                <span className="hm-row-name">
                  {d.name}
                  {d.docType && d.docType !== 'BP' ? <span className="chip chip-type">{TYPE_LABEL[d.docType] || d.docType}</span> : null}
                </span>
                <span className="hm-row-ago">{fmtAgo(d.updatedAt)}</span>
                <StatusBadge status={d.status} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* architecture at a glance */}
      <div className="panel hm-panel hm-arch">
        <div className="hm-panel-hd">
          <span>Process architecture at a glance</span>
          <button className="hm-link" onClick={() => goTo('architecture')}>Open Process Explorer →</button>
        </div>
        {shown.length === 0 ? (
          <div className="hm-empty">
            No process architecture yet. Open the Process Explorer to add your first entity (LVL 0) or create the sample
            ITM structure.
          </div>
        ) : (
          <div className="hm-ents">
            {shown.map((s) => (
              <button key={s.id} className="hm-ent" onClick={() => openProcess(s.id)}>
                <div className="hm-ent-hd">
                  <span className="hm-ent-code">{s.code}</span>
                  {s.holding ? <span className="bpa-hold">Holding</span> : null}
                </div>
                <div className="hm-ent-name">{s.name}</div>
                <div className="hm-ent-stats">
                  <span><b>{Math.max(0, s.processes)}</b> processes</span>
                  <span><b>{s.leaves}</b> LVL 3</span>
                  <span><b>{s.docs}</b> linked docs</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* portfolio counters (old Dashboard) */}
      <div className="cards" style={{ marginTop: 18 }}>
        <div className="card stat-card"><div className="stat-label">Documents</div><div className="stat-value">{docs.length}</div></div>
        <div className="card stat-card"><div className="stat-label">In review</div><div className="stat-value">{inReview.length}</div></div>
        <div className="card stat-card"><div className="stat-label">Published</div><div className="stat-value">{docs.filter((d) => d.status === 'published').length}</div></div>
        <div className="card stat-card"><div className="stat-label">Process nodes</div><div className="stat-value">{nodeDocs.length}</div></div>
      </div>
    </div>
  )
}
