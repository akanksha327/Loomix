'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import { FeedContent } from '@/components/feed/FeedContent'
import { ArrowLeft } from 'lucide-react'
import { apiRequest, initialsFor, timeAgo, type BackendPost, getMediaUrl, isVideoUrl } from '@/lib/api'

function RouteSkeleton() {
  return <div className="max-w-3xl mx-auto px-4 py-8"><div className="surface rounded-lg h-40 animate-pulse" /></div>
}

const LandingPage = dynamic(() => import('@/components/landing/LandingPage'), { ssr: false })
const SavedContent = dynamic(() => import('@/components/feed/SavedContent'), { ssr: false, loading: () => <RouteSkeleton /> })
const ProfilePage = dynamic(() => import('@/components/profile/ProfilePage'), { ssr: false, loading: () => <RouteSkeleton /> })
const MessagesContent = dynamic(() => import('@/components/messages/MessagesContent'), { ssr: false, loading: () => <RouteSkeleton /> })
const CommunityPage = dynamic(() => import('@/components/community/CommunityPage'), { ssr: false, loading: () => <RouteSkeleton /> })
const WidgetPanel = dynamic(() => import('@/components/widgets/WidgetPanel'), { ssr: false })
const CommentSection = dynamic(
  () => import('@/components/comments/CommentSection').then((mod) => mod.CommentSection),
  { ssr: false, loading: () => <RouteSkeleton /> },
)
const CursorGlow = dynamic(() => import('@/components/effects/CursorGlow'), { ssr: false })
const AmbientBackground = dynamic(() => import('@/components/effects/AmbientBackground'), { ssr: false })
const SettingsPage = dynamic(() => import('@/components/settings/SettingsPage'), { ssr: false, loading: () => <RouteSkeleton /> })

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const pageTransition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1] as const,
}

function PlaceholderView({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
        <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4" style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Icon className="w-5 h-5" style={{ color: '#555555' }} />
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: '#F5F5F5' }}>
          {title}
        </h2>
        <p className="text-sm max-w-xs" style={{ color: '#888888' }}>
          {description}
        </p>
      </motion.div>
    </div>
  )
}

function PostDetailView() {
  const { selectedPost, setSelectedPost } = useAppStore()
  const [post, setPost] = useState<BackendPost | null>(null)

  useEffect(() => {
    if (!selectedPost) return
    apiRequest<BackendPost>(`/api/posts/${selectedPost}`)
      .then((response) => setPost(response.data))
      .catch(() => setPost(null))
  }, [selectedPost])

  return (
    <div className="max-w-2xl mx-auto px-6 pb-8">
      <motion.button
        className="flex items-center gap-2 text-xs mb-8 cursor-pointer"
        style={{ color: '#888888' }}
        onClick={() => setSelectedPost(null)}
        whileHover={{ x: -3 }}
        transition={{ duration: 0.2 }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </motion.button>

      {post ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="surface rounded-lg p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>{post.community ? `r/${post.community.slug}` : 'Thread'}</span>
            <span className="text-xs" style={{ color: '#555555' }}>·</span>
            <span className="text-xs" style={{ color: '#555555' }}>{post.author.displayName || post.author.username || initialsFor(post.author)}</span>
            <span className="text-xs" style={{ color: '#555555' }}>·</span>
            <span className="text-xs" style={{ color: '#555555' }}>{timeAgo(post.createdAt)}</span>
          </div>
          <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: '#F5F5F5' }}>{post.title}</h2>
          {post.content && <p className="text-sm leading-relaxed mb-4" style={{ color: '#888888' }}>{post.content}</p>}
          {post.mediaUrl && (
            <div className="overflow-hidden rounded border border-white/[0.06] bg-[#0a0a0a]">
              {isVideoUrl(post.mediaUrl) ? (
                <video
                  src={getMediaUrl(post.mediaUrl)}
                  className="w-full max-h-[500px] object-contain rounded"
                  controls
                  preload="metadata"
                  playsInline
                />
              ) : (
                <img
                  src={getMediaUrl(post.mediaUrl)}
                  alt={post.title}
                  className="w-full max-h-[500px] object-contain rounded mx-auto"
                  loading="lazy"
                />
              )}
            </div>
          )}
        </motion.div>
      ) : (
        <div className="surface rounded-lg p-6 mb-6 text-sm text-secondary">Loading thread...</div>
      )}

      {selectedPost && <CommentSection postId={selectedPost} />}
    </div>
  )
}

