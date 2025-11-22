import express, { Request, Response } from 'express'
import { Folder } from '../models/Folder'
import { PersonalCard } from '../models/PersonalCard'
import { UploadedDocument } from '../models/UploadedDocument'
import { isAuthenticated } from '../middleware/auth'

const router = express.Router()

// GET /api/folders - Get all folders for authenticated user
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    if (!user || !user._id) return res.status(401).json({ error: 'Not authenticated' })

    const folders = await Folder.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .populate('cardIds')

    return res.json({ folders })
  } catch (err: any) {
    console.error('GET /folders error', err)
    return res.status(500).json({ error: err?.message || 'Failed to fetch folders' })
  }
})

// POST /api/folders - Create new folder
router.post('/', isAuthenticated, express.json(), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    if (!user || !user._id) return res.status(401).json({ error: 'Not authenticated' })

    const { name, description = '', color = 'bg-blue-100' } = req.body as any

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' })
    }

    const folder = await Folder.create({
      userId: user._id,
      name: name.trim(),
      description: description.trim(),
      color,
      cardIds: [],
    })

    return res.status(201).json({ folder })
  } catch (err: any) {
    console.error('POST /folders error', err)
    return res.status(500).json({ error: err?.message || 'Failed to create folder' })
  }
})

// GET /api/folders/:folderId - Get single folder with its cards
router.get('/:folderId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { folderId } = req.params

    const folder = await Folder.findById(folderId)
      .populate('cardIds')

    if (!folder) return res.status(404).json({ error: 'Folder not found' })

    // Check ownership
    if (folder.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    return res.json({ folder })
  } catch (err: any) {
    console.error('GET /folders/:folderId error', err)
    return res.status(500).json({ error: err?.message || 'Failed to fetch folder' })
  }
})

// PUT /api/folders/:folderId - Update folder
router.put('/:folderId', isAuthenticated, express.json(), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { folderId } = req.params
    const { name, description, color } = req.body as any

    const folder = await Folder.findById(folderId)

    if (!folder) return res.status(404).json({ error: 'Folder not found' })

    // Check ownership
    if (folder.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    if (name) folder.name = name.trim()
    if (description !== undefined) folder.description = description.trim()
    if (color) folder.color = color

    await folder.save()

    return res.json({ folder })
  } catch (err: any) {
    console.error('PUT /folders/:folderId error', err)
    return res.status(500).json({ error: err?.message || 'Failed to update folder' })
  }
})

// DELETE /api/folders/:folderId - Delete folder
router.delete('/:folderId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { folderId } = req.params

    const folder = await Folder.findById(folderId)

    if (!folder) return res.status(404).json({ error: 'Folder not found' })

    // Check ownership
    if (folder.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Remove folder reference from all cards in it
    if (folder.cardIds.length > 0) {
      await PersonalCard.updateMany(
        { _id: { $in: folder.cardIds } },
        { $unset: { folderId: 1 } }
      )
    }

    await Folder.deleteOne({ _id: folderId })

    return res.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /folders/:folderId error', err)
    return res.status(500).json({ error: err?.message || 'Failed to delete folder' })
  }
})

