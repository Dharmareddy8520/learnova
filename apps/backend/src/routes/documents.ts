import express, { Request, Response } from 'express'
import { UploadedDocument, Summary, Quiz, Flashcard, IUploadedDocument, ISummary, IQuiz, IFlashcard } from '../models/UploadedDocument'
import { generateFlashcards, generateQuiz, summarizeText } from '../services/hf'

const router = express.Router()

// GET /api/documents - Get all uploaded documents for the user
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    console.log('📌 GET /api/documents called')
    console.log('   user:', { userId: user?._id?.toString?.() || 'NONE', email: user?.email || 'NONE', authenticated: !!user });
    
    if (!user || !user._id) {
      console.log('⚠️  User not authenticated');
      return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log('🔍 Searching UploadedDocument with userId:', user._id.toString());
    const documents = await UploadedDocument.find({ userId: user._id })
      .populate('summary')
      .populate('quiz')
      .populate('flashcards')
      .sort({ createdAt: -1 })

    console.log('✅ Found', documents.length, 'UploadedDocuments');

    // Map to PersonalCard format for frontend compatibility
    const cards = documents.map((doc) => {
      const summary = doc.summary as unknown as ISummary | null
      const quiz = doc.quiz as unknown as IQuiz | null
      const flashcards = doc.flashcards as unknown as IFlashcard | null
      
      return {
        _id: doc._id,
        title: doc.filename,
        type: 'upload',
        content: {
          summary: summary?.content || '',
          quiz: quiz?.questions || [],
          flashcards: flashcards?.cards || [],
          originalText: doc.originalText,
        },
        metadata: {
          fileSize: doc.fileSize,
          fileType: doc.fileType,
          summaryId: summary?._id,
          quizId: quiz?._id,
          flashcardsId: flashcards?._id,
          summaryLength: summary?.wordCount || summary?.content?.split(/\s+/).filter((w: string) => w.length > 0).length || 0,
          quizCount: quiz?.questions?.length || 0,
          flashcardCount: flashcards?.cards?.length || 0,
        },
        createdAt: doc.createdAt,
      }
    })

    res.json({ documents: cards })
  } catch (error: any) {
    console.error('❌ Failed to fetch documents:', error)
    res.status(500).json({ error: 'Failed to fetch documents' })
  }
})

// GET /api/documents/:docId - Get a specific uploaded document
router.get('/:docId', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { docId } = req.params

    if (!user || !user._id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const doc = await UploadedDocument.findById(docId)
      .populate('summary')
      .populate('quiz')
      .populate('flashcards')

    if (!doc || doc.userId.toString() !== user._id.toString()) {
      return res.status(404).json({ error: 'Document not found' })
    }

    const summary = doc.summary as unknown as ISummary | null
    const quiz = doc.quiz as unknown as IQuiz | null
    const flashcards = doc.flashcards as unknown as IFlashcard | null

    const card = {
      _id: doc._id,
      title: doc.filename,
      type: 'upload',
      content: {
        summary: summary?.content || '',
        quiz: quiz?.questions || [],
        flashcards: flashcards?.cards || [],
        originalText: doc.originalText,
      },
      metadata: {
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        summaryId: summary?._id,
        quizId: quiz?._id,
        flashcardsId: flashcards?._id,
        summaryLength: summary?.wordCount || summary?.content?.split(/\s+/).filter((w: string) => w.length > 0).length || 0,
        quizCount: quiz?.questions?.length || 0,
        flashcardCount: flashcards?.cards?.length || 0,
      },
      createdAt: doc.createdAt,
    }

    res.json(card)
  } catch (error: any) {
    console.error('Failed to fetch document:', error)
    res.status(500).json({ error: 'Failed to fetch document' })
  }
})

// DELETE /api/documents/:docId - Delete an uploaded document and its related data
router.delete('/:docId', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { docId } = req.params

    if (!user || !user._id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const doc = await UploadedDocument.findById(docId)

    if (!doc || doc.userId.toString() !== user._id.toString()) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Delete related data
    if (doc.summary) await Summary.findByIdAndDelete(doc.summary)
    if (doc.quiz) await Quiz.findByIdAndDelete(doc.quiz)
    if (doc.flashcards) await Flashcard.findByIdAndDelete(doc.flashcards)

    // Delete the document
    await UploadedDocument.findByIdAndDelete(docId)

    res.json({ message: 'Document deleted successfully' })
  } catch (error: any) {
    console.error('Failed to delete document:', error)
    res.status(500).json({ error: 'Failed to delete document' })
  }
})

// PUT /api/documents/:docId/summary - Update summary
router.put('/:docId/summary', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { docId } = req.params
    const { content } = req.body

    if (!user || !user._id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const doc = await UploadedDocument.findById(docId)

    if (!doc || doc.userId.toString() !== user._id.toString()) {
      return res.status(404).json({ error: 'Document not found' })
    }

    if (doc.summary) {
      await Summary.findByIdAndUpdate(doc.summary, {
        content,
        wordCount: content?.split(/\s+/).length || 0,
      })
    } else {
      const summary = await Summary.create({
        content,
        wordCount: content?.split(/\s+/).length || 0,
      })
      doc.summary = summary._id as any
      await doc.save()
    }

    res.json({ message: 'Summary updated' })
  } catch (error: any) {
    console.error('Failed to update summary:', error)
    res.status(500).json({ error: 'Failed to update summary' })
  }
})

