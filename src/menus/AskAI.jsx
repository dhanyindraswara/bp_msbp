// LEAP-STONES › Ask AI — chat assistant that answers questions about your business
// processes (OpenRouter, called client-side with the user's own API key). It also
// reads the reference documents added in the AI Knowledge Base.
import { useState, useRef, useEffect, useMemo } from 'react'
import { askAI, getModel, setModel, hasApiKey, getActiveProviderId } from '../lib/ai.js'
import { activeKnowledgeCount } from '../lib/knowledge.js'
import ApiKeyField from '../components/ApiKeyField.jsx'
import ModelPicker from '../components/ModelPicker.jsx'

const SUGGESTIONS = [
  'How does the flow for requesting IT security information work?',
  'Which processes involve Internal Audit?',
  'Summarize the flow in the IT Infrastructure & Security BP.',
  'Who is the customer of the "Monthly Report" output?',
]

export default function AskAI({ rev }) {
  const kbCount = useMemo(() => activeKnowledgeCount(), [rev])
  const [msgs, setMsgs] = useState([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [model, setModelState] = useState(getModel())
  const [keyed, setKeyed] = useState(hasApiKey())
  const [pnonce, setPnonce] = useState(0) // bump to refetch models on provider/key change
  const changeModel = (m) => {
    setModelState(m)
    setModel(m)
  }
  // Called when the provider or key changes: sync key state, model, refetch list.
  const onProviderChange = () => {
    setKeyed(hasApiKey())
    setModelState(getModel())
    setPnonce((n) => n + 1)
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
            Ask anything about your Business Processes — flows, activities, actors, PPI.
            {kbCount ? ` Using ${kbCount} Knowledge Base reference${kbCount === 1 ? '' : 's'}.` : ''}
          </p>
        </div>
        <ModelPicker kind="chat" value={model} onChange={changeModel} providerId={getActiveProviderId() + ':' + pnonce} />
      </div>

      <ApiKeyField onChange={onProviderChange} />

      <div className="ai-chat">
        {msgs.length === 0 ? (
          <div className="ai-empty">
            <div className="ai-empty-mark">✦</div>
            <div className="ai-empty-title">What would you like to know?</div>
            <div className="ai-empty-sub">
              The AI reads every stored BP{kbCount ? ` plus ${kbCount} reference document${kbCount === 1 ? '' : 's'}` : ''} to answer.
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
            <span> · Out of quota? Switch the <b>Model</b> at the top right (free options available) or top up your OpenRouter balance.</span>
          ) : null}
        </div>
      ) : null}

      <div className="ai-inputbar">
        <textarea
          className="ai-input"
          placeholder={keyed ? 'Type a question… (Enter to send)' : 'Set your provider API key above first.'}
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
          {busy ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
