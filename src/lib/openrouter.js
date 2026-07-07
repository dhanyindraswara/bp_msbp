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

// ── model catalogue (fetched live from OpenRouter) ──
const MODELS_CACHE_KEY = 'stones-or-models'
let _modelsMem = null

function normModel(m) {
  return {
    id: m.id,
    name: m.name || m.id,
    pricing: m.pricing || {},
    context_length: m.context_length || (m.top_provider && m.top_provider.context_length) || 0,
    input_modalities: (m.architecture && m.architecture.input_modalities) || [],
  }
}

// Fetch the full model list from OpenRouter (public endpoint). Cached in memory
// and localStorage; falls back to the cached copy if the network call fails.
export async function fetchModels() {
  if (_modelsMem) return _modelsMem
  try {
    const key = getApiKey()
    const headers = { 'Content-Type': 'application/json' }
    if (key) headers.Authorization = 'Bearer ' + key
    const resp = await fetch('https://openrouter.ai/api/v1/models', { headers })
    if (!resp.ok) throw new Error('HTTP ' + resp.status)
    const data = await resp.json()
    const list = (data.data || []).map(normModel).filter((m) => m.id)
    if (!list.length) throw new Error('empty')
    _modelsMem = list
    try {
      localStorage.setItem(MODELS_CACHE_KEY, JSON.stringify(list))
    } catch (e) {
      /* ignore */
    }
    return list
  } catch (e) {
    try {
      const cached = JSON.parse(localStorage.getItem(MODELS_CACHE_KEY) || '[]')
      if (Array.isArray(cached) && cached.length) {
        _modelsMem = cached
        return cached
      }
    } catch (e2) {
      /* ignore */
    }
    throw new Error('Gagal memuat daftar model dari OpenRouter: ' + (e && e.message ? e.message : e))
  }
}

const zero = (v) => v == null || v === '0' || Number(v) === 0
export function isFreeModel(m) {
  const p = m.pricing || {}
  return zero(p.prompt) && zero(p.completion)
}
// Models that can read an uploaded PDF/image (needed for Document Import).
export function supportsFiles(m) {
  const mods = m.input_modalities || []
  return mods.includes('image') || mods.includes('file')
}
