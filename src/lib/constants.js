// Shared constants for ITM SIPOC Studio (ported from the design prototype).

export const KEY = 'itm-sipoc-studio-v1'

// Corporate palette from the spec.
export const C = {
  boxBg: '#eceef1',
  boxBorder: '#c8ccd2',
  bandBg: '#dcecf6',
  bandBorder: '#9cc3e3',
  procBorder: '#2f6fb0',
  inC: '#2f6fb0',
  outC: '#3f9142',
  hoC: '#6b7280',
  hi: '#c5d8ef',
  hiB: '#7ba7d4',
}

export const RASCI_OPTS = ['', 'A/R', 'R', 'A', 'S', 'C', 'I']

export const RASCI_COLOR = {
  R: { bg: '#e3f3e8', fg: '#256d33' },
  A: { bg: '#e1edf9', fg: '#1f4f86' },
  S: { bg: '#edeff2', fg: '#4b5563' },
  C: { bg: '#fbf1d4', fg: '#8a6b00' },
  I: { bg: '#ece5fb', fg: '#5b3fb8' },
}

export const PROC_W = 194
export const PROC_H = 94
export const BOX_W = 180
export const BOX_H = 88

export const uid = () => 'r' + Math.random().toString(36).slice(2, 9)
