'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/stores/app-store'
import { apiRequest } from '@/lib/api'

interface Community {
  id: string
  name: string
  slug: string
  memberCount: number
}

export default function TrendingCommunities() {
  const setSelectedCommunity = useAppStore((s) => s.setSelectedCommunity)
  const [communities, setCommunities] = useState<Community[]>([])

  useEffect(() => {
    apiRequest<Community[]>('/api/communities/trending?limit=5')
      .then((response) => setCommunities(response.data))
      .catch(() => setCommunities([]))
  }, [])

  return (
    <div className="surface rounded-lg p-4">
      <h3 className="text-xs font-semibold tracking-wider uppercase text-tertiary mb-3 font-display">Trending</h3>

      {communities.length === 0 ? (
        <p className="text-xs text-tertiary">No communities yet.</p>
      ) : (
        <div>
          {communities.map((community, index) => (
            <motion.button
              key={community.id}
              className="w-full flex items-center gap-3 py-2.5 px-1 rounded transition-colors duration-200 hover:bg-white/[0.02] text-left group"
              onClick={() => setSelectedCommunity(community.slug)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
            >
              <span className="text-xs text-tertiary w-4 text-right tabular-nums flex-shrink-0 font-display">{index + 1}</span>
              <span className="text-sm text-[#F5F5F5] truncate flex-1 group-hover:text-primary transition-colors">{community.name}</span>
              <span className="text-xs text-tertiary flex-shrink-0 tabular-nums">{community.memberCount.toLocaleString()}</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
