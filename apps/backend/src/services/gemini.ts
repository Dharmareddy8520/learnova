// services/gemini.ts
import { GoogleGenerativeAI, Content } from '@google/generative-ai'

/**
 * Generate text with Gemini (supports 2.5-flash and others)
 * @param modelIdOrPrompt - model name or prompt (auto-detects usage)
 * @param maybePrompt - prompt if first arg was modelId
 */
export async function generateWithGemini(
  modelIdOrPrompt: string,
  maybePrompt?: string
): Promise<string> {
  // allow both generateWithGemini(prompt) or generateWithGemini(modelId, prompt)
  const hasTwoArgs = typeof maybePrompt === 'string'
  const modelId =
    (hasTwoArgs ? modelIdOrPrompt : process.env.GEMINI_MODEL_ID)?.trim() ||
    'gemini-2.5-flash'
  const prompt = (hasTwoArgs ? maybePrompt : modelIdOrPrompt).trim()

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: modelId })

  // Retry/backoff for transient errors (e.g., 503 Service Unavailable)
  const maxAttempts = Number(process.env.GEMINI_MAX_RETRIES || 3)
  const baseDelay = Number(process.env.GEMINI_RETRY_DELAY_MS || 1000)

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Properly typed Content array (must include role)
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ]

      const resp = await model.generateContent({ contents })
      return resp.response.text()
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || String(err)

      // If model not found, surface immediately
      if (/NOT_FOUND|Requested entity was not found|404/i.test(msg)) {
        throw new Error(
          `Gemini model "${modelId}" not found or unavailable for this API key.`
        )
      }

      // Detect transient overload / 503 errors
      const isTransient = /503|Service Unavailable|OVERLOADED|overloaded/i.test(msg)

      if (!isTransient || attempt === maxAttempts) {
        // Non-retryable or last attempt: throw
        throw new Error(`Gemini generation failed: ${msg}`)
      }

      // Retry with exponential backoff + jitter
      const delay = baseDelay * Math.pow(2, attempt - 1)
      const jitter = Math.floor(Math.random() * 300)
      const waitMs = delay + jitter
      console.warn(`Gemini transient error (attempt ${attempt}/${maxAttempts}): ${msg}. Retrying in ${waitMs}ms`)
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      continue
    }
  }
  // Should not reach here
  throw new Error('Gemini generation exhausted retries')
}
