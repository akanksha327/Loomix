'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Search, Send, UserPlus, Users } from 'lucide-react'
import { apiRequest, initialsFor, timeAgo, type BackendConversation, type BackendMessage, type BackendUser } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { getSocket } from '@/lib/socket'

export default function MessagesContent() {
  const { user } = useAuthStore()
  const [query, setQuery] = useState('')
  const [conversations, setConversations] = useState<BackendConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<BackendMessage[]>([])
  const [results, setResults] = useState<BackendUser[]>([])
  const [message, setMessage] = useState('')
  const [loadingSearch, setLoadingSearch] = useState(false)

  const activeConversation = conversations.find((conversation) => conversation.id === activeId)
  const activePeer = useMemo(() => {
    return activeConversation?.participants.find((participant) => participant.user.id !== (user?.backendId || user?.uid))?.user
  }, [activeConversation, user?.backendId, user?.uid])

  const loadConversations = async () => {
    const response = await apiRequest<BackendConversation[]>('/api/messages/conversations')
    setConversations(response.data)
    if (!activeId && response.data[0]) setActiveId(response.data[0].id)
  }

  useEffect(() => {
    void loadConversations()
  }, [])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    apiRequest<BackendMessage[]>(`/api/messages/conversations/${activeId}/messages`)
      .then((response) => setMessages(response.data))
      .catch(() => setMessages([]))
  }, [activeId])

  // Realtime Socket message listener
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleMessageCreate = (data: BackendMessage) => {
      // Append the message to our current view in realtime if it belongs to this conversation
      if (activeId && data.conversationId === activeId) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === data.id)) return prev
          return [...prev, data]
        })
      }
      // Re-fetch conversation list to update newest message preview on the side
      void loadConversations()
    }

    socket.on('message:create', handleMessageCreate)
    return () => {
      socket.off('message:create', handleMessageCreate)
    }
  }, [activeId])

  useEffect(() => {
    const text = query.trim()
    if (!text) {
      setResults([])
      return
    }
    const handle = window.setTimeout(async () => {
      setLoadingSearch(true)
      try {
        const response = await apiRequest<{ users?: { items: BackendUser[] } }>(`/api/search?q=${encodeURIComponent(text)}&type=users&limit=8`)
        setResults((response.data.users?.items || []).filter((item) => item.id !== (user?.backendId || user?.uid)))
      } finally {
        setLoadingSearch(false)
      }
    }, 250)
    return () => window.clearTimeout(handle)
  }, [query, user?.backendId, user?.uid])

  const startConversation = async (target: BackendUser) => {
    const response = await apiRequest<BackendConversation>('/api/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ userId: target.id }),
    })
    await apiRequest(`/api/users/${target.id}/follow`, { method: 'POST' }).catch(() => null)
    setConversations((items) => [response.data, ...items.filter((item) => item.id !== response.data.id)])
    setActiveId(response.data.id)
    setQuery('')
    setResults([])
    toast.success(`Conversation started with @${target.username}`)
  }

  const send = async () => {
    if (!activeId || !message.trim()) return
    const body = message.trim()
    setMessage('')
    const response = await apiRequest<BackendMessage>(`/api/messages/conversations/${activeId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    setMessages((items) => [...items, response.data])
    void loadConversations()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="surface rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[68vh]">
        <aside className="border-b md:border-b-0 md:border-r border-white/[0.06]">
          <div className="p-4 border-b border-white/[0.06]">
            <h2 className="font-display text-sm font-semibold text-[#F5F5F5] mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tertiary" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search username or user id"
                className="w-full pl-9 pr-3 py-2 rounded text-xs outline-none"
                style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.06)', color: '#F5F5F5' }}
              />
            </div>
          </div>

          {query.trim() ? (
            <div className="p-2">
              {loadingSearch && <div className="text-xs text-tertiary px-2 py-3">Searching...</div>}
              {!loadingSearch && results.length === 0 && <div className="text-xs text-tertiary px-2 py-3">No users found</div>}
              {results.map((result) => (
                <button key={result.id} onClick={() => startConversation(result)} className="w-full flex items-center gap-3 p-2 rounded hover:bg-white/[0.03] text-left">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-[#F5F5F5]" style={{ background: '#1A1A1A' }}>{initialsFor(result)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-[#F5F5F5] truncate">{result.displayName || result.username}</span>
                    <span className="block text-xs text-tertiary truncate">@{result.username}</span>
                  </span>
                  <UserPlus className="w-4 h-4 text-tertiary" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-2">
              {conversations.length === 0 && (
                <div className="p-5 text-center">
                  <Users className="w-5 h-5 text-tertiary mx-auto mb-2" />
                  <p className="text-sm text-[#F5F5F5]">No conversations yet</p>
                  <p className="text-xs text-tertiary mt-1">Search for users to start chatting.</p>
                </div>
              )}
              {conversations.map((conversation) => {
                const peer = conversation.participants.find((participant) => participant.user.id !== (user?.backendId || user?.uid))?.user
                const latest = conversation.messages[0]
                return (
                  <button key={conversation.id} onClick={() => setActiveId(conversation.id)} className="w-full flex items-center gap-3 p-2 rounded text-left transition-colors" style={{ background: activeId === conversation.id ? 'rgba(199,255,63,0.06)' : 'transparent' }}>
                    <span className="relative w-8 h-8 rounded-full flex items-center justify-center text-xs text-[#F5F5F5]" style={{ background: '#1A1A1A' }}>
                      {initialsFor(peer)}
                      <span className="absolute right-0 bottom-0 w-2 h-2 rounded-full" style={{ background: '#C7FF3F' }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-[#F5F5F5] truncate">{peer?.displayName || peer?.username}</span>
                      <span className="block text-xs text-tertiary truncate">{latest?.body || 'No messages yet'}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </aside>

        <section className="flex min-h-[68vh] flex-col">
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="w-8 h-8 text-tertiary mb-3" />
              <h3 className="font-display text-lg font-semibold text-[#F5F5F5]">No conversation selected</h3>
              <p className="text-sm text-secondary mt-1">Search for users to start chatting.</p>
            </div>
          ) : (
            <>
              <div className="h-14 flex items-center gap-3 px-4 border-b border-white/[0.06]">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-[#F5F5F5]" style={{ background: '#1A1A1A' }}>{initialsFor(activePeer)}</span>
                <div>
                  <p className="text-sm text-[#F5F5F5]">{activePeer?.displayName || activePeer?.username}</p>
                  <p className="text-[10px] text-tertiary">Active now</p>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.length === 0 && <p className="text-xs text-tertiary text-center mt-8">Send the first message.</p>}
                {messages.map((item) => {
                  const mine = item.senderId === (user?.backendId || user?.uid)
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[75%] rounded-lg px-3 py-2" style={{ background: mine ? '#C7FF3F' : '#1A1A1A', color: mine ? '#0D0D0D' : '#F5F5F5' }}>
                        <p className="text-sm">{item.body}</p>
                        <p className="text-[10px] opacity-60 mt-1">{timeAgo(item.createdAt)}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              <div className="p-3 border-t border-white/[0.06] flex gap-2">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void send()
                  }}
                  placeholder="Write a message..."
                  className="flex-1 px-3 py-2 rounded text-sm outline-none"
                  style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.06)', color: '#F5F5F5' }}
                />
                <button onClick={send} className="accent-bg rounded px-3 flex items-center justify-center" aria-label="Send message">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
