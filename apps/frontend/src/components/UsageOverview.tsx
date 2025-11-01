import React from 'react'
import { useUsageLimits } from '../hooks/useUsageLimits'

const FEATURES = [
  { key: 'summarize', label: 'Summarizer' },
  { key: 'qa', label: 'Q&A' },
  { key: 'quiz', label: 'Quiz Generator' },
  { key: 'flashcards', label: 'Flashcards' },
]

export const UsageOverview: React.FC = () => {
  const { getUsed, getLimit, isUnlimited, refreshUser, serverUsage } = useUsageLimits()

  // On mount, ask backend for the freshest user usage so counters reflect server state
  React.useEffect(() => {
    let mounted = true
    const doRefresh = async () => {
      try {
        if (refreshUser) await refreshUser()
        if (!mounted) return
        const snapshot = FEATURES.map(f => ({ feature: f.key, used: getUsed(f.key), limit: getLimit(f.key) }))
        // eslint-disable-next-line no-console
        console.log('UsageOverview snapshot:', snapshot)
      } catch (e) {
        // ignore
      }
    }
    // Only run this on mount — refreshUser is stable (useCallback) so it's safe to include
    doRefresh()
    // Listen for usage:updated events from other hook instances and refresh when they occur
    const handler = () => { if (mounted) doRefresh() }
    window.addEventListener('usage:updated', handler)
    // Also refresh when window gains focus (useful after returning from Stripe)
    const onFocus = () => { if (mounted) doRefresh() }
    window.addEventListener('focus', onFocus)
    return () => {
      mounted = false
      window.removeEventListener('usage:updated', handler)
      window.removeEventListener('focus', onFocus)
    }
    // refreshUser is stable, getUsed/getLimit will change as user updates; we purposely
    // do NOT list them here to avoid re-running the effect whenever usage changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshUser])

  return (
    <div className="px-2 py-3 border-t border-gray-100">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Usage</h4>
      <ul className="text-xs space-y-1">
          {serverUsage && serverUsage.role === 'guest' ? (
            <li className="flex items-center justify-between">
              <span className="text-gray-600">Today</span>
              <span className="font-mono text-sm text-gray-800">{serverUsage.usedToday} / {serverUsage.limit}</span>
            </li>
          ) : (
            FEATURES.map(f => {
              const used = getUsed(f.key)
              const limit = getLimit(f.key)
              return (
                <li key={f.key} className="flex items-center justify-between">
                  <span className="text-gray-600">{f.label}</span>
                  <span className="font-mono text-sm text-gray-800">{used} / {isUnlimited(f.key) ? '∞' : limit}</span>
                </li>
              )
            })
          )}
      </ul>
    </div>
  )
}
