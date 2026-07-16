// High Level Business Process — renders the company value chain: a title block
// plus a stack of bands (Management / Core / Enabler). Each band has a navy
// header and a light tray of coded boxes (badge + name). Highlighted boxes get
// a blue outline. Exports to PNG (html-to-image).
import { useRef } from 'react'
import { useZoom, ZoomCtl } from './ZoomCtl.jsx'
import * as htmlToImage from 'html-to-image'
import { download } from '../lib/generate.js'
import { normHlp } from '../lib/hlp.js'

export default function HlpChart({ hlp, onExportName, notify }) {
  const zoom = useZoom()
  const h = normHlp(hlp)
  const captureRef = useRef(null)

  const exportPng = async () => {
    try {
      const dataUrl = await htmlToImage.toPng(captureRef.current, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true })
      const blob = await (await fetch(dataUrl)).blob()
      download((onExportName || 'high-level-process') + '.png', blob)
      notify && notify('PNG exported')
    } catch (err) {
      console.error(err)
      notify && notify('PNG export failed: ' + err.message)
    }
  }

  return (
    <div className="fl-wrap">
      <div className="fl-toolbar fl-noexport">
        <span style={{ fontWeight: 800, color: '#0f2a43', fontSize: 13.5 }}>{h.title || 'High Level Business Process'}</span>
        <div style={{ marginLeft: 'auto' }}>
          <ZoomCtl zoom={zoom} />
          <button className="btn btn-sm btn-primary" onClick={exportPng}>Export PNG</button>
        </div>
      </div>

      <div className="doc-scroll">
        <div className="zoom-stage" style={{ transform: `scale(${zoom.z})` }}>
        <div ref={captureRef} className="hlp-doc">
          <div className="hlp-title">{h.title || 'High Level Business Process'}</div>
          {h.subtitle ? <div className="hlp-sub">{h.subtitle}</div> : null}

          {h.bands.map((band) => (
            <div key={band.id} className="hlp-band">
              <div className="hlp-band-hd">{band.name}</div>
              <div className="hlp-tray">
                {band.items.length ? (
                  band.items.map((it) => (
                    <div key={it.id} className={'hlp-box' + (it.hi ? ' hlp-hi' : '')}>
                      {it.code ? <span className="hlp-badge">{it.code}</span> : null}
                      <span className="hlp-box-name">{it.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="hlp-tray-empty">—</div>
                )}
              </div>
            </div>
          ))}

          {h.footnote ? <div className="hlp-foot">{h.footnote}</div> : null}
        </div>
      </div>
      </div>
    </div>
  )
}
