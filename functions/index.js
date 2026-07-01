// STONES Cloud Function — secure proxy to the Grok (xAI) API.
// The app sends { question, context }; this function adds the secret API key
// server-side and returns Grok's answer. Callable + auth-protected.
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { setGlobalOptions } = require('firebase-functions/v2')

// Set this once with:  firebase functions:secrets:set XAI_API_KEY
const XAI_API_KEY = defineSecret('XAI_API_KEY')

setGlobalOptions({ maxInstances: 5 })

const SYSTEM_PROMPT = [
  'You are the AI assistant inside STONES, a business-process management app.',
  'Answer the user question using ONLY the business-process data provided below',
  '(BP documents, SIPOC rows, flows, PPI). For a "where/how" question about a flow',
  'or process, name the BP (id + name) and describe the relevant flow as',
  'supplier -> process -> output -> customer. If the data does not contain the',
  'answer, say you could not find it in the documented processes. Reply in the',
  'same language as the question (Indonesian or English). Be concise and concrete.',
].join(' ')

exports.askAI = onCall({ secrets: [XAI_API_KEY], region: 'us-central1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.')

  const question = String((request.data && request.data.question) || '').slice(0, 6000)
  const context = String((request.data && request.data.context) || '').slice(0, 80000)
  if (!question) throw new HttpsError('invalid-argument', 'Question is required.')

  let resp
  try {
    resp = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + XAI_API_KEY.value(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4.3',
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: 'BUSINESS PROCESS DATA:\n' + context + '\n\n---\nQUESTION: ' + question },
        ],
      }),
    })
  } catch (e) {
    throw new HttpsError('unavailable', 'Could not reach xAI: ' + (e && e.message))
  }

  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    throw new HttpsError('internal', 'xAI error ' + resp.status + ': ' + t.slice(0, 300))
  }

  const data = await resp.json()
  const answer = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '(no answer)'
  return { answer }
})
