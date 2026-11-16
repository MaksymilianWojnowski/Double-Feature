'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'motion/react'
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

  function onDragEnd(_: unknown, { offset, velocity }: PanInfo) {
    if (offset.x > DISTANCE || (velocity.x > VELOCITY && offset.x > 20)) onDecide('like')
    else if (offset.x < -DISTANCE || (velocity.x < -VELOCITY && offset.x < -20)) onDecide('pass')
  }

  const providers = details?.providers?.stream.slice(0, 4) ?? []

  return (
    <motion.article
      className="absolute inset-0 cursor-grab touch-pan-y overflow-hidden rounded-sm bg-surface select-none active:cursor-grabbing"
      style={{ x, rotate: reduce ? 0 : rotate }}
      drag={isTop ? 'x' : false}
      dragSnapToOrigin
      onPointerDown={() => (dragged.current = false)}
      onDragStart={() => (dragged.current = true)}
      onDragEnd={onDragEnd}
      onTap={isTop ? open : undefined}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: isTop ? 1 : 0.96 }}
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

      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-bg via-bg/75 to-transparent px-5 pt-28 pb-5">
        <h2 className="font-display text-title text-balance">
          {/* The title doubles as the keyboard/screen-reader way into details. */}
          <button type="button" onClick={open} tabIndex={isTop ? 0 : -1} aria-label={t.deck.details(card.title)} className="text-left">
            {card.title}
          </button>
        </h2>
        <p className="mt-1 text-small text-muted">{metaLine(card, details)}</p>
        {providers.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            {providers.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN logo
              <img key={p.id} src={logoSrc(p.logoPath)} alt={p.name} title={p.name} width={24} height={24} className="size-6 rounded-sm" />
            ))}
            <span className="text-small text-muted">JustWatch</span>
          </div>
        )}
      </div>

      <motion.span
        aria-hidden
        style={{ opacity: likeOpacity }}
        className="absolute top-5 left-5 rounded-sm border border-accent px-2 py-1 text-small tracking-[0.2em] text-accent uppercase"
      >
        {t.deck.like}
      </motion.span>
      <motion.span
        aria-hidden
        style={{ opacity: passOpacity }}
        className="absolute top-5 right-5 rounded-sm border border-ink/50 px-2 py-1 text-small tracking-[0.2em] text-ink uppercase"
      >
        {t.deck.pass}
      </motion.span>
    </motion.article>
  )
}
