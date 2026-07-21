// SOP Detail — renders the ITM "Standard Operating Procedure" document body:
// a title block (doc number, title, revision, issued/revision date), then the
// page-1 blocks (document history, approvals, distribution, PPI) and the
// numbered sections 1..8. Point 6 (Flow Process) is a reference to the linked
// FLOW document; point 7 is the derived process-description list. Exports the
// whole document to PNG (html-to-image).
import { useRef } from 'react'
import * as htmlToImage from 'html-to-image'
import { download } from '../lib/generate.js'
import { normSopDetail, APPROVAL_ROLES, lines, paragraphs } from '../lib/sopdetail.js'

// The title block repeated at the top of every SOP page.
function TitleBlock({ s }) {
  return (
    <table className="sd-titleblock">
      <tbody>
        <tr>
          <td className="sd-tb-logo" rowSpan={3}>
            {s.logo ? <img src={s.logo} alt="logo" /> : <div className="sd-tb-logoph">LOGO</div>}
          </td>
          <td className="sd-tb-kind" rowSpan={3}>
            STANDARD OPERATING
            <br />
            PROCEDURE
          </td>
          <td className="sd-tb-k">Document Number</td>
          <td className="sd-tb-v" colSpan={2}>{s.docNo || '—'}</td>
        </tr>
        <tr>
          <td className="sd-tb-title" rowSpan={2}>{s.title || 'Untitled SOP'}</td>
          <td className="sd-tb-k">Issued Date</td>
          <td className="sd-tb-v2">{s.issuedDate || '-'}</td>
        </tr>
        <tr>
          <td className="sd-tb-k">Revision</td>
          <td className="sd-tb-v2">{s.revision || '-'}</td>
        </tr>
        <tr>
          <td className="sd-tb-foot" colSpan={2}>Revision {s.revision || '-'}</td>
          <td className="sd-tb-k">Revision Date</td>
          <td className="sd-tb-v2" colSpan={2}>{s.revisionDate || '-'}</td>
        </tr>
      </tbody>
    </table>
  )
}

// A numbered section header (e.g. "1. PURPOSE").
const SecHead = ({ n, title }) => (
  <div className="sd-sechead">
    <span className="sd-sechead-n">{n}.</span> {title}
  </div>
)

// A numbered sub-list (1.1, 1.2, ...) built from textarea lines.
function NumList({ prefix, text }) {
  const items = lines(text)
  if (!items.length) return <div className="sd-empty">—</div>
  return (
    <div className="sd-numlist">
      {items.map((t, i) => (
        <div className="sd-numrow" key={i}>
          <span className="sd-num">{prefix}.{i + 1}.</span>
          <span>{t}</span>
        </div>
      ))}
    </div>
  )
}

// A plain bullet list built from textarea lines.
function Bullets({ text }) {
  const items = lines(text)
  if (!items.length) return <div className="sd-empty">—</div>
  return (
    <ul className="sd-bullets">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  )
}

// Free paragraphs.
function Paras({ text }) {
  const ps = paragraphs(text)
  if (!ps.length) return <div className="sd-empty">—</div>
  return (
    <>
      {ps.map((p, i) => (
        <p className="sd-para" key={i}>{p}</p>
      ))}
    </>
  )
}

