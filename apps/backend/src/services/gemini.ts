const GEN_API_BASE = 'https://generativelanguage.googleapis.com/v1beta2/models'

export async function generateWithGemini(model: string, prompt: string, maxOutputTokens = 600, temperature = 0.7) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not configured')

  const url = `${GEN_API_BASE}/${model}:generateText?key=${encodeURIComponent(key)}`

  const body = {
    prompt: { text: prompt },
    temperature,
    maxOutputTokens,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status} ${res.statusText} - ${txt}`)
  }

  const data: any = await res.json().catch(() => null)
  // The response often contains candidates with 'content'
  try {
    if (data?.candidates && Array.isArray(data.candidates) && data.candidates[0]?.content) {
      return data.candidates[0].content as string
    }
    if (data?.output?.[0]?.content) return data.output[0].content
  } catch (e) {
    // fallthrough
  }

  return JSON.stringify(data)
}

export default generateWithGemini
