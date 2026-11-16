'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, X } from 'lucide-react'
import { t } from '@/lib/strings/en'
import { logoSrc } from '@/lib/tmdb/images'
import type { Card, Provider, TitleDetails } from '@/lib/tmdb/types'
import { metaLine } from '@/components/deck/meta'
import { buttonQuiet, label, link } from '@/components/ui/styles'
import { TrailerDialog } from './trailer-dialog'

// Native <dialog>: focus trap, Escape, inert background and backdrop for free.
export function DetailsSheet({ card, details, onClose }: { card: Card | null; details?: TitleDetails | 'error'; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [trailer, setTrailer] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (card && !dialog?.open) dialog?.showModal()
    if (!card && dialog?.open) dialog.close()
  }, [card])

  const d = typeof details === 'object' ? details : undefined

  return (
    <>
      <dialog
        ref={ref}
        onClose={onClose}
        onClick={(e) => e.target === ref.current && ref.current.close()} // backdrop click
        aria-labelledby="details-title"
        className="sheet mx-auto mt-auto mb-0 max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-sm bg-surface p-0 text-ink backdrop:bg-bg/80"
      >
        {card && (
          <div className="flex flex-col gap-6 px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 id="details-title" className="font-display text-title text-balance">
                  {card.title}
                </h2>
                <p className="mt-1 text-small text-muted">{metaLine(card, d)}</p>
                {d?.genres.length ? <p className="text-small text-muted">{d.genres.join(', ')}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => ref.current?.close()}
                aria-label={t.title.close}
                className="-m-2 p-2 text-muted hover:text-ink"
                autoFocus
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </header>

            {details === 'error' && <p className="text-muted">{t.title.loadError}</p>}

            {d?.trailerKey && (
              <button type="button" className={`${buttonQuiet} gap-2`} onClick={() => setTrailer(true)}>
                <Play size={16} strokeWidth={1.5} /> {t.title.trailer}
              </button>
            )}

            {d?.overview && <p className="leading-relaxed">{d.overview}</p>}

            {d && d.creators.length > 0 && (
              <Field name={card.mediaType === 'movie' ? t.title.directedBy : t.title.createdBy}>{d.creators.join(', ')}</Field>
            )}
            {d && d.cast.length > 0 && <Field name={t.title.cast}>{d.cast.join(', ')}</Field>}

            {d && (
              <section className="flex flex-col gap-3">
                <h3 className={label}>{t.title.whereToWatch}</h3>
                {d.providers?.stream.length ? (
                  <ul className="flex flex-col gap-2">
                    {d.providers.stream.map((p) => (
                      <ProviderRow key={p.id} p={p} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">{t.title.notStreaming}</p>
                )}
                {d.providers && d.providers.rent.length + d.providers.buy.length > 0 && (
                  <p className="text-small text-muted">
                    {t.title.rentOrBuy}:{' '}
                    {[...new Map([...d.providers.rent, ...d.providers.buy].map((p) => [p.id, p.name])).values()].join(', ')}
                  </p>
                )}
                {d.providers?.link ? (
                  <a href={d.providers.link} target="_blank" rel="noreferrer" className={link}>
                    {t.title.justWatch}
                  </a>
                ) : (
                  <p className="text-small text-muted">{t.title.justWatch}</p>
                )}
              </section>
            )}

            <a href={`https://www.themoviedb.org/${card.mediaType}/${card.tmdbId}`} target="_blank" rel="noreferrer" className={link}>
              {t.title.viewOnTmdb}
            </a>
          </div>
        )}
      </dialog>
      {/* A sibling, not nested: Escape and backdrop clicks then close only the trailer. */}
      <TrailerDialog
        videoKey={trailer && d?.trailerKey ? d.trailerKey : null}
        title={card?.title ?? ''}
        onClose={() => setTrailer(false)}
      />
    </>
  )
}

function Field({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className={label}>{name}</h3>
      <p className="mt-1">{children}</p>
    </div>
  )
}

function ProviderRow({ p }: { p: Provider }) {
  return (
    <li className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- TMDB CDN logo */}
      <img src={logoSrc(p.logoPath)} alt="" width={28} height={28} className="size-7 rounded-sm" />
      <span>{p.name}</span>
    </li>
  )
}
