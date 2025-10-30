import express, { Request, Response } from 'express'

const router = express.Router()

// Public endpoint to log guest usage to the backend terminal (debug/dev only)
router.post('/guest-usage', (req: Request, res: Response) => {
  try {
    const { feature, used } = req.body as { feature?: string; used?: number }
    // eslint-disable-next-line no-console
    console.log(`GUEST_USAGE feature:${feature} used:${used} time:${new Date().toISOString()}`)
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to log guest usage' })
  }
})

export default router
