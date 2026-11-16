'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'motion/react'
import { Heart, X } from 'lucide-react'
import { t } from '@/lib/strings/en'
import { logoSrc, POSTER_SIZES, posterSrc, posterSrcSet } from '@/lib/tmdb/images'
import type { Card, TitleDetails } from '@/lib/tmdb/types'
import type { Decision } from './use-deck'
import { metaLine } from './meta'

const DISTANCE = 120 // px of drag that commits
const VELOCITY = 600 // px/s flick that commits even when short

const exitTo = (d: Decision, reduce: boolean | null) =>
  reduce
    ? { opacity: 0, transition: { duration: 0.15 } }
    : {
        x: d === 'like' ? 520 : d === 'pass' ? -520 : 0,
        y: d === 'seen' ? 720 : 0,
        rotate: d === 'like' ? 14 : d === 'pass' ? -14 : 0,
        opacity: 0,
        transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] as const },
      }

export function SwipeCard({
  card,
  details,
  isTop,
  onDecide,
  onOpen,
}: {
  card: Card
  details?: TitleDetails
  isTop: boolean
  onDecide: (d: Decision) => void
  onOpen: () => void
}) {
  const reduce = useReducedMotion()
  const dragged = useRef(false) // a drag's pointer-up must not count as a tap that opens details
  const open = () => !dragged.current && onOpen()
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-300, 0, 300], [-12, 0, 12])
  const likeOpacity = useTransform(x, [20, DISTANCE], [0, 1])
  const passOpacity = useTransform(x, [-DISTANCE, -20], [1, 0])
  const likeScale = useTransform(x, [20, DISTANCE], [0.8, 1])
  const passScale = useTransform(x, [-DISTANCE, -20], [1, 0.8])

  function onDragEnd(_: unknown, { offset, velocity }: PanInfo) {
    if (offset.x > DISTANCE || (velocity.x > VELOCITY && offset.x > 20)) onDecide('like')
    else if (offset.x < -DISTANCE || (velocity.x < -VELOCITY && offset.x < -20)) onDecide('pass')
  }

  const providers = details?.providers?.stream.slice(0, 4) ?? []

  return (
    <motion.article
      className="absolute inset-0 cursor-grab touch-pan-y overflow-hidden rounded-card bg-surface shadow-[0_24px_60px_rgb(0_0_0/0.55)] select-none active:cursor-grabbing"
      style={{ x, rotate: reduce ? 0 : rotate }}
      drag={isTop ? 'x' : false}
      dragSnapToOrigin
      onPointerDown={() => (dragged.current = false)}
      onDragStart={() => (dragged.current = true)}
      onDragEnd={onDragEnd}
      onTap={isTop ? open : undefined}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: isTop ? 1 : 0.94, y: isTop ? 0 : 10 }}
      exit="exit"
      variants={{ exit: (d: Decision) => exitTo(d, reduce) }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      aria-hidden={!isTop}
    >
      {card.posterPath && (
        // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN sizes, see images.ts
        <img
          src={posterSrc(card.posterPath)}
          srcSet={posterSrcSet(card.posterPath)}
          sizes={POSTER_SIZES}
          alt={card.title}
          draggable={false}
          fetchPriority={isTop ? 'high' : 'auto'}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Apple-style variable blur: the poster softens into the caption instead of a hard scrim. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 backdrop-blur-2xl [mask-image:linear-gradient(to_bottom,transparent,black_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/80 via-black/35 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
        <h2 className="text-title text-balance">
          {/* The title doubles as the keyboard/screen-reader way into details. */}
          <button type="button" onClick={open} tabIndex={isTop ? 0 : -1} aria-label={t.deck.details(card.title)} className="text-left">
            {card.title}
          </button>
        </h2>
        <p className="mt-1 text-small text-white/70">{metaLine(card, details)}</p>
        {providers.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {providers.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN logo
              <img key={p.id} src={logoSrc(p.logoPath)} alt={p.name} title={p.name} width={26} height={26} className="size-[26px] rounded-[7px]" />
            ))}
            <span className="ml-1 text-small text-white/50">JustWatch</span>
          </div>
        )}
      </div>

      <motion.span
        aria-hidden
        style={{ opacity: likeOpacity, scale: likeScale }}
        className="glass glass-accent absolute top-5 left-5 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-small font-semibold text-white"
      >
        <Heart size={16} strokeWidth={2.25} fill="currentColor" /> {t.deck.like}
      </motion.span>
      <motion.span
        aria-hidden
        style={{ opacity: passOpacity, scale: passScale }}
        className="glass absolute top-5 right-5 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-small font-semibold text-white"
      >
        <X size={16} strokeWidth={2.5} /> {t.deck.pass}
      </motion.span>
    </motion.article>
  )
}
