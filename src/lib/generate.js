// Derivation engine: everything downstream (processes, actors, flows, edges,
// node positions) is generated from the single SIPOC table. Ported faithfully
// from the design prototype.

import { PROC_W, PROC_H, BOX_W, BOX_H } from './constants.js'

export const distinct = (arr) => {
  const seen = new Set()
  const out = []
  ;(arr || []).forEach((v) => {
    const t = (v == null ? '' : '' + v).trim()
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase())
      out.push(t)
    }
  })
  return out
}

export const download = (name, blob) => {
  const u = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = u
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(u), 2000)
}

// Split a process label like "1.Planning Governance" or
// "M.1.1.12.2. Planning Governance" into { code, name }.
export function parseProcess(raw) {
  raw = (raw || '').trim()
  let m = raw.match(/^([A-Za-z0-9.]*\d[A-Za-z0-9.]*?)\.\s*([A-Za-z].*)$/)
  if (m) return { code: m[1], name: m[2].trim(), raw }
  m = raw.match(/^([A-Za-z0-9.]*\d[A-Za-z0-9.]*?)\.?\s+([A-Za-z].*)$/)
  if (m) return { code: m[1].replace(/\.$/, ''), name: m[2].trim(), raw }
  return { code: '', name: raw, raw }
}

export const isAdvisory = (a) =>
  /regulat|legal|\bsme\b|practition|advis|\baudit\b|consult|expert/i.test(a || '')

