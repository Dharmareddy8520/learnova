import express from 'express'
import multer from 'multer'
import { summarizeText, generateQuiz, generateFlashcards, qa } from '../services/hf'
import { processDocument } from '../services/document'

const router = express.Router()
const upload = multer({ dest: 'uploads/' })

// Simple status endpoint to check whether HF_API_KEY is present in the running process
router.get('/status', (req, res) => {
  res.json({ hfConfigured: !!process.env.HF_API_KEY })
})

function parseModelOutput(raw: any) {
  // HF often returns an array or object. Normalize to string if possible
  if (!raw) return null
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) {
    const first = raw[0]
    if (typeof first === 'string') return first
    if (first.generated_text) return first.generated_text
    if (first.summary_text) return first.summary_text
    return JSON.stringify(raw)
  }
  if (raw.generated_text) return raw.generated_text
  if (raw.summary_text) return raw.summary_text
  return JSON.stringify(raw)
}

router.post('/summarize', async (req, res) => {
  try {
    const { text } = req.body
    if (!text) return res.status(400).json({ error: 'text required' })
    const out = await summarizeText(text)
    // summarizeText returns a string (already parsed/normalized)
    const summary = typeof out === 'string' ? out : JSON.stringify(out)
    res.json({ summary })
  } catch (err: any) {
    console.error('summarize error', err)
    res.status(500).json({ error: err.message || 'summarization failed' })
  }
})

router.post('/quiz', async (req, res) => {
  try {
    const { text, count } = req.body
    if (!text) return res.status(400).json({ error: 'text required' })
    const out = await generateQuiz(text, count || 5)
    // generateQuiz may return a parsed object/array or a raw string
    if (typeof out === 'string') {
      try {
        const parsed = JSON.parse(out)
        return res.json({ quiz: parsed })
      } catch {
        return res.json({ quiz: out })
      }
    }
    return res.json({ quiz: out })
  } catch (err: any) {
    console.error('quiz error', err)
    res.status(500).json({ error: err.message || 'quiz generation failed' })
  }
})

router.post('/flashcards', async (req, res) => {
  try {
    const { text, count } = req.body
    if (!text) return res.status(400).json({ error: 'text required' })
    const out = await generateFlashcards(text, count || 10)
    if (typeof out === 'string') {
      try {
        const parsed = JSON.parse(out)
        return res.json({ flashcards: parsed })
      } catch {
        return res.json({ flashcards: out })
      }
    }
    return res.json({ flashcards: out })
  } catch (err: any) {
    console.error('flashcards error', err)
    res.status(500).json({ error: err.message || 'flashcard generation failed' })
  }
})

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const content = await processDocument(req.file.path)
    res.json({ content })
  } catch (err: any) {
    console.error('upload error', err)
    res.status(500).json({ error: err.message || 'File processing failed' })
  }
})

router.post('/qa', async (req, res) => {
  try {
    const { text, question } = req.body
    if (!text || !question) return res.status(400).json({ error: 'text and question required' })
    // Assuming you have a qa function in hf.ts
    const answer = await qa(text, question)
    res.json({ answer })
  } catch (err: any) {
    console.error('qa error', err)
    res.status(500).json({ error: err.message || 'Q&A failed' })
  }
})

export default router
