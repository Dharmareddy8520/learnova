import path from 'path'
import { generateWithGemini } from './gemini'
import summarizeDocumentWithGemini from './geminiSummarizer'

// Centralize Gemini model selection. Set `GEMINI_MODEL` in env to override.
const DEFAULT_GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.5-pro').trim()

// Allow overriding base HF API endpoints via env vars. Older deployments used
// https://api-inference.huggingface.co/models which is being deprecated; the
// router endpoint is https://router.huggingface.co/hf-inference (recommended).
const HF_API_BASE = process.env.HF_API_BASE || 'https://api-inference.huggingface.co/models'
const HF_ROUTER_BASE = process.env.HF_ROUTER_BASE || 'https://router.huggingface.co/hf-inference/models'

async function hfRequest(model: string, payload: any) {
  const token = process.env.HF_API_KEY
  if (!token) throw new Error('HF_API_KEY not configured')

  const doFetch = async (base: string) => {
    const url = `${base}/${model}`
    return fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  }

  // First attempt: configured primary base
  let res = await doFetch(HF_API_BASE).catch(err => { throw err })

  // If HF deprecated the primary API, try the router endpoint (410 or specific error)
  if (!res.ok) {
    // read body safely for debugging
    const body = await res.text().catch(() => '')
    // If the server returned 410 Gone or an explicit migration message, retry router
    if (res.status === 410 || /no longer supported|router.huggingface.co/i.test(body)) {
      try {
        console.warn(`HF primary endpoint deprecated (status=${res.status}), retrying router endpoint for model=${model}`)
        res = await doFetch(HF_ROUTER_BASE)
      } catch (err) {
        throw new Error(`HF router retry failed for model=${model} - ${String(err)}`)
      }
    } else {
      // Not a migration case: throw with context
      throw new Error(`HF ${res.status} ${res.statusText} - model=${model} - ${body}`)
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HF ${res.status} ${res.statusText} - model=${model} - ${body}`)
  }

  return res.json() as Promise<any>
}

async function tryModels(models: string[], payload: any): Promise<{ out: any, model: string }> {
  let lastErr: any = null
  for (const m of models) {
    console.debug(`hf: trying model: ${m}`)
    try {
      const out = await hfRequest(m, payload)
      return { out, model: m }
    } catch (e: any) {
      lastErr = e
      // If it's a 404 for this model, try next
      if (e.message && e.message.includes('HF 404')) {
        console.warn(`Model ${m} not found (404), trying next fallback... - ${e.message}`)
        continue
      }
      // On other errors, log and try next as well (network or rate limits might vary)
      console.warn(`Model ${m} failed with error, trying next fallback: ${e.message}`)
      continue
    }
  }
  throw lastErr || new Error('All model attempts failed')
}

function redactSensitive(input: string) {
  if (!input) return input
  // Replace URLs and emails with placeholders to avoid model hallucinating links
  const urlRe = /https?:\/\/[\S]+/gi
  const wwwRe = /www\.[\S]+/gi
  const emailRe = /[\w.-]+@[\w.-]+\.[A-Za-z]{2,6}/gi
  return input.replace(urlRe, '[LINK]').replace(wwwRe, '[LINK]').replace(emailRe, '[EMAIL]')
}

// Utility: unwrap fenced code blocks
function unwrapCodeBlock(s: string | undefined) {
  if (!s) return ''
  let out = String(s).trim()
  out = out.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
  out = out.replace(/^`+|`+$/g, '')
  return out.trim()
}

function splitSentences(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function generateFlashcardsLocal(text: string, n: number) {
  const sents = splitSentences(text)
  const scored = sents.map(s => ({ s, score: Math.min(1, s.length / 200) + (/\b(is|are|was|has|have|include|includes|consists)\b/i.test(s) ? 0.5 : 0) }))
    .sort((a, b) => b.score - a.score)
  const cards: any[] = []
  for (const item of scored) {
    if (cards.length >= n) break
    const sentence = item.s
    const front = sentence.split(/[,;:\-]/)[0].split(' ').slice(0, 10).join(' ').trim()
    const back = sentence
    if (front && back) cards.push({ front: front + (front.endsWith('.') ? '' : '...'), back })
  }
  let i = 0
  while (cards.length < n && i < sents.length) {
    const sentence = sents[i++]
    const front = sentence.split(' ').slice(0, 8).join(' ')
    cards.push({ front: front + '...', back: sentence })
  }
  return cards.slice(0, n)
}

function generateQuizLocal(text: string, n: number) {
  const sents = splitSentences(text)
  const facts: string[] = []
  const answers: string[] = []
  for (const s of sents) {
    const m = s.match(/^(.*?)\b(is|are|was|has|have|includes|consists of)\b\s*(.*?)(?:[.,;!?]|$)/i)
    if (m) {
      const subject = m[1].trim()
      const answer = m[3].trim()
      if (subject && answer && answer.length < 200) {
        facts.push(s)
        answers.push(answer)
      }
    }
    if (facts.length >= n * 2) break
  }

  const questions: any[] = []
  for (let i = 0; i < Math.min(n, facts.length); i++) {
    const subjectMatch = facts[i].match(/^(.*?)\b(is|are|was|has|have|includes|consists of)\b/i)
    const subject = subjectMatch ? subjectMatch[1].replace(/^The\s+/i, '').trim() : 'It'
    const correct = answers[i]
    const pool = answers.filter((_, idx) => idx !== i)
    const distractors: string[] = []
    while (distractors.length < 3 && pool.length > 0) {
      const j = Math.floor(Math.random() * pool.length)
      distractors.push(pool.splice(j, 1)[0])
    }
    while (distractors.length < 3) distractors.push('Unknown')
    const options = [correct, ...distractors].slice(0, 4)
    for (let k = options.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1)); [options[k], options[r]] = [options[r], options[k]]
    }
    const correctIndex = options.indexOf(correct)
    const qText = `What ${/\b(is|are|was|has|have|includes|consists of)\b/i.test(facts[i]) ? facts[i].replace(/\b(is|are|was|has|have|includes|consists of)\b.*/i, '').trim() : subject}?`
    questions.push({ question: qText, options, answer: correct, correct: correctIndex })
  }
  return questions
}

function parseModelOutput(raw: any): string {
  if (raw == null) return ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    // Many HF models return [{generated_text: '...'}]
    const first = raw[0]
    if (!first) return JSON.stringify(raw)
    if (typeof first === 'string') return first
    if (first.generated_text) return first.generated_text
    if (first.summary_text) return first.summary_text
    // Fallback: join any text fields
    return Object.values(first).filter(v => typeof v === 'string').join('\n') || JSON.stringify(first)
  }
  if (typeof raw === 'object') {
    if (raw.generated_text) return raw.generated_text
    if (raw.summary_text) return raw.summary_text
    return JSON.stringify(raw)
  }
  return String(raw)
}

export async function summarizeText(text: string, options?: { forceGemini?: boolean; desiredWords?: number }) {
  const model = process.env.HF_SUMMARY_MODEL || process.env.HF_MODEL || 'facebook/bart-large-cnn'
  const fallback = process.env.HF_SUMMARY_FALLBACK || 'google/flan-t5-large'
  const clean = redactSensitive(text)

  // Helper to remove echoed prompt from outputs
  function stripEchoedPrompt(output: string, prompt?: string) {
    if (!output) return output
    if (!prompt) return output.trim()
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()
    const nPrompt = normalize(prompt)
    const nOut = normalize(output)
    if (nOut.startsWith(nPrompt)) {
      // Remove the prompt prefix from the original output (not normalized) to preserve formatting
      const idx = output.indexOf(nPrompt)
      if (idx >= 0) {
        return output.slice(idx + nPrompt.length).replace(/^[:\s"']+/, '').trim()
      }
    }
    return output.trim()
  }

  // If caller provided a desired word budget, use it in the instruction prompt.
  // Otherwise fall back to short 3-5 sentence summaries for brevity.
  const desiredWords = options?.desiredWords && Number.isFinite(options.desiredWords) ? options.desiredWords : undefined
  const instructionPrompt = desiredWords
    ? `Summarize the following text in about ${desiredWords} words. Do not include links, emails, or promotional text. Output only the summary. Text:\n\n${clean}`
    : `Summarize the following text in 3-5 concise sentences. Do not include links, emails, or promotional text. Output only the summary. Text:\n\n${clean}`

  // Many classic summarization models expect the raw text as input (e.g., bart/pegasus).
  const isSummarizationModel = /bart|pegasus|summar/i.test(model)
  const payload = isSummarizationModel
    ? { inputs: clean, parameters: { max_new_tokens: 200, temperature: 0.0 } }
    : { inputs: instructionPrompt, parameters: { max_new_tokens: 200, temperature: 0.0 } }

  const usedPrompt = isSummarizationModel ? undefined : instructionPrompt

  // If caller requests Gemini preference, try Gemini first
  if (options?.forceGemini && process.env.GEMINI_API_KEY) {
    try {
      const gemOut = await summarizeDocumentWithGemini(text, desiredWords || 200, DEFAULT_GEMINI_MODEL)
      let summary = String(gemOut || '')
      summary = stripEchoedPrompt(summary, usedPrompt)
      return summary
    } catch (gErr: any) {
      console.warn('Gemini preferred but failed for summary', (gErr as any)?.message || String(gErr))
      // fall through to HF attempts
    }
  }

  // Try primary HF model, then HF fallback; if both fail, prefer Gemini (if configured)
  let out: any
  try {
    out = await hfRequest(model, payload)
  } catch (errPrimary: any) {
    console.warn('Primary summary model failed, retrying with fallback', errPrimary?.message || errPrimary)
    try {
      out = await hfRequest(fallback, payload)
    } catch (errFallback: any) {
      console.warn('HF fallback also failed for summarization', errFallback?.message || errFallback)
      // As a last resort, use Gemini generative model if available
      if (process.env.GEMINI_API_KEY) {
        try {
          const gemOut = await summarizeDocumentWithGemini(text, desiredWords || 200, DEFAULT_GEMINI_MODEL)
          let summary = String(gemOut || '')
          summary = stripEchoedPrompt(summary, usedPrompt)
          return summary
        } catch (gErr: any) {
          console.warn('Gemini summary fallback failed', (gErr as any)?.message || String(gErr))
          throw gErr
        }
      }
      // No Gemini configured or Gemini failed: rethrow fallback error
      throw errFallback
    }
  }

  let summary = parseModelOutput(out)
  summary = stripEchoedPrompt(summary, usedPrompt)
  return summary
}

export async function generateAnswer(question: string, context: string, options?: { forceGemini?: boolean }) {
  const clean = redactSensitive(context)
  const prompt = `You are an expert assistant. Read the following context and answer the question in a clear, helpful way. If the answer can be supported by a short quote from the context, include a brief quoted excerpt and indicate where it appears. Provide the answer in multiple short paragraphs if needed.

Context:\n"""${clean}"""
Question: ${question}

Answer:`

  // Default behavior: allow Gemini fallback. If caller passes options.forceGemini, prefer Gemini first.
  // We'll accept an options object as a third parameter when calling this function.
  const callerOptions = options
  if (callerOptions?.forceGemini && process.env.GEMINI_API_KEY) {
    try {
      const out = await generateWithGemini(DEFAULT_GEMINI_MODEL, prompt)
      return parseModelOutput(out)
    } catch (err: any) {
      console.warn('Gemini preferred but failed for generateAnswer', (err as any)?.message || String(err))
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const out = await generateWithGemini(DEFAULT_GEMINI_MODEL, prompt)
      return parseModelOutput(out)
    } catch (err: any) {
      console.warn('Gemini generative fallback failed', (err as any)?.message || String(err))
    }
  }

  // HF inference fallback: try instruct models
  const configured = process.env.HF_INSTRUCT_MODEL || process.env.HF_MODEL
  const defaults = [configured, 'google/flan-t5-large', 'bigscience/bloom', 'facebook/opt-1.3b'].filter(Boolean) as string[]
  const payload = { inputs: prompt, parameters: { max_new_tokens: 500, temperature: 0.2 } }
  const { out } = await tryModels(defaults, payload)
  return parseModelOutput(out)
}

async function coerceJson(model: string, rawText: string) {
  // Ask the model to return valid JSON only
  const prompt = `Convert the following model output into valid JSON. Output ONLY valid JSON.\n\n${rawText}`
  const payload = { inputs: prompt, parameters: { max_new_tokens: 600, temperature: 0.0 } }
  const out = await hfRequest(model, payload)
  return parseModelOutput(out)
}

export async function generateQuiz(text: string, count = 5, options?: { forceGemini?: boolean }) {
  const configured = process.env.HF_INSTRUCT_MODEL || process.env.HF_MODEL
  // Use HF models that are generally available on the inference API; avoid models that commonly 404.
  // Prefer robust instruction models; avoid facebook/bart-large-cnn which caused token errors
  // Prefer a robust instruction model first to avoid tokenization/index errors seen
  // with some CNN/BART models when fed long/chunked inputs.
  const defaults = ['google/flan-t5-large', configured, 'sshleifer/distilbart-cnn-12-6', 'sshleifer/distilbart-cnn-6-6']
  const models = defaults.filter(Boolean) as string[]
    const clean = redactSensitive(text);
    const prompt = `You are an intelligent quiz generator.\n\nAnalyze the following text and generate ${count} multiple-choice questions (MCQs).\nEach question should test the user's understanding of the text, not memorization.\nReturn the output in pure JSON format.\n\nRules:\n- Each question must have exactly 4 options.\n- Include the correct answer text in \"answer\".\n- Do NOT include explanations.\n\nText:\n\"\"\"${clean}\"\"\"\nFormat:\n[\n  {\n    \"question\": \"...\",\n    \"options\": [\"A\", \"B\", \"C\", \"D\"],\n    \"answer\": \"...\"\n  }\n]\n`;

    // If caller requests Gemini preference, try Gemini first
    if (options?.forceGemini && process.env.GEMINI_API_KEY) {
      try {
        const gemOut = await generateWithGemini(DEFAULT_GEMINI_MODEL, prompt)
        try { return JSON.parse(unwrapCodeBlock(gemOut)) } catch { /* fallthrough */ }
        // if not JSON, return cleaned text for downstream parsing
        return unwrapCodeBlock(gemOut)
      } catch (gErr: any) {
        console.warn('Gemini preferred but failed for quiz', (gErr as any)?.message || String(gErr))
        // fall through to HF attempts below
      }
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        const geminiOut = await generateWithGemini(DEFAULT_GEMINI_MODEL, prompt)
        try { return JSON.parse(unwrapCodeBlock(geminiOut)) } catch { /* fallthrough */ }
        return unwrapCodeBlock(geminiOut)
      } catch (gErr: any) {
        console.warn('Gemini quiz generation failed', (gErr as any)?.message || String(gErr))
        // fall through to HF attempt
      }
    }

    // HF fallback path: try HF models
    const { out } = await tryModels(models, { inputs: prompt, parameters: { max_new_tokens: 700, temperature: 0.0 } })
    const parsed = parseModelOutput(out)
    // Clean possible fenced blocks
    const cleaned = unwrapCodeBlock(parsed)
    try {
      const maybe = JSON.parse(cleaned)
      if (Array.isArray(maybe) && maybe.length >= count) return maybe
      // if parsed JSON exists but too few items, fallback to local
    } catch {}
    // If parsing failed or insufficient, return a local fallback to guarantee count
    try {
      const maybeParsed = JSON.parse(cleaned)
      if (Array.isArray(maybeParsed) && maybeParsed.length >= count) return maybeParsed
    } catch {}
    return generateQuizLocal(text, count)
}

export async function generateFlashcards(text: string, count = 10, options?: { forceGemini?: boolean }) {
  const configuredF = process.env.HF_INSTRUCT_MODEL || process.env.HF_MODEL
  const defaultsF = [configuredF, 'google/flan-t5-large', 'sshleifer/distilbart-cnn-12-6', 'facebook/bart-large-cnn']
  const modelsF = defaultsF.filter(Boolean) as string[]
  const clean = redactSensitive(text)
  const exampleF = `[START OF EXAMPLE]\nContext: The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System. The dark areas on its surface are called maria.\nFlashcards:\nFlashcard 1:\nFront: What is Earth's only natural satellite?\nBack: The Moon\nFlashcard 2:\nFront: What are the dark areas on the Moon's surface called?\nBack: Maria\n[END OF EXAMPLE]`

  const prompt = `${exampleF}\n\n[START OF TASK]\nContext: ${clean}\n\nGenerate exactly ${count} flashcards in the same format.\n\nFlashcards:`
  const payload = { inputs: prompt, parameters: { max_new_tokens: 700, temperature: 0.0 } }

  // If caller requested Gemini preference, try it first
  if (options?.forceGemini && process.env.GEMINI_API_KEY) {
    try {
      const geminiOut = await generateWithGemini(process.env.GEMINI_MODEL || 'gemini-1.5-flash', prompt)
      try { return JSON.parse(unwrapCodeBlock(geminiOut)) } catch {}
      // if not JSON, try parsing front/back format
      const parsedFromGem = ((): any => {
        const lines = geminiOut.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean)
        const items: any[] = []
        let i = 0
        while (i < lines.length) {
          if (/^Flashcard\s*\d+/i.test(lines[i])) { i++ }
          if (i < lines.length && /^Front:/i.test(lines[i])) {
            const front = lines[i].replace(/^Front:\s*/i, '').trim(); i++
            let back = ''
            if (i < lines.length && /^Back:/i.test(lines[i])) { back = lines[i].replace(/^Back:\s*/i, '').trim(); i++ }
            if (front) items.push({ question: front, answer: back })
            continue
          }
          i++
        }
        return items.length ? items : null
      })()
      if (parsedFromGem) return parsedFromGem
    } catch (gErr: any) {
      console.warn('Gemini preferred but failed for flashcards', gErr?.message || gErr)
      // continue to HF path
    }
  }

  const { out: outF, model: modelF } = await tryModels(modelsF, payload)
  const raw = parseModelOutput(outF)
  const cleaned = unwrapCodeBlock(raw)
  // Try strict JSON
  try {
    const parsedJson = JSON.parse(cleaned)
    if (Array.isArray(parsedJson) && parsedJson.length >= count) return parsedJson
  } catch {}

  // Try basic front/back parse
  const parseFlashcardFormat = (rawText: string) => {
    if (!rawText) return null
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const items: any[] = []
    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      if (/^Flashcard\s*\d+/i.test(line)) { i++ }
      if (i < lines.length && /^Front:/i.test(lines[i])) {
        const front = lines[i].replace(/^Front:\s*/i, '').trim(); i++
        let back = ''
        if (i < lines.length && /^Back:/i.test(lines[i])) { back = lines[i].replace(/^Back:\s*/i, '').trim(); i++ }
        if (front) items.push({ front, back })
        continue
      }
      i++
    }
    return items.length ? items : null
  }

  const parsedFlash = parseFlashcardFormat(cleaned)
  if (parsedFlash && parsedFlash.length >= count) return parsedFlash

  // Try coercion to JSON via HF helper
  try {
    const coerced = await coerceJson(modelF, cleaned)
    const j = JSON.parse(coerced)
    if (Array.isArray(j) && j.length >= count) return j
  } catch {}

  // If still not enough, attempt local generator to guarantee count
  return generateFlashcardsLocal(text, count)
}

export default hfRequest