import express from 'express'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const router = express.Router()

// Text extraction utilities - basic implementation
// For production, consider adding pdf-parse and mammoth dependencies

// Configuration
const CHUNK_SIZE_CHARS = parseInt(process.env.CHUNK_SIZE_CHARS || '2600')
const CHUNK_OVERLAP_CHARS = parseInt(process.env.CHUNK_OVERLAP_CHARS || '200')
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'temp-uploads')

// In-memory job store
const jobs = new Map<string, {
  status: 'queued' | 'extracting' | 'chunking' | 'map_reduce' | 'completed' | 'failed'
  stages: Array<{ name: string; timestamp: Date }>
  result?: { summary?: string }
  error?: string
}>()

// Basic text extraction function
async function extractText(filePath: string, mimeType: string): Promise<string> {
  const fileBuffer = await fs.promises.readFile(filePath)
  
  let text = ''
  
  if (mimeType.includes('text/plain') || path.extname(filePath).toLowerCase() === '.txt') {
    // TXT files - UTF-8 read
    text = fileBuffer.toString('utf-8')
  } else if (mimeType.includes('application/pdf') || path.extname(filePath).toLowerCase() === '.pdf') {
    // PDF files - basic implementation (for demo purposes)
    // In production, use pdf-parse: const pdfData = await pdfParse(fileBuffer); text = pdfData.text
    throw new Error('PDF support requires pdf-parse dependency. Please upload TXT files for now.')
  } else if (mimeType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || 
             path.extname(filePath).toLowerCase() === '.docx') {
    // DOCX files - basic implementation (for demo purposes)
    // In production, use mammoth: const result = await mammoth.extractRawText({ buffer: fileBuffer }); text = result.value
    throw new Error('DOCX support requires mammoth dependency. Please upload TXT files for now.')
  } else if (mimeType.includes('application/msword') || path.extname(filePath).toLowerCase() === '.doc') {
    // Legacy DOC files
    throw new Error('Legacy DOC files not supported. Please convert to TXT or DOCX.')
  } else {
    throw new Error('Unsupported file type. Please upload TXT files for now.')
  }
  
  // Normalize text
  text = normalizeText(text)
  
  if (text.trim().length < 10) {
    throw new Error('No extractable text found in file')
  }
  
  return text
}

function normalizeText(text: string): string {
  return text
    // Convert CRLF to LF
    .replace(/\r\n/g, '\n')
    // Collapse >2 line breaks to 2
    .replace(/\n{3,}/g, '\n\n')
    // Collapse multiple spaces
    .replace(/[ \t]+/g, ' ')
    // Drop control chars except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

// Chunking function
function chunkText(text: string): string[] {
  const chunks: string[] = []
  let i = 0
  
  while (i < text.length) {
    const end = Math.min(i + CHUNK_SIZE_CHARS, text.length)
    chunks.push(text.slice(i, end))
    i += CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS
    
    if (i >= text.length) break
  }
  
  return chunks
}

// Import summarization function from hf service
import { summarizeText } from '../services/hf'

// Map-reduce summarization
async function mapReduceSummarize(chunks: string[]): Promise<string> {
  console.log(`Starting map phase with ${chunks.length} chunks`)
  
  // Map phase: summarize each chunk
  const chunkSummaries: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    try {
      console.log(`Processing chunk ${i + 1}/${chunks.length}`)
      const summary = await summarizeText(chunks[i], { forceGemini: true })
      chunkSummaries.push(summary)
    } catch (error) {
      console.warn(`Failed to summarize chunk ${i}:`, error)
      // Continue with other chunks
    }
  }
  
  if (chunkSummaries.length === 0) {
    throw new Error('Failed to summarize any chunks')
  }
  
  // Reduce phase: combine all chunk summaries
  console.log(`Reduce phase: combining ${chunkSummaries.length} chunk summaries`)
  const combinedSummaries = chunkSummaries.join('\n\n')
  
  try {
    const finalSummary = await summarizeText(combinedSummaries, { forceGemini: true })
    return finalSummary
  } catch (error) {
    console.error('Reduce phase failed:', error)
    // Fallback: return first few sentences from chunk summaries
    return chunkSummaries.slice(0, 3).join(' ').slice(0, 500) + '...'
  }
}

