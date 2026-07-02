// STONES Cloud Function — secure proxy to the Google Gemini API.
// The app sends { question, context }; this function adds the secret API key
// server-side and returns Gemini's answer. Callable + auth-protected.
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { setGlobalOptions } = require('firebase-functions/v2')

// Set this once with:  firebase functions:secrets:set GEMINI_API_KEY
// Get a free key at https://aistudio.google.com/apikey
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

// Free-tier Gemini model — fast, with a generous free quota.
const MODEL = 'gemini-2.5-flash'

setGlobalOptions({ maxInstances: 5 })

const SYSTEM_PROMPT = [
  'You are a senior business-process analyst and consultant inside STONES, a business-process management app.',
  "You are given the company's documented business processes below as context: BP documents, each with SIPOC rows",
  '(Supplier, Input, Process, Output, Customer), process flows, and PPI (process performance indicators).',
  'Your job is to help the user UNDERSTAND, ANALYZE, and IMPROVE these processes. Depending on the question you can:',
  '(1) Answer factual/lookup questions — where a flow lives, who the actors are, describe it as supplier -> process -> output -> customer, naming the BP (id + name).',
  '(2) Analyze processes — identify bottlenecks, redundant or missing steps, unclear ownership/handoffs, gaps in the SIPOC, and weak or missing PPIs.',
  '(3) Recommend improvements — give concrete, prioritized, actionable suggestions grounded in business-process best practice (clear RASCI/ownership, fewer handoffs, measurable KPIs, automation and digitization opportunities, risk and compliance controls).',
  'Ground your analysis in the provided data and reference specific BPs, processes, and steps. You MAY apply general business-process knowledge to reason and suggest improvements even when something is not literally written in the data — do not refuse an analysis or recommendation just because it is not stated verbatim.',
  'Only if there are genuinely no documents (empty context) should you say there is no BP data yet and ask the user to add or select a business process.',
  'FORMATTING RULES (follow strictly): Reply in clean PLAIN TEXT. Do NOT use Markdown at all — no asterisks (* or **) for bold or bullets, no underscores for emphasis, no # headings, no backticks. For a list, number the main points as "1." "2." "3."; for sub-points, start the line with two spaces then a bullet dot "• ". Keep paragraphs short.',
  'FLOW DIAGRAM: When the question is about a flow, an alur, a process, or how something works, ALSO include a simple flow diagram in plain text using arrows. Put it under a heading line "Alur:" (Indonesian) or "Flow:" (English). One path per line, short, in the form: Supplier -> [Process] -> Output -> Customer (use the arrow character ->). Show only the most relevant 3 to 6 paths, not everything.',
  'Be concise, concrete, and practical. Reply in the same language as the question (Indonesian or English).',
].join(' ')

// Belt-and-suspenders: strip any Markdown the model still emits so the chat
// bubble (plain text) stays clean.
function cleanText(text) {
  return String(text)
    .replace(/\*\*(.*?)\*\*/g, '$1') // **bold** -> bold
    .replace(/__(.*?)__/g, '$1') // __bold__ -> bold
    .replace(/^(\s*)[\*\-]\s+/gm, '$1• ') // "* item" / "- item" -> "• item" (keep indent)
    .replace(/^#{1,6}\s+/gm, '') // "# heading" -> heading
    .replace(/`/g, '') // drop inline code backticks
    .replace(/\*/g, '') // drop any stray asterisks
    .replace(/[ \t]+$/gm, '') // trim trailing spaces
    .replace(/\n{3,}/g, '\n\n') // collapse big gaps
    .trim()
}

exports.askAI = onCall({ secrets: [GEMINI_API_KEY], region: 'us-central1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.')

  const question = String((request.data && request.data.question) || '').slice(0, 6000)
  const context = String((request.data && request.data.context) || '').slice(0, 80000)
  if (!question) throw new HttpsError('invalid-argument', 'Question is required.')

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent'

  let resp
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY.value(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [{ text: 'BUSINESS PROCESS DATA:\n' + context + '\n\n---\nQUESTION: ' + question }],
          },
        ],
        generationConfig: { temperature: 0.4 },
      }),
    })
  } catch (e) {
    throw new HttpsError('unavailable', 'Could not reach Gemini: ' + (e && e.message))
  }

  if (!resp.ok) {
    const t = await resp.text().catch(() => '')
    throw new HttpsError('internal', 'Gemini error ' + resp.status + ': ' + t.slice(0, 300))
  }

  const data = await resp.json()
  const answer =
    (data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text) ||
    '(no answer)'
  return { answer: cleanText(answer) }
})