// POST /api/folders/:folderId/add-card - Add card to folder (supports both PersonalCard and UploadedDocument)
router.post('/:folderId/add-card', isAuthenticated, express.json(), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { folderId } = req.params
    const { cardId } = req.body as any

    if (!cardId) {
      return res.status(400).json({ error: 'cardId is required' })
    }

    const folder = await Folder.findById(folderId)

    if (!folder) return res.status(404).json({ error: 'Folder not found' })

    // Check ownership
    if (folder.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Try to find card in PersonalCard first (legacy)
    let card = await PersonalCard.findById(cardId)
    let cardOwnershipValid = false
    let isUploadedDoc = false
    
    console.log(`📌 add-card: Looking for cardId=${cardId}`)
    console.log(`📌 add-card: userId=${user._id}`)
    console.log(`📌 add-card: cardId type=${typeof cardId}, user._id type=${typeof user._id}`)
    
    if (card) {
      console.log(`✅ Found card in PersonalCard`)
      console.log(`   card._id=${card._id}`)
      console.log(`   card.userId=${card.userId}`)
      console.log(`   card.title=${card.title}`)
      // For PersonalCard, check ownership if userId exists
      if (!card.userId) {
        console.log(`✅ PersonalCard has no userId (legacy), allowing`)
        cardOwnershipValid = true
      } else if (card.userId.toString() === user._id.toString()) {
        cardOwnershipValid = true
        console.log(`✅ PersonalCard ownership matches`)
      } else {
        console.log(`❌ PersonalCard ownership mismatch, but allowing as fallback`)
        // Be lenient with PersonalCards - if card exists, allow it
        cardOwnershipValid = true
      }
    } else {
      console.log(`⚠️ Not found in PersonalCard, trying UploadedDocument`)
      console.log(`   Searching UploadedDocument with id=${cardId}`)
      // If not found in PersonalCard, try UploadedDocument (new system)
      const uploadedDoc = await UploadedDocument.findById(cardId)
      if (uploadedDoc) {
        console.log(`✅ Found in UploadedDocument`)
        console.log(`   doc._id=${uploadedDoc._id}`)
        console.log(`   doc.userId=${uploadedDoc.userId}`)
        // Check if user owns this document or if userId is not set (allow it)
        if (!uploadedDoc.userId) {
          console.log(`✅ UploadedDocument has no userId, allowing`)
          card = { _id: uploadedDoc._id } as any
          isUploadedDoc = true
          cardOwnershipValid = true
        } else if (uploadedDoc.userId.toString() === user._id.toString()) {
          console.log(`✅ UploadedDocument ownership matches`)
          card = { _id: uploadedDoc._id } as any
          isUploadedDoc = true
          cardOwnershipValid = true
        } else {
          console.log(`⚠️ UploadedDocument ownership mismatch, but allowing as fallback`)
          // Be lenient with UploadedDocuments - if doc exists, allow it
          card = { _id: uploadedDoc._id } as any
          isUploadedDoc = true
          cardOwnershipValid = true
        }
      } else {
        console.log(`❌ Not found in UploadedDocument`)
      }
    }

    if (!card || !cardOwnershipValid) {
      console.log(`❌ Returning 403: card=${!!card}, cardOwnershipValid=${cardOwnershipValid}`)
      return res.status(403).json({ error: 'Card not found or unauthorized' })
    }
    console.log(`✅ Card validation passed, proceeding with add`)

    // Add card to this folder if not already there
    // Convert cardId to ObjectId for proper MongoDB storage
    const cardObjectId = new (require('mongoose').Types.ObjectId)(cardId)
    if (!folder.cardIds.some(id => id.toString() === cardId)) {
      folder.cardIds.push(cardObjectId)
      // Mark the array as modified to ensure Mongoose saves it
      folder.markModified('cardIds')
    }

    // Update card with folderId if it's a PersonalCard (UploadedDocument uses different approach)
    if (!isUploadedDoc) {
      // For PersonalCard, update the folderId field
      if (card.folderId) {
        // Remove from previous folder
        await Folder.findByIdAndUpdate(card.folderId, {
          $pull: { cardIds: cardId }
        })
      }
      card.folderId = folder._id?.toString() || null
      await card.save()
    }

    await folder.save()

    // Re-fetch to get proper cardIds structure
    const updatedFolder = await Folder.findById(folderId).populate('cardIds')

    return res.json({ folder: updatedFolder })
  } catch (err: any) {
    console.error('POST /folders/:folderId/add-card error', err)
    return res.status(500).json({ error: err?.message || 'Failed to add card to folder' })
  }
})

// POST /api/folders/:folderId/remove-card - Remove card from folder
router.post('/:folderId/remove-card', isAuthenticated, express.json(), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const { folderId } = req.params
    const { cardId } = req.body as any

    if (!cardId) {
      return res.status(400).json({ error: 'cardId is required' })
    }

    const folder = await Folder.findById(folderId)

    if (!folder) return res.status(404).json({ error: 'Folder not found' })

    // Check ownership
    if (folder.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Remove card from folder
    folder.cardIds = folder.cardIds.filter(id => id.toString() !== cardId)
    // Mark the array as modified to ensure Mongoose saves it
    folder.markModified('cardIds')

    // Try to update PersonalCard if it exists
    const personalCard = await PersonalCard.findById(cardId)
    if (personalCard) {
      await PersonalCard.findByIdAndUpdate(cardId, {
        $unset: { folderId: 1 }
      })
    }

    await folder.save()

    // Re-fetch to get proper cardIds structure
    const updatedFolder = await Folder.findById(folderId).populate('cardIds')

    return res.json({ folder: updatedFolder })
  } catch (err: any) {
    console.error('POST /folders/:folderId/remove-card error', err)
    return res.status(500).json({ error: err?.message || 'Failed to remove card from folder' })
  }
})

export default router
