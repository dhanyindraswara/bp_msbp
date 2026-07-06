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

// Compute the full layout: node rectangles + orthogonal connector paths, plus
// the canvas size and lane column x-offsets. Pure function of the flow doc.
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
    const cx = li * LANE_W + LANE_W / 2
    const cy = PAD_TOP + row * ROW_H + h / 2
    return {
      ...st,
      row,
      laneIndex: li,
      w,
      h,
      cx,
      cy,
      x: cx - w / 2,
      y: cy - h / 2,
    }
  })
  const byNo = {}
  nodes.forEach((n) => {
    if (norm(n.no)) byNo[norm(n.no)] = n
  })

  // Connectors. An explicit "next" wins; otherwise link to the following step
  // in sequence (so a plain top-to-bottom list wires itself up automatically).
  const edges = []
  nodes.forEach((n, i) => {
    if (n.type === 'end') return
    let targets = parseNext(n.next)
    if (!targets.length) {
      const nxt = nodes[i + 1]
      if (nxt) targets = [{ to: norm(nxt.no) || '#' + (i + 1), label: '' }]
      // fall through with a positional pointer when the next step has no number
      if (nxt && !norm(nxt.no)) {
        edges.push(makeEdge(n, nxt, '', edges.length))
        return
      }
    }
    targets.forEach((t) => {
      const tn = byNo[t.to]
      if (tn) edges.push(makeEdge(n, tn, t.label, edges.length))
    })
  })

  const width = Math.max(1, lanes.length) * LANE_W
  const height = PAD_TOP + Math.max(1, nodes.length) * ROW_H + PAD_BOTTOM
  return { lanes, nodes, edges, width, height, laneW: LANE_W }
}

// Build one orthogonal (elbow) connector between two laid-out nodes.
function makeEdge(s, t, label, i) {
  let pts
  let dir // arrowhead direction at the target
  if (s.laneIndex === t.laneIndex) {
    // vertical within a lane
    const down = t.cy >= s.cy
    const sy = down ? s.y + s.h : s.y
    const ty = down ? t.y : t.y + t.h
    const midY = (sy + ty) / 2
    pts = [
      [s.cx, sy],
      [s.cx, midY],
      [t.cx, midY],
      [t.cx, ty],
    ]
    dir = down ? 'down' : 'up'
  } else {
    // horizontal across lanes (enter the side facing the source)
    const right = t.laneIndex > s.laneIndex
    const sx = right ? s.x + s.w : s.x
    const tx = right ? t.x : t.x + t.w
    const midX = (sx + tx) / 2
    pts = [
      [sx, s.cy],
      [midX, s.cy],
      [midX, t.cy],
      [tx, t.cy],
    ]
    dir = right ? 'right' : 'left'
  }
  return { id: 'fe' + i, from: s.id, to: t.id, points: pts, label: label || '', dir }
}

// Turn a list of points into an SVG polyline path string.
export function pointsToPath(points) {
  return points.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ' ' + p[1]).join(' ')
}
