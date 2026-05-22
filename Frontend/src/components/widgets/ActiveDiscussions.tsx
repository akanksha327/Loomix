'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { apiRequest, type BackendPost } from '@/lib/api'
import { useAppStore } from '@/stores/app-store'

export default function ActiveDiscussions() {
  const setSelectedPost = useAppStore((state) => state.setSelectedPost)
  const [posts, setPosts] = useState<BackendPost[]>([])

  useEffect(() => {
    apiRequest<BackendPost[]>('/api/posts?sort=trending&limit=4')
      .then((response) => setPosts(response.data))
      .catch(() => setPosts([]))
  }, [])

  return (
    <div className="surface rounded-lg p-4">
      <h3 className="text-xs font-semibold tracking-wider uppercase text-tertiary mb-3 font-display">Active now</h3>

      {posts.length === 0 ? (
        <p className="text-xs text-tertiary">No active discussions yet.</p>
      ) : (
        <div>
          {posts.map((post, index) => (
            <motion.button
              key={post.id}
              onClick={() => setSelectedPost(post.id)}
              className="w-full flex items-center gap-3 py-2.5 px-1 rounded transition-colors duration-200 hover:bg-white/[0.02] text-left group"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
            >
              <span className="relative flex-shrink-0 flex items-center justify-center w-1.5 h-1.5">
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: 'var(--primary)' }} />
              </span>
              <span className="text-sm text-[#F5F5F5] truncate flex-1 group-hover:text-primary transition-colors">{post.title}</span>
              <span className="text-xs text-tertiary flex-shrink-0 tabular-nums">{post.commentCount}</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
