'use client'
 
import React, { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { loadCachedBackendUser, syncUserWithBackend } from '@/lib/backend-auth'
import { useAuthStore } from '@/stores/auth-store'
import { Toaster } from 'sonner'
import AuthModal from './AuthModal'
import { apiRequest } from '@/lib/api'
import { applySettings, loadLocalSettings } from '@/lib/settings'
 
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser)
  const setLoading = useAuthStore((state) => state.setLoading)
  const setAuthModalOpen = useAuthStore((state) => state.setAuthModalOpen)
 
  useEffect(() => {
    let cancelled = false
    let authResolved = false
    applySettings(loadLocalSettings())

    const hydrationFallback = window.setTimeout(() => {
      if (cancelled || authResolved) return
      setUser(null)
      setLoading(false)
    }, 1200)

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      authResolved = true
      window.clearTimeout(hydrationFallback)

      if (firebaseUser) {
        const username = firebaseUser.displayName
          ? firebaseUser.displayName.toLowerCase().replace(/\s+/g, '')
          : firebaseUser.email
          ? firebaseUser.email.split('@')[0]
          : 'user'
 
        const rawProvider = firebaseUser.providerData[0]?.providerId || 'email'
        const provider = rawProvider.includes('google')
          ? 'google'
          : rawProvider.includes('github')
          ? 'github'
          : 'email'
 
        const usesPasswordProvider = firebaseUser.providerData.some(
          (providerData) => providerData.providerId === 'password',
        )
 
        if (usesPasswordProvider && !firebaseUser.emailVerified) {
          setUser(null)
          setAuthModalOpen(true, 'verify-email')
          setLoading(false)
          return
        }
 
        const cachedBackendUser = loadCachedBackendUser(firebaseUser.uid)
        const profile = {
          uid: firebaseUser.uid,
          backendId: cachedBackendUser?.id,
          email: cachedBackendUser?.email || firebaseUser.email,
          displayName: cachedBackendUser?.displayName ?? firebaseUser.displayName,
          photoURL: cachedBackendUser?.avatarUrl || firebaseUser.photoURL,
          username: cachedBackendUser?.username || username,
          bio: cachedBackendUser?.bio,
          emailVerified: firebaseUser.emailVerified,
        }
 
        setUser(profile)
        setLoading(false)

        void syncUserWithBackend({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          username,
          provider,
          emailVerified: firebaseUser.emailVerified,
        }).then((backendUser) => {
          if (cancelled || !backendUser) return

          setUser({
            uid: firebaseUser.uid,
            backendId: backendUser.id,
            email: backendUser.email || firebaseUser.email,
            displayName: backendUser.displayName,
            photoURL: backendUser.avatarUrl,
            username: backendUser.username,
            bio: backendUser.bio,
            emailVerified: backendUser.emailVerified,
          })

          return apiRequest<any>('/api/settings')
            .then((settingsRes) => {
              if (!cancelled && settingsRes.success && settingsRes.data) {
                applySettings(settingsRes.data)
              }
            })
            .catch((error) => {
              console.error('Failed to sync backend settings on auth change:', error)
            })
        })
        .catch((error) => {
          if (!cancelled) {
            console.error('Failed to synchronize authenticated user:', error)
          }
        })
      } else {
        setUser(null)
        applySettings(loadLocalSettings())
        setLoading(false)
      }
    })
 
    return () => {
      cancelled = true
      window.clearTimeout(hydrationFallback)
      unsubscribe()
    }
  }, [setUser, setLoading, setAuthModalOpen])

  return (
    <>
      {children}
      <AuthModal />
      <Toaster 
        theme="dark" 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#151515',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#F5F5F5',
            fontFamily: 'var(--font-inter)',
            borderRadius: '12px',
          },
        }}
      />
    </>
  )
}
