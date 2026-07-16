// LEAP-STONES › Auto Flow Process — the user fills in a simple form (lanes +
// ordered steps), and the system draws a cross-functional swimlane flowchart to
// the company SOP template. No SIPOC needed. Flows are saved to the repository
// as FLOW-type documents and can be reopened here for editing.
import { useState, useEffect, useMemo, useRef } from 'react'
import { blankFlow, sampleFlow, FLOW_TYPES, FLOW_RASCI } from '../lib/flow.js'
import { blankProject } from '../lib/sample.js'
import { createDoc, saveDoc, getDoc, listDocs } from '../lib/store.js'
import { uid } from '../lib/constants.js'
import FlowChart from '../components/FlowChart.jsx'

const DEFAULT_TPL = {
  logo: '',
  level: 'BUSINESS PROCESS LEVEL 3',
  title: '',
  bpNo: '',
  effectiveDate: '',
  revision: '01',
  preparedBy: '',
  reviewedBy: '',
  approvedBy: '',
}

const Field = ({ label, value, onChange, placeholder, wide }) => (
  <label className={'imp-field' + (wide ? ' imp-field-wide' : '')}>
    <span>{label}</span>
    <input value={value || ''} placeholder={placeholder || ''} onChange={(e) => onChange(e.target.value)} />
  </label>
)

// A collapsible form section: click the header to hide / show its body.
const Section = ({ title, open, onToggle, right, children }) => (
  <>
    <div className="imp-sec fl-sec" onClick={onToggle}>
      <span className="fl-sec-caret">{open ? '▾' : '▸'}</span>
      {title}
      {right ? <span className="fl-sec-right" onClick={(e) => e.stopPropagation()}>{right}</span> : null}
    </div>
    {open ? children : null}
  </>
)

