'use client'

import { useCallback, useEffect } from 'react'
import { Search, Bell, Plus, Menu } from 'lucide-react'
import { useAppStore, type ViewType } from '@/stores/app-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

const viewLabels: Record<ViewType, string> = {
  landing: 'Home',
  feed: 'Feed',
  explore: 'Explore',
  community: 'Community',
  messages: 'Messages',
  saved: 'Saved',
  profile: 'Profile',
  settings: 'Settings',
  comments: 'Comments',
  'post-detail': 'Post',
}

export default function Navbar() {
  const currentView = useAppStore((state) => state.currentView)
  const setView = useAppStore((state) => state.setView)
  const searchOpen = useAppStore((state) => state.searchOpen)
  const setSearchOpen = useAppStore((state) => state.setSearchOpen)
  const setCreatePostOpen = useAppStore((state) => state.setCreatePostOpen)
  const setSidebarExpanded = useAppStore((state) => state.setSidebarExpanded)
  const isMobile = useAppStore((state) => state.isMobile)
  const user = useAuthStore((state) => state.user)
  const isGuest = useAuthStore((state) => state.isGuest)
  const setAuthModalOpen = useAuthStore((state) => state.setAuthModalOpen)

  // ⌘K shortcut to toggle search
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(!searchOpen)
      }
    },
    [setSearchOpen, searchOpen]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const viewLabel = viewLabels[currentView] || 'Feed'

  return (
    <nav
      className="sticky top-0 z-50 h-12 flex items-center px-4 lg:pl-16 lg:pr-0"
      style={{
        background: 'var(--background)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between w-full max-w-[1020px] mx-auto px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          {isMobile && (
            <button
              onClick={() => setSidebarExpanded(true)}
              className="flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-150 hover:text-[#F5F5F5]"
              style={{ color: '#555555' }}
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Logo */}
          <button
            onClick={() => setView('feed')}
            className="font-display font-semibold text-sm tracking-tight transition-colors duration-150 hover:opacity-80"
            style={{ color: '#F5F5F5' }}
          >
            Loomix
          </button>

          {/* Breadcrumb — hidden on mobile */}
          {!isMobile && currentView !== 'landing' && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#555555' }}>
                /
              </span>
              <span className="text-xs font-medium" style={{ color: '#888888' }}>
                {viewLabel}
              </span>
            </div>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 h-7 px-2 rounded-md transition-colors duration-150 hover:text-[#F5F5F5]"
            style={{ color: '#555555' }}
            aria-label="Search"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[10px] font-mono" style={{ color: '#555555' }}>
              ⌘K
            </span>
          </button>

          {/* Notifications */}
          <button
            onClick={() => {
              if (!user) {
                toast.error("Authentication required", {
                  description: "Please sign in to view notifications."
                })
                setAuthModalOpen(true, 'login')
                return
              }
              toast.info("No new notifications", {
                description: "You're all caught up!"
              })
            }}
            className="relative flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-150 hover:text-[#F5F5F5] cursor-pointer"
            style={{ color: '#555555' }}
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {/* Accent notification dot */}
            {user && (
              <span
                className="absolute top-1.5 right-1.5 w-[3px] h-[3px] rounded-full"
                style={{ background: 'var(--primary)' }}
              />
            )}
          </button>

          {/* Create button */}
          <button
            onClick={() => {
              if (!user) {
                toast.error("Authentication required", {
                  description: "Please sign in to create posts."
                })
                setAuthModalOpen(true, 'login')
                return
              }
              setCreatePostOpen(true)
            }}
            className="flex items-center justify-center h-7 px-3 rounded-md text-xs font-medium transition-opacity duration-150 hover:opacity-90 accent-bg cursor-pointer"
          >
            <Plus className="w-3 h-3 mr-1" />
            Create
          </button>

          {/* Avatar */}
          <button
            onClick={() => setView('profile')}
            className="flex items-center justify-center transition-opacity duration-150 hover:opacity-80 cursor-pointer"
            aria-label="Profile"
          >
            <Avatar className="w-6 h-6">
              <AvatarImage src={user?.photoURL || ''} alt="Profile" />
              <AvatarFallback
                className="text-[9px] font-semibold"
                style={{
                  background: 'var(--muted)',
                  color: user ? 'var(--primary)' : isGuest ? '#888888' : '#555555',
                  border: '1px solid var(--border)',
                }}
              >
                {user 
                  ? (user.displayName ? user.displayName.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase() || 'U')
                  : isGuest ? 'G' : 'L'
                }
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
    </nav>
  )
}
