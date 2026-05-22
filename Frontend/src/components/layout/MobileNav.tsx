'use client'

import { Home, Compass, Plus, MessageCircle, User } from 'lucide-react'
import { useAppStore, type ViewType } from '@/stores/app-store'

interface MobileNavItem {
  icon: React.ElementType
  label: string
  view: ViewType
  isCreate?: boolean
}

const mobileNavItems: MobileNavItem[] = [
  { icon: Home, label: 'Home', view: 'feed' },
  { icon: Compass, label: 'Explore', view: 'explore' },
  { icon: Plus, label: 'Create', view: 'feed', isCreate: true },
  { icon: MessageCircle, label: 'Messages', view: 'messages' },
  { icon: User, label: 'Profile', view: 'profile' },
]

export default function MobileNav() {
  const currentView = useAppStore((state) => state.currentView)
  const setView = useAppStore((state) => state.setView)
  const setCreatePostOpen = useAppStore((state) => state.setCreatePostOpen)

  const handleClick = (item: MobileNavItem) => {
    if (item.isCreate) {
      setCreatePostOpen(true)
    } else {
      setView(item.view)
    }
  }

  const isActive = (item: MobileNavItem) => {
    if (item.isCreate) return false
    return currentView === item.view
  }

  return (
    <div
      className="fixed bottom-3 left-3 right-3 z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className="flex items-center justify-around rounded-2xl py-2 px-2 shadow-2xl backdrop-blur-md"
        style={{
          background: 'var(--popover)',
          border: '1px solid var(--border)',
        }}
      >
        {mobileNavItems.map((item) => {
          const active = isActive(item)

          if (item.isCreate) {
            return (
              <button
                key={item.label}
                onClick={() => handleClick(item)}
                className="flex items-center justify-center -mt-3 relative"
                aria-label="Create post"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center accent-bg"
                >
                  <Plus className="w-5 h-5" />
                </div>
              </button>
            )
          }

          return (
            <button
              key={item.label}
              onClick={() => handleClick(item)}
              className="flex flex-col items-center justify-center gap-0.5 py-1 px-3"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon
                className="w-5 h-5 transition-colors duration-150"
                style={{ color: active ? 'var(--primary)' : '#555555' }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? 'var(--primary)' : '#555555' }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