export default function SopDetailDoc({ sop, onExportName, notify }) {
  const s = normSopDetail(sop)
  const captureRef = useRef(null)

  const exportPng = async () => {
    try {
      const dataUrl = await htmlToImage.toPng(captureRef.current, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true })
      const blob = await (await fetch(dataUrl)).blob()
      download((onExportName || 'sop-detail') + '.png', blob)
      notify && notify('PNG exported')
    } catch (err) {
      console.error(err)
      notify && notify('PNG export failed: ' + err.message)
    }
  }

  return (
    <div className="fl-wrap">
      <div className="fl-toolbar fl-noexport">
        <span style={{ fontWeight: 800, color: '#0f2a43', fontSize: 13.5 }}>{s.docNo || 'SOP'} · {s.title || 'Untitled SOP'}</span>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-sm btn-primary" onClick={exportPng}>Export PNG</button>
        </div>
      </div>

      <div className="doc-scroll">
        <div ref={captureRef} className="sd-doc">
          <TitleBlock s={s} />
          <div className="sd-uncontrolled">Downloaded, copied, printed this document becomes uncontrolled. Refer to Company Intranet for controlled document.</div>

          {/* Document History */}
          <div className="sd-blocklabel">Document History</div>
          <table className="sd-histtable">
            <thead>
              <tr><th style={{ width: 90 }}>Revision</th><th style={{ width: 110 }}>Date</th><th>Historical Changes</th></tr>
            </thead>
            <tbody>
              {(s.history.length ? s.history : [{ id: 'x', revision: '-', date: '-', changes: '-' }]).map((h) => (
                <tr key={h.id}>
                  <td>{h.revision || '-'}</td>
                  <td>{h.date || '-'}</td>
                  <td>{h.changes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Approvals */}
          <table className="sd-approve">
            <thead>
              <tr>{APPROVAL_ROLES.map((r) => <th key={r.key}>{r.label}</th>)}</tr>
            </thead>
            <tbody>
              <tr className="sd-approve-sign">{APPROVAL_ROLES.map((r) => <td key={r.key} />)}</tr>
              <tr className="sd-approve-name">{APPROVAL_ROLES.map((r) => <td key={r.key}>{s.approvals[r.key]?.name || ''}</td>)}</tr>
              <tr className="sd-approve-pos">{APPROVAL_ROLES.map((r) => <td key={r.key}>{s.approvals[r.key]?.position || ''}</td>)}</tr>
            </tbody>
          </table>

          {/* Distribution */}
          <div className="sd-blocklabel">Document Distribution</div>
          <div className="sd-distrib">
            <div className="sd-distrib-lead">Distributed to:</div>
            <Bullets text={s.distribution} />
          </div>

          {/* PPI */}
          <div className="sd-blocklabel">Process Performance Indicator (PPI)</div>
          <Bullets text={s.ppi} />

          <div className="sd-rule" />

          {/* 1. Purpose */}
          <SecHead n={1} title="PURPOSE" />
          <NumList prefix="1" text={s.purpose} />

          {/* 2. Scope */}
          <SecHead n={2} title="SCOPE" />
          <Paras text={s.scope} />

          {/* 3. Definition */}
          <SecHead n={3} title="DEFINITION" />
          {s.definitions.filter((d) => (d.term || d.definition)).length ? (
            <div className="sd-numlist">
              {s.definitions
                .filter((d) => d.term || d.definition)
                .map((d, i) => (
                  <div className="sd-numrow" key={d.id}>
                    <span className="sd-num">3.{i + 1}.</span>
                    <span>
                      <b>{d.term}</b>
                      {d.term && d.definition ? <br /> : null}
                      {d.definition}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="sd-empty">—</div>
          )}

          {/* 4. References */}
          <SecHead n={4} title="REFERENCES" />
          <NumList prefix="4" text={s.references} />

          {/* 5. Review and Validation */}
          <SecHead n={5} title="REVIEW AND VALIDATION" />
          <Paras text={s.reviewValidation} />

          {/* 6. Flow Process — linked from Auto Flow Process */}
          <SecHead n={6} title="FLOW PROCESS" />
          <div className="sd-flowref">
            {s.flowRef || s.flowLabel ? (
              <>
                <div className="sd-flowref-badge">Flow diagram</div>
                <div>
                  <div className="sd-flowref-name">{s.flowLabel || 'Flow process'}</div>
                  {s.flowRef ? <div className="sd-flowref-id">Auto Flow Process · {s.flowRef}</div> : null}
                </div>
              </>
            ) : (
              <div className="sd-empty">No flow linked yet. Pick a flow in the form (from the Auto Flow Process menu).</div>
            )}
          </div>

          {/* 7. Process Description & Control — derived from the flow steps */}
          <SecHead n={7} title="PROCESS DESCRIPTION & CONTROL" />
          {s.procGroups.map((g, gi) => (
            <div className="sd-procgroup" key={g.id}>
              <div className="sd-subhead">
                7.{gi + 1}. Process Description &amp; Control{g.label ? ' of ' + g.label : ''}
              </div>
              {g.items.filter((it) => it.title || it.description).length ? (
                g.items
                  .filter((it) => it.title || it.description)
                  .map((it) => (
                    <div className="sd-procitem" key={it.id}>
                      <div className="sd-procitem-hd">
                        <span className="sd-num">{it.ref}</span>
                        <span className="sd-procitem-title">{it.title}</span>
                      </div>
                      {it.description ? <div className="sd-procitem-desc">{it.description}</div> : null}
                    </div>
                  ))
              ) : (
                <div className="sd-empty">No steps yet. Pull them from the flow (the “Pull from Flow” button) in the form.</div>
              )}
            </div>
          ))}

          {/* 8. Related / Supported Document */}
          <SecHead n={8} title="RELATED/SUPPORTED DOCUMENT" />
          <NumList prefix="8" text={s.relatedDocs} />
        </div>
      </div>
    </div>
  )
}
