import React, { useEffect, useState } from 'react'
import { UsageLimitModal } from './UsageLimitModal'
import { useNavigate } from 'react-router-dom'
import { useUsageLimits } from '../hooks/useUsageLimits'
import axios from 'axios'

export const GlobalUsageModal: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<{ feature: string; used?: number; limit?: number } | null>(null)
  const { increment } = useUsageLimits()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: any) => {
      const d = e?.detail
      if (d && typeof d.feature === 'string') {
        setPayload(d)
        setOpen(true)
      }
    }
    window.addEventListener('usage:limit', handler)
    return () => { window.removeEventListener('usage:limit', handler) }
  }, [])

  const handleClose = () => {
    setOpen(false)
    setPayload(null)
  }

  const handleUseRemaining = async () => {
    if (!payload) return
    try {
      // Attempt to increment (guest or logged-in). For logged-in users this may still fail if server blocks.
      await increment(payload.feature)
    } catch (e) {
      // ignore - increment may fail if server enforces strict limit
    }
    // notify any listeners (pages) that user opted to override/try again
    try { window.dispatchEvent(new CustomEvent('usage:override', { detail: { feature: payload.feature } })) } catch (e) {}
    handleClose()
  }

  const handleLogin = () => {
    handleClose()
    navigate('/login')
  }

  const handleUpgrade = async () => {
    handleClose()
    try {
      // Request a Checkout session from the backend and redirect to Stripe Checkout
      const resp = await axios.post('/api/billing/create-checkout-session')
      const url = resp.data?.url
      if (url) {
        window.location.href = url
        return
      }
      // fallback: navigate to account page which also has billing actions
      navigate('/account')
    } catch (err: any) {
      // If not authenticated, send user to login; otherwise fallback to account page
      if (err?.response?.status === 401) {
        navigate('/login')
      } else {
        console.error('Failed to start checkout session', err)
        navigate('/account')
      }
    }
  }

  if (!open || !payload) return null
  return (
    <UsageLimitModal
      feature={payload.feature}
      used={payload.used ?? 0}
      limit={typeof payload.limit === 'number' ? payload.limit : -1}
      onUseRemaining={handleUseRemaining}
      onLogin={handleLogin}
      onUpgrade={handleUpgrade}
      onClose={handleClose}
    />
  )
}
