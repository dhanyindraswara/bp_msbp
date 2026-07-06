// Auto Flow Process — data model + layout engine for the cross-functional
// swimlane flowchart (SOP flow). The user supplies lanes (responsible parties)
// and an ordered list of steps; this module lays them out into columns (one per
// lane) and rows (step sequence), and computes the orthogonal connector paths.
// Everything downstream (FlowChart.jsx) is a pure render of what this returns.

import { uid } from './constants.js'

// Shape types a step can take. Mirrors the symbol legend on the template.
export const FLOW_TYPES = [
  { id: 'start', label: 'Start' },
  { id: 'end', label: 'End' },
  { id: 'process', label: 'Process (without System)' },
  { id: 'system', label: 'Process (by/to System)' },
  { id: 'subprocess', label: 'Sub Process' },
  { id: 'inform', label: 'Inform / Verbal Comm.' },
  { id: 'decision', label: 'Decision' },
  { id: 'offpage', label: 'Off-Page Reference' },
  { id: 'onpage', label: 'On-Page Reference' },
]

// RASCI letters allowed in the middle header cell of a process box.
export const FLOW_RASCI = ['', 'R', 'A', 'A/R', 'S', 'C', 'I']

// --- layout geometry (all in px) ---
export const LANE_W = 214
export const LANE_HEAD_H = 52
export const ROW_H = 150
export const PAD_TOP = 34
export const PAD_BOTTOM = 40
export const BOX_W = 152
export const BOX_H = 84
export const PILL_W = 104
export const PILL_H = 34
export const DEC_W = 132
export const DEC_H = 92
export const REF_W = 74 // off/on-page reference glyph size

// Dimensions of a node given its type.
function sizeOf(type) {
  switch (type) {
    case 'start':
    case 'end':
      return { w: PILL_W, h: PILL_H }
    case 'decision':
      return { w: DEC_W, h: DEC_H }
    case 'offpage':
    case 'onpage':
      return { w: REF_W, h: REF_W }
    case 'inform':
      return { w: BOX_W, h: BOX_H }
    default:
      return { w: BOX_W, h: BOX_H }
  }
}

const norm = (s) => (s == null ? '' : ('' + s)).trim()

// Build a fresh, empty flow document.
export function blankFlow() {
  return {
    section: '',
    lanes: ['', ''],
    steps: [{ id: uid(), no: '1', type: 'process', lane: '', rasci: 'R', ref: '', activity: '', next: '' }],
  }
}

// A worked example that reproduces the "C3.2 Fuel Supply" reference sample, so
// the user can see the template come to life immediately and edit from there.
export function sampleFlow() {
  const L = [
    'Fuel Supply/Cargo Handling BoCT/Fleet Management Support',
    'Agency',
    'Fuel Supplier',
    'Harbor Master',
    'Fleet Management',
    'Tug Master',
  ]
  const s = (o) => ({ id: uid(), no: '', type: 'process', lane: L[0], rasci: '', ref: '', activity: '', next: '', ...o })
  return {
    section: 'C3.2 Fuel Supply',
    lanes: L,
    steps: [
      s({ type: 'start', lane: L[0], activity: 'Start' }),
      s({ no: '1', lane: L[0], rasci: 'R', ref: '7.1.1', activity: 'Bunker Order' }),
      s({ no: '2', lane: L[0], rasci: 'R', ref: '7.1.2', activity: 'Release loading order' }),
      s({ no: '3', lane: L[2], rasci: 'R', ref: '7.1.3', activity: 'Propose IBMBB' }),
      s({ no: '4', lane: L[3], rasci: 'A', ref: '7.1.4', activity: 'Approve IBMBB' }),
      s({ no: '5', type: 'decision', lane: L[4], rasci: 'A', ref: '7.1.5', activity: 'Bunker approved?', next: '6:Yes, 3:No' }),
      s({ no: '6', lane: L[5], rasci: 'R', ref: '7.1.6', activity: 'Execute bunkering' }),
      s({ type: 'end', lane: L[5], activity: 'End' }),
    ],
  }
}

// Parse the "next" field of a step. Accepts a comma-separated list where each
// entry is a target step number, optionally "num:label" for a branch label
// (e.g. a decision's "6:Yes, 3:No"). Empty → default sequential link.
function parseNext(raw) {
  return norm(raw)
    .split(',')
    .map((tok) => {
      const t = norm(tok)
      if (!t) return null
      const [to, ...lab] = t.split(':')
      return { to: norm(to), label: norm(lab.join(':')) }
    })
    .filter(Boolean)
}

const STUB = 20 // how far a connector sticks out of a box before it turns

