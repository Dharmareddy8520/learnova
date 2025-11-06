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
    let session
    try {
      session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl,
      })
    } catch (err: any) {
      // Common cause: Billing Portal not configured in Stripe Dashboard (test mode).
      console.error('create-portal-session error (stripe):', err && err.message ? err.message : err)
      const help = 'Stripe Billing Portal not configured. Visit https://dashboard.stripe.com/test/settings/billing/portal and save your portal configuration in test mode.'
      return res.status(500).json({ error: err?.message || 'Failed to create portal session', help })
    }
    return res.json({ url: session.url })
  } catch (err: any) {
    console.error('create-portal-session error:', err)
    return res.status(500).json({ error: err?.message || 'Failed to create portal session' })
  }
})

// GET /api/billing/info
// Returns customer summary, default card (if any) and subscription next billing date/status
router.get('/info', requireAuth, async (req: Request, res: Response) => {
  try {
    const user: any = (req as any).user
    if (!user.stripeCustomerId) return res.status(404).json({ error: 'No Stripe customer associated with user' })

    // Retrieve customer
    const customer = await stripe.customers.retrieve(user.stripeCustomerId)

    // Try to find a default card/payment method from multiple possible sources:
    // 1) customer.invoice_settings.default_payment_method (PaymentMethod)
    // 2) paymentMethods.list for card-type PaymentMethods
    // 3) legacy customer.sources (cards attached as sources)
    // 4) fallback to payment method referenced on an upcoming invoice
    let paymentMethod: Stripe.PaymentMethod | null = null
    try {
      const defaultPm = (customer as any).invoice_settings?.default_payment_method
      if (defaultPm) {
        try {
          paymentMethod = await stripe.paymentMethods.retrieve(defaultPm as string)
        } catch (e) {
          // ignore and fall through
          console.debug('Failed to retrieve invoice_settings.default_payment_method:', e)
        }
      }

      if (!paymentMethod) {
        const pmList = await stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: 'card', limit: 1 })
        paymentMethod = pmList.data?.[0] || null
      }

      // Legacy customers may have sources (card objects) — use first source as fallback
      if (!paymentMethod && (customer as any).sources && Array.isArray((customer as any).sources.data) && (customer as any).sources.data.length) {
        const src = (customer as any).sources.data[0]
        // create a PaymentMethod-like shape for frontend consumption
        paymentMethod = {
          id: src.id,
          card: {
            brand: src.brand,
            last4: src.last4,
            exp_month: src.exp_month,
            exp_year: src.exp_year,
          } as any,
          billing_details: { name: src.name } as any,
        } as unknown as Stripe.PaymentMethod
      }
    } catch (e) {
      // ignore payment method retrieval errors
      console.debug('Failed to load payment method:', e)
    }

    // Subscription: prefer user's stored subscription id, fallback to latest active subscription
    let subscription: Stripe.Subscription | null = null
    try {
      if (user.stripeSubscriptionId) {
        subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
      } else {
        const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, limit: 1 })
        if (subs.data && subs.data.length) subscription = subs.data[0]
      }
    } catch (e) {
      console.debug('Failed to load subscription details:', e)
    }

    // Try to retrieve the upcoming invoice to determine next billing date (stronger fallback)
    let nextBillingDate: Date | null = null
    try {
      const upcoming = await stripe.invoices.retrieveUpcoming({ customer: user.stripeCustomerId })
      if (upcoming && (upcoming as any).period_end) {
        nextBillingDate = new Date((upcoming as any).period_end * 1000)
      } else if (upcoming && (upcoming as any).next_payment_attempt) {
        nextBillingDate = new Date((upcoming as any).next_payment_attempt * 1000)
      }
      // Also consider subscription's current_period_end if present
      if (!nextBillingDate && subscription && subscription.current_period_end) {
        nextBillingDate = new Date(subscription.current_period_end * 1000)
      }
    } catch (e) {
      // retrieveUpcoming will throw if there is no upcoming invoice; ignore
      // console.debug('No upcoming invoice or failed to retrieve upcoming invoice:', e)
    }

    const out = {
      customer: {
        id: user.stripeCustomerId,
        email: (customer as any).email || null,
        name: (customer as any).name || null,
      },
      paymentMethod: paymentMethod
        ? {
            id: paymentMethod.id,
            brand: (paymentMethod.card as any)?.brand || null,
            last4: (paymentMethod.card as any)?.last4 || null,
            exp_month: (paymentMethod.card as any)?.exp_month || null,
            exp_year: (paymentMethod.card as any)?.exp_year || null,
            name: (paymentMethod.billing_details as any)?.name || null,
          }
        : null,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
            price: subscription.items?.data?.[0]?.price?.id || null,
            interval: subscription.items?.data?.[0]?.price?.recurring?.interval || null,
          }
        : null,
      nextBillingDate: nextBillingDate,
    }

    return res.json(out)
  } catch (err: any) {
    console.error('billing.info error:', err)
    return res.status(500).json({ error: err?.message || 'Failed to load billing info' })
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

// POST /api/billing/sync-subscription
// Authenticated endpoint to force-sync the current user's Stripe subscription
// Useful when the checkout redirect completed but webhooks were not delivered.
router.post('/sync-subscription', requireAuth, async (req: Request, res: Response) => {
  try {
    const user: any = (req as any).user
    if (!user) return res.status(401).json({ error: 'Not authenticated' })
    if (!user.stripeCustomerId && !user.stripeSubscriptionId) return res.status(400).json({ error: 'No Stripe customer or subscription associated with user' })

    // Prefer using stored subscription id if present
    let subscription: Stripe.Subscription | null = null
    try {
      if (user.stripeSubscriptionId) {
        subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
      } else if (user.stripeCustomerId) {
        const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, limit: 1 })
        if (subs && subs.data && subs.data.length) subscription = subs.data[0]
      }
    } catch (e) {
      console.debug('sync-subscription: failed to retrieve subscription from Stripe', e)
    }

    // Update local user record based on subscription info
    try {
      const u: any = await User.findById(user._id)
      if (!u) return res.status(404).json({ error: 'User not found' })

      if (subscription) {
        const status = subscription.status
        u.stripeSubscriptionId = subscription.id
        u.subscriptionStatus = status
        u.currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
        if (status === 'active' || status === 'trialing') {
          u.role = 'premium'
        } else if (status === 'canceled' || status === 'incomplete' || status === 'incomplete_expired' || status === 'past_due') {
          // don't forcibly downgrade if still within period_end; but set subscriptionStatus
          u.role = u.role === 'premium' && u.currentPeriodEnd && u.currentPeriodEnd > new Date() ? 'premium' : 'free'
        }
        await u.save()
        return res.json({ ok: true, subscription: { id: subscription.id, status: subscription.status, currentPeriodEnd: u.currentPeriodEnd }, role: u.role })
      }

      // If no subscription found on Stripe, try to clear local subscription fields
      u.stripeSubscriptionId = ''
      u.subscriptionStatus = 'inactive'
      u.currentPeriodEnd = null
      if (u.role === 'premium') u.role = 'free'
      await u.save()
      return res.json({ ok: true, message: 'No active subscription found; user downgraded to free', role: u.role })
    } catch (e: any) {
      console.error('sync-subscription failed:', e)
      return res.status(500).json({ error: e?.message || 'Failed to sync subscription' })
    }
  } catch (e: any) {
    console.error('sync-subscription top-level error:', e)
    return res.status(500).json({ error: e?.message || 'Failed to sync subscription' })
  }
})
