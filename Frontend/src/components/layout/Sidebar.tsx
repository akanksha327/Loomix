'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Compass,
  Users,
  MessageCircle,
  Bookmark,
  User,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAppStore, type ViewType } from '@/stores/app-store'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

interface NavItem {
  icon: React.ElementType
  label: string
  view: ViewType
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', view: 'feed' },
  { icon: Compass, label: 'Explore', view: 'explore' },
  { icon: Users, label: 'Communities', view: 'community' },
  { icon: MessageCircle, label: 'Messages', view: 'messages' },
  { icon: Bookmark, label: 'Saved', view: 'saved' },
  { icon: User, label: 'Profile', view: 'profile' },
  { icon: Settings, label: 'Settings', view: 'settings' },
]

const TRANSITION = {
  duration: 0.3,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
}

/* ─── Desktop sidebar ─── */
function DesktopSidebar() {
  const currentView = useAppStore((state) => state.currentView)
  const setView = useAppStore((state) => state.setView)
  const user = useAuthStore((state) => state.user)
  const isGuest = useAuthStore((state) => state.isGuest)
  const setAuthModalOpen = useAuthStore((state) => state.setAuthModalOpen)
  const logout = useAuthStore((state) => state.logout)
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
    setExpanded(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    collapseTimer.current = setTimeout(() => {
      setExpanded(false)
    }, 300)
  }, [])

  return (
    <motion.aside
      initial={false}
      animate={{ width: expanded ? 208 : 48 }}
      transition={TRANSITION}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="fixed left-3 top-16 bottom-16 z-40 overflow-hidden rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300"
      style={{
        background: 'rgba(11, 11, 12, 0.85)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex flex-col h-full">
        {/* Navigation items */}
        <nav className="flex-1 py-3 px-1.5 space-y-0.5" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = currentView === item.view
            return (
              <button
                key={item.label}
                onClick={() => setView(item.view)}
                className={`
                  relative flex items-center w-full rounded-lg transition-colors duration-150
                  ${expanded ? 'gap-3 px-3 py-2' : 'justify-center px-2 py-2.5'}
                `}
                style={{
                  background: isActive ? 'var(--sidebar-accent)' : 'transparent',
                  borderLeft: isActive && expanded ? '2px solid var(--primary)' : '2px solid transparent',
                }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon
                  className="w-[18px] h-[18px] shrink-0"
                  style={{ color: isActive ? 'var(--primary)' : '#555555' }}
                />

                {/* Label — visible when expanded */}
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-xs font-medium whitespace-nowrap overflow-hidden"
                      style={{ color: isActive ? 'var(--primary)' : '#888888' }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Active indicator for collapsed state */}
                {isActive && !expanded && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full"
                    style={{ background: 'var(--primary)' }}
                  />
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom user section */}
        <div
          className="px-2 pb-3 bg-transparent"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div
            className={`flex items-center rounded-lg py-2 ${
              expanded ? 'gap-2 px-2' : 'justify-center px-1'
            }`}
          >
            <Avatar className="w-6 h-6 shrink-0">
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
 
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-between w-full min-w-0"
                >
                  <div className="overflow-hidden whitespace-nowrap pr-2">
                    <p className="text-xs font-medium truncate max-w-[85px]" style={{ color: '#F5F5F5' }}>
                      {user ? (user.displayName || 'User') : isGuest ? 'Guest User' : 'Loomix User'}
                    </p>
                    <p className="text-[9px] truncate max-w-[85px]" style={{ color: '#555555' }}>
                      {user ? `@${user.username || 'user'}` : isGuest ? '@guest' : '@unauthenticated'}
                    </p>
                  </div>
                  {user ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        logout()
                        toast.success("Successfully logged out")
                      }}
                      className="p-1 rounded hover:bg-white/5 cursor-pointer text-tertiary hover:text-red-400 transition-colors ml-auto flex-shrink-0"
                      title="Sign Out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setAuthModalOpen(true, 'login')
                      }}
                      className="px-1.5 py-0.5 rounded text-[9px] bg-[var(--primary)] text-[var(--primary-foreground)] font-medium cursor-pointer hover:opacity-90 transition-opacity ml-auto flex-shrink-0"
                    >
                      Sign In
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.aside>
  )
}

/* ─── Mobile sidebar (Sheet) ─── */
function MobileSidebar() {
  const currentView = useAppStore((state) => state.currentView)
  const setView = useAppStore((state) => state.setView)
  const sidebarExpanded = useAppStore((state) => state.sidebarExpanded)
  const setSidebarExpanded = useAppStore((state) => state.setSidebarExpanded)
  const user = useAuthStore((state) => state.user)
  const isGuest = useAuthStore((state) => state.isGuest)
  const setAuthModalOpen = useAuthStore((state) => state.setAuthModalOpen)
  const logout = useAuthStore((state) => state.logout)

  return (
    <Sheet open={sidebarExpanded} onOpenChange={setSidebarExpanded}>
      <SheetContent
        side="left"
        className="w-64 p-0 border-none rounded-r-2xl"
        style={{
          background: 'var(--popover)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex flex-col h-full pt-12">
          {/* Navigation items */}
          <nav className="flex-1 py-4 px-3 space-y-0.5" aria-label="Main navigation">
            {navItems.map((item) => {
              const isActive = currentView === item.view
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setView(item.view)
                    setSidebarExpanded(false)
                  }}
                  className="relative flex items-center w-full gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150"
                  style={{
                    background: isActive ? 'var(--sidebar-accent)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon
                    className="w-[18px] h-[18px] shrink-0"
                    style={{ color: isActive ? 'var(--primary)' : '#555555' }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: isActive ? 'var(--primary)' : '#888888' }}
                  >
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>

          {/* Bottom user section */}
          <div
            className="px-3 pb-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2.5 rounded-lg py-2 px-2">
              <Avatar className="w-6 h-6 shrink-0">
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
              <div className="flex items-center justify-between w-full min-w-0">
                <div className="overflow-hidden pr-2">
                  <p className="text-xs font-medium truncate max-w-[120px]" style={{ color: '#F5F5F5' }}>
                    {user ? (user.displayName || 'User') : isGuest ? 'Guest User' : 'Loomix User'}
                  </p>
                  <p className="text-[10px] truncate max-w-[120px]" style={{ color: '#555555' }}>
                    {user ? `@${user.username || 'user'}` : isGuest ? '@guest' : '@unauthenticated'}
                  </p>
                </div>
                {user ? (
                  <button
                    onClick={() => {
                      logout()
                      setSidebarExpanded(false)
                      toast.success("Successfully logged out")
                    }}
                    className="p-1 rounded hover:bg-white/5 cursor-pointer text-tertiary hover:text-red-400 transition-colors ml-auto flex-shrink-0"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setAuthModalOpen(true, 'login')
                      setSidebarExpanded(false)
                    }}
                    className="px-2 py-0.5 rounded text-[10px] bg-[var(--primary)] text-[var(--primary-foreground)] font-medium cursor-pointer hover:opacity-90 transition-opacity ml-auto flex-shrink-0"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ─── Main export ─── */
export default function Sidebar() {
  const isMobile = useAppStore((state) => state.isMobile)

  if (isMobile) {
    return <MobileSidebar />
  }

  return <DesktopSidebar />
}