export default function AutoFlow({ openId, setOpenId, notify }) {
  const [flow, setFlow] = useState(() => (openId ? getDoc(openId)?.flow || blankFlow() : blankFlow()))
  const [tpl, setTpl] = useState(() => ({ ...DEFAULT_TPL, ...(openId ? getDoc(openId)?.project?.template : null) }))
  const [savedId, setSavedId] = useState(openId || '')
  const [secOpen, setSecOpen] = useState({ header: false, section: true }) // Kepala dokumen collapsed by default
  const toggleSec = (k) => setSecOpen((s) => ({ ...s, [k]: !s[k] }))
  const logoRef = useRef(null)

  // Reload when the caller opens a different flow document.
  useEffect(() => {
    if (!openId) return
    const d = getDoc(openId)
    if (d) {
      setFlow(d.flow || blankFlow())
      setTpl({ ...DEFAULT_TPL, ...(d.project?.template || {}) })
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
      const project = { ...(d.project || blankProject()), template: { ...tpl, title: tpl.title || flow.section } }
      project.header = { ...(project.header || {}), processName: flow.section || tpl.title || 'Flow process' }
      saveDoc({ id: savedId, project, extra: { flow } })
    }, 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, tpl, savedId])

  const flowDocs = useMemo(() => listDocs().filter((d) => d.docType === 'FLOW'), [savedId, flow])

  const setT = (k, v) => setTpl((p) => ({ ...p, [k]: v }))
  const setLanes = (text) => setFlow((f) => ({ ...f, lanes: text.split('\n').map((x) => x.replace(/\r/, '')) }))
  const setStep = (i, k, v) => setFlow((f) => ({ ...f, steps: f.steps.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }))
  const addStep = () =>
    setFlow((f) => ({
      ...f,
      steps: [
        ...f.steps,
        { id: uid(), no: String(f.steps.filter((s) => s.no).length + 1), type: 'process', lane: (f.lanes || [])[0] || '', rasci: 'R', ref: '', activity: '', next: '' },
      ],
    }))
  const delStep = (i) => setFlow((f) => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }))
  const moveStep = (i, dir) =>
    setFlow((f) => {
      const j = i + dir
      if (j < 0 || j >= f.steps.length) return f
      const steps = f.steps.slice()
      ;[steps[i], steps[j]] = [steps[j], steps[i]]
      return { ...f, steps }
    })
  // Applied when a box is dragged or renamed in the preview.
  const updateStepById = (id, patch) =>
    setFlow((f) => ({ ...f, steps: f.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))
  // Drop all manual positions so every box falls back to the auto grid.
  const resetLayout = () =>
    setFlow((f) => ({ ...f, steps: f.steps.map(({ pos, ...rest }) => rest) })) // eslint-disable-line no-unused-vars

  const onLogoFile = (file) => {
    if (!file) return
    const rd = new FileReader()
    rd.onload = () => setT('logo', rd.result)
    rd.readAsDataURL(file)
  }

  const lanesArr = (flow.lanes || []).map((x) => x.trim()).filter(Boolean)

  const saveNew = () => {
    const project = blankProject()
    project.header.processName = flow.section || tpl.title || 'Flow process'
    project.template = { ...tpl, title: tpl.title || flow.section }
    const d = createDoc(project, { docType: 'FLOW', flow })
    setSavedId(d.id)
    setOpenId && setOpenId(d.id)
    notify && notify('Flow disimpan sebagai ' + d.id)
  }

  const newFlow = () => {
    setFlow(blankFlow())
    setTpl({ ...DEFAULT_TPL })
    setSavedId('')
    setOpenId && setOpenId(null)
  }

  const loadSample = () => {
    const sf = sampleFlow()
    setFlow(sf)
    setTpl((p) => ({ ...p, level: 'BUSINESS PROCESS LEVEL 3', title: sf.section }))
    setSavedId('')
    setOpenId && setOpenId(null)
  }

  return (
    <div className="fl-page">
      <div className="fl-page-hd">
        <div>
          <h1>Auto Flow Process</h1>
          <p>Isi lane (pihak yang bertanggung jawab) &amp; langkah-langkahnya — sistem menggambar flowchart SOP-nya otomatis.</p>
        </div>
        <div className="fl-page-actions">
          <button className="btn btn-sm" onClick={loadSample}>Load sample</button>
          <button className="btn btn-sm" onClick={newFlow}>Flow baru</button>
          {savedId ? (
            <span className="chip chip-id" title="Tersimpan otomatis">{savedId}</span>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={saveNew}>Simpan ke Repository</button>
          )}
        </div>
      </div>

      <div className="fl-split">
        {/* ---- input form ---- */}
        <div className="fl-form">
          <Section title="Kepala dokumen" open={secOpen.header} onToggle={() => toggleSec('header')}>
            <div className="imp-grid">
              <Field label="Judul flow" value={tpl.title} onChange={(v) => setT('title', v)} placeholder="C3.2 Fuel Supply" wide />
              <Field label="Level" value={tpl.level} onChange={(v) => setT('level', v)} />
              <Field label="Business Process No." value={tpl.bpNo} onChange={(v) => setT('bpNo', v)} />
              <Field label="Effective date" value={tpl.effectiveDate} onChange={(v) => setT('effectiveDate', v)} />
              <Field label="Revisi" value={tpl.revision} onChange={(v) => setT('revision', v)} />
              <Field label="Prepared by" value={tpl.preparedBy} onChange={(v) => setT('preparedBy', v)} />
              <Field label="Reviewed by" value={tpl.reviewedBy} onChange={(v) => setT('reviewedBy', v)} />
              <Field label="Approved by" value={tpl.approvedBy} onChange={(v) => setT('approvedBy', v)} />
              <label className="imp-field">
                <span>Logo</span>
                <button className="btn btn-sm" onClick={() => logoRef.current && logoRef.current.click()}>
                  {tpl.logo ? 'Ganti logo' : 'Upload logo'}
                </button>
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { onLogoFile(e.target.files[0]); e.target.value = '' }} />
              </label>
            </div>
          </Section>

          <Section title="Judul section (band)" open={secOpen.section} onToggle={() => toggleSec('section')}>
            <div className="imp-grid">
              <Field label="Nama proses / section" value={flow.section} onChange={(v) => setFlow((f) => ({ ...f, section: v }))} placeholder="C3.2 Fuel Supply" wide />
            </div>
          </Section>

          <div className="imp-sec">Lane / kolom (satu per baris)</div>
          <div className="imp-grid">
            <label className="imp-field imp-field-wide">
              <span>Pihak yang bertanggung jawab, urut kiri → kanan</span>
              <textarea
                rows={Math.min(8, Math.max(3, (flow.lanes || []).length))}
                value={(flow.lanes || []).join('\n')}
                onChange={(e) => setLanes(e.target.value)}
                placeholder={'Fuel Supply/Cargo Handling\nAgency\nFuel Supplier\nHarbor Master'}
              />
            </label>
          </div>

          <div className="imp-sec">
            Langkah ({flow.steps.length})
            <button className="btn btn-sm" onClick={addStep}>+ Langkah</button>
          </div>
          <div className="fl-hint">
            <b>Next</b>: nomor langkah tujuan, pisah koma. Untuk percabangan keputusan pakai <code>6:Yes, 3:No</code>. Kosong = otomatis lanjut ke langkah berikutnya.
          </div>
          <table className="fl-steps">
            <colgroup>
              <col style={{ width: 38 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: 52 }} />
              <col style={{ width: 58 }} />
              <col />
              <col style={{ width: 66 }} />
              <col style={{ width: 60 }} />
            </colgroup>
            <thead>
              <tr>
                <th>No</th><th>Tipe</th><th>Lane</th><th>RASCI</th><th>Ref</th><th>Aktivitas</th><th>Next</th><th />
              </tr>
            </thead>
            <tbody>
              {flow.steps.map((s, i) => (
                <tr key={s.id}>
                  <td><input value={s.no} onChange={(e) => setStep(i, 'no', e.target.value)} /></td>
                  <td>
                    <select value={s.type} onChange={(e) => setStep(i, 'type', e.target.value)}>
                      {FLOW_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={s.lane} onChange={(e) => setStep(i, 'lane', e.target.value)}>
                      <option value="">—</option>
                      {lanesArr.map((ln) => <option key={ln} value={ln}>{ln}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={s.rasci} onChange={(e) => setStep(i, 'rasci', e.target.value)}>
                      {FLOW_RASCI.map((r) => <option key={r} value={r}>{r || '—'}</option>)}
                    </select>
                  </td>
                  <td><input value={s.ref} onChange={(e) => setStep(i, 'ref', e.target.value)} placeholder="7.1.1" /></td>
                  <td><input value={s.activity} onChange={(e) => setStep(i, 'activity', e.target.value)} /></td>
                  <td><input value={s.next} onChange={(e) => setStep(i, 'next', e.target.value)} placeholder="auto" /></td>
                  <td className="fl-steps-act">
                    <button className="imp-x" title="Naik" onClick={() => moveStep(i, -1)}>↑</button>
                    <button className="imp-x" title="Turun" onClick={() => moveStep(i, 1)}>↓</button>
                    <button className="imp-x" title="Hapus" onClick={() => delStep(i)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {flowDocs.length ? (
            <>
              <div className="imp-sec">Flow tersimpan</div>
              <div className="fl-saved">
                {flowDocs.map((d) => (
                  <button key={d.id} className={'fl-saved-item' + (d.id === savedId ? ' on' : '')} onClick={() => setOpenId && setOpenId(d.id)}>
                    <span className="chip chip-id">{d.id}</span> {d.name}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <div style={{ height: 28 }} />
        </div>

        {/* ---- live preview ---- */}
        <div className="fl-preview">
          {lanesArr.length ? (
            <FlowChart
              flow={flow}
              template={tpl}
              notify={notify}
              onExportName={flow.section || tpl.title || 'flow-process'}
              interactive
              onUpdateStep={updateStepById}
              onResetLayout={resetLayout}
            />
          ) : (
            <div className="fl-empty">Tambahkan minimal satu lane untuk mulai menggambar flow.</div>
          )}
        </div>
      </div>
    </div>
  )
}
