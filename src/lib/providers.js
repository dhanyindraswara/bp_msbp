// Multi-provider AI client — call any OpenAI-compatible chat API directly from
// the browser with the user's own key. Each provider keeps its own API key in
// localStorage (never in the repo/bundle). Switch the active provider freely.
//
// Gemini, Groq and OpenAI all expose an OpenAI-compatible /chat/completions
// endpoint, so a single code path handles them all — only the base URL, key and
// model list differ.

export const PROVIDERS = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    base: 'https://openrouter.ai/api/v1',
    keyHint: 'sk-or-v1-…',
    keyUrl: 'https://openrouter.ai/keys',
    hasPricing: true, // /models returns pricing → enables the "free only" filter
    supportsPdf: true, // via the file-parser plugin
    extraHeaders: { 'HTTP-Referer': 'https://dhanyindraswara.github.io/bp_msbp/', 'X-Title': 'LEAP-STONES Business Process Suite' },
    chatModels: [
      'google/gemini-2.0-flash-exp:free',
      'google/gemini-2.5-flash',
      'google/gemini-flash-1.5',
      'deepseek/deepseek-chat-v3-0324:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'openai/gpt-4o-mini',
    ],
    extractModels: ['google/gemini-2.0-flash-exp:free', 'google/gemini-2.5-flash', 'deepseek/deepseek-chat-v3-0324:free'],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyHint: 'AIza…',
    keyUrl: 'https://aistudio.google.com/apikey',
    hasPricing: false,
    supportsPdf: true, // via the native Gemini endpoint (see extract.js)
    chatModels: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    extractModels: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'],
  },
  {
    id: 'groq',
    label: 'Groq',
    base: 'https://api.groq.com/openai/v1',
    keyHint: 'gsk_…',
    keyUrl: 'https://console.groq.com/keys',
    hasPricing: false,
    supportsPdf: false,
    chatModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b', 'deepseek-r1-distill-llama-70b', 'gemma2-9b-it'],
    extractModels: [],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    base: 'https://api.openai.com/v1',
    keyHint: 'sk-…',
    keyUrl: 'https://platform.openai.com/api-keys',
    hasPricing: false,
    supportsPdf: false,
    chatModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
    extractModels: [],
  },
  {
    id: 'jatevo',
    label: 'Jatevo',
    base: 'https://api.jatevo.ai/v1',
    keyHint: 'sk-jvo-…',
    keyUrl: '',
    hasPricing: false,
    supportsPdf: false,
    chatModels: ['cerebras/gemma-4-31b'],
    extractModels: [],
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    base: '', // user supplies the base URL
    keyHint: 'API key',
    keyUrl: '',
    hasPricing: false,
    supportsPdf: false,
    custom: true,
    chatModels: [],
    extractModels: [],
  },
]

export const getProvider = (id) => PROVIDERS.find((p) => p.id === id) || PROVIDERS[0]

const ls = {
  get: (k, d = '') => {
    try {
      return localStorage.getItem(k) ?? d
    } catch (e) {
      return d
    }
  },
  set: (k, v) => {
    try {
      if (v) localStorage.setItem(k, v)
      else localStorage.removeItem(k)
    } catch (e) {
      /* ignore */
    }
  },
}

const ACTIVE_KEY = 'stones-ai-provider'
const CUSTOM_BASE_KEY = 'stones-ai-custombase'
const keyKey = (pid) => 'stones-aikey-' + pid

export const getActiveProviderId = () => {
  const id = ls.get(ACTIVE_KEY, 'openrouter')
  return PROVIDERS.some((p) => p.id === id) ? id : 'openrouter'
}
export const setActiveProviderId = (id) => ls.set(ACTIVE_KEY, id)
export const getActiveProvider = () => getProvider(getActiveProviderId())

export const getApiKey = (pid = getActiveProviderId()) => ls.get(keyKey(pid), '')
export const setApiKey = (pid, key) => ls.set(keyKey(pid), (key || '').trim())
export const hasApiKey = (pid = getActiveProviderId()) => !!getApiKey(pid)

export const getCustomBase = () => ls.get(CUSTOM_BASE_KEY, '')
export const setCustomBase = (u) => ls.set(CUSTOM_BASE_KEY, (u || '').trim().replace(/\/$/, ''))

// Resolve the base URL for a provider (custom pulls from its own setting).
export function baseUrlOf(prov) {
  return prov.custom ? getCustomBase() : prov.base
}

