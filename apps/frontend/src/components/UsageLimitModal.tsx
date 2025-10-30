import React from 'react'

interface Props {
  feature: string
  used: number
  limit: number
  onUseRemaining: () => void
  onLogin: () => void
  onUpgrade: () => void
  onClose: () => void
}

export const UsageLimitModal: React.FC<Props> = ({ feature, used, limit, onUseRemaining, onLogin, onUpgrade, onClose }) => {
  const limitText = limit < 0 ? 'unlimited' : String(limit)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded p-6 max-w-lg w-full shadow">
        <h3 className="text-lg font-semibold mb-2">Usage limit reached</h3>
        <p className="text-sm text-gray-700 mb-4">
          You’re using {feature}. Guest users get 3 free tries, logged-in users get 5, and Premium members enjoy unlimited access. You’ve used {used} out of {limitText} available attempts. Log in or upgrade to continue using this feature.
        </p>
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={onUseRemaining}>Use Remaining Free Try</button>
          <button className="px-3 py-2 bg-gray-100" onClick={onLogin}>Log In (Get 2 More Free)</button>
          <button className="ml-auto px-3 py-2 bg-yellow-500 text-black rounded" onClick={onUpgrade}>Upgrade to Premium 🚀</button>
        </div>
        <div className="mt-3 text-right">
          <button className="text-sm text-gray-500" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
