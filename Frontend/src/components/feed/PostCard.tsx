'use client'

import { useCallback, useEffect, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Share2, Bookmark, Link2, Check, ExternalLink } from 'lucide-react'
import { VoteButton } from './VoteButton'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { apiRequest, getMediaUrl, isVideoUrl } from '@/lib/api'
import { LazyImage } from '@/components/ui/LazyImage'

export interface Post {
  id: string
  community: { name: string; avatar: string; color: string }
  author: { name: string; avatar: string }
  title: string
  content: string
  image?: string
  votes: number
  comments: number
  timestamp: string
  userVote: 'up' | 'down' | null
  isSaved: boolean
  isOptimistic?: boolean
}

interface PostCardProps {
  post: Post
  index?: number
}

export const PostCard = memo(function PostCard({ post, index = 0 }: PostCardProps) {
  const setSelectedPost = useAppStore((state) => state.setSelectedPost)
  const [isSaved, setIsSaved] = useState(post.isSaved)
  const [saveAnimating, setSaveAnimating] = useState(false)
  const user = useAuthStore((state) => state.user)
  const setAuthModalOpen = useAuthStore((state) => state.setAuthModalOpen)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    setIsSaved(post.isSaved)
  }, [post.isSaved])

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (post.isOptimistic) return
    // Don't navigate if clicking on an interactive element
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[role="menu"]')) return
    setSelectedPost(post.id)
  }, [post.id, post.isOptimistic, setSelectedPost])

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (post.isOptimistic) return
    if (!user) {
      toast.error("Authentication required", {
        description: "Please sign in to save posts."
      })
      setAuthModalOpen(true, 'login')
      return
    }
    const nextSavedState = !isSaved
    setIsSaved(nextSavedState)
    setSaveAnimating(true)
    setTimeout(() => setSaveAnimating(false), 300)
    try {
      await apiRequest(`/api/posts/${post.id}/save`, {
        method: nextSavedState ? 'POST' : 'DELETE',
      })
      toast.success(nextSavedState ? 'Post saved to Bookmarks' : 'Post removed from Bookmarks')
    } catch (error) {
      setIsSaved(!nextSavedState)
      toast.error('Could not update saved posts', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (post.isOptimistic) return
    setShareMenuOpen(!shareMenuOpen)
  }

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (post.isOptimistic) return
    const url = `${window.location.origin}?post=${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => {
        setLinkCopied(false)
        setShareMenuOpen(false)
      }, 1500)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (post.isOptimistic) return
    const url = `${window.location.origin}?post=${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.content?.slice(0, 100) || post.title,
          url,
        })
        setShareMenuOpen(false)
      } catch {
        // User cancelled — that's fine
      }
    } else {
      handleCopyLink(e)
    }
  }

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (post.isOptimistic) return
    setSelectedPost(post.id)
  }

  // Close share menu on outside click
  const handleShareMenuClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setShareMenuOpen(false)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        delay: Math.min(index, 5) * 0.025,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      onClick={handleCardClick}
      className="surface rounded-lg cursor-pointer transition-premium group"
      whileHover={{
        y: -1,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex gap-3 p-4">
        {/* Vote column */}
        <div className="flex-shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
          <VoteButton
            postId={post.id}
            initialVotes={post.votes}
            initialUserVote={post.userVote}
            size="sm"
            disabled={post.isOptimistic}
          />
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          {/* Header row: community · author · time */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="accent-text text-xs font-medium">
              {post.community.name}
            </span>
            <span className="text-tertiary text-xs">·</span>
            <span className="text-secondary text-xs">
              {post.author.name}
            </span>
            <span className="text-tertiary text-xs">·</span>
            <span className="text-tertiary text-xs flex-shrink-0">
              {post.isOptimistic ? 'Posting...' : post.timestamp}
            </span>
          </div>

          {/* Title */}
          <h3
            className="font-display font-semibold text-base leading-snug mb-1 line-clamp-2"
            style={{ color: '#F5F5F5' }}
          >
            {post.title}
          </h3>

          {/* Content preview */}
          <p className="text-secondary text-sm line-clamp-2 leading-relaxed mb-3">
            {post.content}
          </p>

          {/* Optional media (Image or Video) */}
          {post.image && (
            <div className="mb-3 overflow-hidden rounded-lg border border-[var(--border)] bg-black/[0.2]" onClick={(e) => e.stopPropagation()}>
              {isVideoUrl(post.image) ? (
                <video
                  src={getMediaUrl(post.image)}
                  className="w-full max-h-96 object-contain rounded-lg"
                  controls
                  preload="metadata"
                  playsInline
                />
              ) : (
                <LazyImage
                  src={getMediaUrl(post.image)}
                  alt={post.title}
                  className="w-full max-h-96 object-cover rounded-lg"
                />
              )}
            </div>
          )}

          {/* Footer: small text actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleComment}
              className="flex items-center gap-1 text-tertiary text-xs hover:text-secondary transition-colors duration-150 cursor-pointer"
              aria-label={`${post.comments} comments`}
            >
              <MessageCircle size={13} />
              <span>{post.comments}</span>
            </button>

            {/* Share with dropdown */}
            <div className="relative">
              <button
                onClick={handleShare}
                className="flex items-center gap-1 text-tertiary text-xs hover:text-secondary transition-colors duration-150 cursor-pointer"
                aria-label="Share"
              >
                <Share2 size={13} />
                <span>Share</span>
              </button>

              <AnimatePresence>
                {shareMenuOpen && (
                  <>
                    {/* Invisible backdrop to close menu */}
                    <div className="fixed inset-0 z-40" onClick={handleShareMenuClose} />
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 bottom-full mb-1 z-50 w-44 rounded-lg overflow-hidden shadow-2xl"
                      style={{ background: 'var(--popover)', border: '1px solid var(--border)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#F5F5F5] hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        {linkCopied ? <Check size={13} className="accent-text" /> : <Link2 size={13} />}
                        <span>{linkCopied ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                      {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <button
                          onClick={handleNativeShare}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#F5F5F5] hover:bg-white/[0.04] transition-colors cursor-pointer"
                        >
                          <ExternalLink size={13} />
                          <span>Share via...</span>
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={handleSave}
              className="flex items-center gap-1 text-xs transition-colors duration-150 cursor-pointer ml-auto"
              style={{
                color: isSaved ? 'var(--primary)' : '#555555',
              }}
              onMouseEnter={(e) => {
                if (!isSaved) (e.currentTarget as HTMLElement).style.color = '#888888'
              }}
              onMouseLeave={(e) => {
                if (!isSaved) (e.currentTarget as HTMLElement).style.color = '#555555'
              }}
              aria-label={isSaved ? 'Unsave' : 'Save'}
            >
              <motion.span
                animate={saveAnimating ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex"
              >
                <Bookmark size={13} fill={isSaved ? 'var(--primary)' : 'none'} />
              </motion.span>
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
})
