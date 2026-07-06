// STONES › Ask AI — chat assistant that answers questions about your business
// processes (powered by Google Gemini via a Cloud Function). It also reads the
// reference documents added in the AI Knowledge Base.
import { useState, useRef, useEffect, useMemo } from 'react'
import { askAI, aiEnabled } from '../lib/ai.js'
import { activeKnowledgeCount } from '../lib/knowledge.js'

const SUGGESTIONS = [
  'Flow untuk request security information technology dimana dan gimana?',
  'Proses apa saja yang melibatkan Internal Audit?',
  'Ringkas alur di BP IT Infrastructure & Security.',
  'Siapa customer dari output "Monthly Report"?',
]

export default function AskAI({ rev }) {
  const kbCount = useMemo(() => activeKnowledgeCount(), [rev])
  const [msgs, setMsgs] = useState([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const endRef = useRef(null)
  useEffect(() => {
    endRef.current && endRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, busy])

  const send = async (text) => {
    const question = (text != null ? text : q).trim()
    if (!question || busy) return
    setErr('')
    setQ('')
    setMsgs((m) => [...m, { role: 'user', text: question }])
    setBusy(true)
    try {
      const answer = await askAI(question)
      setMsgs((m) => [...m, { role: 'assistant', text: answer }])
    } catch (e) {
      setErr(e && e.message ? e.message : 'Request failed')
      setMsgs((m) => m.slice(0, -1))
      setQ(question)
    }
    setBusy(false)
  }

  return (
    <div className="ai-page">
      <div className="ai-hd">
        <div>
          <h1>Ask AI</h1>
          <p>
            Tanya apa saja tentang Business Process kamu — flow, proses, aktor, PPI.
            {kbCount ? ` Memakai ${kbCount} referensi dari Knowledge Base.` : ''}
          </p>
        </div>
        <span className="ai-badge">Gemini</span>
      </div>

      <div className="ai-chat">
        {msgs.length === 0 ? (
          <div className="ai-empty">
            <div className="ai-empty-mark">✦</div>
            <div className="ai-empty-title">Mau tanya apa?</div>
            <div className="ai-empty-sub">
              AI membaca semua BP yang tersimpan{kbCount ? ` + ${kbCount} dokumen referensi` : ''} untuk menjawab.
            </div>
            <div className="ai-sugs">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="ai-sug" onClick={() => send(s)} disabled={!aiEnabled}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          msgs.map((m, i) => (
            <div key={i} className={'ai-msg ai-msg-' + m.role}>
              <div className="ai-avatar">{m.role === 'user' ? 'You' : '✦'}</div>
              <div className="ai-bubble">{m.text}</div>
            </div>
          ))
        )}
        {busy ? (
          <div className="ai-msg ai-msg-assistant">
            <div className="ai-avatar">✦</div>
            <div className="ai-bubble ai-typing">Berpikir…</div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {err ? (
        <div className="ai-err">
          {err}
          {/functions|not-?found|internal|unavailable/i.test(err) ? (
            <span> · Kalau ini pertama kali, pastikan Cloud Function <b>askAI</b> sudah di-deploy &amp; secret GEMINI_API_KEY di-set.</span>
          ) : null}
        </div>
      ) : null}

      <div className="ai-inputbar">
        <textarea
          className="ai-input"
          placeholder={aiEnabled ? 'Tulis pertanyaan… (Enter untuk kirim)' : 'AI butuh Firebase (mode online).'}
          value={q}
          disabled={!aiEnabled}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button className="btn btn-primary" onClick={() => send()} disabled={busy || !aiEnabled || !q.trim()}>
          {busy ? '…' : 'Kirim'}
        </button>
      </div>
    </div>
  )
}
