'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'
import { motion } from 'framer-motion'

function subscribeToPointerCoarse(callback: () => void) {
  const mediaQuery = window.matchMedia('(pointer: coarse)')
  mediaQuery.addEventListener('change', callback)
  return () => mediaQuery.removeEventListener('change', callback)
}

function getPointerCoarseSnapshot() {
  return window.matchMedia('(pointer: coarse)').matches
}

function getPointerCoarseServerSnapshot() {
  return false
}

export default function CursorGlow() {
  const [isVisible, setIsVisible] = useState(false)
  const isTouchDevice = useSyncExternalStore(
    subscribeToPointerCoarse,
    getPointerCoarseSnapshot,
    getPointerCoarseServerSnapshot
  )

  const cursorX = useMotionValue(-300)
  const cursorY = useMotionValue(-300)

  const springConfig = { damping: 30, stiffness: 200, mass: 0.5 }
  const springX = useSpring(cursorX, springConfig)
  const springY = useSpring(cursorY, springConfig)

  const rafRef = useRef<number>(0)
  const visibleRef = useRef(false)

  useEffect(() => {
    if (isTouchDevice) return

    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        cursorX.set(e.clientX - 100)
        cursorY.set(e.clientY - 100)
      })

      if (!visibleRef.current) {
        visibleRef.current = true
        setIsVisible(true)
      }
    }

    const handleMouseLeave = () => {
      visibleRef.current = false
      setIsVisible(false)
    }

    const handleMouseEnter = () => {
      if (!visibleRef.current) {
        visibleRef.current = true
        setIsVisible(true)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [cursorX, cursorY, isTouchDevice])

  if (isTouchDevice) return null

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[1]"
      style={{
        x: springX,
        y: springY,
        width: 200,
        height: 200,
        background:
          'radial-gradient(circle, rgba(199,255,63,0.03) 0%, transparent 70%)',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
      aria-hidden="true"
    />
  )
}
