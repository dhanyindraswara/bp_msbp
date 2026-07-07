// Business process map — React Flow diagram wrapped in the ITM business-process
// document template (customizable title block + legend), auto-built from the
// derived model.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  useUpdateNodeInternals,
  useViewport,
  applyNodeChanges,
} from 'reactflow'
import * as htmlToImage from 'html-to-image'
import { C, PROC_W, PROC_H, BOX_W, BOX_H } from '../lib/constants.js'
import { parseProcess, download } from '../lib/generate.js'
import { BoxNode, ProcessNode, BandNode, SLOTS } from './nodes.jsx'

const nodeTypesDef = { box: BoxNode, process: ProcessNode, band: BandNode }

// Defaults for the document title block. Stored per project under project.template.
export const DEFAULT_TEMPLATE = {
  logo: '',
  level: 'BUSINESS PROCESS LEVEL 1',
  title: '',
  bpNo: '',
  effectiveDate: '',
  revision: '01',
  preparedBy: '',
  reviewedBy: '',
  approvedBy: '',
}

// A neutral placeholder logo shown until the user uploads their own.
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

// Inline-editable text that renders as plain text (so it exports cleanly) but can
// be clicked and typed into. Commits on blur.
function EditableField({ value, onCommit, className, placeholder, multiline }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current && ref.current.textContent !== (value || '')) ref.current.textContent = value || ''
  }, [value])
  return (
    <div
      ref={ref}
      className={'tb-edit ' + (className || '')}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-ph={placeholder || ''}
      onBlur={(e) => onCommit(e.currentTarget.textContent.trim())}
      onKeyDown={(e) => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
    />
  )
}