// --- per-provider model selection (so switching provider keeps each choice) ---
const modelKey = (pid, kind) => 'stones-aimodel-' + kind + '-' + pid
export function getModel(kind = 'chat') {
  const prov = getActiveProvider()
  const stored = ls.get(modelKey(prov.id, kind), '')
  if (stored) return stored
  const list = kind === 'extract' ? prov.extractModels : prov.chatModels
  return list[0] || ''
}
export function setModel(id, kind = 'chat') {
  ls.set(modelKey(getActiveProviderId(), kind), id)
}
export const getExtractModel = () => getModel('extract')
export const setExtractModel = (id) => setModel(id, 'extract')

// Curated fallback list for the active provider (used when /models can't load).
export function fallbackModels(kind = 'chat') {
  const prov = getActiveProvider()
  const ids = kind === 'extract' ? prov.extractModels : prov.chatModels
  return ids.map((id) => ({ id, name: labelFor(id), pricing: id.endsWith(':free') ? { prompt: '0', completion: '0' } : {}, input_modalities: ['text', 'image', 'file'], context_length: 0 }))
}
function labelFor(id) {
  return id.replace(/:free$/, ' (free)').replace(/^[^/]+\//, '')
}

// --- generic OpenAI-compatible chat call ---
export async function chat(body) {
  const prov = getActiveProvider()
  const key = getApiKey(prov.id)
  if (!key) throw new Error('Belum ada API key untuk ' + prov.label + '. Isi dulu di "Set API key".')
  const base = baseUrlOf(prov)
  if (!base) throw new Error('Base URL provider custom belum diisi.')
  const url = base.replace(/\/$/, '') + '/chat/completions'
  let resp
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', ...(prov.extraHeaders || {}) },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new Error('Gagal menghubungi ' + prov.label + ': ' + (e && e.message ? e.message : e))
  }
  if (!resp.ok) {
    let msg = ''
    try {
      const j = await resp.json()
      const er = j.error || j
      const meta = er.metadata || {}
      msg = er.message || String(er.code || '')
      const extra = meta.raw || meta.provider_name || (Array.isArray(meta.reasons) ? meta.reasons.join(', ') : '')
      if (extra) {
        const ex = typeof extra === 'string' ? extra : JSON.stringify(extra)
        if (!msg.includes(ex)) msg += ' — ' + ex
      }
    } catch (e) {
      msg = await resp.text().catch(() => '')
    }
    throw new Error(prov.label + ' ' + resp.status + ': ' + String(msg).slice(0, 500))
  }
  const data = await resp.json()
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((c) => (c && c.text) || '').join('')
  return ''
}

// --- live model catalogue (per provider, cached) ---
const modelsCacheKey = (pid) => 'stones-models-' + pid
const _mem = {}
function normModel(m) {
  return {
    id: m.id,
    name: m.name || m.id,
    pricing: m.pricing || {},
    context_length: m.context_length || m.context_window || (m.top_provider && m.top_provider.context_length) || 0,
    input_modalities: (m.architecture && m.architecture.input_modalities) || [],
  }
}
export async function fetchModels() {
  const prov = getActiveProvider()
  if (_mem[prov.id]) return _mem[prov.id]
  const base = baseUrlOf(prov)
  const key = getApiKey(prov.id)
  try {
    if (!base) throw new Error('no base')
    const headers = {}
    if (key) headers.Authorization = 'Bearer ' + key
    const resp = await fetch(base.replace(/\/$/, '') + '/models', { headers })
    if (!resp.ok) throw new Error('HTTP ' + resp.status)
    const data = await resp.json()
    const list = (data.data || data.models || []).map(normModel).filter((m) => m.id)
    if (!list.length) throw new Error('empty')
    _mem[prov.id] = list
    ls.set(modelsCacheKey(prov.id), JSON.stringify(list))
    return list
  } catch (e) {
    try {
      const cached = JSON.parse(localStorage.getItem(modelsCacheKey(prov.id)) || '[]')
      if (Array.isArray(cached) && cached.length) {
        _mem[prov.id] = cached
        return cached
      }
    } catch (e2) {
      /* ignore */
    }
    // last resort: the curated fallback for this provider
    return fallbackModels('chat')
  }
}

const zero = (v) => v == null || v === '0' || Number(v) === 0
export function isFreeModel(m) {
  const p = m.pricing || {}
  return zero(p.prompt) && zero(p.completion)
}
export function supportsFiles(m) {
  const mods = m.input_modalities || []
  return mods.includes('image') || mods.includes('file')
}
export function providerSupportsPdf() {
  return !!getActiveProvider().supportsPdf
}
