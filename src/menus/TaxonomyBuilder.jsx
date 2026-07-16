// LEAP-STONES › Business Process Taxonomy — the user fills a simple form (two
// spanning band labels + columns, each with one L2 category and a stack of L3
// boxes) and the system draws the L0 → L3 taxonomy diagram. Saved to the
// repository as TAXONOMY-type documents and reopenable here for editing.
import { useState, useEffect, useMemo } from 'react'
import { blankTaxonomy, sampleTaxonomy, normTaxonomy, taxBox } from '../lib/taxonomy.js'
import { taxonomySourceOptions, genTaxonomyFromNode } from '../lib/genFromTree.js'
import { blankProject } from '../lib/sample.js'
import { createDoc, saveDoc, getDoc, listDocs } from '../lib/store.js'
import { uid } from '../lib/constants.js'
import TaxonomyChart from '../components/TaxonomyChart.jsx'
import FormSection from '../components/FormSection.jsx'
import SearchSelect from '../components/SearchSelect.jsx'

const Field = ({ label, value, onChange, placeholder }) => (
  <label className="imp-field imp-field-wide">
    <span>{label}</span>
    <input value={value || ''} placeholder={placeholder || ''} onChange={(e) => onChange(e.target.value)} />
  </label>
)

export default function TaxonomyBuilder({ openId, setOpenId, notify, genFrom, onGenHandled }) {
  const [tax, setTax] = useState(() => (openId ? normTaxonomy(getDoc(openId)?.taxonomy) : blankTaxonomy()))
  const [savedId, setSavedId] = useState(openId || '')

  useEffect(() => {
    if (!openId) return
    const d = getDoc(openId)
    if (d) {
      setTax(normTaxonomy(d.taxonomy))
      setSavedId(openId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  // Autosave edits back into the open document (debounced).
  useEffect(() => {
    if (!savedId) return
    const t = setTimeout(() => {
      const d = getDoc(savedId)
      if (!d) return
      const project = { ...(d.project || blankProject()) }
      project.header = { ...(project.header || {}), processName: tax.title || 'Business Process Taxonomy' }
      saveDoc({ id: savedId, project, extra: { taxonomy: tax } })
    }, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tax, savedId])

  const taxDocs = useMemo(() => listDocs().filter((d) => d.docType === 'TAXONOMY'), [savedId, tax])

  // "Select a process → auto" — generate the diagram from the Explorer tree.
  const genOpts = useMemo(() => taxonomySourceOptions(), [])
  const [genSrc, setGenSrc] = useState('')
  const doGen = (id) => {
    const g = genTaxonomyFromNode(id)
    if (!g) return
    setTax(g)
    setSavedId('')
    setOpenId && setOpenId(null)
    notify && notify('Taxonomy generated from the Process Explorer')
  }
  useEffect(() => {
    if (!genFrom) return
    doGen(genFrom.id)
    onGenHandled && onGenHandled()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genFrom && genFrom.n])

  const set = (patch) => setTax((p) => ({ ...p, ...patch }))
  const setCol = (ci, patch) => setTax((p) => ({ ...p, columns: p.columns.map((c, i) => (i === ci ? { ...c, ...patch } : c)) }))
  const setL2 = (ci, patch) => setCol(ci, { l2: { ...tax.columns[ci].l2, ...patch } })
  const setL3 = (ci, li, patch) =>
    setCol(ci, { l3: tax.columns[ci].l3.map((b, j) => (j === li ? { ...b, ...patch } : b)) })
  const addCol = () => setTax((p) => ({ ...p, columns: [...p.columns, { id: uid(), l2: taxBox(), l3: [] }] }))
  const delCol = (ci) => setTax((p) => ({ ...p, columns: p.columns.filter((_, i) => i !== ci) }))
  const addL3 = (ci) => setCol(ci, { l3: [...tax.columns[ci].l3, taxBox()] })
  const delL3 = (ci, li) => setCol(ci, { l3: tax.columns[ci].l3.filter((_, j) => j !== li) })

  const saveNew = () => {
    const project = blankProject()
    project.header.processName = tax.title || 'Business Process Taxonomy'
    const d = createDoc(project, { docType: 'TAXONOMY', taxonomy: tax })
    setSavedId(d.id)
    setOpenId && setOpenId(d.id)
    notify && notify('Taxonomy disimpan sebagai ' + d.id)
  }
  const newTax = () => {
    setTax(blankTaxonomy())
    setSavedId('')
    setOpenId && setOpenId(null)
  }
  const loadSample = () => {
    setTax(sampleTaxonomy())
    setSavedId('')
    setOpenId && setOpenId(null)
  }

  return (
    <div className="fl-page">
      <div className="fl-page-hd">
        <div>
          <h1>Business Process Taxonomy</h1>
          <p>Compose the L0 → L3 process hierarchy (core process → group → L2 category → L3 sub-processes) and export the diagram.</p>
        </div>
        <div className="fl-page-actions">
          <button className="btn btn-sm" onClick={loadSample}>Load sample</button>
          <button className="btn btn-sm" onClick={newTax}>New taxonomy</button>
          {savedId ? (
            <span className="chip chip-id" title="Tersimpan otomatis">{savedId}</span>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={saveNew}>Save to Repository</button>
          )}
        </div>
      </div>

      <div className="fl-split">
        <div className="fl-form">
          {genOpts.length ? (
            <div className="gen-bar">
              <span className="gen-lb">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>
                Auto-generate
              </span>
              <SearchSelect
                value={genSrc}
                onChange={setGenSrc}
                placeholder="Select a process group (LVL 1)…"
                options={genOpts.map((o) => ({ value: o.id, label: o.label }))}
              />
              <button className="btn btn-sm btn-primary" disabled={!genSrc} onClick={() => doGen(genSrc)}>Generate</button>
            </div>
          ) : null}
          <FormSection title="Title & labels" defaultOpen={false}>
            <div className="imp-grid">
              <Field label="Diagram title" value={tax.title} onChange={(v) => set({ title: v })} placeholder="E4. Shipment Coordination (Taxonomy)" />
              <Field label="L0 — core process label" value={tax.l0} onChange={(v) => set({ l0: v })} placeholder="Core Process" />
              <Field label="L1 — process group" value={tax.l1} onChange={(v) => set({ l1: v })} placeholder="C4. Marine & Logistic" />
            </div>
          </FormSection>

          <FormSection
            title="Columns"
            count={tax.columns.length}
            right={<button className="btn btn-sm" onClick={addCol}>+ Column</button>}
            hint={<>One <b>L2</b> category per column, its <b>L3</b> sub-processes stacked below. Tick <b>HL</b> to highlight a box.</>}
          >
          {tax.columns.map((c, ci) => (
            <div key={c.id} className="tx-colcard">
              <div className="tx-colcard-hd">
                <span>Column {ci + 1}</span>
                {tax.columns.length > 1 ? (
                  <button className="imp-x" title="Delete column" onClick={() => delCol(ci)}>✕ column</button>
                ) : null}
              </div>
              <div className="tx-l2edit">
                <input className="tx-inp tx-inp-code" value={c.l2.code} placeholder="L2 code" onChange={(e) => setL2(ci, { code: e.target.value })} />
                <input className="tx-inp" value={c.l2.name} placeholder="L2 category name" onChange={(e) => setL2(ci, { name: e.target.value })} />
                <label className="tx-hicheck" title="Highlight this box">
                  <input type="checkbox" checked={!!c.l2.hi} onChange={(e) => setL2(ci, { hi: e.target.checked })} /> HL
                </label>
              </div>
              {c.l3.map((b, li) => (
                <div key={b.id} className="tx-l3edit">
                  <span className="tx-l3dot">└</span>
                  <input className="tx-inp tx-inp-code" value={b.code} placeholder="Code" onChange={(e) => setL3(ci, li, { code: e.target.value })} />
                  <input className="tx-inp" value={b.name} placeholder="L3 sub-process name" onChange={(e) => setL3(ci, li, { name: e.target.value })} />
                  <label className="tx-hicheck" title="Highlight this box">
                    <input type="checkbox" checked={!!b.hi} onChange={(e) => setL3(ci, li, { hi: e.target.checked })} /> HL
                  </label>
                  <button className="imp-x" title="Delete" onClick={() => delL3(ci, li)}>✕</button>
                </div>
              ))}
              <button className="btn btn-sm tx-addl3" onClick={() => addL3(ci)}>+ L3</button>
            </div>
          ))}
            <button className="add-row" onClick={addCol}>+ Add column</button>
          </FormSection>

          {taxDocs.length ? (
            <FormSection title="Saved taxonomies" count={taxDocs.length} defaultOpen={false}>
              <div className="fl-saved">
                {taxDocs.map((d) => (
                  <button key={d.id} className={'fl-saved-item' + (d.id === savedId ? ' on' : '')} onClick={() => setOpenId && setOpenId(d.id)}>
                    <span className="chip chip-id">{d.id}</span> {d.name}
                  </button>
                ))}
              </div>
            </FormSection>
          ) : null}
          <div style={{ height: 28 }} />
        </div>

        <div className="fl-preview">
          <TaxonomyChart taxonomy={tax} notify={notify} onExportName={tax.title || 'taxonomy'} />
        </div>
      </div>
    </div>
  )
}
