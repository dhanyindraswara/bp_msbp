// Auto Flow Process — renders a laid-out swimlane flowchart inside the company
// document template (title block + symbol legend + lane columns), matching the
// reference SOP flow. When `interactive`, boxes can be dragged to reposition and
// double-clicked to rename. Exports the whole document to PNG (html-to-image).
import { useMemo, useRef, useState } from 'react'
import * as htmlToImage from 'html-to-image'
import { layoutFlow, LANE_W } from '../lib/flow.js'
import { roundedPath } from '../lib/router.js'
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
        <div className="fl-g fl-g-box fl-g-system">
          <span className="fl-g-hdr" />
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
      return (
        <svg width="46" height="30" viewBox="0 0 46 30">
          <polygon points="23,1 45,15 23,29 1,15" fill="#eef1f4" stroke="#8a929c" strokeWidth="1" />
        </svg>
      )
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
function StepNode({ n, interactive, dragging, onPointerDown, onRename }) {
  const style = { left: n.x, top: n.y, width: n.w, height: n.h }
  const common = {
    style,
    onPointerDown: interactive ? (e) => onPointerDown(e, n) : undefined,
    onDoubleClick: interactive ? (e) => { e.stopPropagation(); onRename(n) } : undefined,
    title: interactive ? 'Geser untuk pindah · klik dua kali untuk ganti nama' : undefined,
  }
  const cls = (base) => 'fl-node ' + base + (interactive ? ' fl-node-i' : '') + (dragging ? ' fl-node-drag' : '')

  if (n.type === 'start' || n.type === 'end') {
    return (
      <div className={cls('fl-pill')} {...common}>
        {n.activity || (n.type === 'start' ? 'Start' : 'End')}
      </div>
    )
  }
  if (n.type === 'decision') {
    return (
      <div className={cls('fl-decision')} {...common}>
        <svg className="fl-dec-svg" viewBox={`0 0 ${n.w} ${n.h}`} width={n.w} height={n.h} preserveAspectRatio="none">
          <polygon
            points={`${n.w / 2},1 ${n.w - 1},${n.h / 2} ${n.w / 2},${n.h - 1} 1,${n.h / 2}`}
            fill="#eef1f4"
            stroke="#8a929c"
            strokeWidth="1"
          />
        </svg>
        <div className="fl-decision-text">
          <span>{n.activity}</span>
        </div>
      </div>
    )
  }
  if (n.type === 'offpage' || n.type === 'onpage') {
    return (
      <div className={cls('fl-ref fl-ref-' + n.type)} {...common}>
        <span>{n.ref || n.no || n.activity}</span>
      </div>
    )
  }
  if (n.type === 'inform') {
    return (
      <div className={cls('fl-inform')} {...common}>
        <PersonIcon />
        <div className="fl-inform-text">{n.activity}</div>
      </div>
    )
  }
  // process / system / subprocess: 3-cell header + activity body
  const rc = RASCI_COLOR[(n.rasci || '').replace('/', '').charAt(0)] || null
  const variant = n.type === 'subprocess' ? ' fl-box-sub' : n.type === 'system' ? ' fl-box-system' : ''
  return (
    <div className={cls('fl-box' + variant)} {...common}>
      <div className="fl-box-head">
        <span className="fl-box-no">{n.no}</span>
        <span className="fl-box-rasci" style={rc ? { background: rc.bg, color: rc.fg } : undefined}>
          {n.rasci}
        </span>
        <span className="fl-box-ref">{n.ref}</span>
      </div>
      <div className="fl-box-body">{n.activity}</div>
    </div>
  )
}

export default function FlowChart({ flow, template, onExportName, notify, interactive, onUpdateStep, onResetLayout }) {
  const layout = useMemo(() => layoutFlow(flow), [flow])
  const captureRef = useRef(null)
  const canvasRef = useRef(null)
  const [showHeader, setShowHeader] = useState(true)
  const [drag, setDrag] = useState(null) // { id, x, y }
  const tpl = template || {}

  // Drag a box to reposition it. Deltas map 1:1 (canvas isn't scaled).
  const onNodePointerDown = (e, n) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const ox = n.x
    const oy = n.y
    let moved = false
    const move = (ev) => {
      const nx = ox + (ev.clientX - startX)
      const ny = oy + (ev.clientY - startY)
      if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 3) moved = true
      setDrag({ id: n.id, x: Math.max(0, nx), y: Math.max(0, ny) })
    }
    const up = (ev) => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      setDrag(null)
      if (moved) {
        const nx = Math.round(Math.max(0, ox + (ev.clientX - startX)))
        const ny = Math.round(Math.max(0, oy + (ev.clientY - startY)))
        onUpdateStep && onUpdateStep(n.id, { pos: { x: nx, y: ny } })
      }
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
  }

  const onRename = (n) => {
    const nv = window.prompt('Ganti nama aktivitas', n.activity || '')
    if (nv == null) return
    onUpdateStep && onUpdateStep(n.id, { activity: nv.trim() })
  }

  const exportPng = async () => {
    try {
      const el = captureRef.current
      const dataUrl = await htmlToImage.toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        filter: (node) => !(node.classList && node.classList.contains('fl-noexport')),
      })
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
      <div className="fl-toolbar fl-noexport">
        <span style={{ fontWeight: 800, color: '#0f2a43', fontSize: 13.5 }}>{titleText || 'Flow process'}</span>
        {interactive ? <span className="map-hint">Geser kotak untuk atur posisi · klik dua kali untuk ganti nama</span> : null}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7, alignItems: 'center' }}>
          <label className="fl-toggle" title="Show / hide the document header">
            <input type="checkbox" checked={showHeader} onChange={(e) => setShowHeader(e.target.checked)} />
            Kepala dokumen
          </label>
          {interactive && onResetLayout ? (
            <button className="btn btn-sm" onClick={onResetLayout} title="Kembalikan posisi otomatis">
              Rapikan ulang
            </button>
          ) : null}
          <button className="btn btn-sm btn-primary" onClick={exportPng}>
            Export PNG
          </button>
        </div>
      </div>

      <div className="doc-scroll">
        <div ref={captureRef} className="fl-doc">
          {/* title block (toggleable) */}
          {showHeader ? (
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
          ) : null}

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

          <div ref={canvasRef} className="fl-canvas" style={{ width: layout.width, height: layout.height }}>
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
                // While a box is being dragged, dim its edges (they'll snap on drop).
                const live = drag && (e.from === drag.id || e.to === drag.id)
                return (
                  <g key={e.id} opacity={live ? 0.25 : 1}>
                    <path d={roundedPath(e.points, 8)} fill="none" stroke="#333" strokeWidth="1.4" markerEnd="url(#fl-arrow)" />
                    {e.label ? (
                      <text className="fl-edge-label" x={e.labelAt.x + 5} y={e.labelAt.y - 4}>
                        {e.label}
                      </text>
                    ) : null}
                  </g>
                )
              })}
            </svg>

            {/* nodes */}
            {layout.nodes.map((n) => {
              const nn = drag && drag.id === n.id ? { ...n, x: drag.x, y: drag.y } : n
              return (
                <StepNode
                  key={n.id}
                  n={nn}
                  interactive={interactive}
                  dragging={!!(drag && drag.id === n.id)}
                  onPointerDown={onNodePointerDown}
                  onRename={onRename}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
