'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import { useT } from '@/lib/i18n/client'
import { posterSrc } from '@/lib/tmdb/images'
import { button, buttonQuiet } from '@/components/ui/styles'
import type { Match } from '@/components/deck/use-deck'

/** The match moment: poster, "It's a match", two choices. Restrained on purpose: no confetti. */
export function MatchMoment({ match, onDone }: { match: Match | null; onDone: () => void }) {
  const t = useT()
  const ref = useRef<HTMLDialogElement>(null)
  const router = useRouter()
  const reduce = useReducedMotion()

  useEffect(() => {
    const dialog = ref.current
    if (match && !dialog?.open) {
      dialog?.showModal()
      navigator.vibrate?.([12, 60, 12])
    }
    if (!match && dialog?.open) dialog.close()
  }, [match])

  function view() {
    if (!match) return
    router.push(`/matches?open=${encodeURIComponent(`${match.media_type}:${match.tmdb_id}`)}`)
    ref.current?.close()
  }

  return (
    <dialog
      ref={ref}
      onClose={onDone}
      aria-labelledby="match-title"
      className="m-0 h-dvh max-h-none w-full max-w-none bg-black p-0 text-ink backdrop:bg-black"
    >
      {match && (
        <div key={match.id} className="relative flex h-full flex-col items-center justify-center gap-8 overflow-hidden px-8">
          {match.poster_path && (
            // eslint-disable-next-line @next/next/no-img-element -- blurred backdrop
            <img src={posterSrc(match.poster_path, 'w342')} alt="" className="absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-60 blur-3xl saturate-150" />
          )}
          <div className="absolute inset-0 -z-10 bg-black/40" />

          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 240, damping: 22 }}
            className="aspect-[2/3] w-[min(62vw,250px)] overflow-hidden rounded-[24px] bg-surface shadow-[0_30px_80px_rgb(0_0_0/0.6)]"
          >
            {match.poster_path && (
              // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN
              <img src={posterSrc(match.poster_path)} alt={match.title} className="h-full w-full object-cover" />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.18, duration: 0.3 }}
            className="text-center"
          >
            <h2 id="match-title" className="text-title text-accent">
              {t.match.title}
            </h2>
            <p className="mt-1 text-muted">
              {match.title}
              {match.year ? ` · ${match.year}` : ''}
            </p>
          </motion.div>

          <div className="flex w-full max-w-xs flex-col gap-3">
            <button type="button" className={button} onClick={view}>
              {t.match.view}
            </button>
            <button type="button" className={buttonQuiet} onClick={() => ref.current?.close()} autoFocus>
              {t.match.keepSwiping}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
