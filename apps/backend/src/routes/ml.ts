// apps/backend/src/routes/ml.ts
import express, { Request, Response } from 'express'
import { HfInference } from '@huggingface/inference'
import dotenv from 'dotenv'
import { generateWithGemini } from '../services/gemini'
import {
  summarizeText,
  generateQuiz as hfGenerateQuiz,
  generateFlashcards as hfGenerateFlashcards,
} from '../services/hf'

dotenv.config()

const router = express.Router()

const HF_API_KEY = process.env.HF_API_KEY || ''
const MODEL_QA = process.env.HF_QA_MODEL || 'deepset/roberta-base-squad2'

// ---- Status ---------------------------------------------------------------
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    hfConfigured: Boolean(HF_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  })
})

// Helpers to coerce free-form model outputs into structured JSON
function parseQAFormat(rawText: string) {
  if (!rawText) return null
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const items: any[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!/^Q[:\s]/i.test(line) && !/^Question[:\s]/i.test(line)) { i++; continue }
    const question = line.replace(/^Q[:\s]+/i, '').replace(/^Question[:\s]+/i, '').trim()
    i++
    const choices: string[] = []
    while (i < lines.length && choices.length < 4) {
      const m = lines[i].match(/^([A-D])\)\s*(.*)$/i)
      if (m) { choices.push(m[2].trim()); i++; continue }
      // also accept lines that look like 'A. choice' or '- A) choice' or 'A: choice'
      const m2 = lines[i].match(/^([A-D])[\.):\-]\s*(.*)$/i)
      if (m2) { choices.push(m2[2].trim()); i++; continue }
      break
    }
    let answerIndex = -1
    if (i < lines.length && /^Answer[:\s]/i.test(lines[i])) {
      const a = lines[i].replace(/^Answer[:\s]+/i, '').trim()
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

function parseFlashcardFormat(rawText: string) {
  if (!rawText) return null
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const cards: any[] = []
  let i = 0
  while (i < lines.length) {
    // Accept patterns like 'Front: ...' 'Back: ...' blocks or 'Q:' / 'A:' pairs
    if (/^Front[:\s]/i.test(lines[i])) {
      const front = lines[i].replace(/^Front[:\s]+/i, '').trim()
      i++
      let back = ''
      if (i < lines.length && /^Back[:\s]/i.test(lines[i])) {
        back = lines[i].replace(/^Back[:\s]+/i, '').trim(); i++
      }
      if (front) cards.push({ front, back })
      continue
    }
    if (/^Q[:\s]/i.test(lines[i])) {
      const q = lines[i].replace(/^Q[:\s]+/i, '').trim(); i++
      let a = ''
      if (i < lines.length && /^A[:\s]/i.test(lines[i])) { a = lines[i].replace(/^A[:\s]+/i, '').trim(); i++ }
      if (q) cards.push({ front: q, back: a })
      continue
    }
    i++
  }
  return cards.length ? cards : null
}

// ---- Summarize ------------------------------------------------------------
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text?: string }
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Missing text input' })
    }
    const summary = await summarizeText(text)
    return res.json({ summary })
  } catch (err: any) {
    console.error('[summarize] error:', err)
    return res.status(500).json({ error: err?.message || 'Summarization failed' })
  }
})

// ---- QA -------------------------------------------------------------------
router.post('/qa', async (req: Request, res: Response) => {
  try {
    const { context, question } = req.body as { context?: string; question?: string }
    if (!context?.trim() || !question?.trim()) {
      return res.status(400).json({ error: 'Missing context or question' })
    }
    if (!HF_API_KEY) {
      return res.status(500).json({ error: 'HF_API_KEY is not configured' })
    }

    const hf = new HfInference(HF_API_KEY)
    const result = await hf.questionAnswering({
      model: MODEL_QA,
      inputs: { question, context },
    })

    return res.json({
      answer: result?.answer ?? '',
      score: result?.score ?? null,
      start: result?.start ?? null,
      end: result?.end ?? null,
    })
  } catch (err: any) {
    console.error('[qa] error:', err)
    return res.status(500).json({ error: err?.message || 'QA failed' })
  }
})

