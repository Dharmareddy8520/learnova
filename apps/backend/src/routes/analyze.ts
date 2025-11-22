import express, { Request, Response } from 'express'
import multer from 'multer'
import { randomUUID } from 'crypto'
import { summarizeText, generateAnswer, generateQuiz, generateFlashcards } from '../services/hf'
import { PersonalCard } from '../models/PersonalCard'
import { UploadedDocument, Summary, Quiz, Flashcard } from '../models/UploadedDocument'

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

// Helper to create personal cards from analysis results
async function createPersonalCardIfNeeded(user: any, title: string, type: string, content: any, metadata: Record<string, any> = {}) {
  try {
    if (!user || !user._id) return
    await PersonalCard.create({ userId: user._id, title, type, content, metadata })
  } catch (e) {
    // don't block main flow on persistence errors
    console.debug('Failed to create personal card:', (e as any)?.message || e)
  }
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

    // ⚠️ CRITICAL: Capture user BEFORE async job (before response is sent)
    const user = (req as any).user;
    console.log('📌 User captured at request start:', { hasUser: !!user, userId: user?._id?.toString?.() || 'none', userEmail: user?.email });

    // Kick off async work (best-effort, no persistent queue)
    ;(async () => {
      console.log('🚀 Starting async job:', jobId, 'for user:', user?._id?.toString?.());
      jobsStore[jobId].status = 'running';
  // For pasted text, treat as a single chunk, not folder-like
  const isFolderLike = uploadMeta && (uploadMeta as any).ext === 'zip' || (uploadMeta as any).mime === 'application/zip';
      const preferGemini = Boolean(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY);
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

      // NOTE: QA removed - it was making redundant API calls (generateQuiz + generateAnswer for each Q)
      // Users can use the /api/qa endpoint directly for Q&A functionality

      if (tasks?.quiz) {
        tasksToRun.push((async () => {
          try {
            console.log('🎯 Quiz generation starting, text length:', fullText.length);
            const n = Number(tasks.quiz.numQuestions) || 8;
            const q = await generateQuiz(fullText, Math.min(50, Math.max(0, n)), { forceGemini: !!isFolderLike || forceGemini });
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
            const fc = await generateFlashcards(fullText, Math.min(100, Math.max(0, n)), { forceGemini: !!isFolderLike || forceGemini });
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
      console.log('📊 Results detail:', { 
        hasSummary: !!results.summary, 
        summaryLength: typeof results.summary === 'string' ? results.summary.length : 'N/A',
        hasQuiz: !!results.quiz,
        quizLength: Array.isArray(results.quiz) ? results.quiz.length : 'N/A',
        hasFlashcards: !!results.flashcards,
        flashcardsLength: Array.isArray(results.flashcards) ? results.flashcards.length : 'N/A'
      });

      // Create a single UploadedDocument with Summary, Quiz, and Flashcard references
      if (user && user._id) {
        try {
          let summaryId: any = null;
          let quizId: any = null;
          let flashcardsId: any = null;

          // Create Summary record - ONLY if we have content
          if (results.summary && typeof results.summary === 'string' && results.summary.trim()) {
            console.log('📝 Creating summary with content length:', results.summary.length);
            const summaryDoc = await Summary.create({
              content: results.summary.trim(),
              wordCount: results.summary.split(/\s+/).filter((w: string) => w.length > 0).length,
            });
            summaryId = summaryDoc._id;
            console.log('✅ Summary created:', summaryId);
          } else {
            console.log('⚠️ Skipping summary - no content or empty');
          }

          // Create Quiz record - ONLY if we have questions
          if (Array.isArray(results.quiz) && results.quiz.length > 0) {
            console.log('📋 Creating quiz with', results.quiz.length, 'questions');
            const quizDoc = await Quiz.create({
              questions: results.quiz.map((q: any) => ({
                question: String(q.question || q.prompt || '').trim(),
                options: Array.isArray(q.options) ? q.options : [],
                answer: String(q.answer || '').trim(),
                explanation: String(q.explanation || '').trim(),
              })),
            });
            quizId = quizDoc._id;
            console.log('✅ Quiz created:', quizId);
          } else {
            console.log('⚠️ Skipping quiz - no questions or empty');
          }

          // Create Flashcard record - ONLY if we have cards
          if (Array.isArray(results.flashcards) && results.flashcards.length > 0) {
            console.log('📇 Creating flashcards with', results.flashcards.length, 'cards');
            const flashcardsDoc = await Flashcard.create({
              cards: results.flashcards.map((fc: any) => {
                // Handle both object and string formats
                if (typeof fc === 'string') {
                  // Parse "Term: Definition" format
                  const [front, back] = fc.split(':').map((s: string) => s.trim());
                  return { front: front || '', back: back || '' };
                }
                // Handle object format
                return {
                  front: String(fc.front || fc.question || fc.term || '').trim(),
                  back: String(fc.back || fc.answer || fc.definition || '').trim(),
                };
              }).filter((card: any) => card.front || card.back), // Only keep non-empty cards
            });
            flashcardsId = flashcardsDoc._id;
            console.log('✅ Flashcards created:', flashcardsId);
          } else {
            console.log('⚠️ Skipping flashcards - no cards or empty');
          }

          // Only create UploadedDocument if we have at least ONE result
          if (summaryId || quizId || flashcardsId) {
            const uploadedDoc = await UploadedDocument.create({
              userId: user._id,
              filename: uploadMeta?.filename || 'Uploaded Document',
              originalText: fullText,
              fileSize: uploadMeta?.size || 0,
              fileType: uploadMeta?.ext || 'unknown',
              summary: summaryId || undefined,
              quiz: quizId || undefined,
              flashcards: flashcardsId || undefined,
            });

            console.log('✅ UploadedDocument created:', uploadedDoc._id, 'with refs:', { summaryId, quizId, flashcardsId });
          } else {
            console.log('⚠️ Skipping UploadedDocument - no results generated');
          }
        } catch (e: any) {
          console.error('Failed to create UploadedDocument:', (e as any)?.message || e);
        }
      }
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
