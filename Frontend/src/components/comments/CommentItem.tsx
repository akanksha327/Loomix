'use client'

import { useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, ChevronDown } from 'lucide-react'

export interface Comment {
  id: string
  author: { name: string; avatar: string; color: string }
  content: string
  timestamp: string
  votes: number
  userVote: 'up' | 'down' | null
  replies: Comment[]
}

interface CommentItemProps {
  comment: Comment
  depth?: number
  onVote?: (id: string, direction: 'up' | 'down') => void
  onReply?: (id: string, content: string) => void
}

export const CommentItem = memo(function CommentItem({
  comment,
  depth = 0,
  onVote,
  onReply,
}: CommentItemProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [localVote, setLocalVote] = useState<'up' | 'down' | null>(comment.userVote)
  const [voteCount, setVoteCount] = useState(comment.votes)

  const hasReplies = comment.replies.length > 0

  const handleVote = (direction: 'up' | 'down') => {
    if (localVote === direction) {
      setVoteCount((v) => (direction === 'up' ? v - 1 : v + 1))
      setLocalVote(null)
    } else {
      if (localVote) {
        setVoteCount((v) => (localVote === 'up' ? v - 1 : v + 1))
      }
      setVoteCount((v) => (direction === 'up' ? v + 1 : v - 1))
      setLocalVote(direction)
    }
    onVote?.(comment.id, direction)
  }

  const handleReplySubmit = () => {
    if (!replyText.trim()) return
    onReply?.(comment.id, replyText)
    setReplyText('')
    setReplyOpen(false)
  }

  const totalReplies = (() => {
    const count = (cs: Comment[]): number =>
      cs.reduce((acc, c) => acc + 1 + count(c.replies), 0)
    return count(comment.replies)
  })()

  return (
    <div className="relative">
      <motion.div
        className="rounded-md p-3 transition-colors duration-200"
        style={{
          paddingLeft: depth > 0 ? '1rem' : undefined,
        }}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.01)' }}
        initial={false}
      >
        {/* Header: author + timestamp inline */}
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-sm font-medium"
            style={{ color: '#F5F5F5', fontFamily: 'var(--font-inter)' }}
          >
            {comment.author.name}
          </span>
          <span
            className="text-xs text-tertiary"
            style={{ color: '#555555' }}
          >
            {comment.timestamp}
          </span>

          {/* Collapse toggle */}
          {hasReplies && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors duration-200"
              style={{ color: '#555555' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#888888')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#555555')}
            >
              {collapsed ? (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>[{totalReplies}]</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>collapse</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <p
          className="text-sm leading-relaxed mb-2"
          style={{ color: '#888888', fontFamily: 'var(--font-inter)' }}
        >
          {comment.content}
        </p>

        {/* Actions row: upvote · downvote · vote count · Reply */}
        <div className="flex items-center gap-1">
          <button
            className="p-0.5 rounded transition-colors duration-200"
            onClick={() => handleVote('up')}
            style={{ color: localVote === 'up' ? '#C7FF3F' : '#555555' }}
            onMouseEnter={(e) => {
              if (localVote !== 'up') e.currentTarget.style.color = '#888888'
            }}
            onMouseLeave={(e) => {
              if (localVote !== 'up') e.currentTarget.style.color = '#555555'
            }}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <span
            className="text-xs min-w-[16px] text-center tabular-nums"
            style={{ color: localVote === 'up' ? '#C7FF3F' : localVote === 'down' ? '#FF4444' : '#555555' }}
          >
            {voteCount}
          </span>
          <button
            className="p-0.5 rounded transition-colors duration-200"
            onClick={() => handleVote('down')}
            style={{ color: localVote === 'down' ? '#FF4444' : '#555555' }}
            onMouseEnter={(e) => {
              if (localVote !== 'down') e.currentTarget.style.color = '#888888'
            }}
            onMouseLeave={(e) => {
              if (localVote !== 'down') e.currentTarget.style.color = '#555555'
            }}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          <span className="text-tertiary text-xs mx-1" style={{ color: '#333333' }}>/</span>

          <button
            className="text-xs px-1.5 py-0.5 rounded transition-colors duration-200"
            style={{ color: '#555555' }}
            onClick={() => setReplyOpen(!replyOpen)}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#888888')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#555555')}
          >
            Reply
          </button>
        </div>

        {/* Inline reply textarea */}
        <AnimatePresence>
          {replyOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3">
                <textarea
                  className="w-full rounded-md p-3 text-sm resize-none border transition-colors duration-200 focus:outline-none"
                  style={{
                    background: '#1A1A1A',
                    borderColor: 'rgba(255,255,255,0.06)',
                    color: '#F5F5F5',
                    minHeight: '72px',
                    fontFamily: 'var(--font-inter)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(199,255,63,0.3)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  }}
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    onClick={() => {
                      setReplyOpen(false)
                      setReplyText('')
                    }}
                    className="px-3 py-1.5 text-xs rounded-md transition-colors duration-200"
                    style={{ color: '#555555' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#888888')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#555555')}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-3 py-1.5 text-xs rounded-md font-medium disabled:opacity-30 transition-opacity duration-200"
                    style={{
                      background: replyText.trim() ? '#C7FF3F' : '#C7FF3F',
                      color: '#0D0D0D',
                    }}
                    onClick={handleReplySubmit}
                    disabled={!replyText.trim()}
                  >
                    Reply
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Nested replies */}
      <AnimatePresence>
        {hasReplies && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="ml-4 overflow-hidden"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}
          >
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                onVote={onVote}
                onReply={onReply}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})
