// Minimal, dependency-free PDF writer.
//
// Builds a single-page A4 PDF that embeds one JPEG image, scaled to fit the
// page with a small margin. A JPEG embeds into a PDF as a raw /DCTDecode
// stream, so no re-encoding (and no PDF library) is needed.

// Decode a `data:image/jpeg;base64,...` URL into raw bytes.
export function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// jpegBytes: Uint8Array of JPEG data. imgW/imgH: image pixel dimensions.
// Returns a Blob of type application/pdf.
export function jpegToPdfBlob(jpegBytes, imgW, imgH) {
  const enc = (s) => new TextEncoder().encode(s)

  // A4 in PostScript points (1/72 inch); orient to match the image.
  const A4 = { short: 595.28, long: 841.89 }
  const landscape = imgW >= imgH
  const pageW = landscape ? A4.long : A4.short
  const pageH = landscape ? A4.short : A4.long

  const margin = 18
  const scale = Math.min((pageW - margin * 2) / imgW, (pageH - margin * 2) / imgH)
  const drawW = imgW * scale
  const drawH = imgH * scale
  const tx = (pageW - drawW) / 2
  const ty = (pageH - drawH) / 2

  const parts = []
  const offsets = []
  let pos = 0
  const push = (u8) => {
    parts.push(u8)
    pos += u8.length
  }
  const pushStr = (s) => push(enc(s))
  const obj = (n, body) => {
    offsets[n] = pos
    pushStr(`${n} 0 obj\n${body}\nendobj\n`)
  }

  pushStr('%PDF-1.3\n')

  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  )

  // Image XObject with the raw JPEG stream.
  offsets[4] = pos
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  )
  push(jpegBytes)
  pushStr('\nendstream\nendobj\n')

  // Content stream: place the unit image scaled/translated onto the page.
  const content = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)} cm\n/Im0 Do\nQ\n`
  offsets[5] = pos
  pushStr(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`)

  // Cross-reference table + trailer.
  const xrefPos = pos
  const count = 6 // objects 0..5
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`
  for (let i = 1; i < count; i++) xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n'
  pushStr(xref)
  pushStr(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`)

  const total = parts.reduce((a, u) => a + u.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const u of parts) {
    out.set(u, o)
    o += u.length
  }
  return new Blob([out], { type: 'application/pdf' })
}
