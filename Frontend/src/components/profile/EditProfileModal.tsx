'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Save, Loader2, Check, AlertCircle, Camera,
  Clock, User
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { apiRequest, type BackendUser } from '@/lib/api'
import { toast } from 'sonner'

const ease = [0.16, 1, 0.3, 1] as const

interface EditProfileModalProps {
  open: boolean
  onClose: () => void
  profile: BackendUser | null
  onSaved: () => void
}

export default function EditProfileModal({ open, onClose, profile, onSaved }: EditProfileModalProps) {
  const { user, setUser } = useAuthStore()

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)

  // Username validation
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'cooldown'>('idle')
  const [usernameMessage, setUsernameMessage] = useState('')
  const [cooldownDays, setCooldownDays] = useState<number | null>(null)
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const originalUsername = useRef('')

  // Save state
  const [saving, setSaving] = useState(false)

  // Image preview
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  // Initialize form when profile loads or modal opens
  useEffect(() => {
    if (profile && open) {
      setDisplayName(profile.displayName || '')
      setUsername(profile.username || '')
      setBio(profile.bio || '')
      setAvatarUrl(profile.avatarUrl || null)
      setBannerUrl(profile.bannerUrl || null)
      setAvatarPreview(null)
      setBannerPreview(null)
      originalUsername.current = profile.username || ''
      setUsernameStatus('idle')
      setUsernameMessage('')

      // Calculate cooldown
      const changedAt = (profile as BackendUser & { usernameChangedAt?: string })?.usernameChangedAt
      if (changedAt) {
        const daysSince = Math.floor((Date.now() - new Date(changedAt).getTime()) / (1000 * 60 * 60 * 24))
        if (daysSince < 60) {
          setCooldownDays(60 - daysSince)
        } else {
          setCooldownDays(null)
        }
      } else {
        setCooldownDays(null)
      }
    }
  }, [profile, open])

  // Debounced username check
  const checkUsername = useCallback(async (value: string) => {
    if (value === originalUsername.current) {
      setUsernameStatus('idle')
      setUsernameMessage('')
      return
    }

    // Client-side validation
    if (value.length < 3) {
      setUsernameStatus('invalid')
      setUsernameMessage('Username must be at least 3 characters')
      return
    }
    if (value.length > 30) {
      setUsernameStatus('invalid')
      setUsernameMessage('Username must be at most 30 characters')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameStatus('invalid')
      setUsernameMessage('Only letters, numbers, and underscores')
      return
    }

    // Check cooldown
    if (cooldownDays !== null && cooldownDays > 0) {
      setUsernameStatus('cooldown')
      setUsernameMessage(`You can change your username again in ${cooldownDays} day${cooldownDays === 1 ? '' : 's'}`)
      return
    }

    setUsernameStatus('checking')
    setUsernameMessage('Checking availability...')

    try {
      const res = await apiRequest<{ available: boolean; username: string }>(`/api/users/check-username/${value.toLowerCase()}`)
      if (res.data.available) {
        setUsernameStatus('available')
        setUsernameMessage('Username is available')
      } else {
        setUsernameStatus('taken')
        setUsernameMessage('Username is already taken')
      }
    } catch {
      setUsernameStatus('invalid')
      setUsernameMessage('Could not check availability')
    }
  }, [cooldownDays])

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    if (usernameTimer.current) clearTimeout(usernameTimer.current)
    if (value === originalUsername.current) {
      setUsernameStatus('idle')
      setUsernameMessage('')
      return
    }
    usernameTimer.current = setTimeout(() => checkUsername(value), 500)
  }

  // Handle image selection (preview only — no actual upload in this modal for simplicity)
  const handleImageSelect = (type: 'avatar' | 'banner', file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const url = e.target?.result as string
      if (type === 'avatar') {
        setAvatarPreview(url)
      } else {
        setBannerPreview(url)
      }
    }
    reader.readAsDataURL(file)

    // Upload to media endpoint
    const formData = new FormData()
    formData.append('file', file)
    formData.append('kind', type === 'avatar' ? 'AVATAR' : 'BANNER')

    apiRequest<{ url: string }>('/api/media', {
      method: 'POST',
      headers: {}, // Let browser set content-type for FormData
      body: formData as unknown as string,
    }).then((res) => {
      if (type === 'avatar') {
        setAvatarUrl(res.data.url)
      } else {
        setBannerUrl(res.data.url)
      }
      toast.success(`${type === 'avatar' ? 'Profile photo' : 'Banner'} uploaded`)
    }).catch(() => {
      toast.error(`Failed to upload ${type}`, { description: 'Image upload may not be configured. Your changes to other fields will still save.' })
    })
  }

  // Save
  const handleSave = async () => {
    setSaving(true)
    try {
      // Update username if changed
      const usernameChanged = username !== originalUsername.current
      if (usernameChanged) {
        if (usernameStatus === 'cooldown' || usernameStatus === 'taken' || usernameStatus === 'invalid') {
          toast.error('Cannot save', { description: usernameMessage })
          setSaving(false)
          return
        }
        if (usernameStatus !== 'available' && usernameStatus !== 'idle') {
          toast.error('Please wait for username check to complete')
          setSaving(false)
          return
        }

        await apiRequest('/api/users/me/username', {
          method: 'PATCH',
          body: JSON.stringify({ username: username.toLowerCase() }),
        })
      }

      // Update profile
      const profilePayload: Record<string, string | null | undefined> = {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      }
      if (avatarUrl !== profile?.avatarUrl) profilePayload.avatarUrl = avatarUrl
      if (bannerUrl !== profile?.bannerUrl) profilePayload.bannerUrl = bannerUrl

      const res = await apiRequest<BackendUser>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify(profilePayload),
      })

      // Update auth store
      if (user) {
        setUser({
          ...user,
          displayName: res.data.displayName,
          username: usernameChanged ? username.toLowerCase() : user.username,
          photoURL: res.data.avatarUrl || user.photoURL,
          bio: res.data.bio,
        })
      }

      toast.success('Profile updated successfully')
      onSaved()
      onClose()
    } catch (err) {
      toast.error('Failed to save profile', { description: err instanceof Error ? err.message : 'Please try again' })
    } finally {
      setSaving(false)
    }
  }

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const usernameStatusColor = {
    idle: '#555555',
    checking: '#888888',
    available: '#C7FF3F',
    taken: '#FF4444',
    invalid: '#FF4444',
    cooldown: '#FFEAA7',
  }[usernameStatus]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl"
            style={{ background: 'var(--popover)', border: '1px solid var(--border)' }}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.35, ease }}
          >
            {/* Banner */}
            <div
              className="relative h-28 rounded-t-xl overflow-hidden cursor-pointer group"
              style={{ background: 'var(--muted)' }}
              onClick={() => bannerInputRef.current?.click()}
            >
              {(bannerPreview || bannerUrl) && (
                <img src={bannerPreview || bannerUrl || ''} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImageSelect('banner', f)
                }}
              />
            </div>

            {/* Avatar overlay */}
            <div className="px-5 -mt-10 relative z-10">
              <div
                className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer group"
                style={{ background: 'var(--popover)', border: '3px solid var(--popover)' }}
                onClick={() => avatarInputRef.current?.click()}
              >
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'var(--muted)', border: '1px solid var(--accent-border)' }}>
                  {(avatarPreview || avatarUrl) ? (
                    <img src={avatarPreview || avatarUrl || ''} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-foreground font-display">
                      {(displayName || username || 'U').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImageSelect('avatar', f)
                  }}
                />
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer z-20 hover:bg-white/10 transition-colors"
              style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--foreground)' }}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Form */}
            <div className="px-5 pb-5 pt-3 space-y-4">
              <h2 className="text-lg font-semibold font-display text-foreground">Edit Profile</h2>

              {/* Display Name */}
              <div>
                <label className="text-xs font-medium text-secondary block mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder-[#555555] outline-none focus:ring-1 focus:ring-[#C7FF3F]/50 transition-all font-medium"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                  placeholder="Your display name"
                />
              </div>

              {/* Username */}
              <div>
                <label className="text-xs font-medium text-secondary block mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-tertiary">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    maxLength={30}
                    className="w-full pl-7 pr-9 py-2.5 rounded-lg text-sm text-foreground placeholder-[#555555] outline-none focus:ring-1 focus:ring-[#C7FF3F]/50 transition-all font-medium"
                    style={{ background: 'var(--muted)', border: `1px solid ${usernameStatus === 'idle' ? 'var(--border)' : usernameStatusColor + '33'}` }}
                    placeholder="username"
                    disabled={cooldownDays !== null && cooldownDays > 0}
                  />
                  {/* Status indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#888888' }} />}
                    {usernameStatus === 'available' && <Check className="w-4 h-4" style={{ color: '#C7FF3F' }} />}
                    {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <AlertCircle className="w-4 h-4" style={{ color: '#FF4444' }} />}
                    {usernameStatus === 'cooldown' && <Clock className="w-4 h-4" style={{ color: '#FFEAA7' }} />}
                  </div>
                </div>
                {usernameMessage && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] mt-1.5 flex items-center gap-1 font-medium"
                    style={{ color: usernameStatusColor }}
                  >
                    {usernameMessage}
                  </motion.p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-medium text-secondary block mb-1.5">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-foreground placeholder-[#555555] resize-none outline-none focus:ring-1 focus:ring-[#C7FF3F]/50 transition-all font-medium"
                  style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                  placeholder="Tell people about yourself..."
                />
                <p className="text-[10px] text-tertiary mt-1 font-medium">{bio.length}/500</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <motion.button
                  onClick={handleSave}
                  disabled={saving || usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking'}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer accent-bg transition-premium disabled:opacity-40 disabled:cursor-not-allowed"
                  whileHover={{ opacity: 0.9 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </motion.button>
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer text-secondary hover:bg-white/[0.02] hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
