import { Router, Request, Response } from 'express';
import SavedContent, { ISavedContent } from '../models/SavedContent';

const router = Router();

/**
 * POST /api/saved-content
 * Create a new saved content item (summary, quiz, flashcard, or Q&A)
 * 
 * Body: {
 *   title: string (required)
 *   description?: string
 *   type: 'summary' | 'quiz' | 'flashcard' | 'qa' (required)
 *   content: any (required)
 *   metadata?: { originalFileName?, wordCount?, itemCount?, tags? }
 * }
 */
router.post('/saved-content', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Check authentication
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { title, description, type, content, metadata } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!type || !['summary', 'quiz', 'flashcard', 'qa'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be summary, quiz, flashcard, or qa' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Create new saved content
    const savedContent = new SavedContent({
      userId: user._id,
      title: title.trim(),
      description: description?.trim(),
      type,
      content,
      metadata: metadata || {},
    });

    await savedContent.save();

    return res.status(201).json({
      message: 'Content saved successfully',
      data: savedContent,
    });
  } catch (error: any) {
    console.error('Error saving content:', error);
    return res.status(500).json({ error: error.message || 'Failed to save content' });
  }
});

/**
 * GET /api/saved-content
 * Retrieve all saved content for the authenticated user
 * 
 * Query params:
 *   type?: 'summary' | 'quiz' | 'flashcard' (filter by type)
 *   search?: string (search in title/description)
 *   limit?: number (default 50)
 *   skip?: number (for pagination)
 *   sort?: 'createdAt' | 'updatedAt' | 'title' (default: -createdAt)
 */
router.get('/saved-content', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { type, search, limit = '50', skip = '0', sort = '-createdAt' } = req.query;

    // Build query
    const query: any = { userId: user._id };

    if (type && ['summary', 'quiz', 'flashcard'].includes(type as string)) {
      query.type = type;
    }

    if (search && typeof search === 'string') {
      // Text search on title and description
      query.$text = { $search: search };
    }

    // Execute query
    const savedContents = await SavedContent.find(query)
      .sort(sort as string)
      .limit(parseInt(limit as string, 10))
      .skip(parseInt(skip as string, 10))
      .lean();

    // Get total count for pagination
    const total = await SavedContent.countDocuments(query);

    return res.json({
      data: savedContents,
      total,
      limit: parseInt(limit as string, 10),
      skip: parseInt(skip as string, 10),
    });
  } catch (error: any) {
    console.error('Error fetching saved content:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch content' });
  }
});

/**
 * GET /api/saved-content/:id
 * Retrieve a specific saved content item by ID
 */
router.get('/saved-content/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    const savedContent = await SavedContent.findOne({
      _id: id,
      userId: user._id, // Ensure user owns this content
    });

    if (!savedContent) {
      return res.status(404).json({ error: 'Content not found' });
    }

    return res.json({ data: savedContent });
  } catch (error: any) {
    console.error('Error fetching saved content:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch content' });
  }
});

/**
 * PUT /api/saved-content/:id
 * Update a saved content item
 * 
 * Body: {
 *   title?: string
 *   description?: string
 *   content?: any
 *   metadata?: object
 * }
 */
router.put('/saved-content/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { title, description, content, metadata } = req.body;

    // Build update object (only include provided fields)
    const updates: any = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim();
    if (content !== undefined) updates.content = content;
    if (metadata !== undefined) updates.metadata = metadata;

    const savedContent = await SavedContent.findOneAndUpdate(
      { _id: id, userId: user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!savedContent) {
      return res.status(404).json({ error: 'Content not found' });
    }

    return res.json({
      message: 'Content updated successfully',
      data: savedContent,
    });
  } catch (error: any) {
    console.error('Error updating content:', error);
    return res.status(500).json({ error: error.message || 'Failed to update content' });
  }
});

/**
 * DELETE /api/saved-content/:id
 * Delete a saved content item
 */
router.delete('/saved-content/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    const savedContent = await SavedContent.findOneAndDelete({
      _id: id,
      userId: user._id,
    });

    if (!savedContent) {
      return res.status(404).json({ error: 'Content not found' });
    }

    return res.json({
      message: 'Content deleted successfully',
      data: savedContent,
    });
  } catch (error: any) {
    console.error('Error deleting content:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete content' });
  }
});

/**
 * GET /api/saved-content/stats
 * Get statistics about saved content (counts by type, total, etc.)
 */
router.get('/saved-content-stats', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const stats = await SavedContent.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await SavedContent.countDocuments({ userId: user._id });

    const statsByType = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {} as Record<string, number>);

    return res.json({
      total,
      summary: statsByType.summary || 0,
      quiz: statsByType.quiz || 0,
      flashcard: statsByType.flashcard || 0,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
});

export default router;
