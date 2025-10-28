// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
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
        // Load current data
        const { data } = await axios.get('/api/user/me')
        if (!mounted) return
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
      } catch {
        // non-blocking
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const showToast = (kind: 'success' | 'error', msg: string) => {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 3500)
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
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Profile Settings</h1>
            <span className={ui.badge}>Secure & Private</span>
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
    </div>
  )
}

export default ProfilePage