// Async worker function
async function processJob(jobId: string, filePath: string, mimeType: string) {
  const job = jobs.get(jobId)
  if (!job) return
  
  try {
    // Stage 1: Extracting
    job.status = 'extracting'
    job.stages.push({ name: 'extracting', timestamp: new Date() })
    console.log(`Job ${jobId}: Extracting text from ${filePath}`)
    
    const text = await extractText(filePath, mimeType)
    
    // Stage 2: Chunking
    job.status = 'chunking'
    job.stages.push({ name: 'chunking', timestamp: new Date() })
    console.log(`Job ${jobId}: Chunking ${text.length} characters`)
    
    const chunks = chunkText(text)
    console.log(`Job ${jobId}: Created ${chunks.length} chunks`)
    
    // Stage 3: Map-reduce summarization
    job.status = 'map_reduce'
    job.stages.push({ name: 'map_reduce', timestamp: new Date() })
    console.log(`Job ${jobId}: Starting map-reduce summarization`)
    
    const summary = await mapReduceSummarize(chunks)
    
    // Stage 4: Completed
    job.status = 'completed'
    job.stages.push({ name: 'completed', timestamp: new Date() })
    job.result = { summary }
    console.log(`Job ${jobId}: Completed successfully`)
    
  } catch (error: any) {
    console.error(`Job ${jobId} failed:`, error)
    job.status = 'failed'
    job.error = error.message || 'Processing failed'
  }
}

// POST /api/analyze - Start analysis job
router.post('/analyze', async (req, res) => {
  try {
    const { jobId, tasks } = req.body
    
    if (!jobId) {
      return res.status(400).json({ error: 'Missing jobId' })
    }
    
    if (!tasks || !tasks.includes('summary')) {
      return res.status(400).json({ error: 'Invalid tasks. Only "summary" is supported.' })
    }
    
    // Check if file exists
    const jobDir = path.join(UPLOAD_DIR, jobId)
    if (!fs.existsSync(jobDir)) {
      return res.status(404).json({ error: 'Job not found' })
    }
    
    // Find the uploaded file
    const files = fs.readdirSync(jobDir)
    if (files.length === 0) {
      return res.status(404).json({ error: 'No file found for job' })
    }
    
    const fileName = files[0]
    const filePath = path.join(jobDir, fileName)
    const stats = fs.statSync(filePath)
    
    // Determine mime type from file extension
    const ext = path.extname(fileName).toLowerCase()
    let mimeType = 'application/octet-stream'
    if (ext === '.txt') mimeType = 'text/plain'
    else if (ext === '.pdf') mimeType = 'application/pdf'
    else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    else if (ext === '.doc') mimeType = 'application/msword'
    
    // Initialize job
    const job = {
      status: 'queued' as const,
      stages: [{ name: 'queued', timestamp: new Date() }],
      result: undefined,
      error: undefined
    }
    
    jobs.set(jobId, job)
    
    // Start async processing
    setImmediate(() => processJob(jobId, filePath, mimeType))
    
    res.json({ jobId, status: 'queued' })
    
  } catch (error: any) {
    console.error('Analyze error:', error)
    res.status(500).json({ error: error.message || 'Analysis failed' })
  }
})

// GET /api/analyze/:jobId - Get job status
router.get('/analyze/:jobId', (req, res) => {
  const { jobId } = req.params
  const job = jobs.get(jobId)
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }
  
  res.json({
    jobId,
    status: job.status,
    stages: job.stages,
    result: job.result,
    error: job.error
  })
})

export default router