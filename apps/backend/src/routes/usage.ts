import express, { Request, Response } from 'express'
import { UsageEvent } from '../models/UsageEvent'
import { User } from '../models/User'

const router = express.Router()

function todayRange() {
  const start = new Date()
  start.setHours(0,0,0,0)
  const end = new Date()
  end.setHours(23,59,59,999)
  return { start, end }
}

function getLimitForRole(role?: string) {
  const guestLimit = Number(process.env.GUEST_LIMIT ?? '3')
  const freeLimit = Number(process.env.FREE_TIER_LIMIT ?? '5')
  const premiumLimit = Number(process.env.PREMIUM_TIER_LIMIT ?? '-1')
  if (!role) return guestLimit
  if (role === 'premium') return premiumLimit
  return freeLimit
}

// GET /api/usage
// Returns { role, usedToday, limit, perFeature }
router.get('/', async (req: Request, res: Response) => {
  try {
    const user: any = (req as any).user
    if (user) {
      // logged-in: read usage from user doc
      const usage = user.usage || {}
      const usageDate = user.usageDate || ''
      const todayStr = (() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      })()
      const perFeature: Record<string, number> = {}
      let usedToday = 0
      if (usageDate === todayStr && usage) {
        for (const k of Object.keys(usage)) {
          const n = Number(usage[k] || 0)
          perFeature[k] = n
          usedToday += n
        }
      }
      const limit = getLimitForRole(user.role)
      return res.json({ role: user.role || 'free', usedToday, limit, perFeature })
    }

    // guest: compute by IP via UsageEvent
    const ip = (req.ip || (req.headers['x-forwarded-for'] as string) || '').toString()
    const { start, end } = todayRange()
    const count = await UsageEvent.countDocuments({ ip, createdAt: { $gte: start, $lte: end } })
    const limit = getLimitForRole(undefined)
    return res.json({ role: 'guest', usedToday: count, limit })
  } catch (e) {
    console.error('GET /api/usage error:', e)
    return res.status(500).json({ error: 'Failed to get usage' })
  }
})

export default router
