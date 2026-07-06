// STONES › Dashboard — reporting. Placeholder for now; shows live counts from
// the repository so it feels connected, with charts marked "coming soon".
import { listDocs } from '../lib/store.js'

export default function Dashboard({ goRepository }) {
  const docs = listDocs().filter((d) => d.docType !== 'KNOWLEDGE')
  const total = docs.length
  const versions = new Set(docs.map((d) => d.version)).size
  const latest = docs[0]

  const stats = [
    { label: 'BP documents', value: total },
    { label: 'Distinct versions', value: versions },
    { label: 'Most recent', value: latest ? latest.name : '—', small: true },
  ]

  return (
    <div className="stones-page">
      <div className="stones-page-hd">
        <h1>Dashboard</h1>
        <p>Reporting across your Business Process documents.</p>
      </div>

      <div className="cards" style={{ marginBottom: 18 }}>
        {stats.map((s) => (
          <div key={s.label} className="card stat-card">
            <div className="stat-label">{s.label}</div>
            <div className={'stat-value' + (s.small ? ' stat-value-sm' : '')}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="coming">
        <div className="coming-badge">Coming soon</div>
        <div style={{ fontWeight: 700, color: '#0f2a43', marginBottom: 4 }}>Reporting & analytics</div>
        <div style={{ maxWidth: 460, margin: '0 auto 14px' }}>
          Charts for process coverage, RASCI completeness, versions over time and approval status will live here once
          the reporting requirements are defined.
        </div>
        <button className="btn" onClick={goRepository}>
          Go to Repository
        </button>
      </div>
    </div>
  )
}
