// SOP Detail — data model for the full narrative body of a company SOP
// (the ITM "Standard Operating Procedure" form). This menu builds every part
// of the SOP EXCEPT the flow diagram (point 6), which is authored in Auto Flow
// Process and merely linked here. Point 7 ("Process Description & Control") is
// derived from the linked flow's steps — each flow step becomes one numbered
// item the user writes a description for. Saved to the repository as
// SOPDETAIL-type documents; SopDetailDoc.jsx renders the paper.
import { uid } from './constants.js'

const norm = (s) => (s == null ? '' : ('' + s)).trim()

// The four sign-off columns of the title block, in display order.
export const APPROVAL_ROLES = [
  { key: 'prepared', label: 'Prepared by' },
  { key: 'checked', label: 'Checked by' },
  { key: 'reviewed', label: 'Reviewed by' },
  { key: 'approved', label: 'Approved by' },
]

const blankSign = () => ({ name: '', position: '' })

export function historyRow(revision = '', date = '', changes = '') {
  return { id: uid(), revision, date, changes }
}
export function definitionRow(term = '', definition = '') {
  return { id: uid(), term, definition }
}
export function procItem(ref = '', title = '', description = '') {
  return { id: uid(), ref, title, description }
}
export function procGroup(label = '', items = []) {
  return { id: uid(), label, items: items.length ? items : [procItem()] }
}

// A fresh, empty SOP body.
export function blankSopDetail() {
  return {
    // title block
    docNo: '',
    title: '',
    issuedDate: '',
    revision: '00',
    revisionDate: '',
    logo: '',
    // page-1 blocks
    history: [historyRow('-', '-', '-')],
    approvals: { prepared: blankSign(), checked: blankSign(), reviewed: blankSign(), approved: blankSign() },
    distribution: '',
    ppi: '',
    // 1..5, 8 — narrative sections (one point per line where noted)
    purpose: '',
    scope: '',
    definitions: [definitionRow()],
    references: '',
    reviewValidation: '',
    // 6 — link to a FLOW document (authored in Auto Flow Process)
    flowRef: '',
    flowLabel: '',
    // 7 — process description & control (derived from the linked flow)
    procGroups: [procGroup('')],
    // 8 — related / supported documents
    relatedDocs: '',
  }
}

