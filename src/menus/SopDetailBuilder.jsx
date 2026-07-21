// STONES › SOP Detail — the user fills every part of a company SOP EXCEPT the
// flow diagram: title block, document history, approvals, distribution, PPI,
// and sections 1..5 + 8. Point 6 (Flow Process) is linked to a flow authored in
// Auto Flow Process; point 7 (Process Description & Control) is then generated
// from that flow's steps — one numbered item per step — for the user to
// describe. Saved to the repository as SOPDETAIL-type documents.
//
// The form is organised into collapsible cards with a sticky jump-nav so a long
// SOP stays easy to navigate. A store subscription keeps the "linked flow" list
// fresh even when flows are created/loaded after this menu first mounts.
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  blankSopDetail,
  sampleSopDetail,
  normSopDetail,
  APPROVAL_ROLES,
  historyRow,
  definitionRow,
  procItem,
  procGroup,
  deriveProcItems,
} from '../lib/sopdetail.js'
import { blankProject } from '../lib/sample.js'
import { createDoc, saveDoc, getDoc, listDocs, subscribe } from '../lib/store.js'
import SopDetailDoc from '../components/SopDetailDoc.jsx'

// ---- small field primitives ----
const Field = ({ label, value, onChange, placeholder, hint, span }) => (
  <label className={'sd-f' + (span ? ' sd-f-span' : '')}>
    <span className="sd-f-lbl">{label}{hint ? <em>{hint}</em> : null}</span>
    <input value={value || ''} placeholder={placeholder || ''} onChange={(e) => onChange(e.target.value)} />
  </label>
)
const Area = ({ label, value, onChange, placeholder, rows = 3, hint }) => (
  <label className="sd-f sd-f-span">
    <span className="sd-f-lbl">{label}{hint ? <em>{hint}</em> : null}</span>
    <textarea rows={rows} value={value || ''} placeholder={placeholder || ''} onChange={(e) => onChange(e.target.value)} />
  </label>
)

// The section list drives both the jump-nav and the collapsible cards.
const SECTIONS = [
  { id: 'head', tag: 'Header', title: 'Document Header', desc: 'Document number, title, dates, revision & logo' },
  { id: 'hist', tag: 'History', title: 'Document History', desc: 'Revision history of the document' },
  { id: 'appr', tag: 'Approval', title: 'Approval', desc: 'Prepared · Checked · Reviewed · Approved' },
  { id: 'dist', tag: 'Distribution', title: 'Distribution & PPI', desc: 'Recipients & performance indicators' },
  { id: 's1', tag: '1', title: '1 · Purpose', desc: 'Why this SOP exists' },
  { id: 's2', tag: '2', title: '2 · Scope', desc: 'Scope of application' },
  { id: 's3', tag: '3', title: '3 · Definition', desc: 'Terms & definitions' },
  { id: 's4', tag: '4', title: '4 · References', desc: 'Legal basis & standards' },
  { id: 's5', tag: '5', title: '5 · Review & Validation', desc: 'Review provisions' },
  { id: 's6', tag: '6', title: '6 · Flow Process', desc: 'Link the flow diagram from Auto Flow Process' },
  { id: 's7', tag: '7', title: '7 · Process Description & Control', desc: 'Describe each step from Point 6' },
  { id: 's8', tag: '8', title: '8 · Related Document', desc: 'Related / supporting documents' },
]

