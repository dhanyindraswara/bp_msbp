// Auto Flow Process — renders a laid-out swimlane flowchart inside the company
// document template (title block + symbol legend + lane columns), matching the
// reference SOP flow. Pure presentation: it draws whatever layoutFlow() returns.
// Exports the whole document to PNG (same html-to-image approach as ProcessMap).
import { useMemo, useRef } from 'react'
import * as htmlToImage from 'html-to-image'
import { layoutFlow, pointsToPath, LANE_W } from '../lib/flow.js'
import { download } from '../lib/generate.js'
import { RASCI_COLOR } from '../lib/constants.js'

function DefaultLogo() {
  return (
    <svg viewBox="0 0 180 60" style={{ height: 42, maxWidth: '100%' }} aria-label="logo">
      <path d="M8 46 C 20 8, 40 8, 47 46 Z" fill="#22a6de" />
      <path d="M20 46 C 31 16, 49 16, 55 46 Z" fill="#0f5aa8" />
      <text x="70" y="43" fontFamily="Segoe UI, Arial" fontWeight="800" fontSize="30" fill="#0f2a43">
        ITM
      </text>
    </svg>
  )
}

// --- symbol legend (the strip of shape meanings at the top of the template) ---
const SYMBOLS = [
  { k: 'start', label: 'Start/End' },
  { k: 'connector', label: 'Connector' },
  { k: 'system', label: 'Process\n(by/to System)' },
  { k: 'process', label: 'Process\n(without System)' },
  { k: 'subprocess', label: 'Sub Process' },
  { k: 'inform', label: 'Inform/Verbal Comm.' },
  { k: 'decision', label: 'Decision' },
  { k: 'offpage', label: 'Off-Page Reference' },
  { k: 'onpage', label: 'On-Page Reference' },
]

function SymbolGlyph({ k }) {
  switch (k) {
    case 'start':
      return <div className="fl-g fl-g-pill" />
    case 'connector':
      return (
        <svg width="52" height="18" viewBox="0 0 52 18">
          <line x1="2" y1="9" x2="44" y2="9" stroke="#333" strokeWidth="1.4" />
          <path d="M44 4 L50 9 L44 14 Z" fill="#333" />
        </svg>
      )
    case 'system':
      return (
        <div className="fl-g fl-g-box">
          <span className="fl-g-hdr" />
          <span className="fl-g-sys" />
        </div>
      )
    case 'process':
      return (
        <div className="fl-g fl-g-box">
          <span className="fl-g-hdr" />
        </div>
      )
    case 'subprocess':
      return <div className="fl-g fl-g-box fl-g-sub" />
    case 'inform':
      return <PersonIcon />
    case 'decision':
      return <div className="fl-g fl-g-dec" />
    case 'offpage':
      return <div className="fl-g fl-g-offpage" />
    case 'onpage':
      return <div className="fl-g fl-g-onpage" />
    default:
      return null
  }
}

