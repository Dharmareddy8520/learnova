import { generateWithGemini } from './gemini'

// Configurable chunk size (chars)
const DEFAULT_CHUNK_CHAR_LIMIT = Number(process.env.GEMINI_CHUNK_CHAR_LIMIT || '12000')
const MODEL = (process.env.GEMINI_MODEL || process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash').trim()

function chunkText(text: string, maxChars = DEFAULT_CHUNK_CHAR_LIMIT): string[] {
  let t = text.trim()
  const chunks: string[] = []
  while (t.length > maxChars) {
    let cut = t.lastIndexOf('.', maxChars)
    if (cut === -1) cut = maxChars
    const chunk = t.slice(0, cut).trim()
    if (chunk) chunks.push(chunk)
    t = t.slice(cut).trim()
  }
  if (t) chunks.push(t)
  return chunks
}

async function summarizeChunk(text: string, maxWords: number, model = MODEL): Promise<string> {
  const prompt = `You are a precise summarizer.\n\nSummarize the following text in about ${maxWords} words.\nThe summary should be clear, coherent, and must not add new facts.\n\nTEXT:\n${text}`
  const out = await generateWithGemini(model, prompt)
  return String(out || '').trim()
}

export async function summarizeDocumentWithGemini(text: string, desiredWords = 200, model = MODEL): Promise<string> {
  const src = String(text || '').trim()
  if (!src) return 'No content to summarize.'

  // single-shot if small
  if (src.length <= DEFAULT_CHUNK_CHAR_LIMIT) {
    return await summarizeChunk(src, desiredWords, model)
  }

  const chunks = chunkText(src, DEFAULT_CHUNK_CHAR_LIMIT)
  console.log(`➡️ Document large: splitting into ${chunks.length} chunks for Gemini summarization`)

  const partialSummaries: string[] = []
  const perChunkWords = Math.max(Math.floor(desiredWords / Math.max(chunks.length, 1)), 50)

  for (let i = 0; i < chunks.length; i++) {
    try {
      console.log(`   - Summarizing chunk ${i + 1}/${chunks.length}`)
      const s = await summarizeChunk(chunks[i], perChunkWords, model)
      partialSummaries.push(`Chunk ${i + 1} summary:\n${s}`)
    } catch (e: any) {
      console.warn(`chunk ${i + 1} summarization failed:`, e?.message || e)
    }
  }

  if (partialSummaries.length === 0) throw new Error('Failed to summarize any chunks with Gemini')

  const combined = partialSummaries.join('\n\n')
  const finalPrompt = `You are a summarization expert.\n\nYou are given summaries of different chunks from a single document. Combine them into ONE final summary of about ${desiredWords} words.\n\nMake the result:\n- Non-redundant\n- Well structured\n- Easy to read\n- Faithful to the content\n\nChunk summaries:\n${combined}`

  const finalOut = await generateWithGemini(model, finalPrompt)
  return String(finalOut || '').trim()
}

export default summarizeDocumentWithGemini
