// High Level Business Process — data model for the company-wide value chain
// (e.g. "ITM High Level Business Process"). It's a stack of horizontal bands
// (Management / Core / Enabler), each holding a set of coded boxes with a
// circular badge (M1, C1, E1 …). Boxes can be highlighted ("selected to be
// outlined to L1–L3"). Saved to the repository as HLP-type documents.
// HlpChart.jsx is a pure render of this shape.
import { uid } from './constants.js'

const norm = (s) => (s == null ? '' : ('' + s)).trim()

// A single process box: a short code shown in the badge + a name, and an
// optional highlight flag.
export function hlpBox(code = '', name = '', hi = false) {
  return { id: uid(), code, name, hi }
}

// A fresh, empty high-level process with the three standard ITM bands.
export function blankHlp() {
  return {
    title: '',
    subtitle: '',
    footnote: '',
    bands: [
      { id: uid(), name: 'Management Process', items: [] },
      { id: uid(), name: 'Core Process', items: [] },
      { id: uid(), name: 'Enabler Process', items: [] },
    ],
  }
}

// A worked example reproducing the "ITM High Level Business Process" reference.
export function sampleHlp() {
  return {
    title: 'ITM High Level Business Process',
    subtitle: 'Capturing General Core Value Chain',
    footnote: '*New business to be launched   ·   Highlighted = selected processes to be outlined to L1 – L3',
    bands: [
      {
        id: uid(),
        name: 'Management Process',
        items: [
          hlpBox('M1', 'Enterprise Performance Management'),
          hlpBox('M2', 'Governance, Risk, and Compliance'),
          hlpBox('M3', 'Legal'),
          hlpBox('M4', 'Business Development'),
          hlpBox('M5', 'Corporate Relation Management', true),
          hlpBox('M6', 'Corporate Secretary'),
          hlpBox('M7', 'Health, Safety, Environment'),
        ],
      },
      {
        id: uid(),
        name: 'Core Process',
        items: [
          hlpBox('C1', 'Coal Mining and Services'),
          hlpBox('C2', 'Renewable and Others*'),
          hlpBox('C3', 'Strategic Minerals*'),
          hlpBox('C4', 'Sales and Marketing'),
        ],
      },
      {
        id: uid(),
        name: 'Enabler Process',
        items: [
          hlpBox('E1', 'Finance'),
          hlpBox('E2', 'Human Capital Management'),
          hlpBox('E3', 'Facility Management'),
          hlpBox('E4', 'Supply Chain Management'),
          hlpBox('E5', 'Information Technology'),
          hlpBox('E6', 'Asset Management'),
        ],
      },
    ],
  }
}

// Guard a stored high-level process so the render + form never hit undefined.
export function normHlp(h) {
  const base = blankHlp()
  if (!h || typeof h !== 'object') return base
  return {
    title: norm(h.title),
    subtitle: h.subtitle == null ? '' : h.subtitle,
    footnote: h.footnote == null ? '' : h.footnote,
    bands: Array.isArray(h.bands) && h.bands.length
      ? h.bands.map((b) => ({
          id: b.id || uid(),
          name: b.name || '',
          items: Array.isArray(b.items) ? b.items.map((it) => ({ id: it.id || uid(), code: it.code || '', name: it.name || '', hi: !!it.hi })) : [],
        }))
      : base.bands,
  }
}
