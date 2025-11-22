import express, { Request, Response } from 'express';
import { PersonalCard } from '../models/PersonalCard';
import { UploadedDocument } from '../models/UploadedDocument';

const router = express.Router();

// Get dashboard data
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Update consecutive days
    const consecutiveDays = await user.calculateConsecutiveDays();
    
    // Get counts from both PersonalCard (legacy) and UploadedDocument (new) collections
    const personalCardDocuments = await PersonalCard.countDocuments({
      userId: user._id,
      type: 'upload'
    });
    
    const uploadedDocuments = await UploadedDocument.countDocuments({
      userId: user._id
    });
    
    const documentsCount = personalCardDocuments + uploadedDocuments;
    
    // Count documents with flashcards
    const personalCardFlashcards = await PersonalCard.countDocuments({
      userId: user._id,
      type: 'flashcards'
    });
    
    const uploadedDocumentFlashcards = await UploadedDocument.countDocuments({
      userId: user._id,
      flashcards: { $ne: null }
    });
    
    const flashcardsStudied = personalCardFlashcards + uploadedDocumentFlashcards;
    
    // Count documents with quizzes
    const personalCardQuizzes = await PersonalCard.countDocuments({
      userId: user._id,
      type: 'quiz'
    });
    
    const uploadedDocumentQuizzes = await UploadedDocument.countDocuments({
      userId: user._id,
      quiz: { $ne: null }
    });
    
    const quizzesCompleted = personalCardQuizzes + uploadedDocumentQuizzes;
    
    res.json({
      recentDocs: [], // Will be implemented in later steps
      progressData: {
        consecutiveDays,
        totalDays: Math.floor((Date.now() - new Date(user.startedAt).getTime()) / (1000 * 60 * 60 * 24)),
        documentsCount,
        flashcardsStudied,
        quizzesCompleted
      },
      consecutiveDays,
      recommendations: [
        'Try uploading your first document to get started!',
        'Use the quick paste feature to summarize text instantly',
        'Check out our premium features for advanced AI processing'
      ]
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

export default router;
