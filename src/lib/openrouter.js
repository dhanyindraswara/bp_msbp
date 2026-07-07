// OpenRouter client — called DIRECTLY from the browser (no Cloud Function). The
// API key is provided by the user in-app and kept ONLY in their browser
// (localStorage); it is never committed to the repo or shipped in the bundle.
// This lets the AI features work without any server-side deploy.
const KEY = 'stones-openrouter-key'

export function getApiKey() {
  try {
    return localStorage.getItem(KEY) || ''
  } catch (e) {
    return ''
  }
}
export function setApiKey(k) {
  try {
    if (k && k.trim()) localStorage.setItem(KEY, k.trim())
    else localStorage.removeItem(KEY)
  } catch (e) {
    /* ignore */
  }
}
export function hasApiKey() {
  return !!getApiKey()
}

// POST to OpenRouter's OpenAI-compatible chat completions endpoint and return
// the assistant's text content. Throws with a readable message on failure.
export async function orChat(body) {
  const key = getApiKey()
  if (!key) throw new Error('Belum ada OpenRouter API key. Isi dulu di "Set API key".')
  let resp
  try {
    resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dhanyindraswara.github.io/bp_msbp/',
        'X-Title': 'STONES Business Process Suite',
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new Error('Gagal menghubungi OpenRouter: ' + (e && e.message ? e.message : e))
  }
  if (!resp.ok) {
    let msg = ''
    try {
      const j = await resp.json()
      msg = (j.error && (j.error.message || j.error.code)) || JSON.stringify(j.error || j)
    } catch (e) {
      msg = await resp.text().catch(() => '')
    }
    throw new Error('OpenRouter ' + resp.status + ': ' + String(msg).slice(0, 400))
  }
  const data = await resp.json()
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((c) => (c && c.text) || '').join('')
  return ''
}
