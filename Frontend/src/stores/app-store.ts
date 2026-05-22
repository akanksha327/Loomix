import { create } from 'zustand'

export type ViewType = 'landing' | 'feed' | 'community' | 'profile' | 'messages' | 'saved' | 'explore' | 'settings' | 'comments' | 'post-detail'

interface AppState {
  currentView: ViewType
  sidebarExpanded: boolean
  selectedCommunity: string | null
  searchOpen: boolean
  createPostOpen: boolean
  selectedPost: string | null
  isMobile: boolean

  setView: (view: ViewType) => void
  setSidebarExpanded: (expanded: boolean) => void
  setSelectedCommunity: (community: string | null) => void
  setSearchOpen: (open: boolean) => void
  setCreatePostOpen: (open: boolean) => void
  setSelectedPost: (postId: string | null) => void
  setIsMobile: (mobile: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'landing',
  sidebarExpanded: false,
  selectedCommunity: null,
  searchOpen: false,
  createPostOpen: false,
  selectedPost: null,
  isMobile: false,

  setView: (view) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('loomix_current_view', view)
      localStorage.removeItem('loomix_selected_post')
    }
    set((state) => ({
      currentView: view,
      selectedPost: null,
    }))
  },
  setSidebarExpanded: (expanded) => set((state) => (state.sidebarExpanded === expanded ? state : { sidebarExpanded: expanded })),
  setSelectedCommunity: (community) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('loomix_current_view', 'community')
      localStorage.removeItem('loomix_selected_post')
    }
    set((state) =>
      state.selectedCommunity === community && state.currentView === 'community' && state.selectedPost === null
        ? state
        : { selectedCommunity: community, currentView: 'community', selectedPost: null },
    )
  },
  setSearchOpen: (open) => set((state) => (state.searchOpen === open ? state : { searchOpen: open })),
  setCreatePostOpen: (open) => set((state) => (state.createPostOpen === open ? state : { createPostOpen: open })),
  setSelectedPost: (postId) => {
    if (typeof window !== 'undefined') {
      if (postId) {
        localStorage.setItem('loomix_selected_post', postId)
      } else {
        localStorage.removeItem('loomix_selected_post')
      }
    }
    set((state) => (state.selectedPost === postId ? state : { selectedPost: postId }))
  },
  setIsMobile: (mobile) => set((state) => (state.isMobile === mobile ? state : { isMobile: mobile })),
}))
