import path from 'path'
import { generateWithGemini } from './gemini'

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

export async function summarizeText(text: string) {
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

  const instructionPrompt = `Summarize the following text in 3-5 concise sentences. Do not include links, emails, or promotional text. Output only the summary. Text:\n\n${clean}`

  // Many classic summarization models expect the raw text as input (e.g., bart/pegasus).
  const isSummarizationModel = /bart|pegasus|summar/i.test(model)
  const payload = isSummarizationModel
    ? { inputs: clean, parameters: { max_new_tokens: 200, temperature: 0.0 } }
    : { inputs: instructionPrompt, parameters: { max_new_tokens: 200, temperature: 0.0 } }

  const usedPrompt = isSummarizationModel ? undefined : instructionPrompt

  const out = await hfRequest(model, payload).catch(async (e) => {
    console.warn('Primary summary model failed, retrying with fallback', e.message)
    return hfRequest(fallback, payload)
  })

  let summary = parseModelOutput(out)
  summary = stripEchoedPrompt(summary, usedPrompt)
  return summary
}

export async function generateAnswer(question: string, context: string) {
  const clean = redactSensitive(context)
  const prompt = `You are an expert assistant. Read the following context and answer the question in a clear, helpful way. If the answer can be supported by a short quote from the context, include a brief quoted excerpt and indicate where it appears. Provide the answer in multiple short paragraphs if needed.

Context:\n"""${clean}"""
Question: ${question}

Answer:`

  // Prefer Gemini if available for richer prose
  if (process.env.GEMINI_API_KEY) {
    try {
      const out = await generateWithGemini('gemini-2.5-flash', prompt)
      return parseModelOutput(out)
    } catch (err: any) {
      console.warn('Gemini generative fallback failed', err?.message || err)
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

export async function generateQuiz(text: string, count = 5) {
  const configured = process.env.HF_INSTRUCT_MODEL || process.env.HF_MODEL
  // Use HF models that are generally available on the inference API; avoid models that commonly 404.
  const defaults = [configured, 'google/flan-t5-large', 'sshleifer/distilbart-cnn-12-6', 'facebook/bart-large-cnn']
  const models = defaults.filter(Boolean) as string[]
    const clean = redactSensitive(text);
    const prompt = `You are an intelligent quiz generator.\n\nAnalyze the following text and generate ${count} multiple-choice questions (MCQs).\nEach question should test the user's understanding of the text, not memorization.\nReturn the output in pure JSON format.\n\nRules:\n- Each question must have exactly 4 options.\n- Include the correct answer text in \"answer\".\n- Do NOT include explanations.\n\nText:\n\"\"\"${clean}\"\"\"\nFormat:\n[\n  {\n    \"question\": \"...\",\n    \"options\": [\"A\", \"B\", \"C\", \"D\"],\n    \"answer\": \"...\"\n  }\n]\n`;

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    try {
    const geminiOut = await generateWithGemini('gemini-pro', prompt);
      try {
        return JSON.parse(geminiOut);
      } catch {
        return geminiOut;
      }
    } catch (gErr: any) {
      console.warn('Gemini quiz generation failed', gErr?.message || gErr);
      throw new Error('Quiz generation failed with Gemini');
    }
}

export async function generateFlashcards(text: string, count = 10) {
  const configuredF = process.env.HF_INSTRUCT_MODEL || process.env.HF_MODEL
  const defaultsF = [configuredF, 'google/flan-t5-large', 'sshleifer/distilbart-cnn-12-6', 'facebook/bart-large-cnn']
  const modelsF = defaultsF.filter(Boolean) as string[]
  const clean = redactSensitive(text)
  const exampleF = `[START OF EXAMPLE]\nContext: The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System. The dark areas on its surface are called maria.\nFlashcards:\nFlashcard 1:\nFront: What is Earth's only natural satellite?\nBack: The Moon\nFlashcard 2:\nFront: What are the dark areas on the Moon's surface called?\nBack: Maria\n[END OF EXAMPLE]`

  const prompt = `${exampleF}\n\n[START OF TASK]\nContext: ${clean}\n\nGenerate exactly ${count} flashcards in the same format.\n\nFlashcards:`
  const payload = { inputs: prompt, parameters: { max_new_tokens: 700, temperature: 0.0 } }

  const { out: outF, model: modelF } = await tryModels(modelsF, payload)
  const raw = parseModelOutput(outF)

  try {
    return JSON.parse(raw)
  } catch (e) {
    try {
      // Try parsing common front/back flashcard textual format before coercion
      const parseFlashcardFormat = (rawText: string) => {
        if (!rawText) return null
        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        const items: any[] = []
        let i = 0
        while (i < lines.length) {
          const line = lines[i]
          // look for 'Flashcard' marker or 'Front:' directly
          if (/^Flashcard\s*\d+/i.test(line) || /^Front:/i.test(line)) {
            // advance if Flashcard header
            if (/^Flashcard\s*\d+/i.test(line)) { i++ }
            // front
            if (i < lines.length && /^Front:/i.test(lines[i])) {
              const front = lines[i].replace(/^Front:\s*/i, '').trim(); i++
              // back
              let back = ''
              if (i < lines.length && /^Back:/i.test(lines[i])) { back = lines[i].replace(/^Back:\s*/i, '').trim(); i++ }
              if (front) items.push({ question: front, answer: back })
              continue
            }
          }
          i++
        }
        return items.length ? items : null
      }

      const parsedFlash = parseFlashcardFormat(raw)
      if (parsedFlash) return parsedFlash

      const coerced = await coerceJson(modelF, raw)
      return JSON.parse(coerced)
    } catch (e2) {
      if (process.env.GEMINI_API_KEY) {
        try {
          const geminiOut = await generateWithGemini('gemini-1.5-flash', prompt)
          try { return JSON.parse(geminiOut) } catch {}

          // try parsing Gemini front/back format
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
                if (front) items.push({ question: front, answer: back })
                continue
              }
              i++
            }
            return items.length ? items : null
          }

          const parsed = parseFlashcardFormat(geminiOut)
          if (parsed) return parsed
          return geminiOut
        } catch (gErr: any) {
          console.warn('Gemini fallback failed', gErr?.message || gErr)
          return raw
        }
      }
      return raw
    }
  }
}

export default hfRequest
