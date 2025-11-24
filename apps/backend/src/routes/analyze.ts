import express, { Request, Response } from 'express'
import multer from 'multer'
import { randomUUID } from 'crypto'
import { 
  summarizeDocument, 
  generateQuizDocument, 
  generateFlashcardsDocument,
  answerQuestionAboutContext,
  prepareQAContext
} from '../services/gemini-document'

const router = express.Router()

// multer in-memory
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } })

// In-memory stores (no DB for now)
const uploadsStore: Record<string, any> = {}
const jobsStore: Record<string, any> = {}
const usageStore: Record<string, any> = {}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getKeyForRequest(req: Request) {
  // Prefer logged-in user id if available
  const user = (req as any).user
  if (user && user._id) return `user:${String(user._id)}`
  // Next, guest key cookie
  const cookie = req.cookies && req.cookies.guestKey
  if (cookie) return `guest:${cookie}`
  // Fallback to IP (best-effort)
  return `ip:${req.ip}`
}

function ensureGuestKey(req: Request, res: Response) {
  if (!req.cookies || !req.cookies.guestKey) {
    const k = randomUUID()
    res.cookie('guestKey', k, { httpOnly: false, maxAge: 1000 * 60 * 60 * 24 * 30 })
    return k
  }
  return req.cookies.guestKey
}

// POST /api/upload - accept file, return uploadId and meta
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file: any = (req as any).file
    if (!file) return res.status(400).json({ error: 'Missing file' })

    const ext = (file.originalname || '').split('.').pop()?.toLowerCase() || ''
    const meta: any = { filename: file.originalname, size: file.size, mime: file.mimetype, ext }

    let text = ''
    // TXT
    if (file.mimetype.startsWith('text/') || ext === 'txt') {
      text = file.buffer.toString('utf8')
    } else if (file.mimetype === 'application/pdf' || ext === 'pdf') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PDFParse } = require('pdf-parse')
        const parser = new PDFParse({ data: file.buffer })
        const result = await parser.getText()
        text = result?.text || ''
        if (!text || !text.trim()) {
          // empty text may indicate scanned PDF; return a helpful message (OCR not installed)
          return res.status(422).json({ error: 'PDF contains no extractable text. OCR required for scanned PDFs.' })
        }
      } catch (e) {
        console.error('PDF parse error:', e)
        return res.status(500).json({ error: `Failed to parse PDF: ${(e as any)?.message || String(e)}` })
      }
    } else if (ext === 'docx') {
      // Try to dynamically import mammoth if available
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mammoth = require('mammoth')
        const result = await mammoth.extractRawText({ buffer: file.buffer })
        text = result && result.value ? result.value : ''
      } catch (e) {
        console.warn('DOCX support not available (mammoth missing) or parse failed', e)
        return res.status(501).json({ error: 'DOCX extraction not available. Install "mammoth" to enable.' })
      }
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Supported: .txt, .pdf, .docx' })
    }

    // Basic normalization: trim and collapse whitespace
    const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim()

    // Chunk into ~2000 char segments with 200 char overlap
    const CHUNK_SIZE = 2000
    const OVERLAP = 200
    const chunks: string[] = []
    let i = 0
    while (i < normalized.length) {
      const slice = normalized.slice(i, i + CHUNK_SIZE)
      chunks.push(slice)
      i += CHUNK_SIZE - OVERLAP
    }

    const uploadId = randomUUID()
    uploadsStore[uploadId] = { id: uploadId, meta, text: normalized, chunks, createdAt: new Date().toISOString() }

    return res.json({ uploadId, meta: { ...meta, pageCount: undefined } })
  } catch (err: any) {
    console.error('/upload error', err)
    return res.status(500).json({ error: err?.message || 'Upload failed' })
  }
})

