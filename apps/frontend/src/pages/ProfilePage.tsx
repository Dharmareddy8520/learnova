// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import {
  Camera, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react'
import AppSidebar from '../components/AppSidebar' // ✅ add the global app sidebar

type UserProfile = {
  name: string
  email: string
  avatarUrl?: string
  timezone?: string
  studyGoalPerDay?: number
  theme?: 'system' | 'light' | 'dark'
  notifyReminders?: boolean
  notifyProduct?: boolean
}

const ui = {
  shell: 'min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white',
  container: 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8',
  card: 'rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition',
  sectionTitle: 'text-lg font-semibold text-gray-900',
  field:
    'relative border border-transparent rounded-xl px-4 pt-5 pb-2 bg-white shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-300 transition-all',
  label: 'absolute -top-2 left-3 bg-white px-1 text-xs font-semibold text-indigo-600',
  input: 'w-full border-none bg-transparent focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400',
  select: 'w-full border-none bg-transparent focus:outline-none focus:ring-0 text-gray-800',
  help: 'text-xs text-gray-500',
  btn: 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500',
  primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md',
  ghost: 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 shadow-sm',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  badge: 'inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs font-medium',
}

const TIMEZONES = [
  'UTC',
  'America/Chicago',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
]

function Toast({
  kind = 'success',
  children,
}: {
  kind?: 'success' | 'error'
  children: React.ReactNode
}) {
  const isSuccess = kind === 'success'
  const Icon = isSuccess ? CheckCircle2 : AlertCircle
  const tone = isSuccess
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-rose-200 bg-rose-50 text-rose-800'
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${tone}`}>
      <Icon className="h-4 w-4 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null)

  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || '',
    avatarUrl: '',
    timezone: 'America/Chicago',
    studyGoalPerDay: 20,
    theme: 'system',
    notifyReminders: true,
    notifyProduct: false,
  })
  const [status, setStatus] = useState<any>(null)
  const [portalHelp, setPortalHelp] = useState<string | null>(null)
  const [billingInfo, setBillingInfo] = useState<any>(null)
  const [showBillingModal, setShowBillingModal] = useState(false)
  const location = useLocation()
  const [syncedAfterBilling, setSyncedAfterBilling] = useState(false)

  // password fields
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false })

  // avatar upload
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const avatarAccept = 'image/png,image/jpeg,image/jpg,image/webp'

  const canSave = useMemo(
    () => profile.name.trim().length > 1 && /\S+@\S+\.\S+/.test(profile.email),
    [profile.name, profile.email]
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Load current data (backend responds with { user, progressSummary })
        const resp = await axios.get('/api/user/me')
        if (!mounted) return
        const data = resp.data?.user || resp.data
        const progress = resp.data?.progressSummary || null

        setProfile((p) => ({
          ...p,
          name: data?.name ?? p.name,
          email: data?.email ?? p.email,
          avatarUrl: data?.avatarUrl ?? '',
          timezone: data?.timezone ?? p.timezone,
          studyGoalPerDay: data?.studyGoalPerDay ?? p.studyGoalPerDay,
          theme: data?.theme ?? p.theme,
          notifyReminders: data?.notifyReminders ?? p.notifyReminders,
          notifyProduct: data?.notifyProduct ?? p.notifyProduct,
        }))
        setAvatarPreview(data?.avatarUrl || null)
        setStatus({ user: data, progress })
        // Fetch billing info if user exists
        if (data && data._id) {
          try {
            const b = await axios.get('/api/billing/info')
            setBillingInfo(b.data)
          } catch (e) {
            // non-blocking: if billing info isn't available, we silently ignore
            // eslint-disable-next-line no-console
            console.debug('No billing info available', e)
          }
        }
      } catch (err) {
        // non-blocking
        // eslint-disable-next-line no-console
        console.debug('Profile load failed:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // If the user was redirected from Stripe checkout with ?billing=success,
  // attempt an immediate server-side sync so the account reflects the upgrade
  useEffect(() => {
    const qs = new URLSearchParams(location.search)
    if (qs.get('billing') === 'success' && user && !syncedAfterBilling) {
      ;(async () => {
        try {
          const resp = await axios.post('/api/billing/sync-subscription')
          if (resp?.data?.ok) {
            showToast('success', 'Billing updated — your account should now be Premium.')
            // refresh profile/billing info
            try {
              const me = await axios.get('/api/user/me')
              const data = me.data?.user || me.data
              setStatus((s: any) => ({ ...s, user: data }))
              const b = await axios.get('/api/billing/info')
              setBillingInfo(b.data)
            } catch (e) { console.debug('Failed to reload profile after billing sync', e) }
          } else {
            showToast('error', 'Billing sync did not find an active subscription. Check Stripe dashboard or try again.')
          }
        } catch (e: any) {
          showToast('error', e?.response?.data?.error || 'Failed to sync billing. Please try again later.')
        } finally {
          setSyncedAfterBilling(true)
        }
      })()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, user])

  const showToast = (kind: 'success' | 'error', msg: string) => {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const formatDate = (d: string | number | Date | null) => {
    if (!d) return '-'
    const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d
    try {
      return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dt.toString()
    }
  }

  const onPickAvatar = () => fileRef.current?.click()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Validate
    if (!avatarAccept.split(',').includes(file.type)) {
      showToast('error', 'Unsupported file format. Use PNG, JPG, or WEBP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Image too large (max 2MB).')
      return
    }
    setAvatarFile(file)
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setProfile((p) => ({ ...p, avatarUrl: '' }))
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    try {
      // Upload avatar first (if any)
      let uploadedUrl = profile.avatarUrl
      if (avatarFile) {
        const form = new FormData()
        form.append('avatar', avatarFile)
        const { data } = await axios.post('/api/user/avatar', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        uploadedUrl = data?.url || uploadedUrl
      }

      const payload = { ...profile, avatarUrl: uploadedUrl }
      await axios.put('/api/user/update', payload)

      setProfile((p) => ({ ...p, avatarUrl: uploadedUrl }))
      showToast('success', 'Profile saved successfully.')
    } catch (err: any) {
      showToast('error', err?.response?.data?.error || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwd.next || pwd.next !== pwd.confirm) {
      showToast('error', 'Passwords do not match.')
      return
    }
    if (pwd.next.length < 8) {
      showToast('error', 'New password must be at least 8 characters.')
      return
    }

    setPwdSaving(true)
    try {
      await axios.post('/api/user/password', {
        current: pwd.current,
        next: pwd.next,
      })
      setPwd({ current: '', next: '', confirm: '' })
      showToast('success', 'Password updated.')
    } catch (err: any) {
      showToast('error', err?.response?.data?.error || 'Failed to update password.')
    } finally {
      setPwdSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className={ui.shell}>
      {/* ✅ Global App Sidebar (mobile drawer + desktop rail) */}
      <AppSidebar />

      {/* ✅ Leave room for mobile top/bottom bars and the desktop rail */}
      <main className="pt-14 pb-14 md:pt-0 md:pb-0 md:ml-64">
        <div className={ui.container}>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Profile Settings</h1>
              <div className="mt-2 flex items-center gap-4">
                <span className={ui.badge}>Secure & Private</span>
                {/* Status summary fetched from backend */}
                <div>
                  <div className="text-sm text-gray-500">Account status</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-xs text-gray-700">{status?.user?.role ? status.user.role.toUpperCase() : 'GUEST'}</div>
                    <div className="text-xs text-gray-500">•</div>
                    <div className="text-xs text-gray-500">Streak: {status?.progress?.consecutiveDays ?? '-'}</div>
                    <div className="text-xs text-gray-500">•</div>
                    <div className="text-xs text-gray-500">Days: {status?.progress?.totalDays ?? '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Billing summary (Netflix-style) */}
                  {billingInfo?.subscription && (
                <div className="hidden md:flex flex-col items-end text-right">
                  <div className="rounded-xl bg-gray-900 text-white px-5 py-3 shadow-md w-64">
                    <div className="text-xs text-gray-300">Next billing</div>
                        <div className="mt-1 text-xl font-semibold">{formatDate(billingInfo.nextBillingDate || billingInfo.subscription.currentPeriodEnd)}</div>
                    <div className="mt-2 text-sm text-gray-300">{billingInfo.subscription.status?.toUpperCase() || ''}</div>
                    {billingInfo.paymentMethod && (
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm">{(billingInfo.paymentMethod.name) || billingInfo.customer.email}</div>
                          <div className="text-xs text-gray-400">{billingInfo.paymentMethod.brand} •••• {billingInfo.paymentMethod.last4}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Upgrade / Manage Billing actions */}
              {user ? (
                status?.user?.role !== 'premium' ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const resp = await axios.post('/api/billing/create-checkout-session')
                        const url = resp.data?.url
                        if (url) window.location.href = url
                        else showToast('error', 'Failed to create checkout session')
                      } catch (err: any) {
                        showToast('error', err?.response?.data?.error || 'Failed to initiate upgrade')
                      }
                    }}
                    className={`${ui.btn} ${ui.primary} px-4 py-2`}
                  >
                    Upgrade to Premium
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      // Instead of redirecting immediately, show an in-app billing modal with details
                      try {
                        if (!billingInfo) {
                          const resp = await axios.get('/api/billing/info')
                          setBillingInfo(resp.data)
                        }
                        setShowBillingModal(true)
                      } catch (err: any) {
                        // If billing info can't be loaded, still attempt to create portal (fallback)
                        try {
                          const resp = await axios.post('/api/billing/create-portal-session')
                          const url = resp.data?.url
                          if (url) window.location.href = url
                          else showToast('error', 'Failed to open billing portal')
                        } catch (e: any) {
                          const help = e?.response?.data?.help
                          if (help) setPortalHelp(help)
                          else showToast('error', e?.response?.data?.error || 'Failed to open billing portal')
                        }
                      }
                    }}
                    className={`${ui.btn} ${ui.ghost} px-4 py-2`}
                  >
                    Manage Billing
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => window.location.href = '/login'}
                  className={`${ui.btn} ${ui.primary} px-4 py-2`}
                >
                  Login to Upgrade
                </button>
              )}
            </div>
          </div>

          {toast && (
            <div className="mb-4">
              <Toast kind={toast.kind}>{toast.msg}</Toast>
            </div>
          )}

          {/* Profile + Preferences */}
          <form onSubmit={saveProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Avatar + Identity */}
            <div className={`lg:col-span-1 ${ui.card} p-6`}>
              <h2 className={ui.sectionTitle}>Your Avatar</h2>
              <p className="mt-1 text-sm text-gray-600">Upload a square image for best results (PNG/JPG/WEBP, ≤2MB).</p>

              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-24 w-24 rounded-2xl ring-1 ring-gray-200 overflow-hidden bg-gray-100">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-gray-400">No image</div>
                  )}
                  <button
                    type="button"
                    onClick={onPickAvatar}
                    className="absolute bottom-2 right-2 inline-flex items-center justify-center rounded-lg bg-white/90 px-2 py-1 text-xs font-medium shadow ring-1 ring-gray-200 hover:bg-white"
                    aria-label="Upload avatar"
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Upload
                  </button>
                </div>

                {avatarPreview && (
                  <button type="button" onClick={removeAvatar} className={`${ui.btn} ${ui.ghost} px-3 py-2`}>
                    Remove
                  </button>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept={avatarAccept}
                className="hidden"
                onChange={onFileChange}
              />

              <div className="mt-6 space-y-4">
                <div className={ui.field}>
                  <label htmlFor="name" className={ui.label}>Full Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className={ui.input}
                    placeholder="Your name"
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>

                <div className={ui.field}>
                  <label htmlFor="email" className={ui.label}>Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={ui.input}
                    placeholder="you@domain.com"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                  <p className={ui.help}>Use your sign-in email. You may verify changes via email.</p>
                </div>
                {/* Account status below email */}
                <div className="mt-3">
                  <div className="text-xs text-gray-500 mb-1">Account status</div>
                  {status?.user?.role === 'premium' ? (
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Premium</span>
                    </div>
                  ) : status?.user?.role === 'free' ? (
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 bg-white ring-1 ring-gray-200">
                      <span className="text-xs font-medium">Free</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-gray-500 bg-white ring-1 ring-gray-100">
                      <span>Guest</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Preferences */}
            <div className="lg:col-span-2 space-y-8">
              <div className={`${ui.card} p-6`}>
                <h2 className={ui.sectionTitle}>Study Preferences</h2>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={ui.field}>
                    <label htmlFor="timezone" className={ui.label}>Timezone</label>
                    <select
                      id="timezone"
                      className={ui.select}
                      value={profile.timezone}
                      onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
                    >
                      {TIMEZONES.map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>

                  <div className={ui.field}>
                    <label htmlFor="goal" className={ui.label}>Daily Study Goal (mins)</label>
                    <input
                      id="goal"
                      type="number"
                      min={5}
                      max={240}
                      className={ui.input}
                      value={profile.studyGoalPerDay}
                      onChange={(e) =>
                        setProfile((p) => ({ ...p, studyGoalPerDay: Number(e.target.value || 0) }))
                      }
                    />
                  </div>

                  <div className={ui.field}>
                    <label htmlFor="theme" className={ui.label}>Theme</label>
                    <select
                      id="theme"
                      className={ui.select}
                      value={profile.theme}
                      onChange={(e) => setProfile((p) => ({ ...p, theme: e.target.value as UserProfile['theme'] }))}
                    >
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>

                  <div className={`${ui.field} flex items-center justify-between`}>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Study Reminders</div>
                      <div className={ui.help}>Get nudges to review flashcards and keep your streak.</div>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={!!profile.notifyReminders}
                        onChange={(e) => setProfile((p) => ({ ...p, notifyReminders: e.target.checked }))}
                      />
                      <span className="ms-3 h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-indigo-600 transition relative after:absolute after:start-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white peer-checked:after:translate-x-5 after:transition"></span>
                    </label>
                  </div>

                  <div className={`${ui.field} flex items-center justify-between`}>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Product Updates</div>
                      <div className={ui.help}>Be the first to know about new features.</div>
                    </div>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={!!profile.notifyProduct}
                        onChange={(e) => setProfile((p) => ({ ...p, notifyProduct: e.target.checked }))}
                      />
                      <span className="ms-3 h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-indigo-600 transition relative after:absolute after:start-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white peer-checked:after:translate-x-5 after:transition"></span>
                    </label>
                  </div>
                </div>

                <div className="mt-5 flex gap-3">
                  <button type="submit" disabled={!canSave || saving} className={`${ui.btn} ${ui.primary} px-5 py-2.5 disabled:opacity-60`}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className={`${ui.btn} ${ui.ghost} px-5 py-2.5`}
                    disabled={saving}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Password */}
              <form onSubmit={changePassword} className={`${ui.card} p-6`}>
                <h2 className={ui.sectionTitle}>Change Password</h2>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Current */}
                  <div className={ui.field}>
                    <label htmlFor="current" className={ui.label}>Current Password</label>
                    <div className="relative">
                      <input
                        id="current"
                        type={showPwd.current ? 'text' : 'password'}
                        className={`${ui.input} pr-10`}
                        value={pwd.current}
                        onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => ({ ...s, current: !s.current }))}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                        aria-label={showPwd.current ? 'Hide' : 'Show'}
                      >
                        {showPwd.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New */}
                  <div className={ui.field}>
                    <label htmlFor="next" className={ui.label}>New Password</label>
                    <div className="relative">
                      <input
                        id="next"
                        type={showPwd.next ? 'text' : 'password'}
                        className={`${ui.input} pr-10`}
                        value={pwd.next}
                        onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                        placeholder="At least 8 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => ({ ...s, next: !s.next }))}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                        aria-label={showPwd.next ? 'Hide' : 'Show'}
                      >
                        {showPwd.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm */}
                  <div className={ui.field}>
                    <label htmlFor="confirm" className={ui.label}>Confirm Password</label>
                    <div className="relative">
                      <input
                        id="confirm"
                        type={showPwd.confirm ? 'text' : 'password'}
                        className={`${ui.input} pr-10`}
                        value={pwd.confirm}
                        onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                        placeholder="Repeat the new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => ({ ...s, confirm: !s.confirm }))}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                        aria-label={showPwd.confirm ? 'Hide' : 'Show'}
                      >
                        {showPwd.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <button type="submit" disabled={pwdSaving} className={`${ui.btn} ${ui.primary} px-5 py-2.5 disabled:opacity-60`}>
                    {pwdSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </form>
        </div>
      </main>
      {/* Billing portal help modal (shown when backend returns a `help` message) */}
      {portalHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPortalHelp(null)} />
          <div className="relative bg-white rounded-2xl shadow-lg max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900">Billing portal not configured</h3>
            <p className="mt-2 text-sm text-gray-700">{portalHelp}</p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <a
                href="https://dashboard.stripe.com/settings/billing/portal"
                target="_blank"
                rel="noreferrer"
                className={`${ui.btn} ${ui.primary} px-4 py-2`}
              >
                Open Stripe Dashboard
              </a>
              <button type="button" onClick={() => setPortalHelp(null)} className={`${ui.btn} ${ui.ghost} px-4 py-2`}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Billing details modal (show before redirecting to Stripe Portal) */}
      {showBillingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBillingModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-lg max-w-xl w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900">Manage Billing</h3>
            <p className="mt-2 text-sm text-gray-700">Review your current payment method and upcoming billing.</p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="rounded-lg border p-4">
                <div className="text-xs text-gray-500">Cardholder</div>
                <div className="mt-1 font-medium">{billingInfo?.paymentMethod?.name || billingInfo?.customer?.email || '-'}</div>
                <div className="text-sm text-gray-500 mt-1">{billingInfo?.paymentMethod ? `${billingInfo.paymentMethod.brand} •••• ${billingInfo.paymentMethod.last4}` : 'No card on file'}</div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-xs text-gray-500">Next billing date</div>
                <div className="mt-1 font-medium">{formatDate(billingInfo?.nextBillingDate || billingInfo?.subscription?.currentPeriodEnd)}</div>
                <div className="text-sm text-gray-500 mt-1">Status: {billingInfo?.subscription?.status || '—'}</div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBillingModal(false)}
                className={`${ui.btn} ${ui.ghost} px-4 py-2`}
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const resp = await axios.post('/api/billing/create-portal-session')
                    const url = resp.data?.url
                    if (url) window.location.href = url
                    else showToast('error', 'Failed to open billing portal')
                  } catch (err: any) {
                    const help = err?.response?.data?.help
                    setShowBillingModal(false)
                    if (help) setPortalHelp(help)
                    else showToast('error', err?.response?.data?.error || 'Failed to open billing portal')
                  }
                }}
                className={`${ui.btn} ${ui.primary} px-4 py-2`}
              >
                Open Billing Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
