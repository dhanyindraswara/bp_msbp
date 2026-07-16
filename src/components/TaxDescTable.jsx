// Taxonomy Description — renders the process-description matrix: a blue header
// row of process numbers, then one row per attribute (name, description, KPI,
// responsible, accountable) with a labelled left column. Multi-line values
// render as bullet lists. Exports to PNG (html-to-image).
import { useRef } from 'react'
import { useZoom, ZoomCtl } from './ZoomCtl.jsx'
import * as htmlToImage from 'html-to-image'
import { download } from '../lib/generate.js'
import { normTaxdesc, TAXDESC_ROWS } from '../lib/taxdesc.js'

// Render a cell value: multi-line + bullets → <ul>, otherwise plain text.
function CellValue({ value, bullets }) {
  const lines = (value || '').split('\n').map((s) => s.trim()).filter(Boolean)
  if (!lines.length) return <span className="td-empty">—</span>
  if (bullets && lines.length > 1) {
    return (
      <ul className="td-bullets">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    )
  }
  return (
    <>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </>
  )
}

export default function TaxDescTable({ taxdesc, onExportName, notify }) {
  const zoom = useZoom()
  const t = normTaxdesc(taxdesc)
  const captureRef = useRef(null)
  const procs = t.processes

  const exportPng = async () => {
    try {
      const dataUrl = await htmlToImage.toPng(captureRef.current, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true })
      const blob = await (await fetch(dataUrl)).blob()
      download((onExportName || 'taxonomy-description') + '.png', blob)
      notify && notify('PNG exported')
    } catch (err) {
      console.error(err)
      notify && notify('PNG export failed: ' + err.message)
    }
  }

  return (
    <div className="fl-wrap">
      <div className="fl-toolbar fl-noexport">
        <span style={{ fontWeight: 800, color: '#0f2a43', fontSize: 13.5 }}>{t.title || 'Taxonomy Description'}</span>
        <div style={{ marginLeft: 'auto' }}>
          <ZoomCtl zoom={zoom} />
          <button className="btn btn-sm btn-primary" onClick={exportPng}>Export PNG</button>
        </div>
      </div>

      <div className="doc-scroll">
        <div className="zoom-stage" style={{ transform: `scale(${zoom.z})` }}>
        <div ref={captureRef} className="td-doc">
          <div className="td-title">{t.title || 'Taxonomy Description'}</div>
          {t.subtitle ? <div className="td-sub">{t.subtitle}</div> : null}

          <table className="td-table">
            <colgroup>
              <col style={{ width: 190 }} />
              {procs.map((p) => (
                <col key={p.id} style={{ width: 210 }} />
              ))}
            </colgroup>
            <tbody>
              {/* header row: process numbers */}
              <tr className="td-head">
                <th className="td-rowlabel">Process Number</th>
                {procs.map((p) => (
                  <th key={p.id}>{p.number}</th>
                ))}
              </tr>
              {/* one row per attribute */}
              {TAXDESC_ROWS.map((row) => (
                <tr key={row.key} className={row.key === 'name' ? 'td-namerow' : ''}>
                  <td className="td-rowlabel">{row.label}</td>
                  {procs.map((p) => (
                    <td key={p.id} className={'td-cell' + (row.key === 'name' ? ' td-namecell' : '')}>
                      <CellValue value={p[row.key]} bullets={row.bullets} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  )
}
