import express, { Request, Response } from 'express'
import multer from 'multer'
import { randomUUID } from 'crypto'
import { summarizeText, generateAnswer, generateQuiz, generateFlashcards } from '../services/hf'

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
    // TXT (defensive checks)
    if ((file.mimetype && typeof file.mimetype === 'string' && file.mimetype.startsWith('text/')) || ext === 'txt') {
      try {
        text = file.buffer ? file.buffer.toString('utf8') : ''
      } catch (e: any) {
        console.error('❌ TXT decode error for', file.originalname, e)
        return res.status(500).json({ error: 'Failed to decode text file', details: e?.message || String(e) })
      }
    } else if ((file.mimetype && file.mimetype === 'application/pdf') || ext === 'pdf') {
      try {
        console.log('🔄 PDF parsing starting for file:', file.originalname, 'size:', file.size)
        // pdf-parse v2 uses: const { PDFParse } = require('pdf-parse')
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PDFParse } = require('pdf-parse')
        
        if (!file.buffer) throw new Error('No file buffer present')
        
        // Create parser instance and extract text
        const parser = new PDFParse({ data: file.buffer })
        const result = await parser.getText()
        text = result?.text || ''
        
        console.log('✅ PDF extracted text length:', text?.length || 0)
        if (!text || !text.trim()) {
          // empty text may indicate scanned PDF
          console.warn('⚠️ PDF has no extractable text')
          return res.status(422).json({ error: 'PDF contains no extractable text. This is likely a scanned PDF. Please use a text-based PDF or convert it first.' })
        }
      } catch (e: any) {
        console.error('❌ PDF parse error for', file.originalname, e)
        return res.status(500).json({ error: 'Failed to parse PDF', details: e?.message || String(e) })
      }
    } else if (ext === 'docx' || (file.mimetype && file.mimetype.includes('word'))) {
      // Try to dynamically import mammoth if available
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mammoth = require('mammoth')
        const result = await mammoth.extractRawText({ buffer: file.buffer })
        text = result && result.value ? result.value : ''
      } catch (e: any) {
        console.warn('DOCX support not available (mammoth missing) or parse failed', e?.message || e)
        return res.status(501).json({ error: 'DOCX extraction not available. Install "mammoth" to enable.', details: e?.message || String(e) })
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
// Accepts either uploadId (file) or text (pasted)
type UploadMeta = { filename: string; size: number; mime: string; ext: string } | null;
router.post('/analyze', express.json(), async (req: Request, res: Response) => {
  try {
    const { uploadId, text, tasks } = req.body as any;
  let fullText = '';
  let uploadMeta: UploadMeta = null;
    if (uploadId && uploadsStore[uploadId]) {
      fullText = uploadsStore[uploadId].text;
      uploadMeta = uploadsStore[uploadId].meta;
    } else if (typeof text === 'string' && text.trim().length > 0) {
      fullText = text.trim();
      uploadMeta = { filename: 'Pasted Text', size: fullText.length, mime: 'text/plain', ext: 'txt' };
    } else {
      return res.status(400).json({ error: 'Invalid or missing uploadId/text' });
    }

    // Enforce simple usage limits (in-memory): guest=3, free=5, premium=-1
    const key = getKeyForRequest(req);
    const today = todayStr();
    usageStore[today] = usageStore[today] || {};
    usageStore[today][key] = usageStore[today][key] || { summarize: 0, qa: 0, quiz: 0, flashcards: 0, total: 0 };
    const used = usageStore[today][key];
    const role = (req as any).user?.role || 'guest';
    const limits: any = { guest: 3, free: 5, premium: -1 };
    const remaining = limits[role] < 0 ? Infinity : Math.max(0, limits[role] - used.total);
    // Count requested actions
    let requested = 0;
    if (tasks?.summarize) requested++;
    if (tasks?.qa) requested++;
    if (tasks?.quiz) requested++;
    if (tasks?.flashcards) requested++;
    if (requested > remaining) return res.status(403).json({ error: 'Usage limit reached for today' });

    // Create job
    const jobId = randomUUID();
    jobsStore[jobId] = { id: jobId, uploadId: uploadId || null, meta: uploadMeta, status: 'pending', results: {}, errors: {}, createdAt: new Date().toISOString() };

    // Kick off async work (best-effort, no persistent queue)
    ;(async () => {
      console.log('🚀 Starting async job:', jobId);
      jobsStore[jobId].status = 'running';
  // For pasted text, treat as a single chunk, not folder-like
  const isFolderLike = uploadMeta && (uploadMeta as any).ext === 'zip' || (uploadMeta as any).mime === 'application/zip';
      const preferGemini = Boolean(process.env.GEMINI_API_KEY);
      const forceGemini = preferGemini;
      console.log('📋 Job config: isFolderLike=', isFolderLike, 'preferGemini=', preferGemini, 'tasks=', Object.keys(tasks).filter(k => tasks[k]));
      const results: any = {};
      const errors: any = {};
      const tasksToRun: Array<Promise<void>> = [];

      if (tasks?.summarize) {
        tasksToRun.push((async () => {
          try {
            const desiredWords = typeof tasks.summarize === 'object' && tasks.summarize.desiredWords ? Number(tasks.summarize.desiredWords) : undefined;
            const s = await summarizeText(fullText, { forceGemini: !!isFolderLike || forceGemini, desiredWords });
            results.summary = s;
            usageStore[today][key].summarize += 1;
            usageStore[today][key].total += 1;
          } catch (e: any) {
            console.error('summarize error', e);
            errors.summary = e?.message || String(e);
          }
        })());
      }

      if (tasks?.qa) {
        tasksToRun.push((async () => {
          try {
            let qaItems: any[] = [];
            if (tasks.qa.questions && Array.isArray(tasks.qa.questions) && tasks.qa.questions.length) {
              for (const q of tasks.qa.questions.slice(0, 10)) {
                try {
                  const ans = await generateAnswer(q, fullText, { forceGemini: !!isFolderLike || forceGemini });
                  qaItems.push({ question: q, answer: ans, confidence: null });
                } catch (e: any) {
                  qaItems.push({ question: q, answer: null, confidence: 0, error: e?.message || String(e) });
                }
              }
            } else {
              const rawQs: any = await generateQuiz(fullText, 3, { forceGemini: !!isFolderLike || forceGemini });
              let parsed: any = rawQs;
              if (typeof rawQs === 'string') {
                try { parsed = JSON.parse(rawQs); } catch { parsed = null; }
              }
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  const qText = item.question || item.prompt || JSON.stringify(item).slice(0, 200);
                  const ans = await generateAnswer(qText, fullText).catch((e: any) => null);
                  qaItems.push({ question: qText, answer: ans, confidence: null });
                }
              }
            }
            results.qa = qaItems;
            usageStore[today][key].qa += 1;
            usageStore[today][key].total += 1;
          } catch (e: any) {
            console.error('qa error', e);
            errors.qa = e?.message || String(e);
          }
        })());
      }

      if (tasks?.quiz) {
        tasksToRun.push((async () => {
          try {
            console.log('🎯 Quiz generation starting, text length:', fullText.length);
            const n = Number(tasks.quiz.numQuestions) || 8;
            const q = await generateQuiz(fullText, Math.min(25, Math.max(1, n)), { forceGemini: !!isFolderLike || forceGemini });
            console.log('✅ Quiz generated:', typeof q, Array.isArray(q) ? q.length + ' items' : (typeof q === 'string' ? q.length + ' chars' : 'unknown'));
            results.quiz = q;
            usageStore[today][key].quiz += 1;
            usageStore[today][key].total += 1;
          } catch (e: any) {
            console.error('❌ quiz error', e);
            errors.quiz = e?.message || String(e);
          }
        })());
      }

      if (tasks?.flashcards) {
        tasksToRun.push((async () => {
          try {
            console.log('📇 Flashcard generation starting, text length:', fullText.length);
            const n = Number(tasks.flashcards.count) || 12;
            const fc = await generateFlashcards(fullText, Math.min(50, Math.max(1, n)), { forceGemini: !!isFolderLike || forceGemini });
            console.log('✅ Flashcards generated:', typeof fc, Array.isArray(fc) ? fc.length + ' items' : (typeof fc === 'string' ? fc.length + ' chars' : 'unknown'));
            results.flashcards = fc;
            usageStore[today][key].flashcards += 1;
            usageStore[today][key].total += 1;
          } catch (e: any) {
            console.error('❌ flashcards error', e);
            errors.flashcards = e?.message || String(e);
          }
        })());
      }

      await Promise.allSettled(tasksToRun);
      jobsStore[jobId].status = 'done';
      jobsStore[jobId].results = results;
      jobsStore[jobId].errors = errors;
      jobsStore[jobId].finishedAt = new Date().toISOString();
      console.log('✅ Job completed:', jobId, '- results keys:', Object.keys(results), '- errors keys:', Object.keys(errors));
    })();

    return res.json({ jobId });
  } catch (err: any) {
    console.error('/analyze error', err);
    return res.status(500).json({ error: err?.message || 'Analyze failed' });
  }
});

// GET /api/analyze/:jobId/status
router.get('/analyze/:jobId/status', (req: Request, res: Response) => {
  const { jobId } = req.params
  const job = jobsStore[jobId]
  if (!job) return res.status(404).json({ error: 'Job not found' })
  return res.json({ status: job.status, results: job.results, errors: job.errors })
})

// GET /api/upload/:uploadId/text - return full extracted text for an upload
router.get('/upload/:uploadId/text', (req: Request, res: Response) => {
  const { uploadId } = req.params
  if (!uploadId || !uploadsStore[uploadId]) return res.status(404).json({ error: 'Upload not found' })
  const upload = uploadsStore[uploadId]
  return res.json({ uploadId, meta: upload.meta, text: upload.text })
})

export default router
