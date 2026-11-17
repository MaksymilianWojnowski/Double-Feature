'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import { t } from '@/lib/strings/en'
import { createClient } from '@/lib/supabase/browser'
import { posterSrc } from '@/lib/tmdb/images'
import type { MediaType } from '@/lib/tmdb/types'
import type { Match } from '@/components/deck/use-deck'
import { useMatchMoment } from '@/components/match/match-provider'
import { Segmented } from '@/components/ui/segmented'
import { iconButton } from '@/components/ui/styles'

type Decision = 'like' | 'pass' | 'seen'
export type SwipeRow = { tmdb_id: number; media_type: MediaType; decision: Decision; title: string; poster_path: string | null; year: number | null }

const DECISIONS = ['like', 'pass', 'seen'] as const
const keyOf = (r: Pick<SwipeRow, 'tmdb_id' | 'media_type'>) => `${r.media_type}:${r.tmdb_id}`

/** Everything you swiped, by decision, and a way to change your mind. */
export function SwipesView({ initial, matched }: { initial: SwipeRow[]; matched: string[] }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const showMatch = useMatchMoment()
  const [rows, setRows] = useState(initial)
  const [tab, setTab] = useState<Decision>('like')
  const [error, setError] = useState(false)
  const matchedSet = useMemo(() => new Set(matched), [matched])

  const counts = Object.fromEntries(DECISIONS.map((d) => [d, rows.filter((r) => r.decision === d).length])) as Record<Decision, number>
  const shown = rows.filter((r) => r.decision === tab)

  async function change(row: SwipeRow, decision: Decision) {
    const set = (d: Decision) => setRows((all) => all.map((r) => (keyOf(r) === keyOf(row) ? { ...r, decision: d } : r)))
    set(decision) // optimistic; the row moves to the other tab
    setError(false)
    const { data, error } = await supabase.rpc('swipe', {
      p_tmdb_id: row.tmdb_id,
      p_media_type: row.media_type,
      p_decision: decision,
      p_title: row.title,
      p_poster_path: row.poster_path,
      p_year: row.year,
    })
    if (error) {
      set(row.decision)
      setError(true)
    } else if ((data as Match[] | null)?.[0]) showMatch((data as Match[])[0])
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-3">
        <div className="flex h-11 items-center">
          <button type="button" aria-label={t.swipes.back} className={`${iconButton} size-10`} onClick={() => (history.length > 1 ? router.back() : router.push('/pair'))}>
            <ChevronLeft size={22} strokeWidth={2.25} />
          </button>
        </div>
        <h1 className="px-2 text-hero">{t.swipes.title}</h1>
      </header>

      <Segmented label={t.swipes.title} value={tab} onChange={setTab} options={DECISIONS.map((d) => ({ value: d, label: `${t.swipes.tabs[d]} ${counts[d]}` }))} />

      {error && (
        <p role="alert" className="px-2 text-small text-danger">
          {t.swipes.saveError}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="px-2 text-muted">{t.swipes.empty}</p>
      ) : (
        <ul className="glass divide-y divide-white/10 overflow-hidden rounded-3xl">
          {shown.map((r) => (
            <li key={keyOf(r)} className="flex items-center gap-3 px-3 py-2.5">
              <span className="block h-[69px] w-[46px] shrink-0 overflow-hidden rounded-lg bg-surface">
                {r.poster_path && (
                  // eslint-disable-next-line @next/next/no-img-element -- TMDB CDN
                  <img src={posterSrc(r.poster_path, 'w185')} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-body">{r.title}</span>
                <span className="block text-small text-muted">{[r.year, t.title[r.media_type]].filter(Boolean).join(' · ')}</span>
              </span>
              {matchedSet.has(keyOf(r)) ? (
                // Un-liking would delete the match for both of you; that lives on the Matches screen.
                <span className="shrink-0 rounded-full bg-accent/20 px-3 py-1 text-small font-semibold text-accent">{t.swipes.matched}</span>
              ) : (
                <label className="glass relative flex h-8 shrink-0 items-center rounded-full">
                  <span className="sr-only">{t.swipes.change(r.title)}</span>
                  <select
                    value={r.decision}
                    onChange={(e) => change(r, e.target.value as Decision)}
                    className="h-full appearance-none rounded-full bg-transparent pr-8 pl-3 text-small font-semibold text-ink"
                  >
                    {DECISIONS.map((d) => (
                      <option key={d} value={d} className="bg-surface text-ink">
                        {t.swipes.decisions[d]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} strokeWidth={2.5} className="pointer-events-none absolute right-3 text-muted" aria-hidden />
                </label>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
