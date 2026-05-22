import { apiRequest, backendBaseUrl, type BackendUser } from './api'

const BACKEND_USER_CACHE_KEY = 'loomix_backend_user_cache'
const BACKEND_USER_CACHE_TTL_MS = 5 * 60_000

export type BackendSyncProfile = {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  username: string
  emailVerified: boolean
  provider: string
}

type CachedBackendUser = {
  uid: string
  user: BackendUser
  timestamp: number
}

export function loadCachedBackendUser(uid?: string | null) {
  if (typeof window === 'undefined' || !uid) return null

  try {
    const raw = localStorage.getItem(BACKEND_USER_CACHE_KEY)
    if (!raw) return null

    const cached = JSON.parse(raw) as CachedBackendUser
    if (cached.uid !== uid || Date.now() - cached.timestamp > BACKEND_USER_CACHE_TTL_MS) {
      return null
    }

    return cached.user
  } catch {
    return null
  }
}

export function cacheBackendUser(uid: string, user: BackendUser) {
  if (typeof window === 'undefined') return
  localStorage.setItem(BACKEND_USER_CACHE_KEY, JSON.stringify({ uid, user, timestamp: Date.now() }))
}

export function clearCachedBackendUser() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(BACKEND_USER_CACHE_KEY)
}

export async function syncUserWithBackend(profile: BackendSyncProfile) {
  try {
    const response = await fetch(`${backendBaseUrl()}/api/auth/firebase-sync`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid: profile.uid,
        email: profile.email || '',
        username: profile.username,
        displayName: profile.displayName || profile.username,
        avatarUrl: profile.photoURL || '',
        provider: profile.provider,
        emailVerified: profile.emailVerified,
      }),
    })
    if (!response.ok) {
      const err = await response.json()
      console.warn('Backend sync warning:', err)
      return null
    }
    const payload = await response.json()
    const user = payload.data?.user as BackendUser
    if (user) cacheBackendUser(profile.uid, user)
    return user
  } catch (error) {
    console.error('Backend sync failed. Standalone fallback active:', error)
    return null
  }
}

export async function getBackendMe() {
  return apiRequest<BackendUser>('/api/auth/me').then((response) => response.data)
}
