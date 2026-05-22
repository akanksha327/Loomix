'use client'

import { motion } from 'framer-motion'

export default function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Top-right orb — barely visible warmth */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 800,
          height: 800,
          top: '-200px',
          right: '-200px',
          background:
            'radial-gradient(circle, rgba(199,255,63,0.02) 0%, transparent 70%)',
          filter: 'blur(200px)',
        }}
        animate={{
          x: [0, 30, -20, 10, 0],
          y: [0, -20, 15, -10, 0],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Bottom-left orb — whisper of atmosphere */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 600,
          height: 600,
          bottom: '-150px',
          left: '-150px',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.01) 0%, transparent 70%)',
          filter: 'blur(150px)',
        }}
        animate={{
          x: [0, -20, 25, -10, 0],
          y: [0, 15, -10, 20, 0],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 5,
        }}
      />
    </div>
  )
}