// The static legend box (bottom-right of the document).
function LegendBox() {
  const items = [
    { sw: { background: '#c3d9ef', border: '1px solid #7ba7d4' }, label: 'BP Level 1' },
    { sw: { background: C.bandBg, border: '1px solid ' + C.bandBorder }, label: 'BP Level 2' },
    { sw: { background: '#fff', border: '1px solid ' + C.procBorder }, label: 'BP Level 3' },
    { sw: { background: C.boxBg, border: '1px solid ' + C.boxBorder }, label: 'Supplier/Customer/Other Entity' },
    { sw: { background: '#9db8cf', border: '1px solid #7d97b0' }, label: 'Data/Document/Information Flow' },
    { line: 'ext', label: 'Connector from Ext. Process' },
    { line: 'int', label: 'Connector from Int. Process' },
  ]
  return (
    <div className="legend-card">
      <div className="legend-hd">Legend</div>
      <div className="legend-body">
        <div className="legend-grid">
          {items.map((it, i) => (
            <div key={i} className="legend-item">
              {it.sw ? (
                <span className="legend-sw" style={it.sw} />
              ) : (
                <span className={'legend-line legend-line-' + it.line} />
              )}
              <span>{it.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// The Level-2 band, rendered as a plain div positioned in screen space from the
// flow rect + live viewport transform. A normal DOM element (unlike a React Flow
// node) is captured reliably by html-to-image, so it appears in the PNG export.
function BandOverlay({ rect }) {
  const vp = useViewport()
  if (!rect) return null
  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x * vp.zoom + vp.x,
        top: rect.y * vp.zoom + vp.y,
        width: rect.w * vp.zoom,
        height: rect.h * vp.zoom,
        background: C.bandBg,
        border: '1px solid ' + C.bandBorder,
        borderRadius: 3,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}

function FlowInner({ project, setProject, derived, notify }) {
  const rf = useReactFlow()
  const updateNI = useUpdateNodeInternals()
  const nodeTypes = useMemo(() => nodeTypesDef, [])
  const labelMode = project.flowLabelMode || 'number'

  const renameEntity = useCallback(
    (kind, oldRaw) => {
      const nv = window.prompt('Rename', oldRaw)
      if (nv == null) return
      const nn = nv.trim()
      if (!nn || nn === oldRaw) return
      setProject((p) => {
        const sipoc = p.sipoc.map((r) => {
          const c = { ...r }
          if (kind === 'process') {
            if ((c.process || '').trim() === oldRaw) c.process = nn
            if ((c.supplier || '').trim() === oldRaw) c.supplier = nn
          } else {
            if ((c.supplier || '').trim() === oldRaw) c.supplier = nn
            if ((c.customer || '').trim() === oldRaw) c.customer = nn
          }
          return c
        })
        const pref = kind === 'process' ? 'P:' : 'A:'
        const positions = { ...p.positions }
        if (positions[pref + oldRaw]) {
          positions[pref + nn] = positions[pref + oldRaw]
          delete positions[pref + oldRaw]
        }
        return { ...p, sipoc, positions }
      })
    },
    [setProject],
  )

  const deleteActor = useCallback(
    (name) => {
      if (!window.confirm('Remove "' + name + '" from the diagram? (clears it from Suppliers/Customers)')) return
      setProject((p) => ({
        ...p,
        sipoc: p.sipoc.map((r) => {
          const c = { ...r }
          if ((c.supplier || '').trim() === name) c.supplier = ''
          if ((c.customer || '').trim() === name) c.customer = ''
          return c
        }),
        positions: (() => {
          const q = { ...p.positions }
          delete q['A:' + name]
          return q
        })(),
      }))
    },
    [setProject],
  )

  const buildNodes = useCallback(() => {
    const pos = derived.positions
    const out = []
    derived.processes.forEach((pr) => {
      const id = 'P:' + pr.raw
      out.push({
        id,
        type: 'process',
        position: pos[id] || { x: 360, y: 400 },
        width: PROC_W,
        height: PROC_H,
        style: { width: PROC_W, height: PROC_H },
        data: { code: pr.code, name: pr.name, onRename: () => renameEntity('process', pr.raw) },
        zIndex: 2,
      })
    })
    derived.actors.forEach((name) => {
      const id = 'A:' + name
      out.push({
        id,
        type: 'box',
        position: pos[id] || { x: 40, y: 150 },
        width: BOX_W,
        height: BOX_H,
        style: { width: BOX_W, height: BOX_H },
        data: {
          label: name,
          highlight: (project.highlight || '').toLowerCase() === name.toLowerCase(),
          onRename: () => renameEntity('actor', name),
          onDelete: () => deleteActor(name),
        },
        zIndex: 2,
      })
    })
    return out
  }, [derived, project.highlight, renameEntity, deleteActor])

  const [nodes, setNodes] = useState(buildNodes)
  const [arrangeNonce, setArrangeNonce] = useState(0)
  const derivedKey = useMemo(
    () => JSON.stringify([derived.processes.map((p) => p.raw), derived.actors, project.highlight]),
    [derived.processes, derived.actors, project.highlight],
  )
  useEffect(() => {
    setNodes(buildNodes())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedKey])

  // Auto-arrange: clear saved positions so every box is re-placed by the layout
  // engine, then rebuild + fit.
  const autoArrange = () => {
    setProject((p) => ({ ...p, positions: {} }))
    setArrangeNonce((n) => n + 1)
  }
  useEffect(() => {
    if (!arrangeNonce) return
    setNodes(buildNodes())
    const t = setTimeout(() => {
      try {
        rf.fitView({ padding: 0.14, duration: 300 })
      } catch (e) {
        /* ignore */
      }
    }, 140)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrangeNonce])

  const posMap = useMemo(() => {
    const m = {}
    nodes.forEach((n) => {
      const w = n.type === 'process' ? PROC_W : BOX_W
      const hh = n.type === 'process' ? PROC_H : BOX_H
      m[n.id] = { x: n.position.x, y: n.position.y, w, h: hh }
    })
    return m
  }, [nodes])

  // The light-blue Level-2 band, in flow coordinates. Rendered as a plain div
  // behind the flow (see BandOverlay) rather than a React Flow node, because
  // html-to-image drops low-z-index RF nodes from the PNG export.
  const bandRect = useMemo(() => {
    const pn = nodes.filter((n) => n.type === 'process')
    if (!pn.length) return null
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9
    pn.forEach((n) => {
      x0 = Math.min(x0, n.position.x)
      y0 = Math.min(y0, n.position.y)
      x1 = Math.max(x1, n.position.x + PROC_W)
      y1 = Math.max(y1, n.position.y + PROC_H)
    })
    const px = 34,
      py = 30
    return { x: x0 - px, y: y0 - py, w: x1 - x0 + px * 2, h: y1 - y0 + py * 2 }
  }, [nodes])

  const edges = useMemo(() => {
    const S = SLOTS.length

    // 1) Pick which side of each box every edge leaves/enters, from geometry.
    const routed = derived.relations.map((rel) => {
      const s = posMap[rel.source],
        t = posMap[rel.target]
      if (!s || !t) return null
      const sc = { x: s.x + s.w / 2, y: s.y + s.h / 2 },
        tc = { x: t.x + t.w / 2, y: t.y + t.h / 2 }
      const dx = tc.x - sc.x,
        dy = tc.y - sc.y
      let sSide, tSide
      if (Math.abs(dx) >= Math.abs(dy)) {
        sSide = dx >= 0 ? 'right' : 'left'
        tSide = dx >= 0 ? 'left' : 'right'
      } else {
        sSide = dy >= 0 ? 'bottom' : 'top'
        tSide = dy >= 0 ? 'top' : 'bottom'
      }
      return { rel, sc, tc, sSide, tSide }
    })

    // 2) Collect every endpoint that lands on each (box, side).
    const sideGroups = {}
    routed.forEach((r, idx) => {
      if (!r) return
      const add = (node, side, end, other) => {
        const k = node + '|' + side
        ;(sideGroups[k] || (sideGroups[k] = [])).push({ idx, end, other })
      }
      add(r.rel.source, r.sSide, 's', r.tc)
      add(r.rel.target, r.tSide, 't', r.sc)
    })

    // 3) Give each endpoint on a side its own slot. Order them by the position
    //    of the opposite endpoint so the lines fan out without crossing, and so
    //    no attach point is ever shared by two edges.
    const slotOf = {}
    Object.keys(sideGroups).forEach((k) => {
      const arr = sideGroups[k]
      const horizontal = k.endsWith('|top') || k.endsWith('|bottom')
      arr.sort((a, b) => (horizontal ? a.other.x - b.other.x : a.other.y - b.other.y))
      const N = arr.length
      arr.forEach((item, i) => {
        const slot = N === 1 ? Math.floor(S / 2) : Math.min(S - 1, Math.max(0, Math.floor(((i + 0.5) * S) / N)))
        slotOf[item.idx + '|' + item.end] = slot
      })
    })

    // 4) Build the edges with their assigned handles.
    return routed
      .map((r, idx) => {
        if (!r) return null
        const rel = r.rel
        const sh = r.sSide + '-s-' + (slotOf[idx + '|s'] ?? Math.floor(S / 2))
        const th = r.tSide + '-t-' + (slotOf[idx + '|t'] ?? Math.floor(S / 2))
        // Handoffs between main processes (output of one = input of the next) are
        // drawn SOLID BLACK; connectors to/from external actors stay dashed & colored.
        const isHandoff = rel.kind === 'handoff'
        const color = isHandoff ? '#1f2937' : rel.kind === 'in' ? C.inC : C.outC
        const label = labelMode === 'number' ? (rel.nums.length ? rel.nums.join(',') : '') : rel.texts.join(', ')
        return {
          id: rel.id,
          source: rel.source,
          target: rel.target,
          sourceHandle: sh,
          targetHandle: th,
          type: 'smoothstep',
          pathOptions: { borderRadius: 10 },
          label: label || undefined,
          labelBgPadding: [5, 2],
          labelBgBorderRadius: 3,
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.92 },
          labelStyle: { fontSize: 11, fontWeight: 700, fill: '#1f2937' },
          style: { stroke: color, strokeWidth: isHandoff ? 2 : 1.7, ...(isHandoff ? {} : { strokeDasharray: '3 3' }) },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: isHandoff ? 16 : 15, height: isHandoff ? 16 : 15 },
        }
      })
      .filter(Boolean)
  }, [derived.relations, posMap, labelMode])

  const onNodesChange = useCallback((changes) => {
    setNodes((ns) => applyNodeChanges(changes.filter((c) => c.id !== '__band'), ns))
  }, [])
  const onNodeDragStop = useCallback(
    (e, node) => {
      if (node.id === '__band') return
      setProject((p) => ({
        ...p,
        positions: { ...p.positions, [node.id]: { x: Math.round(node.position.x), y: Math.round(node.position.y) } },
      }))
    },
    [setProject],
  )

  useEffect(() => {
    let b
    const a = setTimeout(() => {
      try {
        nodes.forEach((n) => {
          if (n.id !== '__band') updateNI(n.id)
        })
      } catch (e) {
        /* ignore */
      }
      b = setTimeout(() => {
        try {
          rf.fitView({ padding: 0.14, duration: 200 })
        } catch (e) {
          /* ignore */
        }
      }, 160)
    }, 120)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedKey])

  const allNodes = nodes

  const exportPng = useCallback(async () => {
    try {
      rf.fitView({ padding: 0.12, duration: 0 })
      await new Promise((r) => setTimeout(r, 350))
      const el = document.getElementById('itm-capture')
      const dataUrl = await htmlToImage.toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        filter: (n) => {
          if (
            n.classList &&
            (n.classList.contains('react-flow__controls') ||
              n.classList.contains('react-flow__attribution') ||
              n.classList.contains('nodedel') ||
              n.classList.contains('itm-hint'))
          )
            return false
          return true
        },
      })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      download('itm-process-map.png', blob)
      notify('PNG exported')
    } catch (err) {
      console.error(err)
      notify('PNG export failed: ' + err.message)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rf])
  const exportJSON = useCallback(() => {
    download('itm-sipoc-project.json', new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }))
    notify('JSON exported')
  }, [project, notify])

  // legend PPI grouping
  const ppiGroups = useMemo(() => {
    const g = []
    let cur = null
    ;(project.ppi || []).forEach((row) => {
      const proc = (row.process || '').trim()
      if (proc) {
        cur = { proc, items: [] }
        g.push(cur)
      }
      if (!cur) {
        cur = { proc: '', items: [] }
        g.push(cur)
      }
      if ((row.indicator || '').trim()) cur.items.push(row.indicator.trim())
    })
    return g
  }, [project.ppi])

  // ---- document title-block template ----
  const tpl = useMemo(() => ({ ...DEFAULT_TEMPLATE, ...(project.template || {}) }), [project.template])
  const setTpl = useCallback(
    (k, v) => setProject((p) => ({ ...p, template: { ...DEFAULT_TEMPLATE, ...(p.template || {}), [k]: v } })),
    [setProject],
  )
  const logoRef = useRef(null)
  const onLogoFile = (file) => {
    if (!file) return
    const rd = new FileReader()
    rd.onload = () => setTpl('logo', rd.result)
    rd.readAsDataURL(file)
  }
  const titleText = tpl.title || project.header.processName || ''

  const appr = [
    { lb: 'Prepared by,', k: 'preparedBy' },
    { lb: 'Reviewed by,', k: 'reviewedBy' },
    { lb: 'Approved by,', k: 'approvedBy' },
  ]

  return (
    <div className="map-view">
      <div className="map-toolbar">
        <span style={{ fontWeight: 800, color: '#0f2a43', fontSize: 13.5 }}>
          {titleText || 'Business process map'}
        </span>
        <div className="seg" style={{ marginLeft: 8 }}>
          <button
            className={labelMode === 'number' ? 'on' : ''}
            onClick={() => setProject((p) => ({ ...p, flowLabelMode: 'number' }))}
          >
            Flow #
          </button>
          <button
            className={labelMode === 'text' ? 'on' : ''}
            onClick={() => setProject((p) => ({ ...p, flowLabelMode: 'text' }))}
          >
            Text
          </button>
        </div>
        <span className="map-hint">Click any header field or the logo to edit · drag boxes to arrange</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
          <button className="btn btn-sm" onClick={autoArrange} title="Re-place all boxes automatically">
            Auto-arrange
          </button>
          <button className="btn btn-sm" onClick={() => rf.fitView({ padding: 0.12 })}>
            Fit view
          </button>
          <button className="btn btn-sm" onClick={exportJSON}>
            Export JSON
          </button>
          <button className="btn btn-sm btn-primary" onClick={exportPng}>
            Export PNG
          </button>
        </div>
      </div>

      <div className="doc-scroll">
        <div id="itm-capture" className="itm-doc">
          {/* ---- title block ---- */}
          <div className="tb">
            <div className="tb-row1">
              <div className="tb-logo" onClick={() => logoRef.current && logoRef.current.click()} title="Click to change logo">
                {tpl.logo ? <img className="tb-logo-img" src={tpl.logo} alt="logo" /> : <DefaultLogo />}
                <span className="tb-logo-hint itm-hint">change logo</span>
                <input
                  type="file"
                  accept="image/*"
                  ref={logoRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    onLogoFile(e.target.files[0])
                    e.target.value = ''
                  }}
                />
              </div>
              <div className="tb-title">
                <EditableField className="tb-level" value={tpl.level} placeholder="BUSINESS PROCESS LEVEL" onCommit={(v) => setTpl('level', v)} />
                <EditableField className="tb-name" value={titleText} placeholder="BP TITLE" onCommit={(v) => setTpl('title', v)} />
              </div>
              {appr.map((a) => (
                <div key={a.k} className="tb-appr">
                  <div className="tb-appr-lb">{a.lb}</div>
                  <EditableField className="tb-appr-val" value={tpl[a.k]} placeholder="—" onCommit={(v) => setTpl(a.k, v)} />
                </div>
              ))}
            </div>
            <div className="tb-row2">
              <div className="tb-c tb-c-lb">Business Process No.</div>
              <div className="tb-c tb-c-val">
                <EditableField value={tpl.bpNo} placeholder="ITM-BP-…" onCommit={(v) => setTpl('bpNo', v)} />
              </div>
              <div className="tb-c tb-c-lb">Effective Date:</div>
              <div className="tb-c tb-c-val">
                <EditableField value={tpl.effectiveDate} placeholder="dd-mm-yyyy" onCommit={(v) => setTpl('effectiveDate', v)} />
              </div>
              <div className="tb-c tb-c-lb">Revision :</div>
              <div className="tb-c tb-c-val" style={{ flex: '0 0 70px' }}>
                <EditableField value={tpl.revision} placeholder="00" onCommit={(v) => setTpl('revision', v)} />
              </div>
            </div>
          </div>

          {/* ---- body: diagram + side panels ---- */}
          <div className="doc-body">
            <div className="doc-canvas">
              <BandOverlay rect={bandRect} />
              <ReactFlow
                nodes={allNodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onNodeDragStop={onNodeDragStop}
                onInit={(inst) => {
                  setTimeout(() => {
                    try {
                      inst.fitView({ padding: 0.14 })
                    } catch (e) {
                      /* ignore */
                    }
                  }, 80)
                }}
                fitView
                fitViewOptions={{ padding: 0.14 }}
                minZoom={0.2}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
                nodesConnectable={false}
                elevateNodesOnSelect={false}
              >
                <Background color="#e3e8ee" gap={22} size={1} />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
            <div className="doc-side">
              <div className="legend-card">
                <div className="legend-hd">Data/Document/Information Flow</div>
                <div className="legend-body">
                  {derived.flows && derived.flows.length ? (
                    derived.flows.map((f) => (
                      <div key={f.n} style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontWeight: 700, minWidth: 18 }}>{f.n + '.'}</span>
                        <span>{f.text}</span>
                      </div>
                    ))
                  ) : (
                    <span style={{ color: '#9aa4ae' }}>No flows yet</span>
                  )}
                </div>
              </div>
              <div className="legend-card">
                <div className="legend-hd">Process Performance Indicator (PPI)</div>
                <div className="legend-body">
                  {ppiGroups.length ? (
                    ppiGroups.map((g, gi) => {
                      const pp = parseProcess(g.proc)
                      return (
                        <div key={gi} style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 700, marginBottom: 2 }}>
                            {g.proc ? (pp.code ? pp.code + '. ' : '') + pp.name : '—'}
                          </div>
                          {g.items.map((it, ii) => (
                            <div key={ii} style={{ paddingLeft: 12 }}>
                              {ii + 1 + '. ' + it}
                            </div>
                          ))}
                        </div>
                      )
                    })
                  ) : (
                    <span style={{ color: '#9aa4ae' }}>No indicators yet</span>
                  )}
                </div>
              </div>
              <LegendBox />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProcessMap(props) {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  )
}
