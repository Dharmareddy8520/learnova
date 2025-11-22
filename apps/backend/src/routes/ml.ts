// apps/backend/src/routes/ml.ts
import express, { Request, Response } from 'express'
import { HfInference } from '@huggingface/inference'
import dotenv from 'dotenv'
import { generateWithGemini } from '../services/gemini'
import {
  summarizeText,
  generateQuiz as hfGenerateQuiz,
  generateFlashcards as hfGenerateFlashcards,
  generateAnswer,
} from '../services/hf'
import { User } from '../models/User'
import { PersonalCard } from '../models/PersonalCard'

dotenv.config()

const router = express.Router()

const HF_API_KEY = process.env.HF_API_KEY || ''
const MODEL_QA = process.env.HF_QA_MODEL || 'deepset/roberta-base-squad2'

// Usage limits (env-configurable)
const GUEST_LIMIT = Number(process.env.GUEST_LIMIT ?? '3')
const FREE_TIER_LIMIT = Number(process.env.FREE_TIER_LIMIT ?? '5')
const PREMIUM_TIER_LIMIT = Number(process.env.PREMIUM_TIER_LIMIT ?? '-1')

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLimitForRole(role?: string) {
  if (!role) return GUEST_LIMIT
  if (role === 'premium') return PREMIUM_TIER_LIMIT
  return FREE_TIER_LIMIT
}

function getUsedForUser(user: any, feature: string) {
  if (!user) return 0
  if (!user.usageDate || user.usageDate !== todayStr()) return 0
  return Number((user.usage && user.usage[feature]) || 0)
}

async function createPersonalCardIfNeeded(user: any, title: string, type: string, content: any, metadata: Record<string, any> = {}) {
  try {
    if (!user) {
      console.debug('createPersonalCardIfNeeded: user is null/undefined')
      return
    }
    if (!user._id) {
      console.debug('createPersonalCardIfNeeded: user._id is missing', { user: user?.email || user?.name || 'unknown' })
      return
    }
    const card = await PersonalCard.create({ userId: user._id, title, type, content, metadata })
    console.debug('✅ Personal card created:', { id: card._id, type, title: title.slice(0, 40) })
  } catch (e) {
    // don't block main flow on persistence errors
    console.error('❌ Failed to create personal card:', { error: (e as any)?.message || e, type, title: title.slice(0, 40) })
  }
}

// ---- Status ---------------------------------------------------------------
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    hfConfigured: Boolean(HF_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY),
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
    // Accept patterns like 'Term: ...' 'Definition: ...' blocks (new format)
    if (/^Term[:\s]/i.test(lines[i])) {
      const term = lines[i].replace(/^Term[:\s]+/i, '').trim()
      i++
      let definition = ''
      if (i < lines.length && /^Definition[:\s]/i.test(lines[i])) {
        definition = lines[i].replace(/^Definition[:\s]+/i, '').trim(); i++
      }
      if (term) cards.push({ front: term, back: definition })
      continue
    }
    // Accept patterns like 'Front: ...' 'Back: ...' blocks (legacy format)
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
    // Accept 'Q:' / 'A:' pairs
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

// Remove surrounding code fences or backticks before attempting JSON.parse
function unwrapCodeBlock(s: string | undefined) {
  if (!s) return ''
  let out = String(s).trim()
  // remove ```json or ``` wrappers
  out = out.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
  // remove single-line backticks
  out = out.replace(/^`+|`+$/g, '')
  return out.trim()
}

