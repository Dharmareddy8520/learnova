import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type CheckResult = {
  allowed: boolean
  used: number
  limit: number
  isUnlimited: boolean
}

export function useUsageLimits() {
  const { user, updateUserUsage, refreshUser } = useAuth()
  const [serverUsage, setServerUsage] = useState<any>(null)
  const V = (import.meta as any).env || {}
  const guestLimit = Number(V.VITE_GUEST_LIMIT ?? 3)
  const freeLimit = Number(V.VITE_FREE_TIER_LIMIT ?? 5)
  const premiumLimit = Number(V.VITE_PREMIUM_TIER_LIMIT ?? -1)
  

  const getLimitForRole = useCallback((role?: string) => {
    if (!role) return guestLimit
    if (role === 'premium') return premiumLimit
    return freeLimit
  }, [guestLimit, freeLimit, premiumLimit])

  const getLimit = useCallback((_feature: string) => {
    return getLimitForRole(user?.role)
  }, [user, getLimitForRole])

  // Fetch authoritative usage metadata from server (role, usedToday, limit, perFeature)
  const fetchServerUsage = useCallback(async () => {
    try {
      const resp = await axios.get('/api/usage')
      setServerUsage(resp.data)
      try {
        // Notify other parts of the app that server usage updated so they can refresh their own hook instances
        window.dispatchEvent(new CustomEvent('usage:updated', { detail: resp.data }))
      } catch (e) {
        // ignore
      }
      return resp.data
    } catch (e) {
      // ignore — server may be unreachable for guests
      return null
    }
  }, [])

  // keep server usage in sync when user state changes
  useEffect(() => {
    // fetch once on mount or when auth changes
    fetchServerUsage()
  }, [fetchServerUsage, user?.id])

  const getUsed = useCallback((feature: string) => {
    // logged-in user's usage: prefer authoritative server per-feature counts when available
    if (user) {
      if (serverUsage && serverUsage.perFeature && typeof serverUsage.perFeature[feature] !== 'undefined') {
        return Number(serverUsage.perFeature[feature] || 0)
      }
      const u: any = user
      if (u.usageDate === todayStr() && u.usage && typeof u.usage[feature] !== 'undefined') {
        return Number(u.usage[feature] || 0)
      }
      return 0
    }

    // guest: prefer localStorage per-feature counters when available and current
    // because server-side guest logging may be asynchronous. Fall back to serverUsage
    // total when local data is missing.
    try {
      const raw = localStorage.getItem('usage')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.date === todayStr()) {
          return Number((parsed.counts && parsed.counts[feature]) || 0)
        }
      }

      if (serverUsage && serverUsage.role === 'guest') {
        // return total usedToday as a fallback for any feature display
        return Number(serverUsage.usedToday || 0)
      }

      return 0
    } catch (e) {
      return 0
    }
  }, [user, serverUsage])

  const isUnlimited = useCallback((feature: string) => getLimit(feature) < 0, [getLimit])

  // increment usage (guest: localStorage, logged-in: POST /api/user/usage)
  const increment = useCallback(async (feature: string) => {
    if (user) {
      try {
        const resp = await axios.post('/api/user/usage', { feature })
        // server returns { feature, used, usage, usageDate, limit }
        const payload = resp.data
        // merge into auth context if possible
        if (payload && payload.usage && updateUserUsage) {
          updateUserUsage({ feature: payload.feature, used: payload.used, limit: payload.limit })
          // refresh authoritative server usage
          fetchServerUsage().catch(() => {})
        }
        return { used: payload.used, limit: payload.limit }
      } catch (e: any) {
        // if server denied due to limit, forward that info
        if (e?.response?.status === 403 && e.response.data?.usage) {
          return { used: e.response.data.usage.used, limit: e.response.data.usage.limit }
        }
        throw e
      }
    }

  // guest: localStorage with date reset
    try {
      const raw = localStorage.getItem('usage')
      let parsed: any = { date: todayStr(), counts: {} }
      if (raw) {
        parsed = JSON.parse(raw)
      }
      if (parsed.date !== todayStr()) {
        parsed = { date: todayStr(), counts: {} }
      }
      parsed.counts[feature] = Number(parsed.counts[feature] || 0) + 1
  localStorage.setItem('usage', JSON.stringify(parsed))
        // also send a log to the backend so it appears in the server terminal (dev helper)
        try {
          await axios.post('/api/log/guest-usage', { feature, used: parsed.counts[feature] })
        } catch (e) {
          // ignore logging failures
        }
      // also refresh server-side guest count logging may have been recorded
      // dispatch an immediate local update so other components reflect the new guest count
      try {
        window.dispatchEvent(new CustomEvent('usage:updated', { detail: { role: 'guest', usedToday: parsed.counts[feature], limit: guestLimit } }))
      } catch (e) {}
      // refresh server-side guest count logging may have been recorded (best-effort)
      fetchServerUsage().catch(() => {})
      return { used: parsed.counts[feature], limit: guestLimit }
    } catch (e) {
      throw e
    }
  }, [user, updateUserUsage, guestLimit])

  const check = useCallback((feature: string): CheckResult => {
    const limit = getLimit(feature)
    const used = getUsed(feature)
    if (limit < 0) return { allowed: true, used, limit, isUnlimited: true }
    return { allowed: used < limit, used, limit, isUnlimited: false }
  }, [getLimit, getUsed])

  return { getLimit, getUsed, isUnlimited, increment, check, refreshUser, fetchServerUsage, serverUsage }
}