// A worked example reproducing the "ITM-SOP-SCM-2026-004 Fuel Supply" document,
// so the user sees the form come to life immediately and edit from there.
export function sampleSopDetail() {
  return {
    docNo: 'ITM-SOP-SCM-2026-004',
    title: 'Fuel Supply',
    issuedDate: '10-05-2026',
    revision: '00',
    revisionDate: '-',
    logo: '',
    history: [historyRow('-', '-', '-')],
    approvals: {
      prepared: { name: 'Chrisna Permana A.', position: 'Shipment Operation Management System' },
      checked: { name: 'Dhany Indraswara', position: 'Shipment Coordination Head' },
      reviewed: { name: 'Aungkoon Taksinapimuk', position: 'Shipment Coordination Head' },
      approved: { name: 'Aungkoon Taksinapimuk', position: 'Shipment Coordination Head' },
    },
    distribution: 'All Directors\nAll Head of Organization Unit (Head Office and Site)\nAll Head of Sub Organization Unit (Head Office and Site)',
    ppi: 'Ensure no delay during bunker permit arrangement and Process fuel supply (Time)\nEnsure no incident happened related safety and environment during Process fuel supply (Qty)',
    purpose:
      'Make this work procedure readily available at workplace, ensuring all parties involved perform their respective jobs systematically, orderly and effectively.\n' +
      'Understand the whole process of Fuel Supply to Tugboat/ towing tugs Etc.\n' +
      'Understand and know the correlation of all parties who are involved in this process\n' +
      'Be the key process for each party to further develop its relevant documents',
    scope:
      'This Standard Operating Procedures (SOP) applied within the operational areas of PT Indo Tambangraya Megah (ITM) and its subsidiaries/Sites that cover process on Fuel Supply to Tugboat.\n\n' +
      'All of preparation and job related to fuel supply for Tugboat with all parties involved (Chief Engineer of Tug, Fuel man). And understanding how to prevent fuel leaking and marine pollution with guideline protocol Marpol 73/78 (Annex 1).',
    definitions: [
      definitionRow('Fuel Supply', 'Transferring fuel from mobile tank to Tugboat for operation at SMD (sailing in Mahakam River, berthing-unberthing at loading port and unloading port/anchorage point)'),
      definitionRow('CE (Chief Engineer)', 'A tugboat officer responsible for fuel consumption and fuel stock reporting onboard.'),
      definitionRow('ROB (Remaining on Board)', 'The amount of fuel remaining onboard the tugboat.'),
      definitionRow('Fuel man', 'Person under Shipment Coord Dept. who serve fuel supply from shore tank to the tugboat.'),
      definitionRow('BMBB (Bongkar Muat Barang Berbahaya)', 'A document submitted by Fuel Supplier to KSOP via the INAPORTNET system to regulate bunker activities.'),
      definitionRow('BLMS (Barge Logistics Management System)', 'System used for logging, monitoring, and reconciling fuel data.'),
      definitionRow('Delivery Order', 'A document issued by ITM Fleet Management Support containing Tugboat name and approved fuel quantity for transfer authorization.'),
      definitionRow('INAPORTNET', 'A digital platform used for submitting and approving BMBB (Dangerous Goods Permit) and bunker permit documents by KSOP.'),
      definitionRow('KSOP (Port Authority)', 'The authority responsible for approving BMBB (Dangerous Goods Permit) and bunker permit documents.'),
      definitionRow('TMS (Tug Management System)', 'A system used by the Tug Master to record the start and completion of bunker operations.'),
      definitionRow('Tug Master', 'The captain of the tugboat is responsible for executing and recording bunker activities.'),
    ],
    references:
      'Government Regulation No. 50 of 2012 concerning the Implementation of Occupational Health and Safety Management System\n' +
      'Ministerial Decree No. 1827 K/30/MEM/2018 concerning Guidelines for the Implementation of Good Mining Engineering Principles\n' +
      'Minister of Energy and Mineral Resources No. 26 of 2018 concerning the Implementation of Good Mining Rules and Supervision in Mineral and Coal Mining\n' +
      'ISO 9001:2015 – Quality Management System\n' +
      'ISO 14001:2015 – Environmental Management System\n' +
      'ISO 45001:2018 – Occupational Health and Safety Management System\n' +
      'Safety of Life at Sea (SOLAS) – International Maritime Organization (IMO)\n' +
      'Shipping Law No. 17 of 2008\n' +
      'Marine Pollution Protocol (Marpol 73/78) Annex 1 – International Maritime Organization (IMO)',
    reviewValidation:
      'This Standard Operating Procedure shall be reviewed for at least 2 (two) years and/or when there are changes in processes, reference requirements and compliance with related legislation, as well as cases related to occupational health and safety (Minor, Moderate, Major) & environment, as well as needs from management.',
    flowRef: '',
    flowLabel: 'C3.2 Fuel Supply',
    procGroups: [
      procGroup('Fleet Management', [
        procItem('7.1.1', 'Bunker Order', 'The agency shall initiate the bunkering process by placing a fuel order in accordance with operational requirements.'),
        procItem('7.1.2', 'Release Loading Order', 'ITM Fleet Management Support release loading order with detail information of Tugboat name and Fuel Quantity for Tug Agency and Fuel Supplier in usage for arranging BMBB (Dangerous Goods Permit) and Bunker Permit.'),
        procItem('7.1.3', 'Propose BMBB (INAPORTNET)', 'Fuel Supplier submits the BMBB (Dangerous Goods Permit) document to KSOP (Port Authority) through the INAPORTNET system.'),
        procItem('7.1.4', 'Approve BMBB (INAPORTNET)', 'KSOP reviews and approves the BMBB (Dangerous Goods Permit) in the INAPORTNET platform to authorize bunker activity.'),
        procItem('7.1.5', 'Bunker Permit Arrangement', 'The agency prepares and submits the required documents to arrange the bunker permit Document to KSOP through the INAPORTNET system.'),
        procItem('7.1.6', 'Approve Bunker Permit', 'KSOP validates and approves the bunker permit in the INAPORTNET platform to authorize bunker activity.'),
        procItem('7.1.7', 'Receive Bunker Permit', 'The agency receives the approved bunker permit from KSOP through the INAPORTNET system and inform to ITM Fleet Management Support, and Fuel Bunker supplier.'),
        procItem('7.1.8', 'Issued Delivery Order', 'ITM Fleet Management Support issues a Delivery order with detail information of Tugboat name and Fuel Quantity to authorize the fuel transfer process.'),
        procItem('7.1.9', 'Sounding Check', 'The crew of Tugboat performs a sounding check to measure fuel levels before the supply begins.'),
        procItem('7.1.10', 'Fuel Supply for Tugboat', 'Fuel is transferred to the tugboat according to the approved permit and Delivery order.'),
        procItem('7.1.11', 'Tug Master inputs initiation and completion of bunker operations', 'The Tug Master inputs the start and completion of bunker operations into the Tug Management System (TMS).'),
        procItem('7.1.12', 'Fuel Receiving, Recording & Monitoring', 'Fuel receiving, recording, and monitoring activities are logged in the Barge Logistics Management System (BLMS).'),
        procItem('7.1.13', 'Fuel Data Reconciliation', 'Fuel data is reconciled and recorded in the Barge Logistics Management System (BLMS) to ensure accuracy.'),
        procItem('7.1.14', 'Fuel Variance Adjustment', 'Any discrepancies in fuel volume are adjusted and documented in the BLMS.'),
      ]),
    ],
    relatedDocs:
      'ITM-BP-STSC-001 Process Map - ITM Short Term Supply Chain Shipment Coordination\n' +
      'ITM-SOP-SCM-2025-003 – Fleet Management',
  }
}

