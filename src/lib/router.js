// Orthogonal, obstacle-avoiding edge router (Hanan-grid + A*). Pure geometry:
// given an exit point/side on one box and an entry point/side on another, plus
// the list of box rectangles to avoid, it returns a polyline ([{x,y}, …]) that
// routes AROUND the boxes instead of through them. Recomputed from live node
// positions, so it auto-adjusts when boxes are dragged.

const DIR = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] }

// Does the axis-aligned segment A→B cross the INTERIOR of rect r? Touching an
// edge is allowed, so a path may hug an (inflated) box boundary.
function segHitsRect(a, b, r) {
  const x1 = Math.min(a.x, b.x)
  const x2 = Math.max(a.x, b.x)
  const y1 = Math.min(a.y, b.y)
  const y2 = Math.max(a.y, b.y)
  if (x2 <= r.x || x1 >= r.x + r.w || y2 <= r.y || y1 >= r.y + r.h) return false
  return true
}

// Drop points that sit on a straight run (keep only the corners).
function simplify(pts) {
  if (pts.length <= 2) return pts
  const out = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1]
    const b = pts[i]
    const c = pts[i + 1]
    const collinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)
    if (!collinear) out.push(b)
  }
  out.push(pts[pts.length - 1])
  return out
}

// A simple orthogonal elbow (no obstacle avoidance) — the fast fallback.
export function simpleRoute(start, startDir, end, endDir, opts = {}) {
  const STUB = opts.stub ?? 16
  const sv = DIR[startDir] || [0, 0]
  const ev = DIR[endDir] || [0, 0]
  const p1 = { x: start.x + sv[0] * STUB, y: start.y + sv[1] * STUB }
  const p2 = { x: end.x + ev[0] * STUB, y: end.y + ev[1] * STUB }
  const sH = startDir === 'left' || startDir === 'right'
  const tH = endDir === 'left' || endDir === 'right'
  let mids
  if (sH && tH) {
    const mx = (p1.x + p2.x) / 2
    mids = [{ x: mx, y: p1.y }, { x: mx, y: p2.y }]
  } else if (!sH && !tH) {
    const my = (p1.y + p2.y) / 2
    mids = [{ x: p1.x, y: my }, { x: p2.x, y: my }]
  } else if (sH) {
    mids = [{ x: p2.x, y: p1.y }]
  } else {
    mids = [{ x: p1.x, y: p2.y }]
  }
  return simplify([start, p1, ...mids, p2, end])
}

