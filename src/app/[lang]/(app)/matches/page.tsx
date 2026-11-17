import { getMyPair } from '@/lib/pair'
import { details } from '@/lib/tmdb/client'
import { getLocale } from '@/lib/i18n/server'
import { LOCALE_TAGS } from '@/lib/i18n/locales'
import { cardKey, type MediaType } from '@/lib/tmdb/types'
import type { MatchItem } from '@/lib/matches'
import { MatchesView } from '@/components/matches/matches-view'
import { PosterBackdrop } from '@/components/ui/poster-backdrop'

type Row = {
  id: number
  tmdb_id: number
  media_type: MediaType
  title: string
  poster_path: string | null
  year: number | null
  created_at: string
  watched_at: string | null
}
type Rating = { match_id: number; user_id: string; rating: number }

/** Runs `fn` over items with at most `limit` in flight: a long match list must not burst TMDB's rate limit. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

export default async function MatchesPage() {
  const language = LOCALE_TAGS[await getLocale()]
  const { supabase, me, partner } = await getMyPair()
  const [{ data: rows }, { data: ratings }, { data: settings }] = await Promise.all([
    supabase.from('matches').select('id, tmdb_id, media_type, title, poster_path, year, created_at, watched_at').returns<Row[]>(),
    supabase.from('match_ratings').select('match_id, user_id, rating').returns<Rating[]>(),
    supabase.from('pair_settings').select('region, provider_ids').single<{ region: string; provider_ids: number[] }>(),
  ])

  const region = settings?.region ?? 'PL'
  const ours = new Set(settings?.provider_ids ?? [])
  const ratingOf = (matchId: number, mine: boolean) =>
    ratings?.find((r) => r.match_id === matchId && (r.user_id === me.id) === mine)?.rating ?? null

  // TMDB facts come from the 24h details cache; a failed lookup just leaves them empty.
  const items: MatchItem[] = await mapLimit(rows ?? [], 8, async (r) => {
    const d = await details(r.media_type, r.tmdb_id, language).catch(() => null)
    return {
      id: r.id,
      key: cardKey(r.media_type, r.tmdb_id),
      tmdbId: r.tmdb_id,
      mediaType: r.media_type,
      title: r.title,
      year: r.year,
      posterPath: r.poster_path,
      createdAt: r.created_at,
      watchedAt: r.watched_at,
      rating: d && d.voteCount > 0 ? d.rating : null,
      runtime: d?.runtime ?? null,
      seasons: d?.seasons ?? null,
      onOurServices: !!d?.providers[region]?.stream.some((p) => ours.has(p.id)),
      myRating: ratingOf(r.id, true),
      partnerRating: ratingOf(r.id, false),
    }
  })

  return (
    <>
      <PosterBackdrop />
      <MatchesView items={items} region={region} hasServices={ours.size > 0} partnerName={partner?.display_name ?? ''} solo={!partner} />
    </>
  )
}
