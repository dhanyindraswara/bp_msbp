// STONES › BP Architecture — maintain the Business Process hierarchy (LVL 0–3)
// and, on each LVL 3 leaf, its SIPOC (supplier→input→process→output→customer)
// plus standalone RISK and Performance-Indicator lists. Two panes: a tree
// navigator on the left, a node editor on the right. See docs/DATABASE_DESIGN.md.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MAX_LEVEL,
  LEVEL_NAMES,
  PARTY_TYPES,
  blankSipocRow,
  blankRisk,
  blankKpi,
  buildForest,
  listNodeDocs,
  processOptions,
  createNode,
  saveNode,
  deleteNodeCascade,
  seedSampleTree,
} from '../lib/bpTree.js'
import { getDoc } from '../lib/store.js'

const clone = (o) => JSON.parse(JSON.stringify(o))
const nodeLabel = (n) => [n?.code, n?.title].filter(Boolean).join(' ').trim() || 'Proses tanpa nama'

// ---- polymorphic Supplier/Customer field: { type, refId, label } ----
function PartyField({ value, options, onChange }) {
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
              {o.label}
            </option>
          ))}
        </select>
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
        style={{ paddingLeft: 10 + depth * 16 }}
        onClick={() => onSelect(node.id)}
      >
        <span className={'bpa-lv bpa-lv-' + n.level}>L{n.level}</span>
        <span className="bpa-node-main">
          <span className="bpa-node-code">{n.code || '—'}</span>
          <span className="bpa-node-title">{n.title || 'Proses tanpa nama'}</span>
        </span>
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

