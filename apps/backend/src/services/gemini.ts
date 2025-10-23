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
    if (/NOT_FOUND|Requested entity was not found|404/i.test(msg)) {
      throw new Error(
        `Gemini model "${modelId}" not found or unavailable for this API key.`
      )
    }
    throw new Error(`Gemini generation failed: ${msg}`)
  }
}
