// Preview zoom: a tiny − % + control for the chart toolbars, plus a hook that
// returns the scale value. The transform is applied to a wrapper OUTSIDE the
// captured node, so PNG export always renders at 100%.
import { useState } from 'react'

export function useZoom(initial = 1) {
  const [z, setZ] = useState(initial)
  const dec = () => setZ((v) => Math.max(0.4, +(v - 0.1).toFixed(2)))
  const inc = () => setZ((v) => Math.min(2, +(v + 0.1).toFixed(2)))
  const reset = () => setZ(1)
  return { z, dec, inc, reset }
}

export function ZoomCtl({ zoom }) {
  return (
    <span className="zc" title="Preview zoom (export is always 100%)">
      <button type="button" onClick={zoom.dec} disabled={zoom.z <= 0.4}>−</button>
      <button type="button" className="zc-val" onClick={zoom.reset} title="Reset zoom">
        {Math.round(zoom.z * 100)}%
      </button>
      <button type="button" onClick={zoom.inc} disabled={zoom.z >= 2}>+</button>
    </span>
  )
}