// Guard a stored SOP body so the render + form never hit undefined.
export function normSopDetail(s) {
  const base = blankSopDetail()
  if (!s || typeof s !== 'object') return base
  const sign = (o) => ({ name: (o && o.name) || '', position: (o && o.position) || '' })
  const ap = s.approvals || {}
  return {
    docNo: norm(s.docNo),
    title: norm(s.title),
    issuedDate: norm(s.issuedDate),
    revision: s.revision == null ? '00' : ('' + s.revision),
    revisionDate: s.revisionDate == null ? '' : ('' + s.revisionDate),
    logo: s.logo || '',
    history: Array.isArray(s.history) && s.history.length
      ? s.history.map((h) => ({ id: h.id || uid(), revision: h.revision || '', date: h.date || '', changes: h.changes || '' }))
      : base.history,
    approvals: {
      prepared: sign(ap.prepared),
      checked: sign(ap.checked),
      reviewed: sign(ap.reviewed),
      approved: sign(ap.approved),
    },
    distribution: s.distribution == null ? '' : ('' + s.distribution),
    ppi: s.ppi == null ? '' : ('' + s.ppi),
    purpose: s.purpose == null ? '' : ('' + s.purpose),
    scope: s.scope == null ? '' : ('' + s.scope),
    definitions: Array.isArray(s.definitions) && s.definitions.length
      ? s.definitions.map((d) => ({ id: d.id || uid(), term: d.term || '', definition: d.definition || '' }))
      : base.definitions,
    references: s.references == null ? '' : ('' + s.references),
    reviewValidation: s.reviewValidation == null ? '' : ('' + s.reviewValidation),
    flowRef: norm(s.flowRef),
    flowLabel: s.flowLabel == null ? '' : ('' + s.flowLabel),
    procGroups: Array.isArray(s.procGroups) && s.procGroups.length
      ? s.procGroups.map((g) => ({
          id: g.id || uid(),
          label: g.label || '',
          items: Array.isArray(g.items) && g.items.length
            ? g.items.map((it) => ({ id: it.id || uid(), ref: it.ref || '', title: it.title || '', description: it.description || '' }))
            : [procItem()],
        }))
      : base.procGroups,
    relatedDocs: s.relatedDocs == null ? '' : ('' + s.relatedDocs),
  }
}

// Derive the point-7 items from a linked flow's steps. Every real step (not a
// start/end/connector marker) becomes one numbered item; the flow step's `ref`
// (e.g. "7.1.1") is the number and its `activity` the item title. Descriptions
// already written for a matching ref are preserved when re-syncing.
export function deriveProcItems(flow, existingItems = []) {
  const prevByRef = {}
  ;(existingItems || []).forEach((it) => {
    const k = norm(it.ref) || norm(it.title)
    if (k) prevByRef[k] = it
  })
  const skip = new Set(['start', 'end', 'onpage', 'offpage'])
  const steps = (flow && flow.steps ? flow.steps : []).filter((st) => !skip.has(st.type) && norm(st.activity))
  return steps.map((st) => {
    const ref = norm(st.ref) || norm(st.no)
    const prev = prevByRef[ref] || prevByRef[norm(st.activity)]
    return procItem(ref, norm(st.activity), prev ? prev.description : '')
  })
}

// Split a textarea value into trimmed, non-empty lines (list rendering).
export function lines(text) {
  return ('' + (text || '')).split('\n').map((l) => l.trim()).filter(Boolean)
}
// Split into paragraphs on blank lines (kept as wrapped blocks).
export function paragraphs(text) {
  return ('' + (text || '')).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
}
