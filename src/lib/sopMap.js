// Map an imported SOP (docType SOP, `sop` payload from Document Import) into the
// SIPOC/PPI model the studio edits. Without this, an imported document opens with
// an empty SIPOC table even though the extracted data is stored on the doc.
//
// A procedure step becomes one SIPOC row: the step's PIC is the supplier (the
// actor doing/handing off the work), the next step's PIC is the customer (who
// receives the output), and input/activity/output map straight across. It's a
// starting point the user can refine — the point is the imported data is visible
// and editable instead of blank.
import { uid } from './constants.js'

const s = (v) => (v == null ? '' : ('' + v)).trim()

// True if the project already has any real SIPOC content.
export const hasSipocData = (project) =>
  (project?.sipoc || []).some((r) => s(r.supplier) || s(r.input) || s(r.process) || s(r.output) || s(r.customer))

export function sopToSipoc(sop) {
  const steps = (sop?.steps || []).filter((st) => s(st.activity) || s(st.input) || s(st.output) || s(st.pic))
  return steps.map((st, i) => ({
    id: uid(),
    supplier: s(st.pic),
    input: s(st.input),
    process: s(st.activity),
    output: s(st.output),
    customer: i + 1 < steps.length ? s(steps[i + 1].pic) : '',
  }))
}

export function sopToPpi(sop) {
  return (sop?.ppi || [])
    .map((x) => s(x))
    .filter(Boolean)
    .map((indicator) => ({ id: uid(), process: '', indicator }))
}
