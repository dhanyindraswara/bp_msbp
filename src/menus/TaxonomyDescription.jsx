// LEAP-STONES › Taxonomy Description — the user fills a matrix of processes
// (M7.1 … M7.5) with their name, description, KPI, responsible and accountable
// parties. The system renders the description table (multi-line KPI/roles →
// bullet lists). Saved to the repository as TAXDESC-type documents.
import { useState, useEffect, useMemo } from 'react'
import { blankTaxdesc, sampleTaxdesc, normTaxdesc, taxdescProc, TAXDESC_ROWS } from '../lib/taxdesc.js'
import { blankProject } from '../lib/sample.js'
import { createDoc, saveDoc, getDoc, listDocs } from '../lib/store.js'
import TaxDescTable from '../components/TaxDescTable.jsx'

const Field = ({ label, value, onChange, placeholder }) => (
  <label className="imp-field imp-field-wide">
    <span>{label}</span>
    <input value={value || ''} placeholder={placeholder || ''} onChange={(e) => onChange(e.target.value)} />
  </label>
)

export default function TaxonomyDescription({ openId, setOpenId, notify }) {
  const [td, setTd] = useState(() => (openId ? normTaxdesc(getDoc(openId)?.taxdesc) : blankTaxdesc()))
  const [savedId, setSavedId] = useState(openId || '')

  useEffect(() => {
    if (!openId) return
    const d = getDoc(openId)
    if (d) {
      setTd(normTaxdesc(d.taxdesc))
      setSavedId(openId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  useEffect(() => {
    if (!savedId) return
    const t = setTimeout(() => {
      const d = getDoc(savedId)
      if (!d) return
      const project = { ...(d.project || blankProject()) }
      project.header = { ...(project.header || {}), processName: td.title || 'Taxonomy Description' }
      saveDoc({ id: savedId, project, extra: { taxdesc: td } })
    }, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [td, savedId])

  const tdDocs = useMemo(() => listDocs().filter((d) => d.docType === 'TAXDESC'), [savedId, td])

  const set = (patch) => setTd((p) => ({ ...p, ...patch }))
  const setProc = (pi, patch) => setTd((p) => ({ ...p, processes: p.processes.map((x, i) => (i === pi ? { ...x, ...patch } : x)) }))
  const addProc = () => setTd((p) => ({ ...p, processes: [...p.processes, taxdescProc()] }))
  const delProc = (pi) => setTd((p) => ({ ...p, processes: p.processes.filter((_, i) => i !== pi) }))

  const saveNew = () => {
    const project = blankProject()
    project.header.processName = td.title || 'Taxonomy Description'
    const d = createDoc(project, { docType: 'TAXDESC', taxdesc: td })
    setSavedId(d.id)
    setOpenId && setOpenId(d.id)
    notify && notify('Taxonomy Description disimpan sebagai ' + d.id)
  }
  const newTd = () => {
    setTd(blankTaxdesc())
    setSavedId('')
    setOpenId && setOpenId(null)
  }
  const loadSample = () => {
    setTd(sampleTaxdesc())
    setSavedId('')
    setOpenId && setOpenId(null)
  }

  return (
    <div className="fl-page">
      <div className="fl-page-hd">
        <div>
          <h1>Taxonomy Description</h1>
          <p>Deskripsikan tiap proses — nama, deskripsi, indikator kinerja, penanggung jawab (RACI) — dalam tabel taksonomi.</p>
        </div>
        <div className="fl-page-actions">
          <button className="btn btn-sm" onClick={loadSample}>Load sample</button>
          <button className="btn btn-sm" onClick={newTd}>Deskripsi baru</button>
          {savedId ? (
            <span className="chip chip-id" title="Tersimpan otomatis">{savedId}</span>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={saveNew}>Simpan ke Repository</button>
          )}
        </div>
      </div>

      <div className="fl-split">
        <div className="fl-form">
          <div className="imp-sec">Judul</div>
          <div className="imp-grid">
            <Field label="Judul" value={td.title} onChange={(v) => set({ title: v })} placeholder="Taksonomi Description" />
            <Field label="Sub judul" value={td.subtitle} onChange={(v) => set({ subtitle: v })} placeholder="Sub Judul: levelnya" />
          </div>

          <div className="imp-sec">
            Proses ({td.processes.length})
            <button className="btn btn-sm" onClick={addProc}>+ Proses</button>
          </div>
          <div className="fl-hint">
            Untuk <b>Performance Indicator</b>, <b>Responsible</b>, dan <b>Accountable</b>: satu poin per baris (Enter) — akan jadi bullet list di tabel.
          </div>

          {td.processes.map((p, pi) => (
            <div key={p.id} className="tx-colcard">
              <div className="tx-colcard-hd">
                <span>Proses {pi + 1}</span>
                {td.processes.length > 1 ? (
                  <button className="imp-x" title="Hapus proses" onClick={() => delProc(pi)}>✕ proses</button>
                ) : null}
              </div>
              <div className="td-editgrid">
                <label className="imp-field">
                  <span>Process Number</span>
                  <input value={p.number} placeholder="M7.1" onChange={(e) => setProc(pi, { number: e.target.value })} />
                </label>
                <label className="imp-field td-editwide">
                  <span>{TAXDESC_ROWS[0].label}</span>
                  <input value={p.name} placeholder="HSE Strategy, Planning & Performance" onChange={(e) => setProc(pi, { name: e.target.value })} />
                </label>
                <label className="imp-field td-editwide">
                  <span>{TAXDESC_ROWS[1].label}</span>
                  <textarea rows={3} value={p.description} onChange={(e) => setProc(pi, { description: e.target.value })} />
                </label>
                <label className="imp-field td-editwide">
                  <span>{TAXDESC_ROWS[2].label} (1 baris / poin)</span>
                  <textarea rows={3} value={p.kpi} onChange={(e) => setProc(pi, { kpi: e.target.value })} />
                </label>
                <label className="imp-field">
                  <span>{TAXDESC_ROWS[3].label}</span>
                  <textarea rows={2} value={p.responsible} onChange={(e) => setProc(pi, { responsible: e.target.value })} />
                </label>
                <label className="imp-field">
                  <span>{TAXDESC_ROWS[4].label}</span>
                  <textarea rows={2} value={p.accountable} onChange={(e) => setProc(pi, { accountable: e.target.value })} />
                </label>
              </div>
            </div>
          ))}

          {tdDocs.length ? (
            <>
              <div className="imp-sec">Deskripsi tersimpan</div>
              <div className="fl-saved">
                {tdDocs.map((d) => (
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
          <TaxDescTable taxdesc={td} notify={notify} onExportName={td.title || 'taxonomy-description'} />
        </div>
      </div>
    </div>
  )
}