// ---- Quiz generation (Gemini → HF fallback) -------------------------------
router.post('/quiz/generate', async (req: Request, res: Response) => {
  try {
    const { text, numQuestions } = req.body as { text?: string; numQuestions?: number | string }
    const n = Number(numQuestions)

    if (!text?.trim() || !Number.isFinite(n) || n <= 0 || n > 25) {
      return res.status(400).json({
        error: 'Missing/invalid text or number of questions (1–25)',
      })
    }

    const example =
      `[START OF EXAMPLE]
Context: The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System. The dark areas on its surface are called maria.
Quiz:
Q: What is the Moon's status relative to Earth?
A) A man-made satellite
B) A natural satellite
C) A dwarf planet
D) A star
Answer: B
Q: The dark areas on the Moon's surface are known as what?
A) Craters
B) Valleys
C) Maria
D) Highlands
Answer: C
[END OF EXAMPLE]`

    const prompt =
      `${example}

[START OF TASK]
Context: ${text}

Generate exactly ${n} multiple-choice questions in the same format.
Each question must have 4 options (A–D) and indicate the correct Answer.

Quiz:`

    // Try Gemini first and coerce to structured JSON
    if (process.env.GEMINI_API_KEY) {
      const modelId = process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash'
      const out = await generateWithGemini(modelId, prompt)
      // Try JSON.parse
      try {
        const parsed = JSON.parse(out)
        return res.json({ model: modelId, quiz: parsed })
      } catch {}

      // Try QA-style parser
      const parsedQA = parseQAFormat(out)
      if (parsedQA) return res.json({ model: modelId, quiz: parsedQA })

      // Last resort: return raw text so frontend can display it
      return res.json({ model: modelId, quiz: out })
    }

    // HF fallback
    const out = await hfGenerateQuiz(text, n)
    return res.json({ model: 'hf-fallback', quiz: out })
  } catch (e: any) {
    console.error('Quiz generation failed:', e)
    return res.status(500).json({ error: e?.message || 'Quiz generation failed' })
  }
})

// ---- Flashcards generation (Gemini → HF fallback) -------------------------
router.post('/flashcards/generate', async (req: Request, res: Response) => {
  try {
    const { text, numFlashcards } = req.body as { text?: string; numFlashcards?: number | string }
    const n = Number(numFlashcards)

    if (!text?.trim() || !Number.isFinite(n) || n <= 0 || n > 50) {
      return res.status(400).json({
        error: 'Missing/invalid text or number of flashcards (1–50)',
      })
    }

    const example =
      `[START OF EXAMPLE]
Context: The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System. The dark areas on its surface are called maria.
Flashcards:
Flashcard 1:
Front: What is Earth's only natural satellite?
Back: The Moon
Flashcard 2:
Front: What are the dark areas on the Moon's surface called?
Back: Maria
[END OF EXAMPLE]`

    const prompt =
      `${example}

[START OF TASK]
Context: ${text}

Generate exactly ${n} flashcards in the same format.

Flashcards:`

    // Try Gemini first and coerce to structured JSON
    if (process.env.GEMINI_API_KEY) {
      const modelId = process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash'
      const out = await generateWithGemini(modelId, prompt)
      try {
        const parsed = JSON.parse(out)
        return res.json({ model: modelId, flashcards: parsed })
      } catch {}

      const parsedCards = parseFlashcardFormat(out)
      if (parsedCards) return res.json({ model: modelId, flashcards: parsedCards })

      return res.json({ model: modelId, flashcards: out })
    }

    // HF fallback
    const out = await hfGenerateFlashcards(text, n)
    return res.json({ model: 'hf-fallback', flashcards: out })
  } catch (e: any) {
    console.error('Flashcard generation failed:', e)
    return res.status(500).json({ error: e?.message || 'Flashcard generation failed' })
  }
})

export default router
