// LEAP-STONES › Taxonomy Description — the user fills a matrix of processes
// (M7.1 … M7.5) with their name, description, KPI, responsible and accountable
// parties. The system renders the description table (multi-line KPI/roles →
// bullet lists). Saved to the repository as TAXDESC-type documents.
import { useState, useEffect, useMemo } from 'react'
import { blankTaxdesc, sampleTaxdesc, normTaxdesc, taxdescProc, TAXDESC_ROWS } from '../lib/taxdesc.js'
import { blankProject } from '../lib/sample.js'
import { taxdescSourceOptions, genTaxdescFromNode } from '../lib/genFromTree.js'
import { createDoc, saveDoc, getDoc, listDocs } from '../lib/store.js'
import TaxDescTable from '../components/TaxDescTable.jsx'
import FormSection from '../components/FormSection.jsx'
import SearchSelect from '../components/SearchSelect.jsx'

const Field = ({ label, value, onChange, placeholder }) => (
  <label className="imp-field imp-field-wide">
    <span>{label}</span>
    <input value={value || ''} placeholder={placeholder || ''} onChange={(e) => onChange(e.target.value)} />
  </label>
)

export default function TaxonomyDescription({ openId, setOpenId, notify, genFrom, onGenHandled }) {
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

  // "Select a parent process → auto" — columns from its children, KPIs prefilled.
  const genOpts = useMemo(() => taxdescSourceOptions(), [])
  const [genSrc, setGenSrc] = useState('')
  const doGen = (id) => {
    const g = genTaxdescFromNode(id)
    if (!g) return
    setTd(g)
    setSavedId('')
    setOpenId && setOpenId(null)
    notify && notify('Description table generated from the Process Explorer')
  }
  useEffect(() => {
    if (!genFrom) return
    doGen(genFrom.id)
    onGenHandled && onGenHandled()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genFrom && genFrom.n])

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
          <p>Describe each process — name, description, performance indicators, responsibilities (RACI) — in a taxonomy table.</p>
        </div>
        <div className="fl-page-actions">
          <button className="btn btn-sm" onClick={loadSample}>Load sample</button>
          <button className="btn btn-sm" onClick={newTd}>New description</button>
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
                placeholder="Select a parent process (LVL 1–2)…"
                options={genOpts.map((o) => ({ value: o.id, label: o.label }))}
              />
              <button className="btn btn-sm btn-primary" disabled={!genSrc} onClick={() => doGen(genSrc)}>Generate</button>
            </div>
          ) : null}
          <FormSection title="Title" defaultOpen={false}>
            <div className="imp-grid">
              <Field label="Title" value={td.title} onChange={(v) => set({ title: v })} placeholder="Taxonomy Description" />
              <Field label="Subtitle" value={td.subtitle} onChange={(v) => set({ subtitle: v })} placeholder="Subtitle: the level" />
            </div>
          </FormSection>

          <FormSection
            title="Processes"
            count={td.processes.length}
            right={<button className="btn btn-sm" onClick={addProc}>+ Process</button>}
            hint={<>For <b>Performance Indicator</b>, <b>Responsible</b>, and <b>Accountable</b>: one point per line — they render as bullet lists.</>}
          >
          {td.processes.map((p, pi) => (
            <div key={p.id} className="tx-colcard">
              <div className="tx-colcard-hd">
                <span>Process {pi + 1}</span>
                {td.processes.length > 1 ? (
                  <button className="imp-x" title="Delete process" onClick={() => delProc(pi)}>✕ process</button>
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
                  <span>{TAXDESC_ROWS[2].label} — one per line</span>
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
            <button className="add-row" onClick={addProc}>+ Add process</button>
          </FormSection>

          {tdDocs.length ? (
            <FormSection title="Saved descriptions" count={tdDocs.length} defaultOpen={false}>
              <div className="fl-saved">
                {tdDocs.map((d) => (
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
          <TaxDescTable taxdesc={td} notify={notify} onExportName={td.title || 'taxonomy-description'} />
        </div>
      </div>
    </div>
  )
}
