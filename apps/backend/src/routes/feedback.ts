import express from 'express';
import { Feedback } from '../models/Feedback';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// POST /api/feedback - Submit new feedback (public route)
router.post('/feedback', async (req, res) => {
  try {
    const { name, email, rating, review, isAnonymous } = req.body;

    // Validation
    if (!name || !email || !rating || !review) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, rating, and review are required' 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }

    if (review.length > 500) {
      return res.status(400).json({ 
        error: 'Review must be 500 characters or less' 
      });
    }

    // Create feedback entry
    const feedback = new Feedback({
      name: isAnonymous ? 'Anonymous' : name,
      email,
      rating,
      review,
      userId: req.user?._id || null,
      isAnonymous: isAnonymous || false
    });

    await feedback.save();

    res.status(201).json({ 
      success: true,
      message: 'Thank you for your feedback!',
      feedback: {
        _id: feedback._id,
        rating: feedback.rating,
        createdAt: feedback.createdAt
      }
    });
  } catch (error: any) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ 
      error: 'Failed to submit feedback',
      details: error.message 
    });
  }
});

// GET /api/feedback/all - Get all feedback (protected, admin only)
router.get('/feedback/all', isAuthenticated, async (req, res) => {
  try {
    // Check if user is admin (you can add admin role check here)
    // For now, any authenticated user can access
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const feedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Feedback.countDocuments();

    // Calculate statistics
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          fourStars: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          threeStars: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          twoStars: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      feedbacks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      statistics: stats.length > 0 ? stats[0] : {
        averageRating: 0,
        totalReviews: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ 
      error: 'Failed to fetch feedback',
      details: error.message 
    });
  }
});

// GET /api/feedback/stats - Get feedback statistics (public)
router.get('/feedback/stats', async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      statistics: stats.length > 0 ? {
        averageRating: Math.round(stats[0].averageRating * 10) / 10,
        totalReviews: stats[0].totalReviews
      } : {
        averageRating: 0,
        totalReviews: 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      details: error.message 
    });
  }
});

// GET /api/feedback/recent - Get recent public feedback (for display on landing page)
router.get('/feedback/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 6;

    const feedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name rating review createdAt isAnonymous');

    res.json({
      success: true,
      feedbacks
    });
  } catch (error: any) {
    console.error('Error fetching recent feedback:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent feedback',
      details: error.message 
    });
  }
});

export default router;
