'use client'

import { useState, memo } from 'react'
import { motion } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { apiRequest } from '@/lib/api'

interface VoteButtonProps {
  postId: string
  initialVotes: number
  initialUserVote: 'up' | 'down' | null
  onVote?: (vote: 'up' | 'down' | null) => void
  size?: 'sm' | 'default'
  disabled?: boolean
}

export const VoteButton = memo(function VoteButton({
  postId,
  initialVotes,
  initialUserVote,
  onVote,
  size = 'default',
  disabled = false,
}: VoteButtonProps) {
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(initialUserVote)
  const [votes, setVotes] = useState(initialVotes)
  const [animatingDirection, setAnimatingDirection] = useState<'up' | 'down' | null>(null)
  const [isVoting, setIsVoting] = useState(false)
  const { user, setAuthModalOpen } = useAuthStore()

  const handleVote = async (direction: 'up' | 'down') => {
    if (isVoting || disabled) return

    let newVote: 'up' | 'down' | null = null
    let voteDelta = 0

    if (userVote === direction) {
      newVote = null
      voteDelta = direction === 'up' ? -1 : 1
    } else if (userVote === null) {
      newVote = direction
      voteDelta = direction === 'up' ? 1 : -1
    } else {
      newVote = direction
      voteDelta = direction === 'up' ? 2 : -2
    }

    // Optimistic update
    const prevVote = userVote
    const prevVotes = votes
    setAnimatingDirection(direction)
    setTimeout(() => setAnimatingDirection(null), 200)
    setUserVote(newVote)
    setVotes((prev) => prev + voteDelta)
    onVote?.(newVote)

    // API call
    setIsVoting(true)
    try {
      const apiValue = newVote === 'up' ? 1 : newVote === 'down' ? -1 : 0
      await apiRequest(`/api/votes/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ value: apiValue }),
      })
    } catch (error) {
      // Rollback on failure
      setUserVote(prevVote)
      setVotes(prevVotes)
      onVote?.(prevVote)
      toast.error('Vote failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsVoting(false)
    }
  }

  const iconSize = size === 'sm' ? 14 : 16
  const countClass = size === 'sm' ? 'text-[11px]' : 'text-xs'
  const gap = size === 'sm' ? 'gap-[2px]' : 'gap-0.5'

  return (
    <div className={`flex flex-col items-center ${gap}`}>
      {/* Upvote */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          if (disabled) return
          if (!user) {
            toast.error("Authentication required", {
              description: "Please sign in to upvote posts."
            })
            setAuthModalOpen(true, 'login')
            return
          }
          handleVote('up')
        }}
        disabled={disabled}
        className="flex items-center justify-center cursor-pointer p-0.5 rounded transition-colors duration-150 disabled:cursor-default disabled:opacity-50"
        style={{
          color: userVote === 'up' ? 'var(--primary)' : '#555555',
        }}
        whileHover={disabled ? undefined : { color: userVote === 'up' ? 'var(--primary)' : '#888888' }}
        animate={
          animatingDirection === 'up'
            ? { scale: [1, 1.15, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.2, ease: 'easeOut' }}
        aria-label="Upvote"
      >
        <ChevronUp size={iconSize} strokeWidth={2.5} />
      </motion.button>

      {/* Count */}
      <motion.span
        className={`font-display tabular-nums font-medium ${countClass} leading-none`}
        key={votes}
        animate={{
          color:
            userVote === 'up'
              ? 'var(--primary)'
              : userVote === 'down'
                ? '#FF4444'
                : '#888888',
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        {votes}
      </motion.span>

      {/* Downvote */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          if (disabled) return
          if (!user) {
            toast.error("Authentication required", {
              description: "Please sign in to downvote posts."
            })
            setAuthModalOpen(true, 'login')
            return
          }
          handleVote('down')
        }}
        disabled={disabled}
        className="flex items-center justify-center cursor-pointer p-0.5 rounded transition-colors duration-150 disabled:cursor-default disabled:opacity-50"
        style={{
          color: userVote === 'down' ? '#FF4444' : '#555555',
        }}
        whileHover={disabled ? undefined : { color: userVote === 'down' ? '#FF4444' : '#888888' }}
        animate={
          animatingDirection === 'down'
            ? { scale: [1, 1.15, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.2, ease: 'easeOut' }}
        aria-label="Downvote"
      >
        <ChevronDown size={iconSize} strokeWidth={2.5} />
      </motion.button>
    </div>
  )
})
