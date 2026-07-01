// RASCI matrix — rows = sub-processes, columns = actors. Auto-generated with
// override dropdowns and exactly-one-A validation.
import { useMemo } from 'react'
import * as XLSX from 'xlsx'
import { C, RASCI_OPTS, RASCI_COLOR } from '../lib/constants.js'
import { distinct, isAdvisory } from '../lib/generate.js'

export default function Rasci({ project, setProject, derived, notify }) {
  const owner = (project.header.processOwner || '').trim()
  const actors = useMemo(
    () => distinct([...derived.suppliers, ...derived.customers, owner]).filter((a) => !derived.isProc(a)),
    [derived, owner],
  )
  const supSet = new Set(derived.suppliers.map((s) => s.toLowerCase()))
  const custSet = new Set(derived.customers.map((s) => s.toLowerCase()))
  const rows = derived.processes

  const autoVal = (procRaw, actor) => {
    const a = actor.toLowerCase()
    if (owner && a === owner.toLowerCase()) return 'A/R'
    if (isAdvisory(actor)) return 'C'
    if (supSet.has(a)) return 'S'
    if (custSet.has(a)) return 'I'
    return ''
  }
  const keyOf = (procRaw, actor) => procRaw + '||' + actor
  const val = (procRaw, actor) => {
    const k = keyOf(procRaw, actor)
    const o = project.rasciOverrides || {}
    return k in o ? o[k] : autoVal(procRaw, actor)
  }
  const setVal = (procRaw, actor, v) =>
    setProject((p) => {
      const o = { ...(p.rasciOverrides || {}) }
      o[keyOf(procRaw, actor)] = v
      return { ...p, rasciOverrides: o }
    })
  const resetAuto = () => {
    if (window.confirm('Reset all cells to auto-generated defaults?')) setProject((p) => ({ ...p, rasciOverrides: {} }))
  }

  const warnings = useMemo(() => {
    const w = []
    rows.forEach((pr) => {
      let aCount = 0,
        rCount = 0
      actors.forEach((a) => {
        const v = val(pr.raw, a)
        if (v && v.includes('A')) aCount++
        if (v && v.includes('R')) rCount++
      })
      const lbl = (pr.code ? pr.code + '. ' : '') + pr.name
      if (aCount !== 1) w.push('“' + lbl + '” has ' + aCount + ' Accountable (A) — exactly 1 required.')
      if (rCount === 0) w.push('“' + lbl + '” has no Responsible (R).')
    })
    return w
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, actors, project.rasciOverrides, owner])

  const buildAOA = () => {
    const head = ['Sub-process', ...actors]
    const body = rows.map((pr) => [(pr.code ? pr.code + '. ' : '') + pr.name, ...actors.map((a) => val(pr.raw, a))])
    return [head, ...body]
  }
  const exportBook = (type) => {
    const ws = XLSX.utils.aoa_to_sheet(buildAOA())
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'RASCI')
    XLSX.writeFile(wb, type === 'csv' ? 'itm-rasci.csv' : 'itm-rasci.xlsx', { bookType: type })
    notify(type.toUpperCase() + ' exported')
  }
  const copyTable = async () => {
    const tsv = buildAOA()
      .map((r) => r.join('\t'))
      .join('\n')
    try {
      await navigator.clipboard.writeText(tsv)
      notify('Copied to clipboard')
    } catch (e) {
      notify('Copy failed')
    }
  }

  if (!rows.length)
    return (
      <div className="pane">
        <div className="warn">
          No processes yet. Add rows with a Process value in the SIPOC editor, then Generate.
        </div>
      </div>
    )

  return (
    <div className="pane">
      <div className="sec-h">
        <h3>RASCI matrix</h3>
        <span className="hint">
          Rows = sub-process · Columns = actors (suppliers, customers, process owner). Change any cell with its
          dropdown.
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          <button className="btn btn-sm" onClick={resetAuto}>
            Reset to auto
          </button>
          <button className="btn btn-sm" onClick={copyTable}>
            Copy
          </button>
          <button className="btn btn-sm" onClick={() => exportBook('csv')}>
            Export CSV
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => exportBook('xlsx')}>
            Export XLSX
          </button>
        </div>
      </div>
      {warnings.length ? (
        <div className="warn" style={{ marginBottom: 12 }}>
          {warnings.map((w, i) => (
            <div key={i}>{'⚠ ' + w}</div>
          ))}
        </div>
      ) : null}
      <div style={{ overflow: 'auto', border: '1px solid #dbe0e5', borderRadius: 9, background: '#fff' }}>
        <table className="rasci">
          <thead>
            <tr>
              <th className="rowhd">Sub-process</th>
              {actors.map((a) => (
                <th key={a} title={a} style={{ maxWidth: 130 }}>
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((pr) => (
              <tr key={pr.raw}>
                <td className="rowhd">
                  {pr.code ? (
                    <span style={{ color: C.procBorder, fontWeight: 800, marginRight: 6 }}>{pr.code}</span>
                  ) : null}
                  {pr.name}
                </td>
                {actors.map((a) => {
                  const v = val(pr.raw, a)
                  const parts = (v || '').split('/').filter(Boolean)
                  const main = parts[0]
                  const col = main && RASCI_COLOR[main]
                  return (
                    <td key={a} className="cell" style={{ background: col ? col.bg : '#fff', position: 'relative' }}>
                      <select
                        className="rasci-sel"
                        value={v}
                        onChange={(e) => setVal(pr.raw, a, e.target.value)}
                        style={{ color: col ? col.fg : '#94a0ac' }}
                      >
                        {RASCI_OPTS.map((o) => (
                          <option key={o} value={o}>
                            {o || '—'}
                          </option>
                        ))}
                      </select>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 12.5, color: '#334155' }}>Legend:</span>
        {[
          ['R', 'Responsible'],
          ['A', 'Accountable'],
          ['S', 'Support'],
          ['C', 'Consulted'],
          ['I', 'Informed'],
        ].map(([k, name]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <span className="badge" style={{ background: RASCI_COLOR[k].bg, color: RASCI_COLOR[k].fg }}>
              {k}
            </span>
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
