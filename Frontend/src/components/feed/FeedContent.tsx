'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { PostCard, type Post } from './PostCard'
import { CreatePostModal, type OptimisticPostDraft } from './CreatePostModal'
import { useAppStore } from '@/stores/app-store'
import { Plus, Sparkles, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { apiRequest, initialsFor, timeAgo, type BackendPost } from '@/lib/api'

const PAGE_SIZE = 12
const FEED_CACHE_TTL_MS = 2 * 60_000

const FEED_TABS = [
  { id: 'foryou', label: 'For You', sort: 'new' },
  { id: 'trending', label: 'Trending', sort: 'trending' },
  { id: 'latest', label: 'Latest', sort: 'new' },
] as const

type FeedTabId = (typeof FEED_TABS)[number]['id']
type FeedMode = 'feed' | 'explore' | 'community'
type FeedMeta = { page?: number; limit?: number; totalPages?: number; hasMore?: boolean; nextPage?: number | null }

type CachedFeedState = {
  posts: Post[]
  page: number
  hasMore: boolean
  timestamp: number
}

const feedStateCache = new Map<string, CachedFeedState>()

function feedCacheKeyFor(mode: FeedMode, sort: string, community?: string) {
  return `${mode}:${community || 'all'}:${sort}`
}

function readFeedCache(key: string) {
  const cached = feedStateCache.get(key)
  if (!cached) return null

  if (Date.now() - cached.timestamp > FEED_CACHE_TTL_MS) {
    feedStateCache.delete(key)
    return null
  }

  return cached
}

function writeFeedCache(key: string, posts: Post[], page: number, hasMore: boolean) {
  feedStateCache.set(key, { posts, page, hasMore, timestamp: Date.now() })
}

function buildPostPath(sort: string, page: number, community?: string) {
  const params = new URLSearchParams({
    sort,
    page: String(page),
    limit: String(PAGE_SIZE),
  })

  if (community) params.set('community', community)
  return `/api/posts?${params.toString()}`
}

function mergeUniquePosts(current: Post[], incoming: Post[]) {
  const seen = new Set<string>()
  const merged: Post[] = []

  for (const post of [...current, ...incoming]) {
    if (seen.has(post.id)) continue
    seen.add(post.id)
    merged.push(post)
  }

  return merged
}

function mergeFreshPosts(current: Post[], incoming: Post[]) {
  const optimisticPosts = current.filter((post) => post.isOptimistic)
  const incomingIds = new Set(incoming.map((post) => post.id))
  return [...optimisticPosts.filter((post) => !incomingIds.has(post.id)), ...incoming]
}

function mapPost(post: BackendPost): Post {
  const vote = post.votes?.[0]?.value
  return {
    id: post.id,
    community: {
      name: post.community ? `r/${post.community.slug}` : 'Thread',
      avatar: post.community?.name?.slice(0, 1).toUpperCase() || 'T',
      color: 'var(--primary)',
    },
    author: {
      name: post.author.displayName || post.author.username,
      avatar: initialsFor(post.author),
    },
    title: post.title,
    content: post.content || '',
    image: post.mediaUrl || undefined,
    votes: post.score ?? post.upvotes - post.downvotes,
    comments: post._count?.comments ?? post.commentCount ?? 0,
    timestamp: timeAgo(post.createdAt),
    userVote: vote === 1 ? 'up' : vote === -1 ? 'down' : null,
    isSaved: Boolean(post.savedBy?.length),
  }
}

function EmptyFeed({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="surface rounded-lg p-8 text-center">
      <div
        className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center"
        style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Sparkles className="w-5 h-5 text-tertiary" />
      </div>
      <h3 className="font-display text-lg font-semibold mb-2 text-[#F5F5F5]">No discussions yet</h3>
      <p className="text-secondary text-sm max-w-sm mx-auto mb-5">
        Be the first to start a thread. New discussions will show up here.
      </p>
      <button className="accent-bg rounded px-4 py-2 text-xs font-medium cursor-pointer" onClick={onCreate}>
        Be the first to start a thread
      </button>
    </div>
  )
}

function ConnectionErrorPanel({ onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="surface rounded-lg p-8 text-center border border-red-500/10 bg-red-500/[0.01]">
      <div
        className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center"
        style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)' }}
      >
        <AlertTriangle className="w-5 h-5 text-[#FF4444]" />
      </div>
      <h3 className="font-display text-base font-semibold mb-2 text-[#F5F5F5]">Unable to load feed right now</h3>
      <p className="text-secondary text-xs max-w-xs mx-auto mb-5">
        We encountered a backend connection failure or network request error. Please try again.
      </p>
      <button
        className="px-4 py-2 rounded text-xs font-medium cursor-pointer transition-premium bg-white/5 hover:bg-white/10 text-[#F5F5F5] border border-white/10 active:scale-95 inline-flex items-center gap-1.5"
        onClick={onRetry}
      >
        Please try again
      </button>
    </div>
  )
}

