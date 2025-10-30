import express, { Request, Response } from 'express'
import { UsageEvent } from '../models/UsageEvent'

const router = express.Router()

// Public endpoint to log guest usage to the backend terminal (debug/dev only)
router.post('/guest-usage', (req: Request, res: Response) => {
  try {
    const { feature, used } = req.body as { feature?: string; used?: number }
    // Persist guest usage event for server-side counting
    const ip = (req.ip || (req.headers['x-forwarded-for'] as string) || '').toString()
    if (feature) {
      const ev = new UsageEvent({ ip, feature })
      ev.save().catch(e => console.error('Failed to persist UsageEvent:', e))
    }
    // Also log to console for dev convenience
    // eslint-disable-next-line no-console
    console.log(`GUEST_USAGE feature:${feature} used:${used} ip:${ip} time:${new Date().toISOString()}`)
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to log guest usage' })
  }
})

export default router
