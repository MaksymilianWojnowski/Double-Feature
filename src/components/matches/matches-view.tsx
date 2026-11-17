'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronDown, Moon } from 'lucide-react'
import { useLocale, useT } from '@/lib/i18n/client'
import { posterSrc } from '@/lib/tmdb/images'
import type { TitleDetails } from '@/lib/tmdb/types'
import { viewMatches, type MatchItem, type MatchView } from '@/lib/matches'
import { DetailsSheet } from '@/components/details/details-sheet'
import { Segmented } from '@/components/ui/segmented'
import { MatchActions, RemoveMatch } from './match-actions'
import { TonightSheet } from './tonight-sheet'

export type Patch = Partial<MatchItem> | 'removed'

export function MatchesView({
  items,
  region,
  hasServices,
  partnerName,
}: {
  items: MatchItem[]
  region: string
  hasServices: boolean
  partnerName: string
}) {
  const t = useT()
  const locale = useLocale()
  const router = useRouter()
  const params = useSearchParams()
  const [view, setView] = useState<MatchView>({ type: 'all', onOurServices: false, sort: 'newest' })
  // Optimistic edits on top of the server's list; the next refresh brings the same values back.
  const [patches, setPatches] = useState<Record<number, Patch>>({})
  const [details, setDetails] = useState<Record<string, TitleDetails | 'error'>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [dismissedParam, setDismissedParam] = useState<string | null>(null)
  const [tonight, setTonight] = useState(false)

  const live = items.flatMap((m) => {
    const p = patches[m.id]
    return p === 'removed' ? [] : [{ ...m, ...p }]
  })
  const shown = viewMatches(live, { ...view, onOurServices: hasServices && view.onOurServices })

  // "View" from the match moment arrives as ?open=movie:123.
  const param = params.get('open')
  const openKey = selected ?? (param !== dismissedParam ? param : null)
  const open = live.find((m) => m.key === openKey) ?? null

  // Details for whichever match is open, however it was opened (tap, Tonight, or the URL).
  const requested = useRef(new Set<string>())
  useEffect(() => {
    if (!open || requested.current.has(open.key)) return
    requested.current.add(open.key)
    const key = open.key
    fetch(`/api/titles/${open.mediaType}/${open.tmdbId}?region=${region}&lang=${locale}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: TitleDetails) => setDetails((all) => ({ ...all, [key]: d })))
      .catch(() => setDetails((all) => ({ ...all, [key]: 'error' })))
  }, [open, region, locale])

  const select = (m: MatchItem) => setSelected(m.key)

  function close() {
    setSelected(null)
    if (param) {
      setDismissedParam(param)
      router.replace('/matches', { scroll: false })
    }
  }

  const patch = (id: number, p: Patch) => setPatches((all) => ({ ...all, [id]: p }))

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="flex items-end justify-between gap-4 px-2">
        <h1 className="text-hero">{t.matches.title}</h1>
        {live.length > 0 && (
          <button type="button" onClick={() => setTonight(true)} className="glass mb-1 flex h-9 items-center gap-1.5 rounded-full px-4 text-small font-semibold transition active:scale-95">
            <Moon size={15} strokeWidth={2.25} aria-hidden /> {t.matches.tonight}
          </button>
        )}
      </header>

      {live.length === 0 ? (
        <div className="glass mt-6 rounded-3xl p-6">
          <h2 className="text-title">{t.matches.emptyTitle}</h2>
          <p className="mt-2 text-muted">{t.matches.emptyBody}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <Segmented
              label={t.matches.types.all}
              value={view.type}
              onChange={(type) => setView((v) => ({ ...v, type }))}
              options={(['all', 'movie', 'tv'] as const).map((value) => ({ value, label: t.matches.types[value] }))}
            />
            <div className="flex items-center justify-between gap-2">
              {hasServices ? (
                <button
                  type="button"
                  aria-pressed={view.onOurServices}
                  onClick={() => setView((v) => ({ ...v, onOurServices: !v.onOurServices }))}
                  className="glass h-9 rounded-full px-4 text-small font-semibold text-muted transition aria-pressed:bg-ink aria-pressed:text-bg"
                >
                  {t.matches.onOurServices}
                </button>
              ) : (
                <span />
              )}
              <label className="glass relative flex h-9 items-center rounded-full">
                <span className="sr-only">{t.matches.sortLabel}</span>
                <select
                  value={view.sort}
                  onChange={(e) => setView((v) => ({ ...v, sort: e.target.value as MatchView['sort'] }))}
                  className="h-full appearance-none bg-transparent pr-9 pl-4 text-small font-semibold text-ink"
                >
                  {(['newest', 'rating', 'runtime'] as const).map((s) => (
                    <option key={s} value={s} className="bg-surface">
                      {t.matches.sorts[s]}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} strokeWidth={2.5} className="pointer-events-none absolute right-3.5 text-muted" aria-hidden />
              </label>
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="px-2 text-muted">{t.matches.filteredEmpty}</p>
          ) : (
            <ul className="grid grid-cols-3 gap-x-3 gap-y-5">
              {shown.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => select(m)} className="group flex w-full flex-col gap-1.5 text-left">
                    <span className="relative block aspect-[2/3] overflow-hidden rounded-2xl bg-surface shadow-[0_10px_30px_rgb(0_0_0/0.4)] transition group-active:scale-[0.97]">
                      {m.posterPath && (
                        // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN
                        <img
                          src={posterSrc(m.posterPath, 'w342')}
                          alt={m.title}
                          loading="lazy"
                          className={`h-full w-full object-cover ${m.watchedAt ? 'opacity-40' : ''}`}
                        />
                      )}
                      {m.watchedAt && (
                        <span className="glass absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full" aria-label={t.matches.watched}>
                          <Check size={14} strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className="line-clamp-1 px-0.5 text-small text-muted">{m.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <DetailsSheet
        card={open}
        details={open ? details[open.key] : undefined}
        onClose={close}
        actions={open && <MatchActions match={open} partnerName={partnerName} onPatch={patch} />}
        footer={open && <RemoveMatch key={open.id} match={open} onPatch={patch} />}
      />

      {tonight && (
        <TonightSheet
          items={live}
          onClose={() => setTonight(false)}
          onView={(m) => {
            setTonight(false)
            select(m)
          }}
        />
      )}
    </main>
  )
}
