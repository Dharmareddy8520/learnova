import express, { Request, Response } from 'express'
import { PersonalCard } from '../models/PersonalCard'
import { generateFlashcards, generateQuiz, summarizeText } from '../services/hf'

const router = express.Router()

// GET /api/cards - get all personal cards for logged-in user
router.get('/', async (req: Request, res: Response) => {
  try {
    const user: any = req.user
    console.log('📌 GET /api/cards called')
    console.log('   user:', { userId: user?._id?.toString?.() || 'NONE', email: user?.email || 'NONE', authenticated: !!user });
    
    if (!user || !user._id) {
      console.log('⚠️  User not authenticated');
      return res.status(401).json({ error: 'Not authenticated' })
    }

    console.log('🔍 Searching PersonalCard with userId:', user._id.toString());
    const cards = await PersonalCard.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(100)
    
    console.log('✅ Found', cards.length, 'PersonalCards');
    res.json({ cards })
  } catch (err: any) {
    console.error('❌ Get cards error:', err)
    res.status(500).json({ error: 'Failed to fetch cards' })
  }
})

// GET /api/cards/:id - get single card
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user: any = req.user
    if (!user || !user._id) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const card = await PersonalCard.findOne({ _id: req.params.id, userId: user._id })
    if (!card) {
      return res.status(404).json({ error: 'Card not found' })
    }

    res.json({ card })
  } catch (err: any) {
    console.error('Get card error:', err)
    res.status(500).json({ error: 'Failed to fetch card' })
  }
})

// PATCH /api/cards/:id/update - update card content (regenerate summary/quiz/flashcards)
router.patch('/:id/update', async (req: Request, res: Response) => {
  try {
    const user: any = req.user
    if (!user || !user._id) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { field, value } = req.body // field: 'summaryLength' | 'quizCount' | 'flashcardCount', value: number
    if (!field || typeof value !== 'number') {
      return res.status(400).json({ error: 'Invalid field or value' })
    }

    const card = await PersonalCard.findOne({ _id: req.params.id, userId: user._id })
    if (!card) {
      return res.status(404).json({ error: 'Card not found' })
    }

    const originalText = card.metadata?.originalText
    if (!originalText) {
      return res.status(400).json({ error: 'Original text not found, cannot regenerate' })
    }

    console.log(`🔄 Regenerating ${field} for card ${req.params.id}, new value: ${value}`);

    // Ensure metadata exists
    if (!card.metadata) card.metadata = {};

    // Regenerate based on field
    if (field === 'summaryLength') {
      const newSummary = await summarizeText(originalText, { desiredWords: value })
      card.content.summary = newSummary
      card.metadata.summaryLength = newSummary?.split(/\s+/).length || 0
    } else if (field === 'quizCount') {
      const newQuiz = await generateQuiz(originalText, Math.min(25, Math.max(1, value)))
      card.content.quiz = newQuiz
      card.metadata.quizCount = Array.isArray(newQuiz) ? newQuiz.length : 0
    } else if (field === 'flashcardCount') {
      const newFlashcards = await generateFlashcards(originalText, Math.min(50, Math.max(1, value)))
      card.content.flashcards = newFlashcards
      card.metadata.flashcardCount = Array.isArray(newFlashcards) ? newFlashcards.length : 0
    } else {
      return res.status(400).json({ error: 'Invalid field' })
    }

    await card.save()
    console.log(`✅ Card regenerated successfully for ${field}`);
    res.json({ card })
  } catch (err: any) {
    console.error('Update card error:', err)
    res.status(500).json({ error: err?.message || 'Failed to update card' })
  }
})

// DELETE /api/cards/:id - delete card
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user: any = req.user
    if (!user || !user._id) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const result = await PersonalCard.deleteOne({ _id: req.params.id, userId: user._id })
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Card not found' })
    }

    res.json({ success: true })
  } catch (err: any) {
    console.error('Delete card error:', err)
    res.status(500).json({ error: 'Failed to delete card' })
  }
})

export default router
