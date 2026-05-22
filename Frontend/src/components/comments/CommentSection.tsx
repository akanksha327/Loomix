'use client'

import { useEffect, useState } from 'react'
import { CommentItem, type Comment } from './CommentItem'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { apiRequest, initialsFor, timeAgo, type BackendComment } from '@/lib/api'
import { MessageCircle } from 'lucide-react'
import { getSocket } from '@/lib/socket'

interface CommentSectionProps {
  postId: string
}

function mapComment(comment: BackendComment): Comment {
  return {
    id: comment.id,
    author: {
      name: comment.author.displayName || comment.author.username,
      avatar: initialsFor(comment.author),
      color: '#C7FF3F',
    },
    content: comment.body,
    timestamp: timeAgo(comment.createdAt),
    votes: comment.score,
    userVote: null,
    replies: (comment.replies || []).map(mapComment),
  }
}

// Tree structure helpers for strict realtime comment state and deduplication
function checkCommentExists(commentsList: Comment[], id: string): boolean {
  for (const c of commentsList) {
    if (c.id === id) return true
    if (c.replies && checkCommentExists(c.replies, id)) return true
  }
  return false
}

function insertCommentIntoTree(commentsList: Comment[], newC: Comment, parentId: string | null): Comment[] {
  if (checkCommentExists(commentsList, newC.id)) {
    return commentsList
  }

  if (!parentId) {
    return [newC, ...commentsList]
  }

  return commentsList.map(c => {
    if (c.id === parentId) {
      if (c.replies.some(r => r.id === newC.id)) return c
      return {
        ...c,
        replies: [...c.replies, newC],
      }
    }
    if (c.replies && c.replies.length > 0) {
      return {
        ...c,
        replies: insertCommentIntoTree(c.replies, newC, parentId),
      }
    }
    return c
  })
}

function updateCommentInTree(commentsList: Comment[], updatedComment: BackendComment): Comment[] {
  return commentsList.map(c => {
    if (c.id === updatedComment.id) {
      return {
        ...c,
        content: updatedComment.body,
        votes: updatedComment.score,
      }
    }
    if (c.replies && c.replies.length > 0) {
      return {
        ...c,
        replies: updateCommentInTree(c.replies, updatedComment),
      }
    }
    return c
  })
}

function deleteCommentFromTree(commentsList: Comment[], commentId: string): Comment[] {
  return commentsList
    .filter(c => c.id !== commentId)
    .map(c => {
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: deleteCommentFromTree(c.replies, commentId),
        }
      }
      return c
    })
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const { user, setAuthModalOpen } = useAuthStore()

  const loadComments = async () => {
    if (!postId) {
      setComments([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const response = await apiRequest<BackendComment[]>(`/api/comments/post/${postId}`)
      setComments(response.data.map(mapComment))
    } catch {
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadComments()
  }, [postId])

  // Realtime synchronization with unsubscription listeners
  useEffect(() => {
    if (!postId) return

    const socket = getSocket()
    if (socket) {
      socket.emit('join:post', postId)

      const handleCommentCreate = (data: BackendComment) => {
        const mapped = mapComment({ ...data, replies: [] })
        setComments(prev => insertCommentIntoTree(prev, mapped, data.parentId || null))
      }

      const handleCommentUpdate = (data: BackendComment) => {
        setComments(prev => updateCommentInTree(prev, data))
      }

      const handleCommentDelete = (data: { commentId: string }) => {
        setComments(prev => deleteCommentFromTree(prev, data.commentId))
      }

      socket.on('comment:create', handleCommentCreate)
      socket.on('comment:update', handleCommentUpdate)
      socket.on('comment:delete', handleCommentDelete)

      return () => {
        socket.emit('leave:post', postId)
        socket.off('comment:create', handleCommentCreate)
        socket.off('comment:update', handleCommentUpdate)
        socket.off('comment:delete', handleCommentDelete)
      }
    }
  }, [postId])

  const handleSubmit = async () => {
    if (!newComment.trim()) return

    if (!user) {
      toast.error('Authentication required', {
        description: 'Please sign in to write a comment.',
      })
      setAuthModalOpen(true, 'login')
      return
    }

    try {
      const response = await apiRequest<BackendComment>('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ postId, body: newComment.trim() }),
      })
      const mapped = mapComment({ ...response.data, replies: [] })
      setComments(prev => insertCommentIntoTree(prev, mapped, null))
      setNewComment('')
    } catch (error) {
      toast.error('Could not post comment', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  const handleVote = (_id: string, _direction: 'up' | 'down') => {}

  const handleReply = async (parentId: string, content: string) => {
    if (!user) {
      toast.error('Authentication required', {
        description: 'Please sign in to reply to comments.',
      })
      setAuthModalOpen(true, 'login')
      return
    }

    try {
      const response = await apiRequest<BackendComment>('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ postId, parentId, body: content }),
      })
      const mapped = mapComment({ ...response.data, replies: [] })
      setComments(prev => insertCommentIntoTree(prev, mapped, parentId))
    } catch (error) {
      toast.error('Could not post reply', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  const commentCount = (() => {
    const count = (cs: Comment[]): number => cs.reduce((acc, c) => acc + 1 + count(c.replies), 0)
    return count(comments)
  })()

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)', color: '#F5F5F5', fontSize: '1rem' }}>
          Discussion
        </h2>
        <span className="accent-bg-subtle text-xs px-2 py-0.5 rounded-full tabular-nums">
          {commentCount}
        </span>
      </div>

      <div className="surface rounded-lg p-4 mb-6">
        <textarea
          className="w-full rounded-md p-3 text-sm resize-none border transition-colors duration-200 focus:outline-none"
          style={{
            background: '#1A1A1A',
            borderColor: 'rgba(255,255,255,0.06)',
            color: '#F5F5F5',
            minHeight: '80px',
            fontFamily: 'var(--font-inter)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(199,255,63,0.3)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
          }}
          placeholder="Add to discussion..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <button className="accent-bg text-xs px-4 py-1.5 rounded-md font-medium disabled:opacity-30" onClick={handleSubmit} disabled={!newComment.trim()}>
            Post
          </button>
        </div>
      </div>

      {loading && <div className="surface rounded-lg h-28 animate-pulse" />}
      {!loading && comments.length === 0 && (
        <div className="surface rounded-lg p-8 text-center">
          <MessageCircle className="w-6 h-6 text-tertiary mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#F5F5F5] mb-1">No comments yet</h3>
          <p className="text-xs text-secondary">Start the discussion with a real comment.</p>
        </div>
      )}
      {!loading && comments.length > 0 && (
        <div className="space-y-0.5">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onVote={handleVote} onReply={handleReply} />
          ))}
        </div>
      )}
    </div>
  )
}
