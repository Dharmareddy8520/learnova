import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

interface User {
  id: string
  name: string
  email: string
  role: 'free' | 'premium'
  consecutiveDays: number
  usage?: Record<string, number>
  usageDate?: string | null
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
  updateUserUsage?: (usage: { feature: string; used: number; limit?: number }) => void
  refreshUser?: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Configure axios defaults
// Allow configuring the API host via Vite env var VITE_API_URL. If set, axios
// will call the backend directly (recommended) which ensures cookies are set
// for the backend origin during OAuth flows. Fall back to relative paths when
// not provided (local dev with same-origin proxy).
const rawApiBase = (import.meta as any).env?.VITE_API_URL || ''
// Remove any trailing slashes to avoid double-slash when concatenating paths
const apiBase = rawApiBase.replace(/\/+$/, '')
if (apiBase) axios.defaults.baseURL = apiBase
axios.defaults.withCredentials = true

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // update user usage (merge usage object into user)
  const updateUserUsage = React.useCallback((u?: { feature: string; used: number; limit?: number }) => {
    if (!u) return
    setUser(prev => {
      if (!prev) return prev
      const prevUsage = prev.usage || {}
      const nextUsage = { ...prevUsage, [u.feature]: u.used }
      return { ...prev, usage: nextUsage, usageDate: prev.usageDate }
    })
  }, [])

  const refreshUser = React.useCallback(async () => {
    try {
      const resp = await axios.get('/api/user/me')
      setUser(resp.data.user)
    } catch (e) {
      // ignore
    }
  }, [])

  // Check if user is logged in on app load
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Attach an axios response interceptor to capture any { usage } payload returned by
  // backend ML endpoints and merge it into the user so the UI updates immediately.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (response) => {
        try {
          const usage = response?.data?.usage
          if (usage && typeof usage.feature === 'string') {
            updateUserUsage(usage)
          }
        } catch (e) {
          // ignore
        }
        return response
      },
      (error) => {
        try {
          const resp = error?.response
          if (resp && resp.status === 403 && resp.data && resp.data.usage) {
            // Dispatch a global event so UI can show a modal
            try {
              const ev = new CustomEvent('usage:limit', { detail: resp.data.usage })
              window.dispatchEvent(ev)
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore
        }
        return Promise.reject(error)
      }
    )

    return () => { axios.interceptors.response.eject(id) }
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/user/me')
      setUser(response.data.user)
    } catch (error) {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password })
      setUser(response.data.user)
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed')
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/register', { name, email, password })
      // Don't set user since registration doesn't auto-login anymore
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed')
    }
  }

  const logout = async () => {
    try {
      await axios.get('/api/auth/logout')
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const value = {
    user,
    login,
    register,
    logout,
    isLoading
    ,updateUserUsage, refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