// PUT /api/documents/:docId/quiz - Update quiz
router.put('/:docId/quiz', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { docId } = req.params
    const { questions } = req.body

    if (!user || !user._id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const doc = await UploadedDocument.findById(docId)

    if (!doc || doc.userId.toString() !== user._id.toString()) {
      return res.status(404).json({ error: 'Document not found' })
    }

    if (doc.quiz) {
      await Quiz.findByIdAndUpdate(doc.quiz, { questions })
    } else {
      const quiz = await Quiz.create({ questions })
      doc.quiz = quiz._id as any
      await doc.save()
    }

    res.json({ message: 'Quiz updated' })
  } catch (error: any) {
    console.error('Failed to update quiz:', error)
    res.status(500).json({ error: 'Failed to update quiz' })
  }
})

// PUT /api/documents/:docId/flashcards - Update flashcards
router.put('/:docId/flashcards', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { docId } = req.params
    let { cards } = req.body

    if (!user || !user._id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const doc = await UploadedDocument.findById(docId)

    if (!doc || doc.userId.toString() !== user._id.toString()) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Normalize flashcards format: if strings, convert to {front, back} objects
    if (Array.isArray(cards)) {
      cards = cards.map((card: any) => {
        if (typeof card === 'string') {
          // If it's a plain string, use it as both front and back
          return { front: card, back: card }
        }
        // If it's already an object with front/back, keep as is
        if (typeof card === 'object' && (card.front || card.question)) {
          return {
            front: card.front || card.question || '',
            back: card.back || card.definition || card.answer || '',
          }
        }
        return card
      }).filter((c: any) => c.front || c.back)
    }

    if (doc.flashcards) {
      await Flashcard.findByIdAndUpdate(doc.flashcards, { cards })
    } else {
      const flashcards = await Flashcard.create({ cards })
      doc.flashcards = flashcards._id as any
      await doc.save()
    }

    res.json({ message: 'Flashcards updated' })
  } catch (error: any) {
    console.error('Failed to update flashcards:', error)
    res.status(500).json({ error: 'Failed to update flashcards' })
  }
})

// PATCH /api/documents/:docId/regenerate - Regenerate content (summary/quiz/flashcards)
router.patch('/:docId/regenerate', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { docId } = req.params
    const { field, value } = req.body

    if (!user || !user._id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!field || typeof value !== 'number') {
      return res.status(400).json({ error: 'Invalid field or value' })
    }

    const doc = await UploadedDocument.findById(docId)
    if (!doc || doc.userId.toString() !== user._id.toString()) {
      return res.status(404).json({ error: 'Document not found' })
    }

    const originalText = doc.originalText
    if (!originalText) {
      return res.status(400).json({ error: 'Original text not found, cannot regenerate' })
    }

    console.log(`🔄 Regenerating ${field} for document ${docId}, value: ${value}`)

    // Regenerate based on field
    if (field === 'summaryLength') {
      const newSummaryContent = await summarizeText(originalText, { desiredWords: value })
      if (doc.summary) {
        await Summary.findByIdAndUpdate(doc.summary, {
          content: newSummaryContent,
          wordCount: newSummaryContent?.split(/\s+/).length || 0,
        })
      } else {
        const summary = await Summary.create({
          content: newSummaryContent,
          wordCount: newSummaryContent?.split(/\s+/).length || 0,
        })
        doc.summary = summary._id as any
        await doc.save()
      }
    } else if (field === 'quizCount') {
      const newQuizContent = await generateQuiz(originalText, Math.min(50, Math.max(0, value)))
      if (doc.quiz) {
        await Quiz.findByIdAndUpdate(doc.quiz, {
          questions: newQuizContent,
        })
      } else {
        const quiz = await Quiz.create({
          questions: newQuizContent,
        })
        doc.quiz = quiz._id as any
        await doc.save()
      }
    } else if (field === 'flashcardCount') {
      const newFlashcardsContent = await generateFlashcards(originalText, Math.min(100, Math.max(0, value)))
      
      // Normalize flashcards format
      const normalizedCards = Array.isArray(newFlashcardsContent)
        ? newFlashcardsContent.map((fc: any) => {
            if (typeof fc === 'string') {
              const [front, back] = fc.split(':').map((s: string) => s.trim())
              return { front: front || '', back: back || '' }
            }
            return {
              front: String(fc.front || fc.question || fc.term || '').trim(),
              back: String(fc.back || fc.answer || fc.definition || '').trim(),
            }
          }).filter((card: any) => card.front || card.back)
        : []
      
      if (doc.flashcards) {
        await Flashcard.findByIdAndUpdate(doc.flashcards, {
          cards: normalizedCards,
        })
      } else {
        const flashcards = await Flashcard.create({
          cards: normalizedCards,
        })
        doc.flashcards = flashcards._id as any
        await doc.save()
      }
    } else {
      return res.status(400).json({ error: 'Invalid field' })
    }

    console.log(`✅ Document regenerated successfully for ${field}`)
    res.json({ message: 'Content regenerated successfully' })
  } catch (error: any) {
    console.error(`❌ Failed to regenerate content:`, error)
    res.status(500).json({ error: error?.message || 'Failed to regenerate content' })
  }
})

export default router
