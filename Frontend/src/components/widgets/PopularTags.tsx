'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { apiRequest, type BackendPost } from '@/lib/api'

export default function PopularTags() {
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    apiRequest<BackendPost[]>('/api/posts?limit=20')
      .then((response) => {
        const nextTags = Array.from(new Set(response.data.flatMap((post) => (post as BackendPost & { tags?: string[] }).tags || [])))
        setTags(nextTags.slice(0, 10))
      })
      .catch(() => setTags([]))
  }, [])

  return (
    <div className="surface rounded-lg p-4">
      <h3 className="text-xs font-semibold tracking-wider uppercase text-tertiary mb-3 font-display">Tags</h3>

      {tags.length === 0 ? (
        <p className="text-xs text-tertiary">No tags yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <motion.button
              key={tag}
              className="rounded px-2 py-0.5 text-xs text-secondary transition-colors duration-200 hover:text-[#F5F5F5]"
              style={{ background: '#1A1A1A' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              whileTap={{ scale: 0.95 }}
            >
              {tag}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