export function FeedContent({ mode = 'feed', community, title }: { mode?: FeedMode; community?: string; title?: string }) {
  const setCreatePostOpen = useAppStore((state) => state.setCreatePostOpen)
  const [activeTab, setActiveTab] = useState<FeedTabId>('foryou')
  const initialCacheKey = feedCacheKeyFor(mode, FEED_TABS[0].sort, community)
  const initialCache = readFeedCache(initialCacheKey)
  const [posts, setPosts] = useState<Post[]>(() => initialCache?.posts ?? [])
  const [loading, setLoading] = useState(() => !initialCache)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(() => initialCache?.page ?? 1)
  const [hasMore, setHasMore] = useState(() => initialCache?.hasMore ?? true)
  const [loadingMore, setLoadingMore] = useState(false)
  const user = useAuthStore((state) => state.user)
  const setAuthModalOpen = useAuthStore((state) => state.setAuthModalOpen)
  const endRef = useRef<HTMLDivElement | null>(null)
  const requestIdRef = useRef(0)

  const selectedTab = useMemo(() => FEED_TABS.find((tab) => tab.id === activeTab) || FEED_TABS[0], [activeTab])
  const feedCacheKey = useMemo(
    () => feedCacheKeyFor(mode, selectedTab.sort, community),
    [community, mode, selectedTab.sort],
  )

  const openCreate = useCallback(() => {
    if (!user) {
      toast.error('Authentication required', {
        description: 'Please sign in to create posts.',
      })
      setAuthModalOpen(true, 'login')
      return
    }
    setCreatePostOpen(true)
  }, [setAuthModalOpen, setCreatePostOpen, user])

  const loadPosts = useCallback(async (pageNumber = 1, options: { background?: boolean } = {}) => {
    const requestId = ++requestIdRef.current
    if (pageNumber === 1) {
      setError(null)
      if (!options.background) setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const response = await apiRequest<BackendPost[]>(buildPostPath(selectedTab.sort, pageNumber, community))
      if (pageNumber === 1 && requestId !== requestIdRef.current) return

      const mapped = response.data.map(mapPost)
      const meta = response.meta as FeedMeta | undefined
      const nextHasMore =
        typeof meta?.hasMore === 'boolean'
          ? meta.hasMore
          : meta?.totalPages
            ? pageNumber < meta.totalPages
            : mapped.length >= PAGE_SIZE

      setPosts((prev) => {
        const nextPosts = pageNumber === 1 ? mergeFreshPosts(prev, mapped) : mergeUniquePosts(prev, mapped)
        writeFeedCache(feedCacheKey, nextPosts, pageNumber, nextHasMore)
        return nextPosts
      })
      setHasMore(nextHasMore)
      setPage(pageNumber)
    } catch (err) {
      if (pageNumber === 1) {
        setError(err instanceof Error ? err.message : 'Could not load posts')
        if (!options.background) setPosts([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [community, feedCacheKey, selectedTab.sort])

  useEffect(() => {
    const cached = readFeedCache(feedCacheKey)
    requestIdRef.current += 1

    if (cached) {
      setPosts(cached.posts)
      setPage(cached.page)
      setHasMore(cached.hasMore)
      setLoading(false)
      setError(null)
      void loadPosts(1, { background: true })
      return
    }

    setPosts([])
    setPage(1)
    setHasMore(true)
    void loadPosts(1)
  }, [feedCacheKey, loadPosts])

  useEffect(() => {
    if (loading || !hasMore || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadPosts(page + 1)
        }
      },
      { rootMargin: '420px 0px', threshold: 0.01 },
    )

    const target = endRef.current
    if (target) observer.observe(target)

    return () => observer.disconnect()
  }, [hasMore, loadPosts, loading, loadingMore, page])

  const handleOptimisticPost = useCallback((draft: OptimisticPostDraft) => {
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticPost: Post = {
      id: optimisticId,
      community: { name: community ? `r/${community}` : 'Thread', avatar: 'T', color: 'var(--primary)' },
      author: {
        name: user?.displayName || user?.username || user?.email || 'You',
        avatar: initialsFor({
          displayName: user?.displayName ?? null,
          username: user?.username || user?.email || 'you',
          email: user?.email ?? undefined,
        }),
      },
      title: draft.title,
      content: draft.content,
      image: draft.mediaUrl,
      votes: 0,
      comments: 0,
      timestamp: 'now',
      userVote: null,
      isSaved: false,
      isOptimistic: true,
    }

    setPosts((prev) => {
      const nextPosts = [optimisticPost, ...prev]
      writeFeedCache(feedCacheKey, nextPosts, page, hasMore)
      return nextPosts
    })
    return optimisticId
  }, [community, feedCacheKey, hasMore, page, user])

  const handleCreated = useCallback((post: BackendPost, optimisticId?: string) => {
    const mapped = mapPost(post)
    setPosts((prev) => {
      const replaced = optimisticId ? prev.map((item) => (item.id === optimisticId ? mapped : item)) : [mapped, ...prev]
      const nextPosts = mergeUniquePosts([], replaced)
      writeFeedCache(feedCacheKey, nextPosts, page, hasMore)
      return nextPosts
    })
  }, [feedCacheKey, hasMore, page])

  const handleCreateFailed = useCallback((optimisticId?: string) => {
    if (!optimisticId) return
    setPosts((prev) => {
      const nextPosts = prev.filter((post) => post.id !== optimisticId)
      writeFeedCache(feedCacheKey, nextPosts, page, hasMore)
      return nextPosts
    })
  }, [feedCacheKey, hasMore, page])

  const heading = title || (mode === 'explore' ? 'Explore' : mode === 'community' ? 'Community' : 'Feed')

  return (
    <div className="min-h-screen">
      <CreatePostModal
        onOptimisticPost={handleOptimisticPost}
        onCreated={handleCreated}
        onCreateFailed={handleCreateFailed}
      />

      <div
        className="sticky top-16 z-30"
        style={{
          background: 'var(--background)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-11">
            <h2 className="font-display font-semibold text-sm" style={{ color: '#F5F5F5' }}>
              {heading}
            </h2>

            <div className="flex items-center gap-1">
              {FEED_TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                    style={{ color: isActive ? 'var(--primary)' : '#555555' }}
                  >
                    {tab.label}
                    {isActive && (
                      <motion.div
                        layoutId={`${mode}TabIndicator`}
                        className="absolute bottom-0 left-1 right-1"
                        style={{ height: '1px', background: 'var(--primary)' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            <motion.button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium accent-bg cursor-pointer"
              whileHover={{ opacity: 0.9 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={13} />
              <span>Thread</span>
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-3 space-y-3">
        <motion.div
          key={feedCacheKey}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="space-y-3"
        >
          {loading && [0, 1, 2].map((item) => <div key={item} className="surface rounded-lg h-36 animate-pulse" />)}
          {!loading && error && <ConnectionErrorPanel message={error} onRetry={() => loadPosts(1)} />}
          {!loading && !error && posts.length === 0 && <EmptyFeed onCreate={openCreate} />}
          {!loading && !error && posts.map((post, index) => <PostCard key={post.id} post={post} index={index} />)}
        </motion.div>

        <div ref={endRef} className="h-4" />

        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-[#C7FF3F] animate-spin" />
          </div>
        )}

        {!loading && !hasMore && posts.length > 0 && (
          <div className="flex flex-col items-center py-10 gap-2">
            <div className="editorial-line w-16" />
            <span className="text-tertiary text-xs">You&apos;re caught up</span>
          </div>
        )}
      </div>
    </div>
  )
}
