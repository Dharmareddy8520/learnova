import express from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Get dashboard data
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Update consecutive days
    const consecutiveDays = await user.calculateConsecutiveDays();
    
    res.json({
      recentDocs: [], // Will be implemented in later steps
      progressData: {
        consecutiveDays,
        totalDays: Math.floor((Date.now() - new Date(user.startedAt).getTime()) / (1000 * 60 * 60 * 24)),
        documentsCount: 0,
        flashcardsStudied: 0,
        quizzesCompleted: 0
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
