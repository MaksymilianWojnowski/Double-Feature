'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { t } from '@/lib/strings/en'
import { buttonQuiet } from '@/components/ui/styles'
import { DetailsSheet } from '@/components/details/details-sheet'
import type { Card, TitleDetails } from '@/lib/tmdb/types'
import { ActionBar } from './action-bar'
import { Ambient } from './ambient'
import { SwipeCard } from './swipe-card'
import { useDeck, type Decision, type Match } from './use-deck'

const KEYS: Record<string, Decision | 'undo' | 'open'> = {
  ArrowLeft: 'pass',
  ArrowRight: 'like',
  ArrowDown: 'seen',
  z: 'undo',
  Z: 'undo',
  ' ': 'open',
}

const loaded = (d: TitleDetails | 'error' | undefined) => (typeof d === 'object' ? d : undefined)

export function Deck({ onMatch }: { onMatch?: (m: Match) => void }) {
  const deck = useDeck({ onMatch })
  const [open, setOpen] = useState<Card | null>(null)
  const top = deck.queue[0]

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const action = KEYS[e.key]
      if (!action || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      if (document.querySelector('dialog[open]')) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable]')) return
      if (action === 'open' && target.closest('button, a')) return // Space activates the focused control
      e.preventDefault()
      if (action === 'undo') deck.undo()
      else if (action === 'open') setOpen(deck.queue[0] ?? null)
      else deck.decide(action)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deck])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Ambient posterPath={top?.posterPath} />
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="relative aspect-[2/3] max-h-full w-full">
          {top ? (
            <AnimatePresence initial={false} custom={deck.lastDecision}>
              {deck.queue
                .slice(0, 2)
                .reverse()
                .map((card) => (
                  <SwipeCard
                    key={card.key}
                    card={card}
                    details={loaded(deck.details[card.key])}
                    isTop={card.key === top.key}
                    onDecide={deck.decide}
                    onOpen={() => setOpen(card)}
                  />
                ))}
            </AnimatePresence>
          ) : (
            <EmptyState deck={deck} />
          )}
        </div>
      </div>

      <p role="status" className="h-5 pt-1 text-center text-small text-muted">
        {deck.notice}
      </p>
      <ActionBar onDecide={deck.decide} onUndo={deck.undo} canUndo={deck.canUndo} disabled={!top} />
      <p className="hidden text-center text-caption whitespace-pre text-faint [@media(pointer:fine)]:block">{t.deck.keys}</p>

      <DetailsSheet card={open} details={open ? deck.details[open.key] : undefined} onClose={() => setOpen(null)} />
    </div>
  )
}

function EmptyState({ deck }: { deck: ReturnType<typeof useDeck> }) {
  if (deck.error) {
    return (
      <Placeholder title={t.deck.errorTitle} body={t.deck.errorBody}>
        <button className={`${buttonQuiet} mt-6`} onClick={deck.retry}>
          {t.deck.retry}
        </button>
      </Placeholder>
    )
  }
  if (deck.done) return <Placeholder title={t.deck.emptyTitle} body={t.deck.emptyBody} />
  return (
    <div className="absolute inset-0 animate-pulse rounded-card bg-white/5" role="status" aria-label={t.deck.loading} />
  )
}

function Placeholder({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="glass absolute inset-0 flex flex-col justify-end rounded-card p-6">
      <h2 className="text-title">{title}</h2>
      <p className="mt-2 text-muted">{body}</p>
      {children}
    </div>
  )
}
