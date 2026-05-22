import { create } from 'zustand'
import { auth } from '@/lib/firebase'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { useAppStore } from '@/stores/app-store'
import { clearCachedBackendUser } from '@/lib/backend-auth'

export interface UserProfile {
  uid: string
  backendId?: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  username?: string
  bio?: string | null
  emailVerified?: boolean
  usernameChangedAt?: string | null
}

interface AuthState {
  user: UserProfile | null
  isGuest: boolean
  loading: boolean
  authModalOpen: boolean
  authModalTab: 'login' | 'signup' | 'verify-email'
  redirectViewAfterAuth: string | null // For redirecting gracefully after authentication

  setUser: (user: UserProfile | null) => void
  setGuest: (isGuest: boolean) => void
  setLoading: (loading: boolean) => void
  setAuthModalOpen: (open: boolean, tab?: 'login' | 'signup' | 'verify-email') => void
  setAuthModalTab: (tab: 'login' | 'signup' | 'verify-email') => void
  setRedirectViewAfterAuth: (view: string | null) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => {
  // Safe default initialization of isGuest from localStorage on the client side
  const initialGuest = typeof window !== 'undefined' ? localStorage.getItem('loomix_is_guest') === 'true' : false

  return {
    user: null,
    isGuest: initialGuest,
    loading: true,
    authModalOpen: false,
    authModalTab: 'login',
    redirectViewAfterAuth: null,

    setUser: (user) => {
      if (user && typeof window !== 'undefined') {
        localStorage.removeItem('loomix_is_guest')
      }
      set({ 
        user, 
        isGuest: user ? false : (typeof window !== 'undefined' ? localStorage.getItem('loomix_is_guest') === 'true' : false) 
      })
    },
    setGuest: (isGuest) => {
      if (typeof window !== 'undefined') {
        if (isGuest) {
          localStorage.setItem('loomix_is_guest', 'true')
        } else {
          localStorage.removeItem('loomix_is_guest')
        }
      }
      set({ isGuest, user: isGuest ? null : null })
    },
    setLoading: (loading) => set({ loading }),
    setAuthModalOpen: (open, tab = 'login') => set({ authModalOpen: open, authModalTab: tab }),
    setAuthModalTab: (tab) => set({ authModalTab: tab }),
    setRedirectViewAfterAuth: (view) => set({ redirectViewAfterAuth: view }),
    logout: async () => {
      try {
        await firebaseSignOut(auth)
      } catch (e) {
        console.error("Firebase signout error:", e)
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('loomix_is_guest')
        localStorage.removeItem('loomix_current_view')
        localStorage.removeItem('loomix_selected_post')
      }
      clearCachedBackendUser()
      // Access app store to reset active navigation state
      useAppStore.getState().setView('landing')
      useAppStore.getState().setSelectedPost(null)
      
      set({ user: null, isGuest: false, redirectViewAfterAuth: null })
    }
  }
})
