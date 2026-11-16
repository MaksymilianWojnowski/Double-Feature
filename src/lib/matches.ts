import type { Card, MediaType } from '@/lib/tmdb/types'

/** A match as the Matches screen needs it: stored fields plus cached TMDB facts and both ratings. */
export type MatchItem = Card & {
  id: number
  createdAt: string
  watchedAt: string | null
  rating: number | null // TMDB
  runtime: number | null // films only
  seasons: number | null
  onOurServices: boolean
  myRating: number | null
  partnerRating: number | null
}

/** The TMDB facts of a match in the shape `metaLine` reads. */
export const matchFacts = (m: MatchItem) => ({
  runtime: m.runtime,
  seasons: m.seasons,
  rating: m.rating ?? 0,
  voteCount: m.rating === null ? 0 : 1,
})

export type MatchSort = 'newest' | 'rating' | 'runtime'
export type MatchView = { type: 'all' | MediaType; onOurServices: boolean; sort: MatchSort }

// Nulls last in every sort: a title without a rating or runtime shouldn't jump the queue.
const nullsLast = (a: number | null, b: number | null, dir: 1 | -1) =>
  a === null ? (b === null ? 0 : 1) : b === null ? -1 : (a - b) * dir

const comparators: Record<MatchSort, (a: MatchItem, b: MatchItem) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  rating: (a, b) => nullsLast(a.rating, b.rating, -1),
  runtime: (a, b) => nullsLast(a.runtime, b.runtime, 1),
}

/** Filtered and sorted for display; unwatched always come before watched. */
export function viewMatches(items: MatchItem[], view: MatchView): MatchItem[] {
  return items
    .filter((m) => (view.type === 'all' || m.mediaType === view.type) && (!view.onOurServices || m.onOurServices))
    .sort((a, b) => Number(!!a.watchedAt) - Number(!!b.watchedAt) || comparators[view.sort](a, b))
}

/** A random unwatched match that fits tonight; `avoid` skips the current pick while there are others. */
export function pickTonight(
  items: MatchItem[],
  { maxRuntime, avoid }: { maxRuntime?: number; avoid?: string },
  random: () => number = Math.random,
): MatchItem | null {
  const pool = items.filter((m) => !m.watchedAt && (!maxRuntime || (m.runtime !== null && m.runtime <= maxRuntime)))
  const options = pool.length > 1 ? pool.filter((m) => m.key !== avoid) : pool
  return options.length ? options[Math.floor(random() * options.length)] : null
}
