import express from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Get current user info
router.get('/me', async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        consecutiveDays: user.consecutiveDays,
        startedAt: user.startedAt,
        lastActiveAt: user.lastActiveAt
      },
      progressSummary: {
        totalDays: Math.floor((Date.now() - new Date(user.startedAt).getTime()) / (1000 * 60 * 60 * 24)),
        consecutiveDays: user.consecutiveDays,
        documentsCount: 0, // Will be implemented in later steps
        flashcardsStudied: 0 // Will be implemented in later steps
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

// Update user preferences
router.put('/preferences', async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // For now, just return success - preferences will be implemented later
    res.json({ success: true, message: 'Preferences updated' });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
