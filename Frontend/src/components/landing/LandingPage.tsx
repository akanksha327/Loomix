'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import AmbientBackground from '@/components/effects/AmbientBackground'

// Cinematic easing — smooth, not bouncy
const ease = [0.16, 1, 0.3, 1] as const

// Stagger container for hero text
const heroContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
}

// Fade-up with slight x offset — editorial tension
const heroItem = {
  hidden: { opacity: 0, y: 24, x: -8 },
  show: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: { duration: 0.8, ease },
  },
}

// Feed card stagger
const feedContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.6,
    },
  },
}

const feedCard = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease },
  },
}

// Section reveal on scroll
const sectionReveal = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease },
  },
}

// Feature reveal
const featureReveal = (delay: number) => ({
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease, delay },
  },
})

// Sample feed data
const feedPosts = [
  {
    id: 1,
    avatar: 'R',
    username: 'raychen',
    community: 'r/DesignSystems',
    time: '12m ago',
    title: 'Why every design system eventually converges on the same tokens',
    comments: 48,
    upvotes: 312,
  },
  {
    id: 2,
    avatar: 'K',
    username: 'kaito_dev',
    community: 'r/WebAssembly',
    time: '34m ago',
    title: 'WASM component model just shipped — this changes the plugin game entirely',
    comments: 23,
    upvotes: 189,
  },
  {
    id: 3,
    avatar: 'M',
    username: 'mari.santos',
    community: 'r/Infrastructure',
    time: '1h ago',
    title: 'We migrated 200 microservices to single-module architecture and cut latency 40%',
    comments: 91,
    upvotes: 743,
  },
  {
    id: 4,
    avatar: 'J',
    username: 'jpark',
    community: 'r/AICreative',
    time: '2h ago',
    title: 'The prompt is the new API — building compositional tools for creative AI',
    comments: 56,
    upvotes: 421,
  },
]