// Heuristic extractor: look for numbered Flashcard blocks or Term:/Definition: or Front:/Back: patterns
function extractFlashcardsHeuristically(rawText: string, n: number) {
  if (!rawText) return null
  const cleaned = unwrapCodeBlock(rawText)
  const blocks: string[] = []
  // Try to split by 'Flashcard' keywords
  const byFlashcard = cleaned.split(/\bFlashcard\b/i).map(s => s.trim()).filter(Boolean)
  if (byFlashcard.length > 0) {
    for (const b of byFlashcard) {
      // drop short instruction-like pieces
      if (/generate\s+exactly\s+\d+/i.test(b)) continue
      blocks.push(b)
    }
  }
  // If blocks empty, try numbered lists like '1.' '2)'
  if (blocks.length === 0) {
    const numbered = cleaned.split(/(?=\n\s*\d+[:\.)])/g).map(s => s.trim()).filter(Boolean)
    if (numbered.length > 0) blocks.push(...numbered)
  }
  // fallback: split on double newlines
  if (blocks.length === 0) blocks.push(...cleaned.split(/\n{2,}/).map(s => s.trim()).filter(Boolean))

  const cards: any[] = []
  for (const blk of blocks) {
    if (cards.length >= n) break
    // try Term: / Definition: (new format)
    const mTerm = blk.match(/Term[:\s-]*([^\n\r]+)/i)
    const mDef = blk.match(/Definition[:\s-]*([^\n\r]+)/i)
    if (mTerm) {
      const term = mTerm[1].trim()
      const def = mDef ? mDef[1].trim() : blk.replace(mTerm[0], '').trim()
      cards.push({ front: term + (term.endsWith('.') ? '' : '...'), back: def })
      continue
    }
    // try Front: / Back: (legacy format)
    const mFront = blk.match(/Front[:\s-]*([^\n\r]+)/i)
    const mBack = blk.match(/Back[:\s-]*([^\n\r]+)/i)
    if (mFront) {
      const front = mFront[1].trim()
      const back = mBack ? mBack[1].trim() : blk.replace(mFront[0], '').trim()
      cards.push({ front: front + (front.endsWith('.') ? '' : '...'), back })
      continue
    }
    // try Q:/A: pairs
    const lines = blk.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length >= 2) {
      const front = lines[0].replace(/^Q[:\s-]*/i, '').replace(/^\d+[:\.)]/, '').trim()
      const back = lines[1].replace(/^A[:\s-]*/i, '').trim()
      if (front) { cards.push({ front: front + (front.endsWith('.') ? '' : '...'), back }); continue }
    }
    // last resort: use first sentence as front
    const firstLine = blk.split(/[\.\!\?]/)[0]
    if (firstLine && firstLine.trim().length > 5) {
      cards.push({ front: firstLine.trim() + '...', back: blk.trim() })
      continue
    }
  }
  return cards.length ? cards.slice(0, n) : null
}

// --- Local lightweight fallback generators ---
function splitSentences(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
}

function generateFlashcardsLocal(text: string, n: number) {
  const sents = splitSentences(text)
  // score sentences by length and presence of keywords
  const scored = sents.map(s => ({ s, score: Math.min(1, s.length / 200) + (/\b(is|are|was|has|have|include|includes|consists)\b/i.test(s) ? 0.5 : 0) }))
    .sort((a, b) => b.score - a.score)
  const cards: string[] = []
  for (const item of scored) {
    if (cards.length >= n) break
    const sentence = item.s
    const front = sentence.split(/[,;:\-]/)[0].split(' ').slice(0, 10).join(' ').trim()
    if (front) cards.push(front + (front.endsWith('.') ? '' : '...'))
  }
  // fallback: if not enough, push shorter fragments
  let i = 0
  while (cards.length < n && i < sents.length) {
    const sentence = sents[i++]
    const front = sentence.split(' ').slice(0, 8).join(' ')
    cards.push(front + '...')
  }
  return cards.slice(0, n)
}
// Normalize arbitrary parsed flashcard structures into an array of plain strings (important points)
function normalizeFlashcardItems(raw: any, n: number): string[] {
  const out: string[] = []
  if (!raw) return out
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        const first = item.split(/[\.\!\?\n]/)[0].trim()
        if (first) out.push(first)
      } else if (item && typeof item === 'object') {
        const front = (item.front || item.question || item.prompt || item.text || item.title || item.answer || '').toString().trim()
        if (front) out.push(front)
      }
      if (out.length >= n) break
    }
  } else if (typeof raw === 'string') {
    const cleaned = unwrapCodeBlock(raw)
    const blocks = cleaned.split(/\n{1,2}/).map(s => s.trim()).filter(Boolean)
    for (const b of blocks) {
      if (/^Front[:\s]/i.test(b)) {
        const f = b.replace(/^Front[:\s]+/i, '').split(/\n/)[0].trim()
        if (f) out.push(f)
      } else {
        const first = b.split(/[\.\!\?\n]/)[0].trim()
        if (first) out.push(first)
      }
      if (out.length >= n) break
    }
  }
  // If still not enough, generate locally
  if (out.length < n) {
    const local = generateFlashcardsLocal(typeof raw === 'string' ? raw : (raw && raw.text) || '', n)
    for (const l of local) {
      if (out.length >= n) break
      out.push(l)
    }
  }
  return out.slice(0, n)
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
    // pick distractors from other answers
    const pool = answers.filter((_, idx) => idx !== i)
    const distractors: string[] = []
    while (distractors.length < 3 && pool.length > 0) {
      const j = Math.floor(Math.random() * pool.length)
      distractors.push(pool.splice(j, 1)[0])
    }
    // if not enough distractors, fabricate mild variations
    while (distractors.length < 3) {
      distractors.push('Unknown')
    }
    const options = [correct, ...distractors].slice(0, 4)
    // shuffle options
    for (let k = options.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1)); [options[k], options[r]] = [options[r], options[k]]
    }
    const correctIndex = options.indexOf(correct)
    const qText = `What ${/\b(is|are|was|has|have|includes|consists of)\b/i.test(facts[i]) ? facts[i].replace(/\b(is|are|was|has|have|includes|consists of)\b.*/i, '').trim() : subject}?`
    questions.push({ question: qText, options, answer: correct, correct: correctIndex })
  }
  return questions
}


