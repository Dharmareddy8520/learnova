import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const router = express.Router()

// Configuration from env with sane defaults
const UPLOAD_MAX_MB = parseInt(process.env.UPLOAD_MAX_MB || '50')
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'temp-uploads')

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const jobId = crypto.randomUUID()
    const jobDir = path.join(UPLOAD_DIR, jobId)
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true })
    }
    // Store jobId in req for later use
    ;(req as any).jobId = jobId
    cb(null, jobDir)
  },
  filename: (req, file, cb) => {
    // Keep original filename
    cb(null, file.originalname)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: UPLOAD_MAX_MB * 1024 * 1024 // Convert MB to bytes
  },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.txt', '.pdf', '.doc', '.docx']
    const ext = path.extname(file.originalname).toLowerCase()
    
    if (allowedExts.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type. Allowed: ${allowedExts.join(', ')}`))
    }
  }
})

// POST /api/upload - Accept single file and return job info
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const jobId = (req as any).jobId
    const { originalname, mimetype, size } = req.file

    res.json({
      jobId,
      fileName: originalname,
      mimeType: mimetype,
      size
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    res.status(400).json({ error: error.message || 'Upload failed' })
  }
})

export default router