export default function BpArchitecture({ notify, rev }) {
  const docs = useMemo(() => listNodeDocs(), [rev])
  const forest = useMemo(() => buildForest(docs), [docs])
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(null) // working copy of the selected node's payload
  const [dirty, setDirty] = useState(false)
  const opts = useMemo(() => processOptions(selectedId), [rev, selectedId])
  const savedRef = useRef(null)

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
  const selectNode = (id) => {
    if (id === selectedId) return
    if (dirty && !window.confirm('Perubahan belum disimpan akan hilang. Lanjut?')) return
    setSelectedId(id)
  }
  const addNode = (level, parent) => {
    if (dirty && !window.confirm('Perubahan belum disimpan akan hilang. Lanjut?')) return
    const d = createNode(level, parent)
    setSelectedId(d.id)
    notify && notify(LEVEL_NAMES[level] + ' ditambahkan')
  }
  const removeNode = () => {
    if (!selectedId) return
    const label = nodeLabel(draft)
    const kids = docs.filter((x) => (x.node?.parent || null) === selectedId).length
    const msg = kids
      ? `Hapus "${label}" beserta ${kids} sub-proses di bawahnya? Tindakan ini permanen.`
      : `Hapus "${label}"?`
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

  const totalNodes = docs.length
  const leafCount = docs.filter((d) => (d.node?.level ?? 0) >= MAX_LEVEL).length

  return (
    <div className="stones-page bpa-page">
      <div className="stones-page-hd stones-page-hd-row">
        <div>
          <h1>BP Architecture</h1>
          <p>
            Kelola hierarki business process (LVL 0–3) dan isi SIPOC, risiko, serta indikator kinerja tiap proses
            LVL 3 — semuanya dari sini.
            {totalNodes ? ` ${totalNodes} node · ${leafCount} proses LVL 3.` : ''}
          </p>
        </div>
        <button className="btn" onClick={() => addNode(0, null)}>
          + BP LVL 0
        </button>
      </div>

      {totalNodes === 0 ? (
        <div className="empty-hero">
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2a43', marginBottom: 6 }}>Belum ada struktur</div>
          <div style={{ color: '#8a94a0', marginBottom: 16 }}>
            Mulai dari nol dengan menambah BP LVL 0, atau buat contoh struktur ITM (Marine &amp; Logistic) untuk gambaran.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={seed}>
              Buat struktur contoh (ITM)
            </button>
            <button className="btn" onClick={() => addNode(0, null)}>
              + Mulai dari BP LVL 0
            </button>
          </div>
        </div>
      ) : (
        <div className="bpa-layout">
          {/* ---- tree navigator ---- */}
          <div className="panel bpa-tree">
            <div className="bpa-tree-hd">
              <span>Hierarki</span>
              <button className="btn btn-sm" onClick={() => addNode(0, null)}>
                + LVL 0
              </button>
            </div>
            <div className="bpa-tree-body">
              {forest.map((root) => (
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
                    <span className="bpa-ed-name">{nodeLabel(draft)}</span>
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
                  {/* metadata */}
                  <div className="bpa-meta">
                    <label className="imp-field">
                      <span>Kode</span>
                      <input
                        value={draft.code}
                        onChange={(e) => patch({ code: e.target.value })}
                        placeholder="mis. C4.1.1"
                      />
                    </label>
                    <label className="imp-field bpa-meta-title">
                      <span>Nama proses</span>
                      <input
                        value={draft.title}
                        onChange={(e) => patch({ title: e.target.value })}
                        placeholder="mis. Barge & Shipment Planning"
                      />
                    </label>
                    <label className="imp-field">
                      <span>Entity</span>
                      <input
                        value={draft.entity}
                        onChange={(e) => patch({ entity: e.target.value })}
                        placeholder="mis. ITM"
                      />
                    </label>
                  </div>

                  {!isLeaf ? (
                    <div className="bpa-note">
                      SIPOC, risiko, dan indikator kinerja diisi di level proses paling bawah (LVL 3). Tambah sub-proses
                      lewat tombol <b>+</b> pada node ini di panel kiri.
                    </div>
                  ) : (
                    <>
                      {/* ---- SIPOC ---- */}
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
                                    <PartyField value={r.supplier} options={opts} onChange={(v) => updateRow(r.id, 'supplier', v)} />
                                  </div>
                                  <div className="bpa-cell">
                                    <label>Input</label>
                                    <input
                                      value={r.input}
                                      onChange={(e) => updateRow(r.id, 'input', e.target.value)}
                                      placeholder="mis. Rencana muat"
                                    />
                                  </div>
                                  <div className="bpa-cell">
                                    <label>Process</label>
                                    <input
                                      value={r.process}
                                      onChange={(e) => updateRow(r.id, 'process', e.target.value)}
                                      placeholder="Aktivitas"
                                    />
                                  </div>
                                  <div className="bpa-cell">
                                    <label>Output</label>
                                    <input
                                      value={r.output}
                                      onChange={(e) => updateRow(r.id, 'output', e.target.value)}
                                      placeholder="mis. Draft schedule"
                                    />
                                  </div>
                                  <div className="bpa-cell">
                                    <label>Customer</label>
                                    <PartyField value={r.customer} options={opts} onChange={(v) => updateRow(r.id, 'customer', v)} />
                                  </div>
                                </div>
                                <div className="bpa-row-actions">
                                  <button className="bpa-mini" title="Naik" onClick={() => moveRow(idx, -1)} disabled={idx === 0}>
                                    ↑
                                  </button>
                                  <button
                                    className="bpa-mini"
                                    title="Turun"
                                    onClick={() => moveRow(idx, 1)}
                                    disabled={idx === (draft.sipoc || []).length - 1}
                                  >
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

                      {/* ---- Risks ---- */}
                      <div className="bpa-sec">
                        <div className="bpa-sec-hd">
                          <span>Risk</span>
                          <button className="btn btn-sm" onClick={() => setRisks([...(draft.risks || []), blankRisk()])}>
                            + Risiko
                          </button>
                        </div>
                        {(draft.risks || []).length === 0 ? (
                          <div className="bpa-empty-row">Belum ada risiko.</div>
                        ) : (
                          <div className="bpa-list">
                            {(draft.risks || []).map((r) => (
                              <div key={r.id} className="bpa-list-row">
                                <input
                                  value={r.description}
                                  onChange={(e) =>
                                    setRisks((draft.risks || []).map((x) => (x.id === r.id ? { ...x, description: e.target.value } : x)))
                                  }
                                  placeholder="Deskripsi risiko…"
                                />
                                <button
                                  className="bpa-mini bpa-mini-danger"
                                  title="Hapus"
                                  onClick={() => setRisks((draft.risks || []).filter((x) => x.id !== r.id))}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ---- KPIs ---- */}
                      <div className="bpa-sec">
                        <div className="bpa-sec-hd">
                          <span>Performance Indicator</span>
                          <button className="btn btn-sm" onClick={() => setKpis([...(draft.kpis || []), blankKpi()])}>
                            + Indikator
                          </button>
                        </div>
                        {(draft.kpis || []).length === 0 ? (
                          <div className="bpa-empty-row">Belum ada indikator kinerja.</div>
                        ) : (
                          <div className="bpa-list">
                            {(draft.kpis || []).map((k) => (
                              <div key={k.id} className="bpa-list-row bpa-list-row-kpi">
                                <input
                                  value={k.indicator}
                                  onChange={(e) =>
                                    setKpis((draft.kpis || []).map((x) => (x.id === k.id ? { ...x, indicator: e.target.value } : x)))
                                  }
                                  placeholder="Indikator, mis. % on-time"
                                />
                                <input
                                  className="bpa-kpi-target"
                                  value={k.target}
                                  onChange={(e) =>
                                    setKpis((draft.kpis || []).map((x) => (x.id === k.id ? { ...x, target: e.target.value } : x)))
                                  }
                                  placeholder="Target, mis. ≥ 95%"
                                />
                                <button
                                  className="bpa-mini bpa-mini-danger"
                                  title="Hapus"
                                  onClick={() => setKpis((draft.kpis || []).filter((x) => x.id !== k.id))}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