// ---- Summarize ------------------------------------------------------------
router.post('/summarize', async (req: Request, res: Response) => {
  try {
  const { text, desiredWords } = req.body as { text?: string; desiredWords?: number }
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Missing text input' })
    }
    // If logged-in, enforce user's limit server-side. Re-load the user doc to get
    // authoritative, up-to-date usage counts (avoid relying on possibly stale req.user).
    const feature = 'summarize'
    const sessionUser: any = (req as any).user
    let freshUser: any = null
    if (sessionUser) {
      try {
        freshUser = await User.findById(sessionUser._id)
      } catch (e) {
        freshUser = null
      }
      if (freshUser) {
        const limit = getLimitForRole(freshUser.role)
        if (limit >= 0) {
          const used = getUsedForUser(freshUser, feature)
          if (used >= limit) {
            return res.status(403).json({ error: 'Usage limit reached', usage: { feature, used, limit } })
          }
        }
      }
    }

  const opts: any = {}
  if (typeof desiredWords === 'number' && Number.isFinite(desiredWords) && desiredWords > 0) opts.desiredWords = Number(desiredWords)
  // Prefer Gemini automatically when configured
  if (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY) opts.forceGemini = true
  const summary = await summarizeText(text, opts)

    // Persist to personal dashboard for logged-in users (best-effort)
    try {
      await createPersonalCardIfNeeded(freshUser, `Summary: ${String(text).slice(0, 60)}`, 'summary', { summary }, { desiredWords: opts.desiredWords || null })
    } catch (e) {
      console.debug('Personal card save (summary) failed:', (e as any)?.message || e)
    }

    // increment usage for logged-in users
    if (freshUser && typeof freshUser.incrementUsage === 'function') {
      try {
        const r = await freshUser.incrementUsage(feature)
        return res.json({ summary, usage: { feature, used: r.used, limit: getLimitForRole(freshUser.role) } })
      } catch (e) {
        console.debug('Failed to increment usage after summarize:', e)
      }
    }

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

    const feature = 'qa'
    const sessionUser: any = (req as any).user
    let freshUser: any = null
    if (sessionUser) {
      try {
        freshUser = await User.findById(sessionUser._id)
      } catch (e) {
        freshUser = null
      }
      if (freshUser) {
        const limit = getLimitForRole(freshUser.role)
        if (limit >= 0) {
          const used = getUsedForUser(freshUser, feature)
          if (used >= limit) {
            return res.status(403).json({ error: 'Usage limit reached', usage: { feature, used, limit } })
          }
        }
      }
    }

    const hf = new HfInference(HF_API_KEY)
    const result = await hf.questionAnswering({
      model: MODEL_QA,
      inputs: { question, context },
    })

    // If extractive model returned a very short span or low confidence, run a generative fallback
  // explicit types to satisfy strict TS settings
  let finalAnswer: string = result?.answer ?? ''
  let finalScore: number | null = typeof result?.score === 'number' ? result!.score : null
  let finalStart: number | null = typeof result?.start === 'number' ? result!.start : null
  let finalEnd: number | null = typeof result?.end === 'number' ? result!.end : null
    const lowConfidence = (typeof finalScore === 'number' && finalScore < 0.35)
    const shortAnswer = typeof finalAnswer === 'string' && finalAnswer.trim().length < 30
    if (lowConfidence || shortAnswer) {
      try {
        const gen = await generateAnswer(question, context)
        if (gen && gen.trim().length > 0) {
          finalAnswer = gen
          finalScore = null // generative answer doesn't have extractive score
          // Clear extractive span when using generated answer to avoid misleading highlights
          finalStart = null
          finalEnd = null
        }
      } catch (e) {
        console.debug('Generative QA fallback failed:', (e as any)?.message || e)
      }
    }

    // increment usage for logged-in users
    if (freshUser && typeof freshUser.incrementUsage === 'function') {
      try {
        const r = await freshUser.incrementUsage(feature)
        return res.json({
          answer: finalAnswer,
          score: finalScore,
          start: finalStart,
          end: finalEnd,
          usage: { feature, used: r.used, limit: getLimitForRole(freshUser.role) }
        })
      } catch (e) {
        console.debug('Failed to increment usage after qa:', e)
      }
    }

    return res.json({
      answer: finalAnswer,
      score: finalScore,
  start: finalStart,
  end: finalEnd,
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

    if (!text?.trim() || !Number.isFinite(n) || n < 0 || n > 50) {
      return res.status(400).json({
        error: 'Missing/invalid text or number of questions (0–50)',
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

    // Usage enforcement (logged-in users)
    const feature = 'quiz'
    const sessionUserQuiz: any = (req as any).user
    let freshUserQuiz: any = null
    if (sessionUserQuiz) {
      try {
        freshUserQuiz = await User.findById(sessionUserQuiz._id)
      } catch (e) {
        freshUserQuiz = null
      }
      if (freshUserQuiz) {
        const limit = getLimitForRole(freshUserQuiz.role)
        if (limit >= 0) {
          const used = getUsedForUser(freshUserQuiz, feature)
          if (used >= limit) {
            return res.status(403).json({ error: 'Usage limit reached', usage: { feature, used, limit } })
          }
        }
      }
    }
    if (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY) {
      const modelId = process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash'
      const out = await generateWithGemini(modelId, prompt)
  // Unwrap code blocks first
  const cleaned = unwrapCodeBlock(out)
      // Try JSON.parse
      try {
        const parsed = JSON.parse(cleaned)
        if (Array.isArray(parsed) && parsed.length >= n) {
          // increment for logged-in users
          // Normalize to point-only flashcards shape for frontend compatibility
          const norm = normalizeFlashcardItems(parsed, n)
          // Save personal dashboard card (best-effort)
          try { await createPersonalCardIfNeeded(freshUserQuiz || (req as any).user, `Quiz: ${String(text).slice(0,60)}`, 'quiz', { quiz: parsed }, { model: modelId }) } catch (e) { console.debug('Personal card save (quiz) failed:', (e as any)?.message || e) }
          if (freshUserQuiz && typeof freshUserQuiz.incrementUsage === 'function') {
            try {
              const r = await freshUserQuiz.incrementUsage('quiz')
              return res.json({ model: modelId, quiz: parsed, usage: { feature: 'quiz', used: r.used, limit: getLimitForRole(freshUserQuiz.role) } })
            } catch (e) {
              console.debug('Failed to increment usage after quiz (gemini json):', e)
            }
          }
          return res.json({ model: modelId, quiz: parsed })
        }
      } catch {}

      // Try QA-style parser on cleaned text
      const parsedQA = parseQAFormat(cleaned)
      if (parsedQA && parsedQA.length >= n) {
        try { await createPersonalCardIfNeeded(freshUserQuiz || (req as any).user, `Quiz: ${String(text).slice(0,60)}`, 'quiz', { quiz: parsedQA }, { model: modelId }) } catch (e) { console.debug('Personal card save (quiz) failed:', (e as any)?.message || e) }
        if (freshUserQuiz && typeof freshUserQuiz.incrementUsage === 'function') {
          try {
            const r = await freshUserQuiz.incrementUsage('quiz')
            return res.json({ model: modelId, quiz: parsedQA, usage: { feature: 'quiz', used: r.used, limit: getLimitForRole(freshUserQuiz.role) } })
          } catch (e) {
            console.debug('Failed to increment usage after quiz (gemini qa):', e)
          }
        }
        return res.json({ model: modelId, quiz: parsedQA })
      }

      // If output contains instructional meta (model echoed instructions), consider it malformed and fallback
      if (/generate\s+exactly\s+\d+/i.test(out) || /generate\s+\d+\s+flashcards?/i.test(out)) {
        const local = generateQuizLocal(text, n)
        if (freshUserQuiz && typeof freshUserQuiz.incrementUsage === 'function') {
          try { const r = await freshUserQuiz.incrementUsage('quiz'); return res.json({ model: 'local-fallback', quiz: local, usage: { feature: 'quiz', used: r.used, limit: getLimitForRole(freshUserQuiz.role) } }) } catch (e) { console.debug('Failed to increment usage after quiz (local):', e) }
        }
        return res.json({ model: 'local-fallback', quiz: local })
      }

      // As a last attempt, try loose JSON parse of cleaned text and ensure enough items
      try {
        const maybeParsed = (() => {
          try { return JSON.parse(String(cleaned)) } catch { return null }
        })()
        if (Array.isArray(maybeParsed) && maybeParsed.length >= n) {
        try { await createPersonalCardIfNeeded(freshUserQuiz || (req as any).user, `Quiz: ${String(text).slice(0,60)}`, 'quiz', { quiz: maybeParsed }, { model: modelId }) } catch (e) { console.debug('Personal card save (quiz) failed:', (e as any)?.message || e) }
        return res.json({ model: modelId, quiz: maybeParsed })
        }
      } catch (e) {}

      // fallback to local generator
      const local = generateQuizLocal(text, n)
      if (freshUserQuiz && typeof freshUserQuiz.incrementUsage === 'function') {
        try { const r = await freshUserQuiz.incrementUsage('quiz'); return res.json({ model: 'local-fallback', quiz: local, usage: { feature: 'quiz', used: r.used, limit: getLimitForRole(freshUserQuiz.role) } }) } catch (e) { console.debug('Failed to increment usage after quiz (local):', e) }
      }
      return res.json({ model: 'local-fallback', quiz: local })
    }

    // HF fallback
    const hfOut = await hfGenerateQuiz(text, n)
    const user2: any = (req as any).user
    // If HF returned usable array with enough items, use it. Otherwise fall back locally
    let hfQuiz = hfOut
    try { hfQuiz = typeof hfOut === 'string' ? (JSON.parse(hfOut) as any) : hfOut } catch { /* not JSON */ }
    if (Array.isArray(hfQuiz) && hfQuiz.length >= n) {
      try { await createPersonalCardIfNeeded(user2 || (req as any).user, `Quiz: ${String(text).slice(0,60)}`, 'quiz', { quiz: hfQuiz }, { model: 'hf-fallback' }) } catch (e) { console.debug('Personal card save (quiz/hf) failed:', (e as any)?.message || e) }
      if (user2 && typeof user2.incrementUsage === 'function') {
        try { const r = await user2.incrementUsage('quiz'); return res.json({ model: 'hf-fallback', quiz: hfQuiz, usage: { feature: 'quiz', used: r.used, limit: getLimitForRole(user2.role) } }) } catch (e) { console.debug('Failed to increment usage after quiz (hf):', e) }
      }
      return res.json({ model: 'hf-fallback', quiz: hfQuiz })
    }
    // fallback local
    const localQ = generateQuizLocal(text, n)
    if (user2 && typeof user2.incrementUsage === 'function') {
      try {
        await createPersonalCardIfNeeded(user2 || (req as any).user, `Quiz: ${String(text).slice(0,60)}`, 'quiz', { quiz: localQ }, { model: 'local-fallback' })
        const r = await user2.incrementUsage('quiz');
        return res.json({ model: 'local-fallback', quiz: localQ, usage: { feature: 'quiz', used: r.used, limit: getLimitForRole(user2.role) } })
      } catch (e) { console.debug('Failed to increment usage after quiz (local):', e) }
    }
    try { await createPersonalCardIfNeeded(user2 || (req as any).user, `Quiz: ${String(text).slice(0,60)}`, 'quiz', { quiz: localQ }, { model: 'local-fallback' }) } catch (e) { console.debug('Personal card save (quiz/local) failed:', (e as any)?.message || e) }
    return res.json({ model: 'local-fallback', quiz: localQ })
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
    const sessionUserFC: any = (req as any).user
    
    console.log('📝 /flashcards/generate called:', {
      textLength: text?.length || 0,
      numFlashcards: n,
      authenticated: !!sessionUserFC,
      userId: sessionUserFC?._id?.toString?.() || 'guest'
    })

    if (!text?.trim() || !Number.isFinite(n) || n < 0 || n > 100) {
      return res.status(400).json({
        error: 'Missing/invalid text or number of flashcards (0–100)',
      })
    }

    const example =
      `[START OF EXAMPLE]
Context: The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System. The dark areas on its surface are called maria.
Flashcards:
Flashcard 1:
Term: Earth's only natural satellite
Definition: The Moon
Flashcard 2:
Term: Dark areas on the Moon's surface
Definition: Maria
[END OF EXAMPLE]`

    const prompt =
      `${example}

[START OF TASK]
Context: ${text}

Generate exactly ${n} flashcards in the same format.

Flashcards:`

    // Usage enforcement (logged-in users) — reload user for authoritative counts
    let freshUserFC: any = null
    if (sessionUserFC) {
      try { 
        freshUserFC = await User.findById(sessionUserFC._id)
        console.log('✅ Reloaded user from DB:', { userId: freshUserFC?._id?.toString?.() || 'not found', email: freshUserFC?.email })
      } catch (e) { 
        console.error('❌ Failed to reload user from DB:', (e as any)?.message)
        freshUserFC = null 
      }
      if (freshUserFC) {
        const limit = getLimitForRole(freshUserFC.role)
        if (limit >= 0) {
          const used = getUsedForUser(freshUserFC, 'flashcards')
          if (used >= limit) {
            return res.status(403).json({ error: 'Usage limit reached', usage: { feature: 'flashcards', used, limit } })
          }
        }
      }
    } else {
      console.log('⚠️  User not authenticated (guest mode)')
    }

    // Try Gemini first and coerce to structured JSON
    if (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY) {
      const modelId = process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash'
      const out = await generateWithGemini(modelId, prompt)
      const cleaned = unwrapCodeBlock(out)
      // Try strict JSON first
      try {
        const parsed = JSON.parse(cleaned)
        if (Array.isArray(parsed) && parsed.length >= n) {
          const norm = normalizeFlashcardItems(parsed, n)
          // persist personal card (best-effort) - pass freshUserFC if available
          try { 
            const userToSave = freshUserFC || sessionUserFC
            console.log('📌 Saving flashcard, user:', { hasUser: !!userToSave, userId: userToSave?._id?.toString?.() })
            await createPersonalCardIfNeeded(userToSave, `Flashcards: ${String(text).slice(0,60)}`, 'flashcards', { flashcards: norm }, { model: modelId }) 
          } catch (e) { /* error already logged in createPersonalCardIfNeeded */ }
          if (freshUserFC && typeof freshUserFC.incrementUsage === 'function') {
            try {
              const r = await freshUserFC.incrementUsage('flashcards')
              return res.json({ model: modelId, flashcards: norm, usage: { feature: 'flashcards', used: r.used, limit: getLimitForRole(freshUserFC.role) } })
            } catch (e) {
              console.debug('Failed to increment usage after flashcards (gemini json):', e)
            }
          }
          return res.json({ model: modelId, flashcards: norm })
        }
      } catch {}

      // Try parseFlashcardFormat on cleaned text and ensure enough
      const parsedCards = parseFlashcardFormat(cleaned)
      if (parsedCards && parsedCards.length >= n) {
        const norm = normalizeFlashcardItems(parsedCards, n)
        try { await createPersonalCardIfNeeded(freshUserFC || (req as any).user, `Flashcards: ${String(text).slice(0,60)}`, 'flashcards', { flashcards: norm }, { model: modelId }) } catch (e) { console.debug('Personal card save (flashcards) failed:', (e as any)?.message || e) }
        if (freshUserFC && typeof freshUserFC.incrementUsage === 'function') {
          try {
            const r = await freshUserFC.incrementUsage('flashcards')
            return res.json({ model: modelId, flashcards: norm, usage: { feature: 'flashcards', used: r.used, limit: getLimitForRole(freshUserFC.role) } })
          } catch (e) {
            console.debug('Failed to increment usage after flashcards (gemini parsed):', e)
          }
        }
        return res.json({ model: modelId, flashcards: norm })
      }

      // If the model echoed the instruction or returned a small malformed blob, try heuristics
      if (/generate\s+exactly\s+\d+/i.test(out) || /Generate exactly/i.test(out) || /generate\s+flashcards?/i.test(out)) {
        const maybe = extractFlashcardsHeuristically(cleaned, n)
        if (maybe && maybe.length >= n) {
          const norm = normalizeFlashcardItems(maybe, n)
          try { await createPersonalCardIfNeeded(freshUserFC || (req as any).user, `Flashcards: ${String(text).slice(0,60)}`, 'flashcards', { flashcards: norm }, { model: modelId + '-heuristic' }) } catch (e) { console.debug('Personal card save (flashcards/heuristic) failed:', (e as any)?.message || e) }
          if (freshUserFC && typeof freshUserFC.incrementUsage === 'function') {
            try { const r = await freshUserFC.incrementUsage('flashcards'); return res.json({ model: modelId + '-heuristic', flashcards: norm, usage: { feature: 'flashcards', used: r.used, limit: getLimitForRole(freshUserFC.role) } }) } catch (e) { console.debug('Failed to increment usage after flashcards (heuristic):', e) }
          }
          return res.json({ model: modelId + '-heuristic', flashcards: norm })
        }
        // Otherwise immediately fallback to local
        const localCards = generateFlashcardsLocal(text, n)
        const normLocal = normalizeFlashcardItems(localCards, n)
        try { await createPersonalCardIfNeeded(freshUserFC || (req as any).user, `Flashcards: ${String(text).slice(0,60)}`, 'flashcards', { flashcards: normLocal }, { model: 'local-fallback' }) } catch (e) { console.debug('Personal card save (flashcards/local) failed:', (e as any)?.message || e) }
        if (freshUserFC && typeof freshUserFC.incrementUsage === 'function') {
          try { const r = await freshUserFC.incrementUsage('flashcards'); return res.json({ model: 'local-fallback', flashcards: normLocal, usage: { feature: 'flashcards', used: r.used, limit: getLimitForRole(freshUserFC.role) } }) } catch (e) { console.debug('Failed to increment usage after flashcards (local):', e) }
        }
        return res.json({ model: 'local-fallback', flashcards: normLocal })
      }

      // Try heuristic extraction even if no explicit instruction
      const heuristic = extractFlashcardsHeuristically(cleaned, n)
      if (heuristic && heuristic.length >= n) {
        const norm = normalizeFlashcardItems(heuristic, n)
        try { await createPersonalCardIfNeeded(freshUserFC || (req as any).user, `Flashcards: ${String(text).slice(0,60)}`, 'flashcards', { flashcards: norm }, { model: modelId + '-heuristic' }) } catch (e) { console.debug('Personal card save (flashcards/heuristic2) failed:', (e as any)?.message || e) }
        if (freshUserFC && typeof freshUserFC.incrementUsage === 'function') {
          try { const r = await freshUserFC.incrementUsage('flashcards'); return res.json({ model: modelId + '-heuristic', flashcards: norm, usage: { feature: 'flashcards', used: r.used, limit: getLimitForRole(freshUserFC.role) } }) } catch (e) { console.debug('Failed to increment usage after flashcards (heuristic2):', e) }
        }
        return res.json({ model: modelId + '-heuristic', flashcards: norm })
      }

      // As a last attempt, try JSON.parse raw and ensure enough items
      try {
        const maybeParsed = (() => {
          try { return JSON.parse(String(cleaned)) } catch { return null }
        })()
        if (Array.isArray(maybeParsed) && maybeParsed.length >= n) {
          const norm = normalizeFlashcardItems(maybeParsed, n)
          try { await createPersonalCardIfNeeded(freshUserFC || (req as any).user, `Flashcards: ${String(text).slice(0,60)}`, 'flashcards', { flashcards: norm }, { model: modelId }) } catch (e) { console.debug('Personal card save (flashcards) failed:', (e as any)?.message || e) }
          return res.json({ model: modelId, flashcards: norm })
        }
      } catch (e) {}

      // If Gemini output insufficient or malformed, fallback to local generator
      const localCards = generateFlashcardsLocal(text, n)
      const normFinal = normalizeFlashcardItems(localCards, n)
      try { await createPersonalCardIfNeeded(freshUserFC || (req as any).user, `Flashcards: ${String(text).slice(0,60)}`, 'flashcards', { flashcards: normFinal }, { model: 'local-fallback' }) } catch (e) { console.debug('Personal card save (flashcards/local) failed:', (e as any)?.message || e) }
      if (freshUserFC && typeof freshUserFC.incrementUsage === 'function') {
        try { const r = await freshUserFC.incrementUsage('flashcards'); return res.json({ model: 'local-fallback', flashcards: normFinal, usage: { feature: 'flashcards', used: r.used, limit: getLimitForRole(freshUserFC.role) } }) } catch (e) { console.debug('Failed to increment usage after flashcards (local):', e) }
      }
      return res.json({ model: 'local-fallback', flashcards: normFinal })
    }

    // HF fallback
    const hfOut = await hfGenerateFlashcards(text, n)
    if (freshUserFC && typeof freshUserFC.incrementUsage === 'function') {
      try {
        const r = await freshUserFC.incrementUsage('flashcards')
        // If HF returned enough cards, use them, otherwise local fallback
        let hfCards: any = hfOut
        try { hfCards = typeof hfOut === 'string' ? JSON.parse(hfOut) : hfOut } catch {}
        if (Array.isArray(hfCards) && hfCards.length >= n) {
          const norm = normalizeFlashcardItems(hfCards, n)
          try { await createPersonalCardIfNeeded(freshUserFC || (req as any).user, `Flashcards: ${String(text).slice(0,60)}`, 'flashcards', { flashcards: norm }, { model: 'hf-fallback' }) } catch (e) { console.debug('Personal card save (flashcards/hf) failed:', (e as any)?.message || e) }
          return res.json({ model: 'hf-fallback', flashcards: norm, usage: { feature: 'flashcards', used: r.used, limit: getLimitForRole(freshUserFC.role) } })
        }
      } catch (e) {
        console.debug('Failed to increment usage after flashcards (hf):', e)
      }
    }
    // If HF output not sufficient or not array, fallback to local
    const localCards2 = generateFlashcardsLocal(text, n)
    const normLocal2 = normalizeFlashcardItems(localCards2, n)
    try { await createPersonalCardIfNeeded(freshUserFC || (req as any).user, `Flashcards: ${String(text).slice(0,60)}`, 'flashcards', { flashcards: normLocal2 }, { model: 'local-fallback' }) } catch (e) { console.debug('Personal card save (flashcards/hf-local) failed:', (e as any)?.message || e) }
    return res.json({ model: 'local-fallback', flashcards: normalizeFlashcardItems(localCards2, n) })
  } catch (e: any) {
    console.error('Flashcard generation failed:', e)
    return res.status(500).json({ error: e?.message || 'Flashcard generation failed' })
  }
})

export default router
