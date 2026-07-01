# ITM SIPOC Studio

A web app that turns a **single SIPOC table** into two editable, exportable deliverables:

1. an **ITM-style business process map** (React Flow), and
2. a **RASCI matrix**.

Everything downstream — processes, suppliers/customers, handoffs, numbered
document flows, and the RASCI grid — is generated automatically from the SIPOC
input, then can be edited by hand.

## Stack

- **React 18** + **Vite**
- **[reactflow](https://reactflow.dev) v11** for the process map
- **SheetJS (xlsx)** for `.xlsx` / `.csv` import and XLSX/CSV export
- **html-to-image** for PNG export
- **Tailwind CSS** (+ ported component styles) for the corporate visual style

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## The three views

- **SIPOC editor** (default) — header fields (Process name / owner / version), a
  5-column editable grid (Suppliers · Inputs · Process · Outputs · Customers)
  with add/delete rows and multi-row paste from Excel, a separate PPI editor,
  and `.xlsx` / `.csv` import following the ITM template layout. **Generate →**
  jumps to the map.
- **Business process map** — process boxes grouped in a light-blue Level-2 band,
  suppliers on the left (blue IN arrows), customers on the right (green OUT
  arrows), grey dashed handoff arrows between processes. Edge labels toggle
  between numbered flows (**Flow #**) and full **Text**, wired to the right-side
  legend (numbered Data/Document/Information Flow + PPI grouped per process).
  Drag to arrange, double-click to rename, hover a grey box for the remove ✕.
  Export **PNG** / **JSON**.
- **RASCI matrix** — rows = sub-processes, columns = actors (non-process
  suppliers + customers + process owner). Auto-rules: owner → **A/R**,
  advisory/regulator → **C**, input suppliers → **S**, customers → **I**;
  every cell is overridable via dropdown, with exactly-one-Accountable
  validation warnings. Export **CSV** / **XLSX** and copy-to-clipboard.

## Persistence

The whole project (header + SIPOC + PPI + node positions + RASCI overrides) is a
single JSON object. **New / Save / Load** use `localStorage`; **Import JSON /
Export JSON** move it as a file. A filled-in **"HSE Marine & Logistic"** sample
(matching the reference attachment) loads on first open.

## Data model

```
header:  { processName, processOwner, version }
sipoc:   [{ id, supplier, input, process, output, customer }]   // 1 row = 1 relation
ppi:     [{ id, process, indicator }]                           // blank process = continues the one above
flows:   [{ n, text }]                                          // numbered document/data flows
positions, rasciOverrides, flowLabelMode, highlight
```

Derived at runtime (never stored as source): distinct processes (split into
`{code, name}`), actor boxes, process→process handoffs, and the flow-numbered
edges.

## Note on SheetJS

The original design pinned `xlsx@0.20.3` from the SheetJS CDN. That CDN is
unreachable here, so this build uses `xlsx@0.18.5` from the npm registry — the
same API for every call the app makes (`read`, `sheet_to_json`, `aoa_to_sheet`,
`writeFile`). If you want the newest SheetJS, install it from
`https://cdn.sheetjs.com` per their docs.

---

The original Claude Design export lives in `project/` (the `.dc.html` prototype
and reference screenshots) for reference.
