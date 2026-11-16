'use client'

import { AnimatePresence, motion } from 'motion/react'
import { posterSrc } from '@/lib/tmdb/images'

/** The top card's poster, blurred into the background, so the glass controls have colour to refract. */
export function Ambient({ posterPath }: { posterPath: string | null | undefined }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      <AnimatePresence initial={false}>
        {posterPath && (
          <motion.img
            key={posterPath}
            src={posterSrc(posterPath, 'w185')}
            alt=""
            className="absolute inset-0 h-full w-full scale-125 object-cover blur-3xl saturate-150"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          />
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/45 to-black/75" />
    </div>
  )
}
