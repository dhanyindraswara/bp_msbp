// Business Process Taxonomy — data model for the L0 → L3 process hierarchy
// diagram (e.g. "E4. Shipment Coordination"). A taxonomy has two spanning
// bands (L0 core-process label + L1 process-group label) and a set of columns.
// Each column carries one L2 category box and a stack of L3 child boxes below
// it. Saved to the repository as TAXONOMY-type documents. TaxonomyChart.jsx is
// a pure render of this shape.
import { uid } from './constants.js'

const norm = (s) => (s == null ? '' : ('' + s)).trim()

// A single L2/L3 box: a short code + a name, and an optional highlight flag
// (blue outline — "selected process to be detailed further").
export function taxBox(code = '', name = '', hi = false) {
  return { id: uid(), code, name, hi }
}

// A fresh, empty taxonomy: two spanning bands + one column with an empty L2.
export function blankTaxonomy() {
  return {
    title: '',
    l0: 'Core Process',
    l1: '',
    columns: [{ id: uid(), l2: taxBox(), l3: [] }],
  }
}

// A worked example reproducing the "E4. Shipment Coordination" reference so the
// user sees the diagram come to life and can edit from there.
export function sampleTaxonomy() {
  return {
    title: 'E4. Shipment Coordination (Taksonomi)',
    l0: 'Core Process',
    l1: 'C4. Marine & Logistic',
    columns: [
      {
        id: uid(),
        l2: taxBox('C4.1', 'Marine & Logistics Planning', true),
        l3: [taxBox('E4.1.1', 'Barge & Shipment Planning'), taxBox('E4.1.3', 'Data Management')],
      },
      {
        id: uid(),
        l2: taxBox('E4.2', 'Marine & Logistic Operation', true),
        l3: [
          taxBox('E4.1.3', 'Barge Operation'),
          taxBox('E4.1.3', 'Shipment Operation'),
          taxBox('E4.1.3', 'Compliance & Document', true),
        ],
      },
      {
        id: uid(),
        l2: taxBox('E2.8', 'Quality Assurance'),
        l3: [taxBox('E2.8', 'Marine & Logistic System Development')],
      },
    ],
  }
}

// Guard a stored taxonomy so the render + form never hit undefined.
export function normTaxonomy(t) {
  const base = blankTaxonomy()
  if (!t || typeof t !== 'object') return base
  return {
    title: norm(t.title),
    l0: t.l0 == null ? base.l0 : t.l0,
    l1: t.l1 == null ? '' : t.l1,
    columns: Array.isArray(t.columns) && t.columns.length
      ? t.columns.map((c) => ({
          id: c.id || uid(),
          l2: { id: (c.l2 && c.l2.id) || uid(), code: (c.l2 && c.l2.code) || '', name: (c.l2 && c.l2.name) || '', hi: !!(c.l2 && c.l2.hi) },
          l3: Array.isArray(c.l3) ? c.l3.map((b) => ({ id: b.id || uid(), code: b.code || '', name: b.name || '', hi: !!b.hi })) : [],
        }))
      : base.columns,
  }
}
