import express, { Request, Response } from 'express'
import Stripe from 'stripe'
import dotenv from 'dotenv'
import { User } from '../models/User'

dotenv.config()

const router = express.Router()

const stripeSecret = process.env.STRIPE_SECRET_KEY || ''
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
const priceMonthly = process.env.STRIPE_PRICE_PREMIUM_MONTHLY || ''
const appBase = process.env.APP_BASE_URL || (process.env.FRONTEND_URL || '')

if (!stripeSecret) {
  console.warn('STRIPE_SECRET_KEY not configured. Billing endpoints will fail until set.')
}

// Use a Stripe API version compatible with installed Stripe types. Match the project's
// @stripe/stripe-node types which expect '2023-10-16'. If you intentionally need an
// older API version, update the types or change this string accordingly.
const stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' })

// Helper: require authenticated user middleware (assumes req.user exists via passport)
function requireAuth(req: Request, res: Response, next: Function) {
  if (!(req as any).user) return res.status(401).json({ error: 'Not authenticated' })
  next()
}

// POST /api/billing/create-checkout-session
router.post('/create-checkout-session', requireAuth, async (req: Request, res: Response) => {
  try {
    const user: any = (req as any).user
  if (!priceMonthly) return res.status(400).json({ error: 'Stripe price ID not configured. Please set STRIPE_PRICE_PREMIUM_MONTHLY to a price_xxx value from your Stripe Dashboard.' })

    // Ensure Stripe customer exists for this user
    let stripeCustomerId = user.stripeCustomerId
    if (!stripeCustomerId) {
      const cust = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() }
      })
      stripeCustomerId = cust.id
      // persist to user (best-effort)
      try { user.stripeCustomerId = stripeCustomerId; await user.save() } catch (e) { /* ignore */ }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceMonthly, quantity: 1 }],
      success_url: `${appBase}/account?billing=success`,
      cancel_url: `${appBase}/account?billing=cancel`,
      // include a reference to the user so the webhook can reliably identify them
      metadata: { userId: user._id.toString() },
      client_reference_id: user._id.toString(),
    })

    return res.json({ url: session.url })
  } catch (err: any) {
    console.error('create-checkout-session error:', err)
    return res.status(500).json({ error: err?.message || 'Failed to create checkout session' })
  }
})

// POST /api/billing/create-portal-session
router.post('/create-portal-session', requireAuth, async (req: Request, res: Response) => {
  try {
    const user: any = (req as any).user
    if (!user.stripeCustomerId) return res.status(400).json({ error: 'No Stripe customer associated with user' })
    const returnUrl = `${appBase}/account`
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    })
    return res.json({ url: session.url })
  } catch (err: any) {
    console.error('create-portal-session error:', err)
    return res.status(500).json({ error: err?.message || 'Failed to create portal session' })
  }
})

// Export a raw-body webhook handler to be mounted with express.raw
export async function stripeWebhookHandler(req: any, res: Response) {
  const sig = req.headers['stripe-signature']
  if (!webhookSecret) {
    console.warn('Stripe webhook secret not configured. Rejecting webhook.')
    return res.status(500).send('Webhook not configured')
  }
  let event: Stripe.Event
  try {
    const buf = req.rawBody || req.body
    event = stripe.webhooks.constructEvent(buf, sig as string, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err?.message)
    return res.status(400).send(`Webhook Error: ${err?.message}`)
  }

  try {
    // Handle the event types we care about
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // session.customer can be a string id or a Customer object depending on event
        const customerField = session.customer as any
        const customerId = typeof customerField === 'string' ? customerField : (customerField?.id)
        const metadata = session.metadata || {}
        // prefer metadata.userId, fall back to client_reference_id
        const userId = metadata?.userId || (session.client_reference_id as string)
        // Look up the subscription associated with this session (may be present)
        const subscriptionId = (session.subscription as unknown) as string
        // Update user in DB
        let u: any = null
        if (userId) {
          try {
            u = await User.findById(userId)
          } catch (e) {
            console.error('Failed to find user by metadata userId/client_reference_id:', e)
          }
        }
        // If we didn't find user by metadata, try to find by stripeCustomerId
        if (!u && customerId) {
          try {
            u = await User.findOne({ stripeCustomerId: customerId })
          } catch (e) {
            console.error('Failed to find user by stripeCustomerId:', e)
          }
        }

        if (u) {
          try {
            u.role = 'premium'
            if (customerId) u.stripeCustomerId = customerId
            if (subscriptionId) u.stripeSubscriptionId = subscriptionId
            u.subscriptionStatus = 'active'
            // Try to fetch subscription details to populate currentPeriodEnd
            try {
              if (subscriptionId) {
                const sub = await stripe.subscriptions.retrieve(subscriptionId)
                u.currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null
              } else if (customerId) {
                // fallback: fetch latest subscription for customer
                const subs = await stripe.subscriptions.list({ customer: customerId, limit: 1 })
                if (subs.data && subs.data.length) {
                  const sub = subs.data[0]
                  u.stripeSubscriptionId = sub.id
                  u.subscriptionStatus = sub.status
                  u.currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null
                }
              }
            } catch (e) {
              // ignore
              console.debug('Failed to retrieve subscription details:', e)
            }
            await u.save()
            console.log(`Stripe: checkout.session.completed - upgraded user:${u._id}`)
          } catch (e) {
            console.error('Failed to persist subscription for user:', e)
          }
        } else {
          console.warn('Stripe checkout.session.completed: no matching user found for session metadata or customer id')
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const status = subscription.status
        const subscriptionId = subscription.id
        const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
        // find user by stripeCustomerId
        try {
          const u: any = await User.findOne({ stripeCustomerId: customerId })
          if (u) {
            u.stripeSubscriptionId = subscriptionId
            u.subscriptionStatus = status
            u.currentPeriodEnd = currentPeriodEnd
            // if active, set role premium
            if (status === 'active' || status === 'trialing') u.role = 'premium'
            await u.save()
            console.log(`Stripe: subscription.updated for user:${u._id} status:${status}`)
          }
        } catch (e) {
          console.error('Failed to update subscription for customer:', e)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        // find user and mark canceled
        try {
          const u: any = await User.findOne({ stripeCustomerId: customerId })
          if (u) {
            u.subscriptionStatus = subscription.status
            u.currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
            // On deletion, we downgrade to free/user for now (could schedule at period end instead)
            u.role = 'free'
            await u.save()
            console.log(`Stripe: subscription.deleted - downgraded user:${u._id}`)
          }
        } catch (e) {
          console.error('Failed to handle subscription deletion for customer:', e)
        }
        break
      }

      default:
        // Unexpected event type
        console.log(`Unhandled stripe event type: ${event.type}`)
    }
  } catch (e) {
    console.error('Error handling webhook event:', e)
  }

  res.json({ received: true })
}

export default router
