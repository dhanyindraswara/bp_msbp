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

  // positions: seeded + auto-layout for missing
  const positions = { ...(p.positions || {}) }
  const need = (id) => !positions[id]
  const procW = PROC_W + 56
  processes.forEach((pr, i) => {
    const id = pid(pr.raw)
    if (need(id)) positions[id] = { x: 360 + i * procW, y: 400 }
  })
  const supOnly = suppliers.filter((s) => !customers.some((c) => c.toLowerCase() === s.toLowerCase()))
  const custOnly = customers.filter((c) => !suppliers.some((s) => s.toLowerCase() === c.toLowerCase()))
  const both = actors.filter(
    (a) =>
      suppliers.some((s) => s.toLowerCase() === a.toLowerCase()) &&
      customers.some((c) => c.toLowerCase() === a.toLowerCase()),
  )
  const rightX = 360 + Math.max(1, processes.length) * procW + 60
  supOnly.forEach((s, i) => {
    const id = aid(s)
    if (need(id)) positions[id] = { x: 40, y: 150 + i * 138 }
  })
  custOnly.forEach((c, i) => {
    const id = aid(c)
    if (need(id)) positions[id] = { x: rightX, y: 150 + i * 138 }
  })
  both.forEach((b, i) => {
    const id = aid(b)
    if (need(id)) positions[id] = { x: 340 + i * (BOX_W + 60), y: 150 }
  })

  return { processes, suppliers, customers, actors, isProc, flows, flowNum, relations, positions, procRawFor }
}
