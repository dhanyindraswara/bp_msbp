// Inline "Set OpenRouter API key" control. The key is stored ONLY in this
// browser (localStorage) — never sent anywhere but OpenRouter, never in the repo.
import { useState } from 'react'
import { hasApiKey, setApiKey } from '../lib/openrouter.js'

export default function ApiKeyField({ onChange }) {
  const [editing, setEditing] = useState(!hasApiKey())
  const [val, setVal] = useState('')

  const save = () => {
    if (!val.trim()) return
    setApiKey(val)
    setVal('')
    setEditing(false)
    onChange && onChange()
  }

  if (!editing && hasApiKey()) {
    return (
      <div className="keybar">
        <span className="keybar-ok">✓ OpenRouter API key tersimpan di browser ini</span>
        <button className="btn btn-sm" onClick={() => setEditing(true)}>Ganti key</button>
      </div>
    )
  }

  return (
    <div className="keybar keybar-edit">
      <div className="keybar-hd">Masukkan OpenRouter API key</div>
      <div className="keybar-row">
        <input
          type="password"
          autoComplete="off"
          placeholder="sk-or-v1-…"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <button className="btn btn-sm btn-primary" onClick={save} disabled={!val.trim()}>Simpan</button>
        {hasApiKey() ? <button className="btn btn-sm" onClick={() => setEditing(false)}>Batal</button> : null}
      </div>
      <div className="keybar-note">
        Disimpan cuma di browser ini, tidak dikirim ke mana pun selain OpenRouter.{' '}
        <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">Dapatkan key →</a>
      </div>
    </div>
  )
}
