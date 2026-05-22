const DEFAULT_BACKEND_PORT = '4000'

export type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
  meta?: Record<string, unknown>
}

export type BackendUser = {
  id: string
  email?: string
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  bannerUrl?: string | null
  emailVerified?: boolean
  provider?: string | null
  usernameChangedAt?: string | null
  createdAt?: string
  _count?: {
    posts: number
    comments: number
    followers: number
    following: number
    memberships?: number
  }
}

export type BackendPost = {
  id: string
  title: string
  content: string | null
  mediaUrl?: string | null
  score: number
  upvotes: number
  downvotes: number
  commentCount: number
  tags?: string[]
  createdAt: string
  author: BackendUser
  community?: { id: string; name: string; slug: string; avatarUrl?: string | null } | null
  _count?: { comments: number; savedBy: number }
  votes?: { value: number }[]
  savedBy?: { id: string }[]
}

export type BackendComment = {
  id: string
  parentId?: string | null
  body: string
  score: number
  createdAt: string
  author: BackendUser
  replies: BackendComment[]
}

export type BackendConversation = {
  id: string
  updatedAt: string
  participants: { user: BackendUser; lastReadAt: string | null }[]
  messages: BackendMessage[]
}

export type BackendMessage = {
  id: string
  conversationId?: string
  body: string
  createdAt: string
  senderId: string
  sender: BackendUser
}

export function backendBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '')

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location
    const port = process.env.NEXT_PUBLIC_BACKEND_PORT || DEFAULT_BACKEND_PORT
    return `${protocol}//${hostname}:${port}`
  }

  return `http://localhost:${DEFAULT_BACKEND_PORT}`
}

interface CacheEntry {
  data: ApiResponse<any>
  timestamp: number
  ttl: number
}

const DEFAULT_CACHE_TTL_MS = 60_000
const PROFILE_CACHE_TTL_MS = 5 * 60_000
const STATIC_CACHE_TTL_MS = 2 * 60_000

const apiCache = new Map<string, CacheEntry>()
const inflightRequests = new Map<string, Promise<any>>()

export function clearApiCache() {
  apiCache.clear()
  inflightRequests.clear()
}

function cacheKeyFor(method: string, path: string, body?: BodyInit | null) {
  return `${method.toUpperCase()}:${path}:${typeof body === 'string' ? body : ''}`
}

function ttlFor(path: string) {
  if (path.startsWith('/api/users') || path.startsWith('/api/settings') || path.startsWith('/api/auth/me')) {
    return PROFILE_CACHE_TTL_MS
  }
  if (path.startsWith('/api/communities/trending')) {
    return STATIC_CACHE_TTL_MS
  }
  return DEFAULT_CACHE_TTL_MS
}

function invalidateMatching(match: (key: string) => boolean) {
  for (const key of apiCache.keys()) {
    if (match(key)) apiCache.delete(key)
  }
}

function invalidateAfterMutation(path: string) {
  if (path.startsWith('/api/posts') || path.startsWith('/api/votes/posts')) {
    invalidateMatching((key) =>
      key.includes('/api/posts') ||
      key.includes('/api/users/me/saved-posts') ||
      key.includes('/api/users/') && key.includes('/posts'),
    )
    return
  }

  if (path.startsWith('/api/comments')) {
    invalidateMatching((key) => key.includes('/api/comments') || key.includes('/api/posts'))
    return
  }

  if (path.startsWith('/api/users') || path.startsWith('/api/settings')) {
    invalidateMatching((key) => key.includes('/api/users') || key.includes('/api/settings') || key.includes('/api/auth/me'))
  }
}

export function getCachedApiResponse<T>(path: string) {
  const cached = apiCache.get(cacheKeyFor('GET', path))
  if (!cached) return null

  const now = Date.now()
  if (now - cached.timestamp > cached.ttl) {
    apiCache.delete(cacheKeyFor('GET', path))
    return null
  }

  return cached.data as ApiResponse<T>
}

export function setCachedApiResponse<T>(path: string, data: ApiResponse<T>, ttl = ttlFor(path)) {
  apiCache.set(cacheKeyFor('GET', path), { data, timestamp: Date.now(), ttl })
}

async function executeRequest<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const headers = { ...init?.headers } as Record<string, string>

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${backendBaseUrl()}${path}`, {
    credentials: 'include',
    headers,
    ...init,
  })

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || 'Request failed')
  }
  return payload
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const method = init?.method || 'GET'
  const isGet = method.toUpperCase() === 'GET'

  if (!isGet) {
    invalidateAfterMutation(path)
  }

  const cacheKey = cacheKeyFor(method, path, init?.body)

  if (isGet) {
    const cached = apiCache.get(cacheKey)
    const now = Date.now()
    if (cached && (now - cached.timestamp < cached.ttl)) {
      return cached.data as ApiResponse<T>
    }

    let inflight = inflightRequests.get(cacheKey)
    if (!inflight) {
      inflight = (async () => {
        try {
          const res = await executeRequest<T>(path, init)
          apiCache.set(cacheKey, { data: res, timestamp: Date.now(), ttl: ttlFor(path) })
          return res
        } finally {
          inflightRequests.delete(cacheKey)
        }
      })()
      inflightRequests.set(cacheKey, inflight)
    }
    return inflight
  }

  return executeRequest<T>(path, init)
}

export function initialsFor(user?: Pick<BackendUser, 'displayName' | 'username' | 'email'> | null) {
  const source = user?.displayName || user?.username || user?.email || ''
  return source.slice(0, 2).toUpperCase() || 'U'
}

export function timeAgo(value: string) {
  const date = new Date(value).getTime()
  const diff = Math.max(0, Date.now() - date)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(value).toLocaleDateString()
}

export function getMediaUrl(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${backendBaseUrl()}${url}`
}

export function isVideoUrl(url?: string | null) {
  if (!url) return false
  const cleanUrl = url.toLowerCase().split('?')[0]
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.includes('/video/upload/') ||
    (cleanUrl.includes('res.cloudinary.com/') && cleanUrl.includes('/video/'))
  )
}
