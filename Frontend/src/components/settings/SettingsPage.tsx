'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Shield, Bell, Palette, Lock, Settings,
  Save, Loader2, Check, X, Camera, AlertTriangle,
  Monitor, Sun, Moon, ChevronDown, ChevronRight,
  Eye, EyeOff, MessageCircle, Users, Activity,
  Mail, Smartphone, LogOut, Trash2, KeyRound
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { apiRequest, type BackendUser } from '@/lib/api'
import { toast } from 'sonner'
import { applySettings } from '@/lib/settings'

const ease = [0.16, 1, 0.3, 1] as const

// ─── Types ───
interface UserSettings {
  theme: string
  accentColor: string
  uiDensity: string
  motionEffects: boolean
  privacy: Record<string, boolean>
  notifications: Record<string, boolean>
  security: Record<string, boolean | string | number>
}

interface SessionInfo {
  id: string
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  expiresAt: string
}

type SectionId = 'profile' | 'account' | 'privacy' | 'notifications' | 'appearance' | 'security'

const sections: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'account', label: 'Account', icon: Settings },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'security', label: 'Security', icon: Lock },
]

// ─── Toggle Component ───
// ─── Toggle Component ───
function SettingsToggle({ label, description, checked, onChange, disabled }: {
  label: string
  description?: string
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-foreground font-medium">{label}</p>
        {description && <p className="text-xs text-tertiary mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: checked ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)' }}
      >
        <motion.span
          className="absolute top-0.5 w-4 h-4 rounded-full"
          style={{ background: checked ? 'var(--background)' : '#A1A1AA' }}
          animate={{ left: checked ? 18 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  )
}

// ─── Section Wrapper ───
function SettingsSection({ id, icon: Icon, title, description, children, expanded, onToggle }: {
  id: string
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <motion.div
      className="surface rounded-lg overflow-hidden transition-premium"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-white/[0.01] transition-colors"
        id={`settings-section-${id}`}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
          <Icon className="w-4 h-4" style={{ color: expanded ? 'var(--primary)' : 'var(--text-tertiary)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground font-display tracking-editorial">{title}</h3>
          <p className="text-xs text-tertiary mt-0.5">{description}</p>
        </div>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="w-4 h-4 text-tertiary" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Save Button ───
function SaveButton({ saving, onSave, disabled }: { saving: boolean; onSave: () => void; disabled?: boolean }) {
  return (
    <motion.button
      onClick={onSave}
      disabled={saving || disabled}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer accent-bg transition-premium disabled:opacity-40 disabled:cursor-not-allowed mt-4"
      whileHover={{ opacity: 0.9 }}
      whileTap={{ scale: 0.97 }}
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      {saving ? 'Saving...' : 'Save Changes'}
    </motion.button>
  )
}

// ─── Main Settings Page ───
export default function SettingsPage() {
  const { user, setUser, logout } = useAuthStore()
  const [profile, setProfile] = useState<BackendUser | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSection, setExpandedSection] = useState<SectionId>('profile')
  const [activeMobileSection, setActiveMobileSection] = useState<SectionId | null>(null)

  // Profile form state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Settings save states
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [savingNotifs, setSavingNotifs] = useState(false)
  const [savingAppearance, setSavingAppearance] = useState(false)
  const [savingSecurity, setSavingSecurity] = useState(false)

  // Local settings state
  const [privacy, setPrivacy] = useState<Record<string, boolean>>({
    showProfile: true, showActivity: true, allowMessages: true, allowFollowers: true,
  })
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    email: true, push: true, threadActivity: true, follows: true, messages: true,
  })
  const [theme, setTheme] = useState('dark')
  const [accentColor, setAccentColor] = useState('#C7FF3F')
  const [uiDensity, setUiDensity] = useState('default')
  const [motionEffects, setMotionEffects] = useState(true)
  const [security, setSecurity] = useState<Record<string, boolean | string | number>>({ twoFactorEnabled: false })

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Revoking sessions
  const [revoking, setRevoking] = useState(false)

  // ─── Load data ───
  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [profileRes, settingsRes, sessionsRes] = await Promise.all([
        apiRequest<BackendUser>('/api/users/me/profile'),
        apiRequest<UserSettings>('/api/settings'),
        apiRequest<SessionInfo[]>('/api/users/me/sessions').catch(() => ({ data: [] as SessionInfo[] })),
      ])
      setProfile(profileRes.data)
      setSettings(settingsRes.data)
      setSessions(sessionsRes.data)

      setDisplayName(profileRes.data.displayName || '')
      setBio(profileRes.data.bio || '')

      const s = settingsRes.data
      setPrivacy(typeof s.privacy === 'object' && s.privacy ? s.privacy : { showProfile: true, showActivity: true, allowMessages: true, allowFollowers: true })
      setNotifications(typeof s.notifications === 'object' && s.notifications ? s.notifications : { email: true, push: true, threadActivity: true, follows: true, messages: true })
      setTheme(s.theme || 'dark')
      setAccentColor(s.accentColor || '#C7FF3F')
      setUiDensity(s.uiDensity || 'default')
      setMotionEffects(s.motionEffects !== false)
      setSecurity(typeof s.security === 'object' && s.security ? s.security : { twoFactorEnabled: false })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void loadData() }, [loadData])

  // ─── Save handlers ───
  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      const res = await apiRequest<BackendUser>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName: displayName.trim(), bio: bio.trim() }),
      })
      setProfile(res.data)
      if (user) {
        setUser({ ...user, displayName: res.data.displayName })
      }
      toast.success('Profile updated')
    } catch (err) {
      toast.error('Failed to save profile', { description: err instanceof Error ? err.message : 'Please try again' })
    } finally {
      setSavingProfile(false)
    }
  }

  const savePrivacy = async () => {
    setSavingPrivacy(true)
    try {
      await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ privacy }),
      })
      toast.success('Privacy settings saved')
    } catch (err) {
      toast.error('Failed to save privacy settings', { description: err instanceof Error ? err.message : 'Please try again' })
    } finally {
      setSavingPrivacy(false)
    }
  }

  const saveNotifications = async () => {
    setSavingNotifs(true)
    try {
      await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ notifications }),
      })
      toast.success('Notification preferences saved')
    } catch (err) {
      toast.error('Failed to save notification settings', { description: err instanceof Error ? err.message : 'Please try again' })
    } finally {
      setSavingNotifs(false)
    }
  }

  const saveAppearance = async () => {
    setSavingAppearance(true)
    try {
      await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ theme, accentColor, uiDensity, motionEffects }),
      })
      applySettings({ theme, accentColor, uiDensity, motionEffects })
      toast.success('Appearance settings saved')
    } catch (err) {
      toast.error('Failed to save appearance settings', { description: err instanceof Error ? err.message : 'Please try again' })
    } finally {
      setSavingAppearance(false)
    }
  }

  const saveSecurity = async () => {
    setSavingSecurity(true)
    try {
      await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ security }),
      })
      toast.success('Security settings saved')
    } catch (err) {
      toast.error('Failed to save security settings', { description: err instanceof Error ? err.message : 'Please try again' })
    } finally {
      setSavingSecurity(false)
    }
  }

  const handleRevokeSessions = async () => {
    setRevoking(true)
    try {
      await apiRequest('/api/users/me/revoke-sessions', { method: 'POST' })
      toast.success('All other sessions have been revoked')
      const sessionsRes = await apiRequest<SessionInfo[]>('/api/users/me/sessions').catch(() => ({ data: [] as SessionInfo[] }))
      setSessions(sessionsRes.data)
    } catch (err) {
      toast.error('Failed to revoke sessions', { description: err instanceof Error ? err.message : 'Please try again' })
    } finally {
      setRevoking(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    setDeleting(true)
    try {
      await apiRequest('/api/users/me', { method: 'DELETE' })
      toast.success('Account deleted')
      logout()
    } catch (err) {
      toast.error('Failed to delete account', { description: err instanceof Error ? err.message : 'Please try again' })
    } finally {
      setDeleting(false)
    }
  }

  const toggleSection = (id: SectionId) => {
    setExpandedSection(expandedSection === id ? id : id)
    setActiveMobileSection(activeMobileSection === id ? null : id)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
        <div className="h-8 w-32 rounded animate-pulse" style={{ background: 'var(--muted)' }} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="surface rounded-lg h-16 animate-pulse" />
        ))}
      </div>
    )
  }

  const accentPresets = ['#1A1A1A', '#F59E0B', '#C7FF3F', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        <h1 className="text-xl font-bold font-display text-foreground tracking-editorial">Settings</h1>
        <p className="text-xs text-tertiary mt-1">Manage your account, privacy, and preferences</p>
      </motion.div>

      <div className="flex gap-6">
        {/* Desktop section nav */}
        <nav className="hidden lg:block w-44 flex-shrink-0 sticky top-20 self-start">
          <div className="space-y-0.5">
            {sections.map((section) => {
              const isActive = expandedSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setExpandedSection(section.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-300 cursor-pointer"
                  style={{
                    background: isActive ? 'var(--sidebar-accent)' : 'transparent',
                  }}
                >
                  <section.icon className="w-4 h-4 transition-colors" style={{ color: isActive ? 'var(--primary)' : 'var(--text-tertiary)' }} />
                  <span className="text-xs font-semibold transition-colors" style={{ color: isActive ? 'var(--primary)' : 'var(--muted-foreground)' }}>{section.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* ── Section 1: Profile ── */}
          <SettingsSection
            id="profile"
            icon={User}
            title="Profile"
            description="Your public profile information"
            expanded={expandedSection === 'profile'}
            onToggle={() => toggleSection('profile')}
          >
            <div className="space-y-4 pt-4">
              {/* Avatar + Banner previews */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'var(--muted)', border: '1px solid var(--accent-border)' }}>
                    {profile?.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-foreground font-display">
                        {(profile?.displayName || profile?.username || 'U').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-foreground font-semibold">Profile photo</p>
                  <p className="text-xs text-tertiary">Use settings on the Profile page to upload</p>
                </div>
              </div>

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
                <p className="text-[10px] text-tertiary mt-1 font-medium">{displayName.length}/80 characters</p>
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
                <p className="text-[10px] text-tertiary mt-1 font-medium">{bio.length}/500 characters</p>
              </div>

              <SaveButton saving={savingProfile} onSave={saveProfile} />
            </div>
          </SettingsSection>

          {/* ── Section 2: Account ── */}
          <SettingsSection
            id="account"
            icon={Settings}
            title="Account"
            description="Email, password, and verification"
            expanded={expandedSection === 'account'}
            onToggle={() => toggleSection('account')}
          >
            <div className="space-y-4 pt-4">
              {/* Email */}
              <div>
                <label className="text-xs font-medium text-secondary block mb-1.5">Email</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                  <Mail className="w-3.5 h-3.5 text-tertiary" />
                  <span className="text-sm text-foreground font-semibold">{profile?.email || user?.email || '—'}</span>
                </div>
              </div>

              {/* Verification status */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-foreground font-semibold">Email Verification</p>
                  <p className="text-xs text-tertiary">Your account verification status</p>
                </div>
                <span
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
                  style={{
                    background: profile?.emailVerified ? 'rgba(199,255,63,0.08)' : 'rgba(255,77,77,0.08)',
                    color: profile?.emailVerified ? '#C7FF3F' : '#FF4D4D',
                    border: profile?.emailVerified ? '1px solid rgba(199,255,63,0.15)' : '1px solid rgba(255,77,77,0.15)',
                  }}
                >
                  {profile?.emailVerified ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {profile?.emailVerified ? 'Verified' : 'Not verified'}
                </span>
              </div>

              {/* Provider */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-foreground font-semibold">Linked Provider</p>
                  <p className="text-xs text-tertiary">Authentication method</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}>
                  {(profile as BackendUser & { provider?: string })?.provider || 'email'}
                </span>
              </div>

              {/* Password Reset */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-foreground font-semibold">Password</p>
                  <p className="text-xs text-tertiary">Reset your account password</p>
                </div>
                <button
                  onClick={() => {
                    toast.info('Password reset', { description: 'Check your email for reset instructions.' })
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-foreground cursor-pointer hover:bg-white/[0.02] border border-white/[0.04] transition-all hover:text-[#C7FF3F] hover:border-[#C7FF3F]/30"
                  style={{ background: 'var(--muted)' }}
                >
                  Reset Password
                </button>
              </div>
            </div>
          </SettingsSection>

          {/* ── Section 3: Privacy ── */}
          <SettingsSection
            id="privacy"
            icon={Shield}
            title="Privacy"
            description="Control who can see your content"
            expanded={expandedSection === 'privacy'}
            onToggle={() => toggleSection('privacy')}
          >
            <div className="pt-2">
              <SettingsToggle
                label="Public Profile"
                description="Allow anyone to view your profile page"
                checked={privacy.showProfile !== false}
                onChange={(v) => setPrivacy({ ...privacy, showProfile: v })}
              />
              <div className="editorial-line" />
              <SettingsToggle
                label="Activity Visibility"
                description="Show your activity status and post history"
                checked={privacy.showActivity !== false}
                onChange={(v) => setPrivacy({ ...privacy, showActivity: v })}
              />
              <div className="editorial-line" />
              <SettingsToggle
                label="Message Permissions"
                description="Allow others to send you direct messages"
                checked={privacy.allowMessages !== false}
                onChange={(v) => setPrivacy({ ...privacy, allowMessages: v })}
              />
              <div className="editorial-line" />
              <SettingsToggle
                label="Follower Permissions"
                description="Allow others to follow your account"
                checked={privacy.allowFollowers !== false}
                onChange={(v) => setPrivacy({ ...privacy, allowFollowers: v })}
              />
              <SaveButton saving={savingPrivacy} onSave={savePrivacy} />
            </div>
          </SettingsSection>

          {/* ── Section 4: Notifications ── */}
          <SettingsSection
            id="notifications"
            icon={Bell}
            title="Notifications"
            description="Manage how you receive updates"
            expanded={expandedSection === 'notifications'}
            onToggle={() => toggleSection('notifications')}
          >
            <div className="pt-2">
              <SettingsToggle
                label="Email Notifications"
                description="Receive important updates via email"
                checked={notifications.email !== false}
                onChange={(v) => setNotifications({ ...notifications, email: v })}
              />
              <div className="editorial-line" />
              <SettingsToggle
                label="Push Notifications"
                description="Get browser push notifications"
                checked={notifications.push !== false}
                onChange={(v) => setNotifications({ ...notifications, push: v })}
              />
              <div className="editorial-line" />
              <SettingsToggle
                label="Thread Activity"
                description="Notifications for replies and mentions in your threads"
                checked={notifications.threadActivity !== false}
                onChange={(v) => setNotifications({ ...notifications, threadActivity: v })}
              />
              <div className="editorial-line" />
              <SettingsToggle
                label="Follows"
                description="When someone follows your account"
                checked={notifications.follows !== false}
                onChange={(v) => setNotifications({ ...notifications, follows: v })}
              />
              <div className="editorial-line" />
              <SettingsToggle
                label="Messages"
                description="New direct message notifications"
                checked={notifications.messages !== false}
                onChange={(v) => setNotifications({ ...notifications, messages: v })}
              />
              <SaveButton saving={savingNotifs} onSave={saveNotifications} />
            </div>
          </SettingsSection>

          {/* ── Section 5: Appearance ── */}
          <SettingsSection
            id="appearance"
            icon={Palette}
            title="Appearance"
            description="Customize how Loomix looks"
            expanded={expandedSection === 'appearance'}
            onToggle={() => toggleSection('appearance')}
          >
            <div className="space-y-5 pt-4">
              {/* Theme */}
              <div>
                <label className="text-xs font-semibold text-secondary block mb-2">Theme</label>
                <div className="flex gap-2">
                  {([
                    { id: 'dark', icon: Moon, label: 'Dark' },
                    { id: 'light', icon: Sun, label: 'Light' },
                    { id: 'system', icon: Monitor, label: 'System' },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id); applySettings({ theme: t.id, accentColor, uiDensity, motionEffects }); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-300 cursor-pointer border"
                      style={{
                        background: theme === t.id ? 'var(--sidebar-accent)' : 'var(--muted)',
                        color: theme === t.id ? 'var(--primary)' : 'var(--muted-foreground)',
                        borderColor: theme === t.id ? 'var(--accent-border)' : 'var(--border)',
                      }}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="text-xs font-semibold text-secondary block mb-2">Accent Color</label>
                <div className="flex flex-wrap gap-2">
                  {accentPresets.map((color) => (
                    <button
                      key={color}
                      onClick={() => { setAccentColor(color); applySettings({ theme, accentColor: color, uiDensity, motionEffects }); }}
                      className="w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110"
                      style={{
                        background: color,
                        boxShadow: accentColor === color ? `0 0 0 2px var(--background), 0 0 0 3px ${color}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* UI Density */}
              <div>
                <label className="text-xs font-semibold text-secondary block mb-2">UI Density</label>
                <div className="flex gap-2">
                  {(['compact', 'default', 'comfortable'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => { setUiDensity(d); applySettings({ theme, accentColor, uiDensity: d, motionEffects }); }}
                      className="px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all duration-300 cursor-pointer border"
                      style={{
                        background: uiDensity === d ? 'var(--sidebar-accent)' : 'var(--muted)',
                        color: uiDensity === d ? 'var(--primary)' : 'var(--muted-foreground)',
                        borderColor: uiDensity === d ? 'var(--accent-border)' : 'var(--border)',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Motion */}
              <SettingsToggle
                label="Motion Effects"
                description="Enable animations and transitions throughout the app"
                checked={motionEffects}
                onChange={(v) => { setMotionEffects(v); applySettings({ theme, accentColor, uiDensity, motionEffects: v }); }}
              />

              <SaveButton saving={savingAppearance} onSave={saveAppearance} />
            </div>
          </SettingsSection>

          {/* ── Section 6: Security ── */}
          <SettingsSection
            id="security"
            icon={Lock}
            title="Security"
            description="Protect your account"
            expanded={expandedSection === 'security'}
            onToggle={() => toggleSection('security')}
          >
            <div className="space-y-4 pt-4">
              {/* 2FA */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground font-semibold">Two-Factor Authentication</p>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold" style={{ background: 'rgba(199,255,63,0.08)', color: '#C7FF3F', border: '1px solid rgba(199,255,63,0.15)' }}>
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-tertiary mt-0.5">Add an extra layer of security to your account</p>
                </div>
                <KeyRound className="w-4 h-4 text-tertiary" />
              </div>

              <div className="editorial-line" />

              {/* Active Sessions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm text-foreground font-semibold">Active Sessions</p>
                    <p className="text-xs text-tertiary">Devices currently logged into your account</p>
                  </div>
                  <span className="text-xs text-tertiary font-medium tabular-nums">{sessions.length} active</span>
                </div>
                {sessions.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {sessions.slice(0, 5).map((session) => (
                      <div key={session.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
                        <Smartphone className="w-3.5 h-3.5 text-tertiary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground font-semibold truncate">{session.userAgent?.slice(0, 60) || 'Unknown device'}</p>
                          <p className="text-[10px] text-tertiary">{session.ipAddress || 'Unknown IP'} · {new Date(session.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleRevokeSessions}
                  disabled={revoking}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-300 border hover:bg-[#FF6B6B]/15 bg-[#FF6B6B]/5 text-[#FF6B6B] border-[#FF6B6B]/30 disabled:opacity-40"
                >
                  {revoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  Logout All Other Devices
                </button>
              </div>

              <div className="editorial-line" />

              {/* Delete Account */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-[#FF4D4D]" />
                  <p className="text-sm font-semibold text-[#FF4D4D]">Danger Zone</p>
                </div>
                <p className="text-xs text-tertiary mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-300 border hover:bg-[#FF4D4D]/15 bg-[#FF4D4D]/5 text-[#FF4D4D] border-[#FF4D4D]/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Account
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg border"
                    style={{ background: 'rgba(255,77,77,0.02)', borderColor: 'rgba(255,77,77,0.1)' }}
                  >
                    <p className="text-xs text-foreground mb-2">Type <strong className="text-[#FF4D4D]">DELETE</strong> to confirm:</p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm text-foreground outline-none mb-2 font-medium"
                      style={{ background: 'var(--muted)', border: '1px solid rgba(255,77,77,0.2)' }}
                      placeholder="DELETE"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || deleting}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer bg-[#FF4D4D] text-[#050505] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer text-secondary hover:bg-white/[0.02] hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  )
}