function PersonIcon() {
  return (
    <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden>
      <circle cx="13" cy="6" r="4.4" fill="none" stroke="#333" strokeWidth="1.4" />
      <path d="M13 11 L13 22 M4 15 L22 15 M13 22 L6 29 M13 22 L20 29" fill="none" stroke="#333" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function SymbolLegend() {
  return (
    <div className="fl-symbols">
      <div className="fl-symbols-title">Symbol</div>
      <div className="fl-symbols-row">
        {SYMBOLS.map((s) => (
          <div key={s.k} className="fl-symbol">
            <div className="fl-symbol-head">{s.label}</div>
            <div className="fl-symbol-body">
              <SymbolGlyph k={s.k} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- a single laid-out step, drawn as its shape ---
function StepNode({ n }) {
  const style = { left: n.x, top: n.y, width: n.w, height: n.h }
  if (n.type === 'start' || n.type === 'end') {
    return (
      <div className="fl-node fl-pill" style={style}>
        {n.activity || (n.type === 'start' ? 'Start' : 'End')}
      </div>
    )
  }
  if (n.type === 'decision') {
    return (
      <div className="fl-node fl-decision" style={style}>
        <div className="fl-decision-inner" />
        <div className="fl-decision-text">{n.activity}</div>
      </div>
    )
  }
  if (n.type === 'offpage' || n.type === 'onpage') {
    return (
      <div className={'fl-node fl-ref fl-ref-' + n.type} style={style}>
        <span>{n.ref || n.no || n.activity}</span>
      </div>
    )
  }
  if (n.type === 'inform') {
    return (
      <div className="fl-node fl-inform" style={style}>
        <PersonIcon />
        <div className="fl-inform-text">{n.activity}</div>
      </div>
    )
  }
  // process / system / subprocess: 3-cell header + activity body
  const rc = RASCI_COLOR[(n.rasci || '').replace('/', '').charAt(0)] || null
  return (
    <div className={'fl-node fl-box' + (n.type === 'subprocess' ? ' fl-box-sub' : '')} style={style}>
      <div className="fl-box-head">
        <span className="fl-box-no">{n.no}</span>
        <span className="fl-box-rasci" style={rc ? { background: rc.bg, color: rc.fg } : undefined}>
          {n.rasci}
        </span>
        <span className="fl-box-ref">{n.ref}</span>
      </div>
      {n.type === 'system' ? <div className="fl-box-sysbar" /> : null}
      <div className="fl-box-body">{n.activity}</div>
    </div>
  )
}

export default function FlowChart({ flow, template, onExportName, notify }) {
  const layout = useMemo(() => layoutFlow(flow), [flow])
  const captureRef = useRef(null)
  const tpl = template || {}

  const exportPng = async () => {
    try {
      const el = captureRef.current
      const dataUrl = await htmlToImage.toPng(el, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      download((onExportName || 'flow-process') + '.png', blob)
      notify && notify('PNG exported')
    } catch (err) {
      console.error(err)
      notify && notify('PNG export failed: ' + err.message)
    }
  }

  const titleText = tpl.title || flow.section || ''

  return (
    <div className="fl-wrap">
      <div className="fl-toolbar">
        <span style={{ fontWeight: 800, color: '#0f2a43', fontSize: 13.5 }}>{titleText || 'Flow process'}</span>
        <span className="map-hint">Auto-generated from your steps · drawn to the SOP flow template</span>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-sm btn-primary" onClick={exportPng}>
            Export PNG
          </button>
        </div>
      </div>

      <div className="doc-scroll">
        <div ref={captureRef} className="fl-doc">
          {/* title block */}
          <div className="tb">
            <div className="tb-row1">
              <div className="tb-logo">{tpl.logo ? <img className="tb-logo-img" src={tpl.logo} alt="logo" /> : <DefaultLogo />}</div>
              <div className="tb-title">
                <div className="tb-level">{tpl.level || 'BUSINESS PROCESS LEVEL 3'}</div>
                <div className="tb-name">{titleText || 'FLOW TITLE'}</div>
              </div>
              {[
                ['Prepared by,', tpl.preparedBy],
                ['Reviewed by,', tpl.reviewedBy],
                ['Approved by,', tpl.approvedBy],
              ].map(([lb, v]) => (
                <div key={lb} className="tb-appr">
                  <div className="tb-appr-lb">{lb}</div>
                  <div className="tb-appr-val">{v || '—'}</div>
                </div>
              ))}
            </div>
            <div className="tb-row2">
              <div className="tb-c tb-c-lb">Business Process No.</div>
              <div className="tb-c tb-c-val">{tpl.bpNo || '—'}</div>
              <div className="tb-c tb-c-lb">Effective Date:</div>
              <div className="tb-c tb-c-val">{tpl.effectiveDate || '—'}</div>
              <div className="tb-c tb-c-lb">Revision :</div>
              <div className="tb-c tb-c-val" style={{ flex: '0 0 70px' }}>
                {tpl.revision || '00'}
              </div>
            </div>
          </div>

          {/* symbol legend */}
          <SymbolLegend />

          {/* section band */}
          <div className="fl-section-band">{flow.section || titleText || 'Process'}</div>

          {/* swimlane grid */}
          <div className="fl-lanes-hd" style={{ width: layout.width }}>
            {layout.lanes.map((ln, i) => (
              <div key={i} className="fl-lane-hd" style={{ width: LANE_W }}>
                {ln}
              </div>
            ))}
          </div>

          <div className="fl-canvas" style={{ width: layout.width, height: layout.height }}>
            {/* lane divider columns */}
            {layout.lanes.map((ln, i) => (
              <div key={i} className="fl-lane-col" style={{ left: i * LANE_W, width: LANE_W }} />
            ))}

            {/* connectors */}
            <svg className="fl-edges" width={layout.width} height={layout.height}>
              <defs>
                <marker id="fl-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
                  <path d="M1 1 L8 4.5 L1 8 Z" fill="#333" />
                </marker>
              </defs>
              {layout.edges.map((e) => {
                const mid = e.points[Math.floor(e.points.length / 2) - 1] || e.points[0]
                return (
                  <g key={e.id}>
                    <path d={pointsToPath(e.points)} fill="none" stroke="#333" strokeWidth="1.4" markerEnd="url(#fl-arrow)" />
                    {e.label ? (
                      <text className="fl-edge-label" x={mid[0] + 4} y={mid[1] - 4}>
                        {e.label}
                      </text>
                    ) : null}
                  </g>
                )
              })}
            </svg>

            {/* nodes */}
            {layout.nodes.map((n) => (
              <StepNode key={n.id} n={n} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