export default function Home() {
  const currentView = useAppStore((state) => state.currentView)
  const setView = useAppStore((state) => state.setView)
  const selectedPost = useAppStore((state) => state.selectedPost)
  const setSelectedPost = useAppStore((state) => state.setSelectedPost)
  const setIsMobile = useAppStore((state) => state.setIsMobile)
  const user = useAuthStore((state) => state.user)
  const isGuest = useAuthStore((state) => state.isGuest)
  const loading = useAuthStore((state) => state.loading)
  const setAuthModalOpen = useAuthStore((state) => state.setAuthModalOpen)
  const restoredNavigationRef = useRef(false)
  const isPopStateRef = useRef(false)

  // 1. Restore navigation view state from localStorage on client-side mount safely
  useEffect(() => {
    if (loading || restoredNavigationRef.current) return
    restoredNavigationRef.current = true

    const savedView = localStorage.getItem('loomix_current_view') as any
    const savedPost = localStorage.getItem('loomix_selected_post')
    
    const validViews = ['landing', 'feed', 'community', 'profile', 'messages', 'saved', 'explore', 'settings', 'comments']
    if (savedView && validViews.includes(savedView)) {
      if (savedView === 'landing' && user) {
        setView('feed')
      } else {
        setView(savedView)
      }
    } else if (user) {
      setView('feed')
    } else {
      setView('landing')
    }
    
    if (savedPost) {
      setSelectedPost(savedPost)
    }
  }, [loading, setView, setSelectedPost, user])

  // Synchronize browser history (popstate) with Zustand state
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePopState = (event: PopStateEvent) => {
      isPopStateRef.current = true
      
      const state = event.state
      if (state) {
        setView(state.view || 'feed')
        setSelectedPost(state.postId || null)
      } else {
        setView(user ? 'feed' : 'landing')
        setSelectedPost(null)
      }
      
      setTimeout(() => {
        isPopStateRef.current = false
      }, 0)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [setView, setSelectedPost, user])

  // Synchronize Zustand state updates with browser history (pushState)
  useEffect(() => {
    if (typeof window === 'undefined' || loading) return
    if (isPopStateRef.current) return

    if (window.history.state === null) {
      window.history.replaceState({ view: currentView, postId: selectedPost }, '')
      return
    }

    const currentState = window.history.state
    if (currentState.view !== currentView || currentState.postId !== selectedPost) {
      window.history.pushState({ view: currentView, postId: selectedPost }, '')
    }
  }, [currentView, selectedPost, loading])

  // 2. Protected routes guard: ONLY triggers once hydration completes (loading === false)
  useEffect(() => {
    if (loading) return

    const protectedViews = ['profile', 'settings', 'saved', 'messages']
    if (protectedViews.includes(currentView) && !user) {
      if (isGuest) {
        setView('feed')
        toast.error('Authentication required', {
          description: `Please sign in to access the ${currentView} section.`,
        })
        setAuthModalOpen(true, 'login')
      } else {
        setView('landing')
        setAuthModalOpen(true, 'login')
      }
    }
  }, [currentView, user, isGuest, loading, setView, setAuthModalOpen])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobile])

  // Render highly-polished cyberpunk loading screen while auth is hydrating
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-[#0B0A09]">
        {/* Glow grid background */}
        <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />
        
        {/* Cyberpunk Scanline */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#F59E0B]/30 to-transparent absolute left-0"
            style={{
              animation: 'scanline 4s linear infinite',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
            }}
          />
        </div>

        {/* Ambient background glow */}
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-[#F59E0B]/[0.02] blur-[150px] pointer-events-none" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-[#F59E0B]/[0.02] blur-[150px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center max-w-md px-6 text-center">
          {/* Logo animation or sleek glyph */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8"
          >
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto relative border"
              style={{
                background: 'rgba(20, 20, 20, 0.8)',
                borderColor: 'rgba(245, 158, 11, 0.2)',
                boxShadow: '0 0 30px rgba(245, 158, 11, 0.05), inset 0 0 12px rgba(245, 158, 11, 0.05)'
              }}
            >
              {/* Pulsing ring */}
              <motion.div 
                className="absolute inset-0 rounded-xl border border-[#F59E0B]/40"
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <svg className="w-8 h-8 text-[#F59E0B]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </motion.div>

          {/* System status display */}
          <div className="space-y-3">
            <h1 
              className="text-lg font-bold tracking-[0.2em] text-white flex items-center justify-center gap-1.5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span>LOOMIX</span>
              <span className="text-[#F59E0B]">//</span>
              <span className="text-xs font-mono font-medium tracking-normal text-white/50">v0.2.0</span>
            </h1>
            
            <p className="text-xs font-mono tracking-wider text-white/40 uppercase">
              HYDRATING SYSTEM SECURE_CONTEXT
            </p>

            {/* Glowing progress line */}
            <div className="w-48 h-[1px] bg-white/10 mx-auto rounded-full overflow-hidden relative">
              <motion.div 
                className="absolute top-0 bottom-0 left-0 bg-[#F59E0B]"
                initial={{ left: '-100%', width: '30%' }}
                animate={{ left: '100%' }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  boxShadow: '0 0 8px #F59E0B'
                }}
              />
            </div>

            <div className="text-[10px] font-mono text-[#F59E0B]/60 flex items-center justify-center gap-2 select-none">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
              <span>SECURE_CONNECTION_STABLE</span>
            </div>
          </div>
        </div>

        {/* Scanline animation style block */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes scanline {
            0% { top: -10%; }
            100% { top: 110%; }
          }
        `}} />
      </div>
    )
  }

  const isLanding = currentView === 'landing'
  const showWidgets = ['feed', 'community', 'explore'].includes(currentView) && !selectedPost

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {isLanding ? (
        <LandingPage />
      ) : (
        <>
          <CursorGlow />
          <AmbientBackground />
          <Navbar />

          <div className="w-full flex flex-1 relative lg:pl-16">
            <Sidebar />
            <div className="flex gap-6 lg:gap-8 max-w-[1020px] w-full mx-auto px-4 lg:px-6">
              <main className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  {selectedPost && (
                    <motion.div key="post-detail" {...pageVariants} transition={pageTransition}>
                      <PostDetailView />
                    </motion.div>
                  )}

                  {!selectedPost && currentView === 'feed' && (
                    <motion.div key="feed" {...pageVariants} transition={pageTransition}>
                      <FeedContent />
                    </motion.div>
                  )}

                  {!selectedPost && currentView === 'community' && (
                    <motion.div key="community" {...pageVariants} transition={pageTransition}>
                      <CommunityPage />
                    </motion.div>
                  )}

                  {!selectedPost && currentView === 'profile' && (
                    <motion.div key="profile" {...pageVariants} transition={pageTransition}>
                      <ProfilePage />
                    </motion.div>
                  )}

                  {!selectedPost && currentView === 'explore' && (
                    <motion.div key="explore" {...pageVariants} transition={pageTransition}>
                      <FeedContent mode="explore" />
                    </motion.div>
                  )}

                  {!selectedPost && currentView === 'messages' && (
                    <motion.div key="messages" {...pageVariants} transition={pageTransition}>
                      <MessagesContent />
                    </motion.div>
                  )}

                  {!selectedPost && currentView === 'saved' && (
                    <motion.div key="saved" {...pageVariants} transition={pageTransition}>
                      <SavedContent />
                    </motion.div>
                  )}

                  {!selectedPost && currentView === 'settings' && (
                    <motion.div key="settings" {...pageVariants} transition={pageTransition}>
                      <SettingsPage />
                    </motion.div>
                  )}

                  {!selectedPost && currentView === 'comments' && (
                    <motion.div key="comments" {...pageVariants} transition={pageTransition} className="py-8">
                      <CommentSection postId="" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <footer className="py-6 px-6 mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <span className="text-xs" style={{ color: '#555555' }}>Loomix © 2026</span>
                    <div className="flex items-center gap-4">
                      {['Privacy', 'Terms', 'Docs'].map((link) => (
                        <a key={link} href="#" className="text-xs hover:underline underline-offset-4" style={{ color: '#555555' }}>{link}</a>
                      ))}
                    </div>
                  </div>
                </footer>
              </main>

              {showWidgets && (
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="hidden lg:block w-72 shrink-0">
                  <WidgetPanel />
                </motion.div>
              )}
            </div>
          </div>

          <MobileNav />
        </>
      )}
    </div>
  )
}
