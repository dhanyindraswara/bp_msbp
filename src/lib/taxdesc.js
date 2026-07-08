// Taxonomy Description — data model for the process-description matrix
// (e.g. the "Taksonomi Description" table). Columns are processes (M7.1 … M7.5),
// rows are a fixed set of attributes (name, description, KPI, responsible,
// accountable). Multi-line attribute values render as bullet lists. Saved to
// the repository as TAXDESC-type documents. TaxDescTable.jsx renders it.
import { uid } from './constants.js'

const norm = (s) => (s == null ? '' : ('' + s)).trim()

// The fixed attribute rows, in display order. `bullets` = render newlines as a
// bullet list; otherwise as plain wrapped text.
export const TAXDESC_ROWS = [
  { key: 'name', label: 'Process Name', bullets: false },
  { key: 'description', label: 'Process Description', bullets: false },
  { key: 'kpi', label: 'Performance Indicator (Indicative)', bullets: true },
  { key: 'responsible', label: 'Responsible*', bullets: true },
  { key: 'accountable', label: 'Accountable*', bullets: true },
]

// A single process column.
export function taxdescProc(number = '', name = '') {
  return { id: uid(), number, name, description: '', kpi: '', responsible: '', accountable: '' }
}

// A fresh, empty description with a single process column.
export function blankTaxdesc() {
  return {
    title: '',
    subtitle: '',
    processes: [taxdescProc()],
  }
}

// A worked example reproducing the "M7 — HSE" reference table.
export function sampleTaxdesc() {
  return {
    title: 'Taksonomi Description',
    subtitle: 'Sub Judul: levelnya',
    processes: [
      {
        id: uid(),
        number: 'M7.1',
        name: 'HSE Strategy, Planning & Performance',
        description: "Define policies, strategic plans, governance frameworks, performance monitoring, and capability building. ITM Group's strategic safety leadership role.",
        kpi: 'Sites aligned with HSE Annual Plan (%)\nCompletion of HSE Program/Initiatives (%)\nEmployees’ safety awareness (%)',
        responsible: 'HSEC Head',
        accountable: 'HSEC Head',
      },
      {
        id: uid(),
        number: 'M7.2',
        name: 'Safety Risk and Incident Management',
        description: 'Manage operational safety risks, incident response, investigations, corrective actions, and regulatory compliance at site/cluster level.',
        kpi: '# Fatality & Total Recordable Injury\nLost time incident frequency rate\nIncidents Root Cause Analysis Completion (%)\nCorrective Actions Closed Within Target Timeframe (%)',
        responsible: 'HSEC Head\nKTT',
        accountable: 'HSEC Head',
      },
      {
        id: uid(),
        number: 'M7.3',
        name: 'Occupational Health Management',
        description: 'Manage workforce health risks, medical surveillance, occupational illnesses, and health promotion programs.',
        kpi: 'Production days lost through sickness absence (%)\n# Confirmed Occupational Illnesses (per 1,000 workers)\nIdentified Health Risks with Active Control Measures (%)',
        responsible: 'HSEC Head',
        accountable: 'HSEC Head',
      },
      {
        id: uid(),
        number: 'M7.4',
        name: 'Environmental Management',
        description: 'To manage environmental risks, ensure compliance with regulations and internal standards, and minimize the operational environmental footprint through effective assessment, control, and monitoring practices.',
        kpi: '# Environmental Incidents / Spills (per month or year)\n% of Scheduled Environmental Monitoring Completed on Time\nWaste Segregated or Treated per Type (%)',
        responsible: 'HSEC Head',
        accountable: 'HSEC Head',
      },
      {
        id: uid(),
        number: 'M7.5',
        name: 'Data Management & Analytics',
        description: 'Enable predictive safety and informed decision-making by managing the lifecycle of EHS data — from governance to actionable insights.',
        kpi: '# Predictive Insights / Dashboards Delivered\nData-Driven Actions Implemented Based on Analytics Recommendations (%)',
        responsible: 'HSEC Head\nIT Head\nDCOE & Innovation Head',
        accountable: 'HSEC Head',
      },
    ],
  }
}

// Guard a stored description so the render + form never hit undefined.
export function normTaxdesc(t) {
  const base = blankTaxdesc()
  if (!t || typeof t !== 'object') return base
  return {
    title: norm(t.title),
    subtitle: t.subtitle == null ? '' : t.subtitle,
    processes: Array.isArray(t.processes) && t.processes.length
      ? t.processes.map((p) => ({
          id: p.id || uid(),
          number: p.number || '',
          name: p.name || '',
          description: p.description || '',
          kpi: p.kpi || '',
          responsible: p.responsible || '',
          accountable: p.accountable || '',
        }))
      : base.processes,
  }
}
