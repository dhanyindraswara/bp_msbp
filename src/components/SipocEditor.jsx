// SIPOC editor — the single source of truth. Header fields, a 5-column editable
// grid (paste from Excel supported), a separate PPI editor, and .xlsx/.csv import.
import { useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { uid } from '../lib/constants.js'

// A textarea that grows to fit its content.
function AutoTextarea(props) {
  const ref = useRef(null)
  const fit = (el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.max(38, el.scrollHeight) + 'px'
  }
  useEffect(() => {
    fit(ref.current)
  })
  return <textarea {...props} ref={ref} rows={1} onInput={(e) => fit(e.target)} />
}

const cols = ['supplier', 'input', 'process', 'output', 'customer']

export default function SipocEditor({ project, setProject, notify, goGenerate }) {
  const setHeader = (k, v) => setProject((p) => ({ ...p, header: { ...p.header, [k]: v } }))
  const setCell = (ri, key, v) =>
    setProject((p) => {
      const s = p.sipoc.map((r) => ({ ...r }))
      s[ri][key] = v
      return { ...p, sipoc: s }
    })
  const addRow = () =>
    setProject((p) => ({
      ...p,
      sipoc: [...p.sipoc, { id: uid(), supplier: '', input: '', process: '', output: '', customer: '' }],
    }))
  const delRow = (ri) =>
    setProject((p) => ({
      ...p,
      sipoc: p.sipoc.filter((_, i) => i !== ri).length
        ? p.sipoc.filter((_, i) => i !== ri)
        : [{ id: uid(), supplier: '', input: '', process: '', output: '', customer: '' }],
    }))
  const onPaste = (e, ri, ci) => {
    const text = e.clipboardData.getData('text')
    if (!text || (!text.includes('\t') && !text.includes('\n'))) return
    e.preventDefault()
    const lines = text.replace(/\r/g, '').split('\n')
    while (lines.length && lines[lines.length - 1] === '') lines.pop()
    setProject((p) => {
      const s = p.sipoc.map((r) => ({ ...r }))
      lines.forEach((line, li) => {
        const cells = line.split('\t')
        const r = ri + li
        while (s.length <= r) s.push({ id: uid(), supplier: '', input: '', process: '', output: '', customer: '' })
        cells.forEach((val, cj) => {
          const key = cols[ci + cj]
          if (key) s[r][key] = val.trim()
        })
      })
      return { ...p, sipoc: s }
    })
  }

  // PPI
  const setPpi = (ri, key, v) =>
    setProject((p) => {
      const s = p.ppi.map((r) => ({ ...r }))
      s[ri][key] = v
      return { ...p, ppi: s }
    })
  const addPpi = () => setProject((p) => ({ ...p, ppi: [...(p.ppi || []), { id: uid(), process: '', indicator: '' }] }))
  const delPpi = (ri) => setProject((p) => ({ ...p, ppi: p.ppi.filter((_, i) => i !== ri) }))

  const fileRef = useRef(null)
  const doImport = async (file) => {
    try {
      let wb
      const name = (file.name || '').toLowerCase()
      if (name.endsWith('.csv')) {
        const txt = await file.text()
        wb = XLSX.read(txt, { type: 'string' })
      } else {
        const buf = await file.arrayBuffer()
        wb = XLSX.read(buf, { type: 'array' })
      }
      const first = wb.Sheets[wb.SheetNames[0]]
      const aoa = XLSX.utils.sheet_to_json(first, { header: 1, defval: '' })
      const norm = (v) => ('' + v).toLowerCase().trim()
      let hi = -1
      const cmap = {}
      for (let i = 0; i < aoa.length; i++) {
        const low = aoa[i].map(norm)
        if (low.includes('suppliers') && low.includes('process')) {
          hi = i
          ;['suppliers', 'inputs', 'process', 'outputs', 'customers'].forEach((kk) => {
            cmap[kk] = low.indexOf(kk)
          })
          break
        }
      }
      const header = {}
      for (let i = 0; i < Math.min(aoa.length, 25); i++) {
        for (let j = 0; j < aoa[i].length; j++) {
          const cell = '' + aoa[i][j]
          const v = norm(cell)
          const nxt = ('' + (aoa[i][j + 1] || '')).trim()
          if (v.includes('process name')) header.processName = nxt || cell.split(':')[1]?.trim() || header.processName
          if (v.includes('process owner')) header.processOwner = nxt || cell.split(':')[1]?.trim() || header.processOwner
          if (v.startsWith('version')) header.version = nxt || cell.split(':')[1]?.trim() || header.version
        }
      }
      const sipoc = []
      if (hi >= 0) {
        for (let i = hi + 1; i < aoa.length; i++) {
          const row = aoa[i] || []
          const g = (kk) => ('' + (row[cmap[kk]] || '')).trim()
          const r = {
            id: uid(),
            supplier: g('suppliers'),
            input: g('inputs'),
            process: g('process'),
            output: g('outputs'),
            customer: g('customers'),
          }
          if (r.supplier || r.input || r.process || r.output || r.customer) sipoc.push(r)
        }
      }
      let lp = ''
      sipoc.forEach((r) => {
        if (r.process) lp = r.process
        else r.process = lp
      })
      const ppi = []
      const pn = wb.SheetNames.find((n) => /ppi/i.test(n))
      if (pn) {
        const paoa = XLSX.utils.sheet_to_json(wb.Sheets[pn], { header: 1, defval: '' })
        let phi = -1,
          pc = 0,
          ic = 1
        for (let i = 0; i < paoa.length; i++) {
          const low = paoa[i].map(norm)
          if (low.some((x) => x.includes('indicator')) || low.includes('process')) {
            phi = i
            pc = low.indexOf('process')
            ic = low.findIndex((x) => x.includes('indicator'))
            if (pc < 0) pc = 0
            if (ic < 0) ic = pc + 1
            break
          }
        }
        for (let i = phi < 0 ? 0 : phi + 1; i < paoa.length; i++) {
          const row = paoa[i] || []
          const proc = ('' + (row[pc] || '')).trim()
          const ind = ('' + (row[ic] || '')).trim()
          if (!proc && !ind) continue
          ppi.push({ id: uid(), process: proc, indicator: ind })
        }
      }
      setProject((p) => ({
        ...p,
        header: { ...p.header, ...header },
        sipoc: sipoc.length ? sipoc : p.sipoc,
        ppi: ppi.length ? ppi : p.ppi,
        positions: {},
        flows: [],
      }))
      notify('Imported ' + sipoc.length + ' SIPOC rows' + (ppi.length ? ' · ' + ppi.length + ' PPI' : ''))
    } catch (err) {
      console.error(err)
      notify('Import failed: ' + err.message)
    }
  }

  return (
    <div className="pane">
      <div className="hd-grid">
        <div className="fld">
          <label>Process name</label>
          <input
            value={project.header.processName}
            onChange={(e) => setHeader('processName', e.target.value)}
            placeholder="e.g. HSE Marine & Logistic"
          />
        </div>
        <div className="fld">
          <label>Process owner</label>
          <input
            value={project.header.processOwner}
            onChange={(e) => setHeader('processOwner', e.target.value)}
            placeholder="e.g. C4. HSE Marine & Logistic"
          />
        </div>
        <div className="fld">
          <label>Version</label>
          <input
            value={project.header.version}
            onChange={(e) => setHeader('version', e.target.value)}
            placeholder="1.0"
          />
        </div>
      </div>

      <div className="sec-h">
        <h3>SIPOC table</h3>
        <span className="hint">One row = one relation. Paste directly from Excel.</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            ref={fileRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files[0]
              if (f) doImport(f)
              e.target.value = ''
            }}
          />
          <button className="btn btn-sm" onClick={() => fileRef.current && fileRef.current.click()}>
            Import .xlsx / .csv
          </button>
          <button className="btn btn-sm" onClick={addRow}>
            + Add row
          </button>
          <button className="btn btn-sm btn-primary" onClick={goGenerate}>
            Generate →
          </button>
        </div>
      </div>

      <table className="sipoc-grid">
        <colgroup>
          <col style={{ width: '3.5%' }} />
          <col style={{ width: '18.8%' }} />
          <col style={{ width: '18.8%' }} />
          <col style={{ width: '18.8%' }} />
          <col style={{ width: '18.8%' }} />
          <col style={{ width: '18.8%' }} />
          <col style={{ width: '3.5%' }} />
        </colgroup>
        <thead>
          <tr>
            <th className="tiny">#</th>
            <th>Suppliers</th>
            <th>Inputs</th>
            <th>Process</th>
            <th>Outputs</th>
            <th>Customers</th>
            <th className="tiny"></th>
          </tr>
        </thead>
        <tbody>
          {project.sipoc.map((r, ri) => (
            <tr key={r.id}>
              <td className="tiny" style={{ color: '#9aa4ae', fontWeight: 700, fontSize: 12 }}>
                {ri + 1}
              </td>
              {cols.map((key, ci) => (
                <td key={key}>
                  <AutoTextarea
                    value={r[key] || ''}
                    onChange={(e) => setCell(ri, key, e.target.value)}
                    onPaste={(e) => onPaste(e, ri, ci)}
                    placeholder=""
                  />
                </td>
              ))}
              <td className="tiny">
                <button className="rowdel" title="Delete row" onClick={() => delRow(ri)}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="sec-h" style={{ marginTop: 26 }}>
        <h3>Process Performance Indicator (PPI)</h3>
        <span className="hint">Leave Process blank to continue the process above.</span>
        <button className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={addPpi}>
          + Add indicator
        </button>
      </div>

      <table className="sipoc-grid">
        <colgroup>
          <col style={{ width: '32%' }} />
          <col style={{ width: '64%' }} />
          <col style={{ width: '4%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Process</th>
            <th>Indicator</th>
            <th className="tiny"></th>
          </tr>
        </thead>
        <tbody>
          {(project.ppi || []).length ? (
            project.ppi.map((r, ri) => (
              <tr key={r.id}>
                <td>
                  <AutoTextarea
                    value={r.process || ''}
                    onChange={(e) => setPpi(ri, 'process', e.target.value)}
                    placeholder="(same as above)"
                  />
                </td>
                <td>
                  <AutoTextarea value={r.indicator || ''} onChange={(e) => setPpi(ri, 'indicator', e.target.value)} />
                </td>
                <td className="tiny">
                  <button className="rowdel" onClick={() => delPpi(ri)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} style={{ padding: '14px', color: '#9aa4ae' }}>
                No indicators. Click “+ Add indicator”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