// Compute the full layout: node rectangles + orthogonal connector paths, plus
// the canvas size and lane column x-offsets. Pure function of the flow doc.
// Each step may carry a manual { pos: {x, y} } override (from dragging); when
// present it wins over the auto grid position.
export function layoutFlow(flow) {
  const lanes = (flow.lanes || []).map(norm).filter(Boolean)
  const laneIndex = (name) => {
    const i = lanes.indexOf(norm(name))
    return i < 0 ? 0 : i
  }
  const steps = flow.steps || []

  const nodes = steps.map((st, row) => {
    const li = laneIndex(st.lane)
    const { w, h } = sizeOf(st.type)
    const hasPos = st.pos && typeof st.pos.x === 'number' && typeof st.pos.y === 'number'
    const x = hasPos ? st.pos.x : li * LANE_W + LANE_W / 2 - w / 2
    const y = hasPos ? st.pos.y : PAD_TOP + row * ROW_H
    return { ...st, row, laneIndex: li, w, h, x, y, cx: x + w / 2, cy: y + h / 2 }
  })
  const byNo = {}
  nodes.forEach((n) => {
    if (norm(n.no)) byNo[norm(n.no)] = n
  })

  // 1) Resolve relations. An explicit "next" wins; otherwise link to the next
  //    step in sequence so a plain top-to-bottom list wires itself up.
  const rels = []
  nodes.forEach((n, i) => {
    if (n.type === 'end') return
    let targets = parseNext(n.next)
    if (!targets.length) {
      const nxt = nodes[i + 1]
      if (!nxt) return
      rels.push({ from: n, to: nxt, label: '' })
      return
    }
    targets.forEach((t) => {
      const tn = byNo[t.to]
      if (tn && tn !== n) rels.push({ from: n, to: tn, label: t.label })
    })
  })

  // 2) Pick which side of each box every connector leaves / enters, from the
  //    geometry (dominant axis between the two centres).
  const routed = rels.map((r) => {
    const dx = r.to.cx - r.from.cx
    const dy = r.to.cy - r.from.cy
    let sSide, tSide
    if (Math.abs(dx) >= Math.abs(dy)) {
      sSide = dx >= 0 ? 'right' : 'left'
      tSide = dx >= 0 ? 'left' : 'right'
    } else {
      sSide = dy >= 0 ? 'bottom' : 'top'
      tSide = dy >= 0 ? 'top' : 'bottom'
    }
    return { ...r, sSide, tSide }
  })

  // 3) Every endpoint that lands on the same (box, side) gets its own slot, so
  //    an incoming and an outgoing line never stack on the same point. Order
  //    the slots by the opposite endpoint so the fan-out doesn't cross.
  const groups = {}
  routed.forEach((r, idx) => {
    const push = (node, side, end, other) => {
      const k = node.id + '|' + side
      ;(groups[k] || (groups[k] = [])).push({ idx, end, other })
    }
    push(r.from, r.sSide, 's', r.to)
    push(r.to, r.tSide, 't', r.from)
  })
  const frac = {}
  Object.keys(groups).forEach((k) => {
    const horizontal = k.endsWith('|top') || k.endsWith('|bottom')
    const arr = groups[k]
    arr.sort((a, b) => (horizontal ? a.other.cx - b.other.cx : a.other.cy - b.other.cy))
    const N = arr.length
    arr.forEach((it, i) => {
      frac[it.idx + '|' + it.end] = (i + 1) / (N + 1)
    })
  })

  // 4) Build each connector's orthogonal polyline between its slotted points.
  const edges = routed.map((r, idx) => {
    const sp = attach(r.from, r.sSide, frac[idx + '|s'] ?? 0.5)
    const tp = attach(r.to, r.tSide, frac[idx + '|t'] ?? 0.5)
    const points = elbow(sp, r.sSide, tp, r.tSide)
    const mid = points[Math.max(1, Math.floor(points.length / 2) - 1)]
    return { id: 'fe' + idx, from: r.from.id, to: r.to.id, points, label: r.label || '', labelAt: mid }
  })

  const maxX = nodes.reduce((m, n) => Math.max(m, n.x + n.w), 0)
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y + n.h), 0)
  const width = Math.max(Math.max(1, lanes.length) * LANE_W, maxX + 20)
  const height = Math.max(PAD_TOP + Math.max(1, nodes.length) * ROW_H + PAD_BOTTOM, maxY + PAD_BOTTOM)
  return { lanes, nodes, edges, width, height, laneW: LANE_W }
}

// A point on a box side at the given fraction along it.
function attach(n, side, f) {
  switch (side) {
    case 'top':
      return [n.x + n.w * f, n.y]
    case 'bottom':
      return [n.x + n.w * f, n.y + n.h]
    case 'left':
      return [n.x, n.y + n.h * f]
    default:
      return [n.x + n.w, n.y + n.h * f]
  }
}

const NORMAL = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }

// Orthogonal elbow between two side points: each end sticks straight out of its
// box for STUB px, then the two stubs are joined with right-angle segments.
function elbow(sp, sSide, tp, tSide) {
  const sn = NORMAL[sSide]
  const tn = NORMAL[tSide]
  const p1 = [sp[0] + sn[0] * STUB, sp[1] + sn[1] * STUB]
  const p2 = [tp[0] + tn[0] * STUB, tp[1] + tn[1] * STUB]
  const sHoriz = sSide === 'left' || sSide === 'right'
  const tHoriz = tSide === 'left' || tSide === 'right'
  let mids
  if (sHoriz && tHoriz) {
    const mx = (p1[0] + p2[0]) / 2
    mids = [[mx, p1[1]], [mx, p2[1]]]
  } else if (!sHoriz && !tHoriz) {
    const my = (p1[1] + p2[1]) / 2
    mids = [[p1[0], my], [p2[0], my]]
  } else if (sHoriz) {
    mids = [[p2[0], p1[1]]]
  } else {
    mids = [[p1[0], p2[1]]]
  }
  return [sp, p1, ...mids, p2, tp]
}

// Turn a list of points into an SVG polyline path string.
export function pointsToPath(points) {
  return points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ' ' + p[1]).join(' ')
}
