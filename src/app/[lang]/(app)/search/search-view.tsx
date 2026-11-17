'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, Search, X } from 'lucide-react'
import { useLocale, useT } from '@/lib/i18n/client'
import { createClient } from '@/lib/supabase/browser'
import { posterSrc } from '@/lib/tmdb/images'
import type { TitleDetails } from '@/lib/tmdb/types'
import type { SearchResponse, SearchResult } from '@/app/api/search/route'
import type { Match } from '@/components/deck/use-deck'
import { useMatchMoment } from '@/components/match/match-provider'
import { DetailsSheet } from '@/components/details/details-sheet'
import { metaLine } from '@/components/deck/meta'
import { buttonLike } from '@/components/ui/styles'

const DEBOUNCE_MS = 300

export function SearchView() {
  const t = useT()
  const locale = useLocale()
  const supabase = useMemo(() => createClient(), [])
  const showMatch = useMatchMoment()
  const [q, setQ] = useState('')
  const [data, setData] = useState<{ q: string; res: SearchResponse } | 'error' | null>(null)
  const [decisions, setDecisions] = useState<Record<string, SearchResult['decision']>>({}) // your likes made here
  const [open, setOpen] = useState<SearchResult | null>(null)
  const [details, setDetails] = useState<Record<string, TitleDetails | 'error'>>({})
  const latest = useRef(0)

  // Debounced; a response for an older query never replaces a newer one.
  useEffect(() => {
    const query = q.trim()
    if (!query) return
    const id = ++latest.current
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (!r.ok) throw new Error(String(r.status))
        const res: SearchResponse = await r.json()
        if (id === latest.current) setData({ q: query, res })
      } catch {
        if (id === latest.current) setData('error')
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [q])

  const query = q.trim()
  const res = data && data !== 'error' && data.q === query ? data.res : null
  const decisionOf = (r: SearchResult) => decisions[r.key] ?? r.decision

  async function like(r: SearchResult) {
    if (decisionOf(r) === 'like') return
    const before = decisionOf(r)
    setDecisions((d) => ({ ...d, [r.key]: 'like' }))
    navigator.vibrate?.(8)
    const { data: made, error } = await supabase.rpc('swipe', {
      p_tmdb_id: r.tmdbId,
      p_media_type: r.mediaType,
      p_decision: 'like',
      p_title: r.title,
      p_poster_path: r.posterPath,
      p_year: r.year,
    })
    if (error) setDecisions((d) => ({ ...d, [r.key]: before }))
    else if ((made as Match[] | null)?.[0]) showMatch((made as Match[])[0])
  }

  function openDetails(r: SearchResult) {
    setOpen(r)
    if (details[r.key] || !res) return
    fetch(`/api/titles/${r.mediaType}/${r.tmdbId}?region=${res.region}&lang=${locale}`)
      .then((x) => (x.ok ? x.json() : Promise.reject(x.status)))
      .then((d: TitleDetails) => setDetails((all) => ({ ...all, [r.key]: d })))
      .catch(() => setDetails((all) => ({ ...all, [r.key]: 'error' })))
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <h1 className="px-2 text-hero">{t.search.title}</h1>

      <label className="glass flex h-11 items-center gap-2 rounded-full px-4 focus-within:outline-1 focus-within:outline-offset-2 focus-within:outline-white/40">
        <Search size={18} strokeWidth={2.25} className="shrink-0 text-muted" aria-hidden />
        <input
          type="search"
          name="search" // "search" in the name keeps Safari from offering iCloud Passwords here
          autoComplete="off"
          enterKeyHint="search"
          aria-label={t.search.title}
          placeholder={t.search.placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" aria-label={t.search.clear} onClick={() => setQ('')} className="flex size-5 items-center justify-center rounded-full bg-white/30 text-black">
            <X size={13} strokeWidth={3} />
          </button>
        )}
      </label>

      {!query ? (
        <p className="px-2 text-muted">{t.search.hint}</p>
      ) : data === 'error' ? (
        <p className="px-2 text-muted">{t.search.error}</p>
      ) : !res ? (
        <div className="glass h-48 animate-pulse rounded-3xl" role="status" aria-label={t.deck.loading} />
      ) : res.results.length === 0 ? (
        <p className="px-2 text-muted">{t.search.noResults(query)}</p>
      ) : (
        <ul className="glass divide-y divide-white/10 overflow-hidden rounded-3xl">
          {res.results.map((r) => {
            const decision = decisionOf(r)
            return (
              <li key={r.key} className="flex items-center gap-3 px-3 py-2.5">
                <button type="button" onClick={() => openDetails(r)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="block h-[69px] w-[46px] shrink-0 overflow-hidden rounded-lg bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element -- TMDB CDN */}
                    <img src={posterSrc(r.posterPath!, 'w342')} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-body">{r.title}</span>
                    <span className="block text-small text-muted">
                      {metaLine(t, r)}
                      {decision === 'pass' ? ` · ${t.search.passed}` : decision === 'seen' ? ` · ${t.search.seen}` : ''}
                    </span>
                  </span>
                </button>
                <LikeButton liked={decision === 'like'} title={r.title} onClick={() => like(r)} />
              </li>
            )
          })}
        </ul>
      )}

      <DetailsSheet
        card={open}
        details={open ? details[open.key] : undefined}
        onClose={() => setOpen(null)}
        actions={
          open && (
            <button
              type="button"
              disabled={decisionOf(open) === 'like'}
              onClick={() => like(open)}
              className={buttonLike}
            >
              <Heart size={18} strokeWidth={2.25} fill="currentColor" aria-hidden />
              {decisionOf(open) === 'like' ? t.search.liked : t.deck.like}
            </button>
          )
        }
      />
    </main>
  )
}

function LikeButton({ liked, title, onClick }: { liked: boolean; title: string; onClick: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      aria-label={t.search.like(title)}
      aria-pressed={liked}
      onClick={onClick}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${liked ? 'glass glass-accent text-black' : 'glass text-ink'}`}
    >
      <Heart size={18} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} />
    </button>
  )
}