export default function SopDetailBuilder({ openId, setOpenId, notify }) {
  const [sop, setSop] = useState(() => (openId ? normSopDetail(getDoc(openId)?.sopdetail) : blankSopDetail()))
  const [savedId, setSavedId] = useState(openId || '')
  const [tick, setTick] = useState(0) // bumped on store changes → keeps flow/sop lists fresh
  const [collapsed, setCollapsed] = useState({}) // sections default expanded
  const [activeSec, setActiveSec] = useState('head')
  const logoRef = useRef(null)
  const formRef = useRef(null)
  const secRefs = useRef({})

  // Re-render whenever the store emits (e.g. a flow gets created elsewhere or
  // Firestore finishes its first load), so the "linked flow" dropdown fills in.
  useEffect(() => subscribe(() => setTick((t) => t + 1)), [])

  // Highlight the nav chip for whichever section is currently at the top.
  useEffect(() => {
    const form = formRef.current
    if (!form) return
    const onScroll = () => {
      const ft = form.getBoundingClientRect().top
      let cur = SECTIONS[0].id
      for (const s of SECTIONS) {
        const el = secRefs.current[s.id]
        if (el && el.getBoundingClientRect().top - ft <= 90) cur = s.id
      }
      setActiveSec(cur)
    }
    form.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => form.removeEventListener('scroll', onScroll)
  }, [])

  // Reload when the caller opens a different SOP document.
  useEffect(() => {
    if (!openId) return
    const d = getDoc(openId)
    if (d) {
      setSop(normSopDetail(d.sopdetail))
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
      project.header = { ...(project.header || {}), processName: sop.title || sop.docNo || 'SOP Detail' }
      saveDoc({ id: savedId, project, extra: { sopdetail: sop } })
    }, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sop, savedId])

  const sopDocs = useMemo(() => listDocs().filter((d) => d.docType === 'SOPDETAIL'), [tick])
  const flowDocs = useMemo(() => listDocs().filter((d) => d.docType === 'FLOW'), [tick])

  const set = (patch) => setSop((p) => ({ ...p, ...patch }))
  const setApproval = (role, k, v) => setSop((p) => ({ ...p, approvals: { ...p.approvals, [role]: { ...p.approvals[role], [k]: v } } }))

  // Document history rows
  const setHist = (i, k, v) => setSop((p) => ({ ...p, history: p.history.map((h, j) => (j === i ? { ...h, [k]: v } : h)) }))
  const addHist = () => setSop((p) => ({ ...p, history: [...p.history, historyRow()] }))
  const delHist = (i) => setSop((p) => ({ ...p, history: p.history.filter((_, j) => j !== i) }))

  // Definition rows
  const setDef = (i, k, v) => setSop((p) => ({ ...p, definitions: p.definitions.map((d, j) => (j === i ? { ...d, [k]: v } : d)) }))
  const addDef = () => setSop((p) => ({ ...p, definitions: [...p.definitions, definitionRow()] }))
  const delDef = (i) => setSop((p) => ({ ...p, definitions: p.definitions.filter((_, j) => j !== i) }))

  // Point-7 groups & items
  const setGroup = (gi, k, v) => setSop((p) => ({ ...p, procGroups: p.procGroups.map((g, j) => (j === gi ? { ...g, [k]: v } : g)) }))
  const addGroup = () => setSop((p) => ({ ...p, procGroups: [...p.procGroups, procGroup('')] }))
  const delGroup = (gi) => setSop((p) => ({ ...p, procGroups: p.procGroups.filter((_, j) => j !== gi) }))
  const setItem = (gi, ii, k, v) =>
    setSop((p) => ({
      ...p,
      procGroups: p.procGroups.map((g, j) =>
        j === gi ? { ...g, items: g.items.map((it, m) => (m === ii ? { ...it, [k]: v } : it)) } : g,
      ),
    }))
  const addItem = (gi) => setSop((p) => ({ ...p, procGroups: p.procGroups.map((g, j) => (j === gi ? { ...g, items: [...g.items, procItem()] } : g)) }))
  const delItem = (gi, ii) => setSop((p) => ({ ...p, procGroups: p.procGroups.map((g, j) => (j === gi ? { ...g, items: g.items.filter((_, m) => m !== ii) } : g)) }))
  const moveItem = (gi, ii, dir) =>
    setSop((p) => ({
      ...p,
      procGroups: p.procGroups.map((g, j) => {
        if (j !== gi) return g
        const k = ii + dir
        if (k < 0 || k >= g.items.length) return g
        const items = g.items.slice()
        ;[items[ii], items[k]] = [items[k], items[ii]]
        return { ...g, items }
      }),
    }))

  // Link a flow document (point 6) and remember its label.
  const linkFlow = (id) => {
    if (!id) {
      set({ flowRef: '' })
      return
    }
    const d = getDoc(id)
    const label = d?.flow?.section || d?.project?.template?.title || d?.name || ''
    set({ flowRef: id, flowLabel: label || sop.flowLabel })
  }

  // Pull point-7 items from the linked flow's steps into a group, preserving
  // descriptions already written for matching refs.
  const syncFromFlow = (gi = 0) => {
    if (!sop.flowRef) {
      notify && notify('Select a flow in Point 6 first')
      return
    }
    const d = getDoc(sop.flowRef)
    if (!d || !d.flow) {
      notify && notify('Flow not found')
      return
    }
    const existing = sop.procGroups[gi]?.items || []
    const items = deriveProcItems(d.flow, existing)
    if (!items.length) {
      notify && notify('That flow has no steps to pull yet')
      return
    }
    const label = sop.procGroups[gi]?.label || d.flow.section || ''
    setSop((p) => ({ ...p, procGroups: p.procGroups.map((g, j) => (j === gi ? { ...g, label, items } : g)) }))
    notify && notify(items.length + ' steps pulled from the flow')
  }

  const onLogoFile = (file) => {
    if (!file) return
    const rd = new FileReader()
    rd.onload = () => set({ logo: rd.result })
    rd.readAsDataURL(file)
  }

  const saveNew = () => {
    const project = blankProject()
    project.header.processName = sop.title || sop.docNo || 'SOP Detail'
    const d = createDoc(project, { docType: 'SOPDETAIL', sopdetail: sop })
    setSavedId(d.id)
    setOpenId && setOpenId(d.id)
    notify && notify('SOP saved as ' + d.id)
  }
  const newSop = () => {
    setSop(blankSopDetail())
    setSavedId('')
    setOpenId && setOpenId(null)
  }
  const loadSample = () => {
    setSop(sampleSopDetail())
    setSavedId('')
    setOpenId && setOpenId(null)
  }

  const exportName = sop.docNo || sop.title || 'sop-detail'

  // ---- collapsible section shell ----
  const toggleSec = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }))
  const jumpTo = (id) => {
    setCollapsed((c) => ({ ...c, [id]: false }))
    setActiveSec(id)
    const el = secRefs.current[id]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const Card = ({ id, right, children }) => {
    const meta = SECTIONS.find((x) => x.id === id) || {}
    const open = !collapsed[id]
    return (
      <section className="sd-card" ref={(el) => (secRefs.current[id] = el)}>
        <header className="sd-card-hd" onClick={() => toggleSec(id)}>
          <div className="sd-card-titles">
            <div className="sd-card-title">{meta.title}</div>
            {meta.desc ? <div className="sd-card-desc">{meta.desc}</div> : null}
          </div>
          {right ? <div className="sd-card-right" onClick={(e) => e.stopPropagation()}>{right}</div> : null}
          <span className="sd-card-caret">{open ? '▾' : '▸'}</span>
        </header>
        {open ? <div className="sd-card-body">{children}</div> : null}
      </section>
    )
  }
  const addBtn = (fn, label) => (
    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); fn() }}>{label}</button>
  )

  return (
    <div className="fl-page">
      <div className="fl-page-hd">
        <div>
          <h1>SOP Detail</h1>
          <p>Build the full SOP body — from document header to process description. The flow diagram (Point 6) is pulled from the Auto Flow Process menu.</p>
        </div>
        <div className="fl-page-actions">
          <button className="btn btn-sm" onClick={loadSample}>Load sample</button>
          <button className="btn btn-sm" onClick={newSop}>New SOP</button>
          {savedId ? (
            <span className="chip chip-id" title="Auto-saved">✓ {savedId}</span>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={saveNew}>Save to Repository</button>
          )}
        </div>
      </div>

      <div className="fl-split">
        {/* ---- input form ---- */}
        <div className="fl-form sd-form" ref={formRef}>
          {/* jump-nav */}
          <div className="sd-nav">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={'sd-navchip' + (activeSec === s.id ? ' on' : '')}
                onClick={() => jumpTo(s.id)}
                title={s.title}
              >
                {s.tag}
              </button>
            ))}
          </div>

          {/* Kepala dokumen */}
          <Card id="head">
            <div className="sd-grid">
              <Field label="Document Number" value={sop.docNo} onChange={(v) => set({ docNo: v })} placeholder="ITM-SOP-SCM-2026-004" />
              <Field label="Judul SOP" value={sop.title} onChange={(v) => set({ title: v })} placeholder="Fuel Supply" />
              <Field label="Issued Date" value={sop.issuedDate} onChange={(v) => set({ issuedDate: v })} placeholder="10-05-2026" />
              <Field label="Revision" value={sop.revision} onChange={(v) => set({ revision: v })} placeholder="00" />
              <Field label="Revision Date" value={sop.revisionDate} onChange={(v) => set({ revisionDate: v })} placeholder="-" />
              <label className="sd-f">
                <span className="sd-f-lbl">Logo</span>
                <div className="sd-logo">
                  {sop.logo ? <img src={sop.logo} alt="logo" /> : <span className="sd-logo-ph">None yet</span>}
                  <button className="btn btn-sm" onClick={() => logoRef.current && logoRef.current.click()}>{sop.logo ? 'Ganti' : 'Upload'}</button>
                  {sop.logo ? <button className="btn btn-sm" onClick={() => set({ logo: '' })}>Hapus</button> : null}
                </div>
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { onLogoFile(e.target.files[0]); e.target.value = '' }} />
              </label>
            </div>
          </Card>

          {/* Document History */}
          <Card id="hist" right={addBtn(addHist, '+ Baris')}>
            <table className="sd-table">
              <colgroup><col style={{ width: 80 }} /><col style={{ width: 100 }} /><col /><col style={{ width: 34 }} /></colgroup>
              <thead><tr><th>Revision</th><th>Date</th><th>Historical Changes</th><th /></tr></thead>
              <tbody>
                {sop.history.map((h, i) => (
                  <tr key={h.id}>
                    <td><input value={h.revision} onChange={(e) => setHist(i, 'revision', e.target.value)} /></td>
                    <td><input value={h.date} onChange={(e) => setHist(i, 'date', e.target.value)} /></td>
                    <td><input value={h.changes} onChange={(e) => setHist(i, 'changes', e.target.value)} /></td>
                    <td className="sd-rowact"><button className="sd-del" title="Delete" onClick={() => delHist(i)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Approvals */}
          <Card id="appr">
            <div className="sd-approvegrid">
              {APPROVAL_ROLES.map((r) => (
                <div className="sd-approvecard" key={r.key}>
                  <div className="sd-approvecard-hd">{r.label}</div>
                  <label className="sd-f"><span className="sd-f-lbl">Nama</span><input value={sop.approvals[r.key]?.name || ''} onChange={(e) => setApproval(r.key, 'name', e.target.value)} placeholder="Full name" /></label>
                  <label className="sd-f"><span className="sd-f-lbl">Jabatan</span><input value={sop.approvals[r.key]?.position || ''} onChange={(e) => setApproval(r.key, 'position', e.target.value)} placeholder="Position" /></label>
                </div>
              ))}
            </div>
          </Card>

          {/* Distribution & PPI */}
          <Card id="dist">
            <div className="sd-grid">
              <Area label="Document Distribution" value={sop.distribution} onChange={(v) => set({ distribution: v })} rows={4} hint="one recipient per line" placeholder={'All Directors\nAll Head of Organization Unit (Head Office and Site)'} />
              <Area label="Process Performance Indicator (PPI)" value={sop.ppi} onChange={(v) => set({ ppi: v })} rows={4} hint="one point per line" placeholder={'Ensure no delay ... (Time)\nEnsure no incident ... (Qty)'} />
            </div>
          </Card>

          {/* 1. Purpose */}
          <Card id="s1">
            <div className="sd-grid">
              <Area label="Purpose" value={sop.purpose} onChange={(v) => set({ purpose: v })} rows={5} hint="one point per line → becomes 1.1, 1.2, …" />
            </div>
          </Card>

          {/* 2. Scope */}
          <Card id="s2">
            <div className="sd-grid">
              <Area label="Scope" value={sop.scope} onChange={(v) => set({ scope: v })} rows={5} hint="blank line = new paragraph" />
            </div>
          </Card>

          {/* 3. Definition */}
          <Card id="s3" right={addBtn(addDef, '+ Definisi')}>
            {sop.definitions.map((d, i) => (
              <div className="sd-defrow" key={d.id}>
                <span className="sd-defnum">3.{i + 1}</span>
                <div className="sd-defcol">
                  <input className="sd-deftitle" value={d.term} placeholder="Term (e.g. Fuel Supply)" onChange={(e) => setDef(i, 'term', e.target.value)} />
                  <textarea className="sd-defdesc" rows={2} value={d.definition} placeholder="Definition…" onChange={(e) => setDef(i, 'definition', e.target.value)} />
                </div>
                {sop.definitions.length > 1 ? <button className="sd-del" title="Delete" onClick={() => delDef(i)}>✕</button> : <span className="sd-del-sp" />}
              </div>
            ))}
          </Card>

          {/* 4. References */}
          <Card id="s4">
            <div className="sd-grid">
              <Area label="References" value={sop.references} onChange={(v) => set({ references: v })} rows={5} hint="one reference per line → 4.1, 4.2, …" />
            </div>
          </Card>

          {/* 5. Review & Validation */}
          <Card id="s5">
            <div className="sd-grid">
              <Area label="Review and Validation" value={sop.reviewValidation} onChange={(v) => set({ reviewValidation: v })} rows={4} />
            </div>
          </Card>

          {/* 6. Flow Process — link */}
          <Card id="s6">
            <div className="sd-note">
              The flow diagram is built in the <b>Auto Flow Process</b> menu. Pick the flow to link — <b>Point 7</b> can then be pulled straight from its steps.
            </div>
            <div className="sd-grid">
              <label className="sd-f sd-f-span">
                <span className="sd-f-lbl">Linked flow</span>
                <select className="sd-select" value={sop.flowRef} onChange={(e) => linkFlow(e.target.value)}>
                  <option value="">{flowDocs.length ? '— pilih flow —' : '— belum ada flow tersimpan —'}</option>
                  {flowDocs.map((d) => (
                    <option key={d.id} value={d.id}>{d.id} · {d.name}</option>
                  ))}
                </select>
              </label>
              <Field label="Flow label (shown in document)" value={sop.flowLabel} onChange={(v) => set({ flowLabel: v })} placeholder="C3.2 Fuel Supply" span />
            </div>
            {sop.flowRef ? (
              <div className="sd-linked">
                <span className="sd-linked-badge">✓ Linked</span>
                <span>{sop.flowLabel || getDoc(sop.flowRef)?.name} <span className="sd-linked-id">({sop.flowRef})</span></span>
                <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => syncFromFlow(0)}>↻ Pull steps into Point 7</button>
              </div>
            ) : !flowDocs.length ? (
              <div className="sd-note sd-note-warn">No saved flow yet. Open the <b>Auto Flow Process</b> menu, build & save a flow, then come back here — it will appear in the dropdown automatically.</div>
            ) : null}
          </Card>

          {/* 7. Process Description & Control */}
          <Card id="s7" right={addBtn(addGroup, '+ Sub-grup')}>
            <div className="sd-note">Each item = one step in Point 6. Click <b>Pull from Flow</b> to generate them automatically from the linked flow; descriptions you already wrote are kept.</div>
            {sop.procGroups.map((g, gi) => (
              <div className="sd-group" key={g.id}>
                <div className="sd-group-hd">
                  <span className="sd-group-tag">7.{gi + 1}</span>
                  <input className="sd-group-label" value={g.label} placeholder="Sub-group name — e.g. Fleet Management" onChange={(e) => setGroup(gi, 'label', e.target.value)} />
                  <button className="btn btn-sm btn-primary" onClick={() => syncFromFlow(gi)}>↻ Pull from Flow</button>
                  {sop.procGroups.length > 1 ? <button className="sd-del" title="Delete group" onClick={() => delGroup(gi)}>✕</button> : null}
                </div>
                {g.items.map((it, ii) => (
                  <div className="sd-itemrow" key={it.id}>
                    <input className="sd-itemref" value={it.ref} placeholder="7.1.1" onChange={(e) => setItem(gi, ii, 'ref', e.target.value)} />
                    <div className="sd-itemcol">
                      <input className="sd-itemtitle" value={it.title} placeholder="Step title" onChange={(e) => setItem(gi, ii, 'title', e.target.value)} />
                      <textarea className="sd-itemdesc" rows={2} value={it.description} placeholder="Process description & control…" onChange={(e) => setItem(gi, ii, 'description', e.target.value)} />
                    </div>
                    <div className="sd-itemact">
                      <button className="sd-del" title="Move up" onClick={() => moveItem(gi, ii, -1)}>↑</button>
                      <button className="sd-del" title="Move down" onClick={() => moveItem(gi, ii, 1)}>↓</button>
                      <button className="sd-del" title="Delete" onClick={() => delItem(gi, ii)}>✕</button>
                    </div>
                  </div>
                ))}
                <button className="btn btn-sm sd-additem" onClick={() => addItem(gi)}>+ Item</button>
              </div>
            ))}
          </Card>

          {/* 8. Related documents */}
          <Card id="s8">
            <div className="sd-grid">
              <Area label="Related / Supporting Document" value={sop.relatedDocs} onChange={(v) => set({ relatedDocs: v })} rows={4} hint="one document per line → 8.1, 8.2, …" />
            </div>
          </Card>

          {sopDocs.length ? (
            <div className="sd-saved-wrap">
              <div className="sd-saved-lbl">Saved SOPs</div>
              <div className="fl-saved">
                {sopDocs.map((d) => (
                  <button key={d.id} className={'fl-saved-item' + (d.id === savedId ? ' on' : '')} onClick={() => setOpenId && setOpenId(d.id)}>
                    <span className="chip chip-id">{d.id}</span> {d.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div style={{ height: 32 }} />
        </div>

        {/* ---- live preview ---- */}
        <div className="fl-preview">
          <SopDetailDoc sop={sop} notify={notify} onExportName={exportName} />
        </div>
      </div>
    </div>
  )
}