export function generate(p) {
  const sipoc = p.sipoc || []
  const procRaws = distinct(sipoc.map((r) => r.process))
  const processes = procRaws.map((raw) => ({ ...parseProcess(raw) }))
  const procKeys = new Set()
  processes.forEach((pr) => {
    procKeys.add(pr.raw.toLowerCase().trim())
    procKeys.add(pr.name.toLowerCase().trim())
  })
  const isProc = (s) => {
    s = (s || '').toLowerCase().trim()
    return !!s && procKeys.has(s)
  }
  const procRawFor = (name) => {
    const k = (name || '').toLowerCase().trim()
    const pr = processes.find(
      (x) => x.raw.toLowerCase().trim() === k || x.name.toLowerCase().trim() === k,
    )
    return pr ? pr.raw : name
  }

  const suppliers = distinct(sipoc.map((r) => r.supplier)).filter((s) => !isProc(s))
  const customers = distinct(sipoc.map((r) => r.customer)).filter((s) => !isProc(s))
  const actors = distinct([...suppliers, ...customers])

  // flows: preserve existing order, append new (first-appearance across rows: input then output)
  const found = []
  sipoc.forEach((r) => {
    ;[r.input, r.output].forEach((t) => {
      t = (t || '').trim()
      if (t && !found.some((x) => x.toLowerCase() === t.toLowerCase())) found.push(t)
    })
  })
  let order = (p.flows || [])
    .map((f) => f.text)
    .filter((t) => found.some((x) => x.toLowerCase() === t.toLowerCase()))
  found.forEach((t) => {
    if (!order.some((x) => x.toLowerCase() === t.toLowerCase())) order.push(t)
  })
  const flows = order.map((text, i) => ({ n: i + 1, text }))
  const flowNum = {}
  flows.forEach((f) => {
    flowNum[f.text.toLowerCase()] = f.n
  })

  // relations (edges)
  const relMap = {}
  const addRel = (key, base, text) => {
    const rel =
      relMap[key] ||
      (relMap[key] = {
        id: 'e_' + Object.keys(relMap).length,
        ...base,
        nums: new Set(),
        texts: new Set(),
      })
    const t = (text || '').trim()
    if (t) {
      rel.texts.add(t)
      const n = flowNum[t.toLowerCase()]
      if (n) rel.nums.add(n)
    }
  }
  const pid = (s) => 'P:' + (s || '').trim()
  const aid = (s) => 'A:' + (s || '').trim()
  sipoc.forEach((r) => {
    const proc = (r.process || '').trim()
    if (!proc) return
    const pIdT = pid(proc)
    const sup = (r.supplier || '').trim()
    if (sup) {
      if (isProc(sup)) {
        const src = pid(procRawFor(sup))
        if (src !== pIdT) addRel('h|' + src + '|' + pIdT, { source: src, target: pIdT, kind: 'handoff' }, r.input)
      } else {
        addRel('in|' + aid(sup) + '|' + pIdT, { source: aid(sup), target: pIdT, kind: 'in' }, r.input)
      }
    }
    const cust = (r.customer || '').trim()
    if (cust && !isProc(cust))
      addRel('out|' + pIdT + '|' + aid(cust), { source: pIdT, target: aid(cust), kind: 'out' }, r.output)
  })
  const relations = Object.values(relMap).map((r) => ({
    id: r.id,
    source: r.source,
    target: r.target,
    kind: r.kind,
    nums: [...r.nums].sort((a, b) => a - b),
    texts: [...r.texts],
  }))

  // positions: seeded + auto-layout for missing. Actors wrap around all four
  // sides of the process band (suppliers on top/left, customers on bottom/right)
  // so a document with many flows stays compact instead of a long vertical stack.
  const positions = { ...(p.positions || {}) }
  const need = (id) => !positions[id]
  const P = Math.max(1, processes.length)
  const perRow = 4 // max process boxes per row; extra wrap to the next row
  const stepX = PROC_W + 64
  const procGapV = 58
  const rowH = PROC_H + procGapV
  const X0 = 440
  const CY = 540 // top-y of the first process row
  const maxCols = Math.min(P, perRow)
  const procRows = Math.ceil(P / perRow)

  processes.forEach((pr, i) => {
    const id = pid(pr.raw)
    const col = i % perRow
    const row = Math.floor(i / perRow)
    if (need(id)) positions[id] = { x: X0 + col * stepX, y: CY + row * rowH }
  })

  const bandLeft = X0
  const bandRight = X0 + (maxCols - 1) * stepX + PROC_W
  const bandCenterX = (bandLeft + bandRight) / 2
  const bandTop = CY
  const bandBottom = CY + (procRows - 1) * rowH + PROC_H

  const gapH = 30
  const gapV = 44
  const hStep = BOX_W + gapH
  const vStep = BOX_H + gapV
  const topY0 = bandTop - 168 // first row above the band (further rows go up)
  const botY0 = bandBottom + 70 // first row below the band (further rows go down)
  const leftX = bandLeft - (BOX_W + 78)
  const rightXpos = bandRight + 78

  const supAll = suppliers // suppliers (includes actors that are also customers)
  const custPlace = customers.filter((c) => !suppliers.some((s) => s.toLowerCase() === c.toLowerCase()))

  // A few boxes hug the sides; the rest spread across top/bottom, wrapping.
  const leftN = supAll.length > 4 ? 2 : 0
  const rightN = custPlace.length > 4 ? 2 : 0
  const colsTop = Math.max(P + 1, 4)
  const colsBot = Math.max(P + 1, 4)
  const topSX = bandCenterX - ((colsTop - 1) * hStep + BOX_W) / 2
  const botSX = bandCenterX - ((colsBot - 1) * hStep + BOX_W) / 2

  supAll.slice(0, leftN).forEach((a, i) => {
    const id = aid(a)
    if (need(id)) positions[id] = { x: leftX, y: bandTop + i * vStep }
  })
  supAll.slice(leftN).forEach((a, i) => {
    const id = aid(a)
    const c = i % colsTop
    const r = Math.floor(i / colsTop)
    if (need(id)) positions[id] = { x: topSX + c * hStep, y: topY0 - r * vStep }
  })
  custPlace.slice(0, rightN).forEach((a, i) => {
    const id = aid(a)
    if (need(id)) positions[id] = { x: rightXpos, y: bandTop + i * vStep }
  })
  custPlace.slice(rightN).forEach((a, i) => {
    const id = aid(a)
    const c = i % colsBot
    const r = Math.floor(i / colsBot)
    if (need(id)) positions[id] = { x: botSX + c * hStep, y: botY0 + r * vStep }
  })

  return { processes, suppliers, customers, actors, isProc, flows, flowNum, relations, positions, procRawFor }
}