// POST /api/analyze - start tasks for an upload
router.post('/analyze', express.json(), async (req: Request, res: Response) => {
  try {
    const { uploadId, tasks } = req.body as any
    if (!uploadId || !uploadsStore[uploadId]) return res.status(400).json({ error: 'Invalid or missing uploadId' })

    // Enforce simple usage limits (in-memory): guest=3, free=5, premium=-1
    const key = getKeyForRequest(req)
    const today = todayStr()
    usageStore[today] = usageStore[today] || {}
    usageStore[today][key] = usageStore[today][key] || { summarize: 0, qa: 0, quiz: 0, flashcards: 0, total: 0 }
    const used = usageStore[today][key]
    const role = (req as any).user?.role || 'guest'
    const limits: any = { guest: 3, free: 5, premium: -1 }
    const remaining = limits[role] < 0 ? Infinity : Math.max(0, limits[role] - used.total)
    // Count requested actions
    let requested = 0
    if (tasks?.summarize) requested++
    if (tasks?.qa) requested++
    if (tasks?.quiz) requested++
    if (tasks?.flashcards) requested++
    if (requested > remaining) return res.status(403).json({ error: 'Usage limit reached for today' })

    // Create job
    const jobId = randomUUID()
    jobsStore[jobId] = { id: jobId, uploadId, status: 'pending', results: {}, errors: {}, createdAt: new Date().toISOString() }

    // Kick off async work (best-effort, no persistent queue)
    ;(async () => {
      jobsStore[jobId].status = 'running'
      const upload = uploadsStore[uploadId]
      const fullText = upload.text
      // Detect folder-like uploads: zip files or very large chunk counts
      const isFolderLike = (upload.meta && (upload.meta.ext === 'zip' || upload.meta.mime === 'application/zip')) || (Array.isArray(upload.chunks) && upload.chunks.length > 10)
      const results: any = {}
      const errors: any = {}

      const tasksToRun: Array<Promise<void>> = []

      if (tasks?.summarize) {
        tasksToRun.push((async () => {
          try {
            console.log('🔍 Starting summarization...')
            console.log(`📝 Full text length: ${fullText?.length || 0} characters`)
            const desiredWords = Number(tasks.summarize.words) || 200
            console.log(`🎯 Target word count: ${desiredWords}`)
            const s = await summarizeDocument(fullText, desiredWords)
            console.log(`✅ Summary generated: ${s?.length || 0} characters`)
            console.log(`📄 Summary preview: ${s?.substring(0, 100)}...`)
            results.summary = s
            // update usage
            usageStore[today][key].summarize += 1
            usageStore[today][key].total += 1
          } catch (e: any) {
            console.error('❌ summarize error', e)
            errors.summary = e?.message || String(e)
          }
        })())
      }

      if (tasks?.qa) {
        tasksToRun.push((async () => {
          try {
            const context = await prepareQAContext(fullText)
            let qaItems: any[] = []
            if (tasks.qa.questions && Array.isArray(tasks.qa.questions) && tasks.qa.questions.length) {
              for (const q of tasks.qa.questions.slice(0, 10)) {
                try {
                  const ans = await answerQuestionAboutContext(context, q)
                  qaItems.push({ question: q, answer: ans, confidence: null })
                } catch (e: any) {
                  qaItems.push({ question: q, answer: null, confidence: 0, error: e?.message || String(e) })
                }
              }
            } else {
              // Auto-generate 3 questions via quiz generator then answer them
              const rawQs: any = await generateQuizDocument(fullText, 3)
              let parsed: any = rawQs
              if (typeof rawQs === 'string') {
                try { parsed = JSON.parse(rawQs) } catch { parsed = null }
              }
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  const qText = item.question || item.prompt || JSON.stringify(item).slice(0, 200)
                  const ans = await answerQuestionAboutContext(context, qText).catch((e: any) => null)
                  qaItems.push({ question: qText, answer: ans, confidence: null })
                }
              }
            }
            results.qa = qaItems
            usageStore[today][key].qa += 1
            usageStore[today][key].total += 1
          } catch (e: any) {
            console.error('qa error', e)
            errors.qa = e?.message || String(e)
          }
        })())
      }

      if (tasks?.quiz) {
        tasksToRun.push((async () => {
          try {
            const n = Number(tasks.quiz.numQuestions) || 8
            const q = await generateQuizDocument(fullText, Math.min(25, Math.max(1, n)))
            results.quiz = q
            usageStore[today][key].quiz += 1
            usageStore[today][key].total += 1
          } catch (e: any) {
            console.error('quiz error', e)
            errors.quiz = e?.message || String(e)
          }
        })())
      }

      if (tasks?.flashcards) {
        tasksToRun.push((async () => {
          try {
            const n = Number(tasks.flashcards.count) || 12
            const fc = await generateFlashcardsDocument(fullText, Math.min(50, Math.max(1, n)))
            results.flashcards = fc
            usageStore[today][key].flashcards += 1
            usageStore[today][key].total += 1
          } catch (e: any) {
            console.error('flashcards error', e)
            errors.flashcards = e?.message || String(e)
          }
        })())
      }

      // Wait for all tasks to finish
      await Promise.allSettled(tasksToRun)

      console.log('🏁 All tasks completed')
      console.log(`📊 Results:`, JSON.stringify(results, null, 2))
      console.log(`⚠️  Errors:`, JSON.stringify(errors, null, 2))

      jobsStore[jobId].status = 'done'
      jobsStore[jobId].results = results
      jobsStore[jobId].errors = errors
      jobsStore[jobId].finishedAt = new Date().toISOString()
    })()

    return res.json({ jobId })
  } catch (err: any) {
    console.error('/analyze error', err)
    return res.status(500).json({ error: err?.message || 'Analyze failed' })
  }
})

// GET /api/analyze/:jobId/status
router.get('/analyze/:jobId/status', (req: Request, res: Response) => {
  const { jobId } = req.params
  const job = jobsStore[jobId]
  if (!job) return res.status(404).json({ error: 'Job not found' })
  return res.json({ status: job.status, results: job.results, errors: job.errors })
})

export default router
