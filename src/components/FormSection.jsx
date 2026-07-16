// Collapsible form section used by the diagram builders — keeps long forms
// calm: a slim header row (caret · title · count · actions), body folds away.
// `right` actions don't toggle the section.
import { useState } from 'react'

export default function FormSection({ title, count, right, hint, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={'fs' + (open ? ' open' : '')}>
      <div
        className="fs-hd"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen((o) => !o))}
      >
        <span className="fs-caret">▸</span>
        <span className="fs-title">{title}</span>
        {count != null ? <span className="fs-count">{count}</span> : null}
        {right ? (
          <span className="fs-right" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            {right}
          </span>
        ) : null}
      </div>
      {open ? (
        <div className="fs-body">
          {hint ? <div className="fs-hint">{hint}</div> : null}
          {children}
        </div>
      ) : null}
    </section>
  )
}
