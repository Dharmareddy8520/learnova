import React, { useEffect, useState } from 'react'
import { UsageLimitModal } from './UsageLimitModal'
import { useNavigate } from 'react-router-dom'
import { useUsageLimits } from '../hooks/useUsageLimits'

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

  const handleUpgrade = () => {
    handleClose()
    navigate('/account')
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
