import express, { Request, Response } from 'express';

const router = express.Router();

// Get current user info
router.get('/me', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    // Include usage for today if present (daily reset handled by model)
    const usage = (user as any).usage || {}
    const usageDate = (user as any).usageDate || null

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        consecutiveDays: user.consecutiveDays,
        startedAt: user.startedAt,
        lastActiveAt: user.lastActiveAt,
        usage,
        usageDate
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

// Increment usage for a feature (logged-in users)
router.post('/usage', async (req: Request, res: Response) => {
  try {
    const user: any = req.user
    if (!user) return res.status(401).json({ error: 'Not authenticated' })

    const { feature } = req.body as { feature?: string }
    if (!feature) return res.status(400).json({ error: 'Missing feature' })

    if (typeof user.incrementUsage !== 'function') {
      return res.status(500).json({ error: 'Usage increment not supported on user model' })
    }

  const result = await user.incrementUsage(feature)

  // Log increment server-side
  console.log(`POST /api/user/usage - user:${user._id} feature:${feature} used:${result.used} usageDate:${result.usageDate}`)

    // decide limit for the role
    const FREE_TIER_LIMIT = Number(process.env.FREE_TIER_LIMIT ?? '5')
    const PREMIUM_TIER_LIMIT = Number(process.env.PREMIUM_TIER_LIMIT ?? '-1')
    const limit = user.role === 'premium' ? PREMIUM_TIER_LIMIT : FREE_TIER_LIMIT

    return res.json({ feature, used: result.used, usage: result.usage, usageDate: result.usageDate, limit })
  } catch (err: any) {
    console.error('Increment usage error:', err)
    return res.status(500).json({ error: 'Failed to increment usage' })
  }
})

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

export default router;
