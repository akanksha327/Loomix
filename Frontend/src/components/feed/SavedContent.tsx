'use client'

import { useEffect, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { PostCard, type Post } from './PostCard'
import { apiRequest, initialsFor, timeAgo, type BackendPost } from '@/lib/api'

function mapPost(post: BackendPost): Post {
  const vote = post.votes?.[0]?.value
  return {
    id: post.id,
    community: {
      name: post.community ? `r/${post.community.slug}` : 'Thread',
      avatar: post.community?.name?.slice(0, 1).toUpperCase() || 'T',
      color: '#C7FF3F',
    },
    author: { name: post.author.displayName || post.author.username, avatar: initialsFor(post.author) },
    title: post.title,
    content: post.content || '',
    image: post.mediaUrl || undefined,
    votes: post.score ?? 0,
    comments: post._count?.comments ?? post.commentCount ?? 0,
    timestamp: timeAgo(post.createdAt),
    userVote: vote === 1 ? 'up' : vote === -1 ? 'down' : null,
    isSaved: true,
  }
}

export default function SavedContent() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await apiRequest<BackendPost[]>('/api/users/me/saved-posts?limit=12')
        setPosts(response.data.map(mapPost))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
      <h2 className="font-display font-semibold text-sm text-[#F5F5F5]">Saved</h2>
      {loading && <div className="surface rounded-lg h-36 animate-pulse" />}
      {!loading && posts.length === 0 && (
        <div className="surface rounded-lg p-8 text-center">
          <Bookmark className="w-6 h-6 text-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-semibold font-display text-[#F5F5F5] mb-2">No saved posts yet</h3>
          <p className="text-sm text-secondary">Save posts to view them later.</p>
        </div>
      )}
      {!loading && posts.map((post, index) => <PostCard key={post.id} post={post} index={index} />)}
    </div>
  )
}
