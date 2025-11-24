import express, { Request, Response } from 'express';
import SavedContent from '../models/SavedContent';
import { UsageEvent } from '../models/UsageEvent';

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
    
    // Count saved content by type
    const documentsCount = await SavedContent.countDocuments({ 
      userId: user._id, 
      type: 'summary' 
    });
    
    const flashcardsCount = await SavedContent.countDocuments({ 
      userId: user._id, 
      type: 'flashcard' 
    });
    
    const quizzesCount = await SavedContent.countDocuments({ 
      userId: user._id, 
      type: 'quiz' 
    });
    
    res.json({
      recentDocs: [], // Will be implemented in later steps
      progressData: {
        consecutiveDays,
        totalDays: Math.floor((Date.now() - new Date(user.startedAt).getTime()) / (1000 * 60 * 60 * 24)),
        documentsCount,
        flashcardsStudied: flashcardsCount,
        quizzesCompleted: quizzesCount
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
