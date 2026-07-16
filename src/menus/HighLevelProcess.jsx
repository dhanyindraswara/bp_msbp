// LEAP-STONES › High Level Process — the user defines the company value chain as a
// stack of bands (Management / Core / Enabler), each holding coded process
// boxes. The system draws the ITM-style high-level process map. Saved to the
// repository as HLP-type documents and reopenable here for editing.
import { useState, useEffect, useMemo } from 'react'
import { blankHlp, sampleHlp, normHlp, hlpBox } from '../lib/hlp.js'
import { blankProject } from '../lib/sample.js'
import { createDoc, saveDoc, getDoc, listDocs } from '../lib/store.js'
import { uid } from '../lib/constants.js'
import HlpChart from '../components/HlpChart.jsx'

const Field = ({ label, value, onChange, placeholder }) => (
  <label className="imp-field imp-field-wide">
    <span>{label}</span>
    <input value={value || ''} placeholder={placeholder || ''} onChange={(e) => onChange(e.target.value)} />
  </label>
)

export default function HighLevelProcess({ openId, setOpenId, notify }) {
  const [hlp, setHlp] = useState(() => (openId ? normHlp(getDoc(openId)?.hlp) : blankHlp()))
  const [savedId, setSavedId] = useState(openId || '')

  useEffect(() => {
    if (!openId) return
    const d = getDoc(openId)
    if (d) {
      setHlp(normHlp(d.hlp))
      setSavedId(openId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  useEffect(() => {
    if (!savedId) return
    const t = setTimeout(() => {
      const d = getDoc(savedId)
      if (!d) return
      const project = { ...(d.project || blankProject()) }
      project.header = { ...(project.header || {}), processName: hlp.title || 'High Level Business Process' }
      saveDoc({ id: savedId, project, extra: { hlp } })
    }, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hlp, savedId])

  const hlpDocs = useMemo(() => listDocs().filter((d) => d.docType === 'HLP'), [savedId, hlp])

  const set = (patch) => setHlp((p) => ({ ...p, ...patch }))
  const setBand = (bi, patch) => setHlp((p) => ({ ...p, bands: p.bands.map((b, i) => (i === bi ? { ...b, ...patch } : b)) }))
  const setItem = (bi, ii, patch) =>
    setBand(bi, { items: hlp.bands[bi].items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) })
  const addBand = () => setHlp((p) => ({ ...p, bands: [...p.bands, { id: uid(), name: 'New band', items: [] }] }))
  const delBand = (bi) => setHlp((p) => ({ ...p, bands: p.bands.filter((_, i) => i !== bi) }))
  const addItem = (bi) => setBand(bi, { items: [...hlp.bands[bi].items, hlpBox()] })
  const delItem = (bi, ii) => setBand(bi, { items: hlp.bands[bi].items.filter((_, j) => j !== ii) })

  const saveNew = () => {
    const project = blankProject()
    project.header.processName = hlp.title || 'High Level Business Process'
    const d = createDoc(project, { docType: 'HLP', hlp })
    setSavedId(d.id)
    setOpenId && setOpenId(d.id)
    notify && notify('High Level Process disimpan sebagai ' + d.id)
  }
  const newHlp = () => {
    setHlp(blankHlp())
    setSavedId('')
    setOpenId && setOpenId(null)
  }
  const loadSample = () => {
    setHlp(sampleHlp())
    setSavedId('')
    setOpenId && setOpenId(null)
  }

  return (
    <div className="fl-page">
      <div className="fl-page-hd">
        <div>
          <h1>High Level Process</h1>
          <p>Petakan value chain perusahaan secara keseluruhan — Management, Core, dan Enabler Process — lalu ekspor.</p>
        </div>
        <div className="fl-page-actions">
          <button className="btn btn-sm" onClick={loadSample}>Load sample</button>
          <button className="btn btn-sm" onClick={newHlp}>Map baru</button>
          {savedId ? (
            <span className="chip chip-id" title="Tersimpan otomatis">{savedId}</span>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={saveNew}>Simpan ke Repository</button>
          )}
        </div>
      </div>

      <div className="fl-split">
        <div className="fl-form">
          <div className="imp-sec">Judul</div>
          <div className="imp-grid">
            <Field label="Judul" value={hlp.title} onChange={(v) => set({ title: v })} placeholder="ITM High Level Business Process" />
            <Field label="Sub judul" value={hlp.subtitle} onChange={(v) => set({ subtitle: v })} placeholder="Capturing General Core Value Chain" />
            <Field label="Catatan kaki / legend" value={hlp.footnote} onChange={(v) => set({ footnote: v })} placeholder="*New business to be launched" />
          </div>

          <div className="imp-sec">
            Band ({hlp.bands.length})
            <button className="btn btn-sm" onClick={addBand}>+ Band</button>
          </div>
          <div className="fl-hint">
            Tiap band = satu lapis proses (Management / Core / Enabler). Isi kode (badge) &amp; nama tiap kotak. Centang <b>HL</b> untuk highlight.
          </div>

          {hlp.bands.map((band, bi) => (
            <div key={band.id} className="tx-colcard">
              <div className="tx-colcard-hd">
                <input className="tx-inp hlp-bandname" value={band.name} placeholder="Nama band" onChange={(e) => setBand(bi, { name: e.target.value })} />
                {hlp.bands.length > 1 ? (
                  <button className="imp-x" title="Hapus band" onClick={() => delBand(bi)}>✕ band</button>
                ) : null}
              </div>
              {band.items.map((it, ii) => (
                <div key={it.id} className="tx-l3edit">
                  <input className="tx-inp tx-inp-code" value={it.code} placeholder="Kode" onChange={(e) => setItem(bi, ii, { code: e.target.value })} />
                  <input className="tx-inp" value={it.name} placeholder="Nama proses" onChange={(e) => setItem(bi, ii, { name: e.target.value })} />
                  <label className="tx-hicheck" title="Highlight kotak">
                    <input type="checkbox" checked={!!it.hi} onChange={(e) => setItem(bi, ii, { hi: e.target.checked })} /> HL
                  </label>
                  <button className="imp-x" title="Hapus" onClick={() => delItem(bi, ii)}>✕</button>
                </div>
              ))}
              <button className="btn btn-sm tx-addl3" onClick={() => addItem(bi)}>+ Proses</button>
            </div>
          ))}

          {hlpDocs.length ? (
            <>
              <div className="imp-sec">Map tersimpan</div>
              <div className="fl-saved">
                {hlpDocs.map((d) => (
                  <button key={d.id} className={'fl-saved-item' + (d.id === savedId ? ' on' : '')} onClick={() => setOpenId && setOpenId(d.id)}>
                    <span className="chip chip-id">{d.id}</span> {d.name}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <div style={{ height: 28 }} />
        </div>

        <div className="fl-preview">
          <HlpChart hlp={hlp} notify={notify} onExportName={hlp.title || 'high-level-process'} />
        </div>
      </div>
    </div>
  )
}
