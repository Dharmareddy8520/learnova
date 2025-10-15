import path from 'path'
import { generateWithGemini } from './gemini'

const HF_API = 'https://api-inference.huggingface.co/models'

async function hfRequest(model: string, payload: any) {
  const token = process.env.HF_API_KEY
  if (!token) throw new Error('HF_API_KEY not configured')

  const res = await fetch(`${HF_API}/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // Include model in the error message to make fallbacks and 404s traceable
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
  const clean = redactSensitive(text)
  const example = `[START OF EXAMPLE]\nContext: The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System. The dark areas on its surface are called maria.\nQuiz:\nQ: What is the Moon's status relative to Earth?\nA) A man-made satellite\nB) A natural satellite\nC) A dwarf planet\nD) A star\nAnswer: B\nQ: The dark areas on the Moon's surface are known as what?\nA) Craters\nB) Valleys\nC) Maria\nD) Highlands\nAnswer: C\n[END OF EXAMPLE]`

  const prompt = `${example}\n\n[START OF TASK]\nContext: ${clean}\n\nGenerate exactly ${count} multiple-choice questions in the same format. Each question must have 4 options (A-D) and indicate the correct Answer.\n\nQuiz:`
  const payload = { inputs: prompt, parameters: { max_new_tokens: 700, temperature: 0.0 } }

  const { out, model } = await tryModels(models, payload)
  let raw = parseModelOutput(out)

  // Try to parse JSON. If it fails, ask model to coerce output into valid JSON once.
  try {
    return JSON.parse(raw)
  } catch (e) {
    try {
      const coerced = await coerceJson(model, raw)
      return JSON.parse(coerced)
    } catch (e2) {
      // If HF failed completely and Gemini is configured, try Gemini as a fallback
      if (process.env.GEMINI_API_KEY) {
        try {
          const geminiOut = await generateWithGemini('gemini-1.5-flash', prompt)
            // geminiOut likely returns a string; try to parse JSON first
            try { return JSON.parse(geminiOut) } catch {}

            // Try to parse QA formatted output (Q:, A) ..., Answer: X)
            const parseQAFormat = (rawText: string) => {
              if (!rawText) return null
              const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
              const items: any[] = []
              let i = 0
              while (i < lines.length) {
                const line = lines[i]
                if (!/^Q:/i.test(line)) { i++; continue }
                const question = line.replace(/^Q:\s*/i, '').trim()
                i++
                const choices: string[] = []
                while (i < lines.length && choices.length < 4) {
                  const m = lines[i].match(/^([A-D])\)\s*(.*)$/i)
                  if (m) { choices.push(m[2].trim()); i++; continue }
                  break
                }
                let answerIndex = -1
                if (i < lines.length && /^Answer:/i.test(lines[i])) {
                  const a = lines[i].replace(/^Answer:\s*/i, '').trim()
                  const idx = ['A','B','C','D'].indexOf(a.toUpperCase())
                  answerIndex = idx >= 0 ? idx : -1
                  i++
                }
                if (question && choices.length === 4 && answerIndex >= 0) {
                  items.push({ question, choices, answerIndex })
                }
              }
              return items.length ? items : null
            }

            const parsed = parseQAFormat(geminiOut)
            if (parsed) return parsed
            return geminiOut
        } catch (gErr: any) {
          // final fallback: return raw HF output
          console.warn('Gemini fallback failed', gErr?.message || gErr)
          return raw
        }
      }
      // Last resort: return raw string so frontend can show it
      return raw
    }
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
