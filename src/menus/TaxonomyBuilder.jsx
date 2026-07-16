// LEAP-STONES › Business Process Taxonomy — the user fills a simple form (two
// spanning band labels + columns, each with one L2 category and a stack of L3
// boxes) and the system draws the L0 → L3 taxonomy diagram. Saved to the
// repository as TAXONOMY-type documents and reopenable here for editing.
import { useState, useEffect, useMemo } from 'react'
import { blankTaxonomy, sampleTaxonomy, normTaxonomy, taxBox } from '../lib/taxonomy.js'
import { blankProject } from '../lib/sample.js'
import { createDoc, saveDoc, getDoc, listDocs } from '../lib/store.js'
import { uid } from '../lib/constants.js'
import TaxonomyChart from '../components/TaxonomyChart.jsx'

const Field = ({ label, value, onChange, placeholder }) => (
  <label className="imp-field imp-field-wide">
    <span>{label}</span>
    <input value={value || ''} placeholder={placeholder || ''} onChange={(e) => onChange(e.target.value)} />
  </label>
)

export default function TaxonomyBuilder({ openId, setOpenId, notify }) {
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
          <p>Susun hierarki proses L0 → L3 (Core Process → grup → kategori L2 → sub-proses L3) dan ekspor diagramnya.</p>
        </div>
        <div className="fl-page-actions">
          <button className="btn btn-sm" onClick={loadSample}>Load sample</button>
          <button className="btn btn-sm" onClick={newTax}>Taksonomi baru</button>
          {savedId ? (
            <span className="chip chip-id" title="Tersimpan otomatis">{savedId}</span>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={saveNew}>Simpan ke Repository</button>
          )}
        </div>
      </div>

      <div className="fl-split">
        <div className="fl-form">
          <div className="imp-sec">Judul &amp; band</div>
          <div className="imp-grid">
            <Field label="Judul diagram" value={tax.title} onChange={(v) => set({ title: v })} placeholder="E4. Shipment Coordination (Taksonomi)" />
            <Field label="L0 — label proses inti" value={tax.l0} onChange={(v) => set({ l0: v })} placeholder="Core Process" />
            <Field label="L1 — grup proses" value={tax.l1} onChange={(v) => set({ l1: v })} placeholder="C4. Marine & Logistic" />
          </div>

          <div className="imp-sec">
            Kolom L2 &amp; L3 ({tax.columns.length})
            <button className="btn btn-sm" onClick={addCol}>+ Kolom</button>
          </div>
          <div className="fl-hint">
            Tiap kolom = satu kategori <b>L2</b> dengan tumpukan sub-proses <b>L3</b> di bawahnya. Centang <b>Highlight</b> untuk kotak yang di-outline lebih lanjut.
          </div>

          {tax.columns.map((c, ci) => (
            <div key={c.id} className="tx-colcard">
              <div className="tx-colcard-hd">
                <span>Kolom {ci + 1}</span>
                {tax.columns.length > 1 ? (
                  <button className="imp-x" title="Hapus kolom" onClick={() => delCol(ci)}>✕ kolom</button>
                ) : null}
              </div>
              <div className="tx-l2edit">
                <input className="tx-inp tx-inp-code" value={c.l2.code} placeholder="Kode L2" onChange={(e) => setL2(ci, { code: e.target.value })} />
                <input className="tx-inp" value={c.l2.name} placeholder="Nama kategori L2" onChange={(e) => setL2(ci, { name: e.target.value })} />
                <label className="tx-hicheck" title="Highlight kotak">
                  <input type="checkbox" checked={!!c.l2.hi} onChange={(e) => setL2(ci, { hi: e.target.checked })} /> HL
                </label>
              </div>
              {c.l3.map((b, li) => (
                <div key={b.id} className="tx-l3edit">
                  <span className="tx-l3dot">└</span>
                  <input className="tx-inp tx-inp-code" value={b.code} placeholder="Kode" onChange={(e) => setL3(ci, li, { code: e.target.value })} />
                  <input className="tx-inp" value={b.name} placeholder="Nama sub-proses L3" onChange={(e) => setL3(ci, li, { name: e.target.value })} />
                  <label className="tx-hicheck" title="Highlight kotak">
                    <input type="checkbox" checked={!!b.hi} onChange={(e) => setL3(ci, li, { hi: e.target.checked })} /> HL
                  </label>
                  <button className="imp-x" title="Hapus" onClick={() => delL3(ci, li)}>✕</button>
                </div>
              ))}
              <button className="btn btn-sm tx-addl3" onClick={() => addL3(ci)}>+ L3</button>
            </div>
          ))}

          {taxDocs.length ? (
            <>
              <div className="imp-sec">Taksonomi tersimpan</div>
              <div className="fl-saved">
                {taxDocs.map((d) => (
                  <button key={d.id} className={'fl-saved-item' + (d.id === savedId ? ' on' : '')} onClick={() => setOpenId && setOpenId(d.id)}>
                    <span className="chip chip-id">{d.id}</span> {d.name}
                  </button>
                ))}
              </div>
            </>
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
