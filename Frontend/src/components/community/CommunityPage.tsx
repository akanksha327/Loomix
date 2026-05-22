'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { apiRequest } from '@/lib/api'
import { FeedContent } from '@/components/feed/FeedContent'

type Community = {
  id: string
  name: string
  slug: string
  description: string | null
  avatarUrl: string | null
  memberCount: number
  postCount: number
}

export default function CommunityPage() {
  const selectedCommunity = useAppStore((state) => state.selectedCommunity)
  const [community, setCommunity] = useState<Community | null>(null)
  const [loading, setLoading] = useState(Boolean(selectedCommunity))

  useEffect(() => {
    if (!selectedCommunity) {
      setCommunity(null)
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      try {
        const communityResponse = await apiRequest<Community>(`/api/communities/${selectedCommunity}`)
        setCommunity(communityResponse.data)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [selectedCommunity])

  if (!selectedCommunity) {
    return <FeedContent mode="explore" />
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-8"><div className="surface rounded-lg h-40 animate-pulse" /></div>
  }

  if (!community) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="surface rounded-lg p-8 text-center">
          <Users className="w-6 h-6 text-tertiary mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-[#F5F5F5]">Community not found</h2>
          <p className="text-sm text-secondary mt-1">Real communities will appear here once created.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-8">
      <motion.div className="pt-8 pb-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'rgba(199,255,63,0.08)' }}>
            {community.avatarUrl ? <img src={community.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl font-bold accent-text font-display">{community.name.slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#F5F5F5] font-display">{community.name}</h1>
            <p className="text-secondary text-sm mt-1 max-w-lg leading-relaxed">{community.description || 'No description yet.'}</p>
            <p className="text-sm mt-2">
              <span className="text-[#F5F5F5] tabular-nums">{community.memberCount.toLocaleString()}</span>{' '}
              <span className="text-tertiary">members</span>
              <span className="text-tertiary mx-1.5">·</span>
              <span className="text-[#F5F5F5] tabular-nums">{community.postCount.toLocaleString()}</span>{' '}
              <span className="text-tertiary">posts</span>
            </p>
          </div>
        </div>
      </motion.div>

      <FeedContent mode="community" community={selectedCommunity} title={community.name} />
    </div>
  )
}
