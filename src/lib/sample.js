// Sample / blank project + localStorage loader. The default "HSE Marine &
// Logistic" sample matches the reference attachment.

import { KEY, uid } from './constants.js'

export function sampleProject() {
  const S = (supplier, input, process, output, customer) => ({
    id: uid(),
    supplier,
    input,
    process,
    output,
    customer,
  })
  const P1 = 'C3.1. HSE Marine & Logistic'
  const P2 = 'C3.2. Management System'
  const sipoc = [
    S('C4. Marine & Logistic Operation', 'Inform Accident', P1, 'Accident Report for Insurance', 'C4. Marine & Logistic Operation'),
    S('C4. Marine & Logistic Operation', 'Investigation Report', P1, 'Document Related to Safety (Investigation Report)', 'HSEC ITM'),
    S('Barge/FLF Owner', 'Inform Accident', P1, 'Monthly Report (HSE)', 'HSEC ITM'),
    S('ERSM', 'Inform Accident', P1, 'HSE Standard for Sourcing Parameter', 'Marine & Logistic Planning'),
    S(P1, 'Emergency Respons', P2, 'Risk Register', 'Marine & Logistic Planning'),
    S('MSBP', 'Advisory & Suppport (management system)', P2, 'Audit Support', 'Internal Audit'),
    S('Internal Audit', 'Support data dan lain lain untuk audit misalnya', P2, 'Support data dan lain lain untuk audit misalnya', 'MSBP'),
    S(P2, 'Risk Register', P1, 'Monthly Report (HSE)', 'MSBP'),
    S('C4. Marine & Logistic', 'Support data dan lain lain untuk audit misalnya', P2, 'Audit Support', 'C4. Marine & Logistic'),
  ]
  const flows = [
    'Accident Report for Insurance',
    'Inform Accident',
    'Document Related to Safety (Investigation Report)',
    'Monthly Report (HSE)',
    'Investigation Report',
    'Risk Register',
    'Emergency Respons',
    'Advisory & Suppport (management system)',
    'Audit Support',
    'Support data dan lain lain untuk audit misalnya',
    'HSE Standard for Sourcing Parameter',
  ].map((text, i) => ({ n: i + 1, text }))
  const ppi = [
    { id: uid(), process: P1, indicator: 'Maks tanggal 10 setiap bulan' },
    { id: uid(), process: '', indicator: 'Zero Accident & Zero Fatality' },
    { id: uid(), process: '', indicator: 'Safety Management Training 1x setahun vendor (Monitor & Asses dilakukan vendor)' },
    { id: uid(), process: P2, indicator: 'Submit & Followup temuan audit sesuai target date' },
    { id: uid(), process: '', indicator: 'Submit & Followup risk register within target date' },
    { id: uid(), process: '', indicator: 'Pembaruan/Review document setiap 2 tahun' },
  ]
  const positions = {
    ['P:' + P1]: { x: 330, y: 410 },
    ['P:' + P2]: { x: 672, y: 410 },
    'A:HSEC ITM': { x: 330, y: 150 },
    'A:ERSM': { x: 628, y: 150 },
    'A:Marine & Logistic Planning': { x: 930, y: 150 },
    'A:C4. Marine & Logistic Operation': { x: 28, y: 410 },
    'A:Internal Audit': { x: 1030, y: 410 },
    'A:Barge/FLF Owner': { x: 236, y: 660 },
    'A:C4. Marine & Logistic': { x: 536, y: 660 },
    'A:MSBP': { x: 848, y: 660 },
  }
  return {
    header: { processName: 'HSE Marine & Logistic', processOwner: 'C4. HSE Marine & Logistic', version: '1.0' },
    sipoc,
    ppi,
    flows,
    positions,
    rasciOverrides: {},
    flowLabelMode: 'number',
    highlight: 'C4. Marine & Logistic',
  }
}

export function blankProject() {
  return {
    header: { processName: '', processOwner: '', version: '1.0' },
    sipoc: [{ id: uid(), supplier: '', input: '', process: '', output: '', customer: '' }],
    ppi: [],
    flows: [],
    positions: {},
    rasciOverrides: {},
    flowLabelMode: 'number',
    highlight: '',
  }
}

export function loadInitial() {
  try {
    const s = localStorage.getItem(KEY)
    if (s) return JSON.parse(s)
  } catch (e) {
    /* ignore */
  }
  return sampleProject()
}