// Obstacle-avoiding route. Returns null if no path is found (caller falls back).
export function routeOrthogonal(start, startDir, end, endDir, obstacles, opts = {}) {
  const STUB = opts.stub ?? 16
  const TURN = opts.turn ?? 14 // bend penalty → fewer corners
  const sv = DIR[startDir] || [0, 0]
  const ev = DIR[endDir] || [0, 0]
  const s = { x: start.x + sv[0] * STUB, y: start.y + sv[1] * STUB }
  const e = { x: end.x + ev[0] * STUB, y: end.y + ev[1] * STUB }

  // Hanan grid: candidate lines through every box edge + the two stub points.
  const xset = new Set([s.x, e.x])
  const yset = new Set([s.y, e.y])
  obstacles.forEach((r) => {
    xset.add(r.x)
    xset.add(r.x + r.w)
    yset.add(r.y)
    yset.add(r.y + r.h)
  })
  const pad = 46
  const xs0 = [...xset]
  const ys0 = [...yset]
  xset.add(Math.min(...xs0) - pad)
  xset.add(Math.max(...xs0) + pad)
  yset.add(Math.min(...ys0) - pad)
  yset.add(Math.max(...ys0) + pad)
  const xs = [...xset].sort((a, b) => a - b)
  const ys = [...yset].sort((a, b) => a - b)
  const nx = xs.length
  const ny = ys.length
  const xi = new Map(xs.map((v, i) => [v, i]))
  const yi = new Map(ys.map((v, i) => [v, i]))
  if (!xi.has(s.x) || !yi.has(s.y) || !xi.has(e.x) || !yi.has(e.y)) return null

  const six = xi.get(s.x)
  const siy = yi.get(s.y)
  const gix = xi.get(e.x)
  const giy = yi.get(e.y)
  const K = (ix, iy) => ix * ny + iy
  const startK = K(six, siy)
  const goalK = K(gix, giy)
  const pt = (ix, iy) => ({ x: xs[ix], y: ys[iy] })

  const passable = (aix, aiy, bix, biy) => {
    const A = pt(aix, aiy)
    const B = pt(bix, biy)
    for (let i = 0; i < obstacles.length; i++) if (segHitsRect(A, B, obstacles[i])) return false
    return true
  }
  const hEst = (ix, iy) => Math.abs(xs[ix] - e.x) + Math.abs(ys[iy] - e.y)

  const g = new Map([[startK, 0]])
  const f = new Map([[startK, hEst(six, siy)]])
  const came = new Map()
  const dir = new Map([[startK, null]]) // last move axis: 'h' | 'v'
  const openSet = new Set([startK])

  while (openSet.size) {
    let cur = -1
    let bestF = Infinity
    for (const k of openSet) {
      const fk = f.get(k) ?? Infinity
      if (fk < bestF) {
        bestF = fk
        cur = k
      }
    }
    if (cur === goalK) break
    openSet.delete(cur)
    const cix = Math.floor(cur / ny)
    const ciy = cur % ny
    const cdir = dir.get(cur)
    const nb = []
    if (cix > 0) nb.push([cix - 1, ciy, 'h'])
    if (cix < nx - 1) nb.push([cix + 1, ciy, 'h'])
    if (ciy > 0) nb.push([cix, ciy - 1, 'v'])
    if (ciy < ny - 1) nb.push([cix, ciy + 1, 'v'])
    for (let n = 0; n < nb.length; n++) {
      const nix = nb[n][0]
      const niy = nb[n][1]
      const nd = nb[n][2]
      if (!passable(cix, ciy, nix, niy)) continue
      const nk = K(nix, niy)
      const step = Math.abs(xs[nix] - xs[cix]) + Math.abs(ys[niy] - ys[ciy])
      const turn = cdir && cdir !== nd ? TURN : 0
      const tentative = (g.get(cur) ?? Infinity) + step + turn
      if (tentative < (g.get(nk) ?? Infinity)) {
        came.set(nk, cur)
        dir.set(nk, nd)
        g.set(nk, tentative)
        f.set(nk, tentative + hEst(nix, niy))
        openSet.add(nk)
      }
    }
  }

  if (startK !== goalK && !came.has(goalK)) return null
  const keys = []
  let k = goalK
  while (k !== undefined) {
    keys.push(k)
    if (k === startK) break
    k = came.get(k)
  }
  if (keys[keys.length - 1] !== startK) return null
  keys.reverse()
  const mid = keys.map((kk) => pt(Math.floor(kk / ny), kk % ny))
  return simplify([{ x: start.x, y: start.y }, ...mid, { x: end.x, y: end.y }])
}

// Point at the given fraction along a box side (for spreading attach points).
export function sidePoint(rect, side, f) {
  switch (side) {
    case 'top':
      return { x: rect.x + rect.w * f, y: rect.y }
    case 'bottom':
      return { x: rect.x + rect.w * f, y: rect.y + rect.h }
    case 'left':
      return { x: rect.x, y: rect.y + rect.h * f }
    default:
      return { x: rect.x + rect.w, y: rect.y + rect.h * f }
  }
}

// Midpoint along a polyline (by length) — used to place the flow-number label.
export function polyMidpoint(points) {
  if (!points || !points.length) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]
  let total = 0
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  let half = total / 2
  for (let i = 1; i < points.length; i++) {
    const seg = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    if (half <= seg) {
      const t = seg === 0 ? 0 : half / seg
      return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * t, y: points[i - 1].y + (points[i].y - points[i - 1].y) * t }
    }
    half -= seg
  }
  return points[points.length - 1]
}

// Build a rounded-corner SVG path string from a polyline.
export function roundedPath(pts, r = 9) {
  if (!pts || pts.length < 2) return ''
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const len1 = Math.hypot(p1.x - p0.x, p1.y - p0.y)
    const len2 = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const rr = Math.min(r, len1 / 2, len2 / 2)
    const u1x = len1 ? (p1.x - p0.x) / len1 : 0
    const u1y = len1 ? (p1.y - p0.y) / len1 : 0
    const u2x = len2 ? (p2.x - p1.x) / len2 : 0
    const u2y = len2 ? (p2.y - p1.y) / len2 : 0
    d += ` L${p1.x - u1x * rr},${p1.y - u1y * rr} Q${p1.x},${p1.y} ${p1.x + u2x * rr},${p1.y + u2y * rr}`
  }
  const last = pts[pts.length - 1]
  d += ` L${last.x},${last.y}`
  return d
}
