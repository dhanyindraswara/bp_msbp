// STONES › BP Architecture — maintain the multi-entity Business Process
// hierarchy (LVL 0 = a separate corporation → LVL 1 category → LVL 2 → LVL 3)
// and, on each LVL 3 leaf, its SIPOC (supplier→input→process→output→customer)
// plus standalone RISK and Performance-Indicator lists. Two panes: a tree
// navigator on the left (filterable by entity), a node editor on the right.
// Supplier/Customer of type PROCESS link to other nodes across entities.
// See docs/DATABASE_DESIGN.md.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MAX_LEVEL,
  LEVEL_NAMES,
  PARTY_TYPES,
  CATEGORIES,
  blankSipocRow,
  blankRisk,
  blankKpi,
  buildForest,
  listNodeDocs,
  listEntities,
  entityCodeOf,
  processOptions,
  suggestChildCode,
  inboundRefs,
  linkableDocs,
  resolveDocs,
  createNode,
  createEntity,
  saveNode,
  deleteNodeCascade,
  seedSampleTree,
} from '../lib/bpTree.js'
import { getDoc } from '../lib/store.js'

const clone = (o) => JSON.parse(JSON.stringify(o))
const nodeLabel = (n) => [n?.code, n?.title].filter(Boolean).join(' ').trim() || 'Proses tanpa nama'

// ---- polymorphic Supplier/Customer field: { type, refId, label } ----
function PartyField({ value, options, onChange, onNavigate }) {
  const v = value || { type: 'FREE', refId: null, label: '' }
  const setType = (type) => {
    if (type === 'PROCESS') onChange({ type, refId: null, label: '' })
    else onChange({ type, refId: null, label: v.label || '' })
  }
  return (
    <div className="bpa-party">
      <select className="bpa-party-type" value={v.type} onChange={(e) => setType(e.target.value)}>
        {PARTY_TYPES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      {v.type === 'PROCESS' ? (
        <div className="bpa-party-proc">
          <select
            className="bpa-party-val"
            value={v.refId || ''}
            onChange={(e) => {
              const opt = options.find((o) => o.id === e.target.value)
              onChange({ type: 'PROCESS', refId: opt ? opt.id : null, label: opt ? opt.label : '' })
            }}
          >
            <option value="">— pilih proses —</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {(o.entity ? o.entity + ' · ' : '') + o.label}
              </option>
            ))}
          </select>
          {v.refId ? (
            <button type="button" className="bpa-jump" title="Buka proses ini" onClick={() => onNavigate(v.refId)}>
              ↗
            </button>
          ) : null}
        </div>
      ) : (
        <input
          className="bpa-party-val"
          value={v.label}
          onChange={(e) => onChange({ type: v.type, refId: null, label: e.target.value })}
          placeholder={v.type === 'ORG' ? 'Nama unit organisasi…' : 'Ketik aktor / pihak…'}
        />
      )}
    </div>
  )
}

// ---- one recursive branch of the tree navigator ----
function TreeBranch({ node, depth, selectedId, onSelect, onAdd, dirtyId }) {
  const n = node.node
  const isLeaf = n.level >= MAX_LEVEL
  const sipocN = (n.sipoc || []).length
  return (
    <div className="bpa-branch">
      <div
        className={'bpa-node' + (selectedId === node.id ? ' active' : '')}
        style={{ paddingLeft: 10 + depth * 15 }}
        onClick={() => onSelect(node.id)}
      >
        <span className={'bpa-lv bpa-lv-' + n.level}>{n.level === 0 ? n.entity || n.code || 'ENT' : 'L' + n.level}</span>
        <span className="bpa-node-main">
          <span className="bpa-node-code">{n.level === 0 ? n.title || n.entity : n.code || '—'}</span>
          <span className="bpa-node-title">{n.level === 0 ? '' : n.title || 'Proses tanpa nama'}</span>
        </span>
        {n.level === 0 && n.isHolding ? <span className="bpa-hold">Holding</span> : null}
        {dirtyId === node.id ? <span className="bpa-dirty" title="Belum disimpan">●</span> : null}
        {isLeaf && sipocN ? <span className="bpa-node-chip">{sipocN} SIPOC</span> : null}
        {!isLeaf ? (
          <button
            className="bpa-node-add"
            title={'Tambah anak (' + LEVEL_NAMES[n.level + 1] + ')'}
            onClick={(e) => {
              e.stopPropagation()
              onAdd(n.level + 1, node.id)
            }}
          >
            +
          </button>
        ) : null}
      </div>
      {node.children.map((c) => (
        <TreeBranch
          key={c.id}
          node={c}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          onAdd={onAdd}
          dirtyId={dirtyId}
        />
      ))}
    </div>
  )
}

