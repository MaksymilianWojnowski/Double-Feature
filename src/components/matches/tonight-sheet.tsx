'use client'

import { useEffect, useRef, useState } from 'react'
import { Shuffle, X } from 'lucide-react'
import { t } from '@/lib/strings/en'
import { posterSrc } from '@/lib/tmdb/images'
import { matchFacts, pickTonight, type MatchItem } from '@/lib/matches'
import { metaLine } from '@/components/deck/meta'
import { button, buttonQuiet, iconButton } from '@/components/ui/styles'

const LIMITS = [undefined, 90, 120, 150] as const

/** One random unwatched match, optionally capped by runtime. Mounted only while open. */
export function TonightSheet({ items, onClose, onView }: { items: MatchItem[]; onClose: () => void; onView: (m: MatchItem) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [max, setMax] = useState<number | undefined>()
  const [pick, setPick] = useState(() => pickTonight(items, {}))

  useEffect(() => ref.current?.showModal(), [])

  const repick = (maxRuntime: number | undefined, avoid?: string) => setPick(pickTonight(items, { maxRuntime, avoid }))

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="tonight-title"
      className="sheet glass-thick mx-auto mt-auto mb-[max(0.5rem,env(safe-area-inset-bottom))] max-h-[92dvh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto rounded-sheet p-0 text-ink backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-5 px-6 pt-3 pb-7">
        <div aria-hidden className="mx-auto h-[5px] w-9 rounded-full bg-white/30" />
        <header className="flex items-center justify-between">
          <h2 id="tonight-title" className="text-title">
            {t.matches.tonightTitle}
          </h2>
          <button type="button" onClick={() => ref.current?.close()} aria-label={t.title.close} className={`${iconButton} size-9`}>
            <X size={17} strokeWidth={2.5} />
          </button>
        </header>

        <div role="radiogroup" aria-label={t.matches.maxRuntime} className="flex flex-wrap gap-2">
          {LIMITS.map((limit) => (
            <button
              key={limit ?? 'any'}
              type="button"
              role="radio"
              aria-checked={max === limit}
              onClick={() => {
                setMax(limit)
                repick(limit)
              }}
              className="glass h-9 rounded-full px-4 text-small font-semibold text-muted transition aria-checked:bg-ink aria-checked:text-bg"
            >
              {limit ? `${t.matches.maxRuntime} ${t.title.runtime(limit).replace(' 0m', '')}` : t.matches.runtimeAny}
            </button>
          ))}
        </div>

        {pick ? (
          <div className="flex flex-col items-center gap-4 text-center" aria-live="polite">
            <div className="aspect-[2/3] w-[min(56vw,220px)] overflow-hidden rounded-[22px] bg-surface shadow-[0_24px_60px_rgb(0_0_0/0.5)]">
              {pick.posterPath && (
                // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN
                <img key={pick.key} src={posterSrc(pick.posterPath)} alt={pick.title} className="h-full w-full object-cover" />
              )}
            </div>
            <div>
              <p className="text-title text-balance">{pick.title}</p>
              <p className="mt-1 text-small text-muted">{metaLine(pick, matchFacts(pick))}</p>
            </div>
            <div className="flex w-full flex-col gap-3">
              <button type="button" className={button} onClick={() => onView(pick)}>
                {t.match.view}
              </button>
              <button type="button" className={buttonQuiet} onClick={() => repick(max, pick.key)}>
                <Shuffle size={17} strokeWidth={2.25} aria-hidden /> {t.matches.pickAnother}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-muted">{t.matches.nothingTonight}</p>
        )}
      </div>
    </dialog>
  )
}
