'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  Github, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Loader2, 
  Check, 
  X,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  type User
} from 'firebase/auth'
import { auth, googleProvider, githubProvider } from '@/lib/firebase'
import { syncUserWithBackend } from '@/lib/backend-auth'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'

// Easing curve
const ease = [0.16, 1, 0.3, 1] as const

// Animation variants
const backdropVariants = {
  hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
  visible: { 
    opacity: 1, 
    backdropFilter: 'blur(12px)',
    transition: { duration: 0.4, ease }
  },
  exit: { 
    opacity: 0, 
    backdropFilter: 'blur(0px)',
    transition: { duration: 0.3, ease }
  }
} satisfies Variants

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      type: 'spring', 
      damping: 25, 
      stiffness: 180,
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.96, 
    y: 10,
    transition: { duration: 0.25, ease }
  }
} satisfies Variants

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.4, ease } 
  }
} satisfies Variants

export default function AuthModal() {
  const { 
    authModalOpen, 
    authModalTab, 
    setAuthModalOpen, 
    setAuthModalTab, 
    setUser, 
    setGuest,
    redirectViewAfterAuth,
    setRedirectViewAfterAuth
  } = useAuthStore()

  const { setView } = useAppStore()

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  
  // Interaction states
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'invalid'>('idle')
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: 'Too Short', color: '#FF4444' })

  // Reset forms on tab change
  useEffect(() => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setUsername('')
    setUsernameStatus('idle')
  }, [authModalTab])

  // Username validation effect
  useEffect(() => {
    if (!username) {
      setUsernameStatus('idle')
      return
    }

    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus('invalid')
      return
    }

    setUsernameStatus('checking')
    const timer = setTimeout(() => {
      // Simulate API availability check
      setUsernameStatus('available')
    }, 600)

    return () => clearTimeout(timer)
  }, [username])

  // Password strength checker
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, text: 'Too Short', color: '#FF4444' })
      return
    }

    if (password.length < 6) {
      setPasswordStrength({ score: 1, text: 'Too Short', color: '#FF4444' })
      return
    }

    let score = 2
    const hasNumbers = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)

    if (hasNumbers && hasLowercase && hasUppercase) score = 3
    if (hasNumbers && hasSpecial && hasUppercase && hasLowercase && password.length >= 10) score = 4

    let text = 'Weak'
    let color = '#FF4444' // red
    if (score === 2) { text = 'Fair'; color = '#FFAA00' } // orange
    if (score === 3) { text = 'Good'; color = '#C7FF3F' } // lime
    if (score === 4) { text = 'Excellent'; color = '#00E676' } // green

    setPasswordStrength({ score, text, color })
  }, [password])

  if (!authModalOpen) return null

  const currentVerificationEmail = auth.currentUser?.email || email || 'your email'
  const modalTitle = authModalTab === 'login'
    ? 'Welcome Back'
    : authModalTab === 'verify-email'
    ? 'Verify Email'
    : 'Create Account'
  const modalDescription = authModalTab === 'login'
    ? 'Enter credentials or authenticate with socials.'
    : authModalTab === 'verify-email'
    ? `Check ${currentVerificationEmail} to finish signing in.`
    : 'Sign up to gain full access to the platform.'

  // Translate Firebase Errors to user-friendly messages
  const handleAuthError = (error: any) => {
    console.error("Firebase auth error:", error)
    const code = error.code
    
    switch (code) {
      case 'auth/invalid-email':
        toast.error("Please enter a valid email address.")
        break
      case 'auth/user-disabled':
        toast.error("This account has been disabled.")
        break
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        toast.error("Incorrect email or password. Please try again.")
        break
      case 'auth/email-already-in-use':
        toast.error("This email is already registered. Try logging in instead.")
        break
      case 'auth/weak-password':
        toast.error("Password is too weak. Please use at least 6 characters.")
        break
      case 'auth/popup-blocked':
        toast.error("Sign-in popup was blocked by your browser. Please enable popups.")
        break
      case 'auth/popup-closed-by-user':
        toast.error("Sign-in popup was closed. Please complete the authentication process.")
        break
      case 'auth/network-request-failed':
        toast.error("Network error. Please check your connection.")
        break
      case 'auth/too-many-requests':
        toast.error("Too many attempts. Please wait a moment and try again.")
        break
      default:
        toast.error(error.message || "An authentication error occurred. Please try again.")
    }
  }

  const isPasswordUser = (user: User) =>
    user.providerData.some((providerData) => providerData.providerId === 'password')

  const profileFromFirebaseUser = (user: User, fallbackUsername?: string) => {
    const username = fallbackUsername
      ? fallbackUsername.toLowerCase()
      : user.displayName
      ? user.displayName.toLowerCase().replace(/\s+/g, '')
      : user.email?.split('@')[0] || 'user'

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || fallbackUsername || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL,
      username,
      emailVerified: user.emailVerified,
    }
  }

  // Handle successful login/signup
  const handleSuccess = (userProfile: any, method: string) => {
    setUser(userProfile)
    setAuthModalOpen(false)
    
    toast.success(`Successfully signed in with ${method}!`)
    
    // Redirect gracefully
    if (redirectViewAfterAuth) {
      setView(redirectViewAfterAuth as any)
      setRedirectViewAfterAuth(null)
    } else {
      setView('feed')
    }
  }

  // Social Auth
  const handleSocialAuth = async (provider: any, name: string) => {
    setIsLoading(true)
    try {
      const result = await signInWithPopup(auth, provider)
      const u = result.user
      handleSuccess(profileFromFirebaseUser(u), name)
    } catch (error) {
      handleAuthError(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Password reset
  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address in the field first.")
      return
    }
    
    setIsLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      toast.success("Password reset email sent! Please check your inbox.")
    } catch (error) {
      handleAuthError(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please fill in all fields.")
      return
    }

    setIsLoading(true)
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      const u = result.user
      await reload(u)

      if (isPasswordUser(u) && !u.emailVerified) {
        setUser(null)
        setAuthModalTab('verify-email')
        toast.error("Please verify your email before signing in.")
        return
      }

      handleSuccess(profileFromFirebaseUser(u), 'Email')
    } catch (error) {
      handleAuthError(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Submit Signup
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields.")
      return
    }

    if (usernameStatus === 'invalid') {
      toast.error("Username is invalid. Use letters, numbers, and underscores.")
      return
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }

    setIsLoading(true)
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      const u = result.user
      
      // Update profile username
      await updateProfile(u, {
        displayName: username
      })

      try {
        await sendEmailVerification(u)
        toast.success("Verification email sent. Please check your inbox.")
      } catch (verificationError) {
        handleAuthError(verificationError)
      }

      setUser(null)
      setAuthModalTab('verify-email')
    } catch (error) {
      handleAuthError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuestEntry = () => {
    setGuest(true)
    setAuthModalOpen(false)
    setView('feed')
    toast.success("Entered platform as Guest. Some features will be limited.")
  }

  const handleResendVerification = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      toast.error("Please sign in again to resend verification.")
      setAuthModalTab('login')
      return
    }

    setIsLoading(true)
    try {
      await sendEmailVerification(currentUser)
      toast.success("Verification email sent again.")
    } catch (error) {
      handleAuthError(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerificationCheck = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      toast.error("Please sign in again after verifying your email.")
      setAuthModalTab('login')
      return
    }

    setIsLoading(true)
    try {
      await reload(currentUser)
      if (!currentUser.emailVerified) {
        toast.error("Email is not verified yet. Please click the link in your inbox first.")
        return
      }

      const profile = profileFromFirebaseUser(currentUser)
      await syncUserWithBackend({
        ...profile,
        provider: 'email',
        emailVerified: true,
      })
      handleSuccess({ ...profile, emailVerified: true }, 'Email')
    } catch (error) {
      handleAuthError(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        style={{ background: 'rgba(0, 0, 0, 0.75)' }}
        onClick={() => setAuthModalOpen(false)}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-4xl h-auto min-h-[520px] rounded-2xl overflow-hidden flex flex-col md:flex-row"
          style={{ 
            background: 'var(--background)', 
            border: '1px solid var(--border)',
            boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.9), 0 0 1px 1px rgba(199, 255, 63, 0.05)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setAuthModalOpen(false)}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer"
            style={{ color: '#888888' }}
          >
            <X className="w-4 h-4" />
          </button>

          {/* ── LEFT PANEL: BRANDING & LIVE GRAPHICS (Desktop Only) ── */}
          <div 
            className="hidden md:flex flex-col justify-between p-10 w-[42%] shrink-0 relative overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, #111111 0%, #060606 100%)',
              borderRight: '1px solid rgba(255, 255, 255, 0.04)' 
            }}
          >
            {/* Ambient glows inside left panel */}
            <div className="absolute top-1/4 -left-16 w-44 h-44 rounded-full bg-[#C7FF3F]/5 blur-[70px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-16 w-44 h-44 rounded-full bg-blue-500/5 blur-[70px] pointer-events-none" />
            
            {/* Top row */}
            <div className="relative z-10">
              <span className="font-display font-bold text-lg tracking-tight flex items-center gap-1.5" style={{ color: '#F5F5F5' }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#C7FF3F' }} />
                Loomix
              </span>
              <p className="text-[11px] font-mono tracking-widest mt-1 uppercase" style={{ color: '#555555' }}>
                DIGITAL COMMUNITY OS
              </p>
            </div>

            {/* Live Platform Preview / Animated Visuals */}
            <div className="relative z-10 my-auto py-6">
              <motion.div 
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {/* Visual grid card 1 */}
                <div 
                  className="rounded-lg p-3 text-[11px]" 
                  style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#C7FF3F' }} />
                    <span className="font-medium" style={{ color: '#C7FF3F' }}>r/qdev</span>
                    <span className="ml-auto" style={{ color: '#444' }}>active now</span>
                  </div>
                  <p className="font-medium line-clamp-1" style={{ color: '#F5F5F5' }}>
                    Compiling Rust into WASM microservices...
                  </p>
                </div>

                {/* Visual grid card 2 */}
                <div 
                  className="rounded-lg p-3 text-[11px]" 
                  style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="font-medium" style={{ color: '#888888' }}>r/DesignSystems</span>
                    <span className="ml-auto" style={{ color: '#444' }}>3h ago</span>
                  </div>
                  <p className="font-medium line-clamp-1" style={{ color: '#888888' }}>
                    Why standardizing spacing tokens saves weeks...
                  </p>
                </div>
              </motion.div>

              {/* Tagline */}
              <div className="mt-8">
                <h3 className="text-xl font-bold tracking-tight leading-tight" style={{ fontFamily: 'var(--font-display)', color: '#F5F5F5' }}>
                  Step into the future of social networks.
                </h3>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: '#888888' }}>
                  Secure, responsive, and completely tailored to your digital ecosystem. Log in to claim your profile.
                </p>
              </div>
            </div>

            {/* Bottom info */}
            <div className="relative z-10 flex items-center gap-2 text-[10px]" style={{ color: '#444444' }}>
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#C7FF3F' }} />
              <span>Secured by Firebase Protocol</span>
            </div>
          </div>

          {/* ── RIGHT PANEL: AUTH FORMS ── */}
          <div className="flex-1 p-6 sm:p-10 flex flex-col justify-center">
            {/* Header info */}
            <div className="mb-6">
              <span className="text-[10px] md:hidden font-bold tracking-widest uppercase mb-1 block" style={{ color: '#C7FF3F' }}>
                Loomix OS
              </span>
              <h2 className="text-2xl font-bold font-display" style={{ color: '#F5F5F5' }}>
                {modalTitle}
              </h2>
              <p className="text-xs mt-1" style={{ color: '#888888' }}>
                {modalDescription}
              </p>
            </div>

            {/* ── Social Login Row ── */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <motion.button
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleSocialAuth(googleProvider, 'Google')}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150 border disabled:opacity-50"
                style={{ 
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: 'rgba(255,255,255,0.06)',
                  color: '#F5F5F5'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                }}
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>}
                Google
              </motion.button>

              <motion.button
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleSocialAuth(githubProvider, 'GitHub')}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium cursor-pointer transition-colors duration-150 border disabled:opacity-50"
                style={{ 
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: 'rgba(255,255,255,0.06)',
                  color: '#F5F5F5'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                }}
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
                GitHub
              </motion.button>
            </div>

            {/* Separator */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <span className="text-[10px] uppercase font-medium font-mono" style={{ color: '#444444' }}>or continue with</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>

            {/* ── LOGIN FORM ── */}
            {authModalTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium block" style={{ color: '#888888' }}>EMAIL ADDRESS</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#555555' }}>
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="w-full text-xs py-2.5 pl-10 pr-4 rounded-lg bg-white/[0.02] border transition-all duration-200 outline-none"
                      style={{ 
                        borderColor: 'rgba(255,255,255,0.06)',
                        color: '#F5F5F5'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#C7FF3F'
                        e.target.style.background = 'rgba(199,255,63,0.01)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.06)'
                        e.target.style.background = 'rgba(255,255,255,0.02)'
                      }}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium block" style={{ color: '#888888' }}>PASSWORD</label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isLoading}
                      className="text-[11px] font-medium hover:underline text-[#C7FF3F] bg-transparent border-none cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#555555' }}>
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full text-xs py-2.5 pl-10 pr-10 rounded-lg bg-white/[0.02] border transition-all duration-200 outline-none"
                      style={{ 
                        borderColor: 'rgba(255,255,255,0.06)',
                        color: '#F5F5F5'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#C7FF3F'
                        e.target.style.background = 'rgba(199,255,63,0.01)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.06)'
                        e.target.style.background = 'rgba(255,255,255,0.02)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 bg-transparent border-none cursor-pointer p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-800 bg-black text-[#C7FF3F] focus:ring-offset-black accent-[#C7FF3F] w-3.5 h-3.5"
                  />
                  <label htmlFor="remember" className="text-[11px] font-medium cursor-pointer" style={{ color: '#888888' }}>
                    Remember me on this device
                  </label>
                </div>

                {/* Action button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer disabled:opacity-50"
                  style={{
                    background: '#C7FF3F',
                    color: '#0D0D0D'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ── SIGNUP FORM ── */}
            {authModalTab === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                {/* Username Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium block" style={{ color: '#888888' }}>USERNAME</label>
                    {usernameStatus === 'checking' && <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#888888' }} />}
                    {usernameStatus === 'available' && <span className="text-[10px] text-[#C7FF3F] flex items-center gap-0.5"><Check className="w-3 h-3" /> available</span>}
                    {usernameStatus === 'invalid' && <span className="text-[10px] text-red-500 flex items-center gap-0.5"><AlertCircle className="w-3 h-3" /> invalid</span>}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#555555' }}>
                      <UserIcon className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.trim())}
                      disabled={isLoading}
                      className="w-full text-xs py-2.5 pl-10 pr-4 rounded-lg bg-white/[0.02] border transition-all duration-200 outline-none"
                      style={{ 
                        borderColor: 'rgba(255,255,255,0.06)',
                        color: '#F5F5F5'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#C7FF3F'
                        e.target.style.background = 'rgba(199,255,63,0.01)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.06)'
                        e.target.style.background = 'rgba(255,255,255,0.02)'
                      }}
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium block" style={{ color: '#888888' }}>EMAIL ADDRESS</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#555555' }}>
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="w-full text-xs py-2.5 pl-10 pr-4 rounded-lg bg-white/[0.02] border transition-all duration-200 outline-none"
                      style={{ 
                        borderColor: 'rgba(255,255,255,0.06)',
                        color: '#F5F5F5'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#C7FF3F'
                        e.target.style.background = 'rgba(199,255,63,0.01)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.06)'
                        e.target.style.background = 'rgba(255,255,255,0.02)'
                      }}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium block" style={{ color: '#888888' }}>PASSWORD</label>
                    {password && (
                      <span className="text-[10px] font-medium" style={{ color: passwordStrength.color }}>
                        {passwordStrength.text}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#555555' }}>
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="•••••••• (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full text-xs py-2.5 pl-10 pr-10 rounded-lg bg-white/[0.02] border transition-all duration-200 outline-none"
                      style={{ 
                        borderColor: 'rgba(255,255,255,0.06)',
                        color: '#F5F5F5'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#C7FF3F'
                        e.target.style.background = 'rgba(199,255,63,0.01)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.06)'
                        e.target.style.background = 'rgba(255,255,255,0.02)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 bg-transparent border-none cursor-pointer p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  
                  {/* Strength Bar */}
                  {password.length > 0 && (
                    <div className="flex gap-1 h-1 w-full mt-1.5 rounded-full overflow-hidden bg-white/5">
                      {[1, 2, 3, 4].map((step) => (
                        <div 
                          key={step} 
                          className="flex-1 transition-all duration-300"
                          style={{
                            background: step <= passwordStrength.score ? passwordStrength.color : 'transparent'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium block" style={{ color: '#888888' }}>CONFIRM PASSWORD</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#555555' }}>
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full text-xs py-2.5 pl-10 pr-10 rounded-lg bg-white/[0.02] border transition-all duration-200 outline-none"
                      style={{ 
                        borderColor: 'rgba(255,255,255,0.06)',
                        color: '#F5F5F5'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#C7FF3F'
                        e.target.style.background = 'rgba(199,255,63,0.01)'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.06)'
                        e.target.style.background = 'rgba(255,255,255,0.02)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 bg-transparent border-none cursor-pointer p-0.5"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <span className="text-[10px] text-red-500 block mt-1">Passwords do not match</span>
                  )}
                </div>

                {/* Submit Signup Button */}
                <button
                  type="submit"
                  disabled={isLoading || password !== confirmPassword || passwordStrength.score < 1 || usernameStatus === 'invalid'}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer disabled:opacity-40"
                  style={{
                    background: '#C7FF3F',
                    color: '#0D0D0D'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) e.currentTarget.style.opacity = '0.9'
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) e.currentTarget.style.opacity = '1'
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      Register Profile
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {authModalTab === 'verify-email' && (
              <div className="space-y-4">
                <div
                  className="rounded-lg p-4 border"
                  style={{
                    background: 'rgba(199,255,63,0.03)',
                    borderColor: 'rgba(199,255,63,0.16)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#C7FF3F' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#F5F5F5' }}>
                        Verify {currentVerificationEmail}
                      </p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: '#888888' }}>
                        Open the verification link we sent, then come back here to continue.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleVerificationCheck}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer disabled:opacity-50"
                  style={{ background: '#C7FF3F', color: '#0D0D0D' }}
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'I verified my email'}
                </button>

                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors duration-150 bg-transparent disabled:opacity-50"
                  style={{
                    borderColor: 'rgba(255,255,255,0.06)',
                    color: '#F5F5F5',
                  }}
                >
                  Resend verification email
                </button>
              </div>
            )}

            {/* Footer switcher */}
            <div className="mt-5 text-center flex flex-col items-center gap-3">
              <span className="text-xs" style={{ color: '#888888' }}>
                {authModalTab === 'login' ? "Don't have an account? " : authModalTab === 'verify-email' ? 'Already verified? ' : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => setAuthModalTab(authModalTab === 'login' ? 'signup' : 'login')}
                  className="font-medium hover:underline text-[#C7FF3F] bg-transparent border-none cursor-pointer"
                >
                  {authModalTab === 'login' ? 'Sign up' : authModalTab === 'verify-email' ? 'Back to sign in' : 'Log in'}
                </button>
              </span>

              {/* Guest option */}
              <div className="flex items-center gap-3 w-full mt-1">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] uppercase font-mono font-medium" style={{ color: '#444444' }}>alternative</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <button
                type="button"
                onClick={handleGuestEntry}
                disabled={isLoading}
                className="w-full py-2 px-3 text-xs rounded-lg font-medium border cursor-pointer transition-colors duration-150 bg-transparent disabled:opacity-50"
                style={{ 
                  borderColor: 'rgba(255,255,255,0.06)',
                  color: '#888888'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                  e.currentTarget.style.color = '#F5F5F5'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.color = '#888888'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Continue as Guest
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
