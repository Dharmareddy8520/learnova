import express, { Request, Response } from 'express';

const router = express.Router();

// Get current user info
router.get('/me', async (req: Request, res: Response) => {
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
router.put('/preferences', async (req: Request, res: Response) => {
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

// Update user profile except name and email
router.put('/update', async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { avatarUrl, timezone, studyGoalPerDay, theme, notifyReminders, notifyProduct } = req.body;

    // Update user fields except name and email
    user.avatarUrl = avatarUrl || user.avatarUrl;
    user.timezone = timezone || user.timezone;
    user.studyGoalPerDay = studyGoalPerDay || user.studyGoalPerDay;
    user.theme = theme || user.theme;
    user.notifyReminders = notifyReminders !== undefined ? notifyReminders : user.notifyReminders;
    user.notifyProduct = notifyProduct !== undefined ? notifyProduct : user.notifyProduct;

    // Save the updated user
    await user.save();

    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

export default router;