export default function LandingPage() {
  const { setView } = useAppStore()
  const { user, isGuest, setAuthModalOpen } = useAuthStore()

  const handleEnter = () => {
    if (user || isGuest) {
      setView('feed')
    } else {
      setAuthModalOpen(true, 'login')
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col" style={{ background: '#0B0A09' }}>
      {/* Background */}
      <AmbientBackground />

      {/* Main content */}
      <main className="relative z-10 flex-1">
        {/* ── Hero Section ── */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 pt-20 sm:pt-28 pb-16">
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16">
            {/* Left: Typography */}
            <div className="flex-1 min-w-0">
              <motion.div
                variants={heroContainer}
                initial="hidden"
                animate="show"
                className="relative"
              >
                {/* Line 1: small, light, secondary */}
                <motion.p
                  variants={heroItem}
                  className="text-sm sm:text-base font-light tracking-wide mb-1 sm:mb-2"
                  style={{ fontFamily: 'var(--font-inter)', color: '#888888' }}
                >
                  The OS for
                </motion.p>

                {/* Line 2: massive, display, primary */}
                <motion.h1
                  variants={heroItem}
                  className="text-7xl sm:text-8xl md:text-9xl font-bold leading-[0.85] tracking-tightest"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: '#F5F5F5',
                    letterSpacing: '-0.04em',
                  }}
                >
                  Digital
                </motion.h1>

                {/* Line 3: massive, display, accent */}
                <motion.h1
                  variants={heroItem}
                  className="text-7xl sm:text-8xl md:text-9xl font-bold leading-[0.85] tracking-tightest -mt-2 sm:-mt-3"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: '#F59E0B',
                    letterSpacing: '-0.04em',
                  }}
                >
                  Communities
                </motion.h1>

                {/* Description */}
                <motion.p
                  variants={heroItem}
                  className="mt-6 sm:mt-8 text-sm leading-relaxed max-w-sm"
                  style={{ fontFamily: 'var(--font-inter)', color: '#888888' }}
                >
                  Where conversations become infrastructure.
                </motion.p>

                {/* CTAs */}
                <motion.div
                  variants={heroItem}
                  className="mt-6 sm:mt-8 flex items-center gap-5"
                >
                  <button
                    onClick={handleEnter}
                    className="px-5 py-2 rounded-md text-sm font-medium transition-premium hover:opacity-90 cursor-pointer"
                    style={{
                      fontFamily: 'var(--font-inter)',
                      background: '#F59E0B',
                      color: '#0B0A09',
                    }}
                  >
                    Enter
                  </button>
                  <button
                    className="text-sm font-normal transition-premium hover:underline underline-offset-4 cursor-pointer"
                    style={{
                      fontFamily: 'var(--font-inter)',
                      color: '#888888',
                    }}
                  >
                    Learn more
                  </button>
                </motion.div>
              </motion.div>
            </div>

            {/* Right: Live Feed Preview */}
            <div className="mt-12 lg:mt-20 w-full lg:w-[340px] flex-shrink-0">
              <motion.div
                variants={feedContainer}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-2"
              >
                {/* Feed header */}
                <motion.div
                  variants={feedCard}
                  className="flex items-center gap-2 mb-1 px-1"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#F59E0B' }}
                  />
                  <span
                    className="text-[10px] uppercase tracking-widest font-medium"
                    style={{ fontFamily: 'var(--font-inter)', color: '#555555' }}
                  >
                    Live
                  </span>
                </motion.div>

                {feedPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    variants={feedCard}
                    whileHover={{ y: -2, transition: { duration: 0.3, ease } }}
                    className="surface rounded-lg p-3.5 cursor-default"
                  >
                    {/* Top row: avatar + username + community + time */}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                        style={{
                          background: '#1A1A1A',
                          color: '#888888',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {post.avatar}
                      </div>
                      <span
                        className="text-xs font-medium truncate"
                        style={{ fontFamily: 'var(--font-inter)', color: '#F5F5F5' }}
                      >
                        {post.username}
                      </span>
                      <span
                        className="text-[10px] truncate"
                        style={{ fontFamily: 'var(--font-inter)', color: '#555555' }}
                      >
                        · {post.community}
                      </span>
                      <span
                        className="text-[10px] ml-auto flex-shrink-0"
                        style={{ fontFamily: 'var(--font-inter)', color: '#555555' }}
                      >
                        {post.time}
                      </span>
                    </div>

                    {/* Post title */}
                    <p
                      className="text-[13px] font-medium leading-snug"
                      style={{ fontFamily: 'var(--font-inter)', color: '#F5F5F5' }}
                    >
                      {post.title}
                    </p>

                    {/* Engagement */}
                    <div
                      className="flex items-center gap-3 mt-2.5 text-[11px]"
                      style={{ fontFamily: 'var(--font-inter)', color: '#555555' }}
                    >
                      <span>{post.upvotes} ↑</span>
                      <span>{post.comments} replies</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Features Section ── */}
        <motion.section
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="max-w-6xl mx-auto px-6 sm:px-8 py-16 sm:py-24"
        >
          {/* Section header */}
          <div className="mb-12 sm:mb-16">
            <motion.span
              variants={featureReveal(0)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="text-[11px] uppercase tracking-[0.2em] font-medium block mb-3"
              style={{ fontFamily: 'var(--font-inter)', color: '#F59E0B' }}
            >
              Features
            </motion.span>
            <motion.h2
              variants={featureReveal(0.1)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="text-4xl sm:text-5xl font-semibold tracking-tightest"
              style={{
                fontFamily: 'var(--font-display)',
                color: '#F5F5F5',
                letterSpacing: '-0.04em',
              }}
            >
              Built different.
            </motion.h2>
          </div>

          {/* Asymmetric grid: 1 large + 2 small */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Large featured feature */}
            <motion.div
              variants={featureReveal(0.15)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="surface rounded-xl p-6 sm:p-8 lg:row-span-2 min-h-[280px] sm:min-h-[340px] flex flex-col justify-end"
            >
              <h3
                className="text-xl sm:text-2xl font-semibold tracking-tight mb-3"
                style={{ fontFamily: 'var(--font-display)', color: '#F5F5F5' }}
              >
                Real-time threads
              </h3>
              <p
                className="text-sm leading-relaxed max-w-md"
                style={{ fontFamily: 'var(--font-inter)', color: '#888888' }}
              >
                Conversations that move at the speed of thought. No refresh. No lag.
              </p>
            </motion.div>

            {/* Small feature 1 */}
            <motion.div
              variants={featureReveal(0.25)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="surface rounded-xl p-6 sm:p-8"
            >
              <h3
                className="text-lg sm:text-xl font-semibold tracking-tight mb-2"
                style={{ fontFamily: 'var(--font-display)', color: '#F5F5F5' }}
              >
                Community OS
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ fontFamily: 'var(--font-inter)', color: '#888888' }}
              >
                Every community is a self-contained operating system with its own rules, culture, and economy.
              </p>
            </motion.div>

            {/* Small feature 2 */}
            <motion.div
              variants={featureReveal(0.35)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="surface rounded-xl p-6 sm:p-8"
            >
              <h3
                className="text-lg sm:text-xl font-semibold tracking-tight mb-2"
                style={{ fontFamily: 'var(--font-display)', color: '#F5F5F5' }}
              >
                Signal over noise
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ fontFamily: 'var(--font-inter)', color: '#888888' }}
              >
                AI-curated feeds that surface what matters. Your attention is sacred.
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* ── Stats Section — Editorial Bar ── */}
        <motion.section
          variants={sectionReveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="max-w-6xl mx-auto px-6 sm:px-8 py-10 sm:py-14"
        >
          <div
            className="surface rounded-lg px-6 sm:px-10 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight"
                style={{ fontFamily: 'var(--font-display)', color: '#F5F5F5' }}
              >
                12K
              </span>
              <span
                className="text-sm"
                style={{ fontFamily: 'var(--font-inter)', color: '#888888' }}
              >
                communities
              </span>
            </div>

            <div className="hidden sm:block w-px h-8 mx-6" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="sm:hidden w-12 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight"
                style={{ fontFamily: 'var(--font-display)', color: '#F5F5F5' }}
              >
                540K
              </span>
              <span
                className="text-sm"
                style={{ fontFamily: 'var(--font-inter)', color: '#888888' }}
              >
                members
              </span>
            </div>

            <div className="hidden sm:block w-px h-8 mx-6" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="sm:hidden w-12 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight"
                style={{ fontFamily: 'var(--font-display)', color: '#F5F5F5' }}
              >
                1.2M
              </span>
              <span
                className="text-sm"
                style={{ fontFamily: 'var(--font-inter)', color: '#888888' }}
              >
                threads
              </span>
            </div>
          </div>
        </motion.section>
      </main>

      {/* ── Footer — Minimal ── */}
      <footer
        className="relative z-10 mt-auto"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: '#F5F5F5' }}
            >
              Loomix
            </span>
            <span
              className="text-xs"
              style={{ fontFamily: 'var(--font-inter)', color: '#555555' }}
            >
              © 2026
            </span>
          </div>
          <div className="flex items-center gap-5">
            {['Privacy', 'Terms', 'Docs', 'Contact'].map((link) => (
              <a
                key={link}
                href="#"
                className="text-xs transition-premium hover:underline underline-offset-4"
                style={{ fontFamily: 'var(--font-inter)', color: '#555555' }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color = '#888888'
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = '#555555'
                }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
