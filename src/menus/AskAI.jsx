// STONES › Ask AI — chat assistant that answers questions about your business
// processes (OpenRouter, called client-side with the user's own API key). It also
// reads the reference documents added in the AI Knowledge Base.
import { useState, useRef, useEffect, useMemo } from 'react'
import { askAI, AI_MODELS, getModel, setModel } from '../lib/ai.js'
import { hasApiKey } from '../lib/openrouter.js'
import { activeKnowledgeCount } from '../lib/knowledge.js'
import ApiKeyField from '../components/ApiKeyField.jsx'

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
  const [model, setModelState] = useState(getModel())
  const [keyed, setKeyed] = useState(hasApiKey())
  const changeModel = (m) => {
    setModelState(m)
    setModel(m)
  }
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
      const answer = await askAI(question, model)
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
        <label className="ai-model" title="Pilih model AI (ganti kalau limit habis)">
          <span className="ai-model-lb">Model</span>
          <select value={model} onChange={(e) => changeModel(e.target.value)}>
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ApiKeyField onChange={() => setKeyed(hasApiKey())} />

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
                <button key={s} className="ai-sug" onClick={() => send(s)} disabled={!keyed}>
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
          {/rate|limit|quota|402|429|insufficient|credit/i.test(err) ? (
            <span> · Kuota/model habis? Ganti <b>Model</b> di kanan atas (ada opsi gratis), atau cek saldo OpenRouter kamu.</span>
          ) : null}
        </div>
      ) : null}

      <div className="ai-inputbar">
        <textarea
          className="ai-input"
          placeholder={keyed ? 'Tulis pertanyaan… (Enter untuk kirim)' : 'Isi OpenRouter API key dulu di atas.'}
          value={q}
          disabled={!keyed}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button className="btn btn-primary" onClick={() => send()} disabled={busy || !keyed || !q.trim()}>
          {busy ? '…' : 'Kirim'}
        </button>
      </div>
    </div>
  )
}