export default function BpArchitecture({ notify, rev, openDoc }) {
  const docs = useMemo(() => listNodeDocs(), [rev])
  const byId = useMemo(() => {
    const m = {}
    docs.forEach((d) => (m[d.id] = d))
    return m
  }, [docs])
  const forest = useMemo(() => buildForest(docs), [docs])
  const entities = useMemo(() => listEntities(), [rev])
  const [entityFilter, setEntityFilter] = useState(null) // null = all
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(null) // working copy of the selected node's payload
  const [dirty, setDirty] = useState(false)
  const [adding, setAdding] = useState(false) // add-entity form
  const [entForm, setEntForm] = useState({ code: '', name: '', holding: false })
  const opts = useMemo(() => processOptions(selectedId), [rev, selectedId])
  const savedRef = useRef(null)

  const visibleForest = useMemo(
    () => (entityFilter ? forest.filter((r) => (r.node.entity || r.node.code) === entityFilter) : forest),
    [forest, entityFilter],
  )

  // Keep a valid selection as the tree changes.
  useEffect(() => {
    if (selectedId && docs.some((d) => d.id === selectedId)) return
    setSelectedId(docs[0]?.id || null)
  }, [docs, selectedId])

  // Load the selected node into an editable draft.
  useEffect(() => {
    if (!selectedId) {
      setDraft(null)
      setDirty(false)
      return
    }
    const d = getDoc(selectedId)
    if (d && d.node) {
      setDraft(clone(d.node))
      setDirty(false)
      savedRef.current = selectedId
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const patch = (p) => {
    setDraft((d) => ({ ...d, ...p }))
    setDirty(true)
  }
  const save = () => {
    if (!selectedId || !draft) return
    saveNode(selectedId, draft)
    setDirty(false)
    notify && notify('Node disimpan')
  }
  const reset = () => {
    const d = getDoc(selectedId)
    if (d?.node) {
      setDraft(clone(d.node))
      setDirty(false)
    }
  }
  const confirmLeave = () => !dirty || window.confirm('Perubahan belum disimpan akan hilang. Lanjut?')
  const selectNode = (id) => {
    if (id === selectedId) return
    if (!confirmLeave()) return
    setSelectedId(id)
  }
  const addNode = (level, parent) => {
    if (!confirmLeave()) return
    const d = createNode(level, parent)
    setSelectedId(d.id)
    notify && notify(LEVEL_NAMES[level] + ' ditambahkan')
  }
  const submitEntity = () => {
    const code = entForm.code.trim()
    if (!code) return
    const d = createEntity(code, entForm.name, entForm.holding)
    setAdding(false)
    setEntForm({ code: '', name: '', holding: false })
    setEntityFilter(code)
    setSelectedId(d.id)
    notify && notify('Entity ' + code + ' dibuat')
  }
  const removeNode = () => {
    if (!selectedId) return
    const label = nodeLabel(draft)
    const kids = docs.filter((x) => (x.node?.parent || null) === selectedId).length
    const what = draft.level === 0 ? `entity "${draft.code || draft.entity}"` : `"${label}"`
    const msg = kids
      ? `Hapus ${what} beserta ${kids} turunan di bawahnya? Tindakan ini permanen.`
      : `Hapus ${what}?`
    if (!window.confirm(msg)) return
    deleteNodeCascade(selectedId)
    setSelectedId(null)
    notify && notify('Node dihapus')
  }
  const seed = () => {
    seedSampleTree()
    notify && notify('Struktur contoh dibuat')
  }

  // ---- SIPOC / risk / KPI mutators on the draft ----
  const isLeaf = draft && draft.level >= MAX_LEVEL
  const setSipoc = (rows) => patch({ sipoc: rows })
  const updateRow = (id, field, val) =>
    setSipoc((draft.sipoc || []).map((r) => (r.id === id ? { ...r, [field]: val } : r)))
  const moveRow = (idx, dir) => {
    const rows = [...(draft.sipoc || [])]
    const j = idx + dir
    if (j < 0 || j >= rows.length) return
    ;[rows[idx], rows[j]] = [rows[j], rows[idx]]
    setSipoc(rows)
  }
  const setRisks = (rows) => patch({ risks: rows })
  const setKpis = (rows) => patch({ kpis: rows })
  const setDocs = (ids) => patch({ docs: ids })

  // suggested code for the current (non-entity) node
  const applySuggestedCode = () => {
    const parentDoc = draft.parent ? byId[draft.parent] : null
    const siblings = docs.filter((d) => (d.node?.parent || null) === (draft.parent || null) && d.id !== selectedId)
    patch({ code: suggestChildCode(parentDoc?.node, draft.level, siblings.length, draft.category) })
  }

  const totalNodes = docs.length
  const leafCount = docs.filter((d) => (d.node?.level ?? 0) >= MAX_LEVEL).length
  const displayEntity = draft ? draft.entity || (byId[selectedId] ? entityCodeOf(byId[selectedId], byId) : '') : ''
  const inbound = useMemo(() => (selectedId ? inboundRefs(selectedId) : []), [selectedId, rev])

  return (
    <div className="stones-page bpa-page">
      <div className="stones-page-hd stones-page-hd-row">
        <div>
          <h1>BP Architecture</h1>
          <p>
            Kelola hierarki business process multi-entity (LVL 0 = perusahaan → LVL 1 kategori → LVL 2 → LVL 3) dan isi
            SIPOC, risiko, serta indikator kinerja tiap proses LVL 3.
            {totalNodes ? ` ${entities.length} entity · ${totalNodes} node · ${leafCount} proses LVL 3.` : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding((a) => !a)}>
          + Entity
        </button>
      </div>

      {/* add-entity inline form */}
      {adding ? (
        <div className="panel bpa-addent">
          <div className="bpa-addent-row">
            <label className="imp-field">
              <span>Kode entity</span>
              <input
                autoFocus
                value={entForm.code}
                onChange={(e) => setEntForm({ ...entForm, code: e.target.value.toUpperCase() })}
                placeholder="mis. TCM"
              />
            </label>
            <label className="imp-field" style={{ flex: 1 }}>
              <span>Nama perusahaan</span>
              <input
                value={entForm.name}
                onChange={(e) => setEntForm({ ...entForm, name: e.target.value })}
                placeholder="mis. Trubaindo Coal Mining"
              />
            </label>
            <label className="bpa-hold-check" title="Tandai sebagai perusahaan holding">
              <input
                type="checkbox"
                checked={entForm.holding}
                onChange={(e) => setEntForm({ ...entForm, holding: e.target.checked })}
              />
              Holding
            </label>
            <div className="bpa-addent-actions">
              <button className="btn btn-sm" onClick={() => setAdding(false)}>
                Batal
              </button>
              <button className="btn btn-sm btn-primary" onClick={submitEntity} disabled={!entForm.code.trim()}>
                Buat entity
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {totalNodes === 0 ? (
        <div className="empty-hero">
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2a43', marginBottom: 6 }}>Belum ada struktur</div>
          <div style={{ color: '#8a94a0', marginBottom: 16 }}>
            Tambah entity (perusahaan) sebagai LVL 0, atau buat contoh struktur ITM (holding) + TCM untuk gambaran.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={seed}>
              Buat struktur contoh
            </button>
            <button className="btn" onClick={() => setAdding(true)}>
              + Tambah entity
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* entity filter tabs */}
          {entities.length ? (
            <div className="bpa-tabs">
              <button className={'bpa-tab' + (entityFilter === null ? ' active' : '')} onClick={() => setEntityFilter(null)}>
                Semua
              </button>
              {entities.map((e) => {
                const code = e.node.entity || e.node.code
                return (
                  <button
                    key={e.id}
                    className={'bpa-tab' + (entityFilter === code ? ' active' : '')}
                    onClick={() => setEntityFilter(code)}
                  >
                    {code}
                    {e.node.isHolding ? <span className="bpa-tab-hold">H</span> : null}
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="bpa-layout">
            {/* ---- tree navigator ---- */}
            <div className="panel bpa-tree">
              <div className="bpa-tree-hd">
                <span>Hierarki</span>
                <button className="btn btn-sm" onClick={() => setAdding(true)}>
                  + Entity
                </button>
              </div>
              <div className="bpa-tree-body">
                {visibleForest.map((root) => (
                  <TreeBranch
                    key={root.id}
                    node={root}
                    depth={0}
                    selectedId={selectedId}
                    onSelect={selectNode}
                    onAdd={addNode}
                    dirtyId={dirty ? selectedId : null}
                  />
                ))}
              </div>
            </div>

            {/* ---- node editor ---- */}
            <div className="panel bpa-editor">
              {!draft ? (
                <div className="bpa-editor-empty">Pilih node di kiri untuk mengedit.</div>
              ) : (
                <>
                  <div className="bpa-ed-hd">
                    <div className="bpa-ed-hd-left">
                      <span className={'bpa-lv bpa-lv-' + draft.level}>{LEVEL_NAMES[draft.level]}</span>
                      {draft.level > 0 && displayEntity ? <span className="bpa-ent-chip">{displayEntity}</span> : null}
                      <span className="bpa-ed-name">{draft.level === 0 ? draft.title || draft.code || draft.entity : nodeLabel(draft)}</span>
                      {dirty ? <span className="bpa-dirty-tag">belum disimpan</span> : null}
                    </div>
                    <div className="bpa-ed-hd-actions">
                      <button className="btn btn-sm btn-danger" onClick={removeNode}>
                        Hapus
                      </button>
                      {dirty ? (
                        <button className="btn btn-sm" onClick={reset}>
                          Reset
                        </button>
                      ) : null}
                      <button className="btn btn-sm btn-primary" onClick={save} disabled={!dirty}>
                        Simpan
                      </button>
                    </div>
                  </div>

                  <div className="bpa-ed-body">
                    {/* metadata — entity (LVL0) vs process node */}
                    {draft.level === 0 ? (
                      <div className="bpa-meta">
                        <label className="imp-field">
                          <span>Kode entity</span>
                          <input
                            value={draft.code}
                            onChange={(e) => patch({ code: e.target.value.toUpperCase(), entity: e.target.value.toUpperCase() })}
                            placeholder="mis. ITM"
                          />
                        </label>
                        <label className="imp-field bpa-meta-title">
                          <span>Nama perusahaan</span>
                          <input
                            value={draft.title}
                            onChange={(e) => patch({ title: e.target.value })}
                            placeholder="mis. Indo Tambangraya Megah"
                          />
                        </label>
                        <label className="bpa-hold-check" style={{ alignSelf: 'end', paddingBottom: 8 }}>
                          <input type="checkbox" checked={!!draft.isHolding} onChange={(e) => patch({ isHolding: e.target.checked })} />
                          Holding
                        </label>
                      </div>
                    ) : (
                      <div className={'bpa-meta' + (draft.level === 1 ? ' bpa-meta-cat' : '')}>
                        <label className="imp-field">
                          <span>Kode</span>
                          <div className="bpa-code-wrap">
                            <input value={draft.code} onChange={(e) => patch({ code: e.target.value })} placeholder="mis. C4.1.1" />
                            <button type="button" className="bpa-suggest" title="Saran kode otomatis" onClick={applySuggestedCode}>
                              saran
                            </button>
                          </div>
                        </label>
                        <label className="imp-field bpa-meta-title">
                          <span>Nama proses</span>
                          <input
                            value={draft.title}
                            onChange={(e) => patch({ title: e.target.value })}
                            placeholder="mis. Barge & Shipment Planning"
                          />
                        </label>
                        {draft.level === 1 ? (
                          <label className="imp-field">
                            <span>Kategori</span>
                            <select value={draft.category || ''} onChange={(e) => patch({ category: e.target.value })}>
                              <option value="">—</option>
                              {CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </div>
                    )}

                    {draft.level === 0 ? (
                      <div className="bpa-note">
                        Ini <b>entity (perusahaan)</b> — LVL 0. Tambah kategori proses (Core / Enabler / Management) sebagai
                        LVL 1 lewat tombol <b>+</b> pada entity ini di panel kiri. Semua turunannya otomatis mewarisi entity{' '}
                        <b>{draft.code || draft.entity || '—'}</b>.
                      </div>
                    ) : !isLeaf ? (
                      <div className="bpa-note">
                        SIPOC, risiko, dan indikator kinerja diisi di level proses paling bawah (LVL 3). Tambah sub-proses
                        lewat tombol <b>+</b> pada node ini di panel kiri.
                      </div>
                    ) : (
                      <>
                        {renderSipoc()}
                        {renderList('Risk', draft.risks, blankRisk, setRisks, 'description', 'Deskripsi risiko…')}
                        {renderKpis()}
                      </>
                    )}

                    {/* linked repository documents — the connective tissue */}
                    {draft.level >= 1 ? renderDocs() : null}

                    {/* inbound connections — where this node is used as supplier/customer */}
                    {draft.level >= 2 && inbound.length ? (
                      <div className="bpa-sec">
                        <div className="bpa-sec-hd">
                          <span>Dipakai oleh (koneksi masuk)</span>
                        </div>
                        <div className="bpa-inbound">
                          {inbound.map((r, i) => (
                            <button key={i} className="bpa-inlink" onClick={() => selectNode(r.nodeId)}>
                              <span className={'bpa-inrole bpa-inrole-' + r.role}>{r.role === 'supplier' ? 'sbg supplier' : 'sbg customer'}</span>
                              {r.label} ↗
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )

  // ---- render helpers (closures over draft/opts) ----
  function renderSipoc() {
    return (
      <div className="bpa-sec">
        <div className="bpa-sec-hd">
          <span>SIPOC</span>
          <button className="btn btn-sm" onClick={() => setSipoc([...(draft.sipoc || []), blankSipocRow()])}>
            + Baris
          </button>
        </div>
        {(draft.sipoc || []).length === 0 ? (
          <div className="bpa-empty-row">Belum ada baris. Tambah baris supplier → input → proses → output → customer.</div>
        ) : (
          <div className="bpa-rows">
            {(draft.sipoc || []).map((r, idx) => (
              <div key={r.id} className="bpa-row">
                <div className="bpa-row-grid">
                  <div className="bpa-cell">
                    <label>Supplier</label>
                    <PartyField value={r.supplier} options={opts} onChange={(v) => updateRow(r.id, 'supplier', v)} onNavigate={selectNode} />
                  </div>
                  <div className="bpa-cell">
                    <label>Input</label>
                    <input value={r.input} onChange={(e) => updateRow(r.id, 'input', e.target.value)} placeholder="mis. Rencana muat" />
                  </div>
                  <div className="bpa-cell">
                    <label>Process</label>
                    <input value={r.process} onChange={(e) => updateRow(r.id, 'process', e.target.value)} placeholder="Aktivitas" />
                  </div>
                  <div className="bpa-cell">
                    <label>Output</label>
                    <input value={r.output} onChange={(e) => updateRow(r.id, 'output', e.target.value)} placeholder="mis. Draft schedule" />
                  </div>
                  <div className="bpa-cell">
                    <label>Customer</label>
                    <PartyField value={r.customer} options={opts} onChange={(v) => updateRow(r.id, 'customer', v)} onNavigate={selectNode} />
                  </div>
                </div>
                <div className="bpa-row-actions">
                  <button className="bpa-mini" title="Naik" onClick={() => moveRow(idx, -1)} disabled={idx === 0}>
                    ↑
                  </button>
                  <button className="bpa-mini" title="Turun" onClick={() => moveRow(idx, 1)} disabled={idx === (draft.sipoc || []).length - 1}>
                    ↓
                  </button>
                  <button
                    className="bpa-mini bpa-mini-danger"
                    title="Hapus baris"
                    onClick={() => setSipoc((draft.sipoc || []).filter((x) => x.id !== r.id))}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderList(title, items, factory, setter, field, placeholder) {
    return (
      <div className="bpa-sec">
        <div className="bpa-sec-hd">
          <span>{title}</span>
          <button className="btn btn-sm" onClick={() => setter([...(items || []), factory()])}>
            + {title === 'Risk' ? 'Risiko' : 'Item'}
          </button>
        </div>
        {(items || []).length === 0 ? (
          <div className="bpa-empty-row">Belum ada {title === 'Risk' ? 'risiko' : 'item'}.</div>
        ) : (
          <div className="bpa-list">
            {(items || []).map((r) => (
              <div key={r.id} className="bpa-list-row">
                <input
                  value={r[field]}
                  onChange={(e) => setter((items || []).map((x) => (x.id === r.id ? { ...x, [field]: e.target.value } : x)))}
                  placeholder={placeholder}
                />
                <button className="bpa-mini bpa-mini-danger" title="Hapus" onClick={() => setter((items || []).filter((x) => x.id !== r.id))}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderDocs() {
    const linked = resolveDocs(draft.docs)
    const linkedIds = new Set(draft.docs || [])
    const available = linkableDocs().filter((d) => !linkedIds.has(d.id))
    return (
      <div className="bpa-sec">
        <div className="bpa-sec-hd">
          <span>Dokumen terkait</span>
          <select
            className="bpa-doc-add"
            value=""
            onChange={(e) => {
              if (e.target.value) setDocs([...(draft.docs || []), e.target.value])
            }}
          >
            <option value="">+ Tautkan dokumen…</option>
            {available.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} · {d.name} ({d.docType})
              </option>
            ))}
          </select>
        </div>
        {linked.length === 0 ? (
          <div className="bpa-empty-row">Belum ada dokumen BP/SOP/Flow yang ditautkan ke proses ini.</div>
        ) : (
          <div className="bpa-doclist">
            {linked.map((d) => (
              <div key={d.id} className={'bpa-docchip' + (d.exists ? '' : ' bpa-docchip-gone')}>
                <span className="bpa-doc-type">{d.docType}</span>
                <button
                  className="bpa-doc-name"
                  title={d.exists ? 'Buka dokumen' : 'Dokumen sudah dihapus'}
                  disabled={!d.exists || !openDoc}
                  onClick={() => d.exists && openDoc && openDoc(d.id)}
                >
                  {d.name}
                  {d.exists ? ' ↗' : ' (dihapus)'}
                </button>
                <button
                  className="bpa-mini bpa-mini-danger"
                  title="Lepas tautan"
                  onClick={() => setDocs((draft.docs || []).filter((x) => x !== d.id))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderKpis() {
    const items = draft.kpis || []
    return (
      <div className="bpa-sec">
        <div className="bpa-sec-hd">
          <span>Performance Indicator</span>
          <button className="btn btn-sm" onClick={() => setKpis([...items, blankKpi()])}>
            + Indikator
          </button>
        </div>
        {items.length === 0 ? (
          <div className="bpa-empty-row">Belum ada indikator kinerja.</div>
        ) : (
          <div className="bpa-list">
            {items.map((k) => (
              <div key={k.id} className="bpa-list-row bpa-list-row-kpi">
                <input
                  value={k.indicator}
                  onChange={(e) => setKpis(items.map((x) => (x.id === k.id ? { ...x, indicator: e.target.value } : x)))}
                  placeholder="Indikator, mis. % on-time"
                />
                <input
                  className="bpa-kpi-target"
                  value={k.target}
                  onChange={(e) => setKpis(items.map((x) => (x.id === k.id ? { ...x, target: e.target.value } : x)))}
                  placeholder="Target, mis. ≥ 95%"
                />
                <button className="bpa-mini bpa-mini-danger" title="Hapus" onClick={() => setKpis(items.filter((x) => x.id !== k.id))}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
}
