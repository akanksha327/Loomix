'use client'

import { useState } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
}

export function LazyImage({ src, alt, className = '', style }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div 
      className="relative w-full h-full bg-white/[0.01] overflow-hidden" 
      style={{
        ...style,
        minHeight: !loaded ? '160px' : undefined
      }}
    >
      {/* Cyberpunk Shimmer Skeleton while loading */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] via-white/[0.03] to-white/[0.01] animate-pulse" />
      )}
      
      <img
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
      />
    </div>
  )
}
