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
import FormSection from '../components/FormSection.jsx'
import SearchSelect from '../components/SearchSelect.jsx'

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

export default function AutoFlow({ openId, setOpenId, notify }) {
  const [flow, setFlow] = useState(() => (openId ? getDoc(openId)?.flow || blankFlow() : blankFlow()))
  const [tpl, setTpl] = useState(() => ({ ...DEFAULT_TPL, ...(openId ? getDoc(openId)?.project?.template : null) }))
  const [savedId, setSavedId] = useState(openId || '')
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

  // Decision branches: read/write the Yes/No targets on top of the free-form
  // `next` syntax ("6:Yes, 3:No"), preserving any custom-labelled branches.
  const parseBranches = (raw) => {
    const pairs = String(raw || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => {
        const i = t.indexOf(':')
        return i === -1 ? { target: t.trim(), label: '' } : { target: t.slice(0, i).trim(), label: t.slice(i + 1).trim() }
      })
    const yes = pairs.find((p) => /^y(es)?$/i.test(p.label))
    const no = pairs.find((p) => /^n(o)?$/i.test(p.label))
    return { yes: yes ? yes.target : '', no: no ? no.target : '', rest: pairs.filter((p) => p !== yes && p !== no) }
  }
  const setBranch = (i, which, target) => {
    const b = parseBranches(flow.steps[i].next)
    if (which === 'yes') b.yes = target
    else b.no = target
    const parts = []
    if (b.yes) parts.push(b.yes + ':Yes')
    if (b.no) parts.push(b.no + ':No')
    b.rest.forEach((p) => parts.push(p.target + (p.label ? ':' + p.label : '')))
    setStep(i, 'next', parts.join(', '))
  }
  // Steps a branch can jump to, labelled by number + activity.
  const targetOptions = (selfId) =>
    flow.steps
      .filter((x) => x.id !== selfId && String(x.no || '').trim())
      .map((x) => ({ value: String(x.no).trim(), label: String(x.no).trim() + ' · ' + (x.activity || x.type) }))

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
          <p>Fill in the lanes (responsible parties) &amp; the steps — the system draws the SOP flowchart automatically.</p>
        </div>
        <div className="fl-page-actions">
          <button className="btn btn-sm" onClick={loadSample}>Load sample</button>
          <button className="btn btn-sm" onClick={newFlow}>New flow</button>
          {savedId ? (
            <span className="chip chip-id" title="Saved automatically">{savedId}</span>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={saveNew}>Save to Repository</button>
          )}
        </div>
      </div>

      <div className="fl-split">
        {/* ---- input form ---- */}
        <div className="fl-form">
          <FormSection title="Document header" defaultOpen={false}>
            <div className="imp-grid">
              <Field label="Flow title" value={tpl.title} onChange={(v) => setT('title', v)} placeholder="C3.2 Fuel Supply" wide />
              <Field label="Level" value={tpl.level} onChange={(v) => setT('level', v)} />
              <Field label="Business Process No." value={tpl.bpNo} onChange={(v) => setT('bpNo', v)} />
              <Field label="Effective date" value={tpl.effectiveDate} onChange={(v) => setT('effectiveDate', v)} />
              <Field label="Revision" value={tpl.revision} onChange={(v) => setT('revision', v)} />
              <Field label="Prepared by" value={tpl.preparedBy} onChange={(v) => setT('preparedBy', v)} />
              <Field label="Reviewed by" value={tpl.reviewedBy} onChange={(v) => setT('reviewedBy', v)} />
              <Field label="Approved by" value={tpl.approvedBy} onChange={(v) => setT('approvedBy', v)} />
              <label className="imp-field">
                <span>Logo</span>
                <button className="btn btn-sm" onClick={() => logoRef.current && logoRef.current.click()}>
                  {tpl.logo ? 'Change logo' : 'Upload logo'}
                </button>
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { onLogoFile(e.target.files[0]); e.target.value = '' }} />
              </label>
            </div>
          </FormSection>

          <FormSection title="Lanes" count={lanesArr.length} hint={<>Responsible parties, one per line, ordered left → right. The section name becomes the band above the lanes.</>}>
            <div className="imp-grid">
              <Field label="Process / section name" value={flow.section} onChange={(v) => setFlow((f) => ({ ...f, section: v }))} placeholder="C3.2 Fuel Supply" wide />
              <label className="imp-field imp-field-wide">
                <span>Lanes (one per line)</span>
                <textarea
                  rows={Math.min(8, Math.max(3, (flow.lanes || []).length))}
                  value={(flow.lanes || []).join('\n')}
                  onChange={(e) => setLanes(e.target.value)}
                  placeholder={'Fuel Supply/Cargo Handling\nAgency\nFuel Supplier\nHarbor Master'}
                />
              </label>
            </div>
          </FormSection>

          <FormSection
            title="Steps"
            count={flow.steps.length}
            right={<button className="btn btn-sm" onClick={addStep}>+ Step</button>}
            hint={<><b>Next</b>: target step numbers, comma separated — <code>6:Yes, 3:No</code> for decision branches; empty continues to the next step.</>}
          >
            {flow.steps.map((s, i) => (
              <div key={s.id} className="stp">
                <div className="stp-row1">
                  <input className="stp-no" value={s.no} title="Step number" onChange={(e) => setStep(i, 'no', e.target.value)} />
                  <input className="stp-activity" value={s.activity} placeholder="Activity — what happens in this step" onChange={(e) => setStep(i, 'activity', e.target.value)} />
                  <span className="stp-actions">
                    <button className="imp-x" title="Move up" onClick={() => moveStep(i, -1)}>↑</button>
                    <button className="imp-x" title="Move down" onClick={() => moveStep(i, 1)}>↓</button>
                    <button className="imp-x" title="Delete step" onClick={() => delStep(i)}>✕</button>
                  </span>
                </div>
                <div className="stp-row2">
                  <SearchSelect
                    compact
                    value={s.type}
                    options={FLOW_TYPES.map((t) => ({ value: t.id, label: t.label }))}
                    onChange={(v) => setStep(i, 'type', v)}
                    placeholder="Type"
                  />
                  <SearchSelect
                    compact
                    value={s.lane}
                    options={lanesArr.map((ln) => ({ value: ln, label: ln }))}
                    onChange={(v) => setStep(i, 'lane', v)}
                    placeholder="Lane…"
                    emptyLabel="— no lane —"
                  />
                  <select className="stp-rasci" title="RASCI" value={s.rasci} onChange={(e) => setStep(i, 'rasci', e.target.value)}>
                    {FLOW_RASCI.map((r) => <option key={r} value={r}>{r || '—'}</option>)}
                  </select>
                  <input className="stp-ref" value={s.ref} placeholder="Ref" title="PDC reference, e.g. 7.1.1" onChange={(e) => setStep(i, 'ref', e.target.value)} />
                  {s.type === 'decision' ? (
                    <span className="stp-branches">
                      <span className="stp-branch">
                        <i className="stp-branch-tag stp-branch-yes">Yes →</i>
                        <SearchSelect
                          compact
                          value={parseBranches(s.next).yes}
                          options={targetOptions(s.id)}
                          onChange={(v) => setBranch(i, 'yes', v)}
                          placeholder="step…"
                          emptyLabel="— pick later —"
                        />
                      </span>
                      <span className="stp-branch">
                        <i className="stp-branch-tag stp-branch-no">No →</i>
                        <SearchSelect
                          compact
                          value={parseBranches(s.next).no}
                          options={targetOptions(s.id)}
                          onChange={(v) => setBranch(i, 'no', v)}
                          placeholder="step…"
                          emptyLabel="— pick later —"
                        />
                      </span>
                    </span>
                  ) : (
                    <input className="stp-next" value={s.next} placeholder="Next: auto" title="Next step number(s)" onChange={(e) => setStep(i, 'next', e.target.value)} />
                  )}
                </div>
              </div>
            ))}
            <button className="add-row" onClick={addStep}>+ Add step</button>
          </FormSection>

          {flowDocs.length ? (
            <FormSection title="Saved flows" count={flowDocs.length} defaultOpen={false}>
              <div className="fl-saved">
                {flowDocs.map((d) => (
                  <button key={d.id} className={'fl-saved-item' + (d.id === savedId ? ' on' : '')} onClick={() => setOpenId && setOpenId(d.id)}>
                    <span className="chip chip-id">{d.id}</span> {d.name}
                  </button>
                ))}
              </div>
            </FormSection>
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
            <div className="fl-empty">Add at least one lane to start drawing the flow.</div>
          )}
        </div>
      </div>
    </div>
  )
}
