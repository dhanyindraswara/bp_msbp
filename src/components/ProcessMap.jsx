// Business process map — React Flow diagram auto-built from the derived model.
import { useState, useEffect, useMemo, useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  useUpdateNodeInternals,
  applyNodeChanges,
} from 'reactflow'
import * as htmlToImage from 'html-to-image'
import { C, PROC_W, PROC_H, BOX_W, BOX_H } from '../lib/constants.js'
import { parseProcess, download } from '../lib/generate.js'
import { BoxNode, ProcessNode, BandNode } from './nodes.jsx'

const nodeTypesDef = { box: BoxNode, process: ProcessNode, band: BandNode }

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
  const derivedKey = useMemo(
    () => JSON.stringify([derived.processes.map((p) => p.raw), derived.actors, project.highlight]),
    [derived.processes, derived.actors, project.highlight],
  )
  useEffect(() => {
    setNodes(buildNodes())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derivedKey])

  const posMap = useMemo(() => {
    const m = {}
    nodes.forEach((n) => {
      const w = n.type === 'process' ? PROC_W : BOX_W
      const hh = n.type === 'process' ? PROC_H : BOX_H
      m[n.id] = { x: n.position.x, y: n.position.y, w, h: hh }
    })
    return m
  }, [nodes])

  const band = useMemo(() => {
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
    return {
      id: '__band',
      type: 'band',
      position: { x: x0 - px, y: y0 - py },
      style: { width: x1 - x0 + px * 2, height: y1 - y0 + py * 2 },
      data: {},
      selectable: false,
      draggable: false,
      // Behind the edge layer (edges svg sits at z-index 0) so the light-blue
      // band never covers the IN/OUT arrows that route across it.
      zIndex: -1,
    }
  }, [nodes])

  const edges = useMemo(() => {
    // Group edges by unordered node pair so that a box with both an IN and an
    // OUT edge to the same process gets two parallel lines (different slots)
    // instead of one overlapping line.
    const groups = {}
    derived.relations.forEach((rel) => {
      const k = [rel.source, rel.target].slice().sort().join('~')
      ;(groups[k] || (groups[k] = [])).push(rel.id)
    })
    // For a pair of size k, spread its edges across the 5 slot positions.
    const SLOTMAP = { 1: [2], 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4] }
    const slotFor = (rel) => {
      const k = [rel.source, rel.target].slice().sort().join('~')
      const arr = groups[k]
      const slots = SLOTMAP[arr.length] || arr.map((_, i) => i % 5)
      return slots[arr.indexOf(rel.id) % slots.length]
    }

    return derived.relations
      .map((rel) => {
        const s = posMap[rel.source],
          t = posMap[rel.target]
        if (!s || !t) return null
        const sc = { x: s.x + s.w / 2, y: s.y + s.h / 2 },
          tc = { x: t.x + t.w / 2, y: t.y + t.h / 2 }
        const dx = tc.x - sc.x,
          dy = tc.y - sc.y
        const slot = slotFor(rel)
        let sh, th
        if (Math.abs(dx) >= Math.abs(dy)) {
          sh = (dx >= 0 ? 'right' : 'left') + '-s-' + slot
          th = (dx >= 0 ? 'left' : 'right') + '-t-' + slot
        } else {
          sh = (dy >= 0 ? 'bottom' : 'top') + '-s-' + slot
          th = (dy >= 0 ? 'top' : 'bottom') + '-t-' + slot
        }
        const color = rel.kind === 'in' ? C.inC : rel.kind === 'out' ? C.outC : C.hoC
        const label = labelMode === 'number' ? (rel.nums.length ? rel.nums.join(',') : '') : rel.texts.join(', ')
        return {
          id: rel.id,
          source: rel.source,
          target: rel.target,
          sourceHandle: sh,
          targetHandle: th,
          type: 'smoothstep',
          label: label || undefined,
          labelBgPadding: [5, 2],
          labelBgBorderRadius: 3,
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.92 },
          labelStyle: { fontSize: 11, fontWeight: 700, fill: '#1f2937' },
          style: { stroke: color, strokeWidth: 1.7, strokeDasharray: rel.kind === 'handoff' ? '7 4' : '3 3' },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 15, height: 15 },
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

  const allNodes = band ? [band, ...nodes] : nodes

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

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '9px 14px',
            borderBottom: '1px solid #e6eaee',
            background: '#fff',
          }}
        >
          <span style={{ fontWeight: 800, color: '#0f2a43', fontSize: 13.5 }}>
            {project.header.processName || 'Business process map'}
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
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
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
        <div id="itm-capture" style={{ flex: 1, display: 'flex', background: '#fff', minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
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
              defaultEdgeOptions={{}}
            >
              <Background color="#e3e8ee" gap={22} size={1} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <div
            style={{
              width: 352,
              flex: 'none',
              borderLeft: '1px solid #e6eaee',
              padding: '12px 12px',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              background: '#fbfcfd',
            }}
          >
            <div className="legend-card">
              <div className="legend-hd">Data/Document/Information Flow</div>
              <div className="legend-body">
                {project.flows && project.flows.length ? (
                  project.flows.map((f) => (
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
            <div className="itm-hint" style={{ fontSize: 11.5, color: '#94a0ac', lineHeight: 1.5, padding: '0 2px' }}>
              Drag boxes to arrange · double-click a box to rename · hover a grey box for the remove ✕.
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
