// Business Process Taxonomy — renders the L0 → L3 hierarchy diagram. A left rail
// of level labels (L0…L3) sits beside two spanning bands (L0 core-process label
// + L1 process-group label) and a column grid: one L2 category box per column
// with its stack of L3 boxes below. Exports the diagram to PNG (html-to-image).
import { useRef } from 'react'
import { useZoom, ZoomCtl } from './ZoomCtl.jsx'
import * as htmlToImage from 'html-to-image'
import { download } from '../lib/generate.js'
import { normTaxonomy } from '../lib/taxonomy.js'

export default function TaxonomyChart({ taxonomy, onExportName, notify }) {
  const zoom = useZoom()
  const t = normTaxonomy(taxonomy)
  const captureRef = useRef(null)
  const cols = t.columns.length || 1
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }

  const exportPng = async () => {
    try {
      const dataUrl = await htmlToImage.toPng(captureRef.current, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true })
      const blob = await (await fetch(dataUrl)).blob()
      download((onExportName || 'taxonomy') + '.png', blob)
      notify && notify('PNG exported')
    } catch (err) {
      console.error(err)
      notify && notify('PNG export failed: ' + err.message)
    }
  }

  return (
    <div className="fl-wrap">
      <div className="fl-toolbar fl-noexport">
        <span style={{ fontWeight: 800, color: '#0f2a43', fontSize: 13.5 }}>{t.title || 'Business Process Taxonomy'}</span>
        <div style={{ marginLeft: 'auto' }}>
          <ZoomCtl zoom={zoom} />
          <button className="btn btn-sm btn-primary" onClick={exportPng}>Export PNG</button>
        </div>
      </div>

      <div className="doc-scroll">
        <div className="zoom-stage" style={{ transform: `scale(${zoom.z})` }}>
        <div ref={captureRef} className="tx-doc">
          <div className="tx-title">{t.title || 'Business Process Taxonomy'}</div>

          {/* L0 band */}
          <div className="tx-line">
            <div className="tx-rail">L0</div>
            <div className="tx-band tx-l0">{t.l0 || 'Core Process'}</div>
          </div>

          {/* L1 band */}
          <div className="tx-line">
            <div className="tx-rail">L1</div>
            <div className="tx-band tx-l1">{t.l1}</div>
          </div>

          {/* L2 row */}
          <div className="tx-line">
            <div className="tx-rail">L2</div>
            <div className="tx-cols" style={gridStyle}>
              {t.columns.map((c) => (
                <div key={c.id} className={'tx-l2 tx-box' + (c.l2.hi ? ' tx-hi' : '')}>
                  {c.l2.code ? <div className="tx-code">{c.l2.code}</div> : null}
                  <div className="tx-name">{c.l2.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* L3 rows */}
          <div className="tx-line tx-line-l3">
            <div className="tx-rail tx-rail-tall">L3</div>
            <div className="tx-cols" style={gridStyle}>
              {t.columns.map((c) => (
                <div key={c.id} className="tx-l3col">
                  {c.l3.map((b) => (
                    <div key={b.id} className={'tx-l3 tx-box' + (b.hi ? ' tx-hi' : '')}>
                      {b.code ? <div className="tx-code">{b.code}</div> : null}
                      <div className="tx-name">{b.name}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
