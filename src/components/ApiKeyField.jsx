// Provider + API-key settings. Pick an AI provider (OpenRouter / Google Gemini /
// Groq / OpenAI / Custom) and enter that provider's key. Each provider keeps its
// own key in localStorage — only in this browser, never in the repo/bundle — so
// you can fill several and switch freely.
import { useState } from 'react'
import {
  PROVIDERS,
  getProvider,
  getActiveProviderId,
  setActiveProviderId,
  getApiKey,
  setApiKey,
  hasApiKey,
  getCustomBase,
  setCustomBase,
} from '../lib/providers.js'

export default function ApiKeyField({ onChange }) {
  const [pid, setPid] = useState(getActiveProviderId())
  const [editing, setEditing] = useState(!hasApiKey(getActiveProviderId()))
  const [val, setVal] = useState('')
  const [base, setBase] = useState(getCustomBase())
  const prov = getProvider(pid)
  const keyed = hasApiKey(pid)

  const switchProvider = (id) => {
    setActiveProviderId(id)
    setPid(id)
    setVal('')
    setBase(getCustomBase())
    setEditing(!hasApiKey(id))
    onChange && onChange()
  }

  const save = () => {
    if (prov.custom) setCustomBase(base)
    if (val.trim()) setApiKey(pid, val)
    setVal('')
    setEditing(false)
    onChange && onChange()
  }

  return (
    <div className="keybar keybar-edit">
      <div className="keybar-row">
        <span className="keybar-lb">Provider</span>
        <select className="keybar-prov" value={pid} onChange={(e) => switchProvider(e.target.value)}>
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        {keyed && !editing ? (
          <>
            <span className="keybar-ok">✓ key saved</span>
            <button className="btn btn-sm" onClick={() => setEditing(true)}>Change key</button>
          </>
        ) : null}
      </div>

      {editing || !keyed ? (
        <>
          {prov.custom ? (
            <div className="keybar-row">
              <input placeholder="Base URL (e.g. https://host/v1)" value={base} onChange={(e) => setBase(e.target.value)} />
            </div>
          ) : null}
          <div className="keybar-row">
            <input
              type="password"
              autoComplete="off"
              placeholder={'API key ' + prov.label + ' (' + prov.keyHint + ')'}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            <button className="btn btn-sm btn-primary" onClick={save} disabled={!val.trim() && !(prov.custom && base.trim())}>Save</button>
            {keyed ? <button className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button> : null}
          </div>
          <div className="keybar-note">
            Stored only in this browser — never sent anywhere except the provider you choose.{' '}
            {prov.keyUrl ? (
              <a href={prov.keyUrl} target="_blank" rel="noreferrer">Get a {prov.label} key →</a>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
