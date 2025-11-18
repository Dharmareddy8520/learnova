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
  const hasTwoArgs = typeof maybePrompt === 'string';
  const modelId =
    (hasTwoArgs ? modelIdOrPrompt : process.env.GEMINI_MODEL_ID)?.trim() ||
    'gemini-2.5-flash';
  const prompt = (hasTwoArgs ? maybePrompt : modelIdOrPrompt).trim();

  // Multi-key support: GEMINI_API_KEYS as comma-separated list
  const apiKeysRaw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY;
  if (!apiKeysRaw) throw new Error('GEMINI_API_KEYS is not configured');
  const apiKeys = apiKeysRaw.split(',').map(k => k.trim()).filter(Boolean);
  if (!apiKeys.length) throw new Error('No Gemini API keys provided');

  const maxAttempts = Number(process.env.GEMINI_MAX_RETRIES || 3);
  const baseDelay = Number(process.env.GEMINI_RETRY_DELAY_MS || 1000);

  // Try each key in order, with retry/backoff for each
  let lastErr: any = null;
  for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
    const apiKey = apiKeys[keyIdx];
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const contents: Content[] = [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ];
        console.log(`[Gemini] Using key #${keyIdx + 1}/${apiKeys.length}, attempt ${attempt}/${maxAttempts}`);
        console.log(`[Gemini] Prompt (first 200 chars):`, prompt.slice(0, 200));
        const resp = await model.generateContent({ contents });
        const result = resp.response.text();
        const wordCount = result.split(/\s+/).filter(Boolean).length;
        console.log(`[Gemini] Summary length: ${wordCount} words`);
        return result;
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || String(err);

        // If model not found, surface immediately
        if (/NOT_FOUND|Requested entity was not found|404/i.test(msg)) {
          throw new Error(
            `Gemini model "${modelId}" not found or unavailable for this API key.`
          );
        }

        // Detect transient overload / 503 errors
        const isTransient = /503|Service Unavailable|OVERLOADED|overloaded/i.test(msg);

        if (!isTransient || attempt === maxAttempts) {
          // Non-retryable or last attempt for this key: try next key
          lastErr = err;
          break;
        }

        // Retry with exponential backoff + jitter
        const delay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 300);
        const waitMs = delay + jitter;
        console.warn(`Gemini transient error (key ${keyIdx + 1}/${apiKeys.length}, attempt ${attempt}/${maxAttempts}): ${msg}. Retrying in ${waitMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
    }
    // If we reach here, this key failed all attempts; try next key
    console.warn(`Gemini API key ${keyIdx + 1} failed, trying next key if available...`);
  }
  // All keys exhausted
  throw new Error('Gemini generation failed for all API keys: ' + (lastErr?.message || lastErr || 'Unknown error'));
